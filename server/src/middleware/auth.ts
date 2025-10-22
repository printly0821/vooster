/**
 * JWT 인증 미들웨어
 */

import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { JWTPayload, SocketUser } from '../types';
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
