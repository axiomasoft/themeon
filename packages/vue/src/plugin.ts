/**
 * `themeonPlugin` (P3.2) — Vue-плагин: `app.use(themeonPlugin, options)` создаёт
 * per-app-состояние (`createThemeState`, P3.1) и кладёт его через `provide`/`inject`
 * (`THEME_INJECTION_KEY`), чтобы `useTheme()` во всех компонентах приложения возвращал ОДНО
 * общее состояние — request-scoped в SSR (module-level singleton P3.1 течёт между запросами
 * на сервере, https://vuejs.org/guide/reusability/plugins).
 */
import type { App, InjectionKey, Plugin } from 'vue'
import { createThemeState } from './state'
import type { UseThemeOptions, UseThemeReturn } from './types'

/** Injection-ключ per-app состояния темы; используется `useTheme()` для `inject`. */
export const THEME_INJECTION_KEY: InjectionKey<UseThemeReturn> = Symbol('themeon')

export const themeonPlugin: Plugin<UseThemeOptions | undefined> = {
  install(app: App, options?: UseThemeOptions) {
    // идемпотентность (Implementation Rule 4): повторный `app.use(themeonPlugin, …)` не
    // пересоздаёт состояние — вторая регистрация была бы молчаливым источником рассинхрона
    if (app._context.provides[THEME_INJECTION_KEY as unknown as string]) return
    const api = createThemeState(options)
    app.provide(THEME_INJECTION_KEY, api)
    app.config.globalProperties.$theme = api
  },
}
