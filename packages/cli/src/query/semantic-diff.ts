import { aggregateDiagnostics, canonicalId } from '@themeon/core/compiler'
import type { IrDocument, IrToken, ResolvedToken } from '@themeon/core/compiler'
import type { QueryContext } from './context'
import { requireCompile } from './context'
import { pathLabel } from './token-lookup'
import type {
  ChangeConfidence,
  ChangeEvidence,
  ChangeSafety,
  DiffPayload,
  DiffSummary,
  MigrationHint,
  SemanticChange,
} from './semantic-types'
import { CLI_SEMANTIC_SCHEMA_VERSION } from './semantic-types'

interface IndexedToken {
  readonly scope: 'base' | 'theme'
  readonly theme?: string
  readonly token: IrToken
}

function tokenSignature(token: IrToken): string {
  return JSON.stringify({
    type: token.type,
    value: token.value,
    metadata: token.metadata,
  })
}

function indexAuthored(document: IrDocument): Map<string, IndexedToken> {
  const map = new Map<string, IndexedToken>()
  for (const token of document.tokens) {
    map.set(pathLabel(token.path), { scope: 'base', token })
  }
  for (const [theme, list] of Object.entries(document.themes)) {
    for (const token of list) {
      map.set(`@${theme}:${pathLabel(token.path)}`, { scope: 'theme', theme, token })
    }
  }
  return map
}

function resolvedBaseMap(resolved: { tokens: readonly ResolvedToken[] }): Map<string, ResolvedToken> {
  const map = new Map<string, ResolvedToken>()
  for (const token of resolved.tokens) map.set(pathLabel(token.path), token)
  return map
}

function resolvedThemeMap(
  resolved: { themes: Readonly<Record<string, readonly ResolvedToken[]>> },
): Map<string, ResolvedToken> {
  const map = new Map<string, ResolvedToken>()
  for (const [theme, list] of Object.entries(resolved.themes)) {
    for (const token of list) map.set(`@${theme}:${pathLabel(token.path)}`, token)
  }
  return map
}

function changeId(parts: string[]): string {
  return parts.join('|')
}

function pushChange(
  into: SemanticChange[],
  input: Omit<SemanticChange, 'id' | 'provenance'> & { provenance?: SemanticChange['provenance'] },
  provenance: SemanticChange['provenance'],
): void {
  into.push({
    ...input,
    provenance,
    id: changeId([
      input.class,
      input.theme ?? '',
      input.path ? pathLabel(input.path) : '',
      String(into.length),
    ]),
  })
}

function classifyAuthoredDelta(
  oldEntry: IndexedToken | undefined,
  newEntry: IndexedToken | undefined,
  provenance: SemanticChange['provenance'],
  into: SemanticChange[],
): void {
  if (!oldEntry && newEntry) {
    pushChange(
      into,
      {
        class: 'token.added',
        confidence: 'high',
        safety: newEntry.scope === 'base' ? 'unknown' : 'non-breaking',
        path: newEntry.token.path,
        ...(newEntry.theme ? { theme: newEntry.theme } : {}),
        after: tokenSignature(newEntry.token),
        evidence: [{ kind: 'authored-ir', detail: 'Token present only in new theme' }],
      },
      provenance,
    )
    return
  }
  if (oldEntry && !newEntry) {
    pushChange(
      into,
      {
        class: 'token.removed',
        confidence: 'high',
        safety: 'breaking',
        path: oldEntry.token.path,
        ...(oldEntry.theme ? { theme: oldEntry.theme } : {}),
        before: tokenSignature(oldEntry.token),
        evidence: [{ kind: 'authored-ir', detail: 'Token present only in old theme' }],
      },
      provenance,
    )
    return
  }
  if (!oldEntry || !newEntry) return

  const oldToken = oldEntry.token
  const newToken = newEntry.token
  const path = oldToken.path
  const theme = oldEntry.theme

  if (oldToken.type !== newToken.type) {
    pushChange(
      into,
      {
        class: 'type.changed',
        confidence: 'high',
        safety: 'breaking',
        path,
        ...(theme ? { theme } : {}),
        before: oldToken.type,
        after: newToken.type,
        evidence: [{ kind: 'authored-ir', detail: 'Token type differs' }],
      },
      provenance,
    )
  }

  if (tokenSignature(oldToken) !== tokenSignature(newToken) && oldToken.type === newToken.type) {
    const isAliasShift =
      oldToken.value.kind === 'alias' &&
      newToken.value.kind === 'alias' &&
      canonicalId(oldToken.value.ref) !== canonicalId(newToken.value.ref)
    pushChange(
      into,
      {
        class: isAliasShift ? 'alias.target.changed' : oldEntry.scope === 'theme' ? 'theme.override.changed' : 'value.changed',
        confidence: 'high',
        safety: oldEntry.scope === 'theme' ? 'non-breaking' : 'unknown',
        path,
        ...(theme ? { theme } : {}),
        before: oldToken.value,
        after: newToken.value,
        evidence: [{ kind: 'authored-ir', detail: isAliasShift ? 'Alias target changed' : 'Authored value changed' }],
      },
      provenance,
    )
  }

  const oldMeta = JSON.stringify(oldToken.metadata)
  const newMeta = JSON.stringify(newToken.metadata)
  if (oldMeta !== newMeta) {
    pushChange(
      into,
      {
        class: 'metadata.changed',
        confidence: 'high',
        safety: 'unknown',
        path,
        ...(theme ? { theme } : {}),
        before: oldToken.metadata,
        after: newToken.metadata,
        evidence: [{ kind: 'authored-ir', detail: 'Token metadata differs' }],
      },
      provenance,
    )
  }
}

