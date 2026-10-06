import { describe, expectTypeOf, test } from 'vitest'
import type { ThemeName, ThemeNameOf, ThemePreference, UseThemeReturn } from './types'

describe('ThemeonRegister (opt-in typed theme names)', () => {
  test('without augmentation theme names stay plain strings (backward compatible)', () => {
    expectTypeOf<ThemeName>().toEqualTypeOf<string>()
    expectTypeOf<UseThemeReturn['set']>().parameter(0).toEqualTypeOf<string>()
  })

  test('a registered union narrows names and keeps the reserved "system" preference', () => {
    type Registered = ThemeNameOf<{ theme: 'light' | 'dark' | 'sepia' }>
    expectTypeOf<Registered>().toEqualTypeOf<'light' | 'dark' | 'sepia'>()
    expectTypeOf<Registered | 'system'>().toEqualTypeOf<'light' | 'dark' | 'sepia' | 'system'>()
  })

  test('a malformed registry falls back to string instead of never', () => {
    expectTypeOf<ThemeNameOf<{ theme: 42 }>>().toEqualTypeOf<string>()
    expectTypeOf<ThemeNameOf<object>>().toEqualTypeOf<string>()
  })

  test('preference type is name | system', () => {
    expectTypeOf<ThemePreference>().toEqualTypeOf<string>()
  })
})
