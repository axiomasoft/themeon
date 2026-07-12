/**
 * Микро-парсер цвета для DTCG-моста (P1.7, P-D11): CSS-строка ↔ структурная форма
 * DTCG 2025.10. Zero deps — никакого culori/colord (полный color-инжиниринг живёт в
 * `@themeon/colors`, P2). Покрывает три родных для ThemeOn формы записи: hex, `rgb()/rgba()`,
 * `oklch()`; всё прочее (`hsl()`, `lab()`, именованные цвета) → `null`, потребитель оставляет
 * legacy-строку. Обратный `formatColor` — детерминированный: `srgb` с hex-fallback печатает hex,
 * `oklch` печатает `oklch(...)`, прочие colorSpace — `color(<space> …)` best-effort.
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

/** `oklch(0.72 0.11 221.19)` / `oklch(0.72 0.11 221 / 0.5)` → структурная форма (без hex). */
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
  const out: DTCGColorValue = { colorSpace: 'oklch', components: [L, C, H] }
  if (alphaRaw !== undefined) {
    const ap = alphaRaw.trim()
    const a = ap.endsWith('%') ? Number(ap.slice(0, -1)) / 100 : Number(ap)
    if (!Number.isNaN(a)) out.alpha = round5(a)
  }
  return out
}

/**
 * Parses a CSS color string (hex, `rgb()/rgba()`, `oklch()`) into the DTCG 2025.10 structural
 * form. Returns `null` for any other notation (`hsl()`, `lab()`, named colors) so the caller can
 * keep the original string as a legacy value.
 *
 * @param css a CSS color string
 */
export function parseColor(css: string): DTCGColorValue | null {
  const s = css.trim()
  return parseHex(s) ?? parseRgb(s) ?? parseOklch(s)
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
