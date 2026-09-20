import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import { buildSemanticDiff, formatSemanticPayload, loadQueryContext, parseAliasesFlag, semanticExitCode } from '../query'
import type { CliOutputFormat } from '../query'

export interface DiffOptions {
  cwd: string
  oldConfig: string
  newConfig: string
  format: CliOutputFormat
  refLayer?: 'referenced' | 'all' | 'inline'
  aliases?: string
}

const KNOWN_REF_LAYERS = ['referenced', 'all', 'inline']

export async function runDiff(opts: DiffOptions): Promise<{ exitCode: number; output: string }> {
  if (opts.refLayer !== undefined && !KNOWN_REF_LAYERS.includes(opts.refLayer)) {
    throw new Error(`Invalid --ref-layer "${opts.refLayer}" (expected one of: ${KNOWN_REF_LAYERS.join(', ')})`)
  }

  const loadOpts = {
    refLayer: opts.refLayer,
    aliases: parseAliasesFlag(opts.aliases),
  }
  const oldCtx = await loadQueryContext({ cwd: opts.cwd, config: opts.oldConfig, ...loadOpts })
  const newCtx = await loadQueryContext({ cwd: opts.cwd, config: opts.newConfig, ...loadOpts })
  const payload = buildSemanticDiff(oldCtx, newCtx)
  const output = formatSemanticPayload(payload, opts.format)
  return { exitCode: semanticExitCode(payload), output }
}

export const diffCommand = defineCommand({
  meta: {
    name: 'diff',
    description: 'Semantic diff between two theme configs (versioned change classes)',
  },
  args: {
    old: {
      type: 'positional',
      description: 'Path to the baseline theme config',
      required: true,
    },
    new: {
      type: 'positional',
      description: 'Path to the new theme config',
      required: false,
      default: DEFAULT_THEME_CONFIG_PATH,
    },
    format: {
      type: 'string',
      description: 'Output format: pretty, json, or github (diagnostics annotations)',
      default: 'pretty',
    },
    'ref-layer': {
      type: 'string',
      description: 'Passed to the compiler resolve step (same as themeon build)',
    },
    aliases: {
      type: 'string',
      description: 'Alias rule name (e.g. legacy-v0)',
    },
  },
  async run({ args }) {
    try {
      const format = args.format as CliOutputFormat
      if (!['pretty', 'json', 'github'].includes(format)) {
        throw new Error(`Invalid --format "${args.format}" (expected pretty, json, or github)`)
      }
      const { exitCode, output } = await runDiff({
        cwd: process.cwd(),
        oldConfig: args.old,
        newConfig: args.new,
        format,
        refLayer: args['ref-layer'] as DiffOptions['refLayer'],
        aliases: args.aliases,
      })
      if (output.length > 0) consola.log(output.endsWith('\n') ? output.slice(0, -1) : output)
      process.exitCode = exitCode
    } catch (err) {
      consola.error(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
    }
  },
})
