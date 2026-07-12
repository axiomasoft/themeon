/**
 * `@themeon/vue` — public entry `.` (P3.2: полный публичный API — composable + плагин;
 * анти-FOUC генератор живёт в отдельном pure-подпути `@themeon/vue/anti-fouc`, P-D24).
 * Заморожен `api.test.ts` (snapshot рантайм-экспортов) — образец `packages/core/src/index.ts`.
 */
export { THEME_INJECTION_KEY, themeonPlugin } from './plugin'
export { useTheme } from './use-theme'
export type { StorageLike, SystemPreference, UseThemeOptions, UseThemeReturn } from './types'
