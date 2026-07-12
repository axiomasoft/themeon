import { defineTheme, defineTokens } from '@themeon/core'

/**
 * Фикстура e2e-смока P4.6 — минимальная, но реалистичная тема (neutral+accent+dark-патч),
 * используется живым прогоном `themeon build`/`themeon check` из `dist/cli.js` (не через
 * jiti-юнит-тест, а реальный bin), см. `phases/P4.md` P4.6 Completion Notes.
 */
const palette = defineTokens('color', {
  neutral: { 50: 'oklch(0.98 0 0)', 900: 'oklch(0.2 0 0)' },
  accent: { 600: 'oklch(0.55 0.15 255)', 700: 'oklch(0.45 0.15 255)' },
})

export default defineTheme({
  base: {
    color: {
      bg: { page: palette.neutral['50']! },
      text: palette.neutral['900']!,
      action: { primary: palette.accent['600']! },
    },
    space: { md: '1rem' },
  },
  themes: {
    dark: {
      color: {
        bg: { page: palette.neutral['900']! },
        text: palette.neutral['50']!,
        action: { primary: palette.accent['700']! },
      },
    },
  },
})
