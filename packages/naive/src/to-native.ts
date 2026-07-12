import type { CssVarName, ResolvedTheme } from '@themeon/core'
import type { GlobalThemeOverrides } from 'naive-ui'
import { DERIVABLE_BASES, NAIVE_COMMON_MAP, type NaiveCommonKey } from './common-map'
import { deriveInteractionStates, toHex } from './color'
import { mergeOverrides } from './merge'
import type { ToNativeOptions } from './types'

/**
 * Строит плоский lookup varName→value: база `resolved.vars`, перекрытая (если задан
 * `opts.theme`) записями соответствующего патча `resolved.themes[theme]` (P4.2 Rule 8.1).
 * `resolved.themes[key]` — массив `ResolvedToken`, не готовая карта — сворачиваем сами.
 */
function buildLookup(resolved: ResolvedTheme, theme?: string): Record<string, string> {
  const lookup: Record<string, string> = { ...resolved.vars }
  if (theme !== undefined) {
    const patch = resolved.themes[theme] ?? []
    for (const tok of patch) lookup[tok.varName] = tok.value
  }
  return lookup
}

function setKey(common: Record<string, unknown>, key: NaiveCommonKey | readonly NaiveCommonKey[], value: unknown): void {
  if (Array.isArray(key)) {
    for (const k of key) common[k] = value
  } else {
    common[key as NaiveCommonKey] = value
  }
}

/**
 * Build Naive UI `GlobalThemeOverrides` from a resolved ThemeOn theme.
 * All colours are emitted as hex/rgba; missing `*Hover/*Pressed/*Suppl` are derived by this
 * adapter (not delegated to Naive/seemly — P-D29). Feed the result straight into
 * `<NConfigProvider :theme-overrides="…">`.
 */
export function toNative(resolved: ResolvedTheme, opts?: ToNativeOptions): GlobalThemeOverrides {
  const lookup = buildLookup(resolved, opts?.theme)
  const common: Record<string, unknown> = {}

  for (const [varName, entry] of Object.entries(NAIVE_COMMON_MAP) as [CssVarName, (typeof NAIVE_COMMON_MAP)[CssVarName]][]) {
    const raw = lookup[varName]
    if (raw === undefined) continue
    const value = entry.kind === 'color' ? toHex(raw) : raw
    setKey(common, entry.key, value)
  }

  // Derived hover/pressed/suppl — только для отсутствующих в lookup суффиксов (Rule 4:
  // явная роль темы всегда сильнее деривации).
  for (const { base, hover, pressed, suppl } of DERIVABLE_BASES) {
    const baseRaw = lookup[base]
    if (baseRaw === undefined) continue
    const baseHex = toHex(baseRaw)
    const derived = deriveInteractionStates(baseHex)
    if (common[hover] === undefined) common[hover] = derived.hover
    if (common[pressed] === undefined) common[pressed] = derived.pressed
    if (common[suppl] === undefined) common[suppl] = derived.suppl
  }

  return mergeOverrides({ common } as GlobalThemeOverrides, opts?.overrides)
}
