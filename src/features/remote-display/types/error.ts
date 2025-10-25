/**
 * 원격 디스플레이 에러 타입 정의
 */

/**
 * 원격 디스플레이 에러 코드
 */
export enum RemoteDisplayErrorCode {
  // 페어링 에러
  PAIRING_QR_INVALID = 'PAIRING_QR_INVALID',
  PAIRING_SESSION_NOT_FOUND = 'PAIRING_SESSION_NOT_FOUND',
  PAIRING_SESSION_EXPIRED = 'PAIRING_SESSION_EXPIRED',
  PAIRING_CODE_MISMATCH = 'PAIRING_CODE_MISMATCH',
  PAIRING_APPROVAL_FAILED = 'PAIRING_APPROVAL_FAILED',

  // 디스플레이 에러
  DISPLAY_NOT_FOUND = 'DISPLAY_NOT_FOUND',
  DISPLAY_OFFLINE = 'DISPLAY_OFFLINE',
  DISPLAY_LIST_FETCH_FAILED = 'DISPLAY_LIST_FETCH_FAILED',

  // 네트워크 에러
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // 권한 에러
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 검증 에러
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 기타
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 원격 디스플레이 에러
 */
export class RemoteDisplayError extends Error {
  /** 에러 코드 */
  readonly code: RemoteDisplayErrorCode;

  /** 사용자 친화적 메시지 */
  readonly userMessage: string;

  /** 기술적 메시지 */
  readonly technicalMessage: string;

  /** 복구 제안 */
  readonly recoverySuggestions: string[];

  /** 원본 에러 */
  readonly originalError?: Error;

  /** 타임스탬프 */
  readonly timestamp: string;

  /** 재시도 가능 여부 */
  readonly isRetryable: boolean;

  constructor(options: {
    code: RemoteDisplayErrorCode;
    userMessage: string;
    technicalMessage: string;
    recoverySuggestions: string[];
    originalError?: Error;
    isRetryable?: boolean;
  }) {
    super(options.technicalMessage);

    this.name = 'RemoteDisplayError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.technicalMessage = options.technicalMessage;
    this.recoverySuggestions = options.recoverySuggestions;
    this.originalError = options.originalError;
    this.timestamp = new Date().toISOString();
    this.isRetryable = options.isRetryable ?? false;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RemoteDisplayError);
    }
  }

  /**
   * JSON으로 변환 (로깅용)
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      recoverySuggestions: this.recoverySuggestions,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
          }
        : undefined,
    };
  }
}

/**
 * 페어링 에러 (RemoteDisplayError의 특수화)
 */
export class PairingError extends RemoteDisplayError {
  /** 세션 ID */
  readonly sessionId?: string;

  constructor(
    code: RemoteDisplayErrorCode,
    userMessage: string,
    technicalMessage: string,
    recoverySuggestions: string[],
    sessionId?: string,
    originalError?: Error
  ) {
    super({
      code,
      userMessage,
      technicalMessage,
      recoverySuggestions,
      originalError,
      isRetryable: true,
    });

    this.name = 'PairingError';
    this.sessionId = sessionId;
  }
}

/**
 * 타입 가드: RemoteDisplayError인지 확인
 */
export function isRemoteDisplayError(error: unknown): error is RemoteDisplayError {
  return error instanceof RemoteDisplayError;
}

/**
 * 타입 가드: PairingError인지 확인
 */
export function isPairingError(error: unknown): error is PairingError {
  return error instanceof PairingError;
}
