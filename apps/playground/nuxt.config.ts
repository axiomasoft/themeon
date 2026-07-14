export default defineNuxtConfig({
  compatibilityDate: '2026-07-07',
  devtools: { enabled: true },
  // P3.6 — CSS-фундамент (`tokens.css` + `index.css`) теперь пушит сам модуль `@themeon/nuxt`
  // (css.push, порядок токены→база сохранён внутри модуля) — ручной `css:[...]` P2.7 снят.
  modules: ['@themeon/nuxt'],
  themeon: {
    // P3.7 — без `default`: догфуд системной ветки (matchMedia), ровно конфигурация,
    // в которой был воспроизведён дефект `default:''` на живых пилотах.
    // P8.4 — codegen пользовательской темы (`themeon.theme`), впервые реально исполняемая
    // ветка playground'а: тема лежит в своей директории (`theme/`) ради granular CSS-HMR
    // без рестарта dev-сервера (findings/P8-nuxt-vue-runtime.md §2/§6).
    theme: './theme/theme.config.ts',
  },
})
