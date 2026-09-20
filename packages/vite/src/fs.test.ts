import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, test } from 'vitest'
import { THEMEON_VITE_ARTIFACT_OWNER } from '@themeon/core/compiler'
import { atomicWriteText, readJsonOwner, removeIfOwned, themeonOwnsArtifact } from './fs'

describe('atomicWriteText', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  test('readers never see partial writes (temp + rename)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'themeon-atomic-'))
    dirs.push(dir)
    const dest = join(dir, 'out.json')
    const payload = JSON.stringify({ owner: THEMEON_VITE_ARTIFACT_OWNER, ok: true }) + '\n'
    atomicWriteText(dest, payload)
    expect(readFileSync(dest, 'utf8')).toBe(payload)
    expect(readJsonOwner(dest)).toBe(THEMEON_VITE_ARTIFACT_OWNER)
  })

  test('removeIfOwned skips foreign artifacts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'themeon-owner-'))
    dirs.push(dir)
    const foreign = join(dir, 'foreign.json')
    writeFileSync(foreign, JSON.stringify({ owner: 'other-tool' }) + '\n')
    removeIfOwned(foreign)
    expect(themeonOwnsArtifact(foreign)).toBe(false)
    expect(readFileSync(foreign, 'utf8')).toContain('other-tool')

    const ours = join(dir, 'ours.json')
    writeFileSync(ours, `${JSON.stringify({ owner: '@themeon/vite' })}\n`)
    expect(themeonOwnsArtifact(ours)).toBe(true)
    removeIfOwned(ours)
    expect(() => readFileSync(ours, 'utf8')).toThrow()
  })
})
