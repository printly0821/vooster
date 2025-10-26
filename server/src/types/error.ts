/**
 * 에러 및 검증 타입 정의
 *
 * API 에러 응답, 검증 에러, 커스텀 예외 클래스 관련 타입들
 */

/**
 * 통일된 에러 응답
 *
 * 모든 에러는 이 형식으로 반환
 */
export interface ErrorResponse {
  /** 성공 여부 (항상 false) */
  ok: false;

  /** 에러 분류 (프로그래밍 방식으로 처리 가능) */
  reason: string;

  /** 사용자 친화적 에러 메시지 (한글) */
  message?: string;

  /** 검증 에러 목록 (validation_error일 때만) */
  errors?: ValidationError[];

  /** 트랜잭션 ID (추적 가능하게) */
  txId?: string;
}

/**
 * Zod 검증 에러 정보
 *
 * Zod의 ZodError를 정규화하여 클라이언트로 반환
 */
export interface ValidationError {
  /** 에러가 발생한 필드 경로 (예: 'screenId', 'metadata.key') */
  field: string;

  /** 에러 메시지 (예: 'Invalid email format') */
  message: string;

  /** 에러 타입 (예: 'regex', 'too_small', 'invalid_type') */
  code: string;

  /** 에러 관련 추가 데이터 (예: { minimum: 1, received: 0 }) */
  context?: Record<string, any>;
}

/**
 * API 에러의 기본 추상 클래스
 *
 * 모든 예상되는 에러는 이 클래스를 상속하여 구현
 */
export abstract class ApiError extends Error {
  /** HTTP 상태 코드 */
  abstract statusCode: number;

  /** 에러 분류 (프로그래밍 방식 처리용) */
  abstract reason: string;

  /** 사용자 메시지 (한글) */
  abstract userMessage: string;

  /** 추가 데이터 (선택적) */
  abstract context?: Record<string, any>;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * ErrorResponse로 변환
   */
  toJSON(): ErrorResponse {
    return {
      ok: false,
      reason: this.reason,
      message: this.userMessage,
    };
  }
}

/**
 * 입력 검증 에러
 *
 * Zod 또는 다른 검증 라이브러리에서 발생한 검증 실패
 */
export class ValidationApiError extends ApiError {
  statusCode = 400;
  reason = 'validation_error';
  userMessage = '입력 데이터가 유효하지 않습니다';

  /** 검증 에러 목록 */
  errors: ValidationError[];

  /** 추가 컨텍스트 데이터 */
  context?: Record<string, any>;

  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
  }

  toJSON(): ErrorResponse {
    return {
      ok: false,
      reason: this.reason,
      message: this.userMessage,
      errors: this.errors,
    };
  }
}

/**
 * 권한 에러
 *
 * 사용자가 작업할 권한이 없을 때
 */
export class ForbiddenError extends ApiError {
  statusCode = 403;
  reason = 'forbidden';
  userMessage = '이 작업을 수행할 권한이 없습니다';

  /** 추가 컨텍스트 데이터 */
  context?: Record<string, any>;

  constructor(message?: string) {
    super(message || 'Forbidden');
  }
}

/**
 * 찾을 수 없음 에러
 *
 * 요청한 리소스가 존재하지 않을 때
 */
export class NotFoundError extends ApiError {
  statusCode = 404;
  reason = 'not_found';
  userMessage = '요청한 리소스를 찾을 수 없습니다';

  /** 추가 컨텍스트 데이터 */
  context?: Record<string, any>;

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

/**
 * Rate limit 에러
 *
 * 요청 제한을 초과했을 때
 */
export class RateLimitError extends ApiError {
  statusCode = 429;
  reason = 'rate_limit';
  userMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';

  /** 재시도까지 남은 시간 (초) */
  context: Record<string, any>;

  constructor(retryAfter: number) {
    super(`Rate limited, retry after ${retryAfter}s`);
    this.context = { retryAfter };
  }
}

/**
 * 인증 에러
 *
 * 인증이 필요하거나 인증이 실패했을 때
 */
export class UnauthorizedError extends ApiError {
  statusCode = 401;
  reason = 'unauthorized';
  userMessage = '인증이 필요합니다';

  /** 추가 컨텍스트 데이터 */
  context?: Record<string, any>;

  constructor(message?: string) {
    super(message || 'Unauthorized');
  }
}

/**
 * 서버 내부 에러
 *
 * 예상하지 못한 서버 에러가 발생했을 때
 */
export class InternalServerError extends ApiError {
  statusCode = 500;
  reason = 'internal_error';
  userMessage = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요';

  /** 추가 컨텍스트 데이터 */
  context?: Record<string, any>;

  constructor(message?: string) {
    super(message || 'Internal server error');
  }
}

/**
 * 서비스 이용 불가 에러
 *
 * 필요한 외부 서비스(예: 디스플레이 클라이언트)가 없을 때
 */
export class ServiceUnavailableError extends ApiError {
  statusCode = 503;
  reason = 'service_unavailable';
  userMessage = '서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해주세요';

  /** 추가 컨텍스트 데이터 */
  context?: Record<string, any>;

  constructor(message?: string) {
    super(message || 'Service unavailable');
  }
}

/**
 * 에러 응답 변환 유틸리티
 *
 * ApiError를 ErrorResponse로 변환
 * API 핸들러에서 catch한 에러를 표준화된 응답으로 변환
 *
 * @param error - 변환할 ApiError 인스턴스
 * @param txId - 트랜잭션 ID (선택적, 추적용)
 * @returns ErrorResponse 객체
 */
export function toErrorResponse(error: ApiError, txId?: string): ErrorResponse {
  const response = error.toJSON();
  if (txId) {
    response.txId = txId;
  }
  return response;
}

/**
 * Zod ZodError를 ValidationError 배열로 변환
 *
 * @param zodError - Zod에서 반환한 ZodError
 * @returns ValidationError 배열
 *
 * @example
 * ```typescript
 * const schema = z.object({ email: z.string().email() });
 * const result = schema.safeParse({ email: 'invalid' });
 * if (!result.success) {
 *   const errors = zodErrorToValidationErrors(result.error);
 *   // errors: [{ field: 'email', message: '...', code: 'invalid_string' }]
 * }
 * ```
 */
export function zodErrorToValidationErrors(zodError: any): ValidationError[] {
  return zodError.errors.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    context: err,
  }));
}

/**
 * 에러가 ApiError인지 확인하는 타입 가드
 *
 * @param error - 검사할 값
 * @returns error가 ApiError 인스턴스이면 true
 *
 * @example
 * ```typescript
 * try {
 *   await operation();
 * } catch (error) {
 *   if (isApiError(error)) {
 *     res.status(error.statusCode).json(error.toJSON());
 *   } else {
 *     res.status(500).json({ ok: false, reason: 'internal_error' });
 *   }
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
