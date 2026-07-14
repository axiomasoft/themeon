/**
 * Микро-парсер цвета для DTCG-моста (P1.7, P-D11; каноны 2025.10 — P8.11
 * `findings/P8-dtcg-2025-10-canon.md` §3/§4). Zero deps — никакого culori/colord (полный
 * color-инжиниринг живёт в `@themeon/colors`, P2). Покрывает все 14 colorSpace DTCG Color
 * Module 2025.10 без конверсии (нотация ↔ colorSpace 1:1): hex/`rgb()` → `srgb`, `oklch()`,
 * `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `color(<space> …)`, именованные CSS-цвета.
 * Непарсибельное (`var()`, `color-mix()`, неизвестное имя) → `null`, потребитель оставляет
 * legacy-строку + warning (мост `$extensions`). Обратный `formatColor` — детерминированный:
 * `srgb` с hex-fallback печатает hex, `oklch` печатает `oklch(...)`, прочие colorSpace —
 * `color(<space> …)` best-effort.
 *
 * `oklch()` получает zero-dep `hex`-fallback (§4 находки): OKLab↔linear-sRGB конверсия
 * (матрицы Ottosson, https://bottosson.github.io/posts/oklab/) + gamut-mapping по CSS Color 4
 * §13.2 (бисекция chroma, ΔEOK-порог 0.02) — сверено с `colorjs.io@0.7.0` на сетке
 * 20 828 in-gamut сэмплов: 100% байт-в-байт (см. §4 находки).
 */

import type { DTCGColorValue } from './types'

/** Округление до 5 знаков — гасит float-шум при делении каналов на 255. */
function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** Канал [0,1] → двузначный hex. */
function h2(n: number): string {
  return Math.round(clamp01(n) * 255)
    .toString(16)
    .padStart(2, '0')
}

/** Число как есть (без экспоненты/локали): `String` достаточно для наших диапазонов. */
function num(n: number): string {
  return String(n)
}

function parseHex(s: string): DTCGColorValue | null {
  const m = /^#([0-9a-f]{3,8})$/i.exec(s)
  if (!m) return null
  let h = m[1]!.toLowerCase()
  // #rgb / #rgba → удвоить каждый нибл.
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length !== 6 && h.length !== 8) return null
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const out: DTCGColorValue = {
    colorSpace: 'srgb',
    components: [round5(r), round5(g), round5(b)],
    hex: `#${h.slice(0, 6)}`,
  }
  if (h.length === 8) out.alpha = round5(parseInt(h.slice(6, 8), 16) / 255)
  return out
}

/** `rgb(58 183 191)` / `rgba(58,183,191,0.5)` / `rgb(58 183 191 / 50%)` → srgb. */
function parseRgb(s: string): DTCGColorValue | null {
  const m = /^rgba?\(([^)]+)\)$/i.exec(s)
  if (!m) return null
  const parts = m[1]!
    .split(/[,/\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 3) return null
  const chan = (p: string): number => (p.endsWith('%') ? Number(p.slice(0, -1)) / 100 : Number(p) / 255)
  const r = chan(parts[0]!)
  const g = chan(parts[1]!)
  const b = chan(parts[2]!)
  if ([r, g, b].some(Number.isNaN)) return null
  const out: DTCGColorValue = {
    colorSpace: 'srgb',
    components: [round5(r), round5(g), round5(b)],
    hex: `#${h2(r)}${h2(g)}${h2(b)}`,
  }
  if (parts.length >= 4) {
    const ap = parts[3]!
    const a = ap.endsWith('%') ? Number(ap.slice(0, -1)) / 100 : Number(ap)
    if (!Number.isNaN(a)) out.alpha = round5(a)
  }
  return out
}

// ── OKLCH → sRGB → hex, zero-dep (findings §4). Матрицы Ottosson + gamut-mapping CSS Color 4 §13.2. ──

/** OKLCH (L∈[0,1], H в градусах) → OKLab. */
function oklchToOklab(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180
  return [L, C * Math.cos(hr), C * Math.sin(hr)]
}

/** OKLab → линейный sRGB (не gamma-кодированный, может выходить за [0,1] — вне gamut). */
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

/** Обратная матрица: линейный sRGB → OKLab (нужна только для ΔEOK при gamut-mapping). */
function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ]
}

/** Линейный канал → gamma-кодированный sRGB (CSS Color 4 transfer function). */
function linearToGamma(c: number): number {
  const abs = Math.abs(c)
  if (abs <= 0.0031308) return c * 12.92
  return (c < 0 ? -1 : 1) * (1.055 * abs ** (1 / 2.4) - 0.055)
}

const GAMUT_EPS = 1e-4

function inSrgbGamut([r, g, b]: readonly number[]): boolean {
  return (
    r! >= -GAMUT_EPS && r! <= 1 + GAMUT_EPS && g! >= -GAMUT_EPS && g! <= 1 + GAMUT_EPS && b! >= -GAMUT_EPS && b! <= 1 + GAMUT_EPS
  )
}

function clampRgb([r, g, b]: readonly number[]): [number, number, number] {
  return [clamp01(r!), clamp01(g!), clamp01(b!)]
}

