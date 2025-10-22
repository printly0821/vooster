/**
 * 세컨드 모니터 컨트롤러 컴포넌트
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { MonitorState, MonitorSettings } from '../types';
import {
  createSocketClient,
  attachSocketListeners,
  requestSessionCreate,
} from '../lib/socket-client';
import { generatePairingQR, QR_SIZES } from '../lib/qr-generator';
import {
  openOrFocusPopup,
  requestWindowPermission,
  registerUserGestureListener,
} from '../lib/window-manager';

interface MonitorControllerProps {
  serverUrl: string;
  token: string;
  appBaseUrl?: string;
  orderFormUrlTemplate?: string;
  onNavigate?: (orderNo: string) => void;
  onStatusChange?: (state: MonitorState) => void;
}

export function MonitorController({
  serverUrl,
  token,
  appBaseUrl = 'https://app.example.com',
  orderFormUrlTemplate,
  onNavigate,
  onStatusChange,
}: MonitorControllerProps) {
  const socketRef = useRef<Socket | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const popupRef = useRef<Window | null>(null);
  const seenNoncesRef = useRef<Set<string>>(new Set());
  const [state, setState] = useState<MonitorState>({
    connectionStatus: 'disconnected',
    pairingStatus: 'idle',
    sessionId: null,
    pairingToken: null,
    pairingUrl: null,
    lastOrderNo: null,
    errorMessage: null,
    popupWindow: null,
  });

  const [settings, setSettings] = useState<MonitorSettings>({
    autoOpenMode: 'focus-existing',
    enableMultiScreen: true,
    qrCodeSize: 'medium',
  });

  // 상태 업데이트
  const updateState = (updates: Partial<MonitorState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      onStatusChange?.(newState);
      return newState;
    });
  };

  // Socket.IO 연결 초기화 (서버 URL/토큰만 변경 시)
  useEffect(() => {
    const socket = createSocketClient({ serverUrl, token });
    socketRef.current = socket;

    // 이벤트 리스너 등록
    const cleanup = attachSocketListeners(socket, {
      'connect': () => {
        console.log('서버 연결됨');
        updateState({ connectionStatus: 'connected' });
      },
      'disconnect': () => {
        console.log('서버 연결 해제됨');
        updateState({ connectionStatus: 'disconnected' });
      },
      'connect_error': (error) => {
        console.error('연결 오류:', error);
        updateState({
          connectionStatus: 'disconnected',
          errorMessage: '서버 연결 실패',
        });
      },
      'session:created': async (data) => {
        console.log('세션 생성됨:', data.sessionId);
        updateState({
          sessionId: data.sessionId,
          pairingToken: data.pairingToken,
          pairingUrl: data.pairingUrl,
          pairingStatus: 'waiting',
          errorMessage: null,
        });
      },
      'session:paired': (data) => {
        console.log('세션 페어링됨:', data.sessionId);
        updateState({
          pairingStatus: 'paired',
          errorMessage: null,
        });
      },
      'session:error': (data) => {
        console.error('세션 오류:', data.code);
        updateState({
          errorMessage: data.message || '세션 오류 발생',
        });
      },
      'navigate': (data) => {
        console.log('주문 네비게이션:', data.orderNo);

        // nonce 기반 중복 제거 (T-007 요구사항)
        if (data.nonce && seenNoncesRef.current.has(data.nonce)) {
          console.warn('중복 네비게이션 이벤트 무시:', data.nonce);
          return;
        }

        // nonce 기록 (최대 100개까지 유지)
        if (data.nonce) {
          seenNoncesRef.current.add(data.nonce);
          if (seenNoncesRef.current.size > 100) {
            const noncesArray = Array.from(seenNoncesRef.current);
            seenNoncesRef.current = new Set(noncesArray.slice(-100));
          }
        }

        updateState({ lastOrderNo: data.orderNo });
        onNavigate?.(data.orderNo);
      },
    });

    // 세션 생성 요청
    if (socket.connected) {
      requestSessionCreate(socket).catch((error) => {
        console.error('세션 생성 실패:', error);
        updateState({
          errorMessage: '세션 생성 실패',
        });
      });
    }

    return () => {
      cleanup();
      socket.disconnect(); // ✅ cleanup에서 disconnect 추가
    };
  }, [serverUrl, token]); // ✅ 의존성 최소화

  // QR 코드 생성 (세션 또는 설정 변경 시)
  useEffect(() => {
    if (!state.sessionId || !state.pairingToken || !qrCanvasRef.current) {
      return;
    }

    const qrSize =
      settings.qrCodeSize === 'small'
        ? QR_SIZES.small
        : settings.qrCodeSize === 'large'
          ? QR_SIZES.large
          : QR_SIZES.medium;

    generatePairingQR(
      qrCanvasRef.current,
      state.sessionId,
      state.pairingToken,
      appBaseUrl
    ).catch((error) => {
      console.error('QR 코드 생성 실패:', error);
      updateState({ errorMessage: 'QR 코드 생성 실패' });
    });
  }, [state.sessionId, state.pairingToken, settings.qrCodeSize, appBaseUrl]);

  // URL 템플릿 처리 및 팝업 열기 (주문 번호 변경 시)
  useEffect(() => {
    if (!state.lastOrderNo) {
      return;
    }

    let workOrderUrl = `${appBaseUrl}/orders/job-order-report/${state.lastOrderNo}`;

    if (orderFormUrlTemplate) {
      workOrderUrl = orderFormUrlTemplate.replace('{orderNo}', state.lastOrderNo);
    }

    console.log('제작의뢰서 URL:', workOrderUrl);

    const popup = openOrFocusPopup(
      workOrderUrl,
      {
        features:
          'width=1024,height=768,left=0,top=0,scrollbars=yes,resizable=yes,noopener,noreferrer',
        name: 'workorder',
        width: 1024,
        height: 768,
      },
      popupRef.current || undefined
    );

    if (popup) {
      popupRef.current = popup;
      updateState({ popupWindow: popup });
    } else {
      updateState({
        errorMessage: '팝업 차단됨. 브라우저 설정을 확인해주세요.',
      });
    }
  }, [state.lastOrderNo, appBaseUrl, orderFormUrlTemplate]);

  // 수동 창 열기 핸들러
  const handleOpenWindow = () => {
    if (!state.lastOrderNo) {
      updateState({ errorMessage: '주문 정보가 없습니다.' });
      return;
    }

    const workOrderUrl = `${appBaseUrl}/orders/job-order-report/${state.lastOrderNo}`;
    const popup = openOrFocusPopup(
      workOrderUrl,
      {
        features:
          'width=1024,height=768,left=0,top=0,scrollbars=yes,resizable=yes,noopener,noreferrer',
        name: 'workorder',
        width: 1024,
        height: 768,
      },
      popupRef.current || undefined
    );

    if (popup) {
      popupRef.current = popup;
      updateState({ popupWindow: popup, errorMessage: null });
    } else {
      updateState({
        errorMessage: '팝업을 열 수 없습니다. 팝업 차단 설정을 확인해주세요.',
      });
    }
  };

  // QR 재생성 핸들러
  const handleRegenerateQR = async () => {
    if (!socketRef.current?.connected) {
      updateState({
        errorMessage: '서버에 연결되지 않았습니다.',
      });
      return;
    }

    try {
      await requestSessionCreate(socketRef.current);
      updateState({ errorMessage: null });
    } catch (error) {
      console.error('QR 재생성 실패:', error);
      updateState({
        errorMessage: 'QR 재생성 실패',
      });
    }
  };

  // Window Management API 권한 요청
  const handleRequestPermission = async () => {
    try {
      const granted = await requestWindowPermission();
      if (granted) {
        updateState({ errorMessage: null });
      } else {
        updateState({
          errorMessage:
            'Window Management API 권한을 얻지 못했습니다.',
        });
      }
    } catch (error) {
      console.error('권한 요청 실패:', error);
      updateState({
        errorMessage: '권한 요청 중 오류 발생',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow-lg">
      {/* 상태 정보 */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">연결 상태:</span>
          <span
            className={`px-2 py-1 rounded text-white ${
              state.connectionStatus === 'connected'
                ? 'bg-green-500'
                : state.connectionStatus === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          >
            {state.connectionStatus === 'connected'
              ? '연결됨'
              : state.connectionStatus === 'connecting'
                ? '연결 중'
                : '연결 안됨'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">페어링 상태:</span>
          <span
            className={`px-2 py-1 rounded text-white ${
              state.pairingStatus === 'paired'
                ? 'bg-green-500'
                : state.pairingStatus === 'waiting'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
            }`}
          >
            {state.pairingStatus === 'paired'
              ? '완료됨'
              : state.pairingStatus === 'waiting'
                ? '대기 중'
                : '미연결'}
          </span>
        </div>

        {state.lastOrderNo && (
          <div className="flex items-center gap-2">
            <span className="font-semibold">마지막 주문:</span>
            <span className="font-mono">{state.lastOrderNo}</span>
          </div>
        )}
      </div>

      {/* QR 코드 */}
      {state.sessionId && (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <canvas
              ref={qrCanvasRef}
              className="border-2 border-gray-300"
            />
          </div>
          <p className="text-xs text-gray-600">
            세션: {state.sessionId.substring(0, 8)}
          </p>
        </div>
      )}

      {/* 오류 메시지 */}
      {state.errorMessage && (
        <div className="p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
          ⚠️ {state.errorMessage}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleOpenWindow}
          disabled={!state.lastOrderNo || !state.connectionStatus}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          제작의뢰서 열기
        </button>

        <button
          onClick={handleRegenerateQR}
          disabled={!state.connectionStatus}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          QR 재생성
        </button>

        <button
          onClick={handleRequestPermission}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
        >
          멀티 모니터 권한 요청
        </button>
      </div>

      {/* 설정 */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold">설정</h3>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="autoOpenMode"
              value="new-window"
              checked={settings.autoOpenMode === 'new-window'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoOpenMode: e.target.value as any,
                })
              }
              className="cursor-pointer"
            />
            <span className="text-sm">항상 새 창 열기</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="autoOpenMode"
              value="focus-existing"
              checked={settings.autoOpenMode === 'focus-existing'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoOpenMode: e.target.value as any,
                })
              }
              className="cursor-pointer"
            />
            <span className="text-sm">기존 창 재사용</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="autoOpenMode"
              value="manual"
              checked={settings.autoOpenMode === 'manual'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoOpenMode: e.target.value as any,
                })
              }
              className="cursor-pointer"
            />
            <span className="text-sm">수동 열기</span>
          </label>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableMultiScreen}
            onChange={(e) =>
              setSettings({
                ...settings,
                enableMultiScreen: e.target.checked,
              })
            }
            className="cursor-pointer"
          />
          <span className="text-sm">멀티 모니터 지원</span>
        </label>

        <div>
          <label className="text-sm font-medium">QR 코드 크기</label>
          <select
            value={settings.qrCodeSize}
            onChange={(e) =>
              setSettings({
                ...settings,
                qrCodeSize: e.target.value as any,
              })
            }
            className="mt-1 w-full px-3 py-2 border rounded"
          >
            <option value="small">작음</option>
            <option value="medium">중간</option>
            <option value="large">큼</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default MonitorController;
