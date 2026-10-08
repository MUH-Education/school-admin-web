import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    // Optional: use a Chromium that is already installed (set PW_CHROMIUM_PATH).
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
