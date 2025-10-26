/**
 * Chrome Extension Playwright Fixture
 *
 * Extension을 로드한 Browser Context를 제공합니다.
 * Service Worker, Extension ID 등을 자동으로 추출합니다.
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Extension Fixtures 타입
 */
export type ExtensionFixtures = {
  /** Extension이 로드된 Browser Context */
  context: BrowserContext;

  /** Extension ID (chrome-extension://[ID]) */
  extensionId: string;

  /** Options Page URL */
  optionsPageUrl: string;
};

/**
 * Extension Fixture
 *
 * Chrome Extension을 로드하고 테스트 컨텍스트를 제공합니다.
 *
 * @example
 * import { test, expect } from './fixtures/extension';
 *
 * test('Extension 로드 확인', async ({ extensionId, optionsPageUrl }) => {
 *   console.log('Extension ID:', extensionId);
 *   await page.goto(optionsPageUrl);
 * });
 */
export const test = base.extend<ExtensionFixtures>({
  /**
   * Browser Context: Extension이 로드된 상태
   *
   * launchPersistentContext를 사용하여 Extension 로드
   * - headless: false (Extension Service Worker 로드 필수)
   * - args: --load-extension, --disable-extensions-except
   */
  context: async ({}, use) => {
    // Extension 빌드 경로
    const extensionPath = path.resolve(__dirname, '../../../extension');

    console.log('🔧 Extension 로드 중:', extensionPath);

    // Persistent Context 생성 (Extension 로드)
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-blink-features=AutomationControlled',
      ],
      // Extension 권한 허용
      permissions: ['geolocation', 'notifications'],
    });

    // Service Worker 초기화 대기 (최대 5초)
    console.log('⏳ Service Worker 초기화 대기 중...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Extension Context 준비 완료');

    await use(context);

    // Cleanup
    await context.close();
  },

  /**
   * Extension ID 추출
   *
   * Service Worker URL에서 Extension ID를 추출합니다.
   * chrome-extension://[ID]/... → ID
   */
  extensionId: async ({ context }, use) => {
    console.log('🔍 Extension ID 추출 중...');

    let extensionId: string | null = null;

    // Service Worker 대기 (최대 10초)
    for (let i = 0; i < 50; i++) {
      const workers = context.serviceWorkers();

      if (workers.length > 0) {
        const swUrl = workers[0].url();
        console.log('Service Worker URL:', swUrl);

        // chrome-extension://ID/... → ID 추출
        const match = swUrl.match(/chrome-extension:\/\/([a-z]+)/);
        if (match) {
          extensionId = match[1];
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (!extensionId) {
      throw new Error('Extension ID를 찾을 수 없습니다. Extension이 제대로 로드되었는지 확인하세요.');
    }

    console.log('✅ Extension ID:', extensionId);

    await use(extensionId);
  },

  /**
   * Options Page URL
   *
   * chrome-extension://[ID]/public/options.html
   */
  optionsPageUrl: async ({ extensionId }, use) => {
    const url = `chrome-extension://${extensionId}/public/options.html`;
    console.log('📄 Options Page URL:', url);
    await use(url);
  },
});

export { expect } from '@playwright/test';
