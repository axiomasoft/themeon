import Color from 'colorjs.io'
import { STEP10_DELTA } from '@themeon/colors'

function clampLightness(l: number): number {
  return Math.min(1, Math.max(0, l))
}

/**
 * Парсит любой CSS-цвет (hex/rgb/oklch/hsl/…) через colorjs.io и возвращает hex (или hex8 при
 * альфе < 1) — единственный формат, в котором цвета попадают в Naive `common` (инвариант 3,
 * P-D29: не полагаемся на seemly-поддержку oklch). Непарсибельное значение возвращается как
 * есть — адаптер не логирует (нет consola-зависимости), невалидный цвет ловит `themeon check`
 * (P4.5), не рантайм адаптера.
 */
export function toHex(value: string): string {
  try {
    // collapse:false — запрещает colorjs.io схлопывать до 3/4-значного shorthand-hex
    // (`#35f`), Naive/consumers ожидают полноразрядный `#rrggbb[aa]`.
    return new Color(value).toString({ format: 'hex', collapse: false })
  } catch {
    return value
  }
}

/**
 * Строгий брат `toHex` (P8.8, findings/P8-naive-color-canon.md §1.3): бросает на
 * непарсибельном значении (`var()`, `color-mix()`, `light-dark()`, relative-color,
 * `currentColor`, `calc()`, …) вместо тихого passthrough. `toNative()` использует ТОЛЬКО
 * этот вариант — passthrough из `toHex` и есть корень Blocker #2 (var()-строка доезжает
 * до seemly и роняет рендер чужого компонента без адреса роли).
 */
export function toHexStrict(value: string): string {
  return new Color(value).toString({ format: 'hex', collapse: false })
}

function shiftL(hex: string, delta: number): string {
  const c = new Color(hex).to('oklch')
  c.oklch.l = clampLightness((c.oklch.l as number) + delta)
  return c.toGamut({ space: 'srgb' }).toString({ format: 'hex', collapse: false })
}

/** Кратчайшая дуга h0→h1 (deg, wrap 360), экстраполированная на коэффициент `k`. NaN-hue (ахроматика) не двигает угол. */
function extrapolateHue(h0: number, h1: number, k: number): number {
  if (Number.isNaN(h0)) return h1
  if (Number.isNaN(h1)) return h0
  const shortestDelta = ((((h1 - h0) % 360) + 540) % 360) - 180
  return (((h0 + k * shortestDelta) % 360) + 360) % 360
}

/**
 * Экстраполирует вектор `base→hover` в OKLCH на коэффициент `k` (L/C линейно, H — кратчайшей
 * дугой), gamut-safe. Канон pressed = hover, продолженный в ту же сторону (findings
 * `P8-naive-color-canon.md` §3.3): работает для любой шкалы темы (не только Radix-формы),
 * т.к. направление читается из самого вектора, а не из константы.
 */
function extrapolateOklch(baseHex: string, hoverHex: string, k: number): string {
  const base = new Color(baseHex).to('oklch')
  const hover = new Color(hoverHex).to('oklch')
  const l = clampLightness((base.oklch.l as number) + k * ((hover.oklch.l as number) - (base.oklch.l as number)))
  const c = Math.max(0, (base.oklch.c as number) + k * ((hover.oklch.c as number) - (base.oklch.c as number)))
  const h = extrapolateHue(base.oklch.h as number, hover.oklch.h as number, k)
  return new Color('oklch', [l, c, h]).toGamut({ space: 'srgb' }).toString({ format: 'hex', collapse: false })
}

export interface DeriveInput {
  /** Базовая заливка (solid), hex — источник, от которого деривятся отсутствующие состояния. */
  base: string
  /** Направление шкалы темы: light → hover темнее base (Radix step 10), dark → светлее. */
  appearance: 'light' | 'dark'
  /** Явная роль `<base>-hover` темы, если задана — побеждает деривацию (Rule 4). */
  hover?: string
  /** Явная роль `<base>-pressed` темы, если задана — побеждает деривацию (Rule 4). */
  pressed?: string
  /** Явная роль `<base>-suppl` темы, если задана — побеждает деривацию (Rule 4). */
  suppl?: string
}

/**
 * Деривит hover/pressed/suppl согласованно со шкалой темы (P8.9, findings/
 * P8-naive-color-canon.md §3.3, суперседит P-D29 фиксированные ±L-дельты):
 *
 *   hover   = явная роль темы, иначе `base + Δ(appearance)` (Δ = `STEP10_DELTA`, шаг 9→10 шкалы)
 *   pressed = явная роль темы, иначе — при явном hover: экстраполяция вектора `base→hover`
 *             (k=2); иначе `base + 2·Δ(appearance)`
 *   suppl   = явная роль темы, иначе `base` (identity — наш solid уже живёт в наивовской
 *             полосе `*ColorSuppl`, §3.2)
 *
 * Приоритет «явная роль темы > деривация» — Rule 4 (P-D14/P4.2), не переоткрывается здесь.
 */
export function deriveInteractionStates(i: DeriveInput): { hover: string; pressed: string; suppl: string } {
  const delta = STEP10_DELTA[i.appearance]
  const hover = i.hover ?? shiftL(i.base, delta)
  const pressed = i.pressed ?? (i.hover !== undefined ? extrapolateOklch(i.base, i.hover, 2) : shiftL(i.base, 2 * delta))
  const suppl = i.suppl ?? i.base
  return { hover, pressed, suppl }
}
