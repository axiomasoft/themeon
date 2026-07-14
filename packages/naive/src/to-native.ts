import { ThemeonError } from '@themeon/core'
import type { CssVarName, ResolvedTheme } from '@themeon/core'
import type { GlobalThemeOverrides } from 'naive-ui'
import { DERIVABLE_BASES, NAIVE_COMMON_MAP, type NaiveCommonKey } from './common-map'
import {
  ACCENT_INK_BUTTON_SUFFIXES,
  ACCENT_INK_SOURCE,
  ACCENT_INK_TARGETS,
  BUTTON_INK_STATES,
  PRIMARY_INK_TARGETS_BOTH_APPEARANCES,
  PRIMARY_INK_TARGETS_DARK_ONLY,
  STATUS_INK_SOURCES,
} from './ink-map'
import { deriveInteractionStates, toHexStrict } from './color'
import { mergeOverrides } from './merge'
import type { ToNativeOptions } from './types'

/**
 * Строит плоский lookup varName→ЛИТЕРАЛ: `resolved.tokens[].value`, перекрытый (если задан
 * `opts.theme`) записями соответствующего патча `resolved.themes[theme]` (P8.8, Blocker #2,
 * findings/P8-naive-color-canon.md §1.1). `resolved.vars` — транспорт для CSS-эмита
 * (var-chain при `refLayer:'referenced'`/`'all'`), НЕ источник значений для адаптеров;
 * читать его здесь — регрессия блокера (T12 паритет по трём refLayer это ловит).
 */
