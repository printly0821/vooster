import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E 테스트 설정
 *
 * 프로젝트:
 * - chromium: Next.js 프론트엔드 테스트
 * - chrome-extension: Chrome Extension E2E 테스트
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* 전역 타임아웃 */
  timeout: 30000,

  /* Expect 타임아웃 */
  expect: {
    timeout: 5000,
  },

  /* Run tests in files in parallel */
  fullyParallel: false, // Extension 테스트는 순차 실행 권장

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Next.js 프론트엔드 테스트
    {
      name: 'chromium',
      testMatch: '**/e2e/example.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Chrome Extension E2E 테스트
    {
      name: 'chrome-extension',
      testMatch: '**/e2e/scenarios/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Extension 로드를 위해 headful 필수
        headless: false,
        channel: 'chrome',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    // Next.js 개발 서버
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    // Docker Compose (Socket.IO + Redis)
    {
      command: 'docker-compose up -d',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
