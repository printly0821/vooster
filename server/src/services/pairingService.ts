/**
 * 페어링 관리 서비스
 *
 * WeChat 스타일 QR 기반 페어링 비즈니스 로직을 처리합니다
 * - QR 생성 (sessionId, 6자리 code)
 * - Long Polling (30초 대기)
 * - 승인 처리 (JWT 발급)
 */

import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { PairingSession, PairQRData } from '../types/pairing';
import { DisplayJWTPayload } from '../types/auth';
import { IPairingRepository } from './repositories/pairingRepository';
import { MemoryPairingRepository } from './repositories/memory';
import { logger } from '../utils/logger';

/**
 * 6자리 숫자 코드를 생성합니다
 *
 * @returns 6자리 숫자 문자열 (예: "123456")
 */
function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 페어링 서비스 클래스
 */
class PairingService {
  /**
   * 저장소 인스턴스
   */
  private repository: IPairingRepository;

  /**
   * 폴링 대기 중인 요청들 (sessionId -> resolve 함수)
   */
  private pollingWaiters: Map<string, Array<() => void>> = new Map();

  constructor(repository?: IPairingRepository) {
    this.repository = repository || new MemoryPairingRepository();
  }

  /**
   * 저장소를 설정합니다 (테스트용)
   */
  setRepository(repository: IPairingRepository): void {
    this.repository = repository;
  }

  /**
   * QR 페어링 세션을 생성합니다
   *
   * @param wsUrl - WebSocket URL (환경변수에서 가져옴)
   * @returns 세션 정보 및 QR 데이터
   */
  async createQR(wsUrl: string): Promise<{ session: PairingSession; qrData: string }> {
    // 1. sessionId 및 code 생성
    const sessionId = randomUUID();
    const code = generateSixDigitCode();

    // 2. 만료 시간 설정 (5분 후)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. 세션 저장
    const session = await this.repository.create(sessionId, code, expiresAt);

    // 4. QR 데이터 생성
    const qrDataObj: PairQRData = {
      sessionId,
      code,
      wsUrl,
    };

    const qrData = JSON.stringify(qrDataObj);

    logger.info('QR 페어링 세션 생성: sessionId=%s, code=%s, expiresAt=%s', sessionId, code, expiresAt.toISOString());

    return { session, qrData };
  }

  /**
   * 페어링 폴링 (Long Polling, 최대 30초 대기)
   *
   * @param sessionId - 세션 ID
   * @param timeoutMs - 타임아웃 (기본: 30초)
   * @returns 승인된 경우 세션, 타임아웃/만료 시 null
   */
  async poll(sessionId: string, timeoutMs: number = 30000): Promise<PairingSession | null> {
    // 1. 세션 조회
    const session = await this.repository.findById(sessionId);

    if (!session) {
      logger.warn('폴링 실패 - 세션 없음: sessionId=%s', sessionId);
      return null;
    }

    // 2. 이미 승인된 경우 즉시 반환
    if (session.status === 'approved') {
      logger.info('폴링 성공 (즉시): sessionId=%s', sessionId);
      return session;
    }

    // 3. pending 상태면 Long Polling (승인 대기)
    logger.debug('Long Polling 시작: sessionId=%s, timeout=%dms', sessionId, timeoutMs);

    const approved = await this.waitForApproval(sessionId, timeoutMs);

    if (approved) {
      // 승인됨: 최신 세션 정보 조회
      const updatedSession = await this.repository.findById(sessionId);
      logger.info('폴링 성공 (대기 후): sessionId=%s', sessionId);
      return updatedSession;
    }

    // 4. 타임아웃
    logger.debug('폴링 타임아웃: sessionId=%s', sessionId);
    return null;
  }

  /**
   * 승인을 대기합니다 (Promise 기반 Long Polling)
   *
   * @param sessionId - 세션 ID
   * @param timeoutMs - 타임아웃 (ms)
   * @returns 승인 여부
   */
  private waitForApproval(sessionId: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      // 타임아웃 설정
      const timeout = setTimeout(() => {
        this.removeWaiter(sessionId, resolveFunc);
        resolve(false);
      }, timeoutMs);

      // 승인 대기 함수
      const resolveFunc = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      // 대기 큐에 추가
      if (!this.pollingWaiters.has(sessionId)) {
        this.pollingWaiters.set(sessionId, []);
      }
      this.pollingWaiters.get(sessionId)!.push(resolveFunc);
    });
  }

  /**
   * 대기 큐에서 제거합니다
   */
  private removeWaiter(sessionId: string, waiterFunc: () => void): void {
    const waiters = this.pollingWaiters.get(sessionId);
    if (waiters) {
      const index = waiters.indexOf(waiterFunc);
      if (index > -1) {
        waiters.splice(index, 1);
      }
    }
  }

  /**
   * 페어링을 승인합니다
   *
   * @param sessionId - 세션 ID
   * @param code - 6자리 확인 코드
   * @param approvedBy - 승인한 사용자 ID
   * @param deviceId - 디바이스 ID
   * @param orgId - 조직 ID
   * @param lineId - 라인 ID
   * @param jwtSecret - JWT 시크릿
   * @returns 승인 결과 (token, screenId)
   */
  async approve(
    sessionId: string,
    code: string,
    approvedBy: string,
    deviceId: string,
    orgId: string,
    lineId: string,
    jwtSecret: string
  ): Promise<{ token: string; screenId: string } | null> {
    // 1. 세션 조회
    const session = await this.repository.findBySessionAndCode(sessionId, code);

    if (!session) {
      logger.warn('페어링 승인 실패 - 세션 없음 또는 코드 불일치: sessionId=%s', sessionId);
      return null;
    }

    if (session.status !== 'pending') {
      logger.warn('페어링 승인 실패 - 상태 불일치: sessionId=%s, status=%s', sessionId, session.status);
      return null;
    }

    // 2. JWT 토큰 생성
    const screenId = `screen:${orgId}:${lineId}`;

    const payload: DisplayJWTPayload = {
      sub: approvedBy,
      deviceId,
      screenId,
      scopes: [`display:${screenId}`],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1년
      type: 'display',
    };

    const token = jwt.sign(payload, jwtSecret);

    // 3. 세션 승인 처리
    const success = await this.repository.approve(sessionId, token, approvedBy, deviceId, orgId, lineId);

    if (!success) {
      logger.error('페어링 승인 처리 실패: sessionId=%s', sessionId);
      return null;
    }

    // 4. 대기 중인 폴링 요청들에게 알림
    this.notifyWaiters(sessionId);

    logger.info('페어링 승인 완료: sessionId=%s, screenId=%s, approvedBy=%s', sessionId, screenId, approvedBy);

    return { token, screenId };
  }

  /**
   * 대기 중인 폴링 요청들에게 승인을 알립니다
   */
  private notifyWaiters(sessionId: string): void {
    const waiters = this.pollingWaiters.get(sessionId);
    if (waiters) {
      logger.debug('폴링 대기자 알림: sessionId=%s, waiters=%d', sessionId, waiters.length);
      waiters.forEach((resolve) => resolve());
      this.pollingWaiters.delete(sessionId);
    }
  }

  /**
   * 만료된 세션을 정리합니다
   */
  async cleanupExpired(): Promise<number> {
    return await this.repository.cleanupExpired();
  }
}

/**
 * 싱글톤 인스턴스
 */
export const pairingService = new PairingService();
