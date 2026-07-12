export default defineNuxtConfig({
  compatibilityDate: '2026-07-07',
  devtools: { enabled: true },
  // P3.6 — CSS-фундамент (`tokens.css` + `index.css`) теперь пушит сам модуль `@themeon/nuxt`
  // (css.push, порядок токены→база сохранён внутри модуля) — ручной `css:[...]` P2.7 снят.
  modules: ['@themeon/nuxt'],
  themeon: {
    themes: ['light', 'dark'],
    default: 'light',
  },
})
