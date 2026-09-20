import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import {
  buildInspectPayload,
  formatQueryPayload,
  loadQueryContext,
  parseAliasesFlag,
  queryExitCode,
} from '../query'
import type { CliOutputFormat } from '../query'

export interface InspectOptions {
  cwd: string
  config: string
  format: CliOutputFormat
  refLayer?: 'referenced' | 'all' | 'inline'
  aliases?: string
}

const KNOWN_REF_LAYERS = ['referenced', 'all', 'inline']

export async function runInspect(opts: InspectOptions): Promise<{ exitCode: number; output: string }> {
  if (opts.refLayer !== undefined && !KNOWN_REF_LAYERS.includes(opts.refLayer)) {
    throw new Error(`Invalid --ref-layer "${opts.refLayer}" (expected one of: ${KNOWN_REF_LAYERS.join(', ')})`)
  }

  const ctx = await loadQueryContext({
    cwd: opts.cwd,
    config: opts.config,
    refLayer: opts.refLayer,
    aliases: parseAliasesFlag(opts.aliases),
  })
  const payload = buildInspectPayload(ctx)
  const output = formatQueryPayload(payload, opts.format)
  return { exitCode: queryExitCode(payload), output }
}

export const inspectCommand = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Summarize compiled theme state, fingerprint and diagnostics',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to the theme config file',
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
      const { exitCode, output } = await runInspect({
        cwd: process.cwd(),
        config: args.config,
        format,
        refLayer: args['ref-layer'] as InspectOptions['refLayer'],
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
