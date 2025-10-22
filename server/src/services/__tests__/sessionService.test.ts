/**
 * 세션 서비스 테스트
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { sessionService } from '../sessionService';

describe('SessionService', () => {
  beforeEach(() => {
    // 각 테스트마다 세션 서비스 초기화
    const allSessions = sessionService.getAllSessions();
    allSessions.forEach(session => {
      if (session.mobileSocketId) {
        sessionService.removeSocket(session.mobileSocketId);
      }
      if (session.monitorSocketId) {
        sessionService.removeSocket(session.monitorSocketId);
      }
    });
  });

  describe('createSession', () => {
    it('새로운 세션을 생성할 수 있음', () => {
      const sessionId = 'session-123';
      const session = sessionService.createSession(sessionId);

      expect(session.sessionId).toBe(sessionId);
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(session.mobileSocketId).toBeUndefined();
      expect(session.monitorSocketId).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('존재하는 세션을 조회할 수 있음', () => {
      const sessionId = 'session-123';
      sessionService.createSession(sessionId);

      const session = sessionService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('존재하지 않는 세션을 조회하면 undefined 반환', () => {
      const session = sessionService.getSession('non-existent-id');
      expect(session).toBeUndefined();
    });

    it('조회 시 lastActivity가 업데이트됨', (done) => {
      const sessionId = 'session-123';
      const session1 = sessionService.createSession(sessionId);
      const originalActivity = session1.lastActivity;

      // 약간의 시간 지연 후 조회
      setTimeout(() => {
        const session2 = sessionService.getSession(sessionId);
        expect(session2!.lastActivity).toBeGreaterThanOrEqual(originalActivity);
        done();
      }, 10);
    });
  });

  describe('registerMobileSocket', () => {
    it('모바일 소켓을 세션에 등록할 수 있음', () => {
      const sessionId = 'session-123';
      const socketId = 'socket-mobile-1';

      sessionService.createSession(sessionId);
      const result = sessionService.registerMobileSocket(sessionId, socketId);

      expect(result).toBe(true);
      const session = sessionService.getSession(sessionId);
      expect(session?.mobileSocketId).toBe(socketId);
    });

    it('존재하지 않는 세션에 모바일 소켓을 등록하면 실패', () => {
      const result = sessionService.registerMobileSocket('non-existent', 'socket-1');
      expect(result).toBe(false);
    });
  });

  describe('registerMonitorSocket', () => {
    it('모니터 소켓을 세션에 등록할 수 있음', () => {
      const sessionId = 'session-123';
      const socketId = 'socket-monitor-1';

      sessionService.createSession(sessionId);
      const result = sessionService.registerMonitorSocket(sessionId, socketId);

      expect(result).toBe(true);
      const session = sessionService.getSession(sessionId);
      expect(session?.monitorSocketId).toBe(socketId);
    });
  });

  describe('getSessionIdBySocketId', () => {
    it('소켓 ID로 세션 ID를 조회할 수 있음', () => {
      const sessionId = 'session-123';
      const socketId = 'socket-1';

      sessionService.createSession(sessionId);
      sessionService.registerMobileSocket(sessionId, socketId);

      const foundSessionId = sessionService.getSessionIdBySocketId(socketId);
      expect(foundSessionId).toBe(sessionId);
    });
  });

  describe('removeSocket', () => {
    it('소켓을 세션에서 제거할 수 있음', () => {
      const sessionId = 'session-123';
      const socketId = 'socket-1';

      sessionService.createSession(sessionId);
      sessionService.registerMobileSocket(sessionId, socketId);
      sessionService.removeSocket(socketId);

      const session = sessionService.getSession(sessionId);
      expect(session?.mobileSocketId).toBeUndefined();
    });

    it('모든 소켓이 제거되면 세션도 삭제됨', () => {
      const sessionId = 'session-123';
      const mobileSocketId = 'socket-mobile-1';
      const monitorSocketId = 'socket-monitor-1';

      sessionService.createSession(sessionId);
      sessionService.registerMobileSocket(sessionId, mobileSocketId);
      sessionService.registerMonitorSocket(sessionId, monitorSocketId);

      sessionService.removeSocket(mobileSocketId);
      sessionService.removeSocket(monitorSocketId);

      const session = sessionService.getSession(sessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('getSessionStatus', () => {
    it('활성 세션 상태를 조회할 수 있음', () => {
      const sessionId = 'session-123';
      sessionService.createSession(sessionId);
      sessionService.registerMobileSocket(sessionId, 'socket-1');

      const status = sessionService.getSessionStatus(sessionId);
      expect(status.isActive).toBe(true);
      expect(status.hasMobile).toBe(true);
      expect(status.hasMonitor).toBe(false);
    });

    it('비활성 세션 상태를 조회할 수 있음', () => {
      const status = sessionService.getSessionStatus('non-existent');
      expect(status.isActive).toBe(false);
      expect(status.hasMobile).toBe(false);
      expect(status.hasMonitor).toBe(false);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('오래된 세션을 정리할 수 있음', () => {
      const sessionId = 'session-old';
      const session = sessionService.createSession(sessionId);
      // lastActivity를 과거로 설정
      session.lastActivity = Date.now() - 40 * 60 * 1000; // 40분 전

      const cleanedCount = sessionService.cleanupInactiveSessions(30 * 60 * 1000);
      expect(cleanedCount).toBe(1);

      const result = sessionService.getSession(sessionId);
      expect(result).toBeUndefined();
    });

    it('활성 세션은 정리하지 않음', () => {
      const sessionId = 'session-active';
      sessionService.createSession(sessionId);

      const cleanedCount = sessionService.cleanupInactiveSessions(30 * 60 * 1000);
      expect(cleanedCount).toBe(0);

      const result = sessionService.getSession(sessionId);
      expect(result).toBeDefined();
    });
  });
});
