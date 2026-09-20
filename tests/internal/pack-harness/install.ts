import { join } from 'node:path'
import type { PackManifest, TarballOverride } from './types.js'

function tarballRef(packDir: string, manifest: PackManifest, packageName: string): string {
  const pkg = manifest.packages.find((entry) => entry.name === packageName)
  if (!pkg) {
    throw new Error(`no packed tarball for ${packageName}`)
  }
  return `file:${join(packDir, pkg.tarball)}`
}

export function themeonInstallSpec(
  packDir: string,
  manifest: PackManifest,
  dependencies: Record<string, string>,
  tarballOverride?: TarballOverride,
): { dependencies: Record<string, string>; overrides?: Record<string, string> } {
  const deps: Record<string, string> = { ...dependencies }
  for (const name of Object.keys(deps)) {
    if (name.startsWith('@themeon/')) {
      deps[name] = tarballRef(packDir, manifest, name)
    }
  }
  if (tarballOverride) {
    deps[tarballOverride.packageName] = `file:${tarballOverride.tarballPath}`
  }

  const overrides: Record<string, string> = {}
  for (const pkg of manifest.packages) {
    if (deps[pkg.name]) continue
    overrides[pkg.name] = `file:${join(packDir, pkg.tarball)}`
  }
  if (tarballOverride && !deps[tarballOverride.packageName]) {
    overrides[tarballOverride.packageName] = `file:${tarballOverride.tarballPath}`
  }

  return {
    dependencies: deps,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  }
}
