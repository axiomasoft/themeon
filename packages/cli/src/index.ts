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
export { runSchema } from './commands/schema'
export type { SchemaOptions, SchemaResult } from './commands/schema'
export { runInspect } from './commands/inspect'
export type { InspectOptions } from './commands/inspect'
export { runExplain } from './commands/explain'
export type { ExplainOptions } from './commands/explain'
export { runGraph } from './commands/graph'
export type { GraphOptions } from './commands/graph'
export { runDiff } from './commands/diff'
export type { DiffOptions } from './commands/diff'
export { runDoctor } from './commands/doctor'
export type { DoctorOptions } from './commands/doctor'
export { runMigrate } from './commands/migrate'
export type { MigrateOptions } from './commands/migrate'
export { loadThemeConfig } from './load-theme'
export { checkCoverage } from './checks/coverage'
export type { CoverageOptions } from './checks/coverage'
export { checkContrastPairs } from './checks/contrast'
export { checkHardcode } from './checks/hardcode'
export type { HardcodeOptions } from './checks/hardcode'
export { scanSources } from './checks/scan'
export type { Finding, Level, Rule, SourceFile } from './checks/types'
