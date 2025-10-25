/**
 * 원격 디스플레이 타입 정의
 *
 * 스마트폰 앱에서 원격 PC 디스플레이를 관리하기 위한 타입 시스템
 */

/**
 * 디스플레이 온라인 상태
 */
export type DisplayStatus = 'online' | 'offline' | 'connecting';

/**
 * 디스플레이 정보
 */
export interface Display {
  /** 디스플레이 고유 ID (예: screen:org-123:cutting-line-a) */
  screenId: string;

  /** 디스플레이 이름 (예: 커팅기 A3) */
  name: string;

  /** 용도 설명 (예: 커팅라인) */
  purpose: string;

  /** 온라인 상태 */
  online: boolean;

  /** 상태 문자열 */
  status: DisplayStatus;

  /** 마지막 동기화 시간 (ISO 8601) */
  lastSeen: string;

  /** 조직 ID */
  orgId?: string;

  /** 라인 ID */
  lineId?: string;
}

/**
 * 디스플레이 필터 옵션
 */
export interface DisplayFilterOptions {
  /** 라인 ID로 필터링 */
  lineId?: string;

  /** 온라인 디스플레이만 표시 */
  onlineOnly?: boolean;

  /** 검색어 (이름 기준) */
  searchQuery?: string;
}

/**
 * 디스플레이 목록 정렬 옵션
 */
export type DisplaySortBy = 'name' | 'lastSeen' | 'status';

/**
 * 정렬 방향
 */
export type SortOrder = 'asc' | 'desc';
