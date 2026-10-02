import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';

// Credentials come from the same .env the app uses, so they are not duplicated
// in the shell that runs the suite.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Sequential on purpose: the login limiter is 5 attempts / 15 minutes, so
  // parallel workers would lock each other out instead of testing anything.
  workers: 1,
  reporter: 'list',
  timeout: 120000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 20000,
    navigationTimeout: 45000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  // Against the deployed site there is no local server to boot.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
