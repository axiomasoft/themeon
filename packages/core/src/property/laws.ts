import { defineTheme } from '../define'
import { fromDTCG } from '../dtcg/from-dtcg'
import { toDTCG } from '../dtcg/to-dtcg'
import { formatVarName } from '../naming'
import { applyThemePatch } from '../patch'
import { resolveTheme } from '../resolve'
import { serializeThemeCss } from '../serialize'
import type { ThemeDefinition } from '../types'

export function stableVars(theme: ThemeDefinition): Record<string, string> {
  const resolved = resolveTheme(theme)
  return Object.fromEntries(Object.entries(resolved.vars).sort(([a], [b]) => a.localeCompare(b)))
}

export function lawResolveDeterministic(theme: ThemeDefinition): boolean {
  const a = stableVars(theme)
  const b = stableVars(theme)
  return JSON.stringify(a) === JSON.stringify(b)
}

export function lawSerializeDeterministic(theme: ThemeDefinition): boolean {
  const resolved = resolveTheme(theme)
  const cssA = serializeThemeCss(resolved)
  const cssB = serializeThemeCss(resolved)
  return cssA === cssB
}

export function lawInsertionOrderInvariant(theme: ThemeDefinition, permuted: ThemeDefinition): boolean {
  return serializeThemeCss(resolveTheme(theme)) === serializeThemeCss(resolveTheme(permuted))
}

export function lawNamingInjective(paths: readonly (readonly string[])[]): boolean {
  const names = new Map<string, string>()
  for (const path of paths) {
    const name = formatVarName(path)
    const prev = names.get(name)
    const key = path.join('.')
    if (prev !== undefined && prev !== key) return false
    names.set(name, key)
  }
  return true
}

export function lawDtcgRoundTripSemantics(theme: ThemeDefinition): boolean {
  const original = stableVars(theme)
  const { files } = toDTCG(theme)
  const { definition, warnings } = fromDTCG(files)
  if (warnings.length > 0) return false
  const round = stableVars(definition)
  return JSON.stringify(round) === JSON.stringify(original)
}

export function lawTenantPatchDeterministic(
  theme: ThemeDefinition,
  patch: { color: { bg: { page: string } } },
): boolean {
  const base = resolveTheme(theme)
  const a = applyThemePatch(base, patch).css
  const b = applyThemePatch(base, patch).css
  return a === b
}

export function lawTenantEmptyPatchNoDeclarations(theme: ThemeDefinition): boolean {
  const base = resolveTheme(theme)
  const { vars, css } = applyThemePatch(base, {})
  return Object.keys(vars).length === 0 && css === ':root {\n\n}\n'
}
