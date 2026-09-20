/**
 * Дефолт-тема пакета `@themeon/css` (P2.7): dogfood всей вертикали core→colors→css —
 * доказывает, что naming/резолвер/сериализатор (P1) и шкалы/APCA-гейт (P2.1–P2.2) реально
 * стыкуются. `gen-tokens.mjs` резолвит эту тему, гоняет APCA-гейт (fail-closed) и пишет
 * `dist/tokens.css`. Имена итоговых переменных обязаны 1:1 совпасть с `CSS_CONTRACT`
 * (`../contract.ts`) — сверено вручную при реализации, при расхождении правится этот файл
 * или контракт, НЕ naming engine core (P-D14).
 */

import { defineTheme, defineTokens } from '@themeon/core/authoring'
import { generateScalePair, scaleToTokens } from '@themeon/colors'

// Нейтральная шкала (фон/текст/бордеры) + акцентная шкала (action/link/focus) — по одному
// seed на каждую, светлая+тёмная пара (P2.2 generateScalePair).
const neutral = generateScalePair('oklch(0.55 0.02 260)')
const accent = generateScalePair('oklch(0.55 0.15 155)')

/**
 * Ref-слой: 4 шкалы (light/dark × neutral/accent) под каноничными именами. Только
 * `neutral`/`accent` (светлые) реально referenced из base sys-дерева ниже — `neutralDark`/
 * `accentDark` referenced только из патча темы `dark` (резолвер не эмитит их как отдельные
 * ref-переменные :root, только их финальные значения внутри `[data-theme="dark"]`, P-D13).
 */
export const palette = defineTokens('color', {
  neutral: scaleToTokens(neutral.light),
  neutralDark: scaleToTokens(neutral.dark),
  accent: scaleToTokens(accent.light),
  accentDark: scaleToTokens(accent.dark),
})

/**
 * Sys-слой + dark-тема (патч только sys, D3). Маппинг ролей — Radix-семантика (`STEP_ROLES`
 * из `@themeon/colors`): 1/2 фон, 6 бордер, 8 сильный бордер/фокус-solid, 9 solid (seed),
 * 10 hover solid, 11/12 текст (contrast-solved).
 */
export const defaultTheme = defineTheme({
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
      // Литерал, не ссылка на шкалу: solid-кнопка (accent step 9) держит сопоставимую
      // светлоту в обеих темах, поэтому текст на ней всегда близок к белому — ни
      // neutral['1'] (в тёмной теме это почти чёрный «App background», не текст), ни
      // neutral['12']/accent['12'] (contrast-solved против ЧУЖОГО фона — шага 2 своей
      // шкалы, не против action.primary) не гарантируют APCA-порог здесь надёжно
      // (эмпирически проверено при исполнении: |Lc| 58.7 < 60 на грани провала гейта).
      onPrimary: 'oklch(1 0 0)',
      // Литерал, не ссылка на шкалу (P8.7, findings/P8-css-layers-cli-checks.md §3.3): шкала
      // Radix-формы схлопывает средние шаги в обеих темах — ни один шаг accent не даёт
      // non-text-порог 45 против bg.page/bg.subtle одновременно (эмпирически: шаг 8 давал
      // light |Lc| 41.7/39.5, dark 27.7/27.2). Значения ниже подобраны прогоном против
      // ФАКТИЧЕСКИХ bg.page/bg.subtle этой темы (запас над порогом сохранён).
      focusRing: 'oklch(0.695 0.12 155)',
      link: palette.accent['11']!,
      linkHover: palette.accent['12']!,
      // Роли `--color-on-{status}` (P8.7, аудит #22, findings/P8-naive-color-canon.md §4.2):
      // ink для статусных заливок, которые сама дефолт-тема не задаёт (Naive-адаптер, P8.8,
      // подставляет их только для ролей, реально данных темой — D3). success/error/info —
      // типично насыщенные заливки в диапазоне светлоты accent-9 (L≈0.55), белые чернила
      // читаются надёжно (тот же принцип, что onPrimary). warning — типично светлая амбер-
      // заливка («жёлтая полоса» APCA, L≈0.70, где ни белые, ни чёрные чернила не дают 60) —
      // тёмные чернила ближе к порогу в этом диапазоне (прецедент подбора — комментарий выше
      // у onPrimary).
      onSuccess: 'oklch(1 0 0)',
      onWarning: 'oklch(0.2 0 0)',
      onError: 'oklch(1 0 0)',
      onInfo: 'oklch(1 0 0)',
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
      brand: 'linear-gradient(135deg, oklch(0.55 0.15 155), oklch(0.65 0.12 200))',
    },
    breakpoint: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  themes: {
    // Зеркальный маппинг на *Dark шкалы — тема 'dark' получает `color-scheme: dark`
    // автоматически (конвенция P-D16), патч ограничен группой `color` (D3).
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
        // Литерал — см. коммент у base.color.onPrimary выше (не переопределяется на
        // scale-ссылку: одно и то же значение работает в обеих темах).
        onPrimary: 'oklch(1 0 0)',
        // Литералы (P8.7, findings §3.3): dark-шкала схлопывает средние шаги, ни один accent-
        // шаг не даёт non-text-порог 45 (focusRing) / body-порог 75 (link) против bg.page/
        // bg.subtle этой темы. Значения подобраны прогоном (см. коммент у base.color.focusRing).
        focusRing: 'oklch(0.670 0.12 155)',
        link: 'oklch(0.838 0.127 155)',
        linkHover: palette.accentDark['12']!,
        onSuccess: 'oklch(1 0 0)',
        onWarning: 'oklch(0.2 0 0)',
        onError: 'oklch(1 0 0)',
        onInfo: 'oklch(1 0 0)',
      },
    },
  },
})
