/**
 * Camera error handling infrastructure
 *
 * Provides comprehensive error classification, user-friendly messages,
 * and recovery suggestions for all camera-related failures.
 */

/**
 * Standardized error codes for camera operations
 *
 * Organized by category for easier error handling and analytics
 */
export enum CameraErrorCode {
  // Permission-related errors
  PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  PERMISSION_DISMISSED = 'CAMERA_PERMISSION_DISMISSED',
  PERMISSION_CHECK_FAILED = 'CAMERA_PERMISSION_CHECK_FAILED',

  // Device-related errors
  DEVICE_NOT_FOUND = 'CAMERA_DEVICE_NOT_FOUND',
  DEVICE_IN_USE = 'CAMERA_DEVICE_IN_USE',
  DEVICE_ENUMERATION_FAILED = 'CAMERA_DEVICE_ENUMERATION_FAILED',
  DEVICE_NOT_READABLE = 'CAMERA_DEVICE_NOT_READABLE',

  // Stream-related errors
  STREAM_START_FAILED = 'CAMERA_STREAM_START_FAILED',
  STREAM_OVERCONSTRAINED = 'CAMERA_STREAM_OVERCONSTRAINED',
  STREAM_TRACK_ERROR = 'CAMERA_STREAM_TRACK_ERROR',

  // Security and context errors
  INSECURE_CONTEXT = 'CAMERA_INSECURE_CONTEXT',
  NOT_ALLOWED_ERROR = 'CAMERA_NOT_ALLOWED',

  // Browser support errors
  API_NOT_SUPPORTED = 'CAMERA_API_NOT_SUPPORTED',
  BROWSER_NOT_SUPPORTED = 'CAMERA_BROWSER_NOT_SUPPORTED',

  // Generic errors
  UNKNOWN_ERROR = 'CAMERA_UNKNOWN_ERROR',
  TIMEOUT = 'CAMERA_TIMEOUT',
}

/**
 * Error severity levels for prioritization and UI treatment
 */
export enum CameraErrorSeverity {
  /** Critical error that completely blocks camera functionality */
  CRITICAL = 'critical',

  /** Error that can be recovered with user action */
  RECOVERABLE = 'recoverable',

  /** Warning that doesn't prevent functionality but may affect UX */
  WARNING = 'warning',

  /** Informational message */
  INFO = 'info',
}

/**
 * Comprehensive camera error class
 *
 * Extends native Error with additional context for better error handling
 */
export class CameraError extends Error {
  /** Standardized error code */
  readonly code: CameraErrorCode;

  /** Severity level of the error */
  readonly severity: CameraErrorSeverity;

  /** User-friendly error message (localization-ready) */
  readonly userMessage: string;

  /** Technical details for logging/debugging */
  readonly technicalMessage: string;

  /** Suggested recovery actions */
  readonly recoverySuggestions: string[];

  /** Original error if this wraps a native error */
  readonly originalError?: Error;

  /** ISO timestamp when error occurred */
  readonly timestamp: string;

  /** Whether this error can be retried */
  readonly isRetryable: boolean;

  constructor(options: {
    code: CameraErrorCode;
    severity: CameraErrorSeverity;
    userMessage: string;
    technicalMessage: string;
    recoverySuggestions: string[];
    originalError?: Error;
    isRetryable?: boolean;
  }) {
    super(options.technicalMessage);

    this.name = 'CameraError';
    this.code = options.code;
    this.severity = options.severity;
    this.userMessage = options.userMessage;
    this.technicalMessage = options.technicalMessage;
    this.recoverySuggestions = options.recoverySuggestions;
    this.originalError = options.originalError;
    this.timestamp = new Date().toISOString();
    this.isRetryable = options.isRetryable ?? false;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CameraError);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
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
 * Permission-specific error class
 */
export class CameraPermissionError extends CameraError {
  constructor(
    userMessage: string,
    technicalMessage: string,
    recoverySuggestions: string[],
    originalError?: Error
  ) {
    super({
      code: CameraErrorCode.PERMISSION_DENIED,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage,
      technicalMessage,
      recoverySuggestions,
      originalError,
      isRetryable: true,
    });
    this.name = 'CameraPermissionError';
  }
}

/**
 * Device-specific error class
 */
export class CameraDeviceError extends CameraError {
  readonly deviceId?: string;

  constructor(
    code: CameraErrorCode,
    userMessage: string,
    technicalMessage: string,
    recoverySuggestions: string[],
    deviceId?: string,
    originalError?: Error
  ) {
    super({
      code,
      severity: CameraErrorSeverity.RECOVERABLE,
      userMessage,
      technicalMessage,
      recoverySuggestions,
      originalError,
      isRetryable: true,
    });
    this.name = 'CameraDeviceError';
    this.deviceId = deviceId;
  }
}

/**
 * Stream-specific error class
 */
export class CameraStreamError extends CameraError {
  readonly constraints?: MediaStreamConstraints;

