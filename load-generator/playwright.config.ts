import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

const env = process.env as Record<string, string | undefined>;

const baseURL = env.RHDH_URL;

// One shared journey works on OFS and NFS. Use NFS-safe defaults so module
// federation / slow clusters do not flake; override via env when needed.
const testTimeout = Number(env.PLAYWRIGHT_TEST_TIMEOUT ?? 120_000);
const expectTimeout = Number(env.PLAYWRIGHT_EXPECT_TIMEOUT ?? 30_000);
const navigationTimeout = Number(env.PLAYWRIGHT_NAVIGATION_TIMEOUT ?? 60_000);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: testTimeout,
  expect: {
    timeout: expectTimeout,
  },

  testDir: './scenarios',

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: true,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['json', {  outputFile: 'test-results.json' }]
    // ['html'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to  use in actions like `await page.goto('')`. */
    baseURL,

    navigationTimeout: navigationTimeout,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
