import { walkTree } from '../internal/walk'
import { isToken } from '../types'
import type { TextStyleValue, ThemeDefinition, Token, TokenTreeInput, TokenType } from '../types'
import { irDocument, irToken } from './build'
import { canonicalId } from './ir'
import type { IrDocument, IrSource, IrToken, IrValue } from './ir'

function isTextStyleValue(v: unknown): v is TextStyleValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    !isToken(v) &&
    typeof (v as { size?: unknown }).size === 'string'
  )
}

function valueOf(token: Token): IrValue {
  if (isToken(token.value)) {
    return { kind: 'alias', ref: token.value.path }
  }
  if (isTextStyleValue(token.value)) {
    return { kind: 'composite', type: 'text', value: token.value }
  }
  return { kind: 'literal', type: token.type, value: token.value }
}

function addToken(token: Token, source: IrSource, into: Map<string, IrToken>, visiting: Set<string>): void {
  const id = canonicalId(token.path)
  if (into.has(id)) return
  if (visiting.has(id)) {
    into.set(
      id,
      irToken({
        path: token.path,
        type: token.type,
        value: isToken(token.value) ? { kind: 'alias', ref: token.value.path } : valueOf(token),
        source,
      }),
    )
    return
  }
  visiting.add(id)
  if (isToken(token.value)) addToken(token.value, source, into, visiting)
  into.set(
    id,
    irToken({
      path: token.path,
      type: token.type,
      value: valueOf(token),
      source,
    }),
  )
  visiting.delete(id)
}

function patchToken(
  path: readonly string[],
  value: unknown,
  type: TokenType,
  source: IrSource,
): IrToken {
  if (isToken(value)) {
    return irToken({
      path,
      type: value.type,
      value: valueOf(value),
      source,
    })
  }
  if (isTextStyleValue(value)) {
    return irToken({
      path,
      type: 'text',
      value: { kind: 'composite', type: 'text', value },
      source,
    })
  }
  return irToken({
    path,
    type,
    value: {
      kind: 'literal',
      type,
      value: typeof value === 'number' ? value : String(value),
    },
    source,
  })
}

/** Normalize a `ThemeDefinition` (DSL or post-DTCG facade) into immutable IR. */
export function irFromDefinition(def: ThemeDefinition, source: IrSource): IrDocument {
  const tokens = new Map<string, IrToken>()
  const sysIds: string[] = []
  const typeByPath = new Map<string, TokenType>()
  const visiting = new Set<string>()

  for (const { value } of walkTree(def.sys as unknown as TokenTreeInput)) {
    if (!isToken(value)) continue
    addToken(value, source, tokens, visiting)
    const id = canonicalId(value.path)
    sysIds.push(id)
    typeByPath.set(id, value.type)
  }

  const themes: Record<string, readonly IrToken[]> = {}
  for (const [name, patch] of Object.entries(def.themes)) {
    const list: IrToken[] = []
    for (const { path, value } of walkTree(patch as unknown as TokenTreeInput)) {
      const type = typeByPath.get(canonicalId(path)) ?? (isToken(value) ? value.type : 'dimension')
      const token = patchToken(path, value, type, source)
      if (isToken(value)) addToken(value, source, tokens, visiting)
      list.push(token)
    }
    themes[name] = list
  }

  return irDocument({
    tokens: [...tokens.values()],
    sysIds,
    themes,
    schemes: def.schemes,
  })
}
