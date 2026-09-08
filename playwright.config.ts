import { defineConfig, devices } from '@playwright/test'

/**
 * E2E jalan lewat app sungguhan (frontend + vitacare-api + Postgres), bukan
 * mock — butuh `npm run seed` sudah dijalankan sekali di vitacare-api
 * (akun demo & master data). Port 5183 dipakai (bukan 5182) supaya tidak
 * bentrok dengan dev server yang mungkin sedang jalan manual.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: './vitacare-api',
      port: 4010,
      env: { NODE_ENV: 'test' },
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npm run dev -- --port 5183 --strictPort',
      url: 'http://localhost:5183',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
