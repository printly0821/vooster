# React 고급 가이드: 멀티 디스플레이 & 성능 최적화

> T-006, T-007, T-008 태스크 구현을 기반으로 작성된 실전 가이드

## 목차

1. [멀티 디스플레이 시스템](#1-멀티-디스플레이-시스템)
2. [Socket.IO Hooks 패턴](#2-socketio-hooks-패턴)
3. [React 성능 최적화](#3-react-성능-최적화)
4. [에러 처리 UX](#4-에러-처리-ux)

---

## 1. 멀티 디스플레이 시스템

### 1.1 개요

산업 현장에서 **스마트폰(스캔 디바이스) + 데스크톱(세컨드 모니터)** 조합으로 작업 효율을 극대화하는 시스템입니다.

### 1.2 핵심 기술 스택

- **Socket.IO**: 실시간 양방향 통신
- **Window Management API**: 멀티 모니터 제어
- **QR 코드 페어링**: 디바이스 간 세션 연결

### 1.3 아키텍처

```
┌─────────────────┐         Socket.IO         ┌─────────────────┐
│   스마트폰      │ ◄─────────────────────► │   서버          │
│   (Scanner)     │                            │   (Node.js)     │
└─────────────────┘                            └─────────────────┘
                                                        ▲
                                                        │ Socket.IO
                                                        │
                                               ┌─────────────────┐
                                               │   데스크톱      │
                                               │   (Monitor)     │
                                               └─────────────────┘
```

### 1.4 세컨드 모니터 컨트롤러 구현

#### 파일: `/src/features/monitor/components/MonitorController.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { createSocketClient, attachSocketListeners } from '../lib/socket-client';
import { openOrFocusPopup } from '../lib/window-manager';

interface MonitorControllerProps {
  serverUrl: string;
  token: string;
  appBaseUrl?: string;
  onNavigate?: (orderNo: string) => void;
}

export function MonitorController({
  serverUrl,
  token,
  appBaseUrl,
  onNavigate
}: MonitorControllerProps) {
  const socketRef = useRef<Socket | null>(null);
  const popupRef = useRef<Window | null>(null);
  const seenNoncesRef = useRef<Set<string>>(new Set());

  const [state, setState] = useState({
    connectionStatus: 'disconnected',
    pairingStatus: 'idle',
    sessionId: null,
    lastOrderNo: null,
  });

  // Socket.IO 초기화
  useEffect(() => {
    const socket = createSocketClient({ serverUrl, token });
    socketRef.current = socket;

    const cleanup = attachSocketListeners(socket, {
      'connect': () => {
        console.log('서버 연결됨');
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
      },

      'session:created': (data) => {
        setState(prev => ({
          ...prev,
          sessionId: data.sessionId,
          pairingStatus: 'waiting'
        }));
      },

      'session:paired': () => {
        setState(prev => ({ ...prev, pairingStatus: 'paired' }));
      },

      'navigate': (data) => {
        // ✅ Nonce 기반 중복 제거 (T-007)
        if (data.nonce && seenNoncesRef.current.has(data.nonce)) {
          console.warn('중복 네비게이션 무시:', data.nonce);
          return;
        }

        if (data.nonce) {
          seenNoncesRef.current.add(data.nonce);

          // 메모리 최적화: 최대 100개까지만 유지
          if (seenNoncesRef.current.size > 100) {
            const arr = Array.from(seenNoncesRef.current);
            seenNoncesRef.current = new Set(arr.slice(-100));
          }
        }

        setState(prev => ({ ...prev, lastOrderNo: data.orderNo }));
        onNavigate?.(data.orderNo);
      },
    });

    return () => {
      cleanup();
      socket.disconnect();
    };
  }, [serverUrl, token]);

  // 팝업 자동 열기 (주문 번호 변경 시)
  useEffect(() => {
    if (!state.lastOrderNo) return;

    const url = `${appBaseUrl}/orders/job-order-report/${state.lastOrderNo}`;

    const popup = openOrFocusPopup(url, {
      features: 'width=1024,height=768,left=0,top=0',
      name: 'workorder',
      width: 1024,
      height: 768,
    }, popupRef.current || undefined);

    if (popup) {
      popupRef.current = popup;
    }
  }, [state.lastOrderNo, appBaseUrl]);

  return (
    <div className="monitor-controller">
      {/* UI 구현 */}
    </div>
  );
}
```

#### 핵심 패턴

1. **Ref 기반 상태 관리**
   - `socketRef`: Socket 인스턴스 보관 (리렌더링 방지)
   - `popupRef`: 팝업 창 레퍼런스 유지 (재사용)
   - `seenNoncesRef`: 중복 이벤트 필터링

2. **Cleanup 패턴**
   ```tsx
   return () => {
     cleanup();      // 이벤트 리스너 제거
     socket.disconnect();  // 연결 종료
   };
   ```

### 1.5 Window Management API 활용

#### 파일: `/src/features/monitor/lib/window-manager.ts`

```tsx
/**
 * 팝업 열기 또는 기존 창 재사용
 */
export function openOrFocusPopup(
  targetUrl: string,
  settings: PopupSettings,
  existingPopup?: Window | null
): Window | null {
  // 기존 팝업이 열려있으면 재사용
  if (existingPopup && !isPopupBlocked(existingPopup)) {
    try {
      existingPopup.location.href = targetUrl;
      existingPopup.focus();
      return existingPopup;
    } catch {
      // 실패 시 새 팝업 열기
    }
  }

  // 새 팝업 열기
  const popup = window.open(targetUrl, settings.name, settings.features);

  if (isPopupBlocked(popup)) {
    console.warn('팝업 차단됨');
    return null;
  }

  return popup;
}

/**
 * Window Management API 권한 요청
 */
export async function requestWindowPermission(): Promise<boolean> {
  try {
    if (!('getScreenDetails' in window)) {
      return false;
    }

    // @ts-ignore
    const screens = await window.getScreenDetails();

    if (screens.screens.length > 1) {
      console.log('멀티 모니터 감지:', screens.screens.length);
    }

    return true;
  } catch (error) {
    console.error('권한 요청 실패:', error);
    return false;
  }
}

/**
 * 팝업을 세컨드 모니터로 이동
 */
export async function movePopupToSecondMonitor(
  popup: Window | null,
  settings: PopupSettings
): Promise<boolean> {
  if (!popup || isPopupBlocked(popup)) return false;

  try {
    const screenDetails = await getScreenDetails();

    if (!screenDetails || screenDetails.screens.length <= 1) {
      return false;
    }

    const secondScreen = screenDetails.screens[1];
    if (!secondScreen) return false;

    popup.moveTo(secondScreen.x, secondScreen.y);
    popup.resizeTo(secondScreen.width, secondScreen.height);

    return true;
  } catch (error) {
    console.error('팝업 이동 실패:', error);
    return false;
  }
}
```

#### 사용 예시

```tsx
// 1. 권한 요청
const granted = await requestWindowPermission();

// 2. 팝업 열기
const popup = openOrFocusPopup(
  'https://example.com/report',
  {
    features: 'width=1024,height=768',
    name: 'report-window',
    width: 1024,
    height: 768,
  }
);

// 3. 세컨드 모니터로 이동
if (popup) {
  await movePopupToSecondMonitor(popup, settings);
}
```

---

## 2. Socket.IO Hooks 패턴

### 2.1 Custom Hook 설계

#### 파일: `/src/app/scan/_hooks/useScanOrderSocket.ts`

```tsx
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface UseScanOrderSocketConfig {
  enabled?: boolean;
  serverUrl?: string;
  token?: string;
  sessionId?: string;
}

export interface UseScanOrderSocketReturn {
  isConnected: boolean;
  status: SocketConnectionStatus;
  sendScanOrder: (orderNo: string) => Promise<boolean>;
  error: string | null;
}

/**
 * Socket.IO를 통해 주문 스캔 이벤트를 전송하는 Hook
 */
export function useScanOrderSocket(
  config: UseScanOrderSocketConfig = {}
): UseScanOrderSocketReturn {
  const {
    enabled = true,
    serverUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:3000',
    token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN,
    sessionId = process.env.NEXT_PUBLIC_SESSION_ID,
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Socket.IO 초기화
  useEffect(() => {
    if (!enabled) return;

    const socket = io(serverUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] 연결됨:', socket.id);
      setStatus('connected');
      setError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] 연결 오류:', err);
      setStatus('connecting');
      setError(err.message);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] 연결 해제됨');
      setStatus('disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [enabled, serverUrl, token]);

  // sendScanOrder 콜백 (useCallback으로 안정화)
  const sendScanOrder = useCallback(
    async (orderNo: string): Promise<boolean> => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) {
        setError('서버에 연결되지 않았습니다');
        return false;
      }

      if (!sessionId) {
        setError('세션 ID가 없습니다');
        return false;
      }

      try {
        const success = await emitScanOrder(
          socket,
          { sessionId, orderNo },
          { maxRetries: 3, timeout: 2000 }
        );

        if (success) {
          setError(null);
        } else {
          setError('스캔 이벤트 전송 실패');
        }

        return success;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(errorMsg);
        return false;
      }
    },
    [sessionId]
  );

  return {
    isConnected: status === 'connected',
    status,
    sendScanOrder,
    error,
  };
}
```

### 2.2 Hook 사용 패턴

```tsx
function ScanPage() {
  const {
    isConnected,
    sendScanOrder,
    error
  } = useScanOrderSocket({
    serverUrl: process.env.NEXT_PUBLIC_SOCKET_IO_URL,
    token: userToken,
    sessionId: currentSessionId,
  });

  const handleBarcodeDetected = useCallback(async (result: BarcodeResult) => {
    const barcode = result.text.trim();

    // Socket.IO로 세컨드 모니터에 전송
    if (isConnected) {
      const success = await sendScanOrder(barcode);
      if (success) {
        console.log('✅ 세컨드 모니터로 전송 완료');
      }
    } else {
      console.warn('⚠️ Socket.IO 미연결');
    }
  }, [isConnected, sendScanOrder]);

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      <BarcodeScanner onDetected={handleBarcodeDetected} />
    </div>
  );
}
```

### 2.3 Socket 이벤트 전송 유틸리티

```tsx
/**
 * 스캔 주문 이벤트 전송 (재시도 로직 포함)
 */
export async function emitScanOrder(
  socket: Socket,
  payload: { sessionId: string; orderNo: string },
  options: { maxRetries?: number; timeout?: number } = {}
): Promise<boolean> {
  const { maxRetries = 3, timeout = 2000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Timeout'));
        }, timeout);

        socket.emit('scan:order', payload, (ack: any) => {
          clearTimeout(timer);
          if (ack?.success) {
            resolve();
          } else {
            reject(new Error(ack?.message || 'Failed'));
          }
        });
      });

      return true;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error('최종 전송 실패:', err);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }

  return false;
}
```

---

## 3. React 성능 최적화

### 3.1 메모리 누수 방지

#### 타이머 정리 패턴

```tsx
function ScanPage() {
  // ✅ useRef로 타이머 추적
  const pendingTimersRef = useRef<NodeJS.Timeout[]>([]);

  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    // 타이머 생성 시 ref에 추가
    const errorTimer = setTimeout(() => {
      setScanStatus('idle');
    }, 1000);
    pendingTimersRef.current.push(errorTimer);

    const transitionTimer = setTimeout(() => {
      setViewMode('report');
    }, 300);
    pendingTimersRef.current.push(transitionTimer);
  }, []);

  const handleBackToScanner = useCallback(() => {
    // ✅ 모든 대기 중인 타이머 정리
    pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    pendingTimersRef.current = [];
    console.log('🧹 타이머 정리 완료');

    setViewMode('scanner');
  }, []);

  return (
    <div>
      <Scanner onDetected={handleBarcodeDetected} />
      <ReportView onBack={handleBackToScanner} />
    </div>
  );
}
```

### 3.2 비디오 스트림 정리

```tsx
function ScannerView() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const video = videoRef.current;

    // ✅ 이전 스트림 명시적 정리
    const currentStream = video.srcObject as MediaStream | null;
    if (currentStream) {
      console.log('🧹 이전 스트림 정리');
      currentStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('⚠️ 트랙 정지 중 에러:', err);
        }
      });
    }

    video.srcObject = stream;

    // ✅ Cleanup: unmount 시 스트림 정리
    return () => {
      console.log('🧹 Video element cleanup');
      if (video.srcObject) {
        const oldStream = video.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.warn('⚠️ 정리 중 에러:', err);
          }
        });
        video.srcObject = null;
      }
    };
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted />;
}
```

### 3.3 Ref 패턴으로 리렌더링 방지

#### 문제: 콜백 변경으로 인한 불필요한 리렌더링

```tsx
// ❌ 나쁜 예: onBarcodeDetected가 변경될 때마다 BarcodeScanner 리렌더링
function ScannerView({ onBarcodeDetected }) {
  return (
    <BarcodeScanner
      onDetected={onBarcodeDetected}  // 부모에서 전달받은 콜백
    />
  );
}
```

#### 해결: Ref 패턴 적용

```tsx
// ✅ 좋은 예: Ref로 콜백 안정화
function ScannerView({ onBarcodeDetected }) {
  const onBarcodeDetectedRef = useRef(onBarcodeDetected);

  // 콜백이 변경되면 ref만 업데이트 (리렌더링 X)
  useEffect(() => {
    onBarcodeDetectedRef.current = onBarcodeDetected;
  }, [onBarcodeDetected]);

  // 안정적인 콜백 (deps 비어있음 = 절대 재생성 안됨)
  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    onBarcodeDetectedRef.current(result);
  }, []);

  return (
    <BarcodeScanner
      onDetected={handleBarcodeDetected}  // 안정적인 레퍼런스
    />
  );
}
```

### 3.4 Config 객체 메모이제이션

```tsx
function ScannerView({ settings }) {
  // ✅ config 객체를 useMemo로 안정화
  const barcodeScannerConfig = useMemo(() => ({
    cooldownMs: settings.cooldownMs,
    onDetected: handleBarcodeDetected,
    onError: handleBarcodeScanError,
  }), [settings.cooldownMs, handleBarcodeDetected, handleBarcodeScanError]);

  return (
    <BarcodeScanner config={barcodeScannerConfig} />
  );
}
```

### 3.5 Code Splitting (동적 임포트)

```tsx
import dynamic from 'next/dynamic';

