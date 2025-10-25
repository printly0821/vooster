/**
 * 브라우저 확장 원격 디스플레이 이벤트 핸들러
 *
 * Socket.IO /display 네임스페이스에서 발생하는 이벤트를 처리합니다.
 * - auth: 클라이언트 JWT 토큰 검증 및 세션 초기화
 * - disconnect: 연결 해제 시 세션 정리
 */

import { Server, Socket, Namespace } from 'socket.io';
import { verifyDisplayToken } from '../middleware/auth';
import { disconnectExistingDevice } from '../utils/socketManager';
import { logger } from '../utils/logger';
import { DisplayClientPayload, DisplaySocketData } from '../types';

/**
 * 클라이언트 JWT 토큰을 검증하고 세션을 초기화합니다.
 *
 * 클라이언트에서 전송한 { token, deviceId, screenId }를 검증한 후,
 * 기존 세션이 있으면 정리하고 새로운 세션을 수립합니다.
 * 검증 실패 시 즉시 연결을 해제합니다.
 *
 * @param io - Socket.IO 서버 인스턴스
 * @param socket - 클라이언트 소켓
 * @param payload - 클라이언트가 전송한 인증 데이터 (token, deviceId, screenId)
 *
 * @example
 * socket.on('auth', (payload) => {
 *   handleDisplayAuth(io, socket, payload);
 * });
 */
export function handleDisplayAuth(
  io: Server,
  socket: Socket,
  payload: DisplayClientPayload
): void {
  const { token, deviceId, screenId } = payload;
  const jwtSecret = process.env.SOCKET_JWT_SECRET || '';

  // 1. 입력값 검증
  if (!token || !deviceId || !screenId) {
    logger.warn('인증 데이터 누락: socketId=%s', socket.id);
    socket.emit('auth_failed', { reason: 'invalid_payload' });
    socket.disconnect(true);
    return;
  }

  // 2. JWT 토큰 검증
  const claims = verifyDisplayToken(token, jwtSecret, screenId);
  if (!claims) {
    logger.warn('토큰 검증 실패: deviceId=%s, screenId=%s, socketId=%s, ip=%s', deviceId, screenId, socket.id, socket.handshake.address);
    socket.emit('auth_failed', { reason: 'invalid_token' });
    socket.disconnect(true);
    return;
  }

  // 3. 기존 연결 정리 (동일 deviceId로 재접속하는 경우)
  const displayNamespace = io.of('/display');
  disconnectExistingDevice(displayNamespace, deviceId);

  // 4. 소켓 데이터 저장
  const socketData: DisplaySocketData = {
    deviceId,
    screenId,
    authenticatedAt: Date.now(),
  };
  socket.data = { ...socket.data, ...socketData };

  // 5. 클라이언트에 인증 성공 알림
  socket.emit('auth_success', { screenId });

  // 6. 인증 성공 로깅
  logger.info('디스플레이 클라이언트 인증 성공: deviceId=%s, screenId=%s, socketId=%s, userId=%s, ip=%s', deviceId, screenId, socket.id, claims.sub, socket.handshake.address);
}

/**
 * 클라이언트 연결 해제 시 세션을 정리합니다.
 *
 * 소켓이 연결 해제될 때 deviceId와 screenId를 로깅하고,
 * 필요한 세션 정리 작업을 수행합니다.
 *
 * @param io - Socket.IO 서버 인스턴스
 * @param socket - 연결이 해제된 소켓
 *
 * @example
 * socket.on('disconnect', () => {
 *   handleDisplayDisconnect(io, socket);
 * });
 */
export function handleDisplayDisconnect(_io: Server, socket: Socket): void {
  const { deviceId, screenId } = socket.data as Partial<DisplaySocketData>;

  // 1. 연결 해제 정보 로깅
  if (deviceId && screenId) {
    logger.info('디스플레이 클라이언트 연결 해제: deviceId=%s, screenId=%s, socketId=%s', deviceId, screenId, socket.id);
  } else {
    logger.warn('인증되지 않은 클라이언트 연결 해제: socketId=%s', socket.id);
  }

  // 2. 필요한 정리 작업 (향후 세션 통계, 리소스 해제 등)
  // - 클라이언트 활동 로그 기록
  // - 세션 통계 업데이트
  // - 리소스 정리
}

/**
 * /display 네임스페이스를 설정하고 이벤트 핸들러를 등록합니다.
 *
 * Socket.IO 서버의 /display 네임스페이스를 초기화하고,
 * 클라이언트 연결, 인증, 연결 해제 이벤트 핸들러를 등록합니다.
 * 5초 내 인증하지 않으면 자동으로 연결을 종료합니다.
 *
 * @param io - Socket.IO 서버 인스턴스
 *
 * @example
 * const io = new Server(httpServer);
 * setupDisplayNamespace(io);
 */
export function setupDisplayNamespace(io: Server): void {
  // 1. /display 네임스페이스 생성
  const displayNamespace: Namespace = io.of('/display');

  // 2. connection 이벤트 핸들러 등록
  displayNamespace.on('connection', (socket: Socket) => {
    logger.debug('디스플레이 클라이언트 연결: socketId=%s, ip=%s', socket.id, socket.handshake.address);

    // 3. 5초 인증 타임아웃 설정
    let authTimeout: NodeJS.Timeout | null = setTimeout(() => {
      if (!socket.data.deviceId) {
        // 5초 내 인증하지 않았으면 연결 해제
        logger.warn('인증 타임아웃: socketId=%s, ip=%s', socket.id, socket.handshake.address);
        socket.emit('auth_timeout', { reason: 'authentication_timeout' });
        socket.disconnect(true);
      }
      authTimeout = null;
    }, 5000);

    // 4. auth 이벤트 리스너 등록
    socket.on('auth', (payload: DisplayClientPayload) => {
      // 타임아웃 취소 (인증 요청이 들어왔으므로)
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }

      // 인증 처리
      handleDisplayAuth(io, socket, payload);
    });

    // 5. disconnect 이벤트 리스너 등록
    socket.on('disconnect', () => {
      // 타임아웃 정리 (이미 연결이 해제되었으므로)
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }

      // 연결 해제 처리
      handleDisplayDisconnect(io, socket);
    });

    // 6. error 이벤트 리스너 등록 (소켓 에러 로깅)
    socket.on('error', (error: Error) => {
      logger.error('디스플레이 소켓 에러: socketId=%s, message=%s', socket.id, error.message);
    });
  });

  logger.info('/display 네임스페이스 설정 완료');
}
