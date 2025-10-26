/**
 * 세션 관리 서비스
 * 모바일과 모니터 간의 세션 연결을 관리합니다.
 */

import { SessionInfo } from '../types';
import { logger } from '../utils/logger';

/**
 * 인메모리 세션 저장소
 * 프로덕션 환경에서는 Redis를 사용해야 합니다.
 */
class SessionService {
  private sessions: Map<string, SessionInfo> = new Map();
  private socketToSession: Map<string, string> = new Map(); // socketId -> sessionId

  /**
   * 새로운 세션을 생성합니다.
   */
  createSession(sessionId: string): SessionInfo {
    const session: SessionInfo = {
      sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);
    logger.info('세션 생성: %s', sessionId);
    return session;
  }

  /**
   * 세션을 조회합니다.
   */
  getSession(sessionId: string): SessionInfo | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  /**
   * 모바일 소켓을 세션에 등록합니다.
   */
  registerMobileSocket(sessionId: string, socketId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      logger.warn('세션을 찾을 수 없음: %s', sessionId);
      return false;
    }

    session.mobileSocketId = socketId;
    this.socketToSession.set(socketId, sessionId);
    logger.info('모바일 소켓 등록: %s -> %s', socketId, sessionId);
    return true;
  }

  /**
   * 모니터 소켓을 세션에 등록합니다.
   */
  registerMonitorSocket(sessionId: string, socketId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      logger.warn('세션을 찾을 수 없음: %s', sessionId);
      return false;
    }

    session.monitorSocketId = socketId;
    this.socketToSession.set(socketId, sessionId);
    logger.info('모니터 소켓 등록: %s -> %s', socketId, sessionId);
    return true;
  }

  /**
   * 소켓 ID로부터 세션 ID를 조회합니다.
   */
  getSessionIdBySocketId(socketId: string): string | undefined {
    return this.socketToSession.get(socketId);
  }

  /**
   * 소켓을 세션에서 제거합니다.
   */
  removeSocket(socketId: string): void {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.mobileSocketId === socketId) {
        session.mobileSocketId = undefined;
      }
      if (session.monitorSocketId === socketId) {
        session.monitorSocketId = undefined;
      }

      // 양쪽 모두 연결 해제되면 세션 삭제
      if (!session.mobileSocketId && !session.monitorSocketId) {
        this.sessions.delete(sessionId);
        logger.info('세션 삭제: %s', sessionId);
      }
    }

    this.socketToSession.delete(socketId);
    logger.info('소켓 제거: %s', socketId);
  }

  /**
   * 세션의 상태를 조회합니다.
   */
  getSessionStatus(sessionId: string): {
    isActive: boolean;
    hasMobile: boolean;
    hasMonitor: boolean;
  } {
    const session = this.getSession(sessionId);
    if (!session) {
      return { isActive: false, hasMobile: false, hasMonitor: false };
    }

    return {
      isActive: !!(session.mobileSocketId || session.monitorSocketId),
      hasMobile: !!session.mobileSocketId,
      hasMonitor: !!session.monitorSocketId,
    };
  }

  /**
   * 오래된 세션을 정리합니다 (30분 이상 비활성).
   */
  cleanupInactiveSessions(maxIdleTime: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxIdleTime) {
        this.sessions.delete(sessionId);
        if (session.mobileSocketId) {
          this.socketToSession.delete(session.mobileSocketId);
        }
        if (session.monitorSocketId) {
          this.socketToSession.delete(session.monitorSocketId);
        }
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('%d개의 오래된 세션이 정리됨', cleanedCount);
    }

    return cleanedCount;
  }

  /**
   * 모든 세션 정보를 조회합니다 (모니터링용).
   */
  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }
}

export const sessionService = new SessionService();