function deltaEOK(u: readonly number[], v: readonly number[]): number {
  return Math.sqrt((u[0]! - v[0]!) ** 2 + (u[1]! - v[1]!) ** 2 + (u[2]! - v[2]!) ** 2)
}

/**
 * OKLCH → sRGB (линейный, [0,1]³), с gamut-mapping по CSS Color 4 §13.2: бисекция chroma до
 * тех пор, пока ΔEOK между наивным clip и целевым цветом не упадёт ниже JND (0.02). In-gamut
 * цвета возвращаются точно (без бисекции).
 */
function oklchToSrgbLinear(L: number, C: number, H: number): [number, number, number] {
  const naive = oklabToLinearSrgb(...oklchToOklab(L, C, H))
  if (inSrgbGamut(naive)) return clampRgb(naive)
  if (L >= 1) return [1, 1, 1]
  if (L <= 0) return [0, 0, 0]
  const JND = 0.02
  const target = oklchToOklab(L, C, H)
  let clipped = clampRgb(naive)
  if (deltaEOK(linearSrgbToOklab(...clipped), target) < JND) return clipped
  let min = 0
  let max = C
  let minInGamut = true
  let current: [number, number, number] = naive
  while (max - min > GAMUT_EPS) {
    const chroma = (min + max) / 2
    current = oklabToLinearSrgb(...oklchToOklab(L, chroma, H))
    if (minInGamut && inSrgbGamut(current)) {
      min = chroma
      continue
    }
    clipped = clampRgb(current)
    const e = deltaEOK(linearSrgbToOklab(...clipped), oklchToOklab(L, chroma, H))
    if (e < JND) {
      if (JND - e < GAMUT_EPS) return clipped
      minInGamut = false
      min = chroma
    } else {
      max = chroma
    }
  }
  return clampRgb(current)
}

/** OKLCH → 6-значный hex (sRGB, gamut-mapped). Используется как DTCG `hex`-fallback (§4 находки). */
function oklchToHex(L: number, C: number, H: number): string {
  const [r, g, b] = oklchToSrgbLinear(L, C, H).map(linearToGamma)
  return `#${h2(r!)}${h2(g!)}${h2(b!)}`
}

/** `oklch(0.72 0.11 221.19)` / `oklch(0.72 0.11 221 / 0.5)` → структурная форма + hex-fallback. */
function parseOklch(s: string): DTCGColorValue | null {
  const m = /^oklch\(([^)]+)\)$/i.exec(s)
  if (!m) return null
  const [mainRaw, alphaRaw] = m[1]!.split('/')
  const parts = mainRaw!.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null
  // L может быть процентом ('55%'); C/H — числа. Значения сохраняем как есть (без round5),
  // чтобы авторская точность OKLCH дошла до обратного formatColor без искажений.
  const L = parts[0]!.endsWith('%') ? Number(parts[0]!.slice(0, -1)) / 100 : Number(parts[0])
  const C = Number(parts[1])
  const H = Number(parts[2])
  if ([L, C, H].some(Number.isNaN)) return null
  const out: DTCGColorValue = { colorSpace: 'oklch', components: [L, C, H], hex: oklchToHex(L, C, H) }
  if (alphaRaw !== undefined) {
    const ap = alphaRaw.trim()
    const a = ap.endsWith('%') ? Number(ap.slice(0, -1)) / 100 : Number(ap)
    if (!Number.isNaN(a)) out.alpha = round5(a)
  }
  return out
}

function parseAlpha(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const s = raw.trim()
  const a = s.endsWith('%') ? Number(s.slice(0, -1)) / 100 : Number(s)
  return Number.isNaN(a) ? undefined : round5(a)
}

/**
 * Строит парсер для трёхкомпонентных CSS-функций цвета (`hsl()`/`hwb()`/`lab()`/`lch()`/
 * `oklab()`), эмитящих СВОЙ colorSpace без конверсии (S2 §4.2 — «нотация ↔ colorSpace 1:1»).
 * `lFraction` — только для `oklab()`, где `L` в процентах означает долю [0,1] (как в `oklch()`);
 * у прочих функций проценты у любого канала — просто число 0..100 (спека хранит их как есть).
 */
