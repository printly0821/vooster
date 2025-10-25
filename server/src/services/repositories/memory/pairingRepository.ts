/**
 * 메모리 기반 페어링 세션 저장소
 *
 * 개발/테스트 환경에서 사용되는 인메모리 페어링 저장소입니다
 */

import { PairingSession } from '../../../types/pairing';
import { IPairingRepository } from '../pairingRepository';
import { logger } from '../../../utils/logger';

/**
 * 메모리 기반 페어링 세션 저장소 구현
 */
export class MemoryPairingRepository implements IPairingRepository {
  /**
   * sessionId를 키로 하는 세션 맵
   */
  private sessions: Map<string, PairingSession> = new Map();

  /**
   * 새로운 페어링 세션을 생성합니다
   */
  async create(sessionId: string, code: string, expiresAt: Date): Promise<PairingSession> {
    const now = new Date();

    const session: PairingSession = {
      sessionId,
      code,
      status: 'pending',
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);

    logger.info('페어링 세션 생성: sessionId=%s, code=%s, expiresAt=%s', sessionId, code, expiresAt.toISOString());
    return session;
  }

  /**
   * 세션 ID로 페어링 세션을 조회합니다
   */
  async findById(sessionId: string): Promise<PairingSession | null> {
    const session = this.sessions.get(sessionId);

    // 만료 확인
    if (session && new Date() > session.expiresAt) {
      session.status = 'expired';
      logger.debug('만료된 세션 조회: sessionId=%s', sessionId);
      return null;
    }

    return session || null;
  }

  /**
   * 세션 ID와 코드로 페어링 세션을 조회합니다
   */
  async findBySessionAndCode(sessionId: string, code: string): Promise<PairingSession | null> {
    const session = await this.findById(sessionId);

    if (!session) return null;
    if (session.code !== code) {
      logger.warn('페어링 코드 불일치: sessionId=%s, expectedCode=%s, providedCode=%s', sessionId, session.code, code);
      return null;
    }

    return session;
  }

  /**
   * 페어링을 승인합니다
   */
  async approve(
    sessionId: string,
    token: string,
    approvedBy: string,
    deviceId: string,
    orgId: string,
    lineId: string
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn('페어링 승인 실패 - 세션 없음: sessionId=%s', sessionId);
      return false;
    }

    if (session.status !== 'pending') {
      logger.warn('페어링 승인 실패 - 상태 불일치: sessionId=%s, status=%s', sessionId, session.status);
      return false;
    }

    // 승인 처리
    session.status = 'approved';
    session.token = token;
    session.approvedBy = approvedBy;
    session.deviceId = deviceId;
    session.orgId = orgId;
    session.lineId = lineId;
    session.updatedAt = new Date();

    logger.info('페어링 승인 완료: sessionId=%s, approvedBy=%s, deviceId=%s', sessionId, approvedBy, deviceId);
    return true;
  }

  /**
   * 만료된 세션을 정리합니다
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        count++;
        logger.debug('만료된 세션 삭제: sessionId=%s', sessionId);
      }
    }

    if (count > 0) {
      logger.info('만료된 페어링 세션 정리: %d개', count);
    }

    return count;
  }
}
