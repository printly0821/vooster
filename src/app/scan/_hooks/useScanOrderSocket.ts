/**
 * 바코드 스캔 시 Socket.IO를 통해 서버로 주문 정보를 전송하는 Hook
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { emitScanOrder } from '@/features/monitor/lib/socket-event-client';

/**
 * Socket.IO 연결 상태
 */
export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * useScanOrderSocket Hook 설정
 */
export interface UseScanOrderSocketConfig {
  enabled?: boolean;
  serverUrl?: string;
  token?: string;
  sessionId?: string;
}

/**
 * useScanOrderSocket Hook 반환 타입
 */
export interface UseScanOrderSocketReturn {
  isConnected: boolean;
  status: SocketConnectionStatus;
  sendScanOrder: (orderNo: string) => Promise<boolean>;
  error: string | null;
}

/**
 * Socket.IO를 통해 주문 스캔 이벤트를 전송하는 Hook
 *
 * @example
 * ```tsx
 * const { isConnected, sendScanOrder, error } = useScanOrderSocket({
 *   serverUrl: process.env.NEXT_PUBLIC_SOCKET_IO_URL,
 *   token: userToken,
 *   sessionId: currentSessionId,
 * });
 *
 * const handleScan = async (orderNo: string) => {
 *   const success = await sendScanOrder(orderNo);
 *   if (!success) {
 *     console.error('Failed to send scan event');
 *   }
 * };
 * ```
 */
export function useScanOrderSocket(
  config: UseScanOrderSocketConfig = {}
): UseScanOrderSocketReturn {
  const {
    enabled = true,
    serverUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:3000',
    token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || 'test-token',
    sessionId = process.env.NEXT_PUBLIC_SESSION_ID,
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Socket.IO 초기화
  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('[useScanOrderSocket] Socket.IO 초기화 시작:', {
      serverUrl,
      hasToken: !!token,
    });

    const socket = io(serverUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[useScanOrderSocket] 서버 연결됨:', socket.id);
      setStatus('connected');
      setError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('[useScanOrderSocket] 연결 오류:', err);
      setStatus('connecting');
      setError(err.message);
    });

    socket.on('disconnect', () => {
      console.log('[useScanOrderSocket] 서버 연결 해제됨');
      setStatus('disconnected');
    });

    socketRef.current = socket;

    return () => {
      console.log('[useScanOrderSocket] Socket.IO 정리 시작');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [enabled, serverUrl, token]);

  // sendScanOrder 콜백
  const sendScanOrder = useCallback(
    async (orderNo: string): Promise<boolean> => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) {
        const errorMsg = '서버에 연결되지 않았습니다';
        console.error('[useScanOrderSocket]', errorMsg);
        setError(errorMsg);
        return false;
      }

      if (!sessionId) {
        const errorMsg = '세션 ID가 없습니다';
        console.error('[useScanOrderSocket]', errorMsg);
        setError(errorMsg);
        return false;
      }

      try {
        console.log('[useScanOrderSocket] 스캔 이벤트 전송:', {
          sessionId,
          orderNo,
        });

        const success = await emitScanOrder(
          socket,
          {
            sessionId,
            orderNo,
          },
          {
            maxRetries: 3,
            timeout: 2000,
          }
        );

        if (success) {
          setError(null);
        } else {
          const errorMsg = '스캔 이벤트 전송 실패';
          setError(errorMsg);
        }

        return success;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[useScanOrderSocket] 예외 발생:', errorMsg);
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
