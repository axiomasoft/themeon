import { walkTree } from '../internal/walk'
import { defineTheme, defineTokens } from '../define'
import { setByPath } from '../dtcg/to-dtcg'
import { isToken } from '../types'
import type { SysPatch, SysTreeInput, ThemeDefinition, Token, TokenTreeInput } from '../types'
import { canonicalId } from './ir'
import type { IrDocument, IrToken } from './ir'

function literalLeaf(token: IrToken): string | number | { size: string; lineHeight?: number | string } {
  if (token.value.kind === 'composite') {
    return { ...token.value.value }
  }
  if (token.value.kind === 'literal') return token.value.value
  throw new Error(`literalLeaf called on alias ${token.id}`)
}

function groupTree(tokens: readonly IrToken[]): TokenTreeInput {
  const root: Record<string, unknown> = {}
  for (const token of tokens) {
    setByPath(root, token.path.slice(1), literalLeaf(token))
  }
  return root as TokenTreeInput
}

function flatten(def: ThemeDefinition): Map<string, Token> {
  const map = new Map<string, Token>()
  for (const { value } of walkTree(def.sys as unknown as TokenTreeInput)) {
    if (isToken(value)) map.set(canonicalId(value.path), value)
  }
  return map
}

/**
 * Compatibility facade: rebuild today's `ThemeDefinition` from IR.
 * Palette-only alias targets stay outside `sys` (ADR ir-compatibility).
 */
export function toThemeDefinition(doc: IrDocument): ThemeDefinition {
  const sysSet = new Set(doc.sysIds)
  const literals = doc.tokens.filter((t) => t.value.kind !== 'alias')
  const paletteLiterals = literals.filter((t) => !sysSet.has(t.id))
  const sysLiterals = literals.filter((t) => sysSet.has(t.id))

  const paletteByGroup = new Map<string, IrToken[]>()
  for (const token of paletteLiterals) {
    const group = token.path[0] ?? 'color'
    const list = paletteByGroup.get(group) ?? []
    list.push(token)
    paletteByGroup.set(group, list)
  }

  const tokenById = new Map<string, Token>()
  for (const [group, list] of paletteByGroup) {
    const wrapped = defineTokens(group, groupTree(list))
    for (const { value } of walkTree(wrapped as unknown as TokenTreeInput)) {
      if (isToken(value)) tokenById.set(canonicalId(value.path), value)
    }
  }

  const base: Record<string, unknown> = {}
  for (const token of sysLiterals) {
    setByPath(base, [...token.path], literalLeaf(token))
  }
  for (const token of doc.tokens) {
    if (!sysSet.has(token.id) || token.value.kind !== 'alias') continue
    const target = tokenById.get(canonicalId(token.value.ref))
    if (target) setByPath(base, [...token.path], target)
  }

  const pass1 = defineTheme({ base: base as SysTreeInput, themes: {}, schemes: { ...doc.schemes } })
  for (const [id, token] of flatten(pass1)) tokenById.set(id, token)

  const base2: Record<string, unknown> = {}
  for (const token of doc.tokens) {
    if (!sysSet.has(token.id)) continue
    if (token.value.kind === 'alias') {
      const target = tokenById.get(canonicalId(token.value.ref))
      setByPath(base2, [...token.path], target ?? `{${token.value.ref.join('.')}}`)
    } else {
      setByPath(base2, [...token.path], literalLeaf(token))
    }
  }

  const themes: Record<string, SysPatch<SysTreeInput>> = {}
  for (const [name, list] of Object.entries(doc.themes)) {
    const patch: Record<string, unknown> = {}
    for (const token of list) {
      if (token.value.kind === 'alias') {
        const target = tokenById.get(canonicalId(token.value.ref))
        setByPath(patch, [...token.path], target ?? `{${token.value.ref.join('.')}}`)
      } else {
        setByPath(patch, [...token.path], literalLeaf(token))
      }
    }
    themes[name] = patch as SysPatch<SysTreeInput>
  }

  return defineTheme({
    base: base2 as SysTreeInput,
    themes,
    schemes: { ...doc.schemes },
  })
}
