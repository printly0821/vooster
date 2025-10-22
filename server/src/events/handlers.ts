/**
 * Socket.IO 이벤트 핸들러
 */

import { Socket, Server } from 'socket.io';
import { sessionService } from '../services/sessionService';
import { getSessionPairingService } from '../services/sessionPairingService';
import { logger } from '../utils/logger';

/**
 * 클라이언트 역할 등록 이벤트 핸들러
 */
export function handleRegisterClient(_io: Server, socket: Socket) {
  return ({ role }: { role: 'mobile' | 'monitor' }) => {
    try {
      socket.data.role = role;
      logger.info('클라이언트 등록: %s (역할: %s)', socket.id, role);
      socket.emit('registered', { success: true, socketId: socket.id });
    } catch (error) {
      logger.error('클라이언트 등록 실패: %s', (error as Error).message);
      socket.emit('error', { message: '클라이언트 등록에 실패했습니다.' });
    }
  };
}

/**
 * 세션 참여 이벤트 핸들러
 */
export function handleJoinSession(io: Server, socket: Socket) {
  return ({ sessionId }: { sessionId: string }) => {
    try {
      if (!sessionId) {
        socket.emit('error', { message: 'sessionId가 필요합니다.' });
        return;
      }

      const role = socket.data.role;
      if (!role) {
        socket.emit('error', { message: '먼저 클라이언트를 등록해주세요.' });
        return;
      }

      // 세션 생성 또는 조회
      let session = sessionService.getSession(sessionId);
      if (!session) {
        session = sessionService.createSession(sessionId);
      }

      // 소켓을 룸에 추가
      socket.join(sessionId);

      // 역할에 따라 세션에 등록
      if (role === 'mobile') {
        sessionService.registerMobileSocket(sessionId, socket.id);
      } else if (role === 'monitor') {
        sessionService.registerMonitorSocket(sessionId, socket.id);
      }

      // 다른 연결된 클라이언트에 알림
      io.to(sessionId).emit('clientJoined', {
        socketId: socket.id,
        role,
        status: sessionService.getSessionStatus(sessionId),
      });

      socket.emit('joinedSession', { sessionId, status: sessionService.getSessionStatus(sessionId) });
      logger.info('세션 참여: %s -> %s (역할: %s)', socket.id, sessionId, role);
    } catch (error) {
      logger.error('세션 참여 실패: %s', (error as Error).message);
      socket.emit('error', { message: '세션 참여에 실패했습니다.' });
    }
  };
}

/**
 * 주문 스캔 이벤트 핸들러 (T-007)
 * 모바일에서 전송되는 바코드 스캔 데이터를 모니터로 브로드캐스트합니다.
 * ACK를 반환하여 클라이언트의 재시도 로직을 지원합니다.
 */
export function handleScanOrder(io: Server, socket: Socket) {
  return (
    {
      sessionId,
      orderNo,
      ts,
      nonce,
    }: {
      sessionId: string;
      orderNo: string;
      ts: number;
      nonce?: string;
    },
    callback?: (err: any, ack: { received: boolean; nonce: string }) => void
  ) => {
    try {
      if (!sessionId || !orderNo) {
        const error = 'sessionId와 orderNo가 필요합니다.';
        logger.warn('주문 스캔 실패: %s', error);
        socket.emit('error', { message: error });
        callback?.(error, { received: false, nonce: nonce || '' });
        return;
      }

      const session = sessionService.getSession(sessionId);
      if (!session) {
        const error = '세션을 찾을 수 없습니다.';
        logger.warn('주문 스캔 실패: %s (세션ID: %s)', error, sessionId);
        socket.emit('error', { message: error });
        callback?.(error, { received: false, nonce: nonce || '' });
        return;
      }

      // 같은 세션의 다른 클라이언트에 navigate 이벤트 발송
      io.to(sessionId).emit('navigate', {
        orderNo,
        ts,
        nonce,
        from: socket.data.role,
        fromSocketId: socket.id,
      });

      logger.info('주문 스캔: %s -> %s (주문번호: %s, nonce: %s)', socket.id, sessionId, orderNo, nonce);

      // ACK 반환 (클라이언트의 재시도 로직에 사용됨)
      callback?.(null, { received: true, nonce: nonce || '' });
    } catch (error) {
      logger.error('주문 스캔 처리 실패: %s', (error as Error).message);
      socket.emit('error', { message: '주문 스캔 처리에 실패했습니다.' });
      callback?.((error as Error).message, { received: false, nonce: '' });
    }
  };
}

/**
 * 하트비트 이벤트 핸들러
 * 클라이언트의 연결 상태를 확인합니다.
 */
