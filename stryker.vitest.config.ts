import { defineConfig } from 'vitest/config'

/**
 * Isolated Vitest config for Stryker (P2.2).
 * Avoids monorepo workspace projects that break under mutation instrumentation.
 */
export default defineConfig({
  test: {
    name: 'stryker-core',
    root: './packages/core',
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/property/**',
    ],
  },
})
