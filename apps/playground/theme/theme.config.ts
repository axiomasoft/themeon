/**
 * Playground-тема (P8.4): дожёвывает ветку codegen `@themeon/nuxt` (`themeon.theme`) — до
 * этого item'а она не исполнялась НИ РАЗУ ни на одном реальном `nuxt dev`
 * (findings/P8-nuxt-vue-runtime.md §0). Формат — ровно то, что скаффолдит `themeon init`
 * (`export default defineTheme(...)`, замороженный объект) и ровно то, что показывает README.
 * Ключевой набор `base.color` 1:1 повторяет `@themeon/css`'s `defaultTheme`
 * (`packages/css/src/theme/default.ts`) — эти роли использует `components.css` playground'а;
 * дублирование, не импорт из `@themeon/css` (не публичный экспорт пакета, вне Scope P8.4).
 * Акцентный seed — синий (не зелёный default.ts), чтобы смок-тест live-HMR был видимым
 * визуально, а не только по значению переменной в devtools.
 */
import { defineTheme, defineTokens } from '@themeon/core'
import { generateScalePair, scaleToTokens } from '@themeon/colors'

const neutral = generateScalePair('oklch(0.55 0.02 260)')
const accent = generateScalePair('oklch(0.55 0.18 250)')

const palette = defineTokens('color', {
  neutral: scaleToTokens(neutral.light),
  neutralDark: scaleToTokens(neutral.dark),
  accent: scaleToTokens(accent.light),
  accentDark: scaleToTokens(accent.dark),
})

export default defineTheme({
  base: {
    color: {
      bg: {
        page: palette.neutral['1']!,
        subtle: palette.neutral['2']!,
        elevated: palette.neutral['1']!,
      },
      text: palette.neutral['12']!,
      textMuted: palette.neutral['11']!,
      border: palette.neutral['6']!,
      borderStrong: palette.neutral['8']!,
      action: {
        primary: palette.accent['9']!,
        primaryHover: palette.accent['10']!,
      },
      onPrimary: 'oklch(1 0 0)',
      focusRing: palette.accent['8']!,
      link: palette.accent['11']!,
      linkHover: palette.accent['12']!,
    },
    font: {
      sans: 'system-ui, sans-serif',
      mono: 'ui-monospace, monospace',
    },
    text: {
      xs: { size: '0.75rem', lineHeight: 1.5 },
      sm: { size: '0.875rem', lineHeight: 1.4 },
      base: { size: '1rem', lineHeight: 1.6 },
      lg: { size: '1.125rem', lineHeight: 1.5 },
      xl: { size: '1.25rem', lineHeight: 1.3 },
      '2xl': { size: '1.5rem', lineHeight: 1.25 },
      '3xl': { size: '1.875rem', lineHeight: 1.2 },
      '4xl': { size: '2.5rem', lineHeight: 1.15 },
    },
    space: {
      '2xs': '0.25rem',
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
    },
    radius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      full: '999px',
    },
    shadow: {
      sm: '0 1px 3px rgb(0 0 0 / 0.08)',
      md: '0 4px 12px rgb(0 0 0 / 0.10)',
      lg: '0 8px 24px rgb(0 0 0 / 0.12)',
    },
    ease: {
      standard: 'ease',
    },
    duration: {
      fast: '150ms',
      base: '250ms',
    },
    gradient: {
      brand: 'linear-gradient(135deg, oklch(0.55 0.18 250), oklch(0.65 0.12 200))',
    },
    breakpoint: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  themes: {
    dark: {
      color: {
        bg: {
          page: palette.neutralDark['1']!,
          subtle: palette.neutralDark['2']!,
          elevated: palette.neutralDark['1']!,
        },
        text: palette.neutralDark['12']!,
        textMuted: palette.neutralDark['11']!,
        border: palette.neutralDark['6']!,
        borderStrong: palette.neutralDark['8']!,
        action: {
          primary: palette.accentDark['9']!,
          primaryHover: palette.accentDark['10']!,
        },
        onPrimary: 'oklch(1 0 0)',
        focusRing: palette.accentDark['8']!,
        link: palette.accentDark['11']!,
        linkHover: palette.accentDark['12']!,
      },
    },
  },
})
