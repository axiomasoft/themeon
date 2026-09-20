/**
 * `@themeon/vite` (P3.5, канал/HMR починены P8.2) — Vite-плагин для Laravel/plain-проектов
 * (не-Nuxt): у Nuxt свой канал `@themeon/nuxt` (P3.3/P3.4), этот пакет им не пользуется.
 *
 * Виртуальный модуль `virtual:themeon.css` — конвенция Vite: публичный id должен начинаться с
 * `virtual:`, а `resolveId` возвращает тот же id с ведущим `\0` (Rollup-конвенция «не трогать
 * другим плагинам/резолву на диске, https://vite.dev/guide/api-plugin). `load` отдаёт CSS темы
 * из одного `compileTheme` на инвалидацию (P3.3). **Канонический канал — `import 'virtual:themeon.css'`
 * из JS-энтри; CSS-`@import` виртуального модуля физически невозможен** — `vite:css` резолвит
 * `@import` через postcss-import собственным fs-резолвером (P-D55).
 *
 * `cssImport` — опция для CSS-first проектов: реальный файл + alias; manifest/CSP artifacts
 * пишутся атомарно в `.themeon/` для PHP/Laravel потребителей (P3.3).
 */
import { resolve as resolveFromRoot } from 'node:path'
import { normalizePath } from 'vite'
import {
  compileTheme,
  diagnosticFromUnknown,
  formatDiagnostics,
} from '@themeon/core/compiler'
import type { CompileResult } from '@themeon/core/compiler'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import type { Plugin, ResolvedConfig } from 'vite'
import { resolveArtifactPaths, writeDeliveryArtifacts } from './artifacts'
import { createTrailingDebounce } from './debounce'
import { atomicWriteText } from './fs'
import type { ThemeonArtifactsOptions, ThemeonViteOptions } from './types'

export type { ThemeonArtifactsOptions, ThemeonViteOptions } from './types'

const DEFAULT_CSS_IMPORT_FILE = '.themeon/theme.css'

function renderThemeFailure(err: unknown): string {
  return `[themeon] ${formatDiagnostics(
    [diagnosticFromUnknown(err, { provenance: { stage: 'adapter', producer: '@themeon/vite' } })],
    'plain',
  )}`
}

function resolveArtifactsOption(options: ThemeonViteOptions): false | ThemeonArtifactsOptions {
  if (options.artifacts === false) return false
  if (options.artifacts !== undefined) {
    return options.artifacts === true ? {} : options.artifacts
  }
  return options.cssImport ? {} : false
}

/** Создаёт Vite-плагин ThemeOn: виртуальный CSS темы + HMR + опц. анти-FOUC. */
export function themeon(options: ThemeonViteOptions): Plugin {
  if (!options?.theme) {
    throw new Error('[themeon] vite plugin: `theme` option is required')
  }

  const V_ID = options.virtualId ?? 'virtual:themeon.css'
  const RESOLVED = `\0${V_ID}`
  const artifactsOpt = resolveArtifactsOption(options)

  let tokensFiles = new Set<string>()
  let cssImportFile: string | undefined
  let projectRoot = process.cwd()
  let artifactPaths: ReturnType<typeof resolveArtifactPaths> | undefined
  let pendingDelivery: CompileResult | undefined
  let debouncedRefresh: (() => Promise<CompileResult>) | undefined

  const readTheme = async () =>
    typeof options.theme === 'function' ? await options.theme() : options.theme

  const compileFresh = async (): Promise<CompileResult> =>
    compileTheme(await readTheme(), {
      resolve: options.resolve,
      serialize: options.serialize,
    })

  const resolvePaths = (): ReturnType<typeof resolveArtifactPaths> | undefined => {
    if (artifactsOpt === false) return undefined
    artifactPaths ??= resolveArtifactPaths(projectRoot, artifactsOpt, cssImportFile)
    return artifactPaths
  }

  const deliver = async (): Promise<CompileResult> => {
    const compiled = await compileFresh()
    pendingDelivery = compiled
    if (cssImportFile) {
      atomicWriteText(cssImportFile, compiled.css)
    }
    const paths = resolvePaths()
    if (paths) {
      writeDeliveryArtifacts({
        root: projectRoot,
        paths,
        compiled,
        virtualModuleId: V_ID,
        fouc: options.injectFouc,
      })
    }
    return compiled
  }

  return {
    name: 'themeon',

    config(config) {
      projectRoot = config.root ?? process.cwd()
      if (!options.cssImport) return undefined
      const root = projectRoot
      const rel =
        typeof options.cssImport === 'object' && options.cssImport.file
          ? options.cssImport.file
          : DEFAULT_CSS_IMPORT_FILE
      cssImportFile = resolveFromRoot(root, rel)
      return { resolve: { alias: [{ find: V_ID, replacement: cssImportFile }] } }
    },

    configResolved(config: ResolvedConfig) {
      projectRoot = config.root
      tokensFiles = new Set(
        (options.tokensFiles ?? []).map((f) => normalizePath(resolveFromRoot(config.root, f))),
      )
      resolvePaths()
      const waitMs = artifactsOpt === false ? 0 : (artifactsOpt.debounceMs ?? 50)
      debouncedRefresh =
        waitMs > 0 ? createTrailingDebounce(() => deliver(), waitMs) : undefined
    },

    async buildStart() {
      try {
        await deliver()
      } catch (err) {
        this.error(renderThemeFailure(err))
      }
    },

    resolveId(id) {
      if (id === V_ID) return RESOLVED
      return undefined
    },

    load(id) {
      if (id !== RESOLVED) return undefined
      const usePending = pendingDelivery
      if (usePending) {
        pendingDelivery = undefined
        return usePending.css
      }
      return deliver()
        .then((r) => r.css)
        .catch((err: unknown) => {
          this.error(renderThemeFailure(err))
        })
    },

    async hotUpdate({ file }) {
      if (!tokensFiles.has(normalizePath(file))) return undefined
      try {
        if (debouncedRefresh) await debouncedRefresh()
        else await deliver()
      } catch (err) {
        this.error(renderThemeFailure(err))
      }
      const mod = this.environment.moduleGraph.getModuleById(RESOLVED)
      if (!mod) return undefined
      this.environment.moduleGraph.invalidateModule(mod)
      return [mod]
    },

    transformIndexHtml() {
      if (!options.injectFouc) return undefined
      const foucOpts = options.injectFouc === true ? {} : options.injectFouc
      return [
        {
          tag: 'script',
          children: themeInitScript(foucOpts),
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}
