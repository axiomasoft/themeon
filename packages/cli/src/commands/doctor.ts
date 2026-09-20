import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import {
  buildDoctorPayload,
  formatSemanticPayload,
  loadQueryContext,
  parseAliasesFlag,
  semanticExitCode,
} from '../query'
import type { CliOutputFormat } from '../query'

export interface DoctorOptions {
  cwd: string
  config: string
  baseline?: string
  format: CliOutputFormat
  refLayer?: 'referenced' | 'all' | 'inline'
  aliases?: string
}

const KNOWN_REF_LAYERS = ['referenced', 'all', 'inline']

export async function runDoctor(opts: DoctorOptions): Promise<{ exitCode: number; output: string }> {
  if (opts.refLayer !== undefined && !KNOWN_REF_LAYERS.includes(opts.refLayer)) {
    throw new Error(`Invalid --ref-layer "${opts.refLayer}" (expected one of: ${KNOWN_REF_LAYERS.join(', ')})`)
  }

  const loadOpts = {
    refLayer: opts.refLayer,
    aliases: parseAliasesFlag(opts.aliases),
  }
  const ctx = await loadQueryContext({ cwd: opts.cwd, config: opts.config, ...loadOpts })
  const baselineCtx =
    opts.baseline !== undefined
      ? await loadQueryContext({ cwd: opts.cwd, config: opts.baseline, ...loadOpts })
      : undefined
  const payload = buildDoctorPayload(ctx, baselineCtx)
  const output = formatSemanticPayload(payload, opts.format)
  return { exitCode: semanticExitCode(payload), output }
}

export const doctorCommand = defineCommand({
  meta: {
    name: 'doctor',
    description: 'Non-mutating theme health checks and optional baseline diff hints',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to the theme config file',
      default: DEFAULT_THEME_CONFIG_PATH,
    },
    baseline: {
      type: 'string',
      description: 'Optional baseline config for semantic diff and migration hints',
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
      const { exitCode, output } = await runDoctor({
        cwd: process.cwd(),
        config: args.config,
        baseline: args.baseline,
        format,
        refLayer: args['ref-layer'] as DoctorOptions['refLayer'],
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