function detectRenameCandidates(
  oldDoc: IrDocument,
  newDoc: IrDocument,
  provenance: SemanticChange['provenance'],
  into: SemanticChange[],
): void {
  const removed: IrToken[] = []
  const added: IrToken[] = []
  const oldBase = new Set(oldDoc.tokens.map((t) => t.id))
  const newBase = new Set(newDoc.tokens.map((t) => t.id))

  for (const token of oldDoc.tokens) {
    if (!newBase.has(token.id)) removed.push(token)
  }
  for (const token of newDoc.tokens) {
    if (!oldBase.has(token.id)) added.push(token)
  }

  const addedBySig = new Map<string, IrToken[]>()
  for (const token of added) {
    const sig = tokenSignature(token)
    const list = addedBySig.get(sig) ?? []
    list.push(token)
    addedBySig.set(sig, list)
  }

  for (const oldToken of removed) {
    const sig = tokenSignature(oldToken)
    const candidates = addedBySig.get(sig) ?? []
    if (candidates.length === 0) continue
    const confidence: ChangeConfidence = candidates.length === 1 ? 'medium' : 'low'
    for (const candidate of candidates) {
      pushChange(
        into,
        {
          class: 'token.renamed.candidate',
          confidence,
          safety: 'unknown',
          path: oldToken.path,
          before: pathLabel(oldToken.path),
          after: pathLabel(candidate.path),
          evidence: [
            { kind: 'rename-heuristic', detail: 'Removed and added base tokens share identical type/value/metadata' },
            ...(candidates.length > 1 ? [{ kind: 'ambiguous', detail: 'Multiple added tokens match the same signature' }] : []),
          ],
        },
        provenance,
      )
    }
  }
}

function classifyResolvedDelta(
  oldCtx: QueryContext,
  newCtx: QueryContext,
  provenance: SemanticChange['provenance'],
  into: SemanticChange[],
): void {
  try {
    const oldResolved = requireCompile(oldCtx).resolved
    const newResolved = requireCompile(newCtx).resolved
    const oldBase = resolvedBaseMap(oldResolved)
    const newBase = resolvedBaseMap(newResolved)

    for (const path of new Set([...oldBase.keys(), ...newBase.keys()]).values()) {
      const before = oldBase.get(path)
      const after = newBase.get(path)
      if (!before && after) continue
      if (before && !after) continue
      if (!before || !after) continue

      if (before.varName !== after.varName) {
        pushChange(
          into,
          {
            class: 'css.variable.changed',
            confidence: 'high',
            safety: 'breaking',
            path: before.path,
            before: before.varName,
            after: after.varName,
            evidence: [{ kind: 'resolved-output', detail: 'Public CSS variable name changed for the same token path' }],
          },
          provenance,
        )
      } else if (before.value !== after.value) {
        pushChange(
          into,
          {
            class: 'value.changed',
            confidence: 'high',
            safety: 'unknown',
            path: before.path,
            before: before.value,
            after: after.value,
            evidence: [{ kind: 'resolved-output', detail: 'Resolved CSS value changed' }],
          },
          provenance,
        )
      }
    }

    const oldThemes = resolvedThemeMap(oldResolved)
    const newThemes = resolvedThemeMap(newResolved)
    for (const key of new Set([...oldThemes.keys(), ...newThemes.keys()]).values()) {
      const before = oldThemes.get(key)
      const after = newThemes.get(key)
      if (!before || !after) continue
      if (before.value !== after.value || before.varName !== after.varName) {
        const theme = key.split(':')[0]?.slice(1)
        const pathParts = after.path
        pushChange(
          into,
          {
            class: 'theme.override.changed',
            confidence: 'high',
            safety: 'non-breaking',
            path: pathParts,
            theme,
            before: { varName: before.varName, value: before.value },
            after: { varName: after.varName, value: after.value },
            evidence: [{ kind: 'resolved-output', detail: 'Theme override output changed' }],
          },
          provenance,
        )
      }
    }
  } catch {
    // resolved comparison is best-effort when either side fails compile
  }
}

