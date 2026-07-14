import { describe, expect, test } from 'vitest'

import { ColorsError } from './errors'
import { LC_THRESHOLDS, SEMANTIC_CONTRAST_PAIRS, checkContrast, checkThemeContrast, contrastAPCA } from './contrast'

// Референс-векторы APCA 0.0.98G — официальный тест-сьют apca-w3 (тот же алгоритм, что
// реализует colorjs.io contrastAPCA, см. contrast.ts):
// https://github.com/Myndex/apca-w3/blob/master/test/index.js
// calcAPCA(text, bg) там эквивалентен нашему contrastAPCA(fg, bg). Числа взяты дословно
// из test/index.js (массив contrastResult), НЕ из памяти модели.
describe('contrastAPCA — референс-векторы apca-w3', () => {
  test.each([
    ['#888', '#FFF', 63.056469930209424],
    ['#FFF', '#888', -68.54146436644962],
    ['#000', '#aaa', 58.146262578561334],
    ['#aaa', '#000', -56.24113336839742],
    ['#123', '#def', 91.66830811481631],
    ['#def', '#123', -93.06770049484275],
    ['#123', '#444', 8.32326136957393],
    ['#444', '#123', -7.526878460278154],
  ] as const)('Lc(%s на %s) ≈ %f', (fg, bg, expected) => {
    expect(contrastAPCA(fg, bg)).toBeCloseTo(expected, 1)
  })
})

describe('contrastAPCA — знак и идентичность', () => {
  test('тёмный текст на светлом фоне — положительный Lc', () => {
    expect(contrastAPCA('#000', '#fff')).toBeGreaterThan(0)
  })

  test('светлый текст на тёмном фоне — отрицательный Lc', () => {
    expect(contrastAPCA('#fff', '#000')).toBeLessThan(0)
  })

  test('чёрное на белом — |Lc| больше 100', () => {
    expect(Math.abs(contrastAPCA('#000', '#fff'))).toBeGreaterThan(100)
  })

  test('идентичные цвета — |Lc| < 5 (≈0)', () => {
    expect(Math.abs(contrastAPCA('#777', '#777'))).toBeLessThan(5)
  })
})

describe('contrastAPCA — fail-closed на непарсибельном цвете', () => {
  test('бросает ColorsError с кодом BAD_COLOR', () => {
    expect(() => contrastAPCA('не-цвет', '#fff')).toThrow(ColorsError)
    try {
      contrastAPCA('не-цвет', '#fff')
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ColorsError)
      expect((err as ColorsError).code).toBe('BAD_COLOR')
    }
  })

  test('принимает oklch()-строки', () => {
    // oklch(0.25 0.01 260) на oklch(0.99 0 0) — тёмный текст на почти-белом.
    const lc = contrastAPCA('oklch(0.25 0.01 260)', 'oklch(0.99 0 0)')
    expect(Number.isFinite(lc)).toBe(true)
    expect(lc).toBeGreaterThan(0)
  })
})

// code-review P2.1 (MED): gate регистрировал только sRGB+OKLCH, hsl()/lab()/lch()/hwb()/color()
// бросали BAD_COLOR как «непарсибельные», хотя это валидный CSS.
describe('contrastAPCA — принимает все CSS-синтаксисы цвета (code-review P2.1)', () => {
  test.each([
    ['hsl(0 100% 50%)', '#fff'],
    ['hwb(0 0% 0%)', '#fff'],
    ['lab(50% 40 30)', '#fff'],
    ['lch(50% 40 30)', '#fff'],
    ['color(display-p3 1 0 0)', '#fff'],
  ] as const)('%s на %s — не бросает, возвращает конечное число', (fg, bg) => {
    expect(Number.isFinite(contrastAPCA(fg, bg))).toBe(true)
  })
})

