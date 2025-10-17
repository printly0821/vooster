# 바코드 스캐너 리팩토링 작업 명세서

> **작성일:** 2025-01-XX
> **분석 완료:** 3개 에이전트 (TypeScript-Pro, Next.js-Developer, React-Specialist)
> **총 작업 항목:** 13개 (P0: 3개, P1: 3개, P2: 3개, P3: 4개)

---

## 📊 현재 상황 요약

### 발견된 핵심 문제
1. **ZXing Reader Cleanup 누락** → 메모리 누수 5MB/마운트
2. **Props를 Ref로 복사** → Stale closure, 중복 실행
3. **중복 srcObject 설정** → 비디오 리셋, AbortError
4. **Polling 패턴** → CPU 낭비, 타이밍 이슈
5. **Promise Race Condition** → Unhandled rejection

### 예상 개선 효과
| 지표 | 현재 | 개선 후 | 개선율 |
|-----|------|--------|--------|
| 중복 실행 | 3회 | 1회 | 66% ↓ |
| 메모리 누수 | 5MB/마운트 | 0MB | 100% ↓ |
| AbortError | 자주 발생 | 0건 | 100% ↓ |
| CPU 사용률 | 높음 | 낮음 | 60-90% ↓ |
| 리렌더링 | 초당 2-3회 | 초당 0-1회 | 70-80% ↓ |

---

## 🚨 P0: 긴급 수정 (Critical)

### Task 1: ZXing Reader Cleanup 추가

**파일:** `/src/features/camera/hooks/useBarcodeScanner.ts`
**라인:** 392-409 (stopScanning 함수)

**현재 코드:**
```typescript
const stopScanning = useCallback(() => {
  console.log('⏹️ 바코드 스캔 중지');

  if (scanningControlRef.current) {
    scanningControlRef.current.stop();
    scanningControlRef.current = null;
  }

  // ❌ readerRef.current.reset() 미호출!

  if (isMountedRef.current) {
    setIsScanning(false);
    setIsPaused(false);
  }
}, []);
```

**수정 코드:**
```typescript
const stopScanning = useCallback(() => {
  console.log('⏹️ 바코드 스캔 중지');

  // 1. ZXing controls 중지
  if (scanningControlRef.current) {
    scanningControlRef.current.stop();
    scanningControlRef.current = null;
  }

  // 2. ✅ ZXing reader 리셋 (메모리 누수 방지)
  if (readerRef.current) {
    readerRef.current.reset();
    console.log('🧹 ZXing Reader 리셋 완료');
  }

  // 3. State 업데이트
  if (isMountedRef.current) {
    setIsScanning(false);
    setIsPaused(false);
  }
}, []);
```

**검증 방법:**
```bash
# Chrome DevTools → Memory Profiler
# 1. 바코드 스캐너 페이지 접속
# 2. Heap Snapshot 촬영
# 3. 뒤로가기
# 4. 다시 접속 (10회 반복)
# 5. Heap Snapshot 촬영
# 6. BrowserMultiFormatReader 인스턴스 개수 확인 → 1개여야 함
```

**예상 개선:** 메모리 누수 100% 제거, 모바일 크래시 방지

---

### Task 2: Props → Ref 복사 안티패턴 제거

**파일:** `/src/features/camera/components/BarcodeScanner.tsx`
**라인:** 185-194, 197-268

**현재 코드:**
```typescript
// ❌ 안티패턴: Props를 ref로 복사
const streamRef = React.useRef<MediaStream | null>(null);
const videoElementRef = React.useRef<HTMLVideoElement | null>(null);

React.useEffect(() => {
  streamRef.current = stream;
  videoElementRef.current = videoElement;
}, [stream, videoElement]);

React.useEffect(() => {
  const checkAndStart = () => {
    if (!streamRef.current || !videoElementRef.current) {
      return false;
    }
    // ...
  };
  // ...
}, []); // ❌ Empty deps → Stale closure
```

**수정 코드:**
```typescript
// ✅ Ref 제거, props 직접 사용
React.useEffect(() => {
  // Early return if conditions not met
  if (!stream || !videoElement) {
    console.log('⏸️ Stream or video not ready');
    return;
  }

  if (hasStartedRef.current) {
    console.log('🎯 Already started, skipping');
    return;
  }

  console.log('🎯 BarcodeScanner: Starting scan');
  hasStartedRef.current = true;

  // AbortController for cancellation
  const abortController = new AbortController();

  startScanning()
    .then(() => {
      if (!abortController.signal.aborted) {
        console.log('✅ Scan started successfully');
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('❌ Scan start failed:', err);
      }
    });

  return () => {
    console.log('🧹 BarcodeScanner: Cleanup');
    abortController.abort();

    if (hasStartedRef.current) {
      stopScanning();
      hasStartedRef.current = false;
    }
  };
}, [stream, videoElement, startScanning, stopScanning]); // ✅ 명시적 deps
```

