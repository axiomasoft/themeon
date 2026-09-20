import { relative, resolve } from 'node:path'
import {
  buildGraph,
  createCompiler,
  diagnosticFromThemeonError,
  diagnosticFromUnknown,
  normalizeDsl,
  ThemeonError,
} from '@themeon/core/compiler'
import type { AliasesOption, CompileResult, Diagnostic, IrDocument, IrGraph } from '@themeon/core/compiler'
import { loadThemeConfig } from '../load-theme'

export interface QueryContextOptions {
  readonly cwd: string
  readonly config: string
  readonly refLayer?: 'referenced' | 'all' | 'inline'
  readonly aliases?: AliasesOption
}

export interface QueryContext {
  readonly configRel: string
  readonly document: IrDocument
  readonly graph: IrGraph
  readonly compile?: CompileResult
  readonly compileError?: Diagnostic
}

const KNOWN_ALIASES = ['legacy-v0'] as const

export function parseAliasesFlag(value: string | undefined): AliasesOption | undefined {
  if (value === undefined) return undefined
  if (!KNOWN_ALIASES.includes(value as (typeof KNOWN_ALIASES)[number])) {
    throw new Error(`Unknown --aliases rule "${value}" (expected one of: ${KNOWN_ALIASES.join(', ')})`)
  }
  return value as AliasesOption
}

/** Load theme config and compiler evidence without duplicating resolver logic in the CLI. */
export async function loadQueryContext(opts: QueryContextOptions): Promise<QueryContext> {
  const absConfig = resolve(opts.cwd, opts.config)
  const configRel = relative(opts.cwd, absConfig)
  const theme = await loadThemeConfig(absConfig)
  const document = normalizeDsl(theme, configRel)
  const graph = buildGraph(document)

  const compiler = createCompiler({
    resolve: {
      refLayer: opts.refLayer ?? 'referenced',
      aliases: opts.aliases,
    },
  })

  try {
    const compile = compiler.compile(theme)
    return { configRel, document, graph, compile }
  } catch (error) {
    const compileError =
      error instanceof ThemeonError
        ? diagnosticFromThemeonError(error)
        : diagnosticFromUnknown(error)
    return { configRel, document, graph, compileError }
  }
}

/** Successful compile shortcut used by commands that require resolved output. */
export function requireCompile(ctx: QueryContext): CompileResult {
  if (ctx.compile !== undefined) return ctx.compile
  throw new Error(ctx.compileError?.message ?? 'Theme compilation failed')
}