// ✅ ReportView를 lazy load (초기 로딩 시 제외)
const ReportView = dynamic(
  () => import('./_components/ReportView').then(m => ({ default: m.ReportView })),
  {
    loading: () => (
      <div className="flex items-center justify-center">
        <p>제작의뢰서 로딩 중...</p>
      </div>
    ),
    ssr: false,  // 서버 사이드 렌더링 비활성화
  }
);

function ScanPage() {
  const [viewMode, setViewMode] = useState<'scanner' | 'report'>('scanner');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  return (
    <div>
      {/* 스캔 화면 (항상 마운트) */}
      <div style={{ display: viewMode === 'scanner' ? 'block' : 'none' }}>
        <ScannerView />
      </div>

      {/* 리포트 화면 (바코드 스캔 후 lazy load) */}
      {scannedBarcode && viewMode === 'report' && (
        <ReportView barcode={scannedBarcode} />
      )}
    </div>
  );
}
```

**성능 효과:**
- 초기 번들 크기 20-30KB 감소
- Time to Interactive 개선
- 사용자가 필요할 때만 로딩

---

## 4. 에러 처리 UX

### 4.1 에러 타입 정의

```tsx
export type ErrorCategory =
  | 'network'      // 네트워크 연결 오류
  | 'order'        // 주문 조회 실패
  | 'monitor'      // 세컨드 모니터 연결 오류
  | 'permission'   // 권한 거부
  | 'socket'       // Socket.IO 오류
  | 'camera'       // 카메라 오류
  | 'unknown';     // 기타

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: number;
  context?: Record<string, unknown>;
}
```

### 4.2 에러 생성 유틸리티

```tsx
import { nanoid } from 'nanoid';

