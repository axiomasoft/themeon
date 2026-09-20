import { createHash } from 'node:crypto'
import type { IrDocument, IrToken } from '../model/ir'
import { COMPILER_VERSION } from '../pipeline/types'
import type { CssVarName, ResolvedTheme } from '../types'

/** Machine contract version for PHP-readable Vite delivery manifests (P3.3). */
export const THEMEON_VITE_MANIFEST_SCHEMA_VERSION = 1 as const

/** Ownership marker written into every ThemeOn Vite artifact directory. */
export const THEMEON_VITE_ARTIFACT_OWNER = '@themeon/vite'

export const THEMEON_CSP_ARTIFACT_SCHEMA_VERSION = 1 as const

export interface ThemeonViteManifestCssV1 {
  /** How the CSS is delivered to the app. */
  readonly delivery: 'virtual' | 'file'
  /** Public virtual module id when `delivery` is `virtual`. */
  readonly virtualModuleId?: string
  /** Project-root-relative path when `delivery` is `file`. */
  readonly relativePath?: string
  readonly sha256: string
  readonly bytes: number
  /** Subresource-integrity form (`sha256-<base64>`). */
  readonly integrity: string
}

export interface ThemeonViteManifestDeprecatedVarV1 {
  readonly name: CssVarName
  /** DTCG `$deprecated` string when provided; omitted when boolean `true`. */
  readonly message?: string
}

export interface ThemeonViteManifestV1 {
  readonly schemaVersion: typeof THEMEON_VITE_MANIFEST_SCHEMA_VERSION
  readonly owner: string
  readonly compilerVersion: string
  readonly fingerprint: string
  readonly css: ThemeonViteManifestCssV1
  readonly themes: readonly string[]
  readonly cssVariables: readonly string[]
  /** Present when compile IR carries `$deprecated` metadata for emitted variables. */
  readonly deprecatedCssVariables?: readonly ThemeonViteManifestDeprecatedVarV1[]
}

export interface ThemeonCspArtifactV1 {
  readonly schemaVersion: typeof THEMEON_CSP_ARTIFACT_SCHEMA_VERSION
  readonly owner: string
  readonly storageKey: string
  readonly attribute: string
  readonly script: {
    readonly bytes: number
    readonly sha256: string
    /** Base64 digest for CSP `script-src 'sha256-…'` (exact emitted script bytes). */
    readonly cspSha256: string
  }
}

export function sha256Hex(bytes: string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function sha256Integrity(bytes: string): string {
  return `sha256-${createHash('sha256').update(bytes).digest('base64')}`
}

export function cspSha256Base64(script: string): string {
  return createHash('sha256').update(script).digest('base64')
}

export function sortedThemeNames(resolved: ResolvedTheme): readonly string[] {
  return Object.keys(resolved.themes).sort()
}

export function sortedCssVariables(resolved: ResolvedTheme): readonly string[] {
  return Object.keys(resolved.vars).sort()
}

function pathKey(path: readonly string[]): string {
  return JSON.stringify(path)
}

function varNamesForPath(resolved: ResolvedTheme, path: readonly string[]): readonly CssVarName[] {
  const key = pathKey(path)
  const names: CssVarName[] = []
  for (const token of resolved.tokens) {
    if (pathKey(token.path) === key) names.push(token.varName)
  }
  for (const themeTokens of Object.values(resolved.themes)) {
    for (const token of themeTokens) {
      if (pathKey(token.path) === key) names.push(token.varName)
    }
  }
  return names
}

/** Collect deprecated CSS variables from canonical IR + resolved var names (P3.5 manifest resolver). */
export function deprecatedCssVariablesFromIr(
  document: IrDocument,
  resolved: ResolvedTheme,
): readonly ThemeonViteManifestDeprecatedVarV1[] {
  const out: ThemeonViteManifestDeprecatedVarV1[] = []
  const seen = new Set<string>()

  function visit(token: IrToken): void {
    const flag = token.metadata.deprecated
    if (flag === undefined) return
    const message = typeof flag === 'string' ? flag : undefined
    for (const name of varNamesForPath(resolved, token.path)) {
      if (seen.has(name)) continue
      seen.add(name)
      out.push(
        Object.freeze({
          name,
          ...(message !== undefined ? { message } : {}),
        }),
      )
    }
  }

  for (const token of document.tokens) visit(token)
  for (const themeTokens of Object.values(document.themes)) {
    for (const token of themeTokens) visit(token)
  }

  return Object.freeze(out.sort((a, b) => a.name.localeCompare(b.name)))
}

export interface BuildViteManifestInput {
  readonly owner?: string
  readonly compilerVersion?: string
  readonly fingerprint: string
  readonly css: string
  readonly resolved: ResolvedTheme
  readonly document?: IrDocument
  readonly delivery: 'virtual' | 'file'
  readonly virtualModuleId?: string
  readonly cssRelativePath?: string
}

/** Deterministic manifest object (stable field order for JSON.stringify). */
export function buildViteManifest(input: BuildViteManifestInput): ThemeonViteManifestV1 {
  const css = input.css
  const cssBlock: ThemeonViteManifestCssV1 =
    input.delivery === 'virtual'
      ? Object.freeze({
          delivery: 'virtual',
          virtualModuleId: input.virtualModuleId ?? 'virtual:themeon.css',
          sha256: sha256Hex(css),
          bytes: Buffer.byteLength(css, 'utf8'),
          integrity: sha256Integrity(css),
        })
      : Object.freeze({
          delivery: 'file',
          relativePath: input.cssRelativePath,
          sha256: sha256Hex(css),
          bytes: Buffer.byteLength(css, 'utf8'),
          integrity: sha256Integrity(css),
        })

  const deprecated =
    input.document !== undefined
      ? deprecatedCssVariablesFromIr(input.document, input.resolved)
      : undefined

  return Object.freeze({
    schemaVersion: THEMEON_VITE_MANIFEST_SCHEMA_VERSION,
    owner: input.owner ?? THEMEON_VITE_ARTIFACT_OWNER,
    compilerVersion: input.compilerVersion ?? COMPILER_VERSION,
    fingerprint: input.fingerprint,
    css: cssBlock,
    themes: sortedThemeNames(input.resolved),
    cssVariables: sortedCssVariables(input.resolved),
    ...(deprecated !== undefined && deprecated.length > 0 ? { deprecatedCssVariables: deprecated } : {}),
  })
}

export function serializeViteManifest(manifest: ThemeonViteManifestV1): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

export interface BuildCspArtifactInput {
  readonly owner?: string
  readonly script: string
  readonly storageKey: string
  readonly attribute: string
}

export function buildCspArtifact(input: BuildCspArtifactInput): ThemeonCspArtifactV1 {
  const script = input.script
  return Object.freeze({
    schemaVersion: THEMEON_CSP_ARTIFACT_SCHEMA_VERSION,
    owner: input.owner ?? THEMEON_VITE_ARTIFACT_OWNER,
    storageKey: input.storageKey,
    attribute: input.attribute,
    script: Object.freeze({
      bytes: Buffer.byteLength(script, 'utf8'),
      sha256: sha256Hex(script),
      cspSha256: cspSha256Base64(script),
    }),
  })
}

export function serializeCspArtifact(artifact: ThemeonCspArtifactV1): string {
  return `${JSON.stringify(artifact, null, 2)}\n`
}
