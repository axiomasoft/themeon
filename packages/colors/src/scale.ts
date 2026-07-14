import { contrastAPCA } from './contrast'
import { ColorsError, type ColorsErrorCode } from './errors'
import { formatHex, oklch, p3, rgb, toGamut } from './internal/culori'

export interface ScaleOptions {
  /** Целевая тема шкалы. Деф. 'light'. */
  readonly appearance?: 'light' | 'dark'
  /** Гамма назначения gamut-маппинга. Деф. 'srgb'. */
  readonly gamut?: 'srgb' | 'p3'
  /**
   * Что делать, если L(seed) вне полосы solid-роли `[SEED_L_MIN, SEED_L_MAX]`:
   *  'error' (деф.) — `ColorsError('SEED_OUT_OF_BAND')` с actionable-сообщением (fail-closed, D15);
   *  'clamp'        — нормализовать L в полосу (C/H сохраняются) и сообщить об этом через `onSeedAdjusted`.
   */
  readonly seedPolicy?: 'error' | 'clamp'
  /** Вызывается при `seedPolicy:'clamp'`, когда seed действительно скорректирован. */
  readonly onSeedAdjusted?: (info: { readonly from: number; readonly to: number }) => void
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

// Медианы 31 опубликованной шкалы Radix Colors 3.0.0 (findings/P8-colors-scale-apca.md §2.1).
// Шаги 1..8, 11, 12 у Radix почти ФИКСИРОВАНЫ по lightness (разброс по всем 31 hue ≤0.09-0.14);
// варьируются только 9 (= seed) и 10 (= seed ± d10). Это форма Radix — не наша реконструкция.
const RAMP: Readonly<
  Record<'light' | 'dark', { readonly bg: readonly number[]; readonly l11: number; readonly l12: number; readonly d10: number }>
> = {
  light: { bg: [0.993, 0.982, 0.957, 0.932, 0.9, 0.86, 0.809, 0.741], l11: 0.525, l12: 0.31, d10: -0.03 },
  dark: { bg: [0.187, 0.212, 0.26, 0.295, 0.335, 0.386, 0.45, 0.532], l11: 0.781, l12: 0.914, d10: 0.041 },
}

/** Пик гауссианы chroma по lightness (не изменён P8.5 — только база/cap chroma). */
const MU: Readonly<Record<'light' | 'dark', number>> = { light: 0.6, dark: 0.66 }

const CHROMA_SIGMA = 0.18
const STEP1_CHROMA_CAP = 0.01
const STEP2_CHROMA_CAP = 0.02

// Полоса L(seed) для роли «шаг 9 = solid background» (findings §3.1, свип на эталонной
// реализации). Radix живёт в [0.53, 0.92] — наша полоса шире с запасом в обе стороны.
export const SEED_L_MIN = 0.5
export const SEED_L_MAX = 0.93

// Floor'ы APCA против шага 2 — дословно из доки Radix («guaranteed to Lc 60 and Lc 90 on top
// of a step 2 background»). НЕ точные цели — гарантия «не ниже», не «ровно» (findings §3.2).
const LC11_FLOOR = 60
const LC12_FLOOR = 90

// Минимальная разделимость по пост-gamut lightness: шагов 1..8 между собой (Radix min ΔL:
// 0.011 light / 0.025 dark) и шага 11 от 10 / шага 12 от 11.
const DL_MIN = 0.02
const DL_11_12 = 0.08

// Итераций бинпоиска в enforceFloor — гард, не генератор: сходится к floor'у ТОЛЬКО если
// фиксированный ramp его не достиг сам.
const FLOOR_SEARCH_ITERATIONS = 40
// Число попыток раздвинуть шаг 11 от шага 10 на пост-gamut lightness (DL_MIN * k).
const STEP11_SEPARATION_ATTEMPTS = 6

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

// Шаг toFixed(4) для chroma — тот же грануляр, которым мы отступаем от границы гаммы ниже.
const CSS_ROUND_GRAIN = 1e-4
// Допуск на float round-trip шум (oklch → целевая гамма → парсинг css обратно), НЕ на
// саму ошибку округления сериализации (см. P2.2 code-review MED: toFixed(4)/toFixed(2)
// у крутой жёлтой границы гаммы могут увести rgb-координату за [0,1] сильнее, чем этот шум).
const GAMUT_NOISE_EPSILON = 1e-6
// Верхняя граница итераций «отступа» chroma назад в гамму после округления — на практике
// хватает 1-2 шагов по CSS_ROUND_GRAIN; ограничение защищает от зависания на патологиях.
const MAX_ROUND_GAMUT_RETREATS = 50

/** Возвращает true, если распарсенный css-шаг лежит в целевой гамме (с допуском на шум). */
function cssWithinGamut(css: string, dest: 'rgb' | 'p3'): boolean {
  const parsed = (dest === 'rgb' ? rgb(css) : p3(css)) as
    | { readonly r?: number; readonly g?: number; readonly b?: number }
    | undefined
  if (!parsed) return false
  const channels = [parsed.r ?? 0, parsed.g ?? 0, parsed.b ?? 0]
  return channels.every((v) => v >= -GAMUT_NOISE_EPSILON && v <= 1 + GAMUT_NOISE_EPSILON)
}

/**
 * Сериализует OKLCH-координаты, уже проверенные `inGamut` в целевой гамме, в css-строку и
 * гарантирует, что округление (toFixed) не вытолкнуло итоговый css за пределы этой гаммы
 * (P2.2 code-review MED — сериализация у крутой границы гаммы иначе может «сбежать» из неё).
 * При обнаружении такого сбегания отступаем chroma назад малыми шагами до возврата в гамму.
 */
function formatOklchCssInGamut(l: number, c: number, h: number, dest: 'rgb' | 'p3'): string {
  let chroma = c
  let css = formatOklchCss(l, chroma, h)
  for (let i = 0; i < MAX_ROUND_GAMUT_RETREATS && chroma > 0 && !cssWithinGamut(css, dest); i++) {
    chroma = Math.max(0, chroma - CSS_ROUND_GRAIN)
    css = formatOklchCss(l, chroma, h)
  }
  return css
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
    css: formatOklchCssInGamut(mappedForCss.l, mappedForCss.c, mappedForCss.h, destGamut),
    hex,
  }
}

