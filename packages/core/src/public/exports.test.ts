import { expect, test } from 'vitest'

import * as root from '../index'
import * as authoring from './authoring'
import * as compiler from './compiler'
import * as runtime from './runtime'
import * as dtcg from './dtcg'
import * as tenant from './tenant'
import pkg from '../../package.json'

const HIDDEN = [
  'TOKEN_BRAND',
  'normalizeDtcg',
  'walkTree',
  'canonicalJson',
  'fnv1a64',
  'declareExtensions',
  'COLOR_FN_SPACE_NAMES',
  'NAMED_COLOR_NAMES',
  'formatTextVarNames',
  'assertSafeCssToken',
] as const

const SUBPATH_EXPORTS = {
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
  },
  './authoring': {
    types: './dist/public/authoring.d.ts',
    import: './dist/public/authoring.js',
  },
  './compiler': {
    types: './dist/public/compiler.d.ts',
    import: './dist/public/compiler.js',
  },
  './runtime': {
    types: './dist/public/runtime.d.ts',
    import: './dist/public/runtime.js',
  },
  './dtcg': {
    types: './dist/public/dtcg.d.ts',
    import: './dist/public/dtcg.js',
  },
  './tenant': {
    types: './dist/public/tenant.d.ts',
    import: './dist/public/tenant.js',
  },
} as const

test('additive subpath export map is explicit (ESM + types, no wildcard)', () => {
  expect(pkg.exports).toEqual(SUBPATH_EXPORTS)
  expect(pkg.type).toBe('module')
  expect('require' in (pkg.exports['.'] as object)).toBe(false)
  expect('.' in (pkg.exports as object) && './authoring' in pkg.exports).toBe(true)
})

test('authoring runtime surface', async () => {
  expect(Object.keys(authoring).sort()).toMatchInlineSnapshot(`
    [
      "NAMESPACE_TABLE",
      "THEMEON_ERROR_CODES",
      "ThemeonError",
      "cssVar",
      "defineTheme",
      "defineTokens",
      "formatVarName",
      "isToken",
      "kebabSegment",
    ]
  `)
})

test('compiler runtime surface', async () => {
  expect(Object.keys(compiler).sort()).toMatchInlineSnapshot(`
    [
      "COMPILER_STAGES",
      "COMPILER_VERSION",
      "DIAGNOSTIC_CODES",
      "DIAGNOSTIC_SCHEMA_VERSION",
      "GRAPH_MAX_DEPTH",
      "THEMEON_CSP_ARTIFACT_SCHEMA_VERSION",
      "THEMEON_ERROR_CODES",
      "THEMEON_VITE_ARTIFACT_OWNER",
      "THEMEON_VITE_MANIFEST_SCHEMA_VERSION",
      "ThemeonError",
      "aggregateDiagnostics",
      "buildCspArtifact",
      "buildFingerprint",
      "buildGraph",
      "buildViteManifest",
      "builtinExtensions",
      "canonicalId",
      "compareCanonicalId",
      "comparePath",
      "compileTheme",
      "createCompiler",
      "cspSha256Base64",
      "deprecatedCssVariablesFromIr",
      "diagnosticFromDtcg",
      "diagnosticFromGraphIssue",
      "diagnosticFromThemeonError",
      "diagnosticFromUnknown",
      "diagnosticsFromGraphIssues",
      "formatDiagnostics",
      "graphHasBlockingIssue",
      "legacyV0Alias",
      "normalizeDsl",
      "resolveTheme",
      "serializeCspArtifact",
      "serializeThemeCss",
      "serializeViteManifest",
      "sha256Hex",
      "sha256Integrity",
      "sortedCssVariables",
      "sortedThemeNames",
    ]
  `)
})

test('runtime runtime surface', async () => {
  expect(Object.keys(runtime).sort()).toMatchInlineSnapshot(`
    [
      "THEMEON_ERROR_CODES",
      "ThemeonError",
      "applyTheme",
      "clearTheme",
      "themeVars",
    ]
  `)
})

test('dtcg runtime surface', async () => {
  expect(Object.keys(dtcg).sort()).toMatchInlineSnapshot(`
    [
      "THEMEON_ERROR_CODES",
      "ThemeonError",
      "formatColor",
      "fromDTCG",
      "parseColor",
      "toDTCG",
    ]
  `)
})

