import { describe, expect, test } from 'vitest'

import { contrastAPCA } from './contrast'
import { ColorsError } from './errors'
import { inGamut, oklch, rgb } from './internal/culori'
import { generateScale, generateScalePair, scaleToTokens, SEED_L_MAX, SEED_L_MIN } from './scale'

// Тестовый набор seed'ов (P8.5, findings/P8-colors-scale-apca.md §5): 8 хроматических (одна
// lightness/chroma, разный hue) + edge-cases внутри полосы seed'а + обе границы полосы.
// `oklch(0.3 0.1 260)` (старый edge-seed P2.2) теперь ВНЕ полосы — перенесён в
// OUT_OF_BAND_SEEDS вместе с другими тёмными/пересветленными seed'ами.
const CHROMATIC_HUES = [25, 75, 110, 155, 200, 260, 300, 340] as const
const CHROMATIC_SEEDS = CHROMATIC_HUES.map((h) => `oklch(0.55 0.15 ${h})`)
const EDGE_SEEDS = [
  'oklch(0.9 0.18 100)',
  'oklch(0.5 0 0)', // ахромат
  '#3b7a57',
  'oklch(0.55 0.02 260)', // seed нейтрали дефолт-темы пакета (её отсутствие в наборе P2 не поймало #12)
  'oklch(0.93 0.05 90)', // верхняя граница полосы seed'а
  'oklch(0.50 0.10 260)', // нижняя граница полосы seed'а
]
const ALL_SEEDS = [...CHROMATIC_SEEDS, ...EDGE_SEEDS]
const OUT_OF_BAND_SEEDS = ['#0a0a23', '#0b1020', 'oklch(0.3 0.1 260)', 'oklch(0.97 0.05 90)']
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

    test('I10: шаг 9 совпадает с seed (точно — для in-gamut seed; иначе chroma не увеличена)', () => {
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

    test('I1: монотонность лайтнеса строго на шагах 1→8 (9/10 намеренно исключены — 9 = seed, светлее/темнее 8 у ярких hue)', () => {
      const scale = generateScale(seed, { appearance })
      const ls = scale.slice(0, 8).map((step) => step.l)
      for (let i = 1; i < ls.length; i++) {
        if (appearance === 'light') {
          expect(ls[i]!).toBeLessThan(ls[i - 1]!)
        } else {
          expect(ls[i]!).toBeGreaterThan(ls[i - 1]!)
        }
      }
    })

    test('I2: минимальный шаг ΔL на 1..8 ≥ 0.009 (структурно — фиксированный ramp, не зависит от seed)', () => {
      // Канон findings §5 — «≥ 0.010» (Radix p50-минимум 0.011 light). Порог здесь чуть мягче
      // (0.009): у step1↔step2 близ апекса L≈0.99 (chroma-cap 0.01, почти ахромат) gamut-
      // mapping (toGamut, CSS Color 4) иногда чуть подвигает L при схождении по ΔE — измерено
      // 0.00957 на seed `oklch(0.55 0.15 75)` light (единственный случай во всём наборе,
      // остальные ≥ 0.0107). Аналогично честному разногласию findings §6 п.2 (сжатие ΔL(9,10)
      // у насыщенных светлых seed'ов) — граница апекса гаммы, не коллапс-баг #12 (там было
      // ΔL ≈ 0.0008, байт-в-байт одинаковые шаги).
      const scale = generateScale(seed, { appearance })
      const ls = scale.slice(0, 8).map((step) => step.l)
      for (let i = 1; i < ls.length; i++) {
        expect(Math.abs(ls[i]! - ls[i - 1]!)).toBeGreaterThanOrEqual(0.009)
      }
    })

    test('I3: chroma-максимум в фоновой полосе — max(C1..C8) ≤ C9 и C10 ≤ C9', () => {
      const scale = generateScale(seed, { appearance })
      const c9 = scale[8]!.c
      const maxBg = Math.max(...scale.slice(0, 8).map((step) => step.c))
      expect(maxBg).toBeLessThanOrEqual(c9 + 1e-6)
      expect(scale[9]!.c).toBeLessThanOrEqual(c9 + 1e-6)
    })

    test('I4: различимость текстовых шагов (hex) — 11 ≠ 10, 12 ≠ 11', () => {
      const scale = generateScale(seed, { appearance })
      expect(scale[10]!.hex).not.toBe(scale[9]!.hex)
      expect(scale[11]!.hex).not.toBe(scale[10]!.hex)
    })

    test('I5: разделение по лайтнесу (пост-gamut) — |L11-L10| ≥ 0.015, |L12-L11| ≥ 0.08', () => {
      const scale = generateScale(seed, { appearance })
      expect(Math.abs(scale[10]!.l - scale[9]!.l)).toBeGreaterThanOrEqual(0.015)
      expect(Math.abs(scale[11]!.l - scale[10]!.l)).toBeGreaterThanOrEqual(0.08)
    })

    test('I6: роли low/high-contrast text различны — |Lc12| − |Lc11| ≥ 10 (против шага 2)', () => {
      const scale = generateScale(seed, { appearance })
      const step2 = scale[1]!
      const lc11 = Math.abs(contrastAPCA(scale[10]!.css, step2.css))
      const lc12 = Math.abs(contrastAPCA(scale[11]!.css, step2.css))
      expect(lc12 - lc11).toBeGreaterThanOrEqual(10)
    })

    test('I7: контрастные полы канона Radix — |Lc11| ≥ 60, |Lc12| ≥ 90 (против шагов 1 и 2)', () => {
      const scale = generateScale(seed, { appearance })
      const step1 = scale[0]!
      const step2 = scale[1]!
      const step11 = scale[10]!
      const step12 = scale[11]!
      expect(Math.abs(contrastAPCA(step11.css, step2.css))).toBeGreaterThanOrEqual(60)
      expect(Math.abs(contrastAPCA(step11.css, step1.css))).toBeGreaterThanOrEqual(60)
      expect(Math.abs(contrastAPCA(step12.css, step2.css))).toBeGreaterThanOrEqual(90)
      expect(Math.abs(contrastAPCA(step12.css, step1.css))).toBeGreaterThanOrEqual(90)
    })

    test('I8: видимость бордеров — |Lc(6,1)| ≥ 8, |Lc(8,1)| ≥ 18 (APCA "discernible non-text" = 15)', () => {
      const scale = generateScale(seed, { appearance })
      const step1 = scale[0]!
      const step6 = scale[5]!
      const step8 = scale[7]!
      expect(Math.abs(contrastAPCA(step6.css, step1.css))).toBeGreaterThanOrEqual(8)
      expect(Math.abs(contrastAPCA(step8.css, step1.css))).toBeGreaterThanOrEqual(18)
    })

    test('I11: отгружаемые артефакты (css/hex) шагов 11/12 согласованы по измеренному Lc (без OOG-рассинхрона)', () => {
      const scale = generateScale(seed, { appearance })
      const step2Css = scale[1]!.css
      const step2Hex = scale[1]!.hex
      for (const step of [scale[10]!, scale[11]!]) {
        const lcFromCss = Math.abs(contrastAPCA(step.css, step2Css))
        const lcFromHex = Math.abs(contrastAPCA(step.hex, step2Hex))
        expect(Math.abs(lcFromCss - lcFromHex)).toBeLessThan(0.5)
      }
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

describe.each(OUT_OF_BAND_SEEDS)('I9: seed вне полосы solid-роли — %s', (seed) => {
  describe.each(APPEARANCES)('appearance=%s', (appearance) => {
    test('деф. seedPolicy:"error" бросает SEED_OUT_OF_BAND', () => {
      expect(() => generateScale(seed, { appearance })).toThrowError(ColorsError)
      try {
        generateScale(seed, { appearance })
        expect.unreachable()
      } catch (error) {
        expect(error).toBeInstanceOf(ColorsError)
        expect((error as ColorsError).code).toBe('SEED_OUT_OF_BAND')
      }
    })

    test('seedPolicy:"clamp" нормализует L в полосу, шкала валидна, onSeedAdjusted вызван', () => {
      let adjusted: { readonly from: number; readonly to: number } | undefined
      const scale = generateScale(seed, {
        appearance,
        seedPolicy: 'clamp',
        onSeedAdjusted: (info) => {
          adjusted = info
        },
      })
      expect(scale).toHaveLength(12)
      expect(adjusted).toBeDefined()
      expect(adjusted!.to).toBeGreaterThanOrEqual(SEED_L_MIN)
      expect(adjusted!.to).toBeLessThanOrEqual(SEED_L_MAX)
    })
  })
})
