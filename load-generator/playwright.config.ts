import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

const nfs = (process.env.RHDH_FRONTEND ?? 'ofs').toLowerCase() === 'nfs';

const testMatch =
  nfs ? 'guest-login-home-catalog-nfs.spec.ts' : 'guest-login-home-catalog.spec.ts';

// NFS (module federation) needs longer waits for remotes to load
const testTimeout = Number(
  process.env.PLAYWRIGHT_TEST_TIMEOUT ?? (nfs ? 120_000 : 30_000),
);
const expectTimeout = Number(
  process.env.PLAYWRIGHT_EXPECT_TIMEOUT ?? (nfs ? 120_000 : 20_000),
);
const navigationTimeout = Number(
  process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ?? (nfs ? 120_000 : 30_000),
);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testMatch,
  timeout: testTimeout,
  expect: {
    timeout: expectTimeout,
  },

  testDir: './scenarios',
  /* Run tests in files in parallel */
  fullyParallel: false,
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
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.RHDH_URL || process.env.PLAYWRIGHT_BASEURL,

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

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