// code-review P2.1 (MED): альфа молча игнорировалась — прозрачный/полупрозрачный текст
// засчитывался как опаковый (fail-open вместо fail-closed).
describe('contrastAPCA — учитывает альфа-канал (code-review P2.1)', () => {
  test('rgba(0,0,0,0.5) на белом даёт МЕНЬШИЙ |Lc|, чем непрозрачный #000', () => {
    const opaque = Math.abs(contrastAPCA('#000', '#fff'))
    const translucent = Math.abs(contrastAPCA('rgba(0, 0, 0, 0.5)', '#fff'))
    expect(translucent).toBeLessThan(opaque)
  })

  test('transparent на белом — |Lc| около 0 (текст неотличим от фона)', () => {
    expect(Math.abs(contrastAPCA('transparent', '#fff'))).toBeLessThan(1)
  })

  test('непрозрачные цвета (alpha=1) — численно совпадают с референс-вектором apca-w3', () => {
    // Регрессия: путь сплющивания альфы не должен менять результат для уже опаковых цветов.
    expect(contrastAPCA('#888', '#FFF')).toBeCloseTo(63.056469930209424, 1)
  })
})

describe('checkContrast — батч-гейт', () => {
  test('пара body с |Lc| ниже требуемого — pass=false', () => {
    // #767676 на #ffffff даёт |Lc| около 70 — ниже порога body (75).
    const result = checkContrast([{ fg: '#767676', bg: '#ffffff', usage: 'body' }])
    const [report] = result.reports
    expect(report).toBeDefined()
    expect(Math.abs(report!.lc)).toBeLessThan(LC_THRESHOLDS.body)
    expect(report!.pass).toBe(false)
    expect(report!.required).toBe(75)
    expect(result.pass).toBe(false)
  })

  test('пара non-text с достаточным |Lc| — pass=true', () => {
    const result = checkContrast([{ fg: '#000000', bg: '#999999', usage: 'non-text' }])
    const [report] = result.reports
    expect(report).toBeDefined()
    expect(Math.abs(report!.lc)).toBeGreaterThanOrEqual(LC_THRESHOLDS['non-text'])
    expect(report!.pass).toBe(true)
    expect(result.pass).toBe(true)
  })

  test('pass = ВСЕ пары прошли (одна плохая пара валит весь батч)', () => {
    const result = checkContrast([
      { fg: '#000000', bg: '#ffffff', usage: 'body' },
      { fg: '#777777', bg: '#888888', usage: 'body' },
    ])
    expect(result.pass).toBe(false)
    expect(result.reports).toHaveLength(2)
  })

  test('непарсибельная пара — throw (fail-closed), не skip', () => {
    expect(() => checkContrast([{ fg: 'мусор', bg: '#fff', usage: 'text' }])).toThrow(ColorsError)
  })
})

// P8.6 (Major #15 аудита): flattenAlpha безусловно композитил bg на белое — числа dark-темы
// взяты из findings/P8-colors-scale-apca.md §3.4 (dark, --color-text=#e3e5e9,
// --color-bg-page=#131313, --color-bg-elevated при alpha 0.60).
describe('contrastAPCA — подложка для полупрозрачного bg (P8.6, Major #15)', () => {
  const fg = '#e3e5e9'
  const bgElevatedTranslucent = 'rgba(37, 37, 37, 0.6)' // --color-bg-elevated dark, alpha 0.60
  const base = '#131313' // --color-bg-page dark

  test('без base — throw ALPHA_NEEDS_BASE (не безусловный белый)', () => {
    expect(() => contrastAPCA(fg, bgElevatedTranslucent)).toThrow(ColorsError)
    try {
      contrastAPCA(fg, bgElevatedTranslucent)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ColorsError)
      expect((err as ColorsError).code).toBe('ALPHA_NEEDS_BASE')
    }
  })

  test('с base=bg.page — |Lc| ≈ 89 (композит на фактическую тёмную подложку, не на белое)', () => {
    // Композит на белое (старое поведение) дал бы |Lc| в районе 55-65 (fg почти теряет контраст
    // на посветлевшем bg); композит на фактическую тёмную подложку держит bg тёмным — |Lc| ≥ 85.
    const lc = contrastAPCA(fg, bgElevatedTranslucent, { base })
    expect(Math.abs(lc)).toBeGreaterThan(85)
    expect(Math.abs(lc)).toBeLessThan(95)
  })

  test('base сама полупрозрачна — throw ALPHA_NEEDS_BASE', () => {
    expect(() => contrastAPCA(fg, bgElevatedTranslucent, { base: 'rgba(19, 19, 19, 0.5)' })).toThrow(ColorsError)
  })

  test('checkContrast прокидывает pair.base в contrastAPCA', () => {
    const result = checkContrast([{ fg, bg: bgElevatedTranslucent, usage: 'body', base }])
    expect(Math.abs(result.reports[0]!.lc)).toBeGreaterThan(85)
    expect(result.pass).toBe(true)
  })
})

