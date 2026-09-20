import { readFileSync } from 'node:fs'
import { THEMEON_VITE_MANIFEST_SCHEMA_VERSION } from '@themeon/core/compiler'

export type LoadedManifest =
  | {
      ok: true
      cssVariables: ReadonlySet<string>
      deprecated: ReadonlyMap<string, string | undefined>
      themeGroups: ReadonlySet<string>
    }
  | { ok: false; reason: 'missing-file' | 'invalid-json' | 'schema-mismatch' }

interface RawManifest {
  schemaVersion?: number
  cssVariables?: readonly string[]
  deprecatedCssVariables?: readonly { name: string; message?: string }[]
}

function themeGroupsFrom(cssVariables: Iterable<string>): Set<string> {
  const groups = new Set<string>()
  for (const name of cssVariables) {
    const group = /^--([^-]+)/.exec(name)?.[1]
    if (group !== undefined) groups.add(group)
  }
  return groups
}

export function parseManifestJson(text: string): LoadedManifest {
  let raw: RawManifest
  try {
    raw = JSON.parse(text) as RawManifest
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }
  if (raw.schemaVersion !== THEMEON_VITE_MANIFEST_SCHEMA_VERSION) {
    return { ok: false, reason: 'schema-mismatch' }
  }
  const cssVariables = new Set(raw.cssVariables ?? [])
  const deprecated = new Map<string, string | undefined>()
  for (const entry of raw.deprecatedCssVariables ?? []) {
    deprecated.set(entry.name, entry.message)
  }
  return {
    ok: true,
    cssVariables,
    deprecated,
    themeGroups: themeGroupsFrom(cssVariables),
  }
}

export function loadManifestFile(path: string): LoadedManifest {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return { ok: false, reason: 'missing-file' }
  }
  return parseManifestJson(text)
}

export function isThemeShapedVar(name: string, themeGroups: ReadonlySet<string>): boolean {
  const group = /^--([^-]+)/.exec(name)?.[1]
  return group !== undefined && themeGroups.has(group)
}