export function createError(
  category: ErrorCategory,
  message: string,
  options?: {
    code?: string;
    severity?: ErrorSeverity;
    details?: unknown;
    context?: Record<string, unknown>;
  }
): AppError {
  return {
    id: nanoid(),
    category,
    severity: options?.severity || 'error',
    message,
    code: options?.code,
    details: options?.details,
    timestamp: Date.now(),
    context: options?.context,
  };
}
```

### 4.3 에러별 사용자 안내

```tsx
export function getErrorGuidance(error: AppError): ErrorGuidance {
  switch (error.category) {
    case 'network':
      return {
        title: '네트워크 연결 오류',
        message: '인터넷 연결을 확인해주세요. 자동으로 재연결을 시도하고 있습니다.',
        autoClose: 5000,
      };

    case 'order':
      if (error.code === 'ORDER_NOT_FOUND') {
        return {
          title: '주문을 찾을 수 없습니다',
          message: '입력하신 주문번호를 다시 확인해주세요.',
          actions: [
            {
              label: '최근 스캔 내역으로',
              action: () => { window.location.hash = '#history'; },
            },
          ],
          autoClose: 5000,
        };
      }
      return {
        title: '주문 조회 실패',
        message: '주문 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
        autoClose: 5000,
      };

    case 'monitor':
      if (error.code === 'MONITOR_NOT_PAIRED') {
        return {
          title: '세컨드 모니터 미연결',
          message: '세컨드 모니터와 페어링되지 않았습니다. QR 코드를 다시 스캔해주세요.',
          autoClose: 0, // 사용자 액션 필요
        };
      }
      return {
        title: '모니터 연결 실패',
        message: '세컨드 모니터 연결을 확인해주세요.',
        autoClose: 5000,
      };

    case 'permission':
      if (error.code === 'CAMERA_PERMISSION_DENIED') {
        return {
          title: '카메라 권한이 필요합니다',
          message: '바코드를 스캔하려면 카메라 권한을 허용해야 합니다.',
          autoClose: 0,
        };
      }
      if (error.code === 'POPUP_BLOCKED') {
        return {
          title: '팝업 차단됨',
          message: '제작의뢰서를 표시하려면 팝업 차단을 해제해주세요.',
          actions: [
            {
              label: '수동으로 열기',
              action: () => { /* 수동 팝업 열기 */ },
            },
          ],
          autoClose: 0,
        };
      }
      return {
        title: '권한 거부됨',
        message: '필요한 권한을 허용해주세요.',
        autoClose: 5000,
      };

    case 'socket':
      return {
        title: '서버 연결 오류',
        message: '서버와의 연결이 끊어졌습니다. 재연결 중입니다.',
        autoClose: 5000,
      };

    case 'camera':
      return {
        title: '카메라 오류',
        message: '카메라를 사용할 수 없습니다. 기기를 재시작해주세요.',
        autoClose: 5000,
      };

    default:
      return {
        title: '오류 발생',
        message: error.message,
        autoClose: 5000,
      };
  }
}
```

### 4.4 에러 처리 Hook

```tsx
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    async (error: AppError | Error, details?: unknown) => {
      // AppError 객체로 정규화
      const appError = (error && 'category' in error)
        ? (error as AppError)
        : createError('unknown', error instanceof Error ? error.message : String(error), { details });

      // 콘솔 로깅
      console.error(`[${appError.id}] ${appError.category}: ${appError.message}`, {
        code: appError.code,
        details: appError.details,
      });

      // 서버에 비동기 전송 (사용자 경험 방해 금지)
      logErrorToServer(appError).catch(() => {});

      // 사용자 안내
      const guidance = getErrorGuidance(appError);

      toast({
        title: guidance.title,
        description: guidance.message,
        variant: appError.severity === 'critical' ? 'destructive' : 'default',
        duration: guidance.autoClose,
      });
    },
    [toast]
  );

  const handleNetworkError = useCallback((message?: string) => {
    const error = createError('network', message || '네트워크 연결 오류', {
      severity: 'warning',
    });
    handleError(error);
  }, [handleError]);

  const handleOrderNotFound = useCallback((orderNo: string) => {
    const error = createError('order', `주문번호 ${orderNo}를 찾을 수 없습니다.`, {
      code: 'ORDER_NOT_FOUND',
      context: { orderNo },
    });
    handleError(error);
  }, [handleError]);

  return {
    handleError,
    handleNetworkError,
    handleOrderNotFound,
  };
}
```

### 4.5 재시도 로직 (지수 백오프)

```tsx
/**
 * 지수 백오프 계산
 */
