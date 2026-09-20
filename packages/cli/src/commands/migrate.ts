import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import {
  buildMigratePayload,
  formatSemanticPayload,
  loadQueryContext,
  parseAliasesFlag,
  semanticExitCode,
} from '../query'
import type { CliOutputFormat } from '../query'

export interface MigrateOptions {
  cwd: string
  fromConfig: string
  toConfig: string
  format: CliOutputFormat
  refLayer?: 'referenced' | 'all' | 'inline'
  aliases?: string
}

const KNOWN_REF_LAYERS = ['referenced', 'all', 'inline']

export async function runMigrate(opts: MigrateOptions): Promise<{ exitCode: number; output: string }> {
  if (opts.refLayer !== undefined && !KNOWN_REF_LAYERS.includes(opts.refLayer)) {
    throw new Error(`Invalid --ref-layer "${opts.refLayer}" (expected one of: ${KNOWN_REF_LAYERS.join(', ')})`)
  }

  const loadOpts = {
    refLayer: opts.refLayer,
    aliases: parseAliasesFlag(opts.aliases),
  }
  const fromCtx = await loadQueryContext({ cwd: opts.cwd, config: opts.fromConfig, ...loadOpts })
  const toCtx = await loadQueryContext({ cwd: opts.cwd, config: opts.toConfig, ...loadOpts })
  const payload = buildMigratePayload(fromCtx, toCtx)
  const output = formatSemanticPayload(payload, opts.format)
  return { exitCode: semanticExitCode(payload), output }
}

export const migrateCommand = defineCommand({
  meta: {
    name: 'migrate',
    description: 'Dry-run migration hints between two theme configs (never writes sources)',
  },
  args: {
    from: {
      type: 'positional',
      description: 'Path to the source/baseline theme config',
      required: true,
    },
    to: {
      type: 'positional',
      description: 'Path to the target theme config',
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
      const { exitCode, output } = await runMigrate({
        cwd: process.cwd(),
        fromConfig: args.from,
        toConfig: args.to,
        format,
        refLayer: args['ref-layer'] as MigrateOptions['refLayer'],
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
