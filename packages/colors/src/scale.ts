import { contrastAPCA } from './contrast'
import { ColorsError } from './errors'
import { formatHex, oklch, toGamut } from './internal/culori'

export interface ScaleOptions {
  /** Целевая тема шкалы. Деф. 'light'. */
  readonly appearance?: 'light' | 'dark'
  /** Гамма назначения gamut-маппинга. Деф. 'srgb'. */
  readonly gamut?: 'srgb' | 'p3'
}

export interface ScaleStep {
  /** 1..12 (семантика Radix). */
  readonly index: number
  readonly l: number
  readonly c: number
  readonly h: number
  /** 'oklch(0.9931 0.0031 155.2)' — детерминированная сериализация. */
  readonly css: string
  /** '#f8faf8' — всегда sRGB-маппинг (даже при gamut:'p3'), для legacy-потребителей. */
  readonly hex: string
}

/** Ровно 12 элементов. */
export type Scale = readonly ScaleStep[]

/** Роли шагов (Radix-семантика) — для доков/адаптеров. 12 английских строк. */
export const STEP_ROLES: readonly string[] = [
  'App background',
  'Subtle background',
  'UI element background',
  'Hovered UI element background',
  'Active or selected UI element background',
  'Subtle borders and separators',
  'UI element border and focus rings',
  'Hovered UI element border',
  'Solid background (seed)',
  'Hovered solid background',
  'Low-contrast text',
  'High-contrast text',
]

// Нормированная кривая интерполяции lightness шагов 1..9 (стартовые значения из
// реконструкций Radix — breakcolorui.com/docs/colors, oklch.fyi/color-palettes;
// правило 7 фазы P2 — тюнинг ±0.03 допустим, инварианты-тесты не меняются).
const LIGHTNESS_T = [0, 0.03, 0.085, 0.145, 0.22, 0.31, 0.43, 0.6, 1.0] as const

interface AppearanceParams {
  /** Lightness шага 1 («App background»). */
  readonly l1: number
  /** Пик гауссианы chroma по lightness. */
  readonly mu: number
  /** Смещение lightness шага 10 (hover solid) относительно шага 9 (seed). */
  readonly step10Delta: number
}

const APPEARANCE_PARAMS: Readonly<Record<'light' | 'dark', AppearanceParams>> = {
  light: { l1: 0.993, mu: 0.6, step10Delta: -0.045 },
  dark: { l1: 0.188, mu: 0.66, step10Delta: 0.045 },
}

const CHROMA_SIGMA = 0.18
const STEP1_CHROMA_CAP = 0.01
const STEP2_CHROMA_CAP = 0.02
const STEP11_TARGET_LC = 68
const STEP12_TARGET_LC = 90
const BINARY_SEARCH_ITERATIONS = 24

interface RawStep {
  readonly l: number
  readonly c: number
  readonly h: number
}

/** Гауссов вес chroma для данного lightness (пик в mu, ширина CHROMA_SIGMA). */
function gaussianWeight(l: number, mu: number): number {
  return Math.exp(-((l - mu) ** 2) / (2 * CHROMA_SIGMA ** 2))
}

/** Детерминированная сериализация oklch()-строки (L/C — 4 знака, H — 2 знака; ахромат — `oklch(L 0 0)`). */
function formatOklchCss(l: number, c: number, h: number): string {
  if (c === 0) return `oklch(${l.toFixed(4)} 0 0)`
  return `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`
}

/**
 * Gamut-маппинг сырых OKLCH-координат в целевую гамму через `toGamut` culori (алгоритм
 * CSS Color 4, НЕ `clampChroma` — R-12 §2), с обратной конвертацией результата в OKLCH-
 * координаты для сериализации.
 */
function mapToGamutOklch(raw: RawStep, dest: 'rgb' | 'p3'): RawStep {
  const mapped = toGamut(dest, 'oklch')({ mode: 'oklch', l: raw.l, c: raw.c, h: raw.h })
  const back = oklch(mapped)
  return { l: back?.l ?? 0, c: back?.c ?? 0, h: back?.h ?? 0 }
}

/**
 * Строит один `ScaleStep` из сырых OKLCH-координат. Для ахроматного seed (c9 === 0) chroma
 * шага гарантированно 0 уже по формуле (умножение на 0), но округление через gamut-маппинг
 * (oklch → rgb/p3 → oklch) может внести плавающий шум — обходим полный pipeline и строим
 * серый шаг напрямую, чтобы инвариант «c === 0, h === 0» выполнялся точным равенством.
 */
function buildStep(index: number, raw: RawStep, isAchromatic: boolean, destGamut: 'rgb' | 'p3'): ScaleStep {
  if (isAchromatic) {
    const l = Math.min(1, Math.max(0, raw.l))
    const hex = formatHex({ mode: 'oklch', l, c: 0, h: 0 })
    return { index, l, c: 0, h: 0, css: formatOklchCss(l, 0, 0), hex }
  }

  const mappedForCss = mapToGamutOklch(raw, destGamut)
  const mappedForHex = destGamut === 'rgb' ? mappedForCss : mapToGamutOklch(raw, 'rgb')
  const hex = formatHex({ mode: 'oklch', l: mappedForHex.l, c: mappedForHex.c, h: mappedForHex.h })

  return {
    index,
    l: mappedForCss.l,
    c: mappedForCss.c,
    h: mappedForCss.h,
    css: formatOklchCss(mappedForCss.l, mappedForCss.c, mappedForCss.h),
    hex,
  }
}

