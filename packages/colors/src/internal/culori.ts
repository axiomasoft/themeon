// Единственная точка useMode-регистраций для @themeon/colors (сквозное правило фазы P2,
// Implementation Rules item'а P2.2): нигде больше в пакете useMode не вызывается.
// culori/fn (tree-shakeable процедурный вход) не регистрирует цветовые пространства сам —
// регистрируем ровно те, что нужны генератору шкалы: rgb (парсинг hex/rgb()/named-цветов +
// sRGB как gamut-цель по умолчанию), oklch (рабочее пространство шкалы, парсинг oklch()-строк
// seed'а) и p3 (опциональная gamut-цель ScaleOptions.gamut === 'p3').
// https://culorijs.org/guides/tree-shaking/
import { formatHex, inGamut, modeOklch, modeP3, modeRgb, toGamut, useMode } from 'culori/fn'

// Явные локальные типы координат вместо `ConvertFn<M>` из @types/culori: TS 6.0 отказывается
// именовать этот тип в .d.ts-выводе экспортируемых констант («cannot be named without a
// reference» — не часть публичного API 'culori/fn', только внутренний .d.ts-путь пакета).
// Минимальные структурные типы ниже покрывают ровно то, что реально используется в scale.ts.
export interface OklchColor {
  readonly mode: 'oklch'
  readonly l?: number
  readonly c?: number
  readonly h?: number
  readonly alpha?: number
}

interface RgbLikeColor {
  readonly mode: 'rgb' | 'p3'
  readonly r?: number
  readonly g?: number
  readonly b?: number
  readonly alpha?: number
}

type ColorInput = string | { readonly mode: string } | undefined

// useMode() одновременно регистрирует пространство (побочный эффект) и возвращает конвертер —
// сырые конвертеры держим модульно-приватными и оборачиваем в функции с нашими явными
// сигнатурами (см. комментарий выше про TS2883); каст на границе оправдан тем, что оба конца
// границы контролируются этим же файлом.
const oklchConverter = useMode(modeOklch)
const rgbConverter = useMode(modeRgb)
const p3Converter = useMode(modeP3)

/** oklch()-конвертер: строка/объект любого зарегистрированного пространства → {mode:'oklch', l, c, h, alpha}. */
export function oklch(color: ColorInput): OklchColor | undefined {
  return oklchConverter(color as never) as OklchColor | undefined
}

/** rgb()-конвертер: попутно регистрирует парсеры hex/rgb()/named/rgba() (culori/fn rgb/definition.js). */
export function rgb(color: ColorInput): RgbLikeColor | undefined {
  return rgbConverter(color as never) as RgbLikeColor | undefined
}

/** display-p3-конвертер — используется только при ScaleOptions.gamut === 'p3'. */
export function p3(color: ColorInput): RgbLikeColor | undefined {
  return p3Converter(color as never) as RgbLikeColor | undefined
}

export { formatHex, inGamut, toGamut }
