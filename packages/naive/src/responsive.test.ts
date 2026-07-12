import type { GlobalThemeOverrides } from 'naive-ui'
import { describe, expect, test } from 'vitest'
import { resolveResponsiveOverrides } from './responsive'
import type { BreakpointOverrides } from './types'

describe('resolveResponsiveOverrides', () => {
  const base = { common: { primaryColor: '#base', fontSizeMedium: '16px' } } as unknown as GlobalThemeOverrides
  const overrides: BreakpointOverrides = {
    sm: { common: { fontSizeMedium: '14px' } } as unknown as GlobalThemeOverrides,
    lg: { common: { fontSizeMedium: '18px' } } as unknown as GlobalThemeOverrides,
  }

  test('активные брейкпоинты применяются по порядку — узкий поверх широкого, широкий побеждает если он позже', () => {
    const out = resolveResponsiveOverrides(base, overrides, ['sm', 'lg']) as any
    expect(out.common.fontSizeMedium).toBe('18px') // 'lg' — последний в массиве, побеждает
    expect(out.common.primaryColor).toBe('#base')
  })

  test('только один активный брейкпоинт применяется', () => {
    const out = resolveResponsiveOverrides(base, overrides, ['sm']) as any
    expect(out.common.fontSizeMedium).toBe('14px')
  })

  test('нет активных брейкпоинтов → base без изменений', () => {
    const out = resolveResponsiveOverrides(base, overrides, []) as any
    expect(out.common.fontSizeMedium).toBe('16px')
  })

  test('отсутствующее имя в breakpointOverrides — пропуск, не ошибка', () => {
    const out = resolveResponsiveOverrides(base, overrides, ['unknown']) as any
    expect(out.common.fontSizeMedium).toBe('16px')
  })
})
