import { canonicalId } from './ir'
import type { IrDocument, IrMetadata, IrSource, IrToken, IrValue } from './ir'
import type { TokenType } from '../types'

function freezeMeta(metadata: IrMetadata): IrMetadata {
  const extensions = metadata.extensions
  return Object.freeze({
    ...(metadata.description !== undefined ? { description: metadata.description } : {}),
    ...(metadata.deprecated !== undefined ? { deprecated: metadata.deprecated } : {}),
    ...(extensions !== undefined ? { extensions: Object.freeze({ ...extensions }) } : {}),
  })
}

function freezeValue(value: IrValue): IrValue {
  if (value.kind === 'composite') {
    return Object.freeze({
      kind: 'composite',
      type: 'text',
      value: Object.freeze({ ...value.value }),
    })
  }
  if (value.kind === 'alias') {
    return Object.freeze({ kind: 'alias', ref: Object.freeze([...value.ref]) })
  }
  return Object.freeze({ kind: 'literal', type: value.type, value: value.value })
}

export function irToken(input: {
  path: readonly string[]
  type: TokenType
  value: IrValue
  source: IrSource
  metadata?: IrMetadata
}): IrToken {
  const path = Object.freeze([...input.path])
  return Object.freeze({
    id: canonicalId(path),
    path,
    type: input.type,
    value: freezeValue(input.value),
    source: Object.freeze({ ...input.source }),
    metadata: freezeMeta(input.metadata ?? {}),
  })
}

export function irDocument(input: {
  tokens: readonly IrToken[]
  sysIds: readonly string[]
  themes?: Readonly<Record<string, readonly IrToken[]>>
  schemes?: Readonly<Record<string, 'light' | 'dark'>>
}): IrDocument {
  const themes: Record<string, readonly IrToken[]> = {}
  for (const [name, list] of Object.entries(input.themes ?? {})) {
    themes[name] = Object.freeze([...list])
  }
  return Object.freeze({
    tokens: Object.freeze([...input.tokens]),
    sysIds: Object.freeze([...input.sysIds]),
    themes: Object.freeze(themes),
    schemes: Object.freeze({ ...(input.schemes ?? {}) }),
  })
}

export function withMetadata(token: IrToken, metadata: IrMetadata): IrToken {
  return Object.freeze({ ...token, metadata: freezeMeta({ ...token.metadata, ...metadata }) })
}
