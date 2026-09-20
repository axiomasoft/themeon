import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { SchemaOptions, SchemaResult } from './commands/schema'

/**
 * `themeon schema` (P6.2): jiti-загрузка реального `theme.config.ts` на tmp-фикстуре →
 * `resolveTheme`/`tenantThemeSchema` ядра → JSON Schema (+опц. файл `--out`). Тот же jiti-
 * харнесс, что `build.test.ts` (см. его docblock — обход двойного модульного графа Vitest/jiti).
 */
const FIXTURE_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
      text: palette.neutral[900],
      bg: { page: '#ffffff' },
    },
    space: { md: '1rem' },
    shadow: { card: '0 1px 2px black' },
  },
})
`

const jiti = createJiti(import.meta.url, {
  nativeModules: ['@themeon/core', '@themeon/tailwind', '@themeon/colors'],
})

interface SchemaModule {
  runSchema: (opts: SchemaOptions) => Promise<SchemaResult>
}

let runSchema: SchemaModule['runSchema']

describe('runSchema', () => {
  let cwd: string

  beforeAll(async () => {
    ;({ runSchema } = await jiti.import<SchemaModule>(join(import.meta.dirname, 'commands', 'schema.ts'), {}))
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-schema-'))
    writeFileSync(join(cwd, 'theme.config.ts'), FIXTURE_CONFIG, 'utf8')
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('строит JSON Schema draft 2020-12 из реального theme.config.ts', async () => {
    const { schema } = await runSchema({ cwd, config: 'theme.config.ts' })

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.additionalProperties).toBe(false)
    expect('color' in schema.properties).toBe(true)
    expect('space' in schema.properties).toBe(false)
  })

  it('shadow (запрещён v1, P-D70) отсутствует в схеме', async () => {
    const { schema } = await runSchema({ cwd, config: 'theme.config.ts' })
    expect('shadow' in schema.properties).toBe(false)
  })

  it('--out пишет файл, детерминированный при повторном запуске (байт-в-байт)', async () => {
    const first = await runSchema({ cwd, config: 'theme.config.ts', out: 'schema.json' })
    const second = await runSchema({ cwd, config: 'theme.config.ts', out: 'schema-2.json' })

    expect(first.outPath).toBeDefined()
    const firstJson = readFileSync(first.outPath!, 'utf8')
    const secondJson = readFileSync(second.outPath!, 'utf8')
    expect(firstJson).toBe(secondJson)
  })

  it('без --out файл не пишется, схема возвращается напрямую', async () => {
    const { outPath } = await runSchema({ cwd, config: 'theme.config.ts' })
    expect(outPath).toBeUndefined()
  })

  it('битый config (нет .sys) — reject', async () => {
    writeFileSync(join(cwd, 'bad.config.ts'), 'export default { notATheme: true }\n', 'utf8')
    await expect(runSchema({ cwd, config: 'bad.config.ts' })).rejects.toThrow()
  })
})
