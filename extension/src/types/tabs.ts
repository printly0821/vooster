/**
 * 탭 관리 타입 정의
 *
 * Chrome tabs API 작업과 원격 탭 제어를 타입 안전하게 관리합니다.
 */

/**
 * 탭 검색 옵션
 *
 * Chrome tabs API와 호환되는 탭 검색 조건입니다.
 */
export interface TabQuery {
  /** 활성 탭만 조회 */
  active?: boolean;
  /** 현재 윈도우 내 탭만 조회 */
  currentWindow?: boolean;
  /** 윈도우 ID로 필터링 */
  windowId?: number;
  /** 탭 URL로 필터링 */
  url?: string | string[];
  /** 탭 제목으로 필터링 */
  title?: string;
  /** 상태로 필터링 (loading, complete) */
  status?: 'loading' | 'complete';
  /** 윈도우 타입 필터링 */
  windowType?: 'normal' | 'popup' | 'panel' | 'app';
  /** 핀으로 고정된 탭만 */
  pinned?: boolean;
  /** 음소거된 탭만 */
  muted?: boolean;
}

/**
 * 탭 업데이트 옵션
 *
 * Chrome tabs.update() 호출 시 사용되는 옵션입니다.
 */
export interface TabUpdateOptions {
  /** 탭 활성화 여부 */
  active?: boolean;
  /** 새 URL로 이동 */
  url?: string;
  /** 페이지 강제 새로고침 */
  autoDiscardable?: boolean;
  /** 탭 음소거 상태 변경 */
  muted?: boolean;
  /** 탭 핀 상태 변경 */
  pinned?: boolean;
  /** 윈도우 간 탭 이동 */
  windowId?: number;
  /** 탭 인덱스 변경 */
  index?: number;
  /** 오프스크린 탭으로 추가 (MV3) */
  loadReplace?: boolean;
}

/**
 * 탭 생성 옵션
 *
 * Chrome tabs.create() 호출 시 사용되는 옵션입니다.
 */
export interface TabCreateOptions {
  /** 새 탭 URL */
  url?: string;
  /** 활성 탭 여부 */
  active?: boolean;
  /** 현재 탭 다음에 생성 */
  index?: number;
  /** 특정 윈도우에 생성 */
  windowId?: number;
  /** 오프스크린 탭으로 생성 (MV3) */
  selected?: boolean;
  /** 백그라운드에서 생성 */
  openerTabId?: number;
}

/**
 * 탭 정보
 *
 * Chrome tabs API에서 반환하는 탭 정보의 부분 집합입니다.
 */
export interface TabInfo {
  /** 탭 ID (탭이 활성 상태인 동안에만 유효) */
  id?: number;
  /** 탭 인덱스 */
  index: number;
  /** 윈도우 ID */
  windowId: number;
  /** 탭 제목 */
  title?: string;
  /** 탭 URL */
  url?: string;
  /** 윈도우 내 활성 탭 여부 */
  active: boolean;
  /** 현재 탭 여부 */
  selected: boolean;
  /** 탭 로드 상태 */
  status?: 'loading' | 'complete';
  /** 탭 아이콘 URL */
  favIconUrl?: string;
  /** 오프스크린 탭 여부 */
  discarded?: boolean;
  /** 핀으로 고정됨 */
  pinned: boolean;
  /** 음소거됨 */
  muted?: boolean;
  /** 그룹 ID */
  groupId?: number;
}

/**
 * 탭 검색 결과
 */
export interface TabSearchResult {
  /** 검색된 탭 목록 */
  tabs: TabInfo[];
  /** 정확한 일치 탭 */
  exactMatch?: TabInfo;
  /** 부분 일치 탭 */
  partialMatches: TabInfo[];
}

/**
 * 탭 업데이트 결과
 */
export interface TabUpdateResult {
  /** 성공 여부 */
  success: boolean;
  /** 업데이트된 탭 정보 */
  tab?: TabInfo;
  /** 에러 메시지 */
  error?: string;
  /** 탭 ID */
  tabId?: number;
}

/**
 * 탭 생성 결과
 */
export interface TabCreateResult {
  /** 성공 여부 */
  success: boolean;
  /** 생성된 탭 정보 */
  tab?: TabInfo;
  /** 에러 메시지 */
  error?: string;
  /** 새 탭 ID */
  tabId?: number;
}

/**
 * 탭 포커싱 결과
 */
export interface TabFocusResult {
  /** 성공 여부 */
  success: boolean;
  /** 포커싱된 탭 정보 */
  tab?: TabInfo;
  /** 에러 메시지 */
  error?: string;
}

/**
 * URL 정규화 옵션
 *
 * 탭 URL 비교 시 사용되는 옵션입니다.
 */
export interface URLNormalizationOptions {
  /** 프로토콜 정규화 (http/https 동일 취급) */
  normalizeProtocol?: boolean;
  /** 쿼리 파라미터 무시 */
  ignoreQueryParams?: boolean;
  /** 프래그먼트 무시 */
  ignoreFragment?: boolean;
  /** 트레일링 슬래시 무시 */
  ignoreTrailingSlash?: boolean;
  /** 소문자 변환 */
  lowercase?: boolean;
}

/**
 * 기본 URL 정규화 옵션
 */
export const DEFAULT_URL_NORMALIZATION: URLNormalizationOptions = {
  normalizeProtocol: true,
  ignoreQueryParams: false,
  ignoreFragment: true,
  ignoreTrailingSlash: true,
  lowercase: true,
};

/**
 * 탭 일치 점수
 *
 * 탭 검색 시 URL 유사도를 판단합니다.
 */
export interface URLMatchScore {
  /** 정확한 일치 여부 */
  isExactMatch: boolean;
  /** 유사도 점수 (0-100) */
  score: number;
  /** 일치 이유 */
  reason: string;
}
