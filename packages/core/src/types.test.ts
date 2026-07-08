import { describe, expect, expectTypeOf, test } from 'vitest'
import { TOKEN_BRAND, isToken } from './types'
import type { SysPatch, Token, Tokenized, WellKnownSys } from './types'

describe('Tokenized<T>', () => {
  test('оборачивает листья в Token, сохраняя форму дерева', () => {
    expectTypeOf<Tokenized<{ a: { b: string } }>>().toEqualTypeOf<{
      readonly a: { readonly b: Token }
    }>()
  })
})

describe('Token — бренд недоступен снаружи модуля', () => {
  test('обычный литерал без бренда не присваивается Token', () => {
    // @ts-expect-error — без бренд-символа (не экспортируется из index.ts) объект не Token
    const fake: Token = { type: 'color', path: ['color', 'x'], value: '#fff' }
    void fake
  })
})

describe('SysPatch<T>', () => {
  test('принимает частичный патч по существующим ключам well-known группы', () => {
    const patch: SysPatch<WellKnownSys> = {
      color: { bg: { page: '#000' } },
      space: { 4: '1rem' },
    }
    expect(patch).toBeDefined()
  })

  test('неизвестный ключ well-known группы — ошибка типов', () => {
    // @ts-expect-error — 'TYPO' не входит в WellKnownSys
    const patch: SysPatch<WellKnownSys> = { TYPO: '#fff' }
    void patch
  })
})

describe('isToken', () => {
  test('отклоняет примитивы и null/undefined', () => {
    expect(isToken(null)).toBe(false)
    expect(isToken(undefined)).toBe(false)
    expect(isToken('string')).toBe(false)
    expect(isToken(42)).toBe(false)
  })

  test('отклоняет структурно похожий объект без бренда', () => {
    const lookalike = { type: 'color', path: ['color', 'x'], value: '#fff' }
    expect(isToken(lookalike)).toBe(false)
  })

  test('распознаёт настоящий Token по бренд-символу', () => {
    // Реальные Token собирает defineTokens (P1.2); здесь — колоцированная сборка
    // напрямую через TOKEN_BRAND (доступен внутри пакета, не экспортируется из index.ts).
    const real: Token = Object.freeze({
      [TOKEN_BRAND]: true as const,
      type: 'color' as const,
      path: ['color', 'x'],
      value: '#fff',
    })
    expect(isToken(real)).toBe(true)
  })
})
