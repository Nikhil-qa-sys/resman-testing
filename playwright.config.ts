import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from the .env/ folder, selecting the file by
 * TEST_ENV (e.g. TEST_ENV=regression npx playwright test). Defaults to "qa".
 * Valid values: rc, qa, regression, support.
 * Shared defaults live in .env/.env; env-specific files override them.
 * https://github.com/motdotla/dotenv
 */
const environment = process.env.TEST_ENV || 'qa';
dotenv.config({ path: path.resolve(__dirname, '.env/.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, `.env/.env.${environment}`), override: true, quiet: true });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* ResMan boots slowly: the qa app shell takes ~60s to render after sign-in,
     and the BoardRoom's #Loading overlay swallows clicks until it clears. The
     defaults (30s test / 5s expect) are raised here so no test needs a custom
     timeout of its own.

     180s was not enough once a case had to page through a list. QA-04 walks the
     Buildings list to find the building it just created: 71 of 73 pages on rc at
     roughly 1s each, measured at 174s end to end — and that list grows every time
     the suite runs, since nothing is torn down. 300s keeps the same one-timeout
     rule while leaving room for that growth. */
  timeout: 300_000,
  expect: { timeout: 90_000 },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Matches the slow shell/overlay boot described above. */
    actionTimeout: 90_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

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
