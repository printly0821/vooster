/**
 * Express REST API 인증 미들웨어
 *
 * Bearer 토큰을 검증하고 req.user에 인증 정보를 추가합니다
 * T-012의 Socket.IO 인증과 동일한 JWT 시크릿 및 검증 로직을 사용합니다
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { DisplayJWTPayload } from '../types/auth';

/**
 * 확장된 Express Request 타입
 *
 * 인증된 사용자 정보를 req.user에 저장
 */
export interface AuthenticatedRequest extends Request {
  /** 인증된 사용자 정보 (JWT 페이로드) */
  user: DisplayJWTPayload;
}

/**
 * Bearer 토큰에서 JWT를 추출합니다
 *
 * Authorization 헤더에서 "Bearer {token}" 형식의 토큰을 파싱합니다
 *
 * @param authHeader - Authorization 헤더 값
 * @returns JWT 토큰 문자열 또는 null
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  // "Bearer {token}" 형식 검증
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  return match[1];
}

/**
 * JWT 토큰을 검증하고 페이로드를 반환합니다
 *
 * @param token - JWT 토큰 문자열
 * @param secret - JWT 시크릿
 * @returns JWT 페이로드 또는 null (검증 실패 시)
 */
function verifyToken(token: string, secret: string): DisplayJWTPayload | null {
  try {
    const payload = jwt.verify(token, secret) as DisplayJWTPayload;

    // 필수 필드 확인
    if (!payload.sub || !payload.scopes || !Array.isArray(payload.scopes)) {
      logger.warn('JWT 페이로드에 필수 필드 누락: sub=%s, scopes=%s', payload.sub, payload.scopes);
      return null;
    }

    return payload;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.warn('JWT 검증 실패: %s', errorMessage);
    return null;
  }
}

/**
 * Express 인증 미들웨어 팩토리
 *
 * 모든 REST API 엔드포인트에서 Bearer 토큰을 검증합니다
 * 검증 실패 시 401 Unauthorized를 반환하고, 성공 시 req.user에 페이로드를 저장합니다
 *
 * @param jwtSecret - JWT 검증에 사용할 시크릿
 * @returns Express 미들웨어 함수
 *
 * @example
 * const auth = expressAuthMiddleware(process.env.SOCKET_JWT_SECRET);
 * app.use('/api/trigger', auth, triggerRouter);
 */
export function expressAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Authorization 헤더에서 Bearer 토큰 추출
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      logger.warn('인증 토큰 없음: path=%s, ip=%s', req.path, req.ip);
      res.status(401).json({
        ok: false,
        reason: 'unauthorized',
        message: '인증이 필요합니다. Authorization: Bearer {token} 헤더를 포함해주세요.',
      });
      return;
    }

    // 2. JWT 검증
    const payload = verifyToken(token, jwtSecret);

    if (!payload) {
      logger.warn('JWT 검증 실패: path=%s, ip=%s', req.path, req.ip);
      res.status(401).json({
        ok: false,
        reason: 'invalid_token',
        message: '유효하지 않은 토큰입니다.',
      });
      return;
    }

    // 3. req.user에 페이로드 저장
    (req as AuthenticatedRequest).user = payload;

    // 4. 인증 성공 로깅
    logger.debug('인증 성공: userId=%s, scopes=%s, path=%s', payload.sub, payload.scopes.join(','), req.path);

    // 5. 다음 미들웨어로 진행
    next();
  };
}

/**
 * 특정 스코프(권한)를 확인하는 미들웨어 팩토리
 *
 * 인증된 사용자가 특정 리소스에 접근할 권한이 있는지 확인합니다
 *
 * @param requiredScope - 필요한 스코프 (예: "display:screen:prod:line-1")
 * @returns Express 미들웨어 함수
 *
 * @example
 * app.post('/api/trigger',
 *   auth,
 *   requireScope((req) => `display:${req.body.screenId}`),
 *   triggerHandler
 * );
 */
export function requireScope(scopeGetter: (req: AuthenticatedRequest) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    // 1. 인증 확인 (expressAuthMiddleware 먼저 실행되어야 함)
    if (!authReq.user) {
      logger.warn('인증되지 않은 요청: path=%s', req.path);
      res.status(401).json({
        ok: false,
        reason: 'unauthorized',
        message: '인증이 필요합니다.',
      });
      return;
    }

    // 2. 필요한 스코프 계산
    const requiredScope = scopeGetter(authReq);

    // 3. 사용자의 스코프에 포함되는지 확인
    const hasScope = authReq.user.scopes.includes(requiredScope);

    if (!hasScope) {
      logger.warn('권한 부족: userId=%s, requiredScope=%s, userScopes=%s, path=%s', authReq.user.sub, requiredScope, authReq.user.scopes.join(','), req.path);
      res.status(403).json({
        ok: false,
        reason: 'forbidden',
        message: `이 리소스에 접근할 권한이 없습니다. 필요한 권한: ${requiredScope}`,
      });
      return;
    }

    // 4. 권한 확인 성공
    logger.debug('권한 확인 성공: userId=%s, scope=%s', authReq.user.sub, requiredScope);
    next();
  };
}
