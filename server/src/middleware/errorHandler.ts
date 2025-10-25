/**
 * Express 전역 에러 핸들러
 *
 * 모든 라우트에서 발생한 에러를 일관된 형식으로 응답합니다
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { ApiError, toErrorResponse } from '../types/error';

/**
 * Zod 검증 에러를 사용자 친화적인 형식으로 변환합니다
 *
 * @param error - Zod 에러 객체
 * @returns 에러 메시지 배열
 */
function formatZodError(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Express 전역 에러 핸들러 미들웨어
 *
 * 모든 에러를 캐치하여 일관된 JSON 응답을 반환합니다
 * - ApiError: 커스텀 에러 (ValidationError, ForbiddenError 등)
 * - ZodError: Zod 검증 에러
 * - 기타: 예상치 못한 에러
 *
 * @param error - 에러 객체
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Next 함수 (사용 안 함)
 *
 * @example
 * app.use(errorHandler);
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod 검증 에러 처리
  if (error instanceof ZodError) {
    logger.warn('검증 에러: path=%s, errors=%s', req.path, JSON.stringify(error.errors));

    res.status(400).json({
      ok: false,
      reason: 'validation_error',
      message: '입력값 검증에 실패했습니다.',
      errors: formatZodError(error),
    });
    return;
  }

  // 2. 커스텀 API 에러 처리
  if (error instanceof ApiError) {
    logger.warn('API 에러: type=%s, statusCode=%d, message=%s, path=%s', error.constructor.name, error.statusCode, error.message, req.path);

    res.status(error.statusCode).json(toErrorResponse(error));
    return;
  }

  // 3. 예상치 못한 에러 (500)
  logger.error('예상치 못한 에러: message=%s, path=%s, stack=%s', error.message, req.path, error.stack);

  res.status(500).json({
    ok: false,
    reason: 'internal_server_error',
    message: '서버 내부 오류가 발생했습니다.',
  });
}

/**
 * 404 Not Found 핸들러
 *
 * 라우트가 정의되지 않은 경로에 대한 처리
 *
 * @param req - Express Request
 * @param res - Express Response
 *
 * @example
 * app.use(notFoundHandler);
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('존재하지 않는 경로: method=%s, path=%s, ip=%s', req.method, req.path, req.ip);

  res.status(404).json({
    ok: false,
    reason: 'not_found',
    message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
  });
}
