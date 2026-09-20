import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const BASE_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

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

const VALUE_CHANGED_CONFIG = BASE_CONFIG.replace("'#111111'", "'#222222'")

const RENAMED_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
      copy: palette.neutral[900],
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

const REMOVED_TOKEN_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
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

interface SemanticModule {
  runDiff: (opts: {
    cwd: string
    oldConfig: string
    newConfig: string
    format: 'json'
  }) => Promise<{ exitCode: number; output: string }>
  runDoctor: (opts: {
    cwd: string
    config: string
    baseline?: string
    format: 'json'
  }) => Promise<{ exitCode: number; output: string }>
  runMigrate: (opts: {
    cwd: string
    fromConfig: string
    toConfig: string
    format: 'json'
  }) => Promise<{ exitCode: number; output: string }>
  CLI_SEMANTIC_SCHEMA_VERSION: number
}

let mod: SemanticModule

describe('semantic diff / doctor / migrate (P3.2)', () => {
  let cwd: string

  beforeAll(async () => {
    const diff = await jiti.import<{ runDiff: SemanticModule['runDiff'] }>(
      join(import.meta.dirname, 'commands', 'diff.ts'),
      {},
    )
    const doctor = await jiti.import<{ runDoctor: SemanticModule['runDoctor'] }>(
      join(import.meta.dirname, 'commands', 'doctor.ts'),
      {},
    )
    const migrate = await jiti.import<{ runMigrate: SemanticModule['runMigrate'] }>(
      join(import.meta.dirname, 'commands', 'migrate.ts'),
      {},
    )
    const types = await jiti.import<{ CLI_SEMANTIC_SCHEMA_VERSION: number }>(
      join(import.meta.dirname, 'query', 'semantic-types.ts'),
      {},
    )
    mod = {
      runDiff: diff.runDiff,
      runDoctor: doctor.runDoctor,
      runMigrate: migrate.runMigrate,
      CLI_SEMANTIC_SCHEMA_VERSION: types.CLI_SEMANTIC_SCHEMA_VERSION,
    }
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-semantic-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  function writePair(oldBody: string, newBody: string): { oldPath: string; newPath: string } {
    const oldPath = 'old.theme.config.ts'
    const newPath = 'new.theme.config.ts'
    writeFileSync(join(cwd, oldPath), oldBody, 'utf8')
    writeFileSync(join(cwd, newPath), newBody, 'utf8')
    return { oldPath, newPath }
  }

  it('diff json is versioned and deterministic', async () => {
    const { oldPath, newPath } = writePair(BASE_CONFIG, VALUE_CHANGED_CONFIG)
    const a = await mod.runDiff({ cwd, oldConfig: oldPath, newConfig: newPath, format: 'json' })
    const b = await mod.runDiff({ cwd, oldConfig: oldPath, newConfig: newPath, format: 'json' })
    expect(a.output).toBe(b.output)
    const parsed = JSON.parse(a.output) as { schemaVersion: number; command: string; changes: { class: string }[] }
    expect(parsed.schemaVersion).toBe(mod.CLI_SEMANTIC_SCHEMA_VERSION)
    expect(parsed.command).toBe('diff')
    expect(parsed.changes.some((c) => c.class === 'value.changed')).toBe(true)
  })

  it('classifies removed tokens as breaking', async () => {
    const { oldPath, newPath } = writePair(BASE_CONFIG, REMOVED_TOKEN_CONFIG)
    const { exitCode, output } = await mod.runDiff({ cwd, oldConfig: oldPath, newConfig: newPath, format: 'json' })
    const parsed = JSON.parse(output) as { summary: { breaking: number }; changes: { class: string; safety: string }[] }
    expect(parsed.changes.some((c) => c.class === 'token.removed' && c.safety === 'breaking')).toBe(true)
    expect(parsed.summary.breaking).toBeGreaterThan(0)
    expect(exitCode).toBe(1)
  })

  it('emits ambiguous rename candidates with lowered confidence', async () => {
    const ambiguousNew = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
      headline: palette.neutral[900],
      copy: palette.neutral[900],
      bg: { page: '#ffffff' },
    },
    space: { md: '1rem' },
  },
  themes: { dark: { color: { bg: { page: '#000000' } } } },
})
`
    const { oldPath, newPath } = writePair(BASE_CONFIG, ambiguousNew)
    const { output } = await mod.runDiff({ cwd, oldConfig: oldPath, newConfig: newPath, format: 'json' })
    const parsed = JSON.parse(output) as { changes: { class: string; confidence: string }[] }
    const renames = parsed.changes.filter((c) => c.class === 'token.renamed.candidate')
    expect(renames.length).toBeGreaterThanOrEqual(2)
    expect(renames.some((c) => c.confidence === 'low')).toBe(true)
  })

  it('rename-like single candidate is medium confidence', async () => {
    const { oldPath, newPath } = writePair(BASE_CONFIG, RENAMED_CONFIG)
    const { output } = await mod.runDiff({ cwd, oldConfig: oldPath, newConfig: newPath, format: 'json' })
    const parsed = JSON.parse(output) as { changes: { class: string; confidence: string }[] }
    const rename = parsed.changes.find((c) => c.class === 'token.renamed.candidate')
    expect(rename?.confidence).toBe('medium')
  })

  it('doctor passes on healthy config', async () => {
    writeFileSync(join(cwd, 'theme.config.ts'), BASE_CONFIG, 'utf8')
    const { exitCode, output } = await mod.runDoctor({ cwd, config: 'theme.config.ts', format: 'json' })
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(output) as { command: string; ok: boolean; checks: { id: string; status: string }[] }
    expect(parsed.command).toBe('doctor')
    expect(parsed.ok).toBe(true)
    expect(parsed.checks.find((c) => c.id === 'compile')?.status).toBe('pass')
  })

  it('migrate is always dry-run and emits hints for renames', async () => {
    const { oldPath, newPath } = writePair(BASE_CONFIG, RENAMED_CONFIG)
    const { output } = await mod.runMigrate({ cwd, fromConfig: oldPath, toConfig: newPath, format: 'json' })
    const parsed = JSON.parse(output) as { dryRun: boolean; hints: { action: string }[] }
    expect(parsed.dryRun).toBe(true)
    expect(parsed.hints.some((h) => h.action === 'replace-reference')).toBe(true)
  })

  it('migrate and diff do not write config files', async () => {
    const { oldPath, newPath } = writePair(BASE_CONFIG, VALUE_CHANGED_CONFIG)
    const oldFull = join(cwd, oldPath)
    const before = readFileSync(oldFull, 'utf8')
    await mod.runDiff({ cwd, oldConfig: oldPath, newConfig: newPath, format: 'json' })
    await mod.runMigrate({ cwd, fromConfig: oldPath, toConfig: newPath, format: 'json' })
    expect(readFileSync(oldFull, 'utf8')).toBe(before)
  })
})
