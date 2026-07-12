/**
 * `themeon` — public entry `.` (программный API для тестов/встраивания, отдельно от bin).
 *
 * Re-exports only. Public surface is frozen by `api.test.ts`.
 */

export { runInit } from './commands/init'
export type { InitOptions, InitResult } from './commands/init'
