import { defineConfig } from '@playwright/test'

// Optional: use a Chromium that is already installed (set PW_CHROMIUM_PATH).
const launchOptions = { executablePath: process.env.PW_CHROMIUM_PATH || undefined }

export default defineConfig({
  testDir: './e2e',
  projects: [
    // Every flow against the mock API (npm run dev).
    {
      name: 'mock',
      testIgnore: /pwa\.spec\.ts/,
      use: { baseURL: 'http://localhost:5173', launchOptions },
    },
    // The installed phone app: the real build with its service worker (npm run preview).
    {
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      use: { baseURL: 'http://localhost:4173', launchOptions },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
