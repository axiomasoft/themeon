import { describe, expect, test } from 'vitest'
import { THEMEON_ERROR_CODES, ThemeonError } from './errors'
import { THEMEON_ERROR_TO_DIAGNOSTIC } from './diagnostics/catalog'

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
    'DTCG_LOSSY_IMPORT',
    'PATCH_LIMIT',
    'PATCH_POLICY',
    'PATCH_UNICODE',
    'PATCH_CYCLE',
  ] as const)('код %s сохраняется на инстансе', (code) => {
    const err = new ThemeonError(code, 'msg')
    expect(err.code).toBe(code)
  })

  test('every ThemeonError code has an additive diagnostic mapping', () => {
    for (const code of THEMEON_ERROR_CODES) {
      expect(THEMEON_ERROR_TO_DIAGNOSTIC[code]).toMatch(/^THEMEON_/)
    }
  })

  test('path and hint are optional structured diagnostics and omit hostile payload by contract of callers', () => {
    const err = new ThemeonError('PATCH_LIMIT', 'Tenant patch exceeds the selected trust bounds', {
      path: ['color', 'bg', 'page'],
      hint: 'Shorten the value',
    })
    expect(err.path).toEqual(['color', 'bg', 'page'])
    expect(err.hint).toBe('Shorten the value')
    expect(Object.isFrozen(err.path)).toBe(true)
  })
})
