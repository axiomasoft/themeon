import { describe, expect, it } from 'vitest'
import { buildFoucScriptOptions, FOUNDATION_CSS, shouldPushCss, toPublicRuntimeConfig } from './internal/normalize'

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

  it("пустые опции → storageKey/themes/attribute падают на MODULE_DEFAULTS, default: '' (ключ присутствует ради env-override, P3.7)", () => {
    expect(toPublicRuntimeConfig({})).toEqual({
      storageKey: 'themeon-theme',
      default: '',
      themes: ['light', 'dark'],
      attribute: 'data-theme',
    })
  })
})

describe('buildFoucScriptOptions', () => {
  it('пробрасывает storageKey/attribute/default/themes как есть', () => {
    expect(
      buildFoucScriptOptions({
        storageKey: 'my-theme',
        attribute: 'data-mode',
        default: 'dark',
        themes: ['light', 'dark', 'contrast'],
      }),
    ).toEqual({
      storageKey: 'my-theme',
      attribute: 'data-mode',
      default: 'dark',
      themes: ['light', 'dark', 'contrast'],
    })
  })

  it('пустые опции → storageKey/attribute/themes падают на MODULE_DEFAULTS (тот же источник, что useTheme/toPublicRuntimeConfig), default остаётся undefined', () => {
    expect(buildFoucScriptOptions({})).toEqual({
      storageKey: 'themeon-theme',
      attribute: 'data-theme',
      default: undefined,
      themes: ['light', 'dark'],
    })
  })

  it('themes уходит в скрипт тем же набором, что и в runtimeConfig (скрипт и init() валидируют персист одинаково)', () => {
    const options = { themes: ['light', 'dark', 'contrast'] }
    expect(buildFoucScriptOptions(options).themes).toEqual(toPublicRuntimeConfig(options).themes)
  })
})
