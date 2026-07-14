import { describe, expect, test } from 'vitest'
import { deriveInteractionStates, toHex } from './color'

const HEX_RE = /^#[0-9a-f]{6,8}$/i

describe('toHex', () => {
  test('oklch → hex', () => {
    expect(toHex('oklch(0.55 0.15 155)')).toMatch(HEX_RE)
  })

  test('rgb → hex', () => {
    expect(toHex('rgb(51 85 255)')).toBe('#3355ff')
  })

  test('hex8-alpha сохраняется (не схлопывается до opaque hex6)', () => {
    const out = toHex('rgba(51, 85, 255, 0.5)')
    expect(out).toMatch(HEX_RE)
    expect(out).toHaveLength(9) // #rrggbbaa
  })

  test('непарсибельный цвет возвращается как есть (fail-safe, не throw)', () => {
    expect(toHex('not-a-color')).toBe('not-a-color')
  })
})

describe('deriveInteractionStates', () => {
  test('без явных ролей: hover/pressed сдвинуты от base по STEP10_DELTA(appearance), suppl = base (identity)', () => {
    const base = toHex('oklch(0.55 0.15 155)')
    const light = deriveInteractionStates({ base, appearance: 'light' })
    expect(light.hover).toMatch(HEX_RE)
    expect(light.pressed).toMatch(HEX_RE)
    expect(light.hover).not.toBe(base)
    expect(light.pressed).not.toBe(base)
    expect(light.suppl).toBe(base)

    const dark = deriveInteractionStates({ base, appearance: 'dark' })
    expect(dark.hover).not.toBe(light.hover) // разное направление шкалы light/dark
  })

  test('явный hover темы побеждает деривацию; pressed без явной роли — экстраполяция base→hover (k=2)', () => {
    const base = toHex('oklch(0.55 0.15 155)')
    const hover = toHex('oklch(0.51 0.13 154)')
    const { hover: outHover, pressed } = deriveInteractionStates({ base, appearance: 'light', hover })
    expect(outHover).toBe(hover)
    // pressed продолжает вектор base→hover ЕЩЁ на столько же (k=2) — дальше от base, чем hover.
    expect(pressed).not.toBe(hover)
    expect(pressed).not.toBe(base)
  })

  test('явные pressed/suppl темы побеждают деривацию байт-в-байт', () => {
    const base = toHex('oklch(0.55 0.15 155)')
    const pressed = toHex('oklch(0.40 0.10 150)')
    const suppl = toHex('oklch(0.60 0.20 155)')
    const out = deriveInteractionStates({ base, appearance: 'dark', pressed, suppl })
    expect(out.pressed).toBe(pressed)
    expect(out.suppl).toBe(suppl)
  })

  test('дельты в допустимом диапазоне (не выходят за gamut, остаются валидным hex)', () => {
    // Крайние значения lightness — проверка clamp/toGamut не роняет функцию.
    const nearWhite = toHex('oklch(0.98 0.02 155)')
    const nearBlack = toHex('oklch(0.02 0.02 155)')
    expect(deriveInteractionStates({ base: nearWhite, appearance: 'light' }).hover).toMatch(HEX_RE)
    expect(deriveInteractionStates({ base: nearBlack, appearance: 'dark' }).pressed).toMatch(HEX_RE)
  })
})
