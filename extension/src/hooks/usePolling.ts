/**
 * 페어링 폴링 Hook
 *
 * 3초 간격으로 서버를 폴링하여 페어링 완료 여부를 확인합니다.
 * 페어링이 완료되면 WebSocket URL과 JWT 토큰을 받아 Storage에 저장합니다.
 */

import { useEffect, useRef } from 'preact/hooks';
import { pollPairing } from '../lib/api';
import type { PairingError } from '../types/pairing';
import { STORAGE_KEYS } from '../types/storage';

/**
 * 폴링 옵션
 */
export interface PollingOptions {
  /** 폴링할 세션 ID (QR 생성 시 받은 sessionId) */
  sessionId: string;
  /** 디스플레이 ID */
  displayId: string;
  /** 디스플레이 이름 */
  displayName: string;
  /** 폴링 활성화 여부 */
  enabled: boolean;
  /** 폴링 간격 (밀리초, 기본 3초) */
  interval?: number;
  /** 최대 폴링 횟수 (기본 60회 = 3분) */
  maxAttempts?: number;
  /** 성공 콜백 */
  onSuccess: (wsServerUrl: string, authToken: string, tokenExpiresAt: number) => void;
  /** 재시도 콜백 */
  onRetry: (attemptCount: number) => void;
  /** 에러 콜백 */
  onError: (error: PairingError) => void;
  /** 타임아웃 콜백 */
  onTimeout: () => void;
}

/**
 * 페어링 폴링 Hook
 *
 * 3초 간격으로 서버를 폴링하며, 페어링 완료 시 Storage에 저장합니다.
 *
 * @param options - 폴링 옵션
 *
 * @example
 * usePolling({
 *   sessionId: 'session-uuid',
 *   displayId: 'display-uuid',
 *   displayName: 'My Display',
 *   enabled: true,
 *   onSuccess: (wsServerUrl, authToken, tokenExpiresAt) => {
 *     console.log('페어링 완료:', wsServerUrl);
 *   },
 *   onRetry: (count) => {
 *     console.log(`재시도 ${count}회`);
 *   },
 *   onError: (error) => {
 *     console.error('폴링 에러:', error);
 *   },
 *   onTimeout: () => {
 *     console.log('폴링 타임아웃');
 *   }
 * });
 */
export function usePolling(options: PollingOptions): void {
  const {
    sessionId,
    displayId,
    displayName,
    enabled,
    interval = 3000, // 3초
    maxAttempts = 60, // 3분
    onSuccess,
    onRetry,
    onError,
    onTimeout,
  } = options;

  // 폴링 횟수 추적
  const attemptCountRef = useRef(0);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 폴링이 비활성화되거나 sessionId가 없으면 중단
    if (!enabled || !sessionId) {
      return;
    }

    // 폴링 시작
    attemptCountRef.current = 0;
    startPolling();

    // Cleanup 함수
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [enabled, sessionId]);

  /**
   * 폴링 시작
   *
   * @private 내부 함수
   */
  async function startPolling(): Promise<void> {
    try {
      // 최대 시도 횟수 초과 확인
      if (attemptCountRef.current >= maxAttempts) {
        onTimeout();
        return;
      }

      // 폴링 횟수 증가
      attemptCountRef.current += 1;

      // 서버 폴링 (sessionId 사용)
      const response = await pollPairing(sessionId);

      // 페어링 완료 확인
      if (response.isPaired && response.wsServerUrl && response.authToken) {
        // Storage에 페어링 정보 저장
        await savePairingInfo(
          displayId,
          displayName,
          response.wsServerUrl,
          response.authToken,
          response.tokenExpiresAt || Date.now() + 24 * 60 * 60 * 1000 // 기본 24시간
        );

        // 성공 콜백 호출
        onSuccess(
          response.wsServerUrl,
          response.authToken,
          response.tokenExpiresAt || Date.now() + 24 * 60 * 60 * 1000
        );
        return;
      }

      // 페어링이 아직 완료되지 않음 -> 재시도
      onRetry(attemptCountRef.current);

      // 다음 폴링 예약
      timeoutIdRef.current = setTimeout(() => {
        startPolling();
      }, interval);
    } catch (error) {
      // 에러 발생 -> 에러 콜백 호출
      const pairingError: PairingError = {
        type: 'network',
        message: '페어링 상태 확인에 실패했습니다.',
        originalError: error instanceof Error ? error : undefined,
        retryable: true,
      };

      onError(pairingError);

      // 에러가 재시도 가능하면 다시 폴링
      if (pairingError.retryable && attemptCountRef.current < maxAttempts) {
        onRetry(attemptCountRef.current);
        timeoutIdRef.current = setTimeout(() => {
          startPolling();
        }, interval);
      }
    }
  }
}

/**
 * 페어링 정보를 Chrome Storage에 저장
 *
 * @param displayId - 디스플레이 ID
 * @param displayName - 디스플레이 이름
 * @param wsServerUrl - WebSocket 서버 URL
 * @param authToken - JWT 인증 토큰
 * @param tokenExpiresAt - 토큰 만료 시간
 *
 * @private 내부 함수
 */
async function savePairingInfo(
  displayId: string,
  displayName: string,
  wsServerUrl: string,
  authToken: string,
  tokenExpiresAt: number
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.PAIRING]: {
      isPaired: true,
      displayId,
      displayName,
      wsServerUrl,
      authToken,
      tokenExpiresAt,
      pairedAt: Date.now(),
    },
  });
}