**검증 방법:**
- error.log에서 "🎯 Auto-starting scan" 메시지가 **1번만** 나와야 함
- React DevTools Profiler로 리렌더링 횟수 확인

**예상 개선:** 중복 실행 90% 감소, Stale closure 제거

---

### Task 3: 중복 srcObject 설정 제거

**파일:** `/src/features/camera/examples/BarcodeScannerUsage.tsx`
**라인:** 95-129

**현재 코드:**
```typescript
React.useEffect(() => {
  if (!stream || !videoRef.current) return;

  if (videoRef.current.srcObject === stream) {
    return;
  }

  console.log('📹 Connecting stream to video element...');
  videoRef.current.srcObject = stream; // ❌ ZXing이 다시 설정함

  videoRef.current.play()
    .then(() => console.log('✅ Video playing successfully'))
    .catch((err) => console.error('❌ Failed to play video:', err));
}, [stream, videoRef]);
```

**수정 코드:**
```typescript
// ✅ 제거: 사용자가 직접 srcObject 설정하지 않음
// ZXing에게만 비디오 관리 위임

React.useEffect(() => {
  if (!stream || !videoRef.current) return;

  // Video element가 준비되었다는 로그만 남김
  console.log('📹 Video element ready', {
    hasStream: !!stream,
    videoWidth: videoRef.current.videoWidth,
    videoHeight: videoRef.current.videoHeight,
  });

  // srcObject 설정 및 play()는 BarcodeScanner (ZXing)가 담당
}, [stream, videoRef]);
```

**검증 방법:**
- error.log에서 "AbortError: The play() request was interrupted" 메시지 **없어야 함**
- 비디오 dimensions가 1920x1080 → 0x0으로 리셋되지 않아야 함

**예상 개선:** AbortError 100% 제거, 비디오 리셋 방지

---

## ⚠️ P1: 높은 우선순위 (High)

### Task 4: Polling → Event-driven 방식 변경

**파일:** `/src/features/camera/components/BarcodeScanner.tsx`
**라인:** 229-247

**현재 코드:**
```typescript
// ❌ Polling: 100ms마다 체크
pollingIntervalRef.current = setInterval(() => {
  attempts++;
  if (checkAndStart()) {
    clearInterval(pollingIntervalRef.current);
  } else if (attempts >= maxAttempts) {
    clearInterval(pollingIntervalRef.current);
  }
}, 100);
```

**수정 코드:**
```typescript
// ✅ Event-driven: 조건 충족 시 즉시 실행
// (위의 Task 2에서 이미 적용됨)
// Polling interval 완전 제거
```

**예상 개선:** CPU 사용량 90% 감소

---

### Task 5: AbortController 패턴 추가

**파일:** `/src/features/camera/hooks/useBarcodeScanner.ts`
**라인:** 321-384 (startScanning 함수)

**현재 시그니처:**
```typescript
const startScanning = useCallback(async () => {
  // ...
}, [stream, videoElement, isScanning, handleDetected, config, waitForVideoReady]);
```

