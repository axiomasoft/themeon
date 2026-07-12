import { ColorSpace, contrastAPCA as contrastApcaColorjs, OKLCH, sRGB } from 'colorjs.io/fn'

import { ColorsError } from './errors'

// colorjs.io/fn (процедурный tree-shakeable вход) не регистрирует цветовые пространства
// автоматически — это обязана сделать сама библиотека-потребитель (colorjs.io/docs/procedural).
// sRGB покрывает hex/rgb()/named-цвета, OKLCH — синтаксис oklch(). Регистрация — модульный
// синглтон (побочный эффект импорта), выполняется один раз на процесс.
ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

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
    // colorjs.io/fn contrastAPCA(background, foreground) — порядок аргументов обратный
    // нашему публичному API (fg, bg); см. Required Reads item'а https://colorjs.io/docs/contrast.
    return contrastApcaColorjs(bg, fg)
  } catch {
    throw new ColorsError(
      'BAD_COLOR',
      `Could not parse color pair for APCA contrast: fg=${JSON.stringify(fg)}, bg=${JSON.stringify(bg)}`,
    )
  }
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
