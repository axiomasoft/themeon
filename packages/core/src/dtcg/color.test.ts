import { describe, expect, test } from 'vitest'
import Color from 'colorjs.io'
import { formatColor, parseColor } from './color'
import type { DTCGColorValue } from './types'

describe('parseColor', () => {
  test('hex #rrggbb → srgb с hex-fallback', () => {
    expect(parseColor('#3ab7bf')).toEqual({
      colorSpace: 'srgb',
      components: [0.22745, 0.71765, 0.74902],
      hex: '#3ab7bf',
    })
  })

  test('короткий hex #rgb разворачивается в #rrggbb', () => {
    const c = parseColor('#f00')!
    expect(c.colorSpace).toBe('srgb')
    expect(c.hex).toBe('#ff0000')
    expect(c.components).toEqual([1, 0, 0])
  })

  test('hex с альфой #rrggbbaa кладёт alpha отдельно', () => {
    const c = parseColor('#00000080')!
    expect(c.hex).toBe('#000000')
    expect(c.alpha).toBeCloseTo(0.50196, 4)
  })

  test('rgb() и rgba() → srgb-каналы + опциональная альфа', () => {
    expect(parseColor('rgb(58, 183, 191)')).toEqual({
      colorSpace: 'srgb',
      components: [0.22745, 0.71765, 0.74902],
      hex: '#3ab7bf',
    })
    expect(parseColor('rgba(0, 0, 0, 0.5)')!.alpha).toBe(0.5)
  })

  test('oklch() → структурная форма + zero-dep hex-fallback (findings §4)', () => {
    expect(parseColor('oklch(0.72 0.11 221.19)')).toEqual({
      colorSpace: 'oklch',
      components: [0.72, 0.11, 221.19],
      hex: '#44b4d5',
    })
  })

  test('oklch с альфой через слэш', () => {
    expect(parseColor('oklch(0.55 0.13 155 / 0.5)')).toEqual({
      colorSpace: 'oklch',
      components: [0.55, 0.13, 155],
      hex: '#14874e',
      alpha: 0.5,
    })
  })

  test('hex-fallback OKLCH сверен с colorjs.io@0.7.0 live (findings §4/§9.3, in-gamut → байт-в-байт)', () => {
    const inGamutCases: Array<[number, number, number]> = [
      [0.5, 0.1, 0],
      [0.5, 0.1, 90],
      [0.5, 0.05, 180],
      [0.5, 0.1, 270],
      [0.9, 0.05, 155],
      [0.2, 0.05, 30],
      [0.99, 0, 0],
      [0.15, 0, 0],
    ]
    for (const [L, C, H] of inGamutCases) {
      const c = new Color('oklch', [L, C, H])
      expect(c.inGamut('srgb')).toBe(true) // сэмплы отобраны in-gamut — иначе сравнение не байт-в-байт
      const refHex = c.to('srgb').toString({ format: 'hex', collapse: false }).toLowerCase()
      expect(parseColor(`oklch(${L} ${C} ${H})`)?.hex).toBe(refHex)
    }
  })

  test('hsl()/hwb()/lab()/lch()/oklab() → структурная форма без конверсии (1:1 по colorSpace)', () => {
    expect(parseColor('hsl(200 50% 50%)')).toEqual({ colorSpace: 'hsl', components: [200, 50, 50] })
    expect(parseColor('hsla(200, 50%, 50%, 0.5)')).toEqual({
      colorSpace: 'hsl',
      components: [200, 50, 50],
      alpha: 0.5,
    })
    expect(parseColor('hwb(200 20% 10%)')).toEqual({ colorSpace: 'hwb', components: [200, 20, 10] })
    expect(parseColor('lab(50 40 -30)')).toEqual({ colorSpace: 'lab', components: [50, 40, -30] })
    expect(parseColor('lch(50 40 30)')).toEqual({ colorSpace: 'lch', components: [50, 40, 30] })
    expect(parseColor('oklab(0.6 0.05 -0.02)')).toEqual({ colorSpace: 'oklab', components: [0.6, 0.05, -0.02] })
    expect(parseColor('oklab(60% 0.05 -0.02)')).toEqual({ colorSpace: 'oklab', components: [0.6, 0.05, -0.02] })
  })

  test('color(<space> …) → остальные colorSpace спеки без конверсии', () => {
    expect(parseColor('color(display-p3 1 0.5 0)')).toEqual({
      colorSpace: 'display-p3',
      components: [1, 0.5, 0],
    })
    expect(parseColor('color(xyz-d65 0.2 0.3 0.1 / 0.8)')).toEqual({
      colorSpace: 'xyz-d65',
      components: [0.2, 0.3, 0.1],
      alpha: 0.8,
    })
    expect(parseColor('color(xyz 0.2 0.3 0.1)')).toEqual({ colorSpace: 'xyz-d65', components: [0.2, 0.3, 0.1] })
    expect(parseColor('color(unknown-space 1 1 1)')).toBeNull()
  })

  test('именованные CSS-цвета → srgb с hex-fallback (структурная форма)', () => {
    expect(parseColor('rebeccapurple')).toEqual({ colorSpace: 'srgb', components: [0.4, 0.2, 0.6], hex: '#663399' })
    expect(parseColor('RebeccaPurple')).toEqual({ colorSpace: 'srgb', components: [0.4, 0.2, 0.6], hex: '#663399' })
    const t = parseColor('transparent')!
    expect(t.hex).toBe('#000000')
    expect(t.alpha).toBe(0)
  })

  test('непарсибельные значения → null (legacy-строка у потребителя)', () => {
    expect(parseColor('var(--x)')).toBeNull()
    expect(parseColor('color-mix(in oklch, red, blue)')).toBeNull()
    expect(parseColor('not-a-color')).toBeNull()
  })
})

describe('formatColor', () => {
  test('oklch без альфы', () => {
    expect(formatColor({ colorSpace: 'oklch', components: [0.55, 0.13, 155] })).toBe('oklch(0.55 0.13 155)')
  })

  test('oklch с альфой печатает / a', () => {
    expect(formatColor({ colorSpace: 'oklch', components: [0.55, 0.13, 155], alpha: 0.5 })).toBe(
      'oklch(0.55 0.13 155 / 0.5)',
    )
  })

  test('srgb печатает hex-fallback, если он есть и нет альфы', () => {
    expect(formatColor({ colorSpace: 'srgb', components: [0.5, 0.5, 0.5], hex: '#808080' })).toBe('#808080')
  })

  test('srgb с альфой печатает rgba()', () => {
    expect(formatColor({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 })).toBe('rgba(0, 0, 0, 0.5)')
  })

  test('прочие colorSpace → color()-нотация', () => {
    expect(formatColor({ colorSpace: 'display-p3', components: [1, 0, 0] })).toBe('color(display-p3 1 0 0)')
  })
})

describe('round-trip parse↔format', () => {
  test.each<string>(['oklch(0.55 0.13 155)', 'oklch(0.99 0 0)', '#3ab7bf', 'rgba(0, 0, 0, 0.5)'])(
    '%s стабилен при parse→format',
    (css) => {
      const parsed = parseColor(css)
      expect(parsed).not.toBeNull()
      expect(formatColor(parsed as DTCGColorValue)).toBe(css)
    },
  )
})
