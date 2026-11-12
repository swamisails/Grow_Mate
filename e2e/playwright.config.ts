import { defineConfig, devices } from '@playwright/test'

// Runs inside the e2e Compose stack (docker-compose.e2e.yml) against the `web` service.
// Start it through ./run.sh, which resets and reseeds the e2e database first.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://web',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
})
