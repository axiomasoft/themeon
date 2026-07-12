import { describe, expect, it } from 'vitest'
import { FOUNDATION_CSS, shouldPushCss, toPublicRuntimeConfig } from './internal/normalize'

describe('shouldPushCss', () => {
  it('по умолчанию (опция не задана) — вставлять CSS', () => {
    expect(shouldPushCss({})).toBe(true)
  })

  it('css:true — вставлять CSS', () => {
    expect(shouldPushCss({ css: true })).toBe(true)
  })

  it('css:false — НЕ вставлять CSS', () => {
    expect(shouldPushCss({ css: false })).toBe(false)
  })
})

describe('FOUNDATION_CSS', () => {
  it('tokens.css идёт первым, index.css вторым (P2.7 порядок)', () => {
    expect(FOUNDATION_CSS).toEqual(['@themeon/css/tokens.css', '@themeon/css/index.css'])
  })
})

describe('toPublicRuntimeConfig', () => {
  it('пробрасывает storageKey/default/themes/attribute как есть', () => {
    expect(
      toPublicRuntimeConfig({
        storageKey: 'my-theme',
        default: 'dark',
        themes: ['light', 'dark', 'contrast'],
        attribute: 'data-mode',
      }),
    ).toEqual({
      storageKey: 'my-theme',
      default: 'dark',
      themes: ['light', 'dark', 'contrast'],
      attribute: 'data-mode',
    })
  })

  it('пустые опции → storageKey/themes/attribute падают на MODULE_DEFAULTS, default остаётся undefined', () => {
    expect(toPublicRuntimeConfig({})).toEqual({
      storageKey: 'themeon-theme',
      default: undefined,
      themes: ['light', 'dark'],
      attribute: 'data-theme',
    })
  })
})
