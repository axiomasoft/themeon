import { dirname, sep } from 'node:path'

export interface WatchTarget {
  /** `'directory'` → granular CSS-HMR через `builder:watch` (без рестарта). `'file'` → Nuxt
   * делает полный рестарт dev-сервера (документированная семантика `watch`, строгое сравнение
   * путей). */
  kind: 'directory' | 'file'
  path: string
}

/**
 * Резолвит область наблюдения dev-watcher'а темы (P8.4 канон,
 * findings/P8-nuxt-vue-runtime.md §2). **Никогда** не отдаёт rootDir/srcDir целиком: фикс #20 —
 * `watch.push(rootDir)` вытесняет узкие подписки Nuxt (`resolvePathsToWatch` схлопывает более
 * узкие пути в более широкий) и даёт полный обход дерева на каждое сохранение любого файла.
 */
export function resolveWatchTarget(params: {
  themePath: string
  tokensDir: string | undefined
  rootDir: string
  srcDir: string
  buildDir: string
}): WatchTarget {
  const { themePath, tokensDir, rootDir, srcDir, buildDir } = params

  if (tokensDir) {
    if (tokensDir === rootDir || buildDir === tokensDir || buildDir.startsWith(tokensDir + sep)) {
      throw new Error(
        `[themeon] tokensDir не может быть корнем проекта (${tokensDir}): dev-watcher подписался бы ` +
          `на весь rootDir и вытеснил бы узкие подписки Nuxt. Положите токены в отдельную директорию.`,
      )
    }
    return { kind: 'directory', path: tokensDir }
  }

  const themeDir = dirname(themePath)
  if (themeDir === rootDir || themeDir === srcDir) {
    // Тема лежит в корне проекта — директорию наблюдать нельзя (это и есть rootDir).
    return { kind: 'file', path: themePath }
  }

  return { kind: 'directory', path: themeDir }
}
