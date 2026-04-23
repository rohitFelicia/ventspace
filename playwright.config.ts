import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,          // 60s per test (Firebase RTT is ~150ms)
  retries: 1,
  fullyParallel: false,     // group room tests share state — run sequentially
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.APP_URL ?? 'https://ventspace.orangeriver-be1693d8.centralindia.azurecontainerapps.io',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    // Grant notification permission automatically
    permissions: ['notifications'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // iPhone 14 Pro viewport (393x852) emulated in Chromium
      name: 'iPhone',
      use: {
        ...devices['iPhone 14 Pro'],
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
      },
    },
    {
      // Pixel 7 viewport (412x915) — native Chromium
      name: 'Pixel',
      use: { ...devices['Pixel 7'] },
    },
    {
      // iPad Pro 11 viewport (834x1194) emulated in Chromium
      name: 'iPad',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
      },
    },
  ],
});
