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
  test('hover светлее base, pressed темнее base по OKLCH-lightness', () => {
    const base = toHex('oklch(0.55 0.15 155)')
    const { hover, pressed, suppl } = deriveInteractionStates(base)
    expect(hover).toMatch(HEX_RE)
    expect(pressed).toMatch(HEX_RE)
    expect(suppl).toMatch(HEX_RE)
    expect(hover).not.toBe(base)
    expect(pressed).not.toBe(base)
  })

  test('дельты в допустимом диапазоне (не выходят за gamut, остаются валидным hex)', () => {
    // Крайние значения lightness — проверка clamp/toGamut не роняет функцию.
    const nearWhite = toHex('oklch(0.98 0.02 155)')
    const nearBlack = toHex('oklch(0.02 0.02 155)')
    expect(deriveInteractionStates(nearWhite).hover).toMatch(HEX_RE)
    expect(deriveInteractionStates(nearBlack).pressed).toMatch(HEX_RE)
  })
})
