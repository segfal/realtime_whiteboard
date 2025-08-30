import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',       
  timeout: 30_000,            
  retries: 0,                 
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
  },
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
  ],
});
