/**
 * 중복 작업 제거 유틸리티
 *
 * T-017 원격 탭 제어에서 중복된 navigate 메시지를 방지합니다.
 * 5분 내에 동일한 jobNo로 들어오는 중복 요청을 감지하여 무시합니다.
 *
 * 주요 기능:
 * - 작업 ID 기반 중복 검출
 * - 자동 만료 시간 관리
 * - 메모리 안전한 Map 자료구조
 */

/**
 * 중복 작업 항목
 *
 * 최근 처리된 작업을 추적합니다.
 */
interface DedupeEntry {
  /** 작업 추가 시간 (ms) */
  timestamp: number;
  /** 작업 만료 시간 (ms) */
  expiresAt: number;
}

/**
 * 중복 제거 매니저
 *
 * 최근 처리된 작업을 메모리에 보관하여 중복 요청을 감지합니다.
 * 일반적으로 싱글톤으로 사용되어야 합니다.
 */
export class DeduplicationManager {
  /**
   * 최근 처리된 작업 맵
   *
   * 키: jobNo
   * 값: 작업 메타데이터 (타임스탬프, 만료 시간)
   */
  private recentJobs: Map<string, DedupeEntry> = new Map();

  /**
   * 중복 제거 시간 (ms)
   *
   * 같은 jobNo가 이 시간 내에 다시 들어오면 중복으로 간주합니다.
   */
  private dedupeWindow: number;

  /**
   * 생성자
   *
   * @param dedupeWindowMs - 중복 제거 시간 (기본값: 5분)
   *
   * @example
   * const manager = new DeduplicationManager(5 * 60 * 1000); // 5분
   */
  constructor(dedupeWindowMs: number = 5 * 60 * 1000) {
    this.dedupeWindow = dedupeWindowMs;
  }

  /**
   * 작업이 중복인지 확인
   *
   * 작업이 최근에 처리되었는지 확인하고, 새로운 작업이면 등록합니다.
   *
   * @param jobNo - 작업 ID
   * @returns 중복 여부 (true = 중복, false = 신규)
   *
   * @example
   * if (manager.isDuplicate('job-123')) {
   *   console.log('중복된 요청입니다');
   *   return;
   * }
   * // 작업 처리...
   */
  public isDuplicate(jobNo: string): boolean {
    const now = Date.now();

    // 만료된 항목 제거
    this.cleanupExpiredEntries(now);

    // 현재 jobNo가 존재하는지 확인
    const existingEntry = this.recentJobs.get(jobNo);

    if (existingEntry && now < existingEntry.expiresAt) {
      // 유효한 중복 항목 발견
      console.log(`[Dedupe] 중복된 jobNo 감지: ${jobNo}`);
      return true;
    }

    // 새로운 작업으로 등록
    const expiresAt = now + this.dedupeWindow;
    this.recentJobs.set(jobNo, {
      timestamp: now,
      expiresAt,
    });

    return false;
  }

  /**
   * 작업 수동 등록
   *
   * isDuplicate() 외부에서 작업을 명시적으로 등록합니다.
   *
   * @param jobNo - 작업 ID
   *
   * @example
   * manager.register('job-123');
   */
  public register(jobNo: string): void {
    const now = Date.now();
    const expiresAt = now + this.dedupeWindow;

    this.recentJobs.set(jobNo, {
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * 특정 작업 제거
   *
   * 수동으로 작업 항목을 제거합니다.
   *
   * @param jobNo - 제거할 작업 ID
   *
   * @example
   * manager.remove('job-123');
   */
  public remove(jobNo: string): void {
    this.recentJobs.delete(jobNo);
  }

  /**
   * 모든 작업 초기화
   *
   * 저장된 모든 작업 항목을 제거합니다.
   *
   * @example
   * manager.clear();
   */
  public clear(): void {
    this.recentJobs.clear();
  }

  /**
   * 만료된 항목 자동 정리
   *
   * 정기적으로 호출되어 만료된 항목을 제거합니다.
   * isDuplicate() 호출 시 자동으로 실행됩니다.
   *
   * @param now - 현재 시간 (ms), 기본값은 Date.now()
   * @returns 정리된 항목 수
   *
   * @private
   */
  private cleanupExpiredEntries(now: number = Date.now()): number {
    let cleaned = 0;

    // 만료된 항목 찾기
    const expiredKeys: string[] = [];
    for (const [jobNo, entry] of this.recentJobs.entries()) {
      if (now >= entry.expiresAt) {
        expiredKeys.push(jobNo);
      }
    }

    // 만료된 항목 제거
    for (const jobNo of expiredKeys) {
      this.recentJobs.delete(jobNo);
      cleaned++;
    }

    // 주기적으로 로깅 (성능상 문제가 없으면)
    if (cleaned > 0 && cleaned % 10 === 0) {
      console.debug(`[Dedupe] ${cleaned}개의 만료된 항목 정리 (총 ${this.recentJobs.size}개 유지 중)`);
    }

    return cleaned;
  }

  /**
   * 현재 등록된 작업 수
   *
   * @returns 메모리에 보관 중인 작업 수
   *
   * @example
   * console.log('등록된 작업:', manager.size());
   */
  public size(): number {
    return this.recentJobs.size;
  }

  /**
   * 전체 상태 조회 (디버깅용)
   *
   * @returns 모든 등록된 작업 정보
   *
   * @private
   */
  public debug(): Record<string, DedupeEntry> {
    const result: Record<string, DedupeEntry> = {};
    for (const [jobNo, entry] of this.recentJobs.entries()) {
      result[jobNo] = entry;
    }
    return result;
  }
}

/**
 * 싱글톤 인스턴스
 *
 * 애플리케이션 전역에서 공유하는 중복 제거 매니저입니다.
 */
let globalDedupeManager: DeduplicationManager | null = null;

/**
 * 글로벌 중복 제거 매니저 인스턴스 조회
 *
 * 첫 호출 시 새 인스턴스를 생성하고, 이후 호출에서는 같은 인스턴스를 반환합니다.
 *
 * @param dedupeWindowMs - 중복 제거 시간 (ms), 첫 초기화 시만 적용
 * @returns 싱글톤 매니저 인스턴스
 *
 * @example
 * // Service Worker에서 전역 사용
 * const manager = getGlobalDedupeManager();
 * if (!manager.isDuplicate(jobNo)) {
 *   // 작업 처리...
 * }
 */
export function getGlobalDedupeManager(dedupeWindowMs?: number): DeduplicationManager {
  if (!globalDedupeManager) {
    globalDedupeManager = new DeduplicationManager(dedupeWindowMs);
  }
  return globalDedupeManager;
}

/**
 * 글로벌 매니저 초기화 (테스트용)
 *
 * @private
 */
export function resetGlobalDedupeManager(): void {
  globalDedupeManager = null;
}
