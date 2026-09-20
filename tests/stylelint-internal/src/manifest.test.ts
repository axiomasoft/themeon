import { describe, expect, test } from 'vitest'
import { parseManifestJson } from './manifest'

describe('manifest resolver', () => {
  test('schema mismatch degrades explicitly', () => {
    const result = parseManifestJson(JSON.stringify({ schemaVersion: 99, cssVariables: [] }))
    expect(result).toEqual({ ok: false, reason: 'schema-mismatch' })
  })
})
