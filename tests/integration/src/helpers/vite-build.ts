import { build, type PluginOption } from 'vite'

export interface ViteBuildResult {
  /** Конкатенация всех CSS-ассетов выходного бандла. */
  css: string
  /** Конкатенация всех JS-чанков выходного бандла. */
  js: string
}

interface RollupLikeOutputItem {
  type: string
  fileName: string
  source?: string | Uint8Array
  code?: string
}

/**
 * Тонкий хелпер: настоящий production-билд Vite (`build()`, `write: false`) на fixture-каталоге.
 * Никакой нормализации вывода — ассерты делает вызывающий тест (Implementation Rule 3, P8.1).
 */
export async function viteBuild(
  root: string,
  options: { plugins?: PluginOption[]; rollupOptions?: { input?: string } } = {},
): Promise<ViteBuildResult> {
  const out = (await build({
    root,
    logLevel: 'silent',
    configFile: false,
    plugins: options.plugins ?? [],
    build: { write: false, minify: false, rollupOptions: options.rollupOptions },
  })) as { output: RollupLikeOutputItem[] }

  const css = out.output
    .filter((c) => c.type === 'asset' && c.fileName.endsWith('.css'))
    .map((c) => String(c.source ?? ''))
    .join('\n')

  const js = out.output
    .filter((c) => c.type === 'chunk')
    .map((c) => c.code ?? '')
    .join('\n')

  return { css, js }
}