export function calculateBackoffDelay(
  retryCount: number,
  initialDelay: number = 1000,
  maxDelay: number = 15000,
  multiplier: number = 2
): number {
  const delay = initialDelay * Math.pow(multiplier, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * 재시도 로직을 포함한 비동기 작업 실행
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (retryCount: number, delay: number) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 15000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, initialDelay, maxDelay);
        options?.onRetry?.(attempt + 1, delay);

        // 지수 백오프 대기
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Maximum retries exceeded');
}
```

### 4.6 Socket.IO 재연결 관리

```tsx
import type { Socket } from 'socket.io-client';

export function setupSocketReconnection(
  socket: Socket,
  config: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {},
  callbacks?: {
    onReconnecting?: (attemptNumber: number, nextDelay: number) => void;
    onReconnectFailed?: () => void;
  }
): void {
  const maxRetries = config.maxRetries || 5;
  const initialDelay = config.initialDelay || 1000;
  const maxDelay = config.maxDelay || 15000;

  // Socket.IO 설정
  socket.io.opts.reconnection = true;
  socket.io.opts.reconnectionDelay = initialDelay;
  socket.io.opts.reconnectionDelayMax = maxDelay;
  socket.io.opts.reconnectionAttempts = maxRetries;

  // 재연결 시도 이벤트
  socket.on('reconnect_attempt', (attemptNumber: number) => {
    const delay = calculateBackoffDelay(attemptNumber, initialDelay, maxDelay);
    console.log(`[Socket.IO] 재연결 시도 ${attemptNumber} (delay: ${delay}ms)`);
    callbacks?.onReconnecting?.(attemptNumber, delay);
  });

  // 재연결 실패 이벤트
  socket.on('reconnect_failed', () => {
    console.error('[Socket.IO] 재연결 실패');
    callbacks?.onReconnectFailed?.();
  });

  // 재연결 성공 이벤트
  socket.on('reconnect', () => {
    console.log('[Socket.IO] 재연결 성공');
  });
}
```

### 4.7 Toast 시스템 (Radix UI)

```tsx
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();

  const handleError = () => {
    toast({
      title: '네트워크 오류',
      description: '인터넷 연결을 확인해주세요.',
      variant: 'destructive',
      duration: 5000,
    });
  };

  const handleSuccess = () => {
    toast({
      title: '성공',
      description: '작업이 완료되었습니다.',
      variant: 'default',
      duration: 3000,
    });
  };

  return (
    <div>
      <button onClick={handleError}>에러 발생</button>
      <button onClick={handleSuccess}>성공</button>
    </div>
  );
}
```

---

## 5. 실전 사용 예시

### 5.1 통합 예제: 바코드 스캔 페이지

```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useScanOrderSocket } from './_hooks/useScanOrderSocket';
import { useErrorHandler } from '@/features/error-handling/hooks/useErrorHandler';
import { ScannerView } from './_components/ScannerView';
import { ReportView } from './_components/ReportView';

