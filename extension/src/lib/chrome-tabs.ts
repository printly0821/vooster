/**
 * Chrome tabs API 래퍼
 *
 * Chrome tabs API를 타입 안전한 방식으로 사용하는
 * 헬퍼 함수들을 제공합니다. 에러 처리와 기본값 관리를 포함합니다.
 *
 * 주요 기능:
 * - 타입 안전한 탭 검색
 * - 안전한 탭 업데이트/생성
 * - URL 정규화 및 비교
 * - 에러 처리 및 로깅
 */

import type {
  TabQuery,
  TabUpdateOptions,
  TabCreateOptions,
  TabInfo,
  TabSearchResult,
  TabUpdateResult,
  TabCreateResult,
  TabFocusResult,
  URLNormalizationOptions,
  URLMatchScore,
} from '../types/tabs.js';
import { DEFAULT_URL_NORMALIZATION } from '../types/tabs.js';

/**
 * 탭 검색 (Chrome tabs.query 래퍼)
 *
 * 지정한 조건에 맞는 탭을 검색합니다.
 *
 * @param query - 탭 검색 조건
 * @returns 검색된 탭 목록
 * @throws 탭 API 호출 실패 시 에러 로깅
 *
 * @example
 * // 모든 탭 검색
 * const tabs = await queryTabs({});
 *
 * // 특정 URL의 탭 검색
 * const tabs = await queryTabs({ url: 'https://example.com' });
 */
export async function queryTabs(query: TabQuery): Promise<TabInfo[]> {
  try {
    const tabs = await chrome.tabs.query(query);
    return tabs.map((tab) => ({
      id: tab.id,
      index: tab.index,
      windowId: tab.windowId,
      title: tab.title,
      url: tab.url,
      active: tab.active,
      selected: tab.highlighted,
      status: tab.status as 'loading' | 'complete' | undefined,
      favIconUrl: tab.favIconUrl,
      discarded: tab.discarded,
      pinned: tab.pinned,
      muted: tab.mutedInfo?.muted,
      groupId: tab.groupId,
    }));
  } catch (error) {
    console.error('[Chrome Tabs] Query failed:', error);
    throw new Error(`탭 검색 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 탭 업데이트 (Chrome tabs.update 래퍼)
 *
 * 특정 탭의 정보를 업데이트합니다.
 *
 * @param tabId - 업데이트할 탭 ID
 * @param updateProperties - 업데이트할 속성
 * @returns 업데이트 결과
 *
 * @example
 * // 탭을 특정 URL로 이동
 * const result = await updateTab(123, { url: 'https://example.com' });
 *
 * // 탭 활성화
 * const result = await updateTab(123, { active: true });
 */
export async function updateTab(tabId: number, updateProperties: TabUpdateOptions): Promise<TabUpdateResult> {
  try {
    const tab = await chrome.tabs.update(tabId, updateProperties);

    // Chrome tabs.update 반환값을 TabInfo로 변환
    const updatedTab: TabInfo = {
      id: tab.id,
      index: tab.index,
      windowId: tab.windowId,
      title: tab.title,
      url: tab.url,
      active: tab.active,
      selected: tab.highlighted,
      status: tab.status as 'loading' | 'complete' | undefined,
      favIconUrl: tab.favIconUrl,
      discarded: tab.discarded,
      pinned: tab.pinned,
      muted: tab.mutedInfo?.muted,
      groupId: tab.groupId,
    };

    return {
      success: true,
      tab: updatedTab,
      tabId: tab.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Chrome Tabs] Update failed for tab ${tabId}:`, error);

    return {
      success: false,
      error: `탭 업데이트 실패: ${errorMsg}`,
      tabId,
    };
  }
}

/**
 * 탭 생성 (Chrome tabs.create 래퍼)
 *
 * 새로운 탭을 생성합니다.
 *
 * @param createProperties - 생성할 탭 속성
 * @returns 생성 결과
 *
 * @example
 * // 새 탭 생성
 * const result = await createTab({ url: 'https://example.com', active: true });
 */
