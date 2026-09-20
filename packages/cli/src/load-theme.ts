/**
 * `loadThemeConfig` (P4.4): jiti-загрузка `theme.config.ts` в рантайме CLI — тот же приоритет
 * извлечения экспорта, что и Nuxt-модуль (`packages/nuxt/src/module.ts` P3.4, `loadTheme`):
 * `default` → `theme` → `defaultTheme` → сам модуль. jiti-инстанс — модульный singleton
 * (Rule 1: не создавать на каждый вызов).
 */
import { createJiti } from 'jiti'
import { consola } from 'consola'
import { ThemeonError } from '@themeon/core/authoring'
import type { ThemeDefinition } from '@themeon/core/authoring'

/**
 * Модульный singleton jiti — переиспользуется между вызовами `loadThemeConfig`.
 * `@themeon/*` — чисто ESM-пакеты (`exports.import`, без `require`-условия); без
 * `nativeModules` jiti транспилирует пользовательский `theme.config.ts` в CJS-стиль и
 * пытается `require()` их, что падает с «No "exports" main defined» — заставляем jiti
 * резолвить их родным `import()` (R-14 §3.2 эмпирическое уточнение).
 */
const jiti = createJiti(import.meta.url, {
  nativeModules: ['@themeon/core', '@themeon/tailwind', '@themeon/colors'],
})

/** Форма модуля, экспортирующего тему (совпадает с контрактом Nuxt-модуля P3.4). */
interface ThemeModuleExports {
  default?: ThemeDefinition
  theme?: ThemeDefinition
  defaultTheme?: ThemeDefinition
}

/**
 * Loads a `theme.config.ts` at `absPath` via jiti and extracts its `ThemeDefinition` export
 * (`default` → `theme` → `defaultTheme`, same priority as the Nuxt module's `loadTheme`).
 * Fails loudly (throws `ThemeonError`) when the loaded module does not look like a theme
 * definition (missing `.sys`) — a build must not silently emit an empty `tokens.css`.
 */
export async function loadThemeConfig(absPath: string): Promise<ThemeDefinition> {
  const mod = (await jiti.import(absPath, {})) as ThemeModuleExports
  const theme = mod.default ?? mod.theme ?? mod.defaultTheme ?? (mod as unknown as ThemeDefinition)

  if (theme == null || typeof theme !== 'object' || !('sys' in theme)) {
    consola.error(`[themeon] "${absPath}" не экспортирует тему (default/"theme"/"defaultTheme")`)
    throw new ThemeonError(
      'BAD_VALUE',
      `"${absPath}" does not export a ThemeDefinition (default, "theme" or "defaultTheme" export missing ".sys")`,
    )
  }

  return theme
}
