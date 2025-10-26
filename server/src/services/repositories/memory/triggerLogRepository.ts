/**
 * 메모리 기반 트리거 로그 저장소
 *
 * 개발/테스트 환경에서 사용되는 인메모리 트리거 로그 저장소입니다
 */

import { TriggerLog } from '../../../types/trigger';
import { ITriggerLogRepository } from '../triggerLogRepository';
import { logger } from '../../../utils/logger';

/**
 * 메모리 기반 트리거 로그 저장소 구현
 */
export class MemoryTriggerLogRepository implements ITriggerLogRepository {
  /**
   * 로그 배열 (시간 순)
   */
  private logs: TriggerLog[] = [];

  /**
   * 자동 증가 ID (문자열로 변환)
   */
  private nextId: number = 1;

  /**
   * txId를 키로 하는 인덱스 (중복 검사용)
   */
  private txIdIndex: Map<string, string> = new Map(); // txId -> id

  /**
   * 트리거 로그를 생성합니다
   */
  async create(log: Omit<TriggerLog, 'id' | 'timestamp'>): Promise<string> {
    const id = String(this.nextId++);
    const timestamp = new Date();

    const triggerLog: TriggerLog = {
      id,
      ...log,
      timestamp,
    };

    this.logs.push(triggerLog);
    this.txIdIndex.set(log.txId, id);

    logger.debug('트리거 로그 생성: id=%s, txId=%s, userId=%s, screenId=%s, status=%s', id, log.txId, log.userId, log.screenId, log.status);
    return id;
  }

  /**
   * txId로 트리거 로그를 조회합니다
   */
  async findByTxId(txId: string): Promise<TriggerLog | null> {
    const id = this.txIdIndex.get(txId);
    if (!id) return null;

    return this.logs.find((log) => log.id === id) || null;
  }

  /**
   * 사용자별 트리거 로그를 조회합니다 (최근 순)
   */
  async listByUser(userId: string, limit: number = 100): Promise<TriggerLog[]> {
    return this.logs
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 화면별 트리거 로그를 조회합니다 (최근 순)
   */
  async listByScreen(screenId: string, limit: number = 100): Promise<TriggerLog[]> {
    return this.logs
      .filter((log) => log.screenId === screenId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
