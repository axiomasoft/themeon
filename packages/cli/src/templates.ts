/**
 * Строковые шаблоны для `themeon init` (P4.3). Держатся отдельно от `commands/init.ts`,
 * чтобы содержимое скаффолда было легко читать/тестировать без обвязки citty.
 */

/**
 * Стартовый `theme.config.ts`: минимальная neutral+accent тема через `defineTheme`
 * (форма — по образцу `@themeon/css/src/theme/default.ts`, P2.7 дефолт-тема), пользователь
 * правит её под свой продукт. `resolveTheme`/`serializeThemeCss` (P1) — вход для `themeon
 * build` (P4.4), сам шаблон CLI не исполняет.
 */
export const THEME_CONFIG_TEMPLATE = `import { defineTheme } from '@themeon/core'

/**
 * Стартовая тема ThemeOn — правьте под свой продукт.
 * \`themeon build\` резолвит её в \`tokens.css\` (P4.4).
 */
export default defineTheme({
  base: {
    color: {
      bg: {
        page: 'oklch(1 0 0)',
        elevated: 'oklch(0.98 0 0)',
      },
      text: 'oklch(0.2 0 0)',
      action: {
        primary: 'oklch(0.55 0.15 255)',
      },
    },
    space: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
    },
    radius: {
      md: '0.5rem',
    },
  },
  themes: {
    dark: {
      color: {
        bg: {
          page: 'oklch(0.2 0 0)',
          elevated: 'oklch(0.25 0 0)',
        },
        text: 'oklch(0.95 0 0)',
        action: {
          primary: 'oklch(0.7 0.15 255)',
        },
      },
    },
  },
})
`

/** Строка `@import`, которую пользователь добавляет в CSS-вход после \`init\`. */
export const APP_CSS_IMPORT = '@import "@themeon/css";'

/**
 * Заготовка для Tailwind-моста (P4.1): напоминание про порядок `@import` и обязательность
 * `@theme inline` (P-D31) — реальный bridge-файл генерирует `themeon build --tailwind` (P4.4),
 * `init --tailwind` только печатает инструкцию/добавляет комментарий в шаблон.
 */
export const TAILWIND_BRIDGE_HINT = `/* ThemeOn + Tailwind v4:
 * 1. \`themeon build --tailwind\` сгенерирует self-referential \`@theme inline\` блок (P4.4).
 * 2. Подключите его ПОСЛЕ \`@import "tailwindcss"\`, чтобы Tailwind увидел ThemeOn-переменные
 *    как namespace'ы и сгенерировал утилиты (напр. bg-action-primary).
 */
`
