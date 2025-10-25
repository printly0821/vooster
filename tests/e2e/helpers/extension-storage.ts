/**
 * Chrome Extension Storage 헬퍼
 *
 * chrome.storage.local 데이터를 주입하거나 추출하는 유틸리티입니다.
 */

import { Page } from '@playwright/test';

/**
 * 페어링 정보를 Extension Storage에 주입
 *
 * 페어링 완료 상태를 시뮬레이션하여 Dashboard를 표시합니다.
 *
 * @param page - Playwright Page
 * @param extensionId - Extension ID
 * @param options - 페어링 정보 옵션
 *
 * @example
 * await setupPairedExtension(page, extensionId, {
 *   displayId: 'screen:e2e:test',
 *   authToken: generateDisplayToken('screen:e2e:test'),
 * });
 * await page.goto(`chrome-extension://${extensionId}/public/options.html`);
 * // Dashboard가 표시됨
 */
export async function setupPairedExtension(
  page: Page,
  extensionId: string,
  options?: {
    displayId?: string;
    displayName?: string;
    authToken?: string;
    wsServerUrl?: string;
  }
): Promise<void> {
  const {
    displayId = 'screen:e2e:test',
    displayName = 'E2E 테스트',
    authToken = 'mock-jwt-token',
    wsServerUrl = 'ws://localhost:3001',
  } = options || {};

  // Storage 데이터 주입
  await page.addInitScript(
    ({ displayId, displayName, authToken, wsServerUrl }) => {
      (chrome as any).storage.local.set({
        pairing: {
          isPaired: true,
          displayId,
          displayName,
          wsServerUrl,
          authToken,
          tokenExpiresAt: Date.now() + 3600000, // 1시간 후
          pairedAt: Date.now(),
        },
      });
    },
    { displayId, displayName, authToken, wsServerUrl }
  );

  console.log('✅ Extension Storage 주입 완료:', {
    displayId,
    displayName,
  });
}

/**
 * Extension Storage 초기화
 *
 * 테스트 간 상태 격리를 위해 Storage를 비웁니다.
 *
 * @param page - Playwright Page
 */
export async function clearExtensionStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (chrome as any).storage.local.clear();
  });

  console.log('🗑️  Extension Storage 초기화 완료');
}
