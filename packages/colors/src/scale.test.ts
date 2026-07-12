import { describe, expect, test } from 'vitest'

import { contrastAPCA } from './contrast'
import { ColorsError } from './errors'
import { inGamut, oklch, rgb } from './internal/culori'
import { generateScale, generateScalePair, scaleToTokens } from './scale'

// Тестовый набор seeds (P2.2 ТЗ): 8 хроматических (одна lightness/chroma, разный hue) +
// 4 edge-cases (очень светлый насыщенный, тёмный, ахромат, hex-вход).
const CHROMATIC_HUES = [25, 75, 110, 155, 200, 260, 300, 340] as const
const CHROMATIC_SEEDS = CHROMATIC_HUES.map((h) => `oklch(0.55 0.15 ${h})`)
const EDGE_SEEDS = ['oklch(0.9 0.18 100)', 'oklch(0.3 0.1 260)', 'oklch(0.5 0 0)', '#3b7a57']
const ALL_SEEDS = [...CHROMATIC_SEEDS, ...EDGE_SEEDS]
const APPEARANCES = ['light', 'dark'] as const

function hexRe(): RegExp {
  return /^#[0-9a-f]{6}$/i
}

describe.each(ALL_SEEDS)('generateScale(%s)', (seed) => {
  describe.each(APPEARANCES)('appearance=%s', (appearance) => {
    test('ровно 12 шагов, index 1..12 по порядку', () => {
      const scale = generateScale(seed, { appearance })
      expect(scale).toHaveLength(12)
      expect(scale.map((step) => step.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    })

    test('детерминизм: два вызова дают одинаковый результат', () => {
      const first = generateScale(seed, { appearance })
      const second = generateScale(seed, { appearance })
      expect(second).toEqual(first)
    })

    test('шаг 9 совпадает с seed (точно — для in-gamut seed; иначе chroma не увеличена)', () => {
      const scale = generateScale(seed, { appearance })
      const step9 = scale[8]!
      const seedColor = oklch(seed)!
      const seedInGamut = inGamut('rgb')(seedColor as never)

      if (seedInGamut) {
        expect(step9.l).toBeCloseTo(seedColor.l ?? 0, 3)
        expect(step9.c).toBeCloseTo(seedColor.c ?? 0, 3)
        if ((seedColor.c ?? 0) > 0) {
          expect(step9.h).toBeCloseTo(seedColor.h ?? 0, 0)
        }
      } else {
        // Вне sRGB-гаммы: маппинг (toGamut) обязан не УВЕЛИЧИВАТЬ chroma сверх исходной.
        expect(step9.c).toBeLessThanOrEqual((seedColor.c ?? 0) + 1e-6)
      }
    })

    test('lightness строго монотонна на шагах 1→10', () => {
      const scale = generateScale(seed, { appearance })
      const ls = scale.slice(0, 10).map((step) => step.l)
      for (let i = 1; i < ls.length; i++) {
        if (appearance === 'light') {
          expect(ls[i]!).toBeLessThan(ls[i - 1]!)
        } else {
          expect(ls[i]!).toBeGreaterThan(ls[i - 1]!)
        }
      }
    })

    test('контраст-инварианты текстовых шагов относительно шага 2 (и шага 1 для шага 12)', () => {
      const scale = generateScale(seed, { appearance })
      const step1 = scale[0]!
      const step2 = scale[1]!
      const step11 = scale[10]!
      const step12 = scale[11]!
      expect(Math.abs(contrastAPCA(step11.css, step2.css))).toBeGreaterThanOrEqual(60)
      expect(Math.abs(contrastAPCA(step12.css, step2.css))).toBeGreaterThanOrEqual(75)
      expect(Math.abs(contrastAPCA(step12.css, step1.css))).toBeGreaterThanOrEqual(75)
    })

    test('gamut: hex валиден, css в sRGB-гамме (gamut:srgb деф.)', () => {
      // Проверяем именно `step.css` — то, что реально парсят потребители (plan §6 «каждый
      // css-шаг в sRGB-гамме») — а не сырые до-сериализационные координаты step.l/c/h.
      // Округление до 4/2 знаков в formatOklchCss (scale.ts) у крутых границ гаммы (жёлтый
      // hue) само по себе способно вытолкнуть css за пределы [0,1] на ~1e-4 — это чинится
      // в scale.ts (formatOklchCssInGamut), а не тестовым допуском (P2.2 code-review MED).
      // Эпсилон здесь — только на float round-trip шум парсинга css-строки обратно в rgb,
      // на уровне 1e-15..1e-6.
      const EPSILON = 1e-6
      const scale = generateScale(seed, { appearance })
      const toRgb = rgb
      for (const step of scale) {
        expect(step.hex).toMatch(hexRe())
        const rgbColor = toRgb(step.css)!
        expect(rgbColor.r ?? 0).toBeGreaterThanOrEqual(-EPSILON)
        expect(rgbColor.r ?? 0).toBeLessThanOrEqual(1 + EPSILON)
        expect(rgbColor.g ?? 0).toBeGreaterThanOrEqual(-EPSILON)
        expect(rgbColor.g ?? 0).toBeLessThanOrEqual(1 + EPSILON)
        expect(rgbColor.b ?? 0).toBeGreaterThanOrEqual(-EPSILON)
        expect(rgbColor.b ?? 0).toBeLessThanOrEqual(1 + EPSILON)
      }
    })
  })
})

describe('ахромат (oklch(0.5 0 0))', () => {
  test('все шаги: c === 0, h === 0', () => {
    for (const appearance of APPEARANCES) {
      const scale = generateScale('oklch(0.5 0 0)', { appearance })
      for (const step of scale) {
        expect(step.c).toBe(0)
        expect(step.h).toBe(0)
      }
    }
  })
})

describe('scaleToTokens', () => {
  test('ключи 1..12, значения — css-строки шагов', () => {
    const scale = generateScale('oklch(0.55 0.15 155)')
    const tokens = scaleToTokens(scale)
    expect(Object.keys(tokens)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    for (const step of scale) {
      expect(tokens[String(step.index)]).toBe(step.css)
    }
  })
})

describe('generateScalePair', () => {
  test('light и dark из одного seed, оба валидны (12 шагов)', () => {
    const pair = generateScalePair('oklch(0.55 0.15 155)')
    expect(pair.light).toHaveLength(12)
    expect(pair.dark).toHaveLength(12)
    expect(pair.light[0]!.l).not.toBeCloseTo(pair.dark[0]!.l, 2)
  })
})

describe('BAD_SEED — fail-closed', () => {
  test('generateScale("мусор") бросает ColorsError с code BAD_SEED', () => {
    expect(() => generateScale('мусор')).toThrowError(ColorsError)
    try {
      generateScale('мусор')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ColorsError)
      expect((error as ColorsError).code).toBe('BAD_SEED')
    }
  })
})
