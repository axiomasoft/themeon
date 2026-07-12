import { describe, expect, test } from 'vitest'
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

  test('oklch() → структурная форма без hex, точность сохраняется', () => {
    expect(parseColor('oklch(0.72 0.11 221.19)')).toEqual({
      colorSpace: 'oklch',
      components: [0.72, 0.11, 221.19],
    })
  })

  test('oklch с альфой через слэш', () => {
    expect(parseColor('oklch(0.55 0.13 155 / 0.5)')).toEqual({
      colorSpace: 'oklch',
      components: [0.55, 0.13, 155],
      alpha: 0.5,
    })
  })

  test('нераспознанные нотации → null (legacy-строка у потребителя)', () => {
    expect(parseColor('hsl(200 50% 50%)')).toBeNull()
    expect(parseColor('rebeccapurple')).toBeNull()
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