export async function createTab(createProperties: TabCreateOptions): Promise<TabCreateResult> {
  try {
    const tab = await chrome.tabs.create(createProperties);

    // Chrome tabs.create 반환값을 TabInfo로 변환
    const newTab: TabInfo = {
      id: tab.id,
      index: tab.index,
      windowId: tab.windowId,
      title: tab.title,
      url: tab.url,
      active: tab.active,
      selected: tab.highlighted,
      status: tab.status as 'loading' | 'complete' | undefined,
      favIconUrl: tab.favIconUrl,
      discarded: tab.discarded,
      pinned: tab.pinned,
      muted: tab.mutedInfo?.muted,
      groupId: tab.groupId,
    };

    console.log(`[Chrome Tabs] Tab created: ${tab.id} - ${tab.url}`);

    return {
      success: true,
      tab: newTab,
      tabId: tab.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Chrome Tabs] Create failed:', error);

    return {
      success: false,
      error: `탭 생성 실패: ${errorMsg}`,
    };
  }
}

/**
 * 탭 포커싱 (활성화)
 *
 * 특정 탭을 활성화하고 해당 윈도우를 포커싱합니다.
 *
 * @param tabId - 포커싱할 탭 ID
 * @returns 포커싱 결과
 *
 * @example
 * const result = await focusTab(123);
 */