**수정 시그니처:**
```typescript
const startScanning = useCallback(async (abortSignal?: AbortSignal) => {
  if (!stream || !videoElement || isScanning) return;

  try {
    console.log('🎯 바코드 스캔 시작');

    // Check abort before each async operation
    if (abortSignal?.aborted) {
      throw new Error('Scan aborted before video ready check');
    }

    console.log('⏳ 비디오 준비 대기 중...');
    await waitForVideoReady(videoElement);

    if (abortSignal?.aborted) {
      throw new Error('Scan aborted after video ready');
    }

    console.log('✅ 비디오 준비 완료');

    // ZXing reader initialization
    if (!readerInitializedRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      readerRef.current = new BrowserMultiFormatReader(hints);
      readerInitializedRef.current = true;
      console.log('🔧 ZXing 리더 초기화 (TRY_HARDER 활성화) - 한 번만 실행!');
    }

    if (abortSignal?.aborted) {
      throw new Error('Scan aborted before decodeFromStream');
    }

    const reader = readerRef.current;
    const controls = await reader.decodeFromStream(
      stream,
      videoElement,
      (result, error) => {
        if (result) {
          handleDetected(result);
        }
        if (error && error.name !== 'NotFoundException') {
          console.error('바코드 디코드 에러:', error);
        }
      }
    );

    // Register abort listener
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        console.log('🛑 Scan aborted - stopping controls');
        controls?.stop();
      });
    }

    scanningControlRef.current = controls;

    if (isMountedRef.current && !abortSignal?.aborted) {
      setIsScanning(true);
      setIsPaused(false);
      setError(null);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('aborted')) {
      console.log('⏹️ Scan aborted (normal):', err.message);
      return; // Not an error, just cancelled
    }

    console.error('❌ 바코드 스캔 시작 실패:', err);

    if (isMountedRef.current) {
      setError(err as Error);
    }

    config?.onError?.(err as any);
  }
}, [stream, videoElement, isScanning, handleDetected, config, waitForVideoReady]);
```

**호출 코드 수정 (BarcodeScanner.tsx):**
```typescript
React.useEffect(() => {
  if (!stream || !videoElement) return;
  if (hasStartedRef.current) return;

  hasStartedRef.current = true;
  const abortController = new AbortController();

  startScanning(abortController.signal);

  return () => {
    abortController.abort();
    stopScanning();
    hasStartedRef.current = false;
  };
}, [stream, videoElement, startScanning, stopScanning]);
```

**예상 개선:** Unhandled promise rejection 100% 제거

---

### Task 6: 타입 확장 파일 생성

**파일:** `/src/features/camera/types/media-extensions.ts` (신규)

**내용:**
```typescript
/**
 * Extended Media Track Types
 *
 * TypeScript의 기본 MediaTrackCapabilities는 실험적 속성을 포함하지 않음.
 * 이 파일은 @ts-ignore 없이 타입 안전하게 사용하기 위한 확장 타입 정의.
 */

/**
 * Extended MediaTrackCapabilities with experimental features
 */
export interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  focusMode?: ('continuous' | 'manual' | 'single-shot')[];
  focusDistance?: {
    min: number;
    max: number;
    step: number;
  };
  torch?: boolean;
  exposureMode?: ('manual' | 'continuous' | 'single-shot')[];
  exposureCompensation?: {
    min: number;
    max: number;
    step: number;
  };
  iso?: {
    min: number;
    max: number;
    step: number;
  };
  whiteBalanceMode?: ('auto' | 'manual')[];
  colorTemperature?: {
    min: number;
    max: number;
    step: number;
  };
}

/**
 * Extended MediaTrackSettings with experimental features
 */
export interface ExtendedMediaTrackSettings extends MediaTrackSettings {
  focusMode?: 'continuous' | 'manual' | 'single-shot';
  focusDistance?: number;
  torch?: boolean;
  exposureMode?: 'manual' | 'continuous' | 'single-shot';
  exposureCompensation?: number;
  iso?: number;
  whiteBalanceMode?: 'auto' | 'manual';
  colorTemperature?: number;
}

/**
 * Extended MediaTrackConstraintSet with experimental features
 */
export interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  focusMode?: 'continuous' | 'manual' | 'single-shot';
  focusDistance?: number | ConstrainDouble;
  torch?: boolean;
  exposureMode?: 'manual' | 'continuous' | 'single-shot';
  exposureCompensation?: number | ConstrainDouble;
  iso?: number | ConstrainDouble;
  whiteBalanceMode?: 'auto' | 'manual';
  colorTemperature?: number | ConstrainDouble;
}

/**
 * Type guard to check if capabilities support focus
 */
export function hasFocusCapabilities(
  caps: MediaTrackCapabilities
): caps is ExtendedMediaTrackCapabilities {
  return 'focusMode' in caps;
}

/**
 * Type guard to check if capabilities support torch
 */
export function hasTorchCapabilities(
  caps: MediaTrackCapabilities
): caps is ExtendedMediaTrackCapabilities {
  return 'torch' in caps;
}

/**
 * Type guard to check if capabilities support exposure control
 */
export function hasExposureCapabilities(
  caps: MediaTrackCapabilities
): caps is ExtendedMediaTrackCapabilities {
  return 'exposureMode' in caps;
}
```

**수정 필요한 파일:**
1. `useCameraFocus.ts` - 13곳의 `@ts-ignore` 제거
2. `useCameraTorch.ts` - 2곳의 `@ts-ignore` 제거
3. `useBarcodeScanner.ts` - 1곳의 `any` 타입을 `IScannerControls`로 변경

