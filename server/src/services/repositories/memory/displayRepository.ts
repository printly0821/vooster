/**
 * 메모리 기반 디스플레이 저장소
 *
 * 개발/테스트 환경에서 사용되는 인메모리 디스플레이 저장소입니다
 * 서버 재시작 시 데이터가 손실됩니다
 */

import { Display, DisplayRegisterRequest, DisplayQueryOptions } from '../../../types/display';
import { IDisplayRepository } from '../displayRepository';
import { logger } from '../../../utils/logger';

/**
 * 메모리 기반 디스플레이 저장소 구현
 */
export class MemoryDisplayRepository implements IDisplayRepository {
  /**
   * deviceId를 키로 하는 디스플레이 맵
   */
  private displays: Map<string, Display> = new Map();

  /**
   * screenId를 키로 하는 디스플레이 맵 (빠른 조회용)
   */
  private screenIdIndex: Map<string, string> = new Map(); // screenId -> deviceId

  /**
   * 디스플레이를 등록하거나 업데이트합니다
   */
  async register(data: DisplayRegisterRequest): Promise<Display> {
    const { deviceId, name, purpose, orgId, lineId } = data;
    const screenId = `screen:${orgId}:${lineId}`;
    const now = new Date();

    // 기존 디스플레이 확인
    const existing = this.displays.get(deviceId);

    if (existing) {
      // 업데이트
      existing.name = name;
      existing.purpose = purpose;
      existing.orgId = orgId;
      existing.lineId = lineId;
      existing.screenId = screenId;
      existing.lastSeenAt = now;
      existing.status = 'online';
      existing.updatedAt = now;

      logger.info('디스플레이 업데이트: deviceId=%s, screenId=%s', deviceId, screenId);
      return existing;
    }

    // 신규 등록
    const display: Display = {
      deviceId,
      screenId,
      name,
      purpose,
      orgId,
      lineId,
      lastSeenAt: now,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    };

    this.displays.set(deviceId, display);
    this.screenIdIndex.set(screenId, deviceId);

    logger.info('디스플레이 등록: deviceId=%s, screenId=%s, name=%s', deviceId, screenId, name);
    return display;
  }

  /**
   * screenId로 디스플레이를 조회합니다
   */
  async findByScreenId(screenId: string): Promise<Display | null> {
    const deviceId = this.screenIdIndex.get(screenId);
    if (!deviceId) return null;

    return this.displays.get(deviceId) || null;
  }

  /**
   * deviceId로 디스플레이를 조회합니다
   */
  async findByDeviceId(deviceId: string): Promise<Display | null> {
    return this.displays.get(deviceId) || null;
  }

  /**
   * 디스플레이 목록을 조회합니다
   */
  async list(options?: DisplayQueryOptions): Promise<Display[]> {
    const { lineId, onlineOnly = true } = options || {};

    let results = Array.from(this.displays.values());

    // lineId 필터링
    if (lineId) {
      results = results.filter((d) => d.lineId === lineId);
    }

    // 온라인만 필터링
    if (onlineOnly) {
      results = results.filter((d) => d.status === 'online');
    }

    return results;
  }

  /**
   * deviceId의 last_seen_at을 업데이트합니다 (heartbeat)
   */
  async updateLastSeen(deviceId: string): Promise<boolean> {
    const display = this.displays.get(deviceId);
    if (!display) return false;

    display.lastSeenAt = new Date();
    display.status = 'online';
    display.updatedAt = new Date();

    logger.debug('heartbeat 업데이트: deviceId=%s, screenId=%s', deviceId, display.screenId);
    return true;
  }

  /**
   * 60초 이상 미갱신된 디스플레이를 offline으로 전환합니다
   */
  async markStaleAsOffline(): Promise<number> {
    const now = Date.now();
    const staleThreshold = 60 * 1000; // 60초
    let count = 0;

    for (const display of this.displays.values()) {
      if (display.status === 'online') {
        const timeSinceLastSeen = now - display.lastSeenAt.getTime();

        if (timeSinceLastSeen > staleThreshold) {
          display.status = 'offline';
          display.updatedAt = new Date();
          count++;

          logger.info('디스플레이 오프라인 전환: deviceId=%s, screenId=%s, lastSeen=%s', display.deviceId, display.screenId, display.lastSeenAt.toISOString());
        }
      }
    }

    return count;
  }
}
