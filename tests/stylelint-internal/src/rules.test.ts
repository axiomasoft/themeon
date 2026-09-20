import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import stylelint from 'stylelint'
import themeonPlugin from './index'

const manifestPath = fileURLToPath(new URL('../fixtures/sample.manifest.json', import.meta.url))

const plugins = themeonPlugin

async function lintCss(code: string, rules: Record<string, unknown>) {
  const result = await stylelint.lint({
    code,
    config: {
      plugins,
      rules,
    },
  })
  return result.results[0]?.warnings ?? []
}

describe('themeon stylelint rules (internal)', () => {
  test('unknown-custom-property accepts manifest vars and non-theme vars', async () => {
    const rule = { 'themeon/unknown-custom-property': [true, { manifestPath }] }
    expect(await lintCss('.a { color: var(--color-bg-page); }', rule)).toEqual([])
    expect(await lintCss('.a { color: var(--tw-ring-offset-width); }', rule)).toEqual([])
  })

  test('unknown-custom-property rejects theme-shaped missing vars', async () => {
    const warnings = await lintCss('.a { color: var(--color-missing); }', {
      'themeon/unknown-custom-property': [true, { manifestPath }],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.text).toMatch(/THEMEON_UNKNOWN_CUSTOM_PROPERTY/)
  })

  test('deprecated-custom-property rejects manifest deprecated vars', async () => {
    const warnings = await lintCss('.a { color: var(--color-action-primary); }', {
      'themeon/deprecated-custom-property': [true, { manifestPath }],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.text).toMatch(/THEMEON_DEPRECATED_CUSTOM_PROPERTY/)
  })

  test('manifest missing file reports unavailable', async () => {
    const warnings = await lintCss('.a { color: red; }', {
      'themeon/unknown-custom-property': [true, { manifestPath: '/no/such/manifest.json' }],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.text).toMatch(/THEMEON_MANIFEST_UNAVAILABLE/)
  })
})
