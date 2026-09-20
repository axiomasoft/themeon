import { canonicalId } from './ir'
import type { IrMetadata } from './ir'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

type MetaDraft = {
  description?: string
  deprecated?: boolean | string
  extensions?: Readonly<Record<string, unknown>>
}

/**
 * Collect DTCG `$description` / `$deprecated` / `$extensions` keyed by canonical path id.
 * Does not interpret `$value` — P0.1 loss policy stays in `fromDTCG`.
 */
export function collectDtcgMetadata(
  node: unknown,
  path: readonly string[] = [],
  into: Map<string, IrMetadata> = new Map(),
): Map<string, IrMetadata> {
  if (!isRecord(node)) return into
  if (Object.hasOwn(node, '$value')) {
    const draft: MetaDraft = {}
    if (typeof node.$description === 'string') draft.description = node.$description
    if (typeof node.$deprecated === 'boolean' || typeof node.$deprecated === 'string') {
      draft.deprecated = node.$deprecated
    }
    if (isRecord(node.$extensions)) draft.extensions = Object.freeze({ ...node.$extensions })
    if (draft.description !== undefined || draft.deprecated !== undefined || draft.extensions !== undefined) {
      into.set(canonicalId(path), Object.freeze(draft) as IrMetadata)
    }
    return into
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    collectDtcgMetadata(child, [...path, key], into)
  }
  return into
}