/**
 * `|contrastAPCA|` кандидата (l, c, h) против `bg`, измеренный на GAMUT-МАППЛЕННОМ кандидате
 * (findings §3.2 Minor: старый код мерил на сыром OOG-кандидате, а отгружал mapped-цвет —
 * отгружаемый `|Lc|` не совпадал с измеренным).
 */
function lcAt(l: number, c: number, h: number, bg: string, dest: 'rgb' | 'p3'): number {
  const mapped = mapToGamutOklch({ l, c, h }, dest)
  return Math.abs(contrastAPCA(formatOklchCss(mapped.l, mapped.c, mapped.h), bg))
}

/**
 * ГАРД floor'а, не генератор-к-точной-цели. Фиксированный `l0` (из `RAMP`) уже даёт
 * `|Lc| >= floor` → возвращается как есть (это подавляющее большинство seed'ов — Radix-форма
 * держит floor сама по себе). Иначе — бинарный поиск сдвигает L к краю ПОЛНОГО домена
 * `[lo, hi]` ровно до floor'а. Дальний край домена (чёрный на почти-белом / белый на
 * почти-чёрном) даёт `|Lc| ≈ 105-107`, поэтому floor 60/90 достижим КОНСТРУКТИВНО;
 * недостижимость (при валидном seed'е — не должна случаться, проверено 0/34) — `throw`,
 * НИКОГДА молчаливый клэмп (это и был корень Major #12).
 */
