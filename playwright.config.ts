import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.UX_BASE_URL || 'http://127.0.0.1:4000',
    trace: 'off',
  },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, channel: 'chrome' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, channel: 'chrome' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
