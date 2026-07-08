import { describe, expect, test } from 'vitest'
import {
  NAMESPACE_TABLE,
  cssVar,
  formatTextVarNames,
  formatVarName,
  kebabSegment,
} from './naming'
import { defineTokens } from './define'
import type { Token } from './types'

// [VERIFY-ON-IMPL закрыт 2026-07-08] Дробные spacing-шаги: в default theme.css Tailwind НЕ
// заводит именованную переменную `--spacing-1.5` — дробные утилиты выводятся из скаляра
// `--spacing` через calc() (`--spacing()`-функция, `calc(var(--spacing) * 1.5)`).
// Источник: https://tailwindcss.com/docs/theme + https://tailwindcss.com/docs/functions-and-directives.
// Канонической var-формы дроби у Tailwind нет → ThemeOn фиксирует '1-5' (точка невалидна как
// dashed-ident без экранирования); выбор закреплён тестом ниже (['space','1.5'] → --spacing-1-5).

describe('kebabSegment — правила цифр и camelCase', () => {
  test.each([
    ['bgBase', 'bg-base'], // camelCase → kebab
    ['size2xl', 'size-2xl'], // буква→цифра: дефис (анти-баг R-01 §2)
    ['2xl', '2xl'], // цифра→буква: БЕЗ дефиса (канон Tailwind)
    ['2XL', '2xl'], // цифра→Прописная: тоже БЕЗ дефиса (регрессия P1.3-review: donor-баг '2-xl')
    ['v2Beta', 'v-2beta'], // буква→цифра — дефис, цифра→Прописная — без дефиса
    ['1.5', '1-5'], // точка-разделитель → дефис
    ['1_5', '1-5'], // подчёркивание → дефис
    ['fooBar', 'foo-bar'],
    ['forest', 'forest'],
    ['600', '600'],
  ])('kebabSegment(%j) === %j', (input, expected) => {
    expect(kebabSegment(input)).toBe(expected)
  })
})

describe('formatVarName — путь → имя переменной', () => {
  test.each([
    [['color', 'forest', '600'], '--color-forest-600'],
    [['color', 'bg', 'page'], '--color-bg-page'],
    [['space', '4'], '--spacing-4'], // group space → namespace spacing
    [['space', '1.5'], '--spacing-1-5'], // дробный шаг
    [['text', '2xl'], '--text-2xl'], // size-имя (companion — formatTextVarNames)
    [['breakpoint', '2xl'], '--breakpoint-2xl'],
    [['z', 'modal'], '--z-modal'],
    [['radius', 'lg'], '--radius-lg'],
    [['fontWeight', 'bold'], '--font-weight-bold'], // группа fontWeight → namespace font-weight
  ])('formatVarName(%j) === %j', (path, expected) => {
    expect(formatVarName(path)).toBe(expected)
  })

  test('prefix добавляется сразу после "--"', () => {
    expect(formatVarName(['color', 'primary'], { prefix: 'to' })).toBe('--to-color-primary')
  })

  test('неизвестная группа → namespace = kebab самой группы', () => {
    expect(formatVarName(['myGroup', 'x'])).toBe('--my-group-x')
  })
})

describe('formatTextVarNames — companion line-height (double-dash)', () => {
  test('пара size + --line-height', () => {
    expect(formatTextVarNames(['text', '2xl'])).toEqual({
      size: '--text-2xl',
      lineHeight: '--text-2xl--line-height',
    })
  })

  test('prefix применяется к обоим именам', () => {
    expect(formatTextVarNames(['text', 'sm'], { prefix: 'to' })).toEqual({
      size: '--to-text-sm',
      lineHeight: '--to-text-sm--line-height',
    })
  })
})

describe('cssVar — типизированная var()-ссылка на Token', () => {
  test('оборачивает имя переменной токена в var()', () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
    expect(cssVar(palette.forest[600] as Token)).toBe('var(--color-forest-600)')
  })

  test('учитывает prefix', () => {
    const palette = defineTokens('color', { primary: '#fff' })
    expect(cssVar(palette.primary as Token, { prefix: 'to' })).toBe('var(--to-color-primary)')
  })
})

describe('NAMESPACE_TABLE — единственный источник соответствия групп', () => {
  test('ключевые каноны Tailwind + расширения ThemeOn', () => {
    expect(NAMESPACE_TABLE.space).toBe('spacing')
    expect(NAMESPACE_TABLE.fontWeight).toBe('font-weight')
    expect(NAMESPACE_TABLE.color).toBe('color')
    expect(NAMESPACE_TABLE.gradient).toBe('gradient') // расширение
  })
})
