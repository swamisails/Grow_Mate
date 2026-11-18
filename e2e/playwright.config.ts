import { defineConfig, devices } from '@playwright/test'

// Runs inside the e2e Compose stack (docker-compose.e2e.yml) against the `web` service.
// Start it through ./run.sh, which resets and reseeds the e2e database first.
const browser = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }

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
  // The clock spec runs first. Cancelling a Request is derived from the clock, so the spec
  // accepts that Request before wall time returns; a later spec can then Request Rafi again.
  projects: [
    { name: 'clock', testMatch: /request-clock\.spec\.ts/, use: browser },
    { name: 'chromium', dependencies: ['clock'], testIgnore: /request-clock\.spec\.ts/, use: browser },
  ],
})
