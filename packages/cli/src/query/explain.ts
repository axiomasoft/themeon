import { aggregateDiagnostics } from '@themeon/core/compiler'
import type { IrPath, IrToken } from '@themeon/core/compiler'
import type { ExplainAliasStep, ExplainPayload } from './types'
import { CLI_QUERY_SCHEMA_VERSION } from './types'
import type { QueryContext } from './context'
import { requireCompile } from './context'
import { findIrToken, findResolvedByPath, parseTokenPath, pathLabel } from './token-lookup'

function walkAliasChain(token: IrToken, document: QueryContext['document']): ExplainAliasStep[] {
  const steps: ExplainAliasStep[] = [{ path: token.path }]
  let current: IrToken | undefined = token
  const seen = new Set<string>([token.id])

  while (current?.value.kind === 'alias') {
    const ref = current.value.ref
    steps[steps.length - 1] = { path: current.path, ref }
    const next = findIrToken(document, ref)
    if (!next || seen.has(next.id)) break
    seen.add(next.id)
    steps.push({ path: next.path })
    current = next
  }

  return steps
}

function themeOverrides(
  document: QueryContext['document'],
  path: IrPath,
): Readonly<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = {}
  for (const [themeName, tokens] of Object.entries(document.themes)) {
    const hit = tokens.find((token) => pathLabel(token.path) === pathLabel(path))
    if (!hit) continue
    if (hit.value.kind === 'alias') out[themeName] = `→ ${pathLabel(hit.value.ref)}`
    else if (hit.value.kind === 'literal') out[themeName] = String(hit.value.value)
    else if (hit.value.kind === 'composite') out[themeName] = 'text composite'
  }
  return out
}

export function buildExplainPayload(ctx: QueryContext, rawPath: string): ExplainPayload {
  const path = parseTokenPath(rawPath)
  const token = findIrToken(ctx.document, path)

  if (!token) {
    const diagnostics = aggregateDiagnostics([
      {
        code: 'THEMEON_QUERY_UNKNOWN_TOKEN',
        severity: 'error',
        message: `No token at path ${pathLabel(path)}`,
        path,
        provenance: { stage: 'validate', producer: 'explain' },
      },
    ])
    return {
      schemaVersion: CLI_QUERY_SCHEMA_VERSION,
      command: 'explain',
      config: ctx.configRel,
      path,
      aliasChain: [],
      themeOverrides: {},
      diagnostics,
      ok: false,
    }
  }

  let resolvedValue: string | undefined
  let cssVariable: string | undefined
  const compileDiagnostics = ctx.compile?.diagnostics ?? []
  try {
    const compile = requireCompile(ctx)
    const resolved = findResolvedByPath(compile.resolved, path)
    resolvedValue = resolved?.value
    cssVariable = resolved?.varName
  } catch {
    // explain still returns authored/provenance evidence when resolve failed
  }

  const diagnostics = aggregateDiagnostics([
    ...(ctx.compileError ? [ctx.compileError] : []),
    ...compileDiagnostics,
  ])

  return {
    schemaVersion: CLI_QUERY_SCHEMA_VERSION,
    command: 'explain',
    config: ctx.configRel,
    path,
    type: token.type,
    ...(cssVariable ? { cssVariable } : {}),
    ...(resolvedValue !== undefined ? { resolvedValue } : {}),
    aliasChain: walkAliasChain(token, ctx.document),
    themeOverrides: themeOverrides(ctx.document, path),
    diagnostics,
    ok: true,
  }
}
