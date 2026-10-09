import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rm } from 'node:fs/promises'
import { VitePWA } from 'vite-plugin-pwa'
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

/**
 * Page chunks of the office app go into assets/admin/. The phone's service worker keeps every file
 * except these, so a phone never downloads the office pages (docs/07-attendant-offline.md).
 */
function chunkName(chunk: { facadeModuleId: string | null; moduleIds: string[] }): string {
  const paths = chunk.facadeModuleId ? [chunk.facadeModuleId] : chunk.moduleIds
  const admin =
    paths.length > 0 &&
    paths.every((id) => id.includes('/src/features/') || id.includes('/src/app/AdminShell'))
  return admin ? 'assets/admin/[name]-[hash].js' : 'assets/[name]-[hash].js'
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    removeMockWorker(),
    VitePWA({
      // A new version waits until the attendant presses the button. It never reloads by itself.
      registerType: 'prompt',
      manifest: {
        name: 'स्कूल बस',
        short_name: 'स्कूल बस',
        description: 'MUH Jain Global School: bus attendant app',
        lang: 'hi',
        start_url: '/trip',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#16222e',
        background_color: '#eef1f4',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app's own files: pages, scripts, styles, icons. Not the office pages, not the mock worker.
        globPatterns: ['**/*.{html,js,css,svg,png,woff2}'],
        globIgnores: ['assets/admin/**', '**/mockServiceWorker.js'],
        // Every address of the app opens the same page (the router decides), also with no network.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Fonts come from Google; keep them after the first visit. API answers are never cached:
        // the phone's own IndexedDB holds the data.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'font-styles' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: { rolldownOptions: { output: { chunkFileNames: chunkName } } },
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
    env: { VITE_API_BASE: 'http://localhost:3000/api/v1', VITE_OFFICE_PHONE: '+919812340002' },
  },
})
