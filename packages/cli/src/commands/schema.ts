/**
 * `themeon schema` (P6.2): тонкая обёртка над `tenantThemeSchema` (`@themeon/core`) — грузит
 * `theme.config.ts` (reuse `loadThemeConfig`/`resolveTheme`, тот же паттерн, что `build`/
 * `check`), строит JSON Schema draft 2020-12 tenant-патча и опционально пишет её в `--out`
 * (сервер Flex*, PHP-валидатор кладёт файл к себе — R-16 §2). `runSchema` — чистая
 * (относительно `opts.cwd`) async-функция без обращений к `process.cwd()` (тестируемость,
 * тот же паттерн, что `runBuild`/`runCheck`).
 */
import { dirname, relative, resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { resolveTheme, tenantThemeSchema } from '@themeon/core'
import type { JsonSchema } from '@themeon/core'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import { loadThemeConfig } from '../load-theme'

export interface SchemaOptions {
  cwd: string
  config: string
  out?: string
}

export interface SchemaResult {
  schema: JsonSchema
  outPath?: string
}

/** Loads `opts.config`, resolves it and builds the tenant-patch JSON Schema; optionally writes `opts.out`. */
export async function runSchema(opts: SchemaOptions): Promise<SchemaResult> {
  const theme = await loadThemeConfig(resolve(opts.cwd, opts.config))
  const resolved = resolveTheme(theme)
  const schema = tenantThemeSchema(resolved)

  if (opts.out === undefined) return { schema }

  const outPath = resolve(opts.cwd, opts.out)
  await mkdir(dirname(outPath), { recursive: true })
  // Стабильный порядок ключей (детерминизм CLI-вывода, Validation item'а P6.2) — `schema`
  // строится в порядке `base.tokens`, JSON.stringify печатает объект в том же insertion-порядке.
  await writeFile(outPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8')
  consola.success(`themeon schema → ${relative(opts.cwd, outPath)}`)
  return { schema, outPath }
}

export const schemaCommand = defineCommand({
  meta: {
    name: 'schema',
    description: 'Emit the tenant-patch JSON Schema (draft 2020-12) for a theme',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to the theme config file',
      default: DEFAULT_THEME_CONFIG_PATH,
    },
    out: {
      type: 'string',
      description: 'Write the schema JSON to this path (default: print to stdout)',
    },
  },
  async run({ args }) {
    try {
      const { schema, outPath } = await runSchema({
        cwd: process.cwd(),
        config: args.config,
        out: args.out,
      })
      if (outPath === undefined) consola.log(JSON.stringify(schema, null, 2))
    } catch (err) {
      consola.error(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
    }
  },
})
