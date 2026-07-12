import type { GlobalThemeOverrides } from 'naive-ui'
import { describe, expect, test } from 'vitest'
import { mergeOverrides } from './merge'

describe('mergeOverrides', () => {
  test('рекурсивный: вложенный peers не затирается целиком', () => {
    const base = {
      common: { primaryColor: '#000' },
      Button: { peers: { Icon: { color: 'red' } } },
    } as unknown as GlobalThemeOverrides
    const patch = {
      Button: { peers: { Icon: { size: '16px' } } },
    } as unknown as GlobalThemeOverrides
    const out = mergeOverrides(base, patch) as any
    expect(out.Button.peers.Icon).toEqual({ color: 'red', size: '16px' })
    expect(out.common.primaryColor).toBe('#000')
  })

  test('правый слой побеждает при конфликте примитивов', () => {
    const out = mergeOverrides(
      { common: { primaryColor: '#000' } } as GlobalThemeOverrides,
      { common: { primaryColor: '#fff' } } as GlobalThemeOverrides,
    ) as any
    expect(out.common.primaryColor).toBe('#fff')
  })

  test('`__proto__`-ключ отбрасывается (прототип не загрязняется)', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}') as GlobalThemeOverrides
    const out = mergeOverrides({} as GlobalThemeOverrides, malicious) as any
    expect(({} as any).polluted).toBeUndefined()
    expect(out.polluted).toBeUndefined()
  })

  test('не мутирует входные слои (создаёт новые объекты)', () => {
    const base = { common: { primaryColor: '#000' } } as GlobalThemeOverrides
    const patch = { common: { primaryColorHover: '#111' } } as GlobalThemeOverrides
    const out = mergeOverrides(base, patch) as any
    expect(out).not.toBe(base)
    expect((base as any).common.primaryColorHover).toBeUndefined()
  })

  test('undefined-слои пропускаются', () => {
    const out = mergeOverrides(undefined, { common: { primaryColor: '#fff' } } as GlobalThemeOverrides) as any
    expect(out.common.primaryColor).toBe('#fff')
  })

  test('массивы — правый побеждает целиком (не мёржится поэлементно)', () => {
    const out = mergeOverrides(
      { Cascader: { menuBoxShadow: ['a', 'b'] } } as unknown as GlobalThemeOverrides,
      { Cascader: { menuBoxShadow: ['c'] } } as unknown as GlobalThemeOverrides,
    ) as any
    expect(out.Cascader.menuBoxShadow).toEqual(['c'])
  })
})
