/**
 * Service Worker 백그라운드 스크립트
 *
 * 확장 프로그램의 생명주기 이벤트, 메시지 통신, WebSocket 연결 관리 등
 * 주요 기능을 담당합니다. Manifest V3 기반 Service Worker로 작동합니다.
 *
 * 주요 역할:
 * - 확장 설치/업데이트 이벤트 처리
 * - Content Script와 Popup 간 메시지 중계
 * - Chrome Storage API를 통한 설정 관리
 * - WebSocket 연결 상태 관리 (T-017)
 */

import {
  getConfig,
  setConfig,
  initializeStorage,
  updateRuntimeState,
  addLog,
} from '../utils/storage.js';
import type { RuntimeMessage } from '../types/events.js';
import { isMessageType } from '../types/events.js';
import type { UserSettings } from '../types/storage.js';
import { getGlobalSocketClient } from './socket-client.js';
import { registerNavigateHandler } from './navigate-handler.js';

// ============================================================================
// WebSocket 연결 관리 (T-017)
// ============================================================================

/**
 * WebSocket 연결 함수
 *
 * 저장된 페어링 정보를 사용하여 Socket.IO 서버에 연결합니다.
 * 페어링되지 않았으면 연결을 시도하지 않습니다.
 *
 * @throws {Error} 연결 실패 시
 *
 * @example
 * await connectWebSocket();
 */