export async function focusTab(tabId: number): Promise<TabFocusResult> {
  try {
    // 먼저 탭 업데이트 (활성화)
    const updateResult = await updateTab(tabId, { active: true });

    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error,
      };
    }

    // 윈도우 포커싱
    if (updateResult.tab) {
      try {
        await chrome.windows.update(updateResult.tab.windowId, { focused: true });
      } catch (winError) {
        console.warn('[Chrome Tabs] Window focus failed:', winError);
        // 윈도우 포커싱 실패는 무시하고 계속 진행
      }
    }

    console.log(`[Chrome Tabs] Tab focused: ${tabId}`);

    return {
      success: true,
      tab: updateResult.tab,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Chrome Tabs] Focus failed for tab ${tabId}:`, error);

    return {
      success: false,
      error: `탭 포커싱 실패: ${errorMsg}`,
    };
  }
}

/**
 * URL 정규화
 *
 * URL을 비교 가능한 형식으로 정규화합니다.
 *
 * @param url - 정규화할 URL
 * @param options - 정규화 옵션
 * @returns 정규화된 URL
 *
 * @example
 * const normalized = normalizeUrl('https://example.com/path/', { ignoreTrailingSlash: true });
 */
export function normalizeUrl(url: string, options: URLNormalizationOptions = DEFAULT_URL_NORMALIZATION): string {
  try {
    const urlObj = new URL(url);

    // 프로토콜 정규화
    if (options.normalizeProtocol && (urlObj.protocol === 'http:' || urlObj.protocol === 'https:')) {
      // http와 https를 동일하게 취급 (https로 통일)
      urlObj.protocol = 'https:';
    }

    // 프래그먼트 제거
    if (options.ignoreFragment) {
      urlObj.hash = '';
    }

    // 쿼리 파라미터 제거
    if (options.ignoreQueryParams) {
      urlObj.search = '';
    }

    // 트레일링 슬래시 제거
    if (options.ignoreTrailingSlash && urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    let normalized = urlObj.toString();

    // 소문자 변환
    if (options.lowercase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  } catch (error) {
    // 잘못된 URL 형식의 경우 원본 반환
    console.warn('[Chrome Tabs] URL normalization failed:', url, error);
    return url;
  }
}

/**
 * URL 유사도 계산
 *
 * 두 URL의 유사도를 점수로 계산합니다.
 *
 * @param url1 - 첫 번째 URL
 * @param url2 - 두 번째 URL
 * @param options - 정규화 옵션
 * @returns 유사도 점수
 *
 * @example
 * const score = calculateUrlSimilarity('https://example.com', 'https://example.com/');
 */
export function calculateUrlSimilarity(
  url1: string,
  url2: string,
  options: URLNormalizationOptions = DEFAULT_URL_NORMALIZATION
): URLMatchScore {
  const normalized1 = normalizeUrl(url1, options);
  const normalized2 = normalizeUrl(url2, options);

  // 정확한 일치
  if (normalized1 === normalized2) {
    return {
      isExactMatch: true,
      score: 100,
      reason: '정확한 일치',
    };
  }

  // 호스트와 패스만 비교 (쿼리 무시)
  try {
    const obj1 = new URL(normalized1);
    const obj2 = new URL(normalized2);

    const host1 = obj1.host.toLowerCase();
    const host2 = obj2.host.toLowerCase();
    const path1 = obj1.pathname.toLowerCase();
    const path2 = obj2.pathname.toLowerCase();

    // 호스트 + 패스 일치
    if (host1 === host2 && path1 === path2) {
      return {
        isExactMatch: false,
        score: 95,
        reason: '호스트와 경로 일치 (쿼리 다름)',
      };
    }

    // 호스트만 일치
    if (host1 === host2) {
      return {
        isExactMatch: false,
        score: 70,
        reason: '호스트 일치 (경로 다름)',
      };
    }

    // 유사도 없음
    return {
      isExactMatch: false,
      score: 0,
      reason: 'URL 불일치',
    };
  } catch (error) {
    console.warn('[Chrome Tabs] URL similarity calculation failed:', error);

    return {
      isExactMatch: false,
      score: 0,
      reason: 'URL 파싱 실패',
    };
  }
}

/**
 * URL 기반 탭 검색
 *
 * 주어진 URL과 일치하는 탭을 검색합니다.
 * 정확한 일치부터 부분 일치까지 순위를 매깁니다.
 *
 * @param targetUrl - 검색할 URL
 * @param options - 정규화 옵션
 * @returns 검색 결과
 *
 * @example
 * const result = await searchTabByUrl('https://example.com/page');
 */
export async function searchTabByUrl(
  targetUrl: string,
  options: URLNormalizationOptions = DEFAULT_URL_NORMALIZATION
): Promise<TabSearchResult> {
  try {
    // 모든 탭 조회
    const tabs = await queryTabs({});

    const exactMatches: TabInfo[] = [];
    const partialMatches: { tab: TabInfo; score: number }[] = [];

    // 각 탭과 비교
    for (const tab of tabs) {
      if (!tab.url) {
        continue;
      }

      const similarity = calculateUrlSimilarity(targetUrl, tab.url, options);

      if (similarity.isExactMatch) {
        exactMatches.push(tab);
      } else if (similarity.score > 0) {
        partialMatches.push({ tab, score: similarity.score });
      }
    }

    // 부분 일치는 점수순으로 정렬
    partialMatches.sort((a, b) => b.score - a.score);

    return {
      tabs: [...exactMatches, ...partialMatches.map((m) => m.tab)],
      exactMatch: exactMatches[0],
      partialMatches: partialMatches.map((m) => m.tab),
    };
  } catch (error) {
    console.error('[Chrome Tabs] URL search failed:', error);

    return {
      tabs: [],
      partialMatches: [],
    };
  }
}

/**
 * 현재 윈도우의 모든 탭 조회
 *
 * @returns 현재 윈도우의 탭 목록
 *
 * @example
 * const tabs = await getCurrentWindowTabs();
 */
export async function getCurrentWindowTabs(): Promise<TabInfo[]> {
  return await queryTabs({ currentWindow: true });
}

/**
 * 특정 윈도우의 모든 탭 조회
 *
 * @param windowId - 윈도우 ID
 * @returns 윈도우의 탭 목록
 *
 * @example
 * const tabs = await getWindowTabs(123);
 */
export async function getWindowTabs(windowId: number): Promise<TabInfo[]> {
  return await queryTabs({ windowId });
}

/**
 * 현재 활성화된 탭 조회
 *
 * @returns 활성화된 탭 정보 또는 null
 *
 * @example
 * const activeTab = await getActiveTab();
 */
export async function getActiveTab(): Promise<TabInfo | null> {
  try {
    const tabs = await queryTabs({ active: true, currentWindow: true });
    return tabs[0] || null;
  } catch (error) {
    console.error('[Chrome Tabs] Get active tab failed:', error);
    return null;
  }
}
