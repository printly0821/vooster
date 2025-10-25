/**
 * 트리거 및 탭 생성 E2E 테스트
 *
 * 페어링 완료 후 트리거 API 호출 시 새 탭이 생성되는지 검증합니다.
 */

import { test, expect } from '../fixtures/extension';
import { setupPairedExtension } from '../helpers/extension-storage';
import { triggerDisplay } from '../helpers/api';
import { generateDisplayToken } from '../helpers/auth';

test.describe('트리거 및 탭 생성', () => {
  test('트리거 API → 새 탭 생성', async ({ context, extensionId, optionsPageUrl }) => {
    const screenId = 'screen:e2e:trigger-test';
    const jobNo = 'JOB-E2E-12345';

    // 1. 페어링 완료 상태 설정
    const page = await context.newPage();

    await setupPairedExtension(page, extensionId, {
      displayId: screenId,
      displayName: 'E2E 트리거 테스트',
      authToken: generateDisplayToken(screenId),
      wsServerUrl: 'ws://localhost:3001',
    });

    // Options 페이지 열기 (Dashboard 표시되어야 함)
    await page.goto(optionsPageUrl);

    // Dashboard 확인
    await expect(page.getByText('페어링 완료')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-status="connected"]')).toBeVisible();

    console.log('✅ 페어링 완료 상태 확인');

    // 2. 현재 탭 개수 확인
    const initialPages = context.pages();
    const initialCount = initialPages.length;

    console.log('📊 현재 탭 개수:', initialCount);

    // 3. 트리거 API 호출
    console.log('🔔 트리거 전송:', { screenId, jobNo });

    const response = await triggerDisplay(screenId, jobNo);

    expect(response.ok).toBe(true);
    expect(response.txId).toBeTruthy();

    console.log('✅ 트리거 응답:', {
      ok: response.ok,
      txId: response.txId,
      clientCount: response.clientCount,
    });

    // 4. 새 탭 생성 대기 (최대 5초)
    await page.waitForTimeout(2000);

    // 5. 새 탭 확인
    const newPages = context.pages();
    const newCount = newPages.length;

    console.log('📊 새 탭 개수:', newCount);
    expect(newCount).toBe(initialCount + 1);

    // 6. 새 탭 URL 검증
    const orderTab = newPages.find(p => p.url().includes(`/orders/${jobNo}`));
    expect(orderTab).toBeTruthy();
    expect(orderTab!.url()).toContain(`/orders/${jobNo}`);

    console.log('✅ 새 탭 생성 확인:', orderTab!.url());

    await page.close();
  });

  test('중복 방지: 동일 jobNo 2회 트리거 → 1개 탭만 생성', async ({
    context,
    extensionId,
    optionsPageUrl,
  }) => {
    const screenId = 'screen:e2e:duplicate-test';
    const jobNo = 'JOB-E2E-DUPLICATE';

    // 페어링 상태 설정
    const page = await context.newPage();

    await setupPairedExtension(page, extensionId, {
      displayId: screenId,
      authToken: generateDisplayToken(screenId),
    });

    await page.goto(optionsPageUrl);
    await expect(page.locator('[data-status="connected"]')).toBeVisible();

    const initialCount = context.pages().length;

    // 첫 번째 트리거
    console.log('🔔 첫 번째 트리거');
    const response1 = await triggerDisplay(screenId, jobNo);
    expect(response1.ok).toBe(true);

    await page.waitForTimeout(1000);

    const afterFirstCount = context.pages().length;
    expect(afterFirstCount).toBe(initialCount + 1);

    // 두 번째 트리거 (중복)
    console.log('🔔 두 번째 트리거 (중복)');
    const response2 = await triggerDisplay(screenId, jobNo);
    expect(response2.ok).toBe(true);

    await page.waitForTimeout(1000);

    // 탭 개수 변화 없음
    const afterSecondCount = context.pages().length;
    expect(afterSecondCount).toBe(afterFirstCount);

    console.log('✅ 중복 방지 작동 - 탭 개수 유지:', afterSecondCount);

    await page.close();
  });
});
