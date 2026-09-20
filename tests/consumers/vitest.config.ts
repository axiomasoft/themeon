import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  test: {
    globalSetup: ['./vitest.global-setup.ts'],
    include: ['src/**/*.test.ts'],
    testTimeout: 240_000,
    hookTimeout: 300_000,
  },
})
