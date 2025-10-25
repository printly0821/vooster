/**
 * displayHandlers.ts의 통합 테스트
 *
 * Socket.IO 서버와 클라이언트를 실제로 구성하여 테스트합니다.
 * - 실제 토큰 검증 및 인증 흐름
 * - 재연결 시나리오
 * - 5초 타임아웃 동작
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { sign } from 'jsonwebtoken';
import { setupDisplayNamespace } from '../displayHandlers';

describe('displayHandlers 통합 테스트', () => {
  let httpServer: any;
  let ioServer: Server;
  let port: number;
  let jwtSecret = 'test-secret-key';

  beforeEach((done) => {
    // 1. HTTP 서버 생성
    httpServer = createServer();

    // 2. Socket.IO 서버 초기화
    ioServer = new Server(httpServer, {
      transports: ['websocket'],
    });

    // 3. /display 네임스페이스 설정
    process.env.JWT_SECRET = jwtSecret;
    setupDisplayNamespace(ioServer);

    // 4. 포트 할당 (0은 자동 할당)
    httpServer.listen(0, () => {
      port = (httpServer.address() as any).port;
      done();
    });
  });

  afterEach((done) => {
    // 서버 정리
    ioServer.close();
    httpServer.close(() => {
      done();
    });
  });

  /**
   * 유효한 토큰으로 성공적으로 인증하는지 테스트
   */
  it('유효한 토큰으로 인증에 성공해야 함', (done) => {
    // Arrange: JWT 토큰 생성
    const deviceId = 'device-123';
    const screenId = 'screen-1';
    const token = sign(
      {
        sub: 'user-123',
        deviceId,
        screenId,
        scopes: [`display:${screenId}`],
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Act: 클라이언트 연결
    const client: ClientSocket = ioClient(`http://localhost:${port}/display`, {
      transports: ['websocket'],
    });

    client.on('connect', () => {
      // auth 이벤트 전송
      client.emit('auth', {
        token,
        deviceId,
        screenId,
      });
    });

    // Assert: auth_success 수신
    client.on('auth_success', (data) => {
      expect(data.screenId).toBe(screenId);
      client.disconnect();
      done();
    });

    // Timeout 설정
    setTimeout(() => {
      client.disconnect();
      done(new Error('auth_success 이벤트를 수신하지 못했습니다'));
    }, 5000);
  });

  /**
   * 유효하지 않은 토큰으로 인증 실패하는지 테스트
   */
  it('유효하지 않은 토큰으로 인증에 실패해야 함', (done) => {
    // Arrange
    const client: ClientSocket = ioClient(`http://localhost:${port}/display`, {
      transports: ['websocket'],
    });

    client.on('connect', () => {
      // 잘못된 토큰 전송
      client.emit('auth', {
        token: 'invalid-token',
        deviceId: 'device-123',
        screenId: 'screen-1',
      });
    });

    // Assert: auth_failed 수신 및 연결 해제
    client.on('auth_failed', (data) => {
      expect(data.reason).toBe('invalid_token');
      client.disconnect();
      done();
    });

    // Timeout 설정
    setTimeout(() => {
      client.disconnect();
      done(new Error('auth_failed 이벤트를 수신하지 못했습니다'));
    }, 5000);
  });

  /**
   * 5초 내 인증하지 않으면 자동 연결 해제되는지 테스트
   */
  it('5초 내 인증하지 않으면 자동으로 연결을 해제해야 함', (done) => {
    // Arrange
    const client: ClientSocket = ioClient(`http://localhost:${port}/display`, {
      transports: ['websocket'],
    });

    let disconnected = false;

    client.on('disconnect', () => {
      disconnected = true;
    });

    client.on('auth_timeout', () => {
      // auth_timeout 이벤트 수신
      expect(disconnected).toBeTruthy();
      done();
    });

    // Timeout 설정
    setTimeout(() => {
      if (!disconnected) {
        client.disconnect();
        done(new Error('5초 후 자동 연결 해제되지 않았습니다'));
      }
    }, 6000);
  });

  /**
   * 권한이 없는 화면ID로 인증 실패하는지 테스트
   */
  it('권한이 없는 화면ID로 인증에 실패해야 함', (done) => {
    // Arrange: 다른 화면에 대한 권한만 가진 토큰
    const token = sign(
      {
        sub: 'user-123',
        deviceId: 'device-123',
        screenId: 'screen-2',
        scopes: ['display:screen-2'], // screen-1에 대한 권한 없음
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const client: ClientSocket = ioClient(`http://localhost:${port}/display`, {
      transports: ['websocket'],
    });

    client.on('connect', () => {
      // screen-1로 접근 시도
      client.emit('auth', {
        token,
        deviceId: 'device-123',
        screenId: 'screen-1', // 권한 없는 화면
      });
    });

    // Assert: auth_failed 수신
    client.on('auth_failed', (data) => {
      expect(data.reason).toBe('invalid_token');
      client.disconnect();
      done();
    });

    // Timeout 설정
    setTimeout(() => {
      client.disconnect();
      done(new Error('auth_failed 이벤트를 수신하지 못했습니다'));
    }, 5000);
  });

  /**
   * 동일 deviceId로 재연결 시 기존 연결이 종료되는지 테스트
   */
  it('동일 deviceId로 재연결 시 기존 연결을 종료해야 함', (done) => {
    // Arrange
    const deviceId = 'device-123';
    const screenId = 'screen-1';
    const token = sign(
      {
        sub: 'user-123',
        deviceId,
        screenId,
        scopes: [`display:${screenId}`],
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 첫 번째 클라이언트
    const client1: ClientSocket = ioClient(`http://localhost:${port}/display`, {
      transports: ['websocket'],
    });

    let client1Disconnected = false;
    let client2Connected = false;

    client1.on('connect', () => {
      client1.emit('auth', { token, deviceId, screenId });
    });

    client1.on('disconnect', () => {
      client1Disconnected = true;
      // 첫 번째 클라이언트 연결 해제 후 두 번째 클라이언트가 성공했는지 확인
      if (client2Connected) {
        done();
      }
    });

    client1.on('device:replaced', () => {
      // device:replaced 이벤트 수신 (기기 교체 알림)
    });

    client1.on('auth_success', () => {
      // 첫 번째 인증 성공 후 두 번째 클라이언트 연결
      setTimeout(() => {
        const client2: ClientSocket = ioClient(`http://localhost:${port}/display`, {
          transports: ['websocket'],
        });

        client2.on('connect', () => {
          client2.emit('auth', { token, deviceId, screenId });
        });

        client2.on('auth_success', () => {
          client2Connected = true;
          client2.disconnect();
          // 첫 번째 클라이언트가 이미 연결 해제되었는지 확인
          if (client1Disconnected) {
            done();
          }
        });

        // Timeout 설정
        setTimeout(() => {
          client2.disconnect();
          client1.disconnect();
          if (!client1Disconnected || !client2Connected) {
            done(new Error('재연결 시나리오가 정상적으로 동작하지 않았습니다'));
          }
        }, 5000);
      }, 500);
    });

    // Timeout 설정
    setTimeout(() => {
      client1.disconnect();
      if (!client1Disconnected || !client2Connected) {
        done(new Error('테스트 타임아웃'));
      }
    }, 15000);
  });

  /**
   * 필수 필드가 누락되면 인증 실패하는지 테스트
   */
  it('필수 필드가 누락되면 인증에 실패해야 함', (done) => {
    // Arrange
    const client: ClientSocket = ioClient(`http://localhost:${port}/display`, {
      transports: ['websocket'],
    });

    client.on('connect', () => {
      // deviceId 누락
      client.emit('auth', {
        token: 'some-token',
        screenId: 'screen-1',
        // deviceId 없음
      });
    });

    // Assert: auth_failed 수신
    client.on('auth_failed', (data) => {
      expect(data.reason).toBe('invalid_payload');
      client.disconnect();
      done();
    });

    // Timeout 설정
    setTimeout(() => {
      client.disconnect();
      done(new Error('auth_failed 이벤트를 수신하지 못했습니다'));
    }, 5000);
  });
});
