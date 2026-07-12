import { describe, expect, test } from 'vitest'

import { ColorsError } from './errors'
import { LC_THRESHOLDS, checkContrast, contrastAPCA } from './contrast'

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
