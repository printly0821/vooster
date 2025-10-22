/**
 * Socket.IO 서버 통합 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { sign } from 'jsonwebtoken';
import type { JWTPayload } from '../types';
import { authMiddleware } from '../middleware/auth';
import {
  handleRegisterClient,
  handleJoinSession,
  handleScanOrder,
  handleHeartbeat,
  handleSessionCreate,
  handleSessionJoin,
  handleDisconnect,
} from '../events/handlers';
import { initSessionPairingService } from '../services/sessionPairingService';

describe('Socket.IO 통합 테스트', () => {
  let server: http.Server;
  let io: SocketIOServer;
  const jwtSecret = 'test-secret-key-12345';
  const serverPort = 3001;
  const serverUrl = `http://localhost:${serverPort}`;

  beforeAll(done => {
    // 세션 페어링 서비스 초기화
    initSessionPairingService({
      jwtSecret,
      tokenExpiresIn: '10m',
      sessionTTL: 15 * 60 * 1000,
      pairingUrlBase: 'https://test.example.com/pair',
    });

    const app = express();
    server = http.createServer(app);

    io = new SocketIOServer(server, {
      cors: {
        origin: '*',
      },
    });

    // JWT 인증 미들웨어 적용
    io.use(authMiddleware(jwtSecret));

    // 이벤트 핸들러 등록
    io.on('connection', socket => {
      socket.on('registerClient', handleRegisterClient(io, socket));
      socket.on('joinSession', handleJoinSession(io, socket));
      socket.on('scanOrder', handleScanOrder(io, socket));
      socket.on('heartbeat', handleHeartbeat(io, socket));
      socket.on('session:create', handleSessionCreate(io, socket));
      socket.on('session:join', handleSessionJoin(io, socket));
      socket.on('disconnect', () => {
        handleDisconnect(io)(socket);
      });
    });

    server.listen(serverPort, () => {
      done();
    });
  });

  afterAll(done => {
    server.close(() => {
      done();
    });
  });

  it('유효한 JWT 토큰으로 연결할 수 있음', done => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'mobile',
    };
    const token = sign(payload, jwtSecret);

    const socket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });

    socket.on('connect_error', error => {
      done(error);
    });
  });

  it('유효하지 않은 토큰으로 연결할 수 없음', done => {
    const socket = ioClient(serverUrl, {
      auth: { token: 'invalid-token' },
      reconnection: false,
    });

    socket.on('connect_error', () => {
      expect(socket.connected).toBe(false);
      socket.disconnect();
      done();
    });

    // 연결 시간 초과
    setTimeout(() => {
      if (!socket.connected) {
        socket.disconnect();
        done();
      }
    }, 1000);
  });

  it('클라이언트 등록 및 세션 참여', done => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'mobile',
    };
    const token = sign(payload, jwtSecret);

    const socket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    socket.on('connect', () => {
      // 클라이언트 등록
      socket.emit('registerClient', { role: 'mobile' });

      socket.on('registered', data => {
        expect(data.success).toBe(true);
        expect(data.socketId).toBe(socket.id);

        // 세션 참여
        socket.emit('joinSession', { sessionId: 'test-session-123' });

        socket.on('joinedSession', sessionData => {
          expect(sessionData.sessionId).toBe('test-session-123');
          expect(sessionData.status.isActive).toBe(true);
          socket.disconnect();
          done();
        });
      });
    });

    socket.on('connect_error', error => {
      done(error);
    });
  });

  it('두 클라이언트 간 이벤트 브로드캐스트', done => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'mobile',
    };
    const token = sign(payload, jwtSecret);

    const mobileSocket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    const monitorSocket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    const sessionId = 'test-broadcast-session';

    let mobileConnected = false;
    let monitorConnected = false;

    const startBroadcastTest = () => {
      if (mobileConnected && monitorConnected) {
        // 모바일에서 주문 스캔 이벤트 발송
        mobileSocket.emit('scanOrder', {
          sessionId,
          orderNo: 'ORDER-001',
          ts: Date.now(),
        });

        // 모니터에서 navigate 이벤트 수신
        monitorSocket.once('navigate', data => {
          expect(data.orderNo).toBe('ORDER-001');
          expect(data.from).toBe('mobile');

          mobileSocket.disconnect();
          monitorSocket.disconnect();
          done();
        });
      }
    };

    mobileSocket.on('connect', () => {
      mobileSocket.emit('registerClient', { role: 'mobile' });
      mobileSocket.emit('joinSession', { sessionId });

      mobileSocket.on('joinedSession', () => {
        mobileConnected = true;
        startBroadcastTest();
      });
    });

    monitorSocket.on('connect', () => {
      monitorSocket.emit('registerClient', { role: 'monitor' });
      monitorSocket.emit('joinSession', { sessionId });

      monitorSocket.on('joinedSession', () => {
        monitorConnected = true;
        startBroadcastTest();
      });
    });

    mobileSocket.on('connect_error', error => {
      done(error);
    });

    monitorSocket.on('connect_error', error => {
      done(error);
    });
  }, 15000);

  it('하트비트 응답 수신', done => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'mobile',
    };
    const token = sign(payload, jwtSecret);

    const socket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    socket.on('connect', () => {
      socket.emit('heartbeat');

      socket.on('heartbeat:ack', timestamp => {
        expect(typeof timestamp).toBe('number');
        expect(timestamp).toBeGreaterThan(0);
        socket.disconnect();
        done();
      });
    });

    socket.on('connect_error', error => {
      done(error);
    });
  });

  it('세션 생성 및 페어링', done => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'monitor',
    };
    const token = sign(payload, jwtSecret);

    const monitorSocket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    monitorSocket.on('connect', () => {
      // 세션 생성 요청
      monitorSocket.emit('session:create');

      monitorSocket.on('session:created', data => {
        expect(data.sessionId).toBeDefined();
        expect(data.sessionId.length).toBe(8);
        expect(data.pairingToken).toBeDefined();
        expect(data.expiresIn).toBe(600);
        expect(data.pairingUrl).toContain('sid=');
        expect(data.pairingUrl).toContain('t=');

        // 같은 세션으로 페어링 시도
        const mobileSocket = ioClient(serverUrl, {
          auth: { token },
          reconnection: false,
        });

        mobileSocket.on('connect', () => {
          mobileSocket.emit('session:join', {
            sessionId: data.sessionId,
            pairingToken: data.pairingToken,
          });

          mobileSocket.on('session:paired', pairingData => {
            expect(pairingData.sessionId).toBe(data.sessionId);
            expect(pairingData.at).toBeGreaterThan(0);

            monitorSocket.disconnect();
            mobileSocket.disconnect();
            done();
          });
        });

        mobileSocket.on('connect_error', error => {
          done(error);
        });
      });
    });

    monitorSocket.on('connect_error', error => {
      done(error);
    });
  }, 15000);

  it('잘못된 토큰으로 페어링 실패', done => {
    const payload: JWTPayload = {
      sub: 'user123',
      role: 'monitor',
    };
    const token = sign(payload, jwtSecret);

    const monitorSocket = ioClient(serverUrl, {
      auth: { token },
      reconnection: false,
    });

    monitorSocket.on('connect', () => {
      monitorSocket.emit('session:create');

      monitorSocket.on('session:created', data => {
        const mobileSocket = ioClient(serverUrl, {
          auth: { token },
          reconnection: false,
        });

        mobileSocket.on('connect', () => {
          // 잘못된 토큰으로 페어링
          mobileSocket.emit('session:join', {
            sessionId: data.sessionId,
            pairingToken: 'invalid-token',
          });

          mobileSocket.on('session:error', errorData => {
            expect(errorData.code).toBe('INVALID_TOKEN');
            expect(errorData.message).toBeDefined();

            monitorSocket.disconnect();
            mobileSocket.disconnect();
            done();
          });
        });

        mobileSocket.on('connect_error', error => {
          done(error);
        });
      });
    });

    monitorSocket.on('connect_error', error => {
      done(error);
    });
  }, 15000);
});