function enforceFloor(
  l0: number,
  floor: number,
  c: number,
  h: number,
  bg: string,
  lo: number,
  hi: number,
  dest: 'rgb' | 'p3',
  code: ColorsErrorCode,
): number {
  if (lcAt(l0, c, h, bg, dest) + 1e-9 >= floor) return l0

  const edge = lcAt(lo, c, h, bg, dest) > lcAt(hi, c, h, bg, dest) ? lo : hi
  const edgeLc = lcAt(edge, c, h, bg, dest)
  if (edgeLc < floor) {
    throw new ColorsError(code, `|Lc| floor ${floor} недостижим: максимум ${edgeLc.toFixed(1)} при C=${c.toFixed(4)}`)
  }

  let low = l0
  let high = edge
  for (let i = 0; i < FLOOR_SEARCH_ITERATIONS; i++) {
    const mid = (low + high) / 2
    if (lcAt(mid, c, h, bg, dest) >= floor) {
      high = mid
    } else {
      low = mid
    }
  }
  return high
}

/**
 * seed → 12-шаговая OKLCH-шкала формы Radix (роли — `STEP_ROLES`). Шаги 1-8, 11, 12 —
 * ФИКСИРОВАННЫЙ lightness-ramp (медианы 31 опубликованной шкалы Radix, `RAMP`); шаг 9 = seed;
 * шаг 10 — hover solid (`seed ± RAMP.d10`); chroma — гауссово распределение вокруг `mu`, база —
 * ПОСТ-gamut chroma шага 9, cap 1.0 (шаг 9 никогда не обгоняется шагами 1-8/10). Floor'ы Lc
 * 60 (шаг 11) / 90 (шаг 12) против шага 2 — ГАРАНТИЯ, обеспеченная бинарным поиском-гардом
 * (`enforceFloor`) по полному lightness-домену, а не цель генератора (findings §3.2).
 *
 * @throws {ColorsError} code `BAD_SEED` на непарсибельном seed.
 * @throws {ColorsError} code `SEED_OUT_OF_BAND` — L(seed) вне `[SEED_L_MIN, SEED_L_MAX]` и
 *   `opts.seedPolicy` не `'clamp'` (деф. `'error'`).
 * @throws {ColorsError} code `CONTRAST_UNREACHABLE` — floor 60/90 недостижим на всём домене
 *   (не должно случаться для seed'а внутри полосы; страховка, не штатный путь).
 */
