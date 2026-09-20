import type { TextStyleValue, TokenType } from '../types'

/** Canonical token identity: JSON.stringify of the path tuple (ADR ir-identity). */
export type IrPath = readonly string[]

export function canonicalId(path: IrPath): string {
  return JSON.stringify(path)
}

export interface IrSource {
  readonly kind: 'dsl' | 'dtcg'
  readonly file?: string
  readonly pointer?: string
}

export interface IrMetadata {
  readonly description?: string
  readonly deprecated?: boolean | string
  readonly extensions?: Readonly<Record<string, unknown>>
}

export type IrValue =
  | { readonly kind: 'literal'; readonly type: TokenType; readonly value: string | number }
  | { readonly kind: 'composite'; readonly type: 'text'; readonly value: Readonly<TextStyleValue> }
  | { readonly kind: 'alias'; readonly ref: IrPath }

export interface IrToken {
  readonly id: string
  readonly path: IrPath
  readonly type: TokenType
  readonly value: IrValue
  readonly source: IrSource
  readonly metadata: IrMetadata
}

export interface IrDocument {
  readonly tokens: readonly IrToken[]
  /** Canonical ids that belong to `ThemeDefinition.sys` (palette-only refs are omitted). */
  readonly sysIds: readonly string[]
  readonly themes: Readonly<Record<string, readonly IrToken[]>>
  readonly schemes: Readonly<Record<string, 'light' | 'dark'>>
}