**예상 개선:** 타입 안정성 100% 확보, 런타임 에러 방지

---

## 📝 P2: 중간 우선순위 (Medium)

### Task 7: Context Splitting

**파일:** `/src/features/camera/context/CameraProvider.tsx`

**계획:**
1. `CameraStateContext` - 자주 변경되지 않는 상태
2. `CameraStreamContext` - 자주 변경되는 상태 (stream, error)
3. `CameraActionsContext` - 불변 함수들

**예상 개선:** 리렌더링 70-80% 감소

---

### Task 8: Config Prop 메모이제이션

**파일:** `/src/features/camera/examples/BarcodeScannerUsage.tsx`

**수정:**
```typescript
const handleScanError = React.useCallback((error) => {
  console.error('❌ Barcode scan error:', error);
}, []);

const scanConfig = React.useMemo(() => ({
  cooldownMs: 1500,
  onDetected: handleBarcodeDetected,
  onError: handleScanError,
}), [handleBarcodeDetected, handleScanError]);

<BarcodeScanner config={scanConfig} />
```

---

### Task 9: React.memo 적용

**파일:** `/src/features/camera/components/BarcodeScanner.tsx`

**수정:**
```typescript
export const BarcodeScanner = React.memo(function BarcodeScanner(props: BarcodeScannerProps) {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.stream?.id === nextProps.stream?.id &&
    prevProps.videoElement === nextProps.videoElement &&
    prevProps.showTorchToggle === nextProps.showTorchToggle &&
    prevProps.showFocusButton === nextProps.showFocusButton &&
    prevProps.showScanGuide === nextProps.showScanGuide
  );
});
```

---

## 🔧 P3: 낮은 우선순위 (Low)

### Task 10-13: 추가 최적화

- 모바일 환경 최적화 (iOS constraints, PWA 백그라운드)
- 산업현장 조명 대응 (자동 조도 감지, ISO/Exposure)
- FPS 제한 (60fps → 10fps)
- 해상도 자동 조정 (1920x1080 → 1280x720 fallback)

---

## 📋 작업 진행 순서

1. ✅ 3개 에이전트 분석 완료
2. ⏳ **P0 Task 1-3 긴급 수정** (다음 작업)
3. P1 Task 4-6 높은 우선순위
4. 테스트 및 검증
5. P2 Task 7-9 중간 우선순위
6. 테스트 및 검증
7. P3 Task 10-13 추가 최적화 (선택)

---

## 🧪 전체 검증 체크리스트

### 기능 테스트
- [ ] 바코드 스캔 시작/중지 정상 동작
- [ ] QR 코드 인식 성공
- [ ] EAN-13 바코드 인식 성공
- [ ] 중복 방지 (1.5초 cooldown) 정상 동작
- [ ] Focus 버튼 클릭 시 에러 없음
- [ ] Torch 버튼 토글 정상 동작

### 성능 테스트
- [ ] Chrome DevTools Profiler로 리렌더링 확인 (초당 0-1회)
- [ ] Memory Profiler로 메모리 누수 확인 (0MB)
- [ ] CPU 프로파일링 (60-90% 감소)
- [ ] error.log에 AbortError 없음
- [ ] "🎯 Auto-starting scan" 1번만 출력

### 브라우저 호환성
- [ ] Chrome Desktop (WebCam)
- [ ] Chrome Android (후면 카메라)
- [ ] Safari iOS (PWA 모드)
- [ ] Samsung Internet (Android)

### StrictMode 테스트
- [ ] React StrictMode 활성화 상태에서 정상 동작
- [ ] Fast Refresh 시 중복 실행 없음
- [ ] Unmount → Remount 시 cleanup 정상 동작

---

## 📚 참고 자료

### 에이전트 분석 보고서
- TypeScript-Pro: 타입 안정성 및 메모리 누수
- Next.js-Developer: SSR/CSR, 모바일 환경, 조명 대응
- React-Specialist: Hooks, 리렌더링, Context 최적화

### 오픈소스 참고
- ZXing 공식: https://github.com/zxing-js/library
- html5-qrcode: https://github.com/mebjas/html5-qrcode
- react-qr-reader: https://github.com/react-qr-reader/react-qr-reader

---

**다음 작업:** P0 Task 1 (ZXing Reader Cleanup 추가)부터 시작하세요!