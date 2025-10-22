/**
 * 세션 페어링 서비스
 * QR 기반 세션/소켓 룸 페어링 로직을 관리합니다.
 */

import { sign, verify, SignOptions } from 'jsonwebtoken';
import { customAlphabet } from 'nanoid';
import { PairingSession, SessionPairingPayload } from '../types';
import { logger } from '../utils/logger';

/**
 * 8자 길이의 고유 ID를 생성합니다 (대문자+숫자).
 */
const generateSessionId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

interface PairingServiceConfig {
  jwtSecret: string;
  tokenExpiresIn?: string; // 기본값: '10m'
  sessionTTL?: number; // 기본값: 15 * 60 * 1000 (15분)
  pairingUrlBase?: string; // 기본값: 'https://app.example.com/pair'
}

class SessionPairingService {
  private sessions: Map<string, PairingSession> = new Map();
  private config: Required<PairingServiceConfig>;

  constructor(config: PairingServiceConfig) {
    this.config = {
      jwtSecret: config.jwtSecret,
      tokenExpiresIn: config.tokenExpiresIn || '10m',
      sessionTTL: config.sessionTTL || 15 * 60 * 1000, // 15분
      pairingUrlBase: config.pairingUrlBase || 'https://app.example.com/pair',
    };
  }

  /**
   * 새로운 세션을 생성합니다.
   */
  createSession(userId: string = 'anon'): PairingSession {
    const sessionId = generateSessionId();
    const now = Date.now();
    const expiresAt = now + this.config.sessionTTL;

    // 세션 페어링 토큰 생성 (10분 만료)
    const payload: SessionPairingPayload = {
      sid: sessionId,
      sub: userId,
    };

    const pairingToken = sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.tokenExpiresIn,
    } as SignOptions);

    const session: PairingSession = {
      sessionId,
      createdAt: now,
      expiresAt,
      pairingToken,
      status: 'waiting',
    };

    this.sessions.set(sessionId, session);

    logger.info('세션 생성: %s (사용자: %s)', sessionId, userId);

    // 세션 자동 만료 설정 (TTL 후 삭제)
    setTimeout(() => {
      if (this.sessions.has(sessionId)) {
        const sess = this.sessions.get(sessionId)!;
        if (sess.status !== 'paired') {
          this.sessions.delete(sessionId);
          logger.info('세션 자동 만료: %s', sessionId);
        }
      }
    }, this.config.sessionTTL);

    return session;
  }

  /**
   * 페어링 URL을 생성합니다.
   */
  generatePairingUrl(session: PairingSession): string {
    const params = new URLSearchParams({
      sid: session.sessionId,
      t: session.pairingToken,
    });
    return `${this.config.pairingUrlBase}?${params.toString()}`;
  }

  /**
   * 세션을 조회합니다.
   */
  getSession(sessionId: string): PairingSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // 만료 확인
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      logger.info('만료된 세션 삭제: %s', sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * 페어링 토큰을 검증합니다.
   */
  verifyPairingToken(
    sessionId: string,
    token: string
  ): { valid: true; payload: SessionPairingPayload } | { valid: false; error: string } {
    try {
      // 세션 존재 확인
      const session = this.getSession(sessionId);
      if (!session) {
        return { valid: false, error: 'SESSION_NOT_FOUND' };
      }

      // 토큰 검증
      const payload = verify(token, this.config.jwtSecret) as SessionPairingPayload;

      // 세션 ID 일치 확인
      if (payload.sid !== sessionId) {
        return { valid: false, error: 'SID_MISMATCH' };
      }

      logger.debug('토큰 검증 성공: %s', sessionId);
      return { valid: true, payload };
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.warn('토큰 검증 실패 (%s): %s', sessionId, errorMessage);

      if (errorMessage.includes('jwt expired')) {
        return { valid: false, error: 'TOKEN_EXPIRED' };
      }
      return { valid: false, error: 'INVALID_TOKEN' };
    }
  }

  /**
   * 페어링을 완료합니다.
   */
  completePairing(
    sessionId: string,
    mobileSocketId: string,
    monitorSocketId?: string
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      logger.warn('페어링 실패 - 세션 없음: %s', sessionId);
      return false;
    }

    session.mobileSocketId = mobileSocketId;
    if (monitorSocketId) {
      session.monitorSocketId = monitorSocketId;
    }
    session.pairedAt = Date.now();
    session.status = 'paired';

    logger.info('페어링 완료: %s (모바일: %s, 모니터: %s)', sessionId, mobileSocketId, monitorSocketId || 'none');

    return true;
  }

  /**
   * 소켓을 세션에서 제거합니다.
   */
  removeSocketFromSession(socketId: string): string | undefined {
    for (const session of this.sessions.values()) {
      if (session.mobileSocketId === socketId) {
        session.mobileSocketId = undefined;
        return session.sessionId;
      }
      if (session.monitorSocketId === socketId) {
        session.monitorSocketId = undefined;
        return session.sessionId;
      }
    }
    return undefined;
  }

  /**
   * 세션을 해제합니다.
   */
  releaseSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      logger.info('세션 해제: %s', sessionId);
      return true;
    }
    return false;
  }

  /**
   * 모든 활성 세션을 조회합니다 (모니터링용).
   */
  getAllActiveSessions(): PairingSession[] {
    const now = Date.now();
    const activeSessions: PairingSession[] = [];

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        activeSessions.push(session);
      } else {
        this.sessions.delete(session.sessionId);
      }
    }

    return activeSessions;
  }

  /**
   * 페어링된 세션만 조회합니다.
   */
  getPairedSessions(): PairingSession[] {
    return this.getAllActiveSessions().filter(s => s.status === 'paired');
  }
}

// 싱글톤 인스턴스 (초기화 필요)
let instance: SessionPairingService;

export function initSessionPairingService(config: PairingServiceConfig): SessionPairingService {
  instance = new SessionPairingService(config);
  return instance;
}

export function getSessionPairingService(): SessionPairingService {
  if (!instance) {
    throw new Error('SessionPairingService가 초기화되지 않았습니다.');
  }
  return instance;
}
