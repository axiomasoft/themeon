/**
 * `themeon` — public entry `.` (программный API для тестов/встраивания, отдельно от bin).
 *
 * Re-exports only. Public surface is frozen by `api.test.ts`.
 */

export { runInit } from './commands/init'
export type { InitOptions, InitResult } from './commands/init'
export { runBuild } from './commands/build'
export type { BuildOptions, BuildResult } from './commands/build'
export { runCheck } from './commands/check'
export type { CheckOptions } from './commands/check'
export { loadThemeConfig } from './load-theme'
export { checkCoverage } from './checks/coverage'
export type { CoverageOptions } from './checks/coverage'
export { checkContrastPairs } from './checks/contrast'
export { checkHardcode } from './checks/hardcode'
export type { HardcodeOptions } from './checks/hardcode'
export { scanSources } from './checks/scan'
export type { Finding, Level, Rule, SourceFile } from './checks/types'
