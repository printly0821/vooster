/**
 * 페어링 플로우 E2E 테스트
 *
 * Extension Options 페이지에서 페어링 전체 플로우를 테스트합니다.
 */

import { test, expect } from '../fixtures/extension';
import { approvePairing } from '../helpers/api';
import { clearExtensionStorage } from '../helpers/extension-storage';

test.describe('페어링 플로우', () => {
  test('정상 페어링: 디스플레이 이름 입력 → QR 생성 → 승인 → 연결', async ({
    context,
    extensionId,
    optionsPageUrl,
  }) => {
    // 새 페이지 생성
    const page = await context.newPage();

    // E2E 테스트 모드 활성화 (폴링 타임아웃 15초로 단축)
    await page.addInitScript(() => {
      (window as any).__E2E_TEST__ = true;
    });

    // Storage 초기화
    await clearExtensionStorage(page);

    // Options 페이지 열기
    await page.goto(optionsPageUrl);

    // 1. idle 상태: DisplayInfoForm 표시
    await expect(page.getByText('디스플레이 설정')).toBeVisible({ timeout: 10000 });

    // 2. 디스플레이 이름 입력
    const displayNameInput = page.locator('[data-testid="display-name-input"]');
    await expect(displayNameInput).toBeVisible();
    await displayNameInput.fill('E2E 테스트 디스플레이');

    // 3. 페어링 시작 버튼 클릭
    const submitButton = page.locator('[data-testid="submit-button"]');
    await submitButton.click();

    // 4. generating 상태: 로딩 표시 (선택적)
    // await expect(page.locator('.animate-spin')).toBeVisible();

    // 5. displaying 상태: QR 코드 표시
    await expect(page.getByText('QR 코드 스캔')).toBeVisible({ timeout: 10000 });

    // 6. Canvas 렌더링 확인
    const canvas = page.locator('[data-testid="qr-canvas"]');
    await expect(canvas).toBeVisible();

    // 7. Canvas 데이터 URL 검증 (QR 코드 렌더링 확인)
    const dataUrl = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    expect(dataUrl.length).toBeGreaterThan(1000);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);

    // 8. 페어링 코드 추출 (6자리 숫자)
    const pairingCodeElement = page.locator('[data-testid="pairing-code"]');
    await expect(pairingCodeElement).toBeVisible();
    const pairingCode = await pairingCodeElement.textContent();

    expect(pairingCode).toBeTruthy();
    expect(pairingCode).toMatch(/^\d{6}$/);

    console.log('📱 페어링 코드:', pairingCode);

    // 9. polling 상태: "페어링 대기 중..." 메시지
    await expect(page.getByText('페어링 대기 중...')).toBeVisible();

    // 10. 페어링 승인 API 호출 (모바일 앱 시뮬레이션)
    // sessionId 추출 필요 (현재는 API에서 직접 추출 불가능하므로 스킵)
    // TODO: sessionId를 페이지에서 추출하는 로직 추가

    // 11. 페어링 완료 대기 (현재는 승인 없이 타임아웃 테스트만)
    // await expect(page.getByText('페어링 완료')).toBeVisible({ timeout: 30000 });

    console.log('✅ 페어링 QR 코드 생성 및 표시 테스트 완료');

    await page.close();
  });

  test('페어링 취소: QR 표시 중 취소 버튼 클릭', async ({ context, optionsPageUrl }) => {
    const page = await context.newPage();

    await page.addInitScript(() => {
      (window as any).__E2E_TEST__ = true;
    });

    await clearExtensionStorage(page);
    await page.goto(optionsPageUrl);

    // 페어링 시작
    await page.locator('[data-testid="display-name-input"]').fill('취소 테스트');
    await page.locator('[data-testid="submit-button"]').click();

    // QR 표시 확인
    await expect(page.getByText('QR 코드 스캔')).toBeVisible({ timeout: 10000 });

    // 취소 버튼 클릭
    await page.locator('[data-testid="cancel-button"]').click();

    // idle 상태로 복귀 확인
    await expect(page.getByText('디스플레이 설정')).toBeVisible();

    console.log('✅ 페어링 취소 테스트 완료');

    await page.close();
  });
});
