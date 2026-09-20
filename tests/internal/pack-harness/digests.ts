import type { PackManifest } from './types.js'

export function packDigests(manifest: PackManifest): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pkg of manifest.packages) {
    out[pkg.name] = pkg.sha256
  }
  return out
}
