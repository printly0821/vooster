/**
 * 트리거 로그 저장소 인터페이스
 *
 * 트리거 API 호출 내역을 감시/감사 목적으로 저장합니다
 */

import { TriggerLog } from '../../types/trigger';

/**
 * 트리거 로그 저장소 인터페이스
 */
export interface ITriggerLogRepository {
  /**
   * 트리거 로그를 생성합니다
   *
   * @param log - 트리거 로그 정보
   * @returns 생성된 로그 ID
   */
  create(log: Omit<TriggerLog, 'id' | 'timestamp'>): Promise<string>;

  /**
   * txId로 트리거 로그를 조회합니다
   *
   * @param txId - 트랜잭션 ID
   * @returns 로그 정보 또는 null
   */
  findByTxId(txId: string): Promise<TriggerLog | null>;

  /**
   * 사용자별 트리거 로그를 조회합니다 (최근 순)
   *
   * @param userId - 사용자 ID
   * @param limit - 최대 개수 (기본: 100)
   * @returns 로그 배열
   */
  listByUser(userId: string, limit?: number): Promise<TriggerLog[]>;

  /**
   * 화면별 트리거 로그를 조회합니다 (최근 순)
   *
   * @param screenId - 화면 ID
   * @param limit - 최대 개수 (기본: 100)
   * @returns 로그 배열
   */
  listByScreen(screenId: string, limit?: number): Promise<TriggerLog[]>;
}
