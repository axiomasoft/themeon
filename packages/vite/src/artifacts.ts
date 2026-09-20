import { relative, resolve as resolvePath } from 'node:path'
import {
  buildCspArtifact,
  buildViteManifest,
  serializeCspArtifact,
  serializeViteManifest,
  type CompileResult,
} from '@themeon/core/compiler'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import type { ThemeInitScriptOptions } from '@themeon/vue/anti-fouc'
import { atomicWriteText, removeIfOwned } from './fs'
import type { ThemeonArtifactsOptions } from './types'

export interface ArtifactPaths {
  readonly dir: string
  readonly manifest: string
  readonly csp: string
  readonly css?: string
}

export function resolveArtifactPaths(
  root: string,
  artifacts: ThemeonArtifactsOptions,
  cssImportFile?: string,
): ArtifactPaths {
  const dir = resolvePath(root, artifacts.dir ?? '.themeon')
  const manifest = resolvePath(dir, artifacts.manifestFile ?? 'manifest.json')
  const csp = resolvePath(dir, artifacts.cspFile ?? 'csp.json')
  return {
    dir,
    manifest,
    csp,
    ...(cssImportFile !== undefined ? { css: cssImportFile } : {}),
  }
}

export interface WriteArtifactsInput {
  readonly root: string
  readonly paths: ArtifactPaths
  readonly compiled: CompileResult
  readonly virtualModuleId: string
  readonly fouc?: boolean | ThemeInitScriptOptions
}

export function writeDeliveryArtifacts(input: WriteArtifactsInput): void {
  const cssRelative =
    input.paths.css !== undefined ? relative(input.root, input.paths.css) : undefined
  const delivery = cssRelative !== undefined ? 'file' : 'virtual'
  const manifest = buildViteManifest({
    fingerprint: input.compiled.fingerprint,
    css: input.compiled.css,
    resolved: input.compiled.resolved,
    document: input.compiled.document,
    delivery,
    virtualModuleId: input.virtualModuleId,
    ...(cssRelative !== undefined ? { cssRelativePath: cssRelative } : {}),
  })
  atomicWriteText(input.paths.manifest, serializeViteManifest(manifest))

  if (input.fouc !== undefined && input.fouc !== false) {
    const foucOpts = input.fouc === true ? {} : input.fouc
    const script = themeInitScript(foucOpts)
    const csp = buildCspArtifact({
      script,
      storageKey: foucOpts.storageKey ?? 'themeon-theme',
      attribute: foucOpts.attribute ?? 'data-theme',
    })
    atomicWriteText(input.paths.csp, serializeCspArtifact(csp))
  } else {
    removeIfOwned(input.paths.csp)
  }
}
