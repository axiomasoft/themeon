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
  | 'baseColor'
  | 'bodyColor'
  | 'cardColor'
  | 'modalColor'
  | 'popoverColor'
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
 */
export const NAIVE_COMMON_MAP: Readonly<Record<CssVarName, CommonMapEntry>> = {
  '--color-action-primary': { key: 'primaryColor', kind: 'color' },
  '--color-action-primary-hover': { key: 'primaryColorHover', kind: 'color' },
  '--color-status-success': { key: 'successColor', kind: 'color' },
  '--color-status-warning': { key: 'warningColor', kind: 'color' },
  '--color-status-error': { key: 'errorColor', kind: 'color' },
  '--color-status-info': { key: 'infoColor', kind: 'color' },
  '--color-bg-page': { key: 'bodyColor', kind: 'color' },
  '--color-bg-subtle': { key: 'baseColor', kind: 'color' },
  '--color-bg-elevated': { key: ['cardColor', 'modalColor', 'popoverColor'], kind: 'color' },
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

/** Базовая color-роль для каждого статуса/primary — источник derived hover/pressed/suppl. */
export const DERIVABLE_BASES: ReadonlyArray<{
  base: CssVarName
  hover: NaiveCommonKey
  pressed: NaiveCommonKey
  suppl: NaiveCommonKey
}> = [
  {
    base: '--color-action-primary',
    hover: 'primaryColorHover',
    pressed: 'primaryColorPressed',
    suppl: 'primaryColorSuppl',
  },
  {
    base: '--color-status-success',
    hover: 'successColorHover',
    pressed: 'successColorPressed',
    suppl: 'successColorSuppl',
  },
  {
    base: '--color-status-warning',
    hover: 'warningColorHover',
    pressed: 'warningColorPressed',
    suppl: 'warningColorSuppl',
  },
  {
    base: '--color-status-error',
    hover: 'errorColorHover',
    pressed: 'errorColorPressed',
    suppl: 'errorColorSuppl',
  },
  {
    base: '--color-status-info',
    hover: 'infoColorHover',
    pressed: 'infoColorPressed',
    suppl: 'infoColorSuppl',
  },
]
