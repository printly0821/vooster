/**
 * 디스플레이 관리 서비스
 *
 * 디스플레이 등록, 조회, 상태 관리 비즈니스 로직을 처리합니다
 */

import { Display, DisplayRegisterRequest, DisplayQueryOptions, DisplaySummary } from '../types/display';
import { IDisplayRepository } from './repositories/displayRepository';
import { MemoryDisplayRepository } from './repositories/memory';
import { logger } from '../utils/logger';

/**
 * 디스플레이 서비스 클래스
 */
class DisplayService {
  /**
   * 저장소 인스턴스 (기본: 메모리)
   */
  private repository: IDisplayRepository;

  constructor(repository?: IDisplayRepository) {
    this.repository = repository || new MemoryDisplayRepository();
  }

  /**
   * 저장소를 설정합니다 (테스트용)
   *
   * @param repository - 저장소 구현체
   */
  setRepository(repository: IDisplayRepository): void {
    this.repository = repository;
  }

  /**
   * 디스플레이를 등록하거나 업데이트합니다
   *
   * @param data - 등록 요청 데이터
   * @returns 등록된 디스플레이 정보
   */
  async register(data: DisplayRegisterRequest): Promise<Display> {
    try {
      const display = await this.repository.register(data);
      return display;
    } catch (error) {
      logger.error('디스플레이 등록 실패: deviceId=%s, error=%s', data.deviceId, (error as Error).message);
      throw error;
    }
  }

  /**
   * 디스플레이 목록을 조회합니다
   *
   * @param options - 조회 옵션
   * @returns 디스플레이 요약 정보 배열
   */
  async list(options?: DisplayQueryOptions): Promise<DisplaySummary[]> {
    try {
      const displays = await this.repository.list(options);

      // Display를 DisplaySummary로 변환
      return displays.map((d) => ({
        screenId: d.screenId,
        name: d.name,
        purpose: d.purpose,
        online: d.status === 'online',
        lastSeen: d.lastSeenAt,
      }));
    } catch (error) {
      logger.error('디스플레이 목록 조회 실패: error=%s', (error as Error).message);
      throw error;
    }
  }

  /**
   * screenId로 디스플레이를 조회합니다
   *
   * @param screenId - 화면 ID
   * @returns 디스플레이 정보 또는 null
   */
  async findByScreenId(screenId: string): Promise<Display | null> {
    return await this.repository.findByScreenId(screenId);
  }

  /**
   * deviceId의 heartbeat를 업데이트합니다
   *
   * @param deviceId - 디바이스 ID
   * @returns 업데이트 성공 여부
   */
  async heartbeat(deviceId: string): Promise<boolean> {
    return await this.repository.updateLastSeen(deviceId);
  }

  /**
   * 60초 이상 미갱신된 디스플레이를 offline으로 전환합니다
   *
   * @returns 업데이트된 디스플레이 수
   */
  async markStaleAsOffline(): Promise<number> {
    return await this.repository.markStaleAsOffline();
  }
}

/**
 * 싱글톤 인스턴스
 */
export const displayService = new DisplayService();