/**
 * Бинарный поиск (24 итерации) lightness кандидата с фиксированными chroma/hue так, чтобы
 * `|contrastAPCA(candidate, bg)|` сошёлся к `target`. APCA монотонен по luminance при
 * фиксированном фоне (R-12 §4/§3), поэтому направление поиска определяется эмпирически по
 * знаку `evaluate(lo) - evaluate(hi)` — работает симметрично для light (contrast убывает
 * при росте L) и dark (contrast растёт при росте L) тем. Если целевой Lc недостижим
 * (упёрлись в границу диапазона) — сходится к ближайшему достижимому краю.
 */
function solveLightnessForContrast(params: {
  readonly target: number
  readonly c: number
  readonly h: number
  readonly bgCss: string
  readonly lLow: number
  readonly lHigh: number
}): number {
  const evaluate = (l: number): number => Math.abs(contrastAPCA(formatOklchCss(l, params.c, params.h), params.bgCss))

  let low = params.lLow
  let high = params.lHigh
  const decreasing = evaluate(low) > evaluate(high)

  for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const val = evaluate(mid)
    const tooFarTowardHigh = decreasing ? val < params.target : val > params.target
    if (tooFarTowardHigh) {
      high = mid
    } else {
      low = mid
    }
  }

  return (low + high) / 2
}

/**
 * seed → 12-шаговая OKLCH-шкала формы Radix (роли — `STEP_ROLES`). Шаги 1-9 — интерполяция
 * lightness по `LIGHTNESS_T` от фонового якоря к seed (шаг 9), chroma — гауссово
 * распределение вокруг `mu`; шаг 10 — hover solid; шаги 11-12 — contrast-solved текст
 * (бинарный поиск lightness под целевой |Lc| относительно шага 2).
 *
 * @throws {ColorsError} code `BAD_SEED` на непарсибельном seed.
 */
export function generateScale(seed: string, opts: ScaleOptions = {}): Scale {
  const appearance = opts.appearance ?? 'light'
  const destGamut: 'rgb' | 'p3' = opts.gamut === 'p3' ? 'p3' : 'rgb'

  const seedColor = oklch(seed)
  if (seedColor === undefined) {
    throw new ColorsError('BAD_SEED', `Could not parse seed color for scale generation: ${JSON.stringify(seed)}`)
  }

  const l9 = seedColor.l ?? 0
  const c9 = seedColor.c ?? 0
  const h = seedColor.h ?? 0
  const isAchromatic = c9 === 0

  const { l1, mu, step10Delta } = APPEARANCE_PARAMS[appearance]
  const g9 = gaussianWeight(l9, mu)

  const built: ScaleStep[] = []
  for (let i = 1; i <= 9; i++) {
    const t = LIGHTNESS_T[i - 1]!
    const l = l1 + (l9 - l1) * t
    let c = c9 * Math.min(1.2, gaussianWeight(l, mu) / g9)
    if (i === 1) c = Math.min(c, STEP1_CHROMA_CAP)
    if (i === 2) c = Math.min(c, STEP2_CHROMA_CAP)
    built.push(buildStep(i, { l, c, h }, isAchromatic, destGamut))
  }

  const l10 = Math.min(1, Math.max(0, l9 + step10Delta))
  const c10 = c9 * Math.min(1.2, gaussianWeight(l10, mu) / g9)
  built.push(buildStep(10, { l: l10, c: c10, h }, isAchromatic, destGamut))

  // Шаги 1..10 построены по порядку выше — второй элемент built всегда шаг с index === 2.
  const step2 = built[1]!

  const [lLow, lHigh] = appearance === 'light' ? [0, l10] : [l10, 1]

  const c11 = Math.min(c9 * 0.9, 0.13)
  const l11 = solveLightnessForContrast({ target: STEP11_TARGET_LC, c: c11, h, bgCss: step2.css, lLow, lHigh })
  built.push(buildStep(11, { l: l11, c: c11, h }, isAchromatic, destGamut))

  const c12 = Math.min(c9 * 0.5, 0.08)
  const l12 = solveLightnessForContrast({ target: STEP12_TARGET_LC, c: c12, h, bgCss: step2.css, lLow, lHigh })
  built.push(buildStep(12, { l: l12, c: c12, h }, isAchromatic, destGamut))

  return built
}

/** Светлая + тёмная пара шкал из одного seed. */
export function generateScalePair(
  seed: string,
  opts: Omit<ScaleOptions, 'appearance'> = {},
): { readonly light: Scale; readonly dark: Scale } {
  return {
    light: generateScale(seed, { ...opts, appearance: 'light' }),
    dark: generateScale(seed, { ...opts, appearance: 'dark' }),
  }
}

/** Шаги → плоский словарь {'1': 'oklch(…)', …, '12': 'oklch(…)'} для defineTokens. */
export function scaleToTokens(scale: Scale): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const step of scale) {
    tokens[String(step.index)] = step.css
  }
  return tokens
}