export function generateScale(seed: string, opts: ScaleOptions = {}): Scale {
  const appearance = opts.appearance ?? 'light'
  const destGamut: 'rgb' | 'p3' = opts.gamut === 'p3' ? 'p3' : 'rgb'
  const seedPolicy = opts.seedPolicy ?? 'error'

  const seedColor = oklch(seed)
  if (seedColor === undefined) {
    throw new ColorsError('BAD_SEED', `Could not parse seed color for scale generation: ${JSON.stringify(seed)}`)
  }

  let l9 = seedColor.l ?? 0
  const c9Raw = seedColor.c ?? 0
  const h = seedColor.h ?? 0
  const isAchromatic = c9Raw === 0

  if (l9 < SEED_L_MIN || l9 > SEED_L_MAX) {
    if (seedPolicy === 'error') {
      throw new ColorsError(
        'SEED_OUT_OF_BAND',
        `Seed lightness L=${l9.toFixed(4)} вне полосы solid-роли [${SEED_L_MIN}, ${SEED_L_MAX}] ` +
          `(шаг 9 = «solid background», Radix band [0.53, 0.92]): передай seed внутри полосы или opts.seedPolicy:'clamp'.`,
      )
    }
    const clamped = Math.min(SEED_L_MAX, Math.max(SEED_L_MIN, l9))
    opts.onSeedAdjusted?.({ from: l9, to: clamped })
    l9 = clamped
  }

  const mu = MU[appearance]
  const ramp = RAMP[appearance]
  const g9 = gaussianWeight(l9, mu)

  // Шаг 9 строится ПЕРВЫМ (findings §3.3) — его пост-gamut chroma становится базой для
  // всей шкалы, иначе клипнутый шаг 9 обгоняется in-gamut соседями даже при cap 1.0.
  const step9 = buildStep(9, { l: l9, c: c9Raw, h }, isAchromatic, destGamut)
  const c9 = step9.c

  const built: ScaleStep[] = []
  for (let i = 1; i <= 8; i++) {
    const l = ramp.bg[i - 1]!
    let c = c9 * Math.min(1.0, gaussianWeight(l, mu) / g9)
    if (i === 1) c = Math.min(c, STEP1_CHROMA_CAP)
    if (i === 2) c = Math.min(c, STEP2_CHROMA_CAP)
    built.push(buildStep(i, { l, c, h }, isAchromatic, destGamut))
  }
  built.push(step9)

  const l10 = Math.min(1, Math.max(0, l9 + ramp.d10))
  const c10 = c9 * Math.min(1.0, gaussianWeight(l10, mu) / g9)
  built.push(buildStep(10, { l: l10, c: c10, h }, isAchromatic, destGamut))

  // Шаги 1..10 построены по порядку выше — второй элемент built всегда шаг с index === 2.
  const step2 = built[1]!
  const l10Mapped = built[9]!.l

  // Домен поиска — ПОЛНЫЙ (не «от seed'а», как раньше): дальний край даёт |Lc| ≈ 105-107,
  // поэтому floor 60/90 достижим конструктивно (findings §3.2, отличие от старого (0, L10)).
  const [lo, hi] = appearance === 'light' ? [0, step2.l] : [step2.l, 1]

  const c11 = Math.min(c9 * 0.9, 0.13)
  const c12 = Math.min(c9 * (appearance === 'light' ? 0.45 : 0.3), 0.08)

  // Шаг 11: фиксированный L ramp'а + разделимость от шага 10 (на ПОСТ-gamut L!) + floor 60.
  // Правило порядка асимметрично (это форма самого Radix, не хак): light — текст всегда
  // темнее solid'а; dark — только разделимость (у ярких hue Radix кладёт 11 ниже 10).
  let step11!: ScaleStep
  for (let k = 1; k <= STEP11_SEPARATION_ATTEMPTS; k++) {
    const gap = DL_MIN * k
    let l11 = ramp.l11
    if (appearance === 'light') {
      if (l11 > l10Mapped - gap) l11 = l10Mapped - gap
    } else if (Math.abs(l11 - l10Mapped) < gap) {
      l11 = l10Mapped + gap
    }
    const l11Floored = enforceFloor(l11, LC11_FLOOR, c11, h, step2.css, lo, hi, destGamut, 'CONTRAST_UNREACHABLE')
    step11 = buildStep(11, { l: l11Floored, c: c11, h }, isAchromatic, destGamut)
    if (Math.abs(step11.l - l10Mapped) >= DL_MIN - 1e-9) break
  }
  // Fail-loud (инвариант фазы №4, adversarial-review находка Minor #1): STEP11_SEPARATION_ATTEMPTS
  // попыток исчерпаны, а разделимость от шага 10 не достигнута — не отгружать неразличимую
  // пару молча. Для seed'ов внутри валидной полосы недостижимо конструктивно (проверено 0/34).
  if (Math.abs(step11.l - l10Mapped) < DL_MIN - 1e-9) {
    throw new ColorsError(
      'CONTRAST_UNREACHABLE',
      `Шаг 11 не отделился от шага 10 по lightness (ΔL < ${DL_MIN}) за ${STEP11_SEPARATION_ATTEMPTS} попыток: L10=${l10Mapped.toFixed(4)}, L11=${step11.l.toFixed(4)}`,
    )
  }
  built.push(step11)

  // Шаг 12: фиксированный L ramp'а + разделимость от 11 + floor 90.
  const dir = appearance === 'light' ? -1 : 1
  let l12 = ramp.l12
  if (dir * (l12 - step11.l) < DL_11_12) l12 = step11.l + dir * DL_11_12
  const l12Floored = enforceFloor(l12, LC12_FLOOR, c12, h, step2.css, lo, hi, destGamut, 'CONTRAST_UNREACHABLE')
  built.push(buildStep(12, { l: l12Floored, c: c12, h }, isAchromatic, destGamut))

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
