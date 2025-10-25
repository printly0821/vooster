/**
 * 페어링 상태 머신 타입 정의
 *
 * WeChat 스타일 페어링 플로우를 구현하기 위한
 * 상태, 이벤트, 컨텍스트 타입을 정의합니다.
 */

/**
 * 페어링 상태 (Finite State Machine)
 *
 * 상태 전이:
 * idle -> input -> generating -> displaying -> polling -> success/error
 */
export type PairingState =
  | 'idle'         // 초기 상태 (디스플레이 정보 입력 대기)
  | 'input'        // 디스플레이 정보 입력 중
  | 'generating'   // QR 코드 생성 중
  | 'displaying'   // QR 코드 표시 중
  | 'polling'      // 페어링 완료 폴링 중
  | 'success'      // 페어링 성공
  | 'error';       // 에러 발생

/**
 * 페어링 에러 타입
 *
 * 각 에러 타입에 따라 다른 복구 전략을 사용합니다.
 */
export interface PairingError {
  /** 에러 타입 */
  type: 'network' | 'timeout' | 'invalid' | 'server' | 'unknown';
  /** 에러 메시지 (사용자에게 표시) */
  message: string;
  /** 원본 에러 (디버깅용) */
  originalError?: Error;
  /** 재시도 가능 여부 */
  retryable: boolean;
}

/**
 * 페어링 컨텍스트 (상태 머신의 데이터)
 *
 * 페어링 과정에서 필요한 모든 데이터를 포함합니다.
 */
export interface PairingContext {
  /** 현재 상태 */
  state: PairingState;

  /** 사용자 입력 정보 */
  displayName?: string;
  deviceId?: string;

  /** 서버 응답 데이터 */
  displayId?: string;
  pairingToken?: string;
  qrExpiresAt?: number;

  /** 페어링 완료 데이터 */
  wsServerUrl?: string;
  authToken?: string;
  tokenExpiresAt?: number;

  /** 에러 정보 */
  error?: PairingError;

  /** 폴링 메타데이터 */
  pollCount?: number;
  maxPollAttempts?: number;
}

/**
 * 페어링 액션 (상태 전이 트리거)
 *
 * 사용자 액션 또는 비동기 이벤트로 상태를 변경합니다.
 */
export type PairingAction =
  | { type: 'START_INPUT'; displayName: string }
  | { type: 'SUBMIT_INFO'; displayName: string; deviceId: string }
  | { type: 'QR_GENERATED'; displayId: string; pairingToken: string; expiresAt: number }
  | { type: 'QR_EXPIRED' }
  | { type: 'POLL_START' }
  | { type: 'POLL_SUCCESS'; wsServerUrl: string; authToken: string; tokenExpiresAt: number }
  | { type: 'POLL_RETRY'; pollCount: number }
  | { type: 'ERROR'; error: PairingError }
  | { type: 'RESET' };

/**
 * 페어링 Reducer 타입
 *
 * @param context - 현재 컨텍스트
 * @param action - 상태 전이 액션
 * @returns 새로운 컨텍스트
 */
export type PairingReducer = (
  context: PairingContext,
  action: PairingAction
) => PairingContext;