function buildLookup(resolved: ResolvedTheme, theme?: string): Record<string, string> {
  const lookup: Record<string, string> = {}
  for (const tok of resolved.tokens) lookup[tok.varName] = tok.value
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

function setComponentKey(overrides: Record<string, Record<string, unknown>>, component: string, key: string, value: unknown): void {
  ;(overrides[component] ??= {})[key] = value
}

/** `opts.appearance` явный > `resolved.schemes[opts.theme]` > `'light'` (findings §5). */
function appearanceOf(resolved: ResolvedTheme, opts?: ToNativeOptions): 'light' | 'dark' {
  if (opts?.appearance) return opts.appearance
  if (opts?.theme !== undefined) {
    const scheme = resolved.schemes[opts.theme]
    if (scheme) return scheme
  }
  return 'light'
}

/**
 * Build Naive UI `GlobalThemeOverrides` from a resolved ThemeOn theme.
 * All colours are emitted as hex/rgba; missing `*Hover/*Pressed/*Suppl` are derived by this
 * adapter (not delegated to Naive/seemly — P-D29). Feed the result straight into
 * `<NConfigProvider :theme-overrides="…">`.
 *
 * Fail-loud (P8.8): a colour role that resolves to a value `colorjs.io`/seemly cannot parse
 * (`var()`, `color-mix()`, `light-dark()`, relative-color syntax, `currentColor`, `calc()`, …)
 * makes `toNative()` throw `ThemeonError('BAD_COLOR')` listing every offending role, unless
 * `opts.onInvalidColor === 'skip'` (then the role is simply omitted — Naive keeps its stock
 * value, same tolerance as a partial theme, D3).
 */
export function toNative(resolved: ResolvedTheme, opts?: ToNativeOptions): GlobalThemeOverrides {
  const lookup = buildLookup(resolved, opts?.theme)
  const appearance = appearanceOf(resolved, opts)
  const common: Record<string, unknown> = {}
  const componentOverrides: Record<string, Record<string, unknown>> = {}
  // `varName → raw` — Map, не array: несколько таблиц (common-map, DERIVABLE_BASES, INK)
  // читают одну и ту же роль (напр. `--color-action-primary`, `--color-on-primary`-фолбэк) —
  // без дедупа сообщение об ошибке дублировало бы строки и завышало счётчик (code-review P8.8).
  const bad = new Map<string, string>()

  const color = (varName: CssVarName): string | undefined => {
    const raw = lookup[varName]
    if (raw === undefined) return undefined
    try {
      return toHexStrict(raw)
    } catch {
      bad.set(varName, raw)
      return undefined
    }
  }

  for (const [varName, entry] of Object.entries(NAIVE_COMMON_MAP) as [CssVarName, (typeof NAIVE_COMMON_MAP)[CssVarName]][]) {
    const raw = lookup[varName]
    if (raw === undefined) continue
    const value = entry.kind === 'color' ? color(varName) : raw
    if (value === undefined) continue
    setKey(common, entry.key, value)
  }

  // hover/pressed/suppl (P8.9, findings/P8-naive-color-canon.md §3.3): явная роль темы
  // побеждает деривацию (Rule 4) — `deriveInteractionStates` сама решает, какие состояния
  // взять готовыми, какие вывести по канону (pressed = экстраполяция base→hover, suppl = base).
  for (const { base, hoverVar, pressedVar, supplVar, hoverKey, pressedKey, supplKey } of DERIVABLE_BASES) {
    if (lookup[base] === undefined) continue
    const baseHex = color(base)
    if (baseHex === undefined) continue
    const hover = lookup[hoverVar] !== undefined ? color(hoverVar) : undefined
    const pressed = lookup[pressedVar] !== undefined ? color(pressedVar) : undefined
    const suppl = lookup[supplVar] !== undefined ? color(supplVar) : undefined
    const derived = deriveInteractionStates({ base: baseHex, appearance, hover, pressed, suppl })
    common[hoverKey] = derived.hover
    common[pressedKey] = derived.pressed
    common[supplKey] = derived.suppl
  }

  // INK-таблица (§2.5): чернила на заливках, per-component, только для ролей, которыми
  // владеет тема. `baseColor` намеренно не трогается (см. common-map.ts).
  for (const { base, onRole, suffix } of STATUS_INK_SOURCES) {
    if (lookup[base] === undefined) continue
    // Фолбэк на --color-on-primary только когда своя on-роль ОТСУТСТВУЕТ в теме (D3). Если
    // она присутствует, но невалидна, это не «роли нет» — тихая подмена на primary-чернила
    // маскировала бы конфигурационную ошибку темы (code-review P8.8, onInvalidColor:'skip'
    // обязан реально пропускать роль, а не подставлять другую).
    const onRoleGiven = onRole === '--color-on-primary' || lookup[onRole] !== undefined
    const ink = onRoleGiven ? color(onRole) : color('--color-on-primary')
    if (ink === undefined) continue

    for (const state of BUTTON_INK_STATES) setComponentKey(componentOverrides, 'Button', `textColor${state}${suffix}`, ink)

    if (suffix !== 'Primary') continue
    for (const { component, key } of PRIMARY_INK_TARGETS_BOTH_APPEARANCES) setComponentKey(componentOverrides, component, key, ink)
    if (appearance === 'dark') {
      for (const { component, key } of PRIMARY_INK_TARGETS_DARK_ONLY) setComponentKey(componentOverrides, component, key, ink)
    }
  }

  // ACCENT-INK (§4.1): primaryColor у Naive — И заливка, И чернила на канве (меню/ссылки/
  // табы поверх bodyColor). `--color-link` (accent step 11) подобрана под текст, `--color-
  // on-primary` — под заливку; смешивать их нельзя (в dark даёт Lc 30.8, находка §4.1).
  const accentInk = color(ACCENT_INK_SOURCE)
  if (accentInk !== undefined) {
    for (const suffix of ACCENT_INK_BUTTON_SUFFIXES) setComponentKey(componentOverrides, 'Button', `${suffix}Primary`, accentInk)
    for (const { component, key } of ACCENT_INK_TARGETS) setComponentKey(componentOverrides, component, key, accentInk)
  }

  if (bad.size && (opts?.onInvalidColor ?? 'throw') === 'throw') {
    const lines = Array.from(bad, ([varName, raw]) => `${varName}: ${raw}`)
    throw new ThemeonError(
      'BAD_COLOR',
      `@themeon/naive: ${bad.size} color role(s) are not literal colours — Naive/seemly cannot ` +
        `consume them:\n  ${lines.join('\n  ')}\n` +
        'Colours must be resolvable by colorjs.io (hex/rgb/hsl/oklch/…). ' +
        'var()/color-mix()/light-dark()/currentColor/relative-color/calc() are not supported by seemly.',
    )
  }

  return mergeOverrides({ common, ...componentOverrides } as GlobalThemeOverrides, opts?.overrides)
}
