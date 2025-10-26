/**
 * 트리거 관리 서비스
 *
 * 스마트폰에서 바코드를 스캔하면 원격 디스플레이에 제작의뢰서를 표시하는 핵심 로직
 * - Socket.IO 메시지 전송 (emitToChannel)
 * - 트리거 로그 기록 (감시/감사)
 */

import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { TriggerLog } from '../types/trigger';
import { emitToChannel } from './channelManager';
import { ITriggerLogRepository } from './repositories/triggerLogRepository';
import { MemoryTriggerLogRepository } from './repositories/memory/triggerLogRepository';
import { logger } from '../utils/logger';

/**
 * 트리거 서비스 클래스
 */
class TriggerService {
  /**
   * 저장소 인스턴스
   */
  private repository: ITriggerLogRepository;

  constructor(repository?: ITriggerLogRepository) {
    this.repository = repository || new MemoryTriggerLogRepository();
  }

  /**
   * 저장소를 설정합니다 (테스트용)
   */
  setRepository(repository: ITriggerLogRepository): void {
    this.repository = repository;
  }

  /**
   * 트리거를 실행합니다 (핵심 기능)
   *
   * 1. txId 생성
   * 2. navigate 이벤트 페이로드 생성
   * 3. Socket.IO로 메시지 전송 (emitToChannel)
   * 4. 결과 로깅 (DB)
   *
   * @param io - Socket.IO 서버 인스턴스
   * @param screenId - 대상 화면 ID
   * @param jobNo - 작업 번호
   * @param userId - 트리거를 요청한 사용자 ID
   * @param ipAddress - 요청 IP 주소
   * @returns 전송 결과
   */
  async trigger(
    io: Server,
    screenId: string,
    jobNo: string,
    userId: string,
    ipAddress: string
  ): Promise<{
    ok: boolean;
    txId: string;
    clientCount?: number;
    reason?: 'no_clients' | 'duplicate' | 'error';
  }> {
    // 1. txId 생성
    const txId = randomUUID();

    // 2. URL 생성
    const appUrl = process.env.APP_URL || 'http://localhost:3000/orders';
    const url = `${appUrl}/${jobNo}`;

    // 3. navigate 이벤트 페이로드 생성
    const payload = {
      type: 'navigate',
      txId,
      screenId,
      jobNo,
      url,
      timestamp: Date.now(),
      exp: Date.now() + 60000, // 1분 후 만료
    };

    logger.info('트리거 전송 시작: screenId=%s, jobNo=%s, txId=%s, userId=%s', screenId, jobNo, txId, userId);

    // 4. Socket.IO로 메시지 전송 (T-013의 emitToChannel 활용)
    const result = emitToChannel(io, screenId, 'navigate', payload);

    // 5. 트리거 로그 기록
    await this.logTrigger({
      userId,
      screenId,
      jobNo,
      txId,
      status: result.ok ? 'delivered' : 'missed',
      clientCount: result.clientCount || 0,
      ip: ipAddress,
      statusCode: 200,
    });

    // 6. 결과 반환
    if (!result.ok) {
      logger.warn('트리거 전송 실패: screenId=%s, txId=%s, reason=%s', screenId, txId, result.reason);
      return {
        ok: false,
        txId,
        reason: result.reason,
      };
    }

    logger.info('트리거 전송 성공: screenId=%s, txId=%s, clientCount=%d', screenId, txId, result.clientCount || 0);

    return {
      ok: true,
      txId,
      clientCount: result.clientCount,
    };
  }

  /**
   * 트리거 로그를 저장합니다
   *
   * @param log - 로그 정보
   */
  private async logTrigger(log: Omit<TriggerLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const id = await this.repository.create(log);
      logger.debug('트리거 로그 저장: id=%s, txId=%s', id, log.txId);
    } catch (error) {
      // 로그 저장 실패는 치명적이지 않으므로 경고만 기록
      logger.warn('트리거 로그 저장 실패: txId=%s, error=%s', log.txId, (error as Error).message);
    }
  }

  /**
   * 사용자별 트리거 로그를 조회합니다
   *
   * @param userId - 사용자 ID
   * @param limit - 최대 개수
   * @returns 트리거 로그 배열
   */
  async getUserLogs(userId: string, limit?: number): Promise<TriggerLog[]> {
    return await this.repository.listByUser(userId, limit);
  }

  /**
   * 화면별 트리거 로그를 조회합니다
   *
   * @param screenId - 화면 ID
   * @param limit - 최대 개수
   * @returns 트리거 로그 배열
   */
  async getScreenLogs(screenId: string, limit?: number): Promise<TriggerLog[]> {
    return await this.repository.listByScreen(screenId, limit);
  }
}

/**
 * 싱글톤 인스턴스
 */
export const triggerService = new TriggerService();
