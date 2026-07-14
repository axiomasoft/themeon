import { defineConfig } from 'vitest/config'

/**
 * Отдельный root (не входит в корневой `projects: ['packages/*']` — `pnpm test` его не видит).
 * Три яруса: `int-fast` (реальный vite/tailwind/naive-ui, node+jsdom), `int-browser` (реальный
 * Chromium), `int-e2e` (живой `nuxt dev`, отдельный CI-job — findings/P8-integration-harness.md §3.3).
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'int-fast',
          include: ['src/fast/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'int-browser',
          include: ['src/browser/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'int-e2e',
          include: ['src/e2e/**/*.test.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
