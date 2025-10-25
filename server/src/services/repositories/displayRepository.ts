/**
 * 디스플레이 저장소 인터페이스
 *
 * 디스플레이 데이터의 CRUD 작업을 추상화합니다
 * 구현체: MemoryDisplayRepository, SqliteDisplayRepository, PostgresDisplayRepository
 */

import { Display, DisplayRegisterRequest, DisplayQueryOptions } from '../../types/display';

/**
 * 디스플레이 저장소 인터페이스
 *
 * 다양한 저장소 구현체(메모리, SQLite, PostgreSQL)가 이 인터페이스를 구현합니다
 */
export interface IDisplayRepository {
  /**
   * 디스플레이를 등록하거나 업데이트합니다
   *
   * deviceId가 이미 존재하면 업데이트, 없으면 신규 등록
   *
   * @param data - 등록 요청 데이터
   * @returns 등록된 디스플레이 정보
   */
  register(data: DisplayRegisterRequest): Promise<Display>;

  /**
   * screenId로 디스플레이를 조회합니다
   *
   * @param screenId - 화면 ID
   * @returns 디스플레이 정보 또는 null (없으면)
   */
  findByScreenId(screenId: string): Promise<Display | null>;

  /**
   * deviceId로 디스플레이를 조회합니다
   *
   * @param deviceId - 디바이스 ID
   * @returns 디스플레이 정보 또는 null (없으면)
   */
  findByDeviceId(deviceId: string): Promise<Display | null>;

  /**
   * 디스플레이 목록을 조회합니다
   *
   * @param options - 조회 옵션 (lineId 필터, onlineOnly 등)
   * @returns 디스플레이 배열
   */
  list(options?: DisplayQueryOptions): Promise<Display[]>;

  /**
   * deviceId의 last_seen_at을 업데이트합니다 (heartbeat)
   *
   * @param deviceId - 디바이스 ID
   * @returns 업데이트 성공 여부
   */
  updateLastSeen(deviceId: string): Promise<boolean>;

  /**
   * 60초 이상 미갱신된 디스플레이를 offline으로 전환합니다
   *
   * @returns 업데이트된 디스플레이 수
   */
  markStaleAsOffline(): Promise<number>;
}
