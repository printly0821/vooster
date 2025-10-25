/**
 * JWT 인증 미들웨어
 */

import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { JWTPayload, SocketUser, DisplayAuthClaims } from '../types';
import { logger } from '../utils/logger';

/**
 * Socket.IO 인증 미들웨어
 * 핸드셰이크 시 JWT 토큰을 검증합니다.
 */
export function authMiddleware(jwtSecret: string) {
  return (socket: Socket, next: (err?: Error) => void) => {
    try {
      // 토큰은 auth 객체 또는 헤더에서 가져올 수 있습니다
      const token = socket.handshake.auth?.token || socket.handshake.headers['x-auth-token'];

      if (!token) {
        logger.warn('토큰 없음: %s', socket.id);
        return next(new Error('unauthorized'));
      }

      // JWT 토큰 검증
      const decoded = verify(token as string, jwtSecret) as JWTPayload;

      // 사용자 정보를 socket.data에 저장
      socket.data.user = {
        id: decoded.sub,
        role: decoded.role,
      } as SocketUser;

      logger.debug('인증 성공: %s (%s)', socket.data.user.id, socket.data.user.role);
      next();
    } catch (error) {
      logger.error('인증 실패: %s', (error as Error).message);
      next(new Error('unauthorized'));
    }
  };
}

/**
 * 특정 역할만 허용하는 미들웨어
 */
export function roleMiddleware(allowedRoles: ('mobile' | 'monitor')[]) {
  return (socket: Socket, next: (err?: Error) => void) => {
    if (!socket.data.user || !allowedRoles.includes(socket.data.user.role)) {
      logger.warn('역할 권한 없음: %s', socket.id);
      return next(new Error('forbidden'));
    }
    next();
  };
}

/**
 * 디스플레이 토큰을 검증하고 필요한 권한을 확인합니다.
 *
 * JWT 토큰의 유효성을 검증한 후, scopes 배열에서 요청된 screenId에 대한
 * 권한이 있는지 확인합니다. 권한이 있으면 payload를 반환하고,
 * 없거나 검증 실패 시 null을 반환합니다.
 *
 * @param token - 검증할 JWT 토큰 문자열
 * @param jwtSecret - JWT 서명 검증을 위한 시크릿 키
 * @param requiredScreenId - 접근을 요청하는 화면 ID (예: 'screen-1')
 * @returns 검증 성공 시 DisplayAuthClaims 객체, 실패 시 null
 *
 * @example
 * // 디스플레이 토큰 검증
 * const claims = verifyDisplayToken(token, process.env.JWT_SECRET, 'screen-1');
 * if (claims) {
 *   console.log('인증 성공:', claims.sub);
 * } else {
 *   console.log('인증 실패');
 * }
 */
export function verifyDisplayToken(
  token: string,
  jwtSecret: string,
  requiredScreenId: string
): DisplayAuthClaims | null {
  try {
    // 1. JWT 토큰 검증 및 디코딩
    const decoded = verify(token, jwtSecret) as DisplayAuthClaims;

    // 2. scopes 배열에서 필요한 권한 확인
    const requiredScope = `display:${requiredScreenId}`;
    const hasRequiredScope = decoded.scopes && Array.isArray(decoded.scopes) && decoded.scopes.includes(requiredScope);

    if (!hasRequiredScope) {
      logger.warn('화면 접근 권한 없음: userId=%s, screenId=%s, scopes=%s', decoded.sub, requiredScreenId, decoded.scopes?.join(','));
      return null;
    }

    logger.debug('디스플레이 토큰 검증 성공: userId=%s, screenId=%s', decoded.sub, requiredScreenId);
    return decoded;
  } catch (error) {
    // 3. 토큰 검증 실패 시 에러 로깅 및 null 반환
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('디스플레이 토큰 검증 실패: screenId=%s, error=%s', requiredScreenId, errorMessage);
    return null;
  }
}
