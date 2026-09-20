import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PackManifest } from './types.js'

export function loadPackManifest(packDir: string): PackManifest {
  return JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8')) as PackManifest
}
