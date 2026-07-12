import {
  ColorSpace,
  contrastAPCA as contrastApcaColorjs,
  HSL,
  HWB,
  Lab,
  LCH,
  OKLCH,
  P3,
  sRGB,
  to,
} from 'colorjs.io/fn'

import { ColorsError } from './errors'

// colorjs.io/fn (процедурный tree-shakeable вход) не регистрирует цветовые пространства
// автоматически — это обязана сделать сама библиотека-потребитель (colorjs.io/docs/procedural).
// Регистрируем весь набор синтаксисов, легальных в CSS Color 4/5, которые может прислать
// tenant-тема или CLI-пользователь: hex/rgb()/named (sRGB), oklch(), hsl(), hwb(), lab(), lch(),
// color(display-p3 ...). Регистрация — модульный синглтон (побочный эффект импорта), один раз
// на процесс. Найдено code-review P2.1 (MED): без этого валидные цвета типа hsl()/lab()/lch()/
// hwb()/color() бросали BAD_COLOR.
ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)
ColorSpace.register(HSL)
ColorSpace.register(HWB)
ColorSpace.register(Lab)
ColorSpace.register(LCH)
ColorSpace.register(P3)

export type ContrastUsage = 'body' | 'text' | 'large' | 'non-text'

/** Минимальные |Lc| по назначению (APCA Nutshell): body 75, прочий текст 60, крупный/non-text 45. */
export const LC_THRESHOLDS: Readonly<Record<ContrastUsage, number>> = {
  body: 75,
  text: 60,
  large: 45,
  'non-text': 45,
}

/**
 * Знаковый APCA Lc (fg поверх bg). Отрицательный — light-on-dark; сравнивать по |Lc|.
 *
 * @throws {ColorsError} code `BAD_COLOR` на непарсибельном цвете (fail-closed).
 */
export function contrastAPCA(fg: string, bg: string): number {
  try {
    // APCA расcчитан на непрозрачные цвета; полупрозрачный fg/bg молча трактовался бы
    // colorjs.io как опаковый (canvas-«fail open» — найдено code-review P2.1, MED), поэтому
    // альфа-канал явно сплющивается до подложки перед вызовом contrastAPCA.
    const { bgOpaque, fgOpaque } = flattenAlpha(fg, bg)
    // colorjs.io/fn contrastAPCA(background, foreground) — порядок аргументов обратный
    // нашему публичному API (fg, bg); см. Required Reads item'а https://colorjs.io/docs/contrast.
    return contrastApcaColorjs(bgOpaque, fgOpaque)
  } catch (error) {
    throw new ColorsError(
      'BAD_COLOR',
      `Could not parse color pair for APCA contrast: fg=${JSON.stringify(fg)}, bg=${JSON.stringify(bg)}`,
      { cause: error },
    )
  }
}

/** Непрозрачный sRGB-цвет как color object colorjs.io (для повторного использования как подложки/входа APCA). */
interface OpaqueSRGBColor {
  readonly space: 'srgb'
  readonly coords: [number, number, number]
  readonly alpha: 1
}

/**
 * Сплющивает альфа-канал fg/bg до непрозрачных sRGB-цветов перед APCA.
 * bg с альфой композитится на белую подложку (дефолт браузера для страницы);
 * fg с альфой композитится на уже сплющенный bg — так «просвечивающий» текст
 * реально теряет контраст, а не считается как опаковый (fail-closed, не fail-open).
 */
function flattenAlpha(fg: string, bg: string): { fgOpaque: OpaqueSRGBColor; bgOpaque: OpaqueSRGBColor } {
  const WHITE: readonly [number, number, number] = [1, 1, 1]
  // alpha: null — CSS-ключевое слово `none` (missing component), трактуем как непрозрачный (1),
  // как это делает сам colorjs.io при сериализации/рендере.
  const bgSrgb = to(bg, 'srgb')
  const bgCoords = compositeOver(bgSrgb.coords as [number, number, number], bgSrgb.alpha ?? 1, WHITE)
  const fgSrgb = to(fg, 'srgb')
  const fgCoords = compositeOver(fgSrgb.coords as [number, number, number], fgSrgb.alpha ?? 1, bgCoords)
  return {
    fgOpaque: { space: 'srgb', coords: fgCoords, alpha: 1 },
    bgOpaque: { space: 'srgb', coords: bgCoords, alpha: 1 },
  }
}

/** Porter-Duff «src over opaque backdrop»: coords*alpha + backdrop*(1-alpha). При alpha=1 — тождество. */
function compositeOver(
  coords: readonly [number, number, number],
  alpha: number,
  backdrop: readonly [number, number, number],
): [number, number, number] {
  if (alpha >= 1) return [coords[0], coords[1], coords[2]]
  return [
    coords[0] * alpha + backdrop[0] * (1 - alpha),
    coords[1] * alpha + backdrop[1] * (1 - alpha),
    coords[2] * alpha + backdrop[2] * (1 - alpha),
  ]
}

export interface ContrastPair {
  readonly fg: string
  readonly bg: string
  readonly usage: ContrastUsage
  /** Человекочитаемая метка пары для отчёта: 'text on bg.page'. */
  readonly label?: string
}

export interface ContrastReport {
  readonly pair: ContrastPair
  readonly lc: number
  readonly required: number
  readonly pass: boolean
}

export interface ContrastCheckResult {
  readonly pass: boolean
  readonly reports: readonly ContrastReport[]
}

/** Батч-гейт: pass = ВСЕ пары прошли. Непарсибельная пара = throw (fail-closed), не skip. */
export function checkContrast(pairs: readonly ContrastPair[]): ContrastCheckResult {
  const reports = pairs.map((pair): ContrastReport => {
    const lc = contrastAPCA(pair.fg, pair.bg)
    const required = LC_THRESHOLDS[pair.usage]
    return { pair, lc, required, pass: Math.abs(lc) >= required }
  })

  return { pass: reports.every((report) => report.pass), reports }
}
