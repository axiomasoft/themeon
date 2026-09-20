import { fromDTCG } from '../dtcg/from-dtcg'
import type { FromDTCGOptions, FromDTCGResult } from '../dtcg/from-dtcg'
import type { DTCGDocument } from '../dtcg/types'
import { irDocument, withMetadata } from '../model/build'
import { collectDtcgMetadata } from '../model/dtcg-metadata'
import { irFromDefinition } from '../model/from-definition'
import type { IrDocument, IrMetadata } from '../model/ir'

export interface NormalizeDtcgResult extends FromDTCGResult {
  document: IrDocument
}

function isFileMap(files: DTCGDocument | Record<string, DTCGDocument>): boolean {
  const keys = Object.keys(files)
  return keys.length > 0 && keys.every((k) => k.endsWith('.json'))
}

/**
 * DTCG → IR + existing `ThemeDefinition` facade.
 * Metadata that `fromDTCG` drops on `Token` is retained on IR nodes (ADR ir-metadata).
 */
export function normalizeDtcg(
  input: DTCGDocument | Record<string, DTCGDocument>,
  opts: FromDTCGOptions = {},
): NormalizeDtcgResult {
  const result = fromDTCG(input, opts)
  const source = opts.base !== undefined ? { kind: 'dtcg' as const, file: opts.base } : { kind: 'dtcg' as const }
  let document = irFromDefinition(result.definition, source)

  const targets: DTCGDocument[] = isFileMap(input)
    ? Object.values(input as Record<string, DTCGDocument>)
    : [input as DTCGDocument]

  const meta = new Map<string, IrMetadata>()
  for (const doc of targets) {
    for (const [id, metadata] of collectDtcgMetadata(doc)) meta.set(id, metadata)
  }

  if (meta.size > 0) {
    document = irDocument({
      tokens: document.tokens.map((token) => {
        const extra = meta.get(token.id)
        return extra ? withMetadata(token, extra) : token
      }),
      sysIds: document.sysIds,
      themes: document.themes,
      schemes: document.schemes,
    })
  }

  return { ...result, document }
}
