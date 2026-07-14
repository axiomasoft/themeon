/**
 * `themeon init` — механический скаффолдер стартового проекта (P4.3): пишет
 * `theme.config.ts` (+ опц. Tailwind-bridge-заготовку). `runInit` — чистая синхронная
 * функция без обращений к `process.cwd()`/citty-контексту (тестируемость, Rule 4/5);
 * `initCommand` — тонкая citty-обёртка, которая собирает opts и печатает итог через consola.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import { APP_CSS_IMPORT, TAILWIND_BRIDGE_HINT, THEME_CONFIG_TEMPLATE } from '../templates'

export interface InitOptions {
  cwd: string
  force?: boolean
  tailwind?: boolean
}

export interface InitResult {
  created: string[]
  skipped: string[]
}

/** Scaffold a starter theme.config.ts (+ optional Tailwind bridge stub). Idempotent unless force. */
export function runInit(opts: InitOptions): InitResult {
  const created: string[] = []
  const skipped: string[] = []

  writeScaffoldFile(opts.cwd, DEFAULT_THEME_CONFIG_PATH, THEME_CONFIG_TEMPLATE, opts.force, created, skipped)

  if (opts.tailwind) {
    writeScaffoldFile(opts.cwd, 'tailwind-bridge.css', TAILWIND_BRIDGE_HINT, opts.force, created, skipped)
  }

  return { created, skipped }
}

/** Пишет файл `<cwd>/<name>` из шаблона, если его нет или задан `force`; иначе — skip. */
function writeScaffoldFile(
  cwd: string,
  name: string,
  content: string,
  force: boolean | undefined,
  created: string[],
  skipped: string[],
): void {
  const path = join(cwd, name)
  if (existsSync(path) && !force) {
    skipped.push(name)
    return
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
  created.push(name)
}

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold a starter theme.config.ts (and optional Tailwind bridge stub)',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing theme.config.ts',
      default: false,
    },
    tailwind: {
      type: 'boolean',
      description: 'Also scaffold a Tailwind bridge stub/instructions',
      default: false,
    },
  },
  run({ args }) {
    const { created, skipped } = runInit({
      cwd: process.cwd(),
      force: args.force,
      tailwind: args.tailwind,
    })

    for (const file of created) consola.success(`created ${file}`)
    for (const file of skipped) consola.warn(`skipped ${file} (already exists, use --force to overwrite)`)

    if (created.includes(DEFAULT_THEME_CONFIG_PATH)) {
      consola.info(`next step: add \`${APP_CSS_IMPORT}\` to your CSS entry`)
    }
  },
})
