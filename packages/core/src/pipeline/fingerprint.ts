import type { IrDocument, IrToken } from '../model/ir'
import type { CompilerContext } from './types'
import { COMPILER_VERSION } from './types'

/** FNV-1a 64-bit, portable and sync — no Node/WebCrypto, no runtime dependency. */
export function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = (hash * prime) & 0xffffffffffffffffn
  }
  return hash.toString(16).padStart(16, '0')
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sortValue)
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) out[key] = sortValue(obj[key])
  return out
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function tokenPayload(token: IrToken): unknown {
  return {
    id: token.id,
    path: token.path,
    type: token.type,
    value: token.value,
    source: token.source,
    metadata: token.metadata,
  }
}

export function fingerprintPayload(document: IrDocument, context: CompilerContext): unknown {
  const themes: Record<string, unknown> = {}
  for (const name of Object.keys(document.themes).sort()) {
    themes[name] = document.themes[name]!.map(tokenPayload)
  }
  return {
    compilerVersion: COMPILER_VERSION,
    document: {
      tokens: [...document.tokens].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(tokenPayload),
      sysIds: [...document.sysIds].sort(),
      themes,
      schemes: document.schemes,
    },
    resolve: context.resolve,
    serialize: context.serialize,
    extensions: context.extensions,
  }
}

export function buildFingerprint(document: IrDocument, context: CompilerContext): string {
  return fnv1a64(canonicalJson(fingerprintPayload(document, context)))
}
