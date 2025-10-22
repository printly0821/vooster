/**
 * Socket.IO 재연결 관리 (T-008)
 * 지수 백오프와 사용자 안내를 포함한 재연결 로직
 */

import type { Socket } from 'socket.io-client';
import type { ReconnectionConfig } from '../types';

const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 15000,
  backoffMultiplier: 2,
};

/**
 * Socket.IO 재연결 설정 적용
 */
export function setupSocketReconnection(
  socket: Socket,
  config: Partial<ReconnectionConfig> = {},
  callbacks?: {
    onReconnecting?: (attemptNumber: number, nextDelay: number) => void;
    onReconnectFailed?: () => void;
  }
): void {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Socket.IO 설정
  socket.io.opts.reconnection = true;
  socket.io.opts.reconnectionDelay = mergedConfig.initialDelay;
  socket.io.opts.reconnectionDelayMax = mergedConfig.maxDelay;
  socket.io.opts.reconnectionAttempts = mergedConfig.maxRetries;

  // 재연결 시도 이벤트
  socket.on('reconnect_attempt', (attemptNumber: number) => {
    const delay = calculateDelay(
      attemptNumber,
      mergedConfig.initialDelay,
      mergedConfig.maxDelay,
      mergedConfig.backoffMultiplier
    );

    console.log(`[Socket.IO] Reconnection attempt ${attemptNumber} (delay: ${delay}ms)`);
    callbacks?.onReconnecting?.(attemptNumber, delay);
  });

  // 재연결 실패 이벤트
  socket.on('reconnect_failed', () => {
    console.error('[Socket.IO] Reconnection failed after max retries');
    callbacks?.onReconnectFailed?.();
  });

  // 재연결 성공 이벤트
  socket.on('reconnect', () => {
    console.log('[Socket.IO] Reconnected successfully');
  });
}

/**
 * 지연 시간 계산 (지수 백오프)
 */
function calculateDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}

/**
 * 수동 재연결 시도
 */
export async function manualReconnect(
  socket: Socket,
  options?: {
    timeout?: number;
    maxAttempts?: number;
  }
): Promise<boolean> {
  const timeout = options?.timeout ?? 5000;
  const maxAttempts = options?.maxAttempts ?? 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    return new Promise((resolve) => {
      console.log(`[Socket.IO] Manual reconnection attempt ${attempt}/${maxAttempts}`);

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);

      // 재연결 시도
      socket.connect();

      // 연결 성공
      const onConnect = () => {
        clearTimeout(timeoutId);
        socket.off('connect', onConnect);
        socket.off('connect_error', onConnectError);
        resolve(true);
      };

      // 연결 실패
      const onConnectError = (error: Error) => {
        if (attempt === maxAttempts) {
          clearTimeout(timeoutId);
          socket.off('connect', onConnect);
          socket.off('connect_error', onConnectError);
          resolve(false);
        }
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onConnectError);
    });
  }

  return false;
}

/**
 * 현재 재연결 상태 조회
 */
export function getReconnectionStatus(socket: Socket): {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
} {
  return {
    isConnected: socket.connected,
    isReconnecting: socket.io.reconnection(),
    reconnectAttempts: socket.io.opts.reconnectionAttempts || 0,
  };
}
