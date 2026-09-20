import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { THEMEON_VITE_ARTIFACT_OWNER } from '@themeon/core/compiler'

export interface AtomicWriteResult {
  readonly path: string
  readonly bytes: number
}

/**
 * Same-filesystem atomic replace: write temp file in target directory, then rename.
 * Readers never observe a partial payload.
 */
export function atomicWriteText(path: string, contents: string): AtomicWriteResult {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  writeFileSync(tmp, contents, 'utf8')
  renameSync(tmp, path)
  return { path, bytes: Buffer.byteLength(contents, 'utf8') }
}

export function readJsonOwner(path: string): string | undefined {
  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as { owner?: string }
    return typeof parsed.owner === 'string' ? parsed.owner : undefined
  } catch {
    return undefined
  }
}

/** Returns true when ThemeOn may replace or remove an artifact at `path`. */
export function themeonOwnsArtifact(path: string): boolean {
  const owner = readJsonOwner(path)
  if (owner === undefined) return false
  return owner === THEMEON_VITE_ARTIFACT_OWNER
}

export function removeIfOwned(path: string): void {
  if (!themeonOwnsArtifact(path)) return
  try {
    unlinkSync(path)
  } catch {
    // ignore missing
  }
}
