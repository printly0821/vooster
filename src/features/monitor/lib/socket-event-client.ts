/**
 * Socket.IO scanOrder 이벤트 클라이언트 라이브러리
 * 모바일에서 바코드 스캔 시 서버로 주문 정보를 전송합니다.
 */

import type { Socket } from 'socket.io-client';

/**
 * 스캔 이벤트 페이로드
 */
export interface ScanOrderPayload {
  sessionId: string;
  orderNo: string;
  ts: number;
  nonce: string;
}

/**
 * 스캔 이벤트 ACK 응답
 */
export interface ScanOrderAck {
  received: boolean;
  nonce: string;
}

/**
 * 재시도 대기열 항목
 */
interface RetryQueueItem {
  payload: ScanOrderPayload;
  retryCount: number;
  maxRetries: number;
  timeout: number;
}

/**
 * 스캔 이벤트 전송 설정
 */
export interface ScanOrderConfig {
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
}

/**
 * nonce 생성 함수 (간단한 UUID-like 구현)
 */
function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * scanOrder 이벤트를 전송합니다.
 * ACK를 기반으로 재시도를 수행합니다.
 */
export async function emitScanOrder(
  socket: Socket,
  payload: Omit<ScanOrderPayload, 'ts' | 'nonce'>,
  config: ScanOrderConfig = {}
): Promise<boolean> {
  const { maxRetries = 3, timeout = 2000 } = config;

  const scanPayload: ScanOrderPayload = {
    ...payload,
    ts: Date.now(),
    nonce: generateNonce(),
  };

  return new Promise((resolve) => {
    let retryCount = 0;

    const attemptSend = () => {
      if (!socket.connected) {
        console.warn('[scanOrder] 서버에 연결되지 않았습니다');
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(attemptSend, 1000); // 1초 후 재시도
        } else {
          console.error('[scanOrder] 최대 재시도 횟수 초과');
          resolve(false);
        }
        return;
      }

      const timeoutId = setTimeout(() => {
        console.warn(`[scanOrder] ACK 타임아웃 (${timeout}ms)`);
        if (retryCount < maxRetries) {
          retryCount++;
          attemptSend();
        } else {
          console.error('[scanOrder] 최대 재시도 횟수 초과');
          resolve(false);
        }
      }, timeout);

      socket.timeout(timeout).emit('scanOrder', scanPayload, (err: any, ack: ScanOrderAck) => {
        clearTimeout(timeoutId);

        if (err) {
          console.error('[scanOrder] 에러 발생:', err);
          if (retryCount < maxRetries) {
            retryCount++;
            attemptSend();
          } else {
            resolve(false);
          }
        } else if (ack?.received) {
          console.log('[scanOrder] 스캔 이벤트 전송 성공:', scanPayload.nonce);
          resolve(true);
        } else {
          console.warn('[scanOrder] ACK 미수신');
          if (retryCount < maxRetries) {
            retryCount++;
            attemptSend();
          } else {
            resolve(false);
          }
        }
      });
    };

    attemptSend();
  });
}

/**
 * 전역 재시도 큐 관리 (선택사항)
 */
class ScanOrderRetryQueue {
  private queue: RetryQueueItem[] = [];
  private socket: Socket | null = null;

  setSocket(socket: Socket) {
    this.socket = socket;
  }

  add(payload: ScanOrderPayload, maxRetries = 3, timeout = 2000) {
    this.queue.push({
      payload,
      retryCount: 0,
      maxRetries,
      timeout,
    });

    if (this.socket?.connected) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (!this.socket?.connected) {
      return;
    }

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const success = await emitScanOrder(this.socket, item.payload, {
        maxRetries: item.maxRetries,
        timeout: item.timeout,
      });

      if (!success) {
        console.error('[RetryQueue] 스캔 이벤트 전송 최종 실패:', item.payload.nonce);
      }
    }
  }

  clear() {
    this.queue = [];
  }
}

export const scanOrderRetryQueue = new ScanOrderRetryQueue();
