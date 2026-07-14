import type { CssVarName } from '@themeon/core'

/**
 * Per-component INK-оверрайды (P8.8, Blocker #3 + новая находка §4.1, найдены провенанс-
 * сканом реального naive-ui 2.44.1 — findings/P8-naive-color-canon.md §2.5/§4.1). `baseColor`
 * физически один экстремум канвы (`#FFF`/`#000`), а наши солид-заливки не подобраны под него
 * (Radix step 9 одинаков в обеих темах) — поэтому чернила на заливках подаются точечно, по
 * ключам, которыми компоненты Naive реально их берут, а не через `common.baseColor`.
 *
 * Эмитится ТОЛЬКО для ролей, значения которых тема реально дала (D3): если база (`--color-
 * action-primary`/`--color-status-*`) отсутствует в резолве, соответствующая запись целиком
 * пропускается — заливки нет, чернила красить нечего.
 */

export type ButtonInkSuffix = 'Primary' | 'Info' | 'Success' | 'Warning' | 'Error'

/** `textColor{state}{suffix}` — 5 состояний × 5 типов = 25 ключей (§2.5, провенанс-скан). */
export const BUTTON_INK_STATES = ['', 'Hover', 'Pressed', 'Focus', 'Disabled'] as const

/**
 * База заливки (`--color-action-primary`/`--color-status-*`) → чернила (`--color-on-*`, с
 * фолбэком на `--color-on-primary`, если у конкретного статуса своей роли нет) → суффикс
 * `Button.textColor*{suffix}`. Только `Primary` (первая запись) дополнительно красит
 * не-Button компоненты ниже — у Naive нет отдельных success/warning/error/info-вариантов
 * этих ключей (checkmark/tag-checked/icon-wrapper/steps/calendar/date-picker/radio/float-
 * button/switch все завязаны на `primaryColor`/`primaryColorSuppl`, не на статусные заливки).
 */
export const STATUS_INK_SOURCES: ReadonlyArray<{
  base: CssVarName
  onRole: CssVarName
  suffix: ButtonInkSuffix
}> = [
  { base: '--color-action-primary', onRole: '--color-on-primary', suffix: 'Primary' },
  { base: '--color-status-success', onRole: '--color-on-success', suffix: 'Success' },
  { base: '--color-status-warning', onRole: '--color-on-warning', suffix: 'Warning' },
  { base: '--color-status-error', onRole: '--color-on-error', suffix: 'Error' },
  { base: '--color-status-info', onRole: '--color-on-info', suffix: 'Info' },
]

/** Не-Button компоненты, чей единственный ink-ключ красится `--color-on-primary` (§2.5). */
export const PRIMARY_INK_TARGETS_BOTH_APPEARANCES: ReadonlyArray<{
  component: string
  key: string
}> = [
  { component: 'Checkbox', key: 'checkMarkColor' },
  { component: 'Tag', key: 'textColorChecked' },
  { component: 'IconWrapper', key: 'iconColor' },
  { component: 'Steps', key: 'indicatorTextColorProcess' },
  { component: 'Calendar', key: 'dateTextColorCurrent' },
  { component: 'DatePicker', key: 'itemTextColorActive' },
]

/** Заливка под этими ключами только в dark даёт стоковый Naive `primaryColor`-контраст (§2.5). */
export const PRIMARY_INK_TARGETS_DARK_ONLY: ReadonlyArray<{
  component: string
  key: string
}> = [
  { component: 'Radio', key: 'buttonTextColorActive' },
  { component: 'FloatButton', key: 'textColorPrimary' },
  { component: 'Switch', key: 'iconColor' },
]

/**
 * ACCENT-INK (P8.8, новая находка §4.1): `primaryColor` у Naive — это И заливка, И акцентные
 * чернила на КАНВЕ (текст/меню/ссылки/табы поверх `bodyColor`, не поверх заливки). Radix-форма
 * шкалы даёт в dark Lc 30.8 на канве — лечится существующей ролью `--color-link` (accent
 * step 11, уже подобрана под текст), не `--color-on-primary` (та подобрана под заливку).
 * Эмитится только если `--color-link` резолвится в парсибельный цвет; фолбэка на другую роль
 * нет (в отличие от STATUS_INK — у `--color-link` нет «под-ролей» по статусам).
 */
export const ACCENT_INK_SOURCE: CssVarName = '--color-link'

export const ACCENT_INK_BUTTON_SUFFIXES = [
  'textColorText',
  'textColorTextHover',
  'textColorTextPressed',
  'textColorTextFocus',
  'textColorTextDisabled',
  'textColorGhost',
  'textColorGhostHover',
  'textColorGhostPressed',
  'textColorGhostFocus',
  'textColorGhostDisabled',
] as const

export const ACCENT_INK_TARGETS: ReadonlyArray<{ component: string; key: string }> = [
  { component: 'Anchor', key: 'linkTextColorActive' },
  { component: 'Menu', key: 'itemTextColorActive' },
  { component: 'Menu', key: 'itemTextColorActiveHover' },
  { component: 'Menu', key: 'itemIconColorActive' },
  { component: 'Tabs', key: 'tabTextColorActiveLine' },
  { component: 'Tabs', key: 'tabTextColorActiveBar' },
  { component: 'Tabs', key: 'tabTextColorActiveCard' },
  { component: 'Pagination', key: 'itemTextColorActive' },
  { component: 'Typography', key: 'aTextColor' },
  { component: 'Dropdown', key: 'optionTextColorActive' },
]
