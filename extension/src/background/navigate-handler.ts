/**
 * Navigate 메시지 핸들러
 *
 * Socket.IO 서버로부터 받은 navigate 이벤트를 처리하여
 * 브라우저 탭을 제어합니다.
 *
 * 처리 순서:
 * 1. 메시지 만료 여부 확인 (exp)
 * 2. 중복 메시지 검감 (jobNo, 5분 윈도우)
 * 3. 기존 탭 검색 (정확한 URL 매칭)
 * 4. 탭 업데이트 또는 새 탭 생성
 * 5. 탭 포커싱
 * 6. ACK 전송
 */

import type { NavigateMessage, SocketMessage } from '../types/socket.js';
import { isSocketMessage } from '../types/socket.js';
import { getGlobalSocketClient } from './socket-client.js';
import { getGlobalDedupeManager } from '../lib/dedupe.js';
import { searchTabByUrl, updateTab, createTab, focusTab } from '../lib/chrome-tabs.js';
import { addLog } from '../utils/storage.js';

/**
 * Navigate 메시지를 처리합니다
 *
 * @param message - Socket.IO 메시지
 * @throws {Error} 메시지 처리 실패 시
 *
 * @example
 * socket.on('navigate', (message) => {
 *   await handleNavigate(message);
 * });
 */
export async function handleNavigate(message: unknown): Promise<void> {
  try {
    // 1. 메시지 타입 검증
    if (!isSocketMessage(message, 'navigate')) {
      console.warn('[NavigateHandler] 잘못된 navigate 메시지');
      return;
    }

    const navigateMsg = message as NavigateMessage;
    const { payload, txId } = navigateMsg;

    console.log('[NavigateHandler] Navigate 처리 시작:', {
      url: payload.url,
      jobNo: payload.jobNo,
      txId,
    });

    // 2. 메시지 유효기한 확인
    if (!isMessageValid(payload.exp)) {
      console.warn('[NavigateHandler] 메시지 기한 만료:', payload.jobNo);

      // ACK 전송 (실패)
      const client = getGlobalSocketClient();
      if (txId) {
        await client.sendAck(txId, 'failed');
      }

      // 로그 기록
      await addLog({
        level: 'warn',
        message: `메시지 기한 만료: ${payload.jobNo}`,
        source: 'NavigateHandler',
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // 3. 중복 메시지 확인
    const dedupeManager = getGlobalDedupeManager();
    if (dedupeManager.isDuplicate(payload.jobNo)) {
      console.log('[NavigateHandler] 중복 메시지 감지:', payload.jobNo);

      // 중복이지만 ACK는 전송 (멱등성)
      const client = getGlobalSocketClient();
      if (txId) {
        await client.sendAck(txId, 'success');
      }

      // 로그 기록
      await addLog({
        level: 'info',
        message: `중복 메시지 스킵: ${payload.jobNo}`,
        source: 'NavigateHandler',
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // 4. 기존 탭 검색 (URL 정확한 일치 우선)
    const searchResult = await searchTabByUrl(payload.url);
    let targetTabId: number | undefined;
    let isNewTab = false;

    if (searchResult.exactMatch && searchResult.exactMatch.id) {
      // 정확한 일치 탭 존재 → 업데이트
      console.log('[NavigateHandler] 정확한 일치 탭 감지:', searchResult.exactMatch.id);

      targetTabId = searchResult.exactMatch.id;
      const updateResult = await updateTab(targetTabId, { url: payload.url, active: true });

      if (!updateResult.success) {
        throw new Error(`탭 업데이트 실패: ${updateResult.error}`);
      }

      targetTabId = updateResult.tabId;
    } else if (searchResult.partialMatches.length > 0) {
      // 부분 일치 탭 존재 → 업데이트 (첫 번째 매치)
      const firstMatch = searchResult.partialMatches[0];

      if (firstMatch.id) {
        console.log('[NavigateHandler] 부분 일치 탭 감지:', firstMatch.id);

        targetTabId = firstMatch.id;
        const updateResult = await updateTab(targetTabId, { url: payload.url, active: true });

        if (!updateResult.success) {
          throw new Error(`탭 업데이트 실패: ${updateResult.error}`);
        }

        targetTabId = updateResult.tabId;
      }
    } else {
      // 탭 없음 → 새로 생성
      console.log('[NavigateHandler] 새 탭 생성');

      const createResult = await createTab({
        url: payload.url,
        active: true,
      });

      if (!createResult.success) {
        throw new Error(`탭 생성 실패: ${createResult.error}`);
      }

      targetTabId = createResult.tabId;
      isNewTab = true;
    }

    // 5. 탭 활성화 (포커싱)
    if (targetTabId) {
      const focusResult = await focusTab(targetTabId);

      if (!focusResult.success) {
        console.warn('[NavigateHandler] 탭 포커싱 실패:', focusResult.error);
        // 포커싱 실패는 치명적이지 않으므로 계속 진행
      }
    }

    // 6. ACK 전송 (성공)
    const client = getGlobalSocketClient();
    if (txId) {
      await client.sendAck(txId, 'success', targetTabId);
    }

    // 로그 기록
    await addLog({
      level: 'info',
      message: `Navigate 처리 완료: ${payload.url}`,
      data: {
        jobNo: payload.jobNo,
        tabId: targetTabId,
        isNewTab,
      },
      source: 'NavigateHandler',
      timestamp: new Date().toISOString(),
    });

    console.log('[NavigateHandler] Navigate 처리 완료:', {
      url: payload.url,
      jobNo: payload.jobNo,
      tabId: targetTabId,
      isNewTab,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[NavigateHandler] 오류:', error);

    // ACK 전송 (실패)
    const navigateMsg = message as NavigateMessage | undefined;
    const txId = navigateMsg?.txId;
    if (txId) {
      const client = getGlobalSocketClient();
      await client.sendAck(txId, 'failed');
    }

    // 로그 기록
    await addLog({
      level: 'error',
      message: `Navigate 처리 오류: ${errorMsg}`,
      data: {
        originalError: error instanceof Error ? error.message : String(error),
      },
      source: 'NavigateHandler',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 메시지의 유효기한 확인
 *
 * @param expTimestamp - 메시지 유효기한 (Unix timestamp, ms)
 * @returns 유효하면 true, 기한 만료면 false
 *
 * @private
 */
function isMessageValid(expTimestamp: number): boolean {
  const now = Date.now();
  const isValid = now < expTimestamp;

  if (!isValid) {
    console.warn('[NavigateHandler] 메시지 기한 만료:', {
      now,
      exp: expTimestamp,
      diff: now - expTimestamp,
    });
  }

  return isValid;
}

/**
 * Socket.IO 메시지 핸들러 등록
 *
 * Service Worker 내에서 호출하여 navigate 이벤트를 처리합니다.
 *
 * @example
 * // service-worker.ts
 * import { registerNavigateHandler } from './navigate-handler.js';
 *
 * await registerNavigateHandler();
 */
export function registerNavigateHandler(): void {
  const client = getGlobalSocketClient();
  const socket = client.getSocket();

  if (!socket) {
    console.error('[NavigateHandler] Socket.IO 소켓이 초기화되지 않았습니다');
    return;
  }

  // navigate 이벤트 핸들러 등록
  socket.on('navigate', async (message: SocketMessage) => {
    await handleNavigate(message);
  });

  console.log('[NavigateHandler] Navigate 핸들러 등록 완료');
}