async function connectWebSocket(): Promise<void> {
  try {
    // 1. 페어링 정보 확인
    const pairing = await getConfig('pairing');

    if (!pairing?.isPaired || !pairing.authToken || !pairing.displayId) {
      console.log('[ServiceWorker] 페어링되지 않음, WebSocket 연결 스킵');
      return;
    }

    // 2. 서버 URL 확인
    const serverUrl = pairing.wsServerUrl || 'http://localhost:3000';

    console.log('[ServiceWorker] WebSocket 연결 시작:', {
      serverUrl,
      displayId: pairing.displayId,
    });

    // 3. Socket.IO 클라이언트 초기화
    const client = getGlobalSocketClient(serverUrl);

    // 4. 이벤트 핸들러 등록
    const eventHandlers = {
      connected: async () => {
        console.log('[ServiceWorker] WebSocket 연결 성공');
      },
      disconnected: async () => {
        console.log('[ServiceWorker] WebSocket 연결 해제');
      },
      error: async (error: any) => {
        console.error('[ServiceWorker] WebSocket 오류:', error);
      },
    };

    // 5. Socket.IO 연결
    await client.connect(
      {
        token: pairing.authToken,
        deviceId: pairing.displayId || 'unknown',
        screenId: pairing.displayId || 'unknown',
      },
      eventHandlers
    );

    // 6. Navigate 핸들러 등록
    registerNavigateHandler();

    console.log('[ServiceWorker] WebSocket 연결 및 핸들러 등록 완료');
  } catch (error) {
    console.error('[ServiceWorker] WebSocket 연결 실패:', error);

    // 연결 실패 시에도 에러를 throw하지 않음 (조용한 실패)
    await addLog({
      level: 'warn',
      message: `WebSocket 연결 실패: ${error instanceof Error ? error.message : String(error)}`,
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// 생명주기 이벤트 핸들러
// ============================================================================

/**
 * 확장 설치/업데이트/활성화 이벤트 핸들러
 *
 * 확장이 처음 설치되거나 업데이트될 때 호출됩니다.
 * 기본 설정을 초기화하고 Options 페이지를 자동으로 엽니다.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  const reason = details.reason;
  console.log('[ServiceWorker] Installed - Reason:', reason);

  try {
    // 저장소 초기화 (기본값 설정)
    await initializeStorage(reason);

    // 첫 설치 시 Options 페이지 자동 오픈
    if (reason === 'install') {
      console.log('[ServiceWorker] Opening options page for initial setup...');

      // 짧은 지연 후 Options 페이지 오픈
      // (Storage 초기화 완료 대기)
      setTimeout(() => {
        try {
          chrome.runtime.openOptionsPage();
        } catch (error) {
          console.error('[ServiceWorker] Failed to open options page:', error);
        }
      }, 500);

      // 설치 로그 기록
      await addLog({
        level: 'info',
        message: '확장 프로그램 설치 완료',
        source: 'ServiceWorker',
        timestamp: new Date().toISOString(),
      });
    }

    // 업데이트 시 버전 확인 로그
    if (reason === 'update') {
      const installInfo = await getConfig('installInfo');
      console.log('[ServiceWorker] Updated from version:', installInfo?.version);

      await addLog({
        level: 'info',
        message: `버전 업데이트: ${installInfo?.version} → 새 버전`,
        source: 'ServiceWorker',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Installation error:', error);
    await addLog({
      level: 'error',
      message: '확장 설치 중 오류 발생',
      data: {
        reason,
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 확장 시작 이벤트 핸들러
 *
 * 브라우저 재시작 후 확장이 활성화될 때 호출됩니다.
 * WebSocket 재연결 등의 초기화 작업을 수행합니다.
 *
 * T-017: WebSocket 자동 재연결 구현
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[ServiceWorker] 브라우저 시작');

  try {
    // 런타임 상태 초기화
    await updateRuntimeState('wsConnectionStatus', 'disconnected');
    await updateRuntimeState('reconnectAttempts', 0);

    // WebSocket 재연결 시도 (T-017 구현)
    await connectWebSocket();

    console.log('[ServiceWorker] 시작 초기화 완료');
  } catch (error) {
    console.error('[ServiceWorker] 시작 오류:', error);
    await addLog({
      level: 'error',
      message: '시작 시 초기화 오류',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// 메시지 핸들러 맵 정의
// ============================================================================

/**
 * 페어링 시작 요청 처리
 *
 * Content Script가 바코드를 스캔할 때 호출됩니다.
 * 페어링 정보를 저장하고 응답을 전송합니다.
 *
 * NOTE: 실제 페어링 로직은 T-016에서 구현
 */
async function handlePairingStart(message: RuntimeMessage): Promise<void> {
  if (!isMessageType(message, 'PAIRING_START')) {
    return;
  }

  try {
    const code = message.payload.code;
    console.log('[ServiceWorker] Pairing started with code:', code);

    // 페어링 코드 검증 (T-016에서 구현)
    // const result = await validateAndPair(code);

    // 임시: 페어링 정보 저장 (실제는 서버 응답 기반)
    await setConfig('pairing', {
      isPaired: false, // 실제는 검증 결과로 설정
      displayId: undefined,
      displayName: undefined,
    });

    await addLog({
      level: 'info',
      message: `페어링 시작: ${code}`,
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ServiceWorker] Pairing error:', error);
    await addLog({
      level: 'error',
      message: '페어링 중 오류',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 페어링 취소 요청 처리
 *
 * 사용자가 기존 페어링을 제거할 때 호출됩니다.
 * 페어링 정보를 삭제하고 WebSocket 연결을 끊습니다.
 */
async function handlePairingCancel(message: RuntimeMessage): Promise<void> {
  if (!isMessageType(message, 'PAIRING_CANCEL')) {
    return;
  }

  try {
    console.log('[ServiceWorker] 페어링 취소됨');

    // 페어링 정보 삭제
    await setConfig('pairing', {
      isPaired: false,
    });

    // WebSocket 연결 종료 (T-017 구현)
    const client = getGlobalSocketClient();
    client.disconnect();

    await updateRuntimeState('wsConnectionStatus', 'disconnected');

    await addLog({
      level: 'info',
      message: '페어링 취소됨',
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ServiceWorker] 페어링 취소 오류:', error);
    await addLog({
      level: 'error',
      message: '페어링 취소 중 오류',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 설정 조회 요청 처리
 *
 * Popup이 현재 설정값을 조회할 때 호출됩니다.
 */
async function handleGetSettings(message: RuntimeMessage): Promise<unknown> {
  if (!isMessageType(message, 'GET_SETTINGS')) {
    return {};
  }

  try {
    const settings = await getConfig('settings');
    return { settings: settings || {} };
  } catch (error) {
    console.error('[ServiceWorker] Get settings error:', error);
    return { settings: {}, error: 'Failed to get settings' };
  }
}

/**
 * 설정 업데이트 요청 처리
 *
 * Popup이 설정을 변경할 때 호출됩니다.
 */
async function handleUpdateSettings(message: RuntimeMessage): Promise<void> {
  if (!isMessageType(message, 'UPDATE_SETTINGS')) {
    return;
  }

  try {
    const { key, value } = message.payload;
    console.log('[ServiceWorker] Updating setting:', key, '=', value);

    // 현재 설정 로드
    const settings = await getConfig('settings');
    if (!settings) {
      throw new Error('Settings not initialized');
    }

    // 특정 키 업데이트 (타입 안전성 유지)
    const updatedSettings = {
      ...settings,
      [key]: value,
    } as UserSettings;

    await setConfig('settings', updatedSettings);

    await addLog({
      level: 'info',
      message: `설정 변경: ${key} = ${value}`,
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ServiceWorker] Update settings error:', error);
    await addLog({
      level: 'error',
      message: '설정 변경 중 오류',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 페어링 상태 조회 요청 처리
 *
 * Popup이 페어링 상태를 확인할 때 호출됩니다.
 */
async function handleGetPairingStatus(message: RuntimeMessage): Promise<unknown> {
  if (!isMessageType(message, 'GET_PAIRING_STATUS')) {
    return {};
  }

  try {
    const pairing = await getConfig('pairing');
    return {
      isPaired: pairing?.isPaired ?? false,
      displayId: pairing?.displayId,
      displayName: pairing?.displayName,
    };
  } catch (error) {
    console.error('[ServiceWorker] Get pairing status error:', error);
    return {
      isPaired: false,
      error: 'Failed to get pairing status',
    };
  }
}

/**
 * 연결 상태 조회 요청 처리
 *
 * Popup이 WebSocket 연결 상태를 확인할 때 호출됩니다.
 */
async function handleGetConnectionStatus(message: RuntimeMessage): Promise<unknown> {
  if (!isMessageType(message, 'GET_CONNECTION_STATUS')) {
    return {};
  }

  try {
    const runtimeState = await getConfig('runtimeState');
    return {
      status: runtimeState?.wsConnectionStatus ?? 'disconnected',
    };
  } catch (error) {
    console.error('[ServiceWorker] Get connection status error:', error);
    return {
      status: 'unknown',
      error: 'Failed to get connection status',
    };
  }
}

/**
 * 재연결 요청 처리
 *
 * Popup이나 Options 페이지에서 즉시 재연결을 요청할 때 호출됩니다.
 */
async function handleReconnect(message: RuntimeMessage): Promise<void> {
  if (!isMessageType(message, 'RECONNECT')) {
    return;
  }

  try {
    console.log('[ServiceWorker] 재연결 요청됨');

    // WebSocket 재연결 시도 (T-017 구현)
    await connectWebSocket();

    await addLog({
      level: 'info',
      message: '재연결 요청 처리됨',
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ServiceWorker] 재연결 오류:', error);
    await addLog({
      level: 'error',
      message: '재연결 중 오류',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'ServiceWorker',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 로그 조회 요청 처리
 *
 * Options 페이지가 저장된 로그를 조회할 때 호출됩니다.
 */
async function handleGetLogs(message: RuntimeMessage): Promise<unknown> {
  if (!isMessageType(message, 'GET_LOGS')) {
    return { logs: [] };
  }

  try {
    const limit = message.payload?.limit ?? 50;
    const logs = await getConfig('logs');

    if (!logs) {
      return { logs: [] };
    }

    // 최신 항목부터 반환 (limit만큼)
    const recentLogs = logs.slice(-limit).map((log) => ({
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
    }));

    return { logs: recentLogs };
  } catch (error) {
    console.error('[ServiceWorker] Get logs error:', error);
    return { logs: [], error: 'Failed to get logs' };
  }
}

// ============================================================================
// 메시지 핸들러 라우터
// ============================================================================

/**
 * Runtime Message 통합 핸들러
 *
 * Content Script와 Popup에서 보낸 메시지를 받아
 * 메시지 타입별로 적절한 핸들러로 라우팅합니다.
 *
 * Discriminated Union 패턴을 사용하여 타입 안전성을 보장합니다.
 */
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  // 메시지 유효성 검사
  if (typeof message !== 'object' || message === null) {
    console.warn('[ServiceWorker] Invalid message format');
    sendResponse({ error: 'Invalid message format' });
    return false;
  }

  const runtimeMessage = message as RuntimeMessage;

  // 메시지 로깅 (디버그용)
  console.debug('[ServiceWorker] Message received:', runtimeMessage.type, {
    sender: sender?.url || 'extension',
  });

  // 메시지 타입별 비동기 처리
  const handleMessage = async (): Promise<void> => {
    try {
      switch (runtimeMessage.type) {
        case 'PAIRING_START':
          await handlePairingStart(runtimeMessage);
          break;

        case 'PAIRING_CANCEL':
          await handlePairingCancel(runtimeMessage);
          break;

        case 'GET_SETTINGS':
          sendResponse(await handleGetSettings(runtimeMessage));
          break;

        case 'UPDATE_SETTINGS':
          await handleUpdateSettings(runtimeMessage);
          sendResponse({ success: true });
          break;

        case 'GET_PAIRING_STATUS':
          sendResponse(await handleGetPairingStatus(runtimeMessage));
          break;

        case 'GET_CONNECTION_STATUS':
          sendResponse(await handleGetConnectionStatus(runtimeMessage));
          break;

        case 'RECONNECT':
          await handleReconnect(runtimeMessage);
          break;

        case 'GET_LOGS':
          sendResponse(await handleGetLogs(runtimeMessage));
          break;

        default:
          // Exhaustive check: 미처리된 메시지 타입 감지
          const exhaustiveCheck: never = runtimeMessage as never;
          console.warn('[ServiceWorker] Unknown message type:', exhaustiveCheck);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[ServiceWorker] Message handler error:', error);
      sendResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // 비동기 처리 실행
  // chrome.runtime.onMessage는 동기 응답을 지원하지 않으므로
  // 반드시 sendResponse를 호출하거나 Promise를 반환해야 함
  handleMessage().catch((error) => {
    console.error('[ServiceWorker] Unhandled error in message handler:', error);
    sendResponse({ error: 'Internal server error' });
  });

  // 비동기 응답 대기를 위해 true 반환
  return true;
});

// ============================================================================
// 설치 확인 및 초기화
// ============================================================================

/**
 * Service Worker 시작 시 상태 확인
 *
 * 저장소가 제대로 초기화되었는지 확인하고,
 * 필요하면 초기화합니다.
 */
(async () => {
  try {
    const installInfo = await getConfig('installInfo');

    if (!installInfo) {
      console.log('[ServiceWorker] Storage not initialized, initializing...');
      await initializeStorage('startup');
    } else {
      console.log('[ServiceWorker] Ready - Version:', installInfo.version);
    }
  } catch (error) {
    console.error('[ServiceWorker] Startup initialization error:', error);
  }
})();
