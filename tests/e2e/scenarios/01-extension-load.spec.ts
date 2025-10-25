/**
 * Chrome Extension 로드 테스트
 *
 * Extension이 정상적으로 로드되고 Options 페이지가 표시되는지 확인합니다.
 */

import { test, expect } from '../fixtures/extension';

test.describe('Extension 기본 로드 테스트', () => {
  test('Extension이 정상적으로 로드됨', async ({ extensionId, optionsPageUrl, context }) => {
    // Extension ID 확인
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]+$/); // 소문자만

    console.log('✅ Extension ID:', extensionId);

    // Service Worker 확인
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);

    console.log('✅ Service Worker 개수:', workers.length);
  });

  test('Options 페이지가 표시됨', async ({ context, optionsPageUrl }) => {
    // 새 페이지 생성
    const page = await context.newPage();

    // E2E 테스트 모드 플래그 설정
    await page.addInitScript(() => {
      (window as any).__E2E_TEST__ = true;
    });

    // Options 페이지로 이동
    await page.goto(optionsPageUrl);

    // 페이지 로드 확인
    await page.waitForLoadState('domcontentloaded');

    // 디스플레이 정보 입력 폼이 표시되는지 확인
    await expect(page.getByText('디스플레이 설정')).toBeVisible({ timeout: 10000 });

    // Input 요소 확인
    const input = page.locator('[data-testid="display-name-input"]');
    await expect(input).toBeVisible();

    // Submit 버튼 확인
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeVisible();

    console.log('✅ Options 페이지 정상 표시');

    await page.close();
  });
});
