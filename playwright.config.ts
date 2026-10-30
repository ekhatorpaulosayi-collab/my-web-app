import { defineConfig, devices } from '@playwright/test';

const browser = { ...devices['Desktop Chrome'] } as Record<string, unknown>;
delete browser.channel;
if (!process.env.CI) browser.channel = 'chrome';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.UX_BASE_URL || 'http://127.0.0.1:4000',
    trace: 'off',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'phone', use: { ...browser, viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...browser, viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'ci-anon-key',
    },
  },
});
