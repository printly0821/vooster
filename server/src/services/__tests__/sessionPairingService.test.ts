/**
 * 세션 페어링 서비스 테스트
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { verify } from 'jsonwebtoken';
import { initSessionPairingService, getSessionPairingService } from '../sessionPairingService';
import type { SessionPairingPayload } from '../../types';

describe('SessionPairingService', () => {
  const jwtSecret = 'test-secret-key-12345';

  beforeEach(() => {
    // 각 테스트마다 서비스 재초기화
    initSessionPairingService({
      jwtSecret,
      tokenExpiresIn: '10m',
      sessionTTL: 15 * 60 * 1000,
      pairingUrlBase: 'https://test.example.com/pair',
    });
  });

  describe('createSession', () => {
    it('새로운 세션을 생성할 수 있음', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.length).toBe(8);
      expect(session.pairingToken).toBeDefined();
      expect(session.status).toBe('waiting');
      expect(session.createdAt).toBeDefined();
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
      expect(session.pairedAt).toBeUndefined();
    });

    it('고유한 세션 ID를 생성함', () => {
      const service = getSessionPairingService();
      const session1 = service.createSession('user1');
      const session2 = service.createSession('user2');

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('토큰이 올바른 형식임', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      const decoded = verify(session.pairingToken, jwtSecret) as SessionPairingPayload;
      expect(decoded.sid).toBe(session.sessionId);
      expect(decoded.sub).toBe('user123');
    });
  });

  describe('generatePairingUrl', () => {
    it('페어링 URL을 생성할 수 있음', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');
      const url = service.generatePairingUrl(session);

      expect(url).toContain('https://test.example.com/pair?');
      expect(url).toContain(`sid=${session.sessionId}`);
      expect(url).toContain(`t=${session.pairingToken}`);
    });
  });

  describe('getSession', () => {
    it('존재하는 세션을 조회할 수 있음', () => {
      const service = getSessionPairingService();
      const created = service.createSession('user123');

      const retrieved = service.getSession(created.sessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(created.sessionId);
    });

    it('존재하지 않는 세션을 조회하면 undefined 반환', () => {
      const service = getSessionPairingService();
      const retrieved = service.getSession('INVALID');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('verifyPairingToken', () => {
    it('유효한 토큰을 검증할 수 있음', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      const result = service.verifyPairingToken(session.sessionId, session.pairingToken);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.sid).toBe(session.sessionId);
        expect(result.payload.sub).toBe('user123');
      }
    });

    it('잘못된 토큰 검증 실패', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      const result = service.verifyPairingToken(session.sessionId, 'invalid-token');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('INVALID_TOKEN');
      }
    });

    it('세션 ID 불일치 검증 실패', () => {
      const service = getSessionPairingService();
      const session1 = service.createSession('user1');
      const session2 = service.createSession('user2');

      // session2의 세션ID로 session1의 토큰 검증
      const result = service.verifyPairingToken(session2.sessionId, session1.pairingToken);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('SID_MISMATCH');
      }
    });

    it('존재하지 않는 세션으로 검증 실패', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      const result = service.verifyPairingToken('INVALID', session.pairingToken);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('SESSION_NOT_FOUND');
      }
    });
  });

  describe('completePairing', () => {
    it('페어링을 완료할 수 있음', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      const result = service.completePairing(session.sessionId, 'socket-mobile-1', 'socket-monitor-1');
      expect(result).toBe(true);

      const updated = service.getSession(session.sessionId);
      expect(updated?.status).toBe('paired');
      expect(updated?.mobileSocketId).toBe('socket-mobile-1');
      expect(updated?.monitorSocketId).toBe('socket-monitor-1');
      expect(updated?.pairedAt).toBeDefined();
    });

    it('존재하지 않는 세션으로 페어링 실패', () => {
      const service = getSessionPairingService();
      const result = service.completePairing('INVALID', 'socket-1');

      expect(result).toBe(false);
    });
  });

  describe('removeSocketFromSession', () => {
    it('소켓을 세션에서 제거할 수 있음', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');
      service.completePairing(session.sessionId, 'socket-mobile-1');

      const sessionId = service.removeSocketFromSession('socket-mobile-1');
      expect(sessionId).toBe(session.sessionId);

      const updated = service.getSession(session.sessionId);
      expect(updated?.mobileSocketId).toBeUndefined();
    });

    it('존재하지 않는 소켓 제거 반환값 undefined', () => {
      const service = getSessionPairingService();
      const result = service.removeSocketFromSession('INVALID-SOCKET');

      expect(result).toBeUndefined();
    });
  });

  describe('releaseSession', () => {
    it('세션을 해제할 수 있음', () => {
      const service = getSessionPairingService();
      const session = service.createSession('user123');

      const result = service.releaseSession(session.sessionId);
      expect(result).toBe(true);

      const retrieved = service.getSession(session.sessionId);
      expect(retrieved).toBeUndefined();
    });

    it('존재하지 않는 세션 해제 실패', () => {
      const service = getSessionPairingService();
      const result = service.releaseSession('INVALID');

      expect(result).toBe(false);
    });
  });

  describe('getAllActiveSessions', () => {
    it('모든 활성 세션을 조회할 수 있음', () => {
      const service = getSessionPairingService();
      service.createSession('user1');
      service.createSession('user2');
      service.createSession('user3');

      const sessions = service.getAllActiveSessions();
      expect(sessions.length).toBe(3);
    });

    it('빈 목록을 반환할 수 있음', () => {
      const service = getSessionPairingService();
      const sessions = service.getAllActiveSessions();

      expect(sessions.length).toBe(0);
    });
  });

  describe('getPairedSessions', () => {
    it('페어링된 세션만 조회할 수 있음', () => {
      const service = getSessionPairingService();
      const session1 = service.createSession('user1');
      // session2는 페어링되지 않은 상태로 남겨둠 (대조군)
      service.createSession('user2');

      // session1만 페어링
      service.completePairing(session1.sessionId, 'socket-1');

      const paired = service.getPairedSessions();
      expect(paired.length).toBe(1);
      expect(paired[0]?.sessionId).toBe(session1.sessionId);
    });
  });
});
