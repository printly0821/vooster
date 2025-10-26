/**
 * displayHandlers.ts의 단위 테스트
 *
 * - handleDisplayAuth: JWT 검증 및 세션 초기화
 * - handleDisplayDisconnect: 연결 해제 처리
 * - setupDisplayNamespace: 네임스페이스 설정 및 타임아웃 로직
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server, Socket, Namespace } from 'socket.io';
import { handleDisplayAuth, handleDisplayDisconnect, setupDisplayNamespace } from '../displayHandlers';
import * as authMiddleware from '../../middleware/auth';
import * as socketManager from '../../utils/socketManager';
import { logger } from '../../utils/logger';

// Mock 설정
vi.mock('../../middleware/auth');
vi.mock('../../utils/socketManager');
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('displayHandlers', () => {
  let mockIo: any;
  let mockSocket: any;
  let mockNamespace: any;

  beforeEach(() => {
    // Mock Socket.IO 인스턴스 설정
    mockSocket = {
      id: 'socket-123',
      data: {},
      emit: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      handshake: {
        address: '127.0.0.1',
      },
    };

    mockNamespace = {
      on: vi.fn(),
      sockets: new Map(),
    };

    mockIo = {
      of: vi.fn().mockReturnValue(mockNamespace),
    };

    // 환경변수 설정
    process.env.JWT_SECRET = 'test-secret-key';

    // Mock 함수 초기화
    vi.clearAllMocks();
  });

  describe('handleDisplayAuth', () => {
    it('유효한 토큰으로 인증에 성공해야 함', () => {
      // Arrange
      const payload = {
        token: 'valid-token',
        deviceId: 'device-123',
        screenId: 'screen-1',
      };

      const mockClaims = {
        sub: 'user-123',
        deviceId: 'device-123',
        screenId: 'screen-1',
        scopes: ['display:screen-1'],
        iat: Date.now() / 1000,
        exp: (Date.now() + 3600000) / 1000,
      };

      vi.spyOn(authMiddleware, 'verifyDisplayToken').mockReturnValue(mockClaims);
      vi.spyOn(socketManager, 'disconnectExistingDevice').mockReturnValue(false);

      // Act
      handleDisplayAuth(mockIo, mockSocket, payload);

      // Assert
      expect(mockSocket.data.deviceId).toBe('device-123');
      expect(mockSocket.data.screenId).toBe('screen-1');
      expect(mockSocket.data.authenticatedAt).toBeDefined();
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_success', { screenId: 'screen-1' });
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('토큰 검증 실패 시 연결을 종료해야 함', () => {
      // Arrange
      const payload = {
        token: 'invalid-token',
        deviceId: 'device-123',
        screenId: 'screen-1',
      };

      vi.spyOn(authMiddleware, 'verifyDisplayToken').mockReturnValue(null);

      // Act
      handleDisplayAuth(mockIo, mockSocket, payload);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_failed', { reason: 'invalid_token' });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('필수 필드가 누락되면 연결을 종료해야 함', () => {
      // Arrange
      const payload = {
        token: 'valid-token',
        deviceId: '', // 누락
        screenId: 'screen-1',
      };

      // Act
      handleDisplayAuth(mockIo, mockSocket, payload);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_failed', { reason: 'invalid_payload' });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('기존 연결이 있으면 정리해야 함', () => {
      // Arrange
      const payload = {
        token: 'valid-token',
        deviceId: 'device-123',
        screenId: 'screen-1',
      };

      const mockClaims = {
        sub: 'user-123',
        deviceId: 'device-123',
        screenId: 'screen-1',
        scopes: ['display:screen-1'],
        iat: Date.now() / 1000,
        exp: (Date.now() + 3600000) / 1000,
      };

      vi.spyOn(authMiddleware, 'verifyDisplayToken').mockReturnValue(mockClaims);
      vi.spyOn(socketManager, 'disconnectExistingDevice').mockReturnValue(true);

      // Act
      handleDisplayAuth(mockIo, mockSocket, payload);

      // Assert
      expect(socketManager.disconnectExistingDevice).toHaveBeenCalledWith(mockNamespace, 'device-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_success', { screenId: 'screen-1' });
    });
  });

  describe('handleDisplayDisconnect', () => {
    it('인증된 클라이언트 연결 해제를 로깅해야 함', () => {
      // Arrange
      mockSocket.data = {
        deviceId: 'device-123',
        screenId: 'screen-1',
      };

      // Act
      handleDisplayDisconnect(mockIo, mockSocket);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        '디스플레이 클라이언트 연결 해제: deviceId=%s, screenId=%s, socketId=%s',
        'device-123',
        'screen-1',
        'socket-123'
      );
    });

    it('인증되지 않은 클라이언트 연결 해제를 로깅해야 함', () => {
      // Arrange
      mockSocket.data = {};

      // Act
      handleDisplayDisconnect(mockIo, mockSocket);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('인증되지 않은 클라이언트 연결 해제: socketId=%s', 'socket-123');
    });
  });

  describe('setupDisplayNamespace', () => {
    it('/display 네임스페이스를 생성해야 함', () => {
      // Act
      setupDisplayNamespace(mockIo);

      // Assert
      expect(mockIo.of).toHaveBeenCalledWith('/display');
      expect(mockNamespace.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('클라이언트 연결 시 이벤트 핸들러를 등록해야 함', () => {
      // Arrange
      let connectionHandler: any;
      mockNamespace.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      });

      // Act
      setupDisplayNamespace(mockIo);

      // 연결 이벤트 시뮬레이션
      connectionHandler(mockSocket);

      // Assert
      expect(mockSocket.on).toHaveBeenCalledWith('auth', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('5초 이내 인증하지 않으면 연결을 종료해야 함', (done) => {
      // Arrange
      let connectionHandler: any;
      mockNamespace.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      });

      // Act
      setupDisplayNamespace(mockIo);
      connectionHandler(mockSocket);

      // 타임아웃 진행
      setTimeout(() => {
        // Assert
        expect(mockSocket.emit).toHaveBeenCalledWith('auth_timeout', { reason: 'authentication_timeout' });
        expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
        done();
      }, 5100);
    }, 10000); // 테스트 타임아웃 10초

    it('인증 이벤트 수신 시 타임아웃을 취소해야 함', (done) => {
      // Arrange
      let connectionHandler: any;
      let authHandler: any;

      mockNamespace.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      });

      mockSocket.on.mockImplementation((event: string, handler: any) => {
        if (event === 'auth') {
          authHandler = handler;
        }
      });

      const mockClaims = {
        sub: 'user-123',
        deviceId: 'device-123',
        screenId: 'screen-1',
        scopes: ['display:screen-1'],
        iat: Date.now() / 1000,
        exp: (Date.now() + 3600000) / 1000,
      };

      vi.spyOn(authMiddleware, 'verifyDisplayToken').mockReturnValue(mockClaims);
      vi.spyOn(socketManager, 'disconnectExistingDevice').mockReturnValue(false);

      // Act
      setupDisplayNamespace(mockIo);
      connectionHandler(mockSocket);

      // 인증 이벤트 발송
      const payload = {
        token: 'valid-token',
        deviceId: 'device-123',
        screenId: 'screen-1',
      };
      authHandler(payload);

      // 타임아웃 진행 후에도 연결이 유지되어야 함
      setTimeout(() => {
        // Assert
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('auth_success', { screenId: 'screen-1' });
        done();
      }, 5100);
    }, 10000);
  });
});
