import { defineCommand } from 'citty'
import { consola } from 'consola'
import { diagnosticFromUnknown, formatDiagnostics } from '@themeon/core/compiler'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import {
  buildGraphPayload,
  formatQueryPayload,
  loadQueryContext,
  parseAliasesFlag,
  queryExitCode,
} from '../query'
import type { CliOutputFormat } from '../query'

export interface GraphOptions {
  cwd: string
  config: string
  format: CliOutputFormat
  refLayer?: 'referenced' | 'all' | 'inline'
  aliases?: string
}

const KNOWN_REF_LAYERS = ['referenced', 'all', 'inline']

export async function runGraph(opts: GraphOptions): Promise<{ exitCode: number; output: string }> {
  if (opts.refLayer !== undefined && !KNOWN_REF_LAYERS.includes(opts.refLayer)) {
    throw new Error(`Invalid --ref-layer "${opts.refLayer}" (expected one of: ${KNOWN_REF_LAYERS.join(', ')})`)
  }

  const ctx = await loadQueryContext({
    cwd: opts.cwd,
    config: opts.config,
    refLayer: opts.refLayer,
    aliases: parseAliasesFlag(opts.aliases),
  })
  const payload = buildGraphPayload(ctx)
  const output = formatQueryPayload(payload, opts.format)
  return { exitCode: queryExitCode(payload), output }
}

export const graphCommand = defineCommand({
  meta: {
    name: 'graph',
    description: 'Emit the alias reference graph (deterministic order, capped output)',
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
      const { exitCode, output } = await runGraph({
        cwd: process.cwd(),
        config: args.config,
        format,
        refLayer: args['ref-layer'] as GraphOptions['refLayer'],
        aliases: args.aliases,
      })
      if (output.length > 0) consola.log(output.endsWith('\n') ? output.slice(0, -1) : output)
      process.exitCode = exitCode
    } catch (err) {
      consola.error(formatDiagnostics([diagnosticFromUnknown(err)], 'pretty'))
      process.exitCode = 1
    }
  },
})
