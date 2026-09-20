import type { Diagnostic } from '../diagnostics/types'
import type { IrDocument } from '../model/ir'
import type { NamingOptions } from '../naming'
import type { ResolveOptions } from '../resolve'
import type { SerializeCssOptions } from '../serialize'
import type { ResolvedTheme, ThemeDefinition } from '../types'

/** Compiler version contributing to every fingerprint. Keep in lockstep with package.json. */
export const COMPILER_VERSION = '0.0.0'

export const COMPILER_STAGES = [
  'normalize',
  'validate',
  'resolve',
  'transform',
  'validate-output',
  'emit',
] as const

export type CompilerStage = (typeof COMPILER_STAGES)[number]

export type ExtensionCapability = 'normalizer' | 'validator' | 'transform' | 'format'

/** Formatters receive resolved output only — they cannot re-resolve a theme. */
export interface FormatInput {
  readonly resolved: ResolvedTheme
  readonly options: Readonly<SerializeCssOptions>
}

export interface CompilerExtension {
  readonly name: string
  readonly version: string
  readonly apiVersion: 1
  readonly stage: CompilerStage
  readonly capability: ExtensionCapability
  /** Required cache contribution. Empty/missing is rejected. */
  readonly cacheKey: string
  readonly deterministic: true
  readonly order?: number
  /** Must be omitted or false. Async hooks are rejected (sync-first). */
  readonly async?: boolean
  readonly normalize?: (document: IrDocument) => IrDocument
  readonly validate?: (input: {
    readonly document: IrDocument
    readonly resolved?: ResolvedTheme
  }) => readonly Diagnostic[]
  readonly transform?: (resolved: ResolvedTheme, document: IrDocument) => ResolvedTheme
  readonly format?: (input: FormatInput) => string
}

export interface CompilerOptions {
  readonly resolve?: ResolveOptions
  readonly serialize?: SerializeCssOptions
  /**
   * Cache contribution for a custom `resolve.aliases` function.
   * Built-in `'legacy-v0'` needs no extra key.
   */
  readonly aliasesCacheKey?: string
  readonly extensions?: readonly CompilerExtension[]
}

export interface DeclaredExtension {
  readonly name: string
  readonly version: string
  readonly apiVersion: 1
  readonly stage: CompilerStage
  readonly capability: ExtensionCapability
  readonly cacheKey: string
  readonly deterministic: true
  readonly order: number
  readonly async: false
}

export interface CompilerContext {
  readonly compilerVersion: typeof COMPILER_VERSION
  readonly stages: typeof COMPILER_STAGES
  readonly resolve: Readonly<NamingOptions & Pick<ResolveOptions, 'refLayer'>> & {
    readonly aliases: 'legacy-v0' | 'custom' | undefined
    readonly aliasesCacheKey?: string
  }
  readonly serialize: Readonly<Required<Omit<SerializeCssOptions, 'layer' | 'banner'>> & {
    readonly layer: string | false
    readonly banner: string | false
  }>
  readonly extensions: readonly DeclaredExtension[]
}

export interface CompileResult {
  readonly document: IrDocument
  readonly resolved: ResolvedTheme
  readonly css: string
  readonly artifacts: Readonly<Record<string, string>>
  readonly fingerprint: string
  readonly diagnostics: readonly Diagnostic[]
  readonly context: CompilerContext
}

export interface Compiler {
  readonly context: CompilerContext
  compile(theme: ThemeDefinition): CompileResult
}
