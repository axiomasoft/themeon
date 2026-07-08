import { describe, expect, test } from 'vitest'
import { legacyV0Alias } from './legacy-v0'
import type { AliasRule, AliasesOption } from './legacy-v0'

describe('legacyV0Alias — соответствие каноническому пути ↔ донорское имя', () => {
  test('color-роль → семантика без префикса color-', () => {
    expect(legacyV0Alias(['color', 'bg', 'page'])).toBe('--bg-page')
    expect(legacyV0Alias(['color', 'primary'])).toBe('--primary')
    expect(legacyV0Alias(['color', 'action', 'primary'])).toBe('--action-primary')
    expect(legacyV0Alias(['color', 'text', 'muted'])).toBe('--text-muted')
  })

  test('text-размер → --size-<донорский kebab с дефисом 2xl → 2-xl>', () => {
    expect(legacyV0Alias(['text', '2xl'])).toBe('--size-2-xl')
    expect(legacyV0Alias(['text', '5xl'])).toBe('--size-5-xl')
    // без цифр донорский kebab совпадает с обычным
    expect(legacyV0Alias(['text', 'base'])).toBe('--size-base')
  })

  test('space/radius/z → null (донорское имя уже совпадает с каноническим)', () => {
    expect(legacyV0Alias(['space', '4'])).toBeNull()
    expect(legacyV0Alias(['radius', 'lg'])).toBeNull()
    expect(legacyV0Alias(['z', 'modal'])).toBeNull()
  })

  test('прочие группы → null', () => {
    expect(legacyV0Alias(['font', 'sans'])).toBeNull()
    expect(legacyV0Alias(['shadow', 'md'])).toBeNull()
    expect(legacyV0Alias(['gradient', 'brand'])).toBeNull()
  })

  test('путь только из группы (без остатка) → null', () => {
    expect(legacyV0Alias(['color'])).toBeNull()
  })
})

describe('типы моста — AliasRule / AliasesOption', () => {
  test('своя функция-правило совместима с AliasRule и AliasesOption', () => {
    const custom: AliasRule = (path) => (path[0] === 'color' ? '--legacy-color' : null)
    const asOption: AliasesOption = custom
    const preset: AliasesOption = 'legacy-v0'

    expect(custom(['color', 'x'])).toBe('--legacy-color')
    expect(custom(['space', 'x'])).toBeNull()
    expect(typeof asOption).toBe('function')
    expect(preset).toBe('legacy-v0')
  })
})
