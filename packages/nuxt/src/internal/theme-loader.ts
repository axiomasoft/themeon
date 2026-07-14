import { createJiti } from 'jiti'
import { pathToFileURL } from 'node:url'
import type { ThemeDefinition } from '@themeon/core'

/** Контракт файла пользовательской темы (`options.theme`, codegen P3.4). */
export interface ThemeModuleExports {
  default?: ThemeDefinition
  theme?: ThemeDefinition
  defaultTheme?: ThemeDefinition
}

export interface ThemeLoader {
  loadTheme: () => Promise<ThemeDefinition>
}

/**
 * Загрузчик файла пользовательской темы (P8.4 канон, findings/P8-nuxt-vue-runtime.md §0/§1).
 * НЕ `importModule` (`@nuxt/kit`): это нативный `import()` с ESM-кэшем Node (перечитать файл
 * невозможно — dev-watcher переписывал бы CSS байт-в-байт), да ещё и прогоняет результат через
 * `interopDefault` (mlly), который навешивает `default` через `Object.defineProperty` в
 * try/catch — а `defineTheme` возвращает ЗАМОРОЖЕННЫЙ объект, `defineProperty` бросает,
 * `catch{}` глотает, `default` теряется, и `nuxt dev` падает на первом же живом старте.
 * `jiti` (сам загрузчик модулей Nuxt: `loadNuxtModuleInstance` → `getSharedJiti`) держит
 * собственный cache-store: `moduleCache:false`/`fsCache:false` дают настоящую ре-эвалуацию
 * ВСЕГО графа импортов темы на каждый вызов, без утечки в неинвалидируемый ESM-кэш Node.
 * `alias` — как у kit: иначе `~/tokens/colors` из темы не резолвится.
 */
export function createThemeLoader(
  themePath: string,
  themeOption: string,
  alias: Record<string, string> | undefined,
): ThemeLoader {
  const jiti = createJiti(pathToFileURL(themePath).href, {
    moduleCache: false,
    fsCache: false,
    alias,
    // Канон — СЫРОЙ namespace, без jiti-интеропа: с дефолтным `interopDefault:true` jiti
    // синтезирует `mod.default` как self-reference на ВЕСЬ namespace, когда реального default
    // export нет (Proxy `get`-ловушка), — тогда файл без default/theme/defaultTheme молча
    // проходит валидацию вместо fail-loud ошибки (Rule 4). `false` даёт ровно то, что написано
    // в файле темы.
    interopDefault: false,
  })

  return {
    async loadTheme(): Promise<ThemeDefinition> {
      const themeModule = await jiti.import<ThemeModuleExports>(themePath)
      const loaded = themeModule.default ?? themeModule.theme ?? themeModule.defaultTheme
      if (!loaded) {
        throw new Error(
          `[themeon] module: файл темы "${themeOption}" должен экспортировать тему ` +
            `(default export либо именованный "theme"/"defaultTheme")`,
        )
      }
      return loaded
    },
  }
}