test('tenant runtime surface', async () => {
  expect(Object.keys(tenant).sort()).toMatchInlineSnapshot(`
    [
      "ALLOWED_TENANT_TYPES",
      "DEFAULT_TENANT_TRUST",
      "TENANT_PATCH_POLICIES",
      "THEMEON_ERROR_CODES",
      "ThemeonError",
      "applyThemePatch",
      "resolveTenantPatchPolicy",
      "serializeThemePatch",
      "tenantThemeSchema",
    ]
  `)
})

test('old and new imports resolve to the same implementation', () => {
  expect(authoring.defineTheme).toBe(root.defineTheme)
  expect(authoring.defineTokens).toBe(root.defineTokens)
  expect(authoring.isToken).toBe(root.isToken)
  expect(authoring.cssVar).toBe(root.cssVar)
  expect(authoring.ThemeonError).toBe(root.ThemeonError)
  expect(compiler.resolveTheme).toBe(root.resolveTheme)
  expect(compiler.serializeThemeCss).toBe(root.serializeThemeCss)
  expect(compiler.legacyV0Alias).toBe(root.legacyV0Alias)
  expect(compiler.formatDiagnostics).toBe(root.formatDiagnostics)
  expect(compiler.ThemeonError).toBe(root.ThemeonError)
  expect(runtime.applyTheme).toBe(root.applyTheme)
  expect(runtime.clearTheme).toBe(root.clearTheme)
  expect(runtime.themeVars).toBe(root.themeVars)
  expect(dtcg.fromDTCG).toBe(root.fromDTCG)
  expect(dtcg.toDTCG).toBe(root.toDTCG)
  expect(dtcg.parseColor).toBe(root.parseColor)
  expect(dtcg.formatColor).toBe(root.formatColor)
  expect(tenant.applyThemePatch).toBe(root.applyThemePatch)
  expect(tenant.serializeThemePatch).toBe(root.serializeThemePatch)
  expect(tenant.tenantThemeSchema).toBe(root.tenantThemeSchema)
  expect(tenant.ALLOWED_TENANT_TYPES).toBe(root.ALLOWED_TENANT_TYPES)
})

test('subpaths do not publish internals', () => {
  const surfaces = [authoring, compiler, runtime, dtcg, tenant, root]
  for (const surface of surfaces) {
    for (const name of HIDDEN) {
      expect(name in surface).toBe(false)
    }
  }
  expect('compileTheme' in root).toBe(false)
  expect('createCompiler' in root).toBe(false)
  expect(typeof compiler.compileTheme).toBe('function')
})

test('packed dist entries share the root implementation', async () => {
  const distRoot = new URL('../../dist/index.js', import.meta.url)
  const distAuthoring = new URL('../../dist/public/authoring.js', import.meta.url)
  const distCompiler = new URL('../../dist/public/compiler.js', import.meta.url)
  const distRuntime = new URL('../../dist/public/runtime.js', import.meta.url)
  const distDtcg = new URL('../../dist/public/dtcg.js', import.meta.url)
  const distTenant = new URL('../../dist/public/tenant.js', import.meta.url)
  let packedRoot
  try {
    packedRoot = await import(distRoot.href)
  } catch {
    throw new Error('dist subpath entries missing — run packages/core build before this test')
  }
  const packedAuthoring = await import(distAuthoring.href)
  const packedCompiler = await import(distCompiler.href)
  const packedRuntime = await import(distRuntime.href)
  const packedDtcg = await import(distDtcg.href)
  const packedTenant = await import(distTenant.href)
  expect(packedAuthoring.defineTheme).toBe(packedRoot.defineTheme)
  expect(packedCompiler.resolveTheme).toBe(packedRoot.resolveTheme)
  expect(packedRuntime.applyTheme).toBe(packedRoot.applyTheme)
  expect(packedDtcg.fromDTCG).toBe(packedRoot.fromDTCG)
  expect(packedTenant.tenantThemeSchema).toBe(packedRoot.tenantThemeSchema)
  expect(packedAuthoring.ThemeonError).toBe(packedRoot.ThemeonError)
  expect(typeof packedCompiler.compileTheme).toBe('function')
  expect('compileTheme' in packedRoot).toBe(false)
})
