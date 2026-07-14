import type { CssVarName } from '@themeon/core'

/** Naive UI `common` override keys this adapter knows how to fill. */
export type NaiveCommonKey =
  | 'primaryColor'
  | 'primaryColorHover'
  | 'primaryColorPressed'
  | 'primaryColorSuppl'
  | 'successColor'
  | 'successColorHover'
  | 'successColorPressed'
  | 'successColorSuppl'
  | 'warningColor'
  | 'warningColorHover'
  | 'warningColorPressed'
  | 'warningColorSuppl'
  | 'errorColor'
  | 'errorColorHover'
  | 'errorColorPressed'
  | 'errorColorSuppl'
  | 'infoColor'
  | 'infoColorHover'
  | 'infoColorPressed'
  | 'infoColorSuppl'
  | 'bodyColor'
  | 'cardColor'
  | 'modalColor'
  | 'popoverColor'
  | 'tableColor'
  | 'actionColor'
  | 'tableHeaderColor'
  | 'tabColor'
  | 'textColorBase'
  | 'textColor1'
  | 'textColor2'
  | 'textColor3'
  | 'borderColor'
  | 'dividerColor'
  | 'borderRadius'
  | 'borderRadiusSmall'
  | 'boxShadow1'
  | 'boxShadow2'
  | 'boxShadow3'
  | 'fontFamily'
  | 'fontSizeMini'
  | 'fontSizeSmall'
  | 'fontSizeMedium'
  | 'fontSizeLarge'

export interface CommonMapEntry {
  readonly key: NaiveCommonKey | readonly NaiveCommonKey[]
  readonly kind: 'color' | 'raw'
}

/**
 * ThemeOn sys-var → Naive `common`-ключ(и). Роли дефолт-темы (`packages/css/src/theme/
 * default.ts`) — отсутствующие в конкретной пользовательской теме var'ы просто
 * пропускаются `toNative` (не ошибка, D3-подобная толерантность к частичным темам).
 *
 * Статусные роли (`--color-status-*`) в дефолт-теме `@themeon/css` отсутствуют, но карта
 * их держит для пользовательских тем, которые их вводят (P4.2 Rule 5).
 *
 * `common.baseColor` НЕ мапится (P8.8, Blocker #3, findings/P8-naive-color-canon.md §2.4):
 * он остаётся стоковым `neutralBase` (`#FFF`/`#000`) — корректная подложка `composite()` и
 * поверхность в light, корректные чернила для акцентных ролей, которых тема не задаёт
 * (D3-толерантность). Чернила ThemeOn (`--color-on-*`/`--color-link`) подаются точечно,
 * per-component, через `ink-map.ts` — не через `common`.
 *
 * `*Hover`/`*Pressed`/`*Suppl` не входят в эту карту вообще — их читает и деривит `DERIVABLE_
 * BASES` (P8.9, findings/P8-naive-color-canon.md §3.3): одна таблица владеет и явной ролью
 * темы, и derived-фолбэком, вместо двух разошедшихся источников (было: `-hover` жил здесь
 * жёстко, `-pressed`/`-suppl` не читались из темы вовсе — Rule 4 не выполнялось для них).
 */
export const NAIVE_COMMON_MAP: Readonly<Record<CssVarName, CommonMapEntry>> = {
  '--color-action-primary': { key: 'primaryColor', kind: 'color' },
  '--color-status-success': { key: 'successColor', kind: 'color' },
  '--color-status-warning': { key: 'warningColor', kind: 'color' },
  '--color-status-error': { key: 'errorColor', kind: 'color' },
  '--color-status-info': { key: 'infoColor', kind: 'color' },
  '--color-bg-page': { key: 'bodyColor', kind: 'color' },
  '--color-bg-subtle': { key: ['actionColor', 'tableHeaderColor', 'tabColor'], kind: 'color' },
  '--color-bg-elevated': { key: ['cardColor', 'modalColor', 'popoverColor', 'tableColor'], kind: 'color' },
  '--color-text': { key: ['textColorBase', 'textColor1'], kind: 'color' },
  '--color-text-muted': { key: ['textColor2', 'textColor3'], kind: 'color' },
  '--color-border': { key: ['borderColor', 'dividerColor'], kind: 'color' },
  '--radius-md': { key: 'borderRadius', kind: 'raw' },
  '--radius-sm': { key: 'borderRadiusSmall', kind: 'raw' },
  '--shadow-sm': { key: 'boxShadow1', kind: 'raw' },
  '--shadow-md': { key: 'boxShadow2', kind: 'raw' },
  '--shadow-lg': { key: 'boxShadow3', kind: 'raw' },
  '--font-sans': { key: 'fontFamily', kind: 'raw' },
  '--text-xs': { key: 'fontSizeMini', kind: 'raw' },
  '--text-sm': { key: 'fontSizeSmall', kind: 'raw' },
  '--text-base': { key: 'fontSizeMedium', kind: 'raw' },
  '--text-lg': { key: 'fontSizeLarge', kind: 'raw' },
}

export interface DerivableBase {
  /** Базовая (solid) роль ThemeOn — источник деривации. */
  readonly base: CssVarName
  /** Явная роль `<base>-hover` темы, если задана — победит деривацию (Rule 4). */
  readonly hoverVar: CssVarName
  /** Явная роль `<base>-pressed` темы, если задана — победит деривацию (Rule 4). */
  readonly pressedVar: CssVarName
  /** Явная роль `<base>-suppl` темы, если задана — победит деривацию (Rule 4). */
  readonly supplVar: CssVarName
  readonly hoverKey: NaiveCommonKey
  readonly pressedKey: NaiveCommonKey
  readonly supplKey: NaiveCommonKey
}

/** Базовая color-роль + явные theme-роли для каждого статуса/primary — вход `deriveInteractionStates` (P8.9). */
export const DERIVABLE_BASES: readonly DerivableBase[] = [
  {
    base: '--color-action-primary',
    hoverVar: '--color-action-primary-hover',
    pressedVar: '--color-action-primary-pressed',
    supplVar: '--color-action-primary-suppl',
    hoverKey: 'primaryColorHover',
    pressedKey: 'primaryColorPressed',
    supplKey: 'primaryColorSuppl',
  },
  {
    base: '--color-status-success',
    hoverVar: '--color-status-success-hover',
    pressedVar: '--color-status-success-pressed',
    supplVar: '--color-status-success-suppl',
    hoverKey: 'successColorHover',
    pressedKey: 'successColorPressed',
    supplKey: 'successColorSuppl',
  },
  {
    base: '--color-status-warning',
    hoverVar: '--color-status-warning-hover',
    pressedVar: '--color-status-warning-pressed',
    supplVar: '--color-status-warning-suppl',
    hoverKey: 'warningColorHover',
    pressedKey: 'warningColorPressed',
    supplKey: 'warningColorSuppl',
  },
  {
    base: '--color-status-error',
    hoverVar: '--color-status-error-hover',
    pressedVar: '--color-status-error-pressed',
    supplVar: '--color-status-error-suppl',
    hoverKey: 'errorColorHover',
    pressedKey: 'errorColorPressed',
    supplKey: 'errorColorSuppl',
  },
  {
    base: '--color-status-info',
    hoverVar: '--color-status-info-hover',
    pressedVar: '--color-status-info-pressed',
    supplVar: '--color-status-info-suppl',
    hoverKey: 'infoColorHover',
    pressedKey: 'infoColorPressed',
    supplKey: 'infoColorSuppl',
  },
]
