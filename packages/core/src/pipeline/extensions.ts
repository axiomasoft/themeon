import { ThemeonError } from '../errors'
import { identityTransform } from '../transforms/identity'
import { formatCss } from '../formats/css'
import type { CompilerExtension, CompilerStage, DeclaredExtension, ExtensionCapability } from './types'
import { COMPILER_VERSION } from './types'

const EXTENSIBLE_STAGES = new Set<CompilerStage>([
  'normalize',
  'validate',
  'transform',
  'validate-output',
  'emit',
])
const CAPABILITIES = new Set<ExtensionCapability>([
  'normalizer',
  'validator',
  'transform',
  'format',
])

function capabilityFor(stage: CompilerStage): ExtensionCapability {
  switch (stage) {
    case 'normalize':
      return 'normalizer'
    case 'validate':
    case 'validate-output':
      return 'validator'
    case 'transform':
      return 'transform'
    case 'emit':
      return 'format'
    case 'resolve':
      throw new ThemeonError(
        'EXTENSION_CACHE',
        'Stage "resolve" is built-in; register a transform instead',
      )
  }
}

export function builtinExtensions(): readonly CompilerExtension[] {
  const version = COMPILER_VERSION
  return Object.freeze([
    {
      name: 'normalize-dsl',
      version,
      apiVersion: 1,
      stage: 'normalize',
      capability: 'normalizer',
      cacheKey: `themeon:normalize-dsl:${version}`,
      deterministic: true,
      order: 0,
      async: false,
      normalize: (document) => document,
    },
    {
      name: 'validate-graph',
      version,
      apiVersion: 1,
      stage: 'validate',
      capability: 'validator',
      cacheKey: `themeon:validate-graph:${version}`,
      deterministic: true,
      order: 0,
      async: false,
      validate: () => [],
    },
    {
      name: 'identity',
      version,
      apiVersion: 1,
      stage: 'transform',
      capability: 'transform',
      cacheKey: `themeon:identity:${version}`,
      deterministic: true,
      order: 0,
      async: false,
      transform: identityTransform,
    },
    {
      name: 'validate-output',
      version,
      apiVersion: 1,
      stage: 'validate-output',
      capability: 'validator',
      cacheKey: `themeon:validate-output:${version}`,
      deterministic: true,
      order: 0,
      async: false,
      validate: () => [],
    },
    {
      name: 'css',
      version,
      apiVersion: 1,
      stage: 'emit',
      capability: 'format',
      cacheKey: `themeon:css:${version}`,
      deterministic: true,
      order: 0,
      async: false,
      format: formatCss,
    },
  ])
}

function hookPresent(ext: CompilerExtension): boolean {
  switch (ext.capability) {
    case 'normalizer':
      return typeof ext.normalize === 'function'
    case 'validator':
      return typeof ext.validate === 'function'
    case 'transform':
      return typeof ext.transform === 'function'
    case 'format':
      return typeof ext.format === 'function'
  }
}

export function declareExtensions(user: readonly CompilerExtension[]): {
  readonly declared: readonly DeclaredExtension[]
  readonly runtime: readonly CompilerExtension[]
} {
  const merged = [...builtinExtensions(), ...user]
  const seen = new Set<string>()
  const prepared: CompilerExtension[] = []

  for (const ext of merged) {
    if (!EXTENSIBLE_STAGES.has(ext.stage)) {
      throw new ThemeonError('EXTENSION_CACHE', `Unknown compiler stage: ${String(ext.stage)}`)
    }
    if (!CAPABILITIES.has(ext.capability) || ext.capability !== capabilityFor(ext.stage)) {
      throw new ThemeonError(
        'EXTENSION_CACHE',
        `Extension "${ext.name}" capability "${ext.capability}" does not match stage "${ext.stage}"`,
      )
    }
    if (ext.apiVersion !== 1) {
      throw new ThemeonError('EXTENSION_CACHE', `Extension "${ext.name}" requires apiVersion 1`)
    }
    if (ext.async === true) {
      throw new ThemeonError(
        'EXTENSION_ASYNC',
        `Extension "${ext.name}" is async; the compiler is sync-first and rejects async hooks`,
      )
    }
    if (ext.deterministic !== true) {
      throw new ThemeonError(
        'EXTENSION_CACHE',
        `Extension "${ext.name}" must be deterministic to contribute to the cache fingerprint`,
      )
    }
    const cacheKey = typeof ext.cacheKey === 'string' ? ext.cacheKey.trim() : ''
    if (cacheKey === '') {
      throw new ThemeonError(
        'EXTENSION_CACHE',
        `Extension "${ext.name}" is missing a cacheKey cache contribution`,
      )
    }
    if (!hookPresent(ext)) {
      throw new ThemeonError(
        'EXTENSION_CACHE',
        `Extension "${ext.name}" is missing a ${ext.capability} hook`,
      )
    }
    const key = `${ext.stage}\0${ext.capability}\0${ext.name}`
    if (seen.has(key)) {
      throw new ThemeonError(
        'EXTENSION_COLLISION',
        `Duplicate extension "${ext.name}" at stage "${ext.stage}" (${ext.capability})`,
      )
    }
    seen.add(key)
    prepared.push(ext)
  }

  prepared.sort((a, b) => {
    const order = (a.order ?? 0) - (b.order ?? 0)
    if (order !== 0) return order
    const byName = a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    if (byName !== 0) return byName
    return a.version < b.version ? -1 : a.version > b.version ? 1 : 0
  })

  const declared: DeclaredExtension[] = prepared.map((ext) =>
    Object.freeze({
      name: ext.name,
      version: ext.version,
      apiVersion: 1 as const,
      stage: ext.stage,
      capability: ext.capability,
      cacheKey: ext.cacheKey.trim(),
      deterministic: true as const,
      order: ext.order ?? 0,
      async: false as const,
    }),
  )

  return {
    declared: Object.freeze(declared),
    runtime: Object.freeze(prepared),
  }
}
