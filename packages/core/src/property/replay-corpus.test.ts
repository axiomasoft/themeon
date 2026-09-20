import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { defineTheme } from '../define'
import type { SysTreeInput, ThemeDefinition } from '../types'
import type { ReplayRecord } from './replay'
import {
  lawDtcgRoundTripSemantics,
  lawResolveDeterministic,
  lawSerializeDeterministic,
} from './laws'

const CORPUS_DIR = join(fileURLToPath(new URL('../../../../', import.meta.url)), 'tests/fixtures/generated/replay')

function loadCorpus(): ReplayRecord[] {
  try {
    const files = readdirSync(CORPUS_DIR).filter((name: string) => name.startsWith('corpus-') && name.endsWith('.json'))
    return files.map((file: string) => JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')) as ReplayRecord)
  } catch {
    return []
  }
}

const LAW_HANDLERS: Record<string, (theme: ThemeDefinition) => boolean> = {
  'resolve-deterministic': lawResolveDeterministic,
  'serialize-deterministic': lawSerializeDeterministic,
  'dtcg-round-trip': lawDtcgRoundTripSemantics,
}

describe('P2.1 replay corpus', () => {
  const corpus = loadCorpus()

  test('committed corpus is non-empty', () => {
    expect(corpus.length).toBeGreaterThan(0)
  })

  test.each(corpus.map((record, index) => [record.law, index, record] as const))(
    'replay %s [%i] still satisfies its law',
    (law, _index, record) => {
      const handler = LAW_HANDLERS[law]
      expect(handler, `unknown law ${law}`).toBeDefined()
      const input = record.counterexample as { base: SysTreeInput }
      const theme = defineTheme(input)
      expect(handler!(theme)).toBe(true)
    },
  )
})
