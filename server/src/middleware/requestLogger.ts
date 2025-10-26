/**
 * Express 요청 로거 미들웨어
 *
 * 모든 API 요청을 로깅하여 감시 및 디버깅을 지원합니다
 * 요청 시작 시간, 응답 시간, 상태 코드 등을 기록합니다
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * API 요청 로깅 미들웨어
 *
 * 요청 정보와 응답 시간을 로깅합니다
 * - 요청: method, path, ip, userId (인증된 경우)
 * - 응답: statusCode, duration (ms)
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Next 함수
 *
 * @example
 * app.use(requestLoggerMiddleware);
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. 요청 시작 시간 기록
  const startTime = Date.now();

  // 2. 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.sub || 'anonymous';

    // 3. 로그 레벨 결정 (에러는 warn, 나머지는 info)
    if (res.statusCode >= 400) {
      logger.warn('API 요청 완료: method=%s, path=%s, statusCode=%d, duration=%dms, userId=%s, ip=%s', req.method, req.path, res.statusCode, duration, userId, req.ip);
    } else {
      logger.info('API 요청 완료: method=%s, path=%s, statusCode=%d, duration=%dms, userId=%s, ip=%s', req.method, req.path, res.statusCode, duration, userId, req.ip);
    }
  });

  // 4. 다음 미들웨어로 진행
  next();
}
