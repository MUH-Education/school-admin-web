import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rm } from 'node:fs/promises'
import { defineConfig, type Plugin } from 'vitest/config'

// The MSW worker file must not ship. public/ copies it into dist/, so remove it after the build.
function removeMockWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'remove-mock-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async closeBundle() {
      await rm(`${outDir}/mockServiceWorker.js`, { force: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), removeMockWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: { VITE_API_BASE: 'http://localhost:3000/api/v1' },
  },
})