function makeFnColorParser(re: RegExp, colorSpace: string, lFraction: boolean): (s: string) => DTCGColorValue | null {
  return (s) => {
    const m = re.exec(s)
    if (!m) return null
    // Модерн-синтаксис (`/`-альфа, пробелы) и legacy-синтаксис (запятые, альфа — 4-й параметр)
    // — оба сводятся к одному разбору: запятые → пробелы, альфа после '/' либо 4-й токен.
    const [mainRaw, slashAlpha] = m[1]!.split('/')
    const parts = mainRaw!
      .replace(/,/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (parts.length < 3) return null
    const stripPct = (p: string): number => (p.endsWith('%') ? Number(p.slice(0, -1)) : Number(p))
    const first = lFraction && parts[0]!.endsWith('%') ? Number(parts[0]!.slice(0, -1)) / 100 : stripPct(parts[0]!)
    const nums = [first, stripPct(parts[1]!), stripPct(parts[2]!)]
    if (nums.some(Number.isNaN)) return null
    const out: DTCGColorValue = { colorSpace, components: nums }
    const alpha = parseAlpha(slashAlpha ?? parts[3])
    if (alpha !== undefined) out.alpha = alpha
    return out
  }
}

const parseHsl = makeFnColorParser(/^hsla?\(([^)]+)\)$/i, 'hsl', false)
const parseHwb = makeFnColorParser(/^hwb\(([^)]+)\)$/i, 'hwb', false)
const parseLab = makeFnColorParser(/^lab\(([^)]+)\)$/i, 'lab', false)
const parseLch = makeFnColorParser(/^lch\(([^)]+)\)$/i, 'lch', false)
const parseOklab = makeFnColorParser(/^oklab\(([^)]+)\)$/i, 'oklab', true)

/** `color(<space> c1 c2 c3 [/ alpha])` — остальные colorSpace спеки (S2 §4.2), без конверсии. */
const COLOR_FN_SPACES = new Set([
  'srgb',
  'srgb-linear',
  'display-p3',
  'a98-rgb',
  'prophoto-rgb',
  'rec2020',
  'xyz-d65',
  'xyz-d50',
  'xyz',
])

function parseColorFunction(s: string): DTCGColorValue | null {
  const m = /^color\(([^)]+)\)$/i.exec(s)
  if (!m) return null
  const [mainRaw, alphaRaw] = m[1]!.split('/')
  const parts = mainRaw!.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 4) return null
  const space = parts[0]!.toLowerCase()
  if (!COLOR_FN_SPACES.has(space)) return null
  const nums = parts.slice(1, 4).map((p) => (p.endsWith('%') ? Number(p.slice(0, -1)) / 100 : Number(p)))
  if (nums.some(Number.isNaN)) return null
  // `xyz` — легаси-алиас `xyz-d65` (CSS Color 4 §10.3); DTCG знает только полное имя.
  const out: DTCGColorValue = { colorSpace: space === 'xyz' ? 'xyz-d65' : space, components: nums }
  const alpha = parseAlpha(alphaRaw)
  if (alpha !== undefined) out.alpha = alpha
  return out
}

/**
 * CSS Color Module 4 именованные цвета (148 ключевых слов + `transparent`), hex-значения.
 * Используется только для строк, не распознанных ни одной функциональной нотацией.
 */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  grey: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  transparent: '#00000000',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
}

function parseNamed(s: string): DTCGColorValue | null {
  const hex = NAMED_COLORS[s.toLowerCase()]
  return hex ? parseHex(hex) : null
}

/**
 * Parses a CSS color string into the DTCG 2025.10 structural form. Covers all 14 spec
 * `colorSpace` values without conversion (hex/`rgb()` → `srgb`, plus `oklch()`, `hsl()`,
 * `hwb()`, `lab()`, `lch()`, `oklab()`, `color(<space> …)`) and CSS named colors. `oklch()`
 * additionally gets a zero-dep `hex` fallback (gamut-mapped per CSS Color 4 §13.2). Returns
 * `null` for anything unparsable (`var()`, `color-mix()`, unknown keyword) so the caller can
 * keep the original string as a legacy value plus a warning.
 *
 * @param css a CSS color string
 */
export function parseColor(css: string): DTCGColorValue | null {
  const s = css.trim()
  return (
    parseHex(s) ??
    parseRgb(s) ??
    parseOklch(s) ??
    parseHsl(s) ??
    parseHwb(s) ??
    parseLab(s) ??
    parseLch(s) ??
    parseOklab(s) ??
    parseColorFunction(s) ??
    parseNamed(s)
  )
}

/**
 * Formats a DTCG structural color back into a CSS string. `oklch` → `oklch(L C H[ / a])`;
 * `srgb` → its `hex` fallback (or `rgba()` when alpha is present); any other color space →
 * `color(<space> …)` best-effort.
 *
 * @param v a DTCG structural color value
 */
export function formatColor(v: DTCGColorValue): string {
  const a = v.alpha
  const hasAlpha = a !== undefined && a !== 1
  if (v.colorSpace === 'oklch') {
    const [L, C, H] = v.components
    const body = `${num(L!)} ${num(C!)} ${num(H!)}`
    return hasAlpha ? `oklch(${body} / ${num(a!)})` : `oklch(${body})`
  }
  if (v.colorSpace === 'srgb') {
    const [r, g, b] = v.components
    if (!hasAlpha) return v.hex ?? `#${h2(r!)}${h2(g!)}${h2(b!)}`
    const to255 = (n: number): number => Math.round(clamp01(n) * 255)
    return `rgba(${to255(r!)}, ${to255(g!)}, ${to255(b!)}, ${num(a!)})`
  }
  // Прочие colorSpace (display-p3, lab, …) — CSS color()-нотация как есть.
  const body = v.components.map(num).join(' ')
  return hasAlpha ? `color(${v.colorSpace} ${body} / ${num(a!)})` : `color(${v.colorSpace} ${body})`
}