  constructor(
    code: CameraErrorCode,
    userMessage: string,
    technicalMessage: string,
    recoverySuggestions: string[],
    constraints?: MediaStreamConstraints,
    originalError?: Error
  ) {
    super({
      code,
      severity: CameraErrorSeverity.RECOVERABLE,
      userMessage,
      technicalMessage,
      recoverySuggestions,
      originalError,
      isRetryable: true,
    });
    this.name = 'CameraStreamError';
    this.constraints = constraints;
  }
}

/**
 * Maps DOMException and native errors to CameraError
 *
 * Provides user-friendly messages and recovery suggestions based on error type
 */
export function mapNativeErrorToCameraError(
  error: unknown,
  context?: string
): CameraError {
  // Handle DOMException from getUserMedia
  if (error instanceof DOMException) {
    return mapDOMExceptionToCameraError(error, context);
  }

  // Handle Error instances
  if (error instanceof Error) {
    return mapGenericErrorToCameraError(error, context);
  }

  // Handle unknown error types
  return new CameraError({
    code: CameraErrorCode.UNKNOWN_ERROR,
    severity: CameraErrorSeverity.CRITICAL,
    userMessage: '알 수 없는 오류가 발생했습니다.',
    technicalMessage: `Unknown error in ${context || 'camera operation'}: ${String(error)}`,
    recoverySuggestions: [
      '페이지를 새로고침해주세요.',
      '문제가 계속되면 브라우저를 재시작해주세요.',
    ],
    isRetryable: true,
  });
}

/**
 * Maps DOMException to specific CameraError
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions
 */
function mapDOMExceptionToCameraError(
  error: DOMException,
  context?: string
): CameraError {
  const errorName = error.name;

  switch (errorName) {
    case 'NotAllowedError':
      return new CameraPermissionError(
        '카메라 접근 권한이 거부되었습니다.',
        `Permission denied in ${context || 'camera access'}: ${error.message}`,
        [
          '브라우저 주소창의 카메라 아이콘을 클릭하여 권한을 허용해주세요.',
          '브라우저 설정에서 카메라 권한을 확인해주세요.',
          'iOS Safari의 경우: 설정 > Safari > 카메라에서 권한을 확인해주세요.',
        ],
        error
      );

    case 'NotFoundError':
      return new CameraDeviceError(
        CameraErrorCode.DEVICE_NOT_FOUND,
        '카메라를 찾을 수 없습니다.',
        `No camera device found in ${context || 'device enumeration'}: ${error.message}`,
        [
          '카메라가 연결되어 있는지 확인해주세요.',
          '다른 앱에서 카메라를 사용 중인지 확인해주세요.',
          '기기를 재시작해보세요.',
        ],
        undefined,
        error
      );

    case 'NotReadableError':
      return new CameraDeviceError(
        CameraErrorCode.DEVICE_NOT_READABLE,
        '카메라에 접근할 수 없습니다.',
        `Camera device not readable in ${context || 'stream start'}: ${error.message}`,
        [
          '다른 앱이나 탭에서 카메라를 사용 중일 수 있습니다.',
          '카메라를 사용 중인 다른 앱을 종료해주세요.',
          '브라우저 탭을 닫고 다시 시도해주세요.',
        ],
        undefined,
        error
      );

    case 'OverconstrainedError':
      return new CameraStreamError(
        CameraErrorCode.STREAM_OVERCONSTRAINED,
        '요청한 카메라 설정을 지원하지 않습니다.',
        `Camera constraints not satisfiable in ${context || 'stream start'}: ${error.message}`,
        [
          '다른 카메라를 선택해보세요.',
          '카메라 설정을 변경해보세요.',
        ],
        undefined,
        error
      );

    case 'SecurityError':
      return new CameraError({
        code: CameraErrorCode.INSECURE_CONTEXT,
        severity: CameraErrorSeverity.CRITICAL,
        userMessage: '보안 연결(HTTPS)이 필요합니다.',
        technicalMessage: `Security error in ${context || 'camera access'}: ${error.message}`,
        recoverySuggestions: [
          'HTTPS 프로토콜을 사용하는 페이지에서 접속해주세요.',
          '개발 환경의 경우 localhost를 사용하세요.',
        ],
        originalError: error,
        isRetryable: false,
      });

    case 'AbortError':
      return new CameraError({
        code: CameraErrorCode.STREAM_START_FAILED,
        severity: CameraErrorSeverity.RECOVERABLE,
        userMessage: '카메라 시작이 중단되었습니다.',
        technicalMessage: `Camera stream aborted in ${context || 'stream start'}: ${error.message}`,
        recoverySuggestions: ['다시 시도해주세요.'],
        originalError: error,
        isRetryable: true,
      });

    case 'TypeError':
      return new CameraError({
        code: CameraErrorCode.STREAM_START_FAILED,
        severity: CameraErrorSeverity.RECOVERABLE,
        userMessage: '잘못된 카메라 설정입니다.',
        technicalMessage: `Invalid constraints in ${context || 'stream start'}: ${error.message}`,
        recoverySuggestions: [
          '카메라 설정을 확인해주세요.',
          '다시 시도해주세요.',
        ],
        originalError: error,
        isRetryable: true,
      });

    default:
      return new CameraError({
        code: CameraErrorCode.UNKNOWN_ERROR,
        severity: CameraErrorSeverity.CRITICAL,
        userMessage: '카메라 오류가 발생했습니다.',
        technicalMessage: `DOMException in ${context || 'camera operation'}: ${errorName} - ${error.message}`,
        recoverySuggestions: [
          '페이지를 새로고침해주세요.',
          '브라우저를 재시작해보세요.',
        ],
        originalError: error,
        isRetryable: true,
      });
  }
}

/**
 * Maps generic Error to CameraError
 */
function mapGenericErrorToCameraError(
  error: Error,
  context?: string
): CameraError {
  return new CameraError({
    code: CameraErrorCode.UNKNOWN_ERROR,
    severity: CameraErrorSeverity.CRITICAL,
    userMessage: '예기치 않은 오류가 발생했습니다.',
    technicalMessage: `Error in ${context || 'camera operation'}: ${error.message}`,
    recoverySuggestions: [
      '페이지를 새로고침해주세요.',
      '문제가 계속되면 관리자에게 문의하세요.',
    ],
    originalError: error,
    isRetryable: true,
  });
}

/**
 * Creates a camera error for unsupported browser
 */
export function createUnsupportedBrowserError(): CameraError {
  return new CameraError({
    code: CameraErrorCode.BROWSER_NOT_SUPPORTED,
    severity: CameraErrorSeverity.CRITICAL,
    userMessage: '이 브라우저는 카메라를 지원하지 않습니다.',
    technicalMessage: 'MediaDevices API is not supported in this browser',
    recoverySuggestions: [
      'Chrome, Firefox, Safari, Edge 등 최신 브라우저를 사용해주세요.',
      '브라우저를 최신 버전으로 업데이트해주세요.',
    ],
    isRetryable: false,
  });
}

/**
 * Creates a camera error for insecure context
 */
export function createInsecureContextError(protocol: string): CameraError {
  return new CameraError({
    code: CameraErrorCode.INSECURE_CONTEXT,
    severity: CameraErrorSeverity.CRITICAL,
    userMessage: '보안 연결(HTTPS)이 필요합니다.',
    technicalMessage: `Camera access requires secure context, but using ${protocol}`,
    recoverySuggestions: [
      'HTTPS 프로토콜을 사용하는 페이지에서 접속해주세요.',
      '개발 환경의 경우 localhost를 사용하세요.',
    ],
    isRetryable: false,
  });
}

/**
 * Creates a camera error for permission check failure
 */
export function createPermissionCheckError(originalError?: Error): CameraError {
  return new CameraError({
    code: CameraErrorCode.PERMISSION_CHECK_FAILED,
    severity: CameraErrorSeverity.RECOVERABLE,
    userMessage: '카메라 권한 확인에 실패했습니다.',
    technicalMessage: `Failed to check camera permission: ${originalError?.message || 'unknown'}`,
    recoverySuggestions: [
      '페이지를 새로고침해주세요.',
      '브라우저를 재시작해보세요.',
    ],
    originalError,
    isRetryable: true,
  });
}

/**
 * Creates a camera error for device enumeration failure
 */
export function createDeviceEnumerationError(originalError?: Error): CameraError {
  return new CameraError({
    code: CameraErrorCode.DEVICE_ENUMERATION_FAILED,
    severity: CameraErrorSeverity.RECOVERABLE,
    userMessage: '카메라 목록을 가져올 수 없습니다.',
    technicalMessage: `Failed to enumerate camera devices: ${originalError?.message || 'unknown'}`,
    recoverySuggestions: [
      '카메라 권한을 허용해주세요.',
      '페이지를 새로고침해주세요.',
    ],
    originalError,
    isRetryable: true,
  });
}

/**
 * Creates a camera error for timeout
 */
export function createTimeoutError(operation: string, timeoutMs: number): CameraError {
  return new CameraError({
    code: CameraErrorCode.TIMEOUT,
    severity: CameraErrorSeverity.RECOVERABLE,
    userMessage: '카메라 작업 시간이 초과되었습니다.',
    technicalMessage: `${operation} timed out after ${timeoutMs}ms`,
    recoverySuggestions: [
      '네트워크 연결을 확인해주세요.',
      '다시 시도해주세요.',
    ],
    isRetryable: true,
  });
}

/**
 * Type guard to check if error is a CameraError
 */
export function isCameraError(error: unknown): error is CameraError {
  return error instanceof CameraError;
}

/**
 * Type guard to check if error is a CameraPermissionError
 */
export function isCameraPermissionError(
  error: unknown
): error is CameraPermissionError {
  return error instanceof CameraPermissionError;
}

/**
 * Type guard to check if error is a CameraDeviceError
 */
export function isCameraDeviceError(error: unknown): error is CameraDeviceError {
  return error instanceof CameraDeviceError;
}

/**
 * Type guard to check if error is a CameraStreamError
 */
export function isCameraStreamError(error: unknown): error is CameraStreamError {
  return error instanceof CameraStreamError;
}