export default function ScanPage() {
  const [viewMode, setViewMode] = useState<'scanner' | 'report'>('scanner');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');

  const pendingTimersRef = useRef<NodeJS.Timeout[]>([]);
  const { handleError, handleOrderNotFound } = useErrorHandler();
  const { isConnected, sendScanOrder } = useScanOrderSocket({
    enabled: !!process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN,
  });

  // ✅ 바코드 스캔 핸들러 (메모이제이션)
  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    const barcode = result.text.trim();

    // 형식 검증
    if (!isValidOrderNumber(barcode)) {
      setScanStatus('error');
      const errorTimer = setTimeout(() => setScanStatus('idle'), 1000);
      pendingTimersRef.current.push(errorTimer);
      return;
    }

    setScanStatus('success');

    // 진동 피드백
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Socket.IO로 세컨드 모니터에 전송
    if (isConnected) {
      sendScanOrder(barcode)
        .then((success) => {
          if (success) {
            console.log('✅ 세컨드 모니터 전송 완료');
          }
        })
        .catch((err) => {
          handleError(err);
        });
    }

    // 제작의뢰서 화면으로 전환
    const transitionTimer = setTimeout(() => {
      setScannedBarcode(barcode);
      setViewMode('report');
      setScanStatus('idle');
    }, 300);
    pendingTimersRef.current.push(transitionTimer);
  }, [isConnected, sendScanOrder, handleError]);

  // ✅ 스캔 화면으로 복귀 (타이머 정리)
  const handleBackToScanner = useCallback(() => {
    pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    pendingTimersRef.current = [];
    setViewMode('scanner');
    setScanStatus('idle');
  }, []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* 스캔 화면 */}
      <div
        className={cn(
          "absolute inset-0 transition-transform",
          viewMode === 'scanner' ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ScannerView
          onBarcodeDetected={handleBarcodeDetected}
          scanStatus={scanStatus}
        />
      </div>

      {/* 리포트 화면 */}
      {scannedBarcode && (
        <div
          className={cn(
            "absolute inset-0 transition-transform",
            viewMode === 'report' ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <ReportView
            barcode={scannedBarcode}
            onBack={handleBackToScanner}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 6. 성능 체크리스트

### ✅ 메모리 관리
- [ ] 타이머를 `useRef`로 추적하여 cleanup
- [ ] 비디오 스트림을 명시적으로 정리
- [ ] Socket 연결을 unmount 시 해제
- [ ] 이벤트 리스너를 cleanup 함수에서 제거

### ✅ 리렌더링 최적화
- [ ] 콜백을 `useCallback`으로 메모이제이션
- [ ] Config 객체를 `useMemo`로 안정화
- [ ] Ref 패턴으로 불필요한 deps 제거
- [ ] `React.memo`로 자식 컴포넌트 최적화

### ✅ 코드 스플리팅
- [ ] 큰 컴포넌트를 `dynamic` 임포트
- [ ] `ssr: false`로 클라이언트 전용 코드 분리
- [ ] 초기 번들 크기 최소화

### ✅ 에러 처리
- [ ] Toast 시스템 구현
- [ ] 지수 백오프 재시도 로직
- [ ] 사용자 친화적 에러 메시지
- [ ] 에러 로깅 및 서버 전송

---

## 7. 참고 자료

### 프로젝트 파일 구조

```
src/
├── app/
│   ├── scan/
│   │   ├── _hooks/
│   │   │   └── useScanOrderSocket.ts      # Socket Hook
│   │   ├── _components/
│   │   │   └── ScannerViewMinimal.tsx     # 스캐너 뷰
│   │   └── page.tsx                       # 스캔 페이지
│   └── monitor/
│       └── page.tsx                       # 세컨드 모니터 페이지
├── features/
│   ├── monitor/
│   │   ├── components/
│   │   │   └── MonitorController.tsx      # 모니터 컨트롤러
│   │   └── lib/
│   │       ├── window-manager.ts          # Window API
│   │       └── socket-client.ts           # Socket 클라이언트
│   └── error-handling/
│       ├── hooks/
│       │   └── useErrorHandler.ts         # 에러 핸들러 Hook
│       └── lib/
│           ├── error-handler.ts           # 에러 유틸리티
│           └── socket-reconnection.ts     # 재연결 로직
└── hooks/
    └── use-toast.ts                       # Toast Hook
```

### 관련 태스크

- **T-006**: 세컨드 모니터용 컨트롤러 페이지/서비스 구현
- **T-007**: 스캔 이벤트 → 세컨드 모니터 자동 전환 로직
- **T-008**: 예외/에러 처리 UX 구현

---

## 마무리

이 가이드는 **실제 프로덕션 코드**에서 추출한 패턴을 기반으로 작성되었습니다.

핵심 원칙:
1. **메모리 누수 방지**: 모든 리소스를 명시적으로 정리
2. **성능 최적화**: 불필요한 리렌더링 제거
3. **사용자 친화적 에러 처리**: 명확한 안내와 복구 경로 제공
4. **재사용 가능한 Hook 패턴**: 비즈니스 로직을 컴포넌트에서 분리

React 18+의 고급 기능을 활용하여 산업 현장에서 안정적으로 작동하는 애플리케이션을 구축할 수 있습니다.
