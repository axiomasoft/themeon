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
