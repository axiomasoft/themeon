/**
 * `themeon build` (P4.4): тонкая обёртка над готовым конвейером ядра — jiti-загрузка
 * `theme.config.ts` → `resolveTheme`/`serializeThemeCss` (P1) → `tokens.css`, опц.
 * `tailwindBridge` (P4.1) → отдельный bridge-файл. Новой резолв-логики не добавляет (D2/D4):
 * `runBuild` зовёт ровно те же экспорты ядра, что и прямой вызов, паритет вывода — по
 * построению (тест #5).
 */
import { dirname, relative, resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { resolveTheme, serializeThemeCss } from '@themeon/core'
import type { AliasesOption } from '@themeon/core'
import { tailwindBridge, tailwindLayerPreamble } from '@themeon/tailwind'
import { DEFAULT_THEME_CONFIG_PATH } from '../constants'
import { loadThemeConfig } from '../load-theme'

export interface BuildOptions {
  cwd: string
  config: string
  out: string
  tailwind?: string
  refLayer?: 'referenced' | 'all' | 'inline'
  aliases?: string
  tailwindLayers?: boolean
}

export interface BuildResult {
  outPath: string
  bridgePath?: string
}

/**
 * Loads `opts.config`, resolves it through the core resolver/serializer and writes
 * `opts.out` (+ an optional Tailwind bridge file at `opts.tailwind`). Pure with respect to
 * `opts.cwd` — never reads `process.cwd()` directly (testability, Rule 5).
 */
const KNOWN_ALIASES = ['legacy-v0']
const KNOWN_REF_LAYERS = ['referenced', 'all', 'inline']

export async function runBuild(opts: BuildOptions): Promise<BuildResult> {
  // P4.4 code review MED: валидируем CLI-строки до передачи в core — иначе неизвестный
  // --aliases падает криптичным `aliasRule is not a function` (resolve.ts:272), а опечатка
  // в --ref-layer молча трактуется как 'referenced' (resolve.ts:212-214), давая неверный
  // tokens.css без ошибки.
  if (opts.aliases !== undefined && !KNOWN_ALIASES.includes(opts.aliases)) {
    throw new Error(`Unknown --aliases rule "${opts.aliases}" (expected one of: ${KNOWN_ALIASES.join(', ')})`)
  }
  if (opts.refLayer !== undefined && !KNOWN_REF_LAYERS.includes(opts.refLayer)) {
    throw new Error(`Invalid --ref-layer "${opts.refLayer}" (expected one of: ${KNOWN_REF_LAYERS.join(', ')})`)
  }

  const theme = await loadThemeConfig(resolve(opts.cwd, opts.config))
  // CLI принимает алиас-набор строкой (v1 поддерживает только именованное правило
  // 'legacy-v0'; кастомная функция-правило AliasRule недостижима из command-line).
  const resolved = resolveTheme(theme, {
    refLayer: opts.refLayer ?? 'referenced',
    aliases: opts.aliases as AliasesOption | undefined,
  })

  const outPath = resolve(opts.cwd, opts.out)
  await mkdir(dirname(outPath), { recursive: true })
  // P8.15: --tailwind-layers вставляет order-statement (P-D61/P-D67) ПЕРВОЙ строкой,
  // до баннера serializeThemeCss — тот же рецепт, что import-потребитель @themeon/css
  // получает через layers-tailwind.css, но для статик-артефактного канала (P-D34).
  const tokensCss = opts.tailwindLayers
    ? tailwindLayerPreamble() + serializeThemeCss(resolved)
    : serializeThemeCss(resolved)
  await writeFile(outPath, tokensCss, 'utf8')
  consola.success(`themeon build → ${relative(opts.cwd, outPath)}`)

  let bridgePath: string | undefined
  if (opts.tailwind) {
    bridgePath = resolve(opts.cwd, opts.tailwind)
    await mkdir(dirname(bridgePath), { recursive: true })
    await writeFile(bridgePath, tailwindBridge(resolved), 'utf8')
    consola.success(`themeon build → ${relative(opts.cwd, bridgePath)} (Tailwind bridge)`)
  }

  return { outPath, bridgePath }
}

export const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Compile theme.config.ts to tokens.css (+ optional Tailwind bridge)',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to the theme config file',
      default: DEFAULT_THEME_CONFIG_PATH,
    },
    out: {
      type: 'string',
      description: 'Output path for tokens.css',
      default: 'tokens.css',
    },
    tailwind: {
      type: 'string',
      description: 'Also emit a Tailwind `@theme reference` bridge at this path',
    },
    'ref-layer': {
      type: 'string',
      description: 'Ref-layer transport: referenced (default) | all | inline',
      default: 'referenced',
    },
    aliases: {
      type: 'string',
      description: 'Legacy alias rule name (e.g. "legacy-v0")',
    },
    'tailwind-layers': {
      type: 'boolean',
      description: 'Prepend the Tailwind v4 @layer order-statement (P-D61) to the emitted tokens.css',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await runBuild({
        cwd: process.cwd(),
        config: args.config,
        out: args.out,
        tailwind: args.tailwind,
        refLayer: args['ref-layer'] as BuildOptions['refLayer'],
        aliases: args.aliases,
        tailwindLayers: args['tailwind-layers'],
      })
    } catch (err) {
      consola.error(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
    }
  },
})
