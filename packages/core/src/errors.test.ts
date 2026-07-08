import { describe, expect, test } from 'vitest'
import { ThemeonError } from './errors'

describe('ThemeonError', () => {
  test('несёт код и сообщение, является instanceof Error', () => {
    const err = new ThemeonError('CYCLE', 'Circular token reference: color.a → color.b → color.a')

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ThemeonError)
    expect(err.code).toBe('CYCLE')
    expect(err.message).toBe('Circular token reference: color.a → color.b → color.a')
    expect(err.name).toBe('ThemeonError')
  })

  test.each([
    'CYCLE',
    'UNKNOWN_PATH',
    'BAD_VALUE',
    'NAME_COLLISION',
    'DTCG_PARSE',
  ] as const)('код %s сохраняется на инстансе', (code) => {
    const err = new ThemeonError(code, 'msg')
    expect(err.code).toBe(code)
  })
})
