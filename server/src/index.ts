/**
 * Socket.IO 기반 실시간 통신 서버
 * 스마트폰 웹앱과 세컨드 모니터 간의 양방향 통신을 제공합니다.
 */

import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { loadConfig, validateConfig } from './utils/config';
import { logger, createLogger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import {
  handleRegisterClient,
  handleJoinSession,
  handleScanOrder,
  handleHeartbeat,
  handleSessionCreate,
  handleSessionJoin,
  handleDisconnect,
  handleError,
} from './events/handlers';
import { sessionService } from './services/sessionService';
import { initSessionPairingService } from './services/sessionPairingService';
import { setupDisplayNamespace } from './events/displayHandlers';
import { getChannelStatus } from './services/channelManager';
import displayRoutes from './routes/displays';
import pairingRoutes from './routes/pairing';
import createTriggerRouter from './routes/triggers';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLoggerMiddleware } from './middleware/requestLogger';

/**
 * Socket.IO 서버 시작
 */
async function startServer() {
  try {
    // 설정 로드 및 검증
    const config = loadConfig();
    validateConfig(config);

    // 세션 페어링 서비스 초기화
    initSessionPairingService({
      jwtSecret: config.jwtSecret,
      tokenExpiresIn: '10m',
      sessionTTL: 15 * 60 * 1000, // 15분
      pairingUrlBase: process.env.PAIRING_URL_BASE || 'https://app.example.com/pair',
    });

    // 로거 설정
    const customLogger = createLogger(config.logLevel);
    logger.info('서버 시작: %O', {
      port: config.port,
      environment: config.environment,
      corsOrigins: config.corsOrigins,
    });

    // Express 앱 생성
    const app = express();

    // JSON 파싱 미들웨어
    app.use(express.json());

    // 보안 미들웨어
    app.use(helmet());

    // CORS 설정
    app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
      })
    );

    // 요청 로깅 (T-014)
    app.use(requestLoggerMiddleware);

    // 레이트 리밋
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15분
      max: 100, // 요청 제한
      message: '너무 많은 요청을 보냈습니다. 나중에 다시 시도해주세요.',
    });
    app.use(limiter);

    // 헬스체크 엔드포인트
    app.get('/health', (_req, res) => {
      const uptime = process.uptime();
      const sessions = sessionService.getAllSessions();
      res.json({
        status: 'ok',
        uptime,
        timestamp: new Date().toISOString(),
        sessions: {
          total: sessions.length,
          active: sessions.filter(s => s.mobileSocketId || s.monitorSocketId).length,
        },
      });
    });

    // 상태 모니터링 엔드포인트
    app.get('/status', (_req, res) => {
      const sessions = sessionService.getAllSessions();
      const activeConnections = sessions.filter(s => s.mobileSocketId || s.monitorSocketId);

      res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        sessions: {
          total: sessions.length,
          active: activeConnections.length,
          details: activeConnections.map(s => ({
            sessionId: s.sessionId,
            hasMobile: !!s.mobileSocketId,
            hasMonitor: !!s.monitorSocketId,
            createdAt: new Date(s.createdAt).toISOString(),
          })),
        },
      });
    });

    // HTTP 서버 생성
    const server = http.createServer(app);

    // Socket.IO 서버 설정
    const io = new SocketIOServer(server, {
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6, // 1MB
    });

    // JWT 인증 미들웨어 적용 (기본 네임스페이스)
    io.use(authMiddleware(config.jwtSecret));

    // /display 네임스페이스 설정 (브라우저 확장용)
    setupDisplayNamespace(io);
    logger.info('✓ /display 네임스페이스가 설정되었습니다');

    // 채널 상태 조회 API (T-013)
    app.get('/api/channels/:screenId', (_req, res) => {
      const { screenId } = _req.params;
      const status = getChannelStatus(io, screenId);
      res.json(status);
    });

    // T-014: 디스플레이 관리 API
    app.use('/api/displays', displayRoutes);
    logger.info('✓ 디스플레이 API 라우트 등록 완료');

    // T-014: 페어링 API
    app.use('/api/pair', pairingRoutes);
    logger.info('✓ 페어링 API 라우트 등록 완료');

    // T-014: 트리거 API (io 인스턴스 필요)
    const triggerRoutes = createTriggerRouter(io);
    app.use('/api/trigger', triggerRoutes);
    logger.info('✓ 트리거 API 라우트 등록 완료');

    // 연결 처리 (기본 네임스페이스: 모바일-모니터 연결용)
    io.on('connection', socket => {
      customLogger.info('클라이언트 연결: %s', socket.id);

      // 클라이언트 역할 등록
      socket.on('registerClient', handleRegisterClient(io, socket));

      // 세션 참여
      socket.on('joinSession', handleJoinSession(io, socket));

      // 주문 스캔
      socket.on('scanOrder', handleScanOrder(io, socket));

      // 하트비트
      socket.on('heartbeat', handleHeartbeat(io, socket));

      // 세션 생성 (QR 페어링용)
      socket.on('session:create', handleSessionCreate(io, socket));

      // 세션 페어링 (QR 스캔 후)
      socket.on('session:join', handleSessionJoin(io, socket));

      // 연결 해제
      socket.on('disconnect', () => {
        handleDisconnect(io)(socket);
      });

      // 에러 처리
      socket.on('error', (error: Error) => {
        handleError(socket, error);
      });
    });

    // 정기적인 세션 정리 (10분마다)
    setInterval(() => {
      sessionService.cleanupInactiveSessions();
    }, 10 * 60 * 1000);

    // T-014: 404 핸들러 (모든 라우트 후에 추가)
    app.use(notFoundHandler);

    // T-014: 전역 에러 핸들러 (가장 마지막에 추가)
    app.use(errorHandler);

    // 서버 시작
    server.listen(config.port, () => {
      logger.info('✓ Socket.IO 서버가 포트 %d에서 실행 중입니다', config.port);
      logger.info('✓ 환경: %s', config.environment);
      logger.info('✓ CORS 원본: %s', config.corsOrigins.join(', '));
    });

    // Graceful Shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM 신호 수신 - 서버 종료 중...');
      server.close(() => {
        logger.info('서버가 종료되었습니다');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT 신호 수신 - 서버 종료 중...');
      server.close(() => {
        logger.info('서버가 종료되었습니다');
        process.exit(0);
      });
    });

    // 미처리 에러 처리
    process.on('uncaughtException', error => {
      logger.error('미처리 예외: %s', error.message);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('미처리 거부: %s', String(reason));
      process.exit(1);
    });
  } catch (error) {
    logger.error('서버 시작 실패: %s', (error as Error).message);
    process.exit(1);
  }
}

// 서버 시작
startServer();