export function summarizeChanges(changes: readonly SemanticChange[]): DiffSummary {
  let breaking = 0
  let nonBreaking = 0
  let unknown = 0
  for (const change of changes) {
    if (change.safety === 'breaking') breaking++
    else if (change.safety === 'non-breaking') nonBreaking++
    else unknown++
  }
  return { total: changes.length, breaking, nonBreaking, unknown }
}

export function migrationHintsFromChanges(changes: readonly SemanticChange[]): MigrationHint[] {
  const hints: MigrationHint[] = []
  for (const change of changes) {
    if (change.class === 'token.renamed.candidate') {
      hints.push({
        confidence: change.confidence,
        action: 'replace-reference',
        message: `Review rename ${String(change.before)} → ${String(change.after)} (dry-run; update references manually)`,
        evidence: change.evidence,
        fromPath: change.path,
        toPath: typeof change.after === 'string' ? change.after.split('.') : undefined,
      })
    } else if (change.class === 'token.removed') {
      hints.push({
        confidence: change.confidence,
        action: 'update-consumer',
        message: `Token ${change.path ? pathLabel(change.path) : '(unknown)'} was removed; update or drop consumers`,
        evidence: change.evidence,
        fromPath: change.path,
      })
    } else if (change.class === 'css.variable.changed') {
      hints.push({
        confidence: change.confidence,
        action: 'replace-reference',
        message: `CSS variable ${String(change.before)} → ${String(change.after)} for ${change.path ? pathLabel(change.path) : 'token'}`,
        evidence: change.evidence,
        fromPath: change.path,
      })
    } else if (change.safety === 'breaking') {
      hints.push({
        confidence: change.confidence,
        action: 'review',
        message: `Breaking ${change.class} at ${change.path ? pathLabel(change.path) : 'theme'} — review before release`,
        evidence: change.evidence,
        fromPath: change.path,
      })
    }
  }
  return hints
}

function sortChanges(changes: SemanticChange[]): SemanticChange[] {
  return [...changes].sort((a, b) => {
    const ak = `${a.class}:${a.theme ?? ''}:${a.path ? pathLabel(a.path) : ''}:${a.id}`
    const bk = `${b.class}:${b.theme ?? ''}:${b.path ? pathLabel(b.path) : ''}:${b.id}`
    return ak < bk ? -1 : ak > bk ? 1 : 0
  })
}

export function buildSemanticDiff(oldCtx: QueryContext, newCtx: QueryContext): DiffPayload {
  const provenance = { oldConfig: oldCtx.configRel, newConfig: newCtx.configRel }
  const changes: SemanticChange[] = []

  const oldIndex = indexAuthored(oldCtx.document)
  const newIndex = indexAuthored(newCtx.document)
  const keys = new Set([...oldIndex.keys(), ...newIndex.keys()])
  for (const key of [...keys].sort()) {
    classifyAuthoredDelta(oldIndex.get(key), newIndex.get(key), provenance, changes)
  }

  detectRenameCandidates(oldCtx.document, newCtx.document, provenance, changes)
  classifyResolvedDelta(oldCtx, newCtx, provenance, changes)

  const oldFp = oldCtx.compile?.fingerprint
  const newFp = newCtx.compile?.fingerprint
  if (oldFp && newFp && oldFp !== newFp && changes.length === 0) {
    pushChange(
      changes,
      {
        class: 'fingerprint.changed',
        confidence: 'high',
        safety: 'unknown',
        before: oldFp,
        after: newFp,
        evidence: [{ kind: 'fingerprint', detail: 'Compiler fingerprint differs without classified token deltas' }],
      },
      provenance,
    )
  }

  const diagnostics = aggregateDiagnostics([
    ...(oldCtx.compileError ? [oldCtx.compileError] : []),
    ...(newCtx.compileError ? [newCtx.compileError] : []),
  ])

  const sorted = sortChanges(changes)
  const summary = summarizeChanges(sorted)
  const hasBlocking = diagnostics.some((d) => d.severity === 'error')
  const ok = !hasBlocking && summary.breaking === 0

  return {
    schemaVersion: CLI_SEMANTIC_SCHEMA_VERSION,
    command: 'diff',
    oldConfig: oldCtx.configRel,
    newConfig: newCtx.configRel,
    ...(oldFp ? { oldFingerprint: oldFp } : {}),
    ...(newFp ? { newFingerprint: newFp } : {}),
    changes: sorted,
    summary,
    diagnostics,
    ok,
  }
}

export function diffHasBreaking(changes: readonly SemanticChange[]): boolean {
  return changes.some((c) => c.safety === 'breaking')
}
