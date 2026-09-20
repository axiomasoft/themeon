import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const FIXTURE_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
      text: palette.neutral[900],
      bg: { page: '#ffffff' },
    },
    space: { md: '1rem' },
  },
  themes: {
    dark: {
      color: { bg: { page: '#000000' } },
    },
  },
})
`

const jiti = createJiti(import.meta.url, {
  nativeModules: ['@themeon/core', '@themeon/tailwind', '@themeon/colors'],
})

interface QueryModule {
  runInspect: (opts: { cwd: string; config: string; format: 'json' }) => Promise<{ exitCode: number; output: string }>
  runExplain: (opts: {
    cwd: string
    config: string
    token: string
    format: 'json'
  }) => Promise<{ exitCode: number; output: string }>
  runGraph: (opts: { cwd: string; config: string; format: 'json' }) => Promise<{ exitCode: number; output: string }>
  CLI_QUERY_SCHEMA_VERSION: number
}

let mod: QueryModule

describe('query commands (P3.1)', () => {
  let cwd: string

  beforeAll(async () => {
    const inspect = await jiti.import<{ runInspect: QueryModule['runInspect'] }>(
      join(import.meta.dirname, 'commands', 'inspect.ts'),
      {},
    )
    const explain = await jiti.import<{ runExplain: QueryModule['runExplain'] }>(
      join(import.meta.dirname, 'commands', 'explain.ts'),
      {},
    )
    const graph = await jiti.import<{ runGraph: QueryModule['runGraph'] }>(
      join(import.meta.dirname, 'commands', 'graph.ts'),
      {},
    )
    const types = await jiti.import<{ CLI_QUERY_SCHEMA_VERSION: number }>(
      join(import.meta.dirname, 'query', 'types.ts'),
      {},
    )
    mod = {
      runInspect: inspect.runInspect,
      runExplain: explain.runExplain,
      runGraph: graph.runGraph,
      CLI_QUERY_SCHEMA_VERSION: types.CLI_QUERY_SCHEMA_VERSION,
    }
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-query-'))
    writeFileSync(join(cwd, 'theme.config.ts'), FIXTURE_CONFIG, 'utf8')
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('inspect json is versioned and byte-stable across two runs', async () => {
    const a = await mod.runInspect({ cwd, config: 'theme.config.ts', format: 'json' })
    const b = await mod.runInspect({ cwd, config: 'theme.config.ts', format: 'json' })
    expect(a.exitCode).toBe(0)
    expect(a.output).toBe(b.output)
    const parsed = JSON.parse(a.output) as { schemaVersion: number; command: string; fingerprint: string }
    expect(parsed.schemaVersion).toBe(mod.CLI_QUERY_SCHEMA_VERSION)
    expect(parsed.command).toBe('inspect')
    expect(parsed.fingerprint).toMatch(/^[a-f0-9]+$/)
  })

  it('explain resolves alias chain and css variable', async () => {
    const { exitCode, output } = await mod.runExplain({
      cwd,
      config: 'theme.config.ts',
      token: 'color.text',
      format: 'json',
    })
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(output) as {
      command: string
      cssVariable: string
      aliasChain: { path: string[]; ref?: string[] }[]
    }
    expect(parsed.command).toBe('explain')
    expect(parsed.cssVariable).toBe('--color-text')
    expect(parsed.aliasChain.length).toBeGreaterThanOrEqual(2)
  })

  it('explain unknown token exits non-zero', async () => {
    const { exitCode, output } = await mod.runExplain({
      cwd,
      config: 'theme.config.ts',
      token: 'color.missing',
      format: 'json',
    })
    expect(exitCode).toBe(1)
    const parsed = JSON.parse(output) as { ok: boolean; diagnostics: { code: string }[] }
    expect(parsed.ok).toBe(false)
    expect(parsed.diagnostics[0]?.code).toBe('THEMEON_QUERY_UNKNOWN_TOKEN')
  })

  it('graph json lists deterministic order', async () => {
    const a = await mod.runGraph({ cwd, config: 'theme.config.ts', format: 'json' })
    const b = await mod.runGraph({ cwd, config: 'theme.config.ts', format: 'json' })
    expect(a.output).toBe(b.output)
    const parsed = JSON.parse(a.output) as { order: string[]; edges: { from: string; to: string }[] }
    expect(parsed.order.length).toBeGreaterThan(0)
    expect(parsed.edges.some((e) => e.from.includes('color') && e.to.includes('neutral'))).toBe(true)
  })
})