export function handleHeartbeat(_io: Server, socket: Socket) {
  return () => {
    try {
      const now = Date.now();
      socket.emit('heartbeat:ack', now);
      logger.debug('하트비트: %s', socket.id);
    } catch (error) {
      logger.error('하트비트 처리 실패: %s', (error as Error).message);
    }
  };
}

/**
 * 세션 생성 이벤트 핸들러
 */
export function handleSessionCreate(_io: Server, socket: Socket) {
  return () => {
    try {
      const pairingService = getSessionPairingService();
      const userId = socket.data.user?.id || 'anon';

      // 새로운 세션 생성
      const session = pairingService.createSession(userId);
      const pairingUrl = pairingService.generatePairingUrl(session);

      logger.info('세션 생성됨: %s (사용자: %s)', session.sessionId, userId);

      // 세션 정보 전송
      socket.emit('session:created', {
        sessionId: session.sessionId,
        pairingToken: session.pairingToken,
        expiresIn: 600, // 10분 (초 단위)
        pairingUrl,
      });
    } catch (error) {
      logger.error('세션 생성 실패: %s', (error as Error).message);
      socket.emit('session:error', {
        code: 'PAIRING_FAILED',
        message: '세션 생성에 실패했습니다.',
      });
    }
  };
}

/**
 * 세션 페어링 이벤트 핸들러
 */
export function handleSessionJoin(io: Server, socket: Socket) {
  return ({ sessionId, pairingToken }: { sessionId: string; pairingToken: string }) => {
    try {
      const pairingService = getSessionPairingService();

      // 토큰 검증
      const verification = pairingService.verifyPairingToken(sessionId, pairingToken);
      if (!verification.valid) {
        logger.warn('페어링 실패 - 토큰 검증 실패: %s (%s)', sessionId, verification.error);
        socket.emit('session:error', {
          code: verification.error === 'SID_MISMATCH' ? 'SID_MISMATCH' : 'INVALID_TOKEN',
          message: '페어링 토큰이 유효하지 않습니다.',
        });
        return;
      }

      // 페어링 완료
      const userRole = socket.data.role || 'monitor'; // 기본값: monitor
      const isMonitor = userRole === 'monitor';

      if (isMonitor) {
        pairingService.completePairing(sessionId, socket.id);
      } else {
        // 기존의 monitor 소켓이 있으면 함께 등록
        const session = pairingService.getSession(sessionId);
        if (session?.monitorSocketId) {
          pairingService.completePairing(sessionId, socket.id, session.monitorSocketId);
        } else {
          pairingService.completePairing(sessionId, socket.id);
        }
      }

      // 소켓을 룸에 추가
      socket.join(sessionId);

      // 페어링 완료 알림
      io.to(sessionId).emit('session:paired', {
        sessionId,
        at: Date.now(),
      });

      logger.info('페어링 완료: %s (소켓: %s, 역할: %s)', sessionId, socket.id, userRole);

      socket.emit('session:paired', {
        sessionId,
        at: Date.now(),
      });
    } catch (error) {
      logger.error('세션 페어링 실패: %s', (error as Error).message);
      socket.emit('session:error', {
        code: 'PAIRING_FAILED',
        message: '페어링에 실패했습니다.',
      });
    }
  };
}

/**
 * 연결 해제 이벤트 핸들러
 */
export function handleDisconnect(io: Server) {
  return (socket: Socket) => {
    try {
      const pairingService = getSessionPairingService();

      // 일반 세션 정리
      const sessionId = sessionService.getSessionIdBySocketId(socket.id);
      sessionService.removeSocket(socket.id);

      if (sessionId) {
        const status = sessionService.getSessionStatus(sessionId);
        io.to(sessionId).emit('clientLeft', {
          socketId: socket.id,
          status,
        });
      }

      // 페어링 세션 정리
      const pairingSessionId = pairingService.removeSocketFromSession(socket.id);
      if (pairingSessionId) {
        const session = pairingService.getSession(pairingSessionId);
        if (session && !session.mobileSocketId && !session.monitorSocketId) {
          // 양쪽 모두 연결 해제되면 세션 정리
          pairingService.releaseSession(pairingSessionId);
          logger.info('페어링 세션 해제: %s', pairingSessionId);
        }
      }

      logger.info('클라이언트 연결 해제: %s', socket.id);
    } catch (error) {
      logger.error('연결 해제 처리 실패: %s', (error as Error).message);
    }
  };
}

/**
 * 에러 이벤트 핸들러
 */
export function handleError(_socket: Socket, error: Error) {
  logger.error('소켓 에러: %s', error.message);
}
