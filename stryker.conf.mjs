// @ts-check
import { criticalMutationIncludes } from './scripts/critical-mutation-includes.mjs'

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner', '@stryker-mutator/typescript-checker'],
  reporters: ['clear-text', 'progress', 'json'],
  jsonReporter: {
    fileName: 'mutation/mutation-report.json',
  },
  coverageAnalysis: 'perTest',
  timeoutMS: 60_000,
  concurrency: 4,
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
  mutate: criticalMutationIncludes,
  vitest: {
    configFile: 'stryker.vitest.config.ts',
    related: true,
    dir: 'packages/core',
  },
  typescriptChecker: {
    prioritizePerformanceOverAccuracy: true,
  },
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
}

export default config