// P8.6 (Major #22): таблица пар раньше жила отдельно в CLI (usage 'body' на всё) и в
// gen-tokens.mjs (свой набор usage) — один и тот же вопрос имел два ответа. Теперь оба
// потребителя (P8.7/P8.13) обязаны звать checkThemeContrast — этот тест доказывает, что
// вердикт не зависит от того, кто именно резолвит пары из SSOT, пока используется один lookup.
describe('checkThemeContrast — SSOT (паритет вердиктов, P8.6, Major #22)', () => {
  const lookup: Readonly<Record<string, string>> = {
    '--color-text': '#1a1a1a',
    '--color-text-muted': '#5a5a5a',
    '--color-bg-page': '#ffffff',
    '--color-bg-subtle': '#f5f5f5',
    '--color-bg-elevated': '#ffffff',
    '--color-link': '#0645ad',
    '--color-link-hover': '#0b0080',
    '--color-on-primary': '#ffffff',
    '--color-action-primary': '#1a4fd6',
    '--color-action-primary-hover': '#123a9e',
    '--color-focus-ring': '#1a4fd6',
  }

  test('прогоняет все 14 пар SSOT (роли присутствуют в lookup)', () => {
    const result = checkThemeContrast(lookup)
    expect(result.reports).toHaveLength(SEMANTIC_CONTRAST_PAIRS.length)
  })

  test('паритет: вручную построенные пары из SEMANTIC_CONTRAST_PAIRS дают тот же вердикт, что checkThemeContrast', () => {
    // Симулирует то, что раньше делали CLI/gen-tokens по отдельности каждый со своей таблицей —
    // теперь оба читают ОДИН SEMANTIC_CONTRAST_PAIRS, поэтому построение вручную из SSOT и вызов
    // checkThemeContrast обязаны сойтись 1:1.
    const manualPairs = SEMANTIC_CONTRAST_PAIRS.map((spec) => ({
      fg: lookup[spec.fg]!,
      bg: lookup[spec.bg]!,
      usage: spec.usage,
      label: spec.label,
      base: lookup['--color-bg-page'],
    }))
    const manual = checkContrast(manualPairs)
    const viaSsot = checkThemeContrast(lookup)

    expect(viaSsot.pass).toBe(manual.pass)
    expect(viaSsot.reports.map((r) => r.lc)).toEqual(manual.reports.map((r) => r.lc))
    expect(viaSsot.reports.map((r) => r.pass)).toEqual(manual.reports.map((r) => r.pass))
  })

  test('роль отсутствует в lookup — пара пропускается, не throw', () => {
    const partial: Readonly<Record<string, string>> = {
      '--color-text': '#1a1a1a',
      '--color-bg-page': '#ffffff',
    }
    const result = checkThemeContrast(partial)
    expect(result.reports).toHaveLength(1)
    expect(result.reports[0]!.pair.label).toBe('text/bg.page')
  })
})
