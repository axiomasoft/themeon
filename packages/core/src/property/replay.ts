import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PROPERTY_SEED } from './config'

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))
const REPLAY_DIR = join(REPO_ROOT, 'tests/fixtures/generated/replay')

export interface ReplayRecord {
  schema: 'themeon-property-replay/v1'
  law: string
  seed: number
  counterexample: unknown
  message: string
}

export function persistFailureReplay(law: string, counterexample: unknown, message: string): string {
  mkdirSync(REPLAY_DIR, { recursive: true })
  const record: ReplayRecord = {
    schema: 'themeon-property-replay/v1',
    law,
    seed: PROPERTY_SEED,
    counterexample,
    message,
  }
  const file = join(REPLAY_DIR, `${law}-${Date.now()}.json`)
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  return file
}
