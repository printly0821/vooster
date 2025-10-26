/**
 * JWT 인증 미들웨어 테스트
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { sign } from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { authMiddleware, roleMiddleware } from '../auth';
import type { JWTPayload, SocketUser } from '../../types';

describe('authMiddleware', () => {
  const jwtSecret = 'test-secret-key-12345';
  let mockSocket: Partial<Socket>;
  let nextCallback: jest.Mock;

  beforeEach(() => {
    nextCallback = jest.fn();
    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        auth: {},
        headers: {},
      } as any,
      data: {},
    };
  });

  it('유효한 토큰으로 인증 성공', () => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'mobile',
    };
    const token = sign(payload, jwtSecret);

    (mockSocket.handshake as any).auth = { token };
    const middleware = authMiddleware(jwtSecret);
    middleware(mockSocket as Socket, nextCallback);

    expect((mockSocket.data as any).user).toEqual({
      id: 'user123',
      role: 'mobile',
    });
    expect(nextCallback).toHaveBeenCalledWith();
  });

  it('토큰 없이 요청하면 실패', () => {
    const middleware = authMiddleware(jwtSecret);
    middleware(mockSocket as Socket, nextCallback);

    expect(nextCallback).toHaveBeenCalledWith(new Error('unauthorized'));
  });

  it('잘못된 토큰으로 인증 실패', () => {
    (mockSocket.handshake as any).auth = { token: 'invalid-token' };
    const middleware = authMiddleware(jwtSecret);
    middleware(mockSocket as Socket, nextCallback);

    expect(nextCallback).toHaveBeenCalledWith(new Error('unauthorized'));
  });

  it('만료된 토큰으로 인증 실패', () => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'mobile',
    };
    const token = sign(payload, jwtSecret, { expiresIn: '-1h' }); // 만료된 토큰

    (mockSocket.handshake as any).auth = { token };
    const middleware = authMiddleware(jwtSecret);
    middleware(mockSocket as Socket, nextCallback);

    expect(nextCallback).toHaveBeenCalledWith(new Error('unauthorized'));
  });

  it('헤더에서 토큰을 읽을 수 있음', () => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'monitor',
    };
    const token = sign(payload, jwtSecret);

    (mockSocket.handshake as any).headers = { 'x-auth-token': token };
    const middleware = authMiddleware(jwtSecret);
    middleware(mockSocket as Socket, nextCallback);

    expect((mockSocket.data as any).user).toEqual({
      id: 'user123',
      role: 'monitor',
    });
    expect(nextCallback).toHaveBeenCalledWith();
  });
});

describe('roleMiddleware', () => {
  let mockSocket: Partial<Socket>;
  let nextCallback: jest.Mock;

  beforeEach(() => {
    nextCallback = jest.fn();
    mockSocket = {
      id: 'test-socket-id',
      data: {
        user: {
          id: 'user123',
          role: 'mobile',
        } as SocketUser,
      },
    };
  });

  it('허용된 역할이면 통과', () => {
    const middleware = roleMiddleware(['mobile']);
    middleware(mockSocket as Socket, nextCallback);

    expect(nextCallback).toHaveBeenCalledWith();
  });

  it('허용되지 않은 역할이면 실패', () => {
    const middleware = roleMiddleware(['monitor']);
    middleware(mockSocket as Socket, nextCallback);

    expect(nextCallback).toHaveBeenCalledWith(new Error('forbidden'));
  });

  it('사용자 정보가 없으면 실패', () => {
    mockSocket.data = {};
    const middleware = roleMiddleware(['mobile']);
    middleware(mockSocket as Socket, nextCallback);

    expect(nextCallback).toHaveBeenCalledWith(new Error('forbidden'));
  });
});
