import { describe, expect, expectTypeOf, test } from 'vitest'
import { defineTheme } from '../define'
import { compileTheme } from '../pipeline/compile'
import { irDocument, withMetadata } from '../model/build'
import {
  buildCspArtifact,
  buildViteManifest,
  cspSha256Base64,
  deprecatedCssVariablesFromIr,
  serializeCspArtifact,
  serializeViteManifest,
  sha256Hex,
  THEMEON_VITE_ARTIFACT_OWNER,
  THEMEON_VITE_MANIFEST_SCHEMA_VERSION,
  type ThemeonViteManifestCssV1,
} from './vite-delivery'

const theme = defineTheme({
  base: { color: { bg: { page: 'oklch(0.99 0 0)' } } },
  themes: { dark: { color: { bg: { page: 'oklch(0.2 0 0)' } } } },
})

describe('vite delivery manifest (P3.3)', () => {
  test('virtual delivery manifest fields and stable JSON', () => {
    const compiled = compileTheme(theme)
    const manifest = buildViteManifest({
      fingerprint: compiled.fingerprint,
      css: compiled.css,
      resolved: compiled.resolved,
      document: compiled.document,
      delivery: 'virtual',
      virtualModuleId: 'virtual:themeon.css',
    })
    expect(manifest.schemaVersion).toBe(THEMEON_VITE_MANIFEST_SCHEMA_VERSION)
    expect(manifest.owner).toBe(THEMEON_VITE_ARTIFACT_OWNER)
    expect(manifest.css).toMatchObject({ delivery: 'virtual', virtualModuleId: 'virtual:themeon.css' })
    expect(manifest.css.sha256).toBe(sha256Hex(compiled.css))
    expect(manifest.css.integrity).toBe(`sha256-${cspSha256Base64(compiled.css)}`)
    expect(manifest.themes).toEqual(['dark'])
    expect(manifest.cssVariables).toContain('--color-bg-page')
    expect(serializeViteManifest(manifest)).toBe(serializeViteManifest(manifest))
  })

  test('file delivery includes relativePath', () => {
    const compiled = compileTheme(theme)
    const manifest = buildViteManifest({
      fingerprint: compiled.fingerprint,
      css: compiled.css,
      resolved: compiled.resolved,
      document: compiled.document,
      delivery: 'file',
      cssRelativePath: '.themeon/theme.css',
    })
    expect(manifest.css.delivery).toBe('file')
    if (manifest.css.delivery !== 'file') throw new Error('unreachable')
    expect(manifest.css.relativePath).toBe('.themeon/theme.css')
    expect('virtualModuleId' in manifest.css).toBe(false)
  })

  test('file delivery without a path is a type error and a runtime BAD_VALUE', () => {
    const compiled = compileTheme(theme)
    const common = { fingerprint: compiled.fingerprint, css: compiled.css, resolved: compiled.resolved }
    // @ts-expect-error — delivery 'file' requires cssRelativePath
    expect(() => buildViteManifest({ ...common, delivery: 'file' })).toThrow(/cssRelativePath/)
    expect(() => buildViteManifest({ ...common, delivery: 'file', cssRelativePath: '' })).toThrow(
      /cssRelativePath/,
    )
  })

  test('manifest css block is a discriminated union', () => {
    expectTypeOf<ThemeonViteManifestCssV1>()
      .extract<{ delivery: 'file' }>()
      .toHaveProperty('relativePath')
      .toEqualTypeOf<string>()
    expectTypeOf<ThemeonViteManifestCssV1>()
      .extract<{ delivery: 'virtual' }>()
      .toHaveProperty('virtualModuleId')
      .toEqualTypeOf<string>()
  })
  test('manifest includes deprecatedCssVariables from IR metadata', () => {
    const compiled = compileTheme(theme)
    const tokens = compiled.document.tokens.map((t) =>
      JSON.stringify(t.path) === JSON.stringify(['color', 'bg', 'page'])
        ? withMetadata(t, { deprecated: 'use color.bg.surface' })
        : t,
    )
    const document = irDocument({
      tokens,
      sysIds: compiled.document.sysIds,
      themes: compiled.document.themes,
      schemes: compiled.document.schemes,
    })
    const deprecated = deprecatedCssVariablesFromIr(document, compiled.resolved)
    expect(deprecated).toEqual([{ name: '--color-bg-page', message: 'use color.bg.surface' }])
    const manifest = buildViteManifest({
      fingerprint: compiled.fingerprint,
      css: compiled.css,
      resolved: compiled.resolved,
      document,
      delivery: 'virtual',
    })
    expect(manifest.deprecatedCssVariables).toEqual(deprecated)
  })
})

describe('anti-FOUC CSP artifact (core builder)', () => {
  test('CSP hash derives from exact script bytes', () => {
    const script = "(function(){})()"
    const artifact = buildCspArtifact({
      script,
      storageKey: 'themeon-theme',
      attribute: 'data-theme',
    })
    expect(artifact.script.cspSha256).toBe(cspSha256Base64(script))
    expect(artifact.script.sha256).toBe(sha256Hex(script))
    expect(serializeCspArtifact(artifact)).toContain(artifact.script.cspSha256)
  })
})
