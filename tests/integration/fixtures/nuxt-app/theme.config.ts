import { defineTheme } from '@themeon/core'

// Именованный экспорт — единственная форма, на которой `@themeon/nuxt` сегодня стартует
// (findings/P8-integration-harness.md §0.5a): `@nuxt/kit` `importModule()` уже делает
// interop-default, поэтому `export default defineTheme(...)` (форма `themeon init`) не
// находится модулем и падает на `setup()`. Починка — P8.4; здесь фикстура намеренно держит
// рабочую форму, потому что этот тест — self-test стенда, а не проверка блокера 5a.
export const theme = defineTheme({
  base: {
    color: {
      action: { primary: 'oklch(0.42 0.2 30)' },
      bg: { page: 'oklch(1 0 0)' },
    },
  },
})
