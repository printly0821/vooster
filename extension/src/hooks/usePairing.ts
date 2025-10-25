/**
 * 페어링 상태 관리 Hook
 *
 * WeChat 스타일 페어링 플로우를 상태 머신으로 구현합니다.
 * 디스플레이 등록, QR 생성, 폴링, 페어링 완료까지의 전체 과정을 관리합니다.
 */

import { useReducer } from 'preact/hooks';
import type { PairingContext, PairingAction, PairingError } from '../types/pairing';
import { registerDisplay, createPairingQR } from '../lib/api';
import { getOrCreateDeviceId } from '../lib/utils';
import { ApiError } from '../lib/api';

/**
 * 페어링 초기 상태
 */
const initialState: PairingContext = {
  state: 'idle',
  pollCount: 0,
  maxPollAttempts: 60, // 3초 * 60 = 3분
};

/**
 * 페어링 Reducer
 *
 * 액션에 따라 상태를 전이시킵니다.
 *
 * @param context - 현재 컨텍스트
 * @param action - 상태 전이 액션
 * @returns 새로운 컨텍스트
 */
function pairingReducer(
  context: PairingContext,
  action: PairingAction
): PairingContext {
  switch (action.type) {
    case 'START_INPUT':
      return {
        ...context,
        state: 'input',
        displayName: action.displayName,
        error: undefined,
      };

    case 'SUBMIT_INFO':
      return {
        ...context,
        state: 'generating',
        displayName: action.displayName,
        deviceId: action.deviceId,
        error: undefined,
      };

    case 'QR_GENERATED':
      return {
        ...context,
        state: 'displaying',
        displayId: action.displayId,
        pairingToken: action.pairingToken,
        qrExpiresAt: action.expiresAt,
        error: undefined,
      };

    case 'QR_EXPIRED':
      return {
        ...context,
        state: 'error',
        error: {
          type: 'timeout',
          message: 'QR 코드가 만료되었습니다. 다시 시도해주세요.',
          retryable: true,
        },
      };

    case 'POLL_START':
      return {
        ...context,
        state: 'polling',
        pollCount: 0,
        error: undefined,
      };

    case 'POLL_SUCCESS':
      return {
        ...context,
        state: 'success',
        wsServerUrl: action.wsServerUrl,
        authToken: action.authToken,
        tokenExpiresAt: action.tokenExpiresAt,
        error: undefined,
      };

    case 'POLL_RETRY':
      return {
        ...context,
        pollCount: action.pollCount,
      };

    case 'ERROR':
      return {
        ...context,
        state: 'error',
        error: action.error,
      };

    case 'RESET':
      return initialState;

    default:
      return context;
  }
}

/**
 * 페어링 상태 관리 Hook
 *
 * @returns 페어링 컨텍스트와 액션 함수들
 *
 * @example
 * const { context, startPairing, resetPairing } = usePairing();
 *
 * // 페어링 시작
 * await startPairing('My Display');
 *
 * // 상태 확인
 * if (context.state === 'success') {
 *   console.log('페어링 완료:', context.wsServerUrl);
 * }
 */
export function usePairing() {
  const [context, dispatch] = useReducer(pairingReducer, initialState);

  /**
   * 페어링 프로세스 시작
   *
   * 1. 디바이스 ID 생성
   * 2. 디스플레이 등록
   * 3. QR 코드 생성
   *
   * @param displayName - 디스플레이 이름
   */
  async function startPairing(displayName: string): Promise<void> {
    try {
      // 1. 입력 상태로 전환
      dispatch({ type: 'START_INPUT', displayName });

      // 2. 디바이스 ID 가져오기
      const deviceId = await getOrCreateDeviceId();

      // 3. 정보 제출 상태로 전환
      dispatch({ type: 'SUBMIT_INFO', displayName, deviceId });

      // 4. 디스플레이 등록 (T-014 서버 스펙)
      // 기본값이 자동으로 설정됨: purpose='display', orgId='default', lineId=displayName
      const registerResponse = await registerDisplay({
        deviceId,
        name: displayName,
        purpose: 'display',
        orgId: 'default',
        lineId: displayName,
      });

      // 5. QR 코드 생성
      const qrResponse = await createPairingQR({
        displayId: registerResponse.screenId,
        ttl: 180000, // 3분
      });

      // 6. QR 표시 상태로 전환
      dispatch({
        type: 'QR_GENERATED',
        displayId: registerResponse.screenId,
        pairingToken: qrResponse.pairingToken,
        expiresAt: qrResponse.expiresAt,
      });
    } catch (error) {
      // 에러 처리
      const pairingError = convertToPairingError(error);
      dispatch({ type: 'ERROR', error: pairingError });
    }
  }

  /**
   * 폴링 시작
   *
   * usePolling Hook에서 호출됩니다.
   */
  function startPolling(): void {
    dispatch({ type: 'POLL_START' });
  }

  /**
   * 폴링 성공
   *
   * @param wsServerUrl - WebSocket 서버 URL
   * @param authToken - JWT 인증 토큰
   * @param tokenExpiresAt - 토큰 만료 시간
   */
  function onPollSuccess(
    wsServerUrl: string,
    authToken: string,
    tokenExpiresAt: number
  ): void {
    dispatch({ type: 'POLL_SUCCESS', wsServerUrl, authToken, tokenExpiresAt });
  }

  /**
   * 폴링 재시도
   *
   * @param pollCount - 현재 폴링 횟수
   */
  function onPollRetry(pollCount: number): void {
    dispatch({ type: 'POLL_RETRY', pollCount });
  }

  /**
   * 폴링 에러
   *
   * @param error - 에러 정보
   */
  function onPollError(error: PairingError): void {
    dispatch({ type: 'ERROR', error });
  }

  /**
   * QR 만료
   */
  function onQRExpired(): void {
    dispatch({ type: 'QR_EXPIRED' });
  }

  /**
   * 페어링 초기화
   */
  function resetPairing(): void {
    dispatch({ type: 'RESET' });
  }

  return {
    context,
    startPairing,
    startPolling,
    onPollSuccess,
    onPollRetry,
    onPollError,
    onQRExpired,
    resetPairing,
  };
}

/**
 * 에러를 PairingError로 변환
 *
 * @param error - 원본 에러
 * @returns PairingError 객체
 *
 * @private 내부 함수
 */
function convertToPairingError(error: unknown): PairingError {
  if (error instanceof ApiError) {
    // API 에러
    if (error.code === 0) {
      // 네트워크 에러
      return {
        type: 'network',
        message: error.message,
        originalError: error,
        retryable: true,
      };
    }

    if (error.code >= 500) {
      // 서버 에러
      return {
        type: 'server',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        originalError: error,
        retryable: true,
      };
    }

    if (error.code >= 400) {
      // 클라이언트 에러
      return {
        type: 'invalid',
        message: error.message,
        originalError: error,
        retryable: false,
      };
    }
  }

  // 알 수 없는 에러
  return {
    type: 'unknown',
    message: '알 수 없는 에러가 발생했습니다.',
    originalError: error instanceof Error ? error : undefined,
    retryable: true,
  };
}
