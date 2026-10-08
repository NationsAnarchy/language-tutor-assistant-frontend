import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // The current suite covers pure helpers (error classification, URL
    // building, formatters, mappers). Component tests can opt into jsdom
    // per-file via `// @vitest-environment jsdom` once a DOM env is added.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Pinned so URL-building assertions are deterministic.
    env: { NEXT_PUBLIC_BACKEND_URL: 'http://backend.test' },
    globals: false,
    restoreMocks: true,
  },
})
