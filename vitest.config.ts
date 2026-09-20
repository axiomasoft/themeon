import { defineConfig } from 'vitest/config'
import { criticalCoverageIncludes } from './scripts/critical-coverage-includes.mjs'

export default defineConfig({
  test: {
    projects: ['packages/*'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json-summary'],
      include: criticalCoverageIncludes,
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/fixtures/**',
        '**/dist/**',
        '**/.tmp-*/**',
      ],
    },
  },
})
