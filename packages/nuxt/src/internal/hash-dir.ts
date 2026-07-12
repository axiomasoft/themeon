import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Детерминированный хэш содержимого директории (D13-фикс): dev-watcher `@themeon/nuxt`
 * сравнивает `hashDir` до/после `builder:watch`-события вместо хардкод-списка файлов
 * (донор-баг vintera `SOURCE_REL` — список указывал на несуществующий путь, HMR был мёртв).
 * Обходит директорию рекурсивно, сортирует записи на каждом уровне (порядок чтения ОС не
 * должен влиять на результат), не идёт по symlink наружу (`statSync`, не `lstatSync`, но
 * `readdirSync` без `withFileTypes`+ручного `realpath` — за пределы директории не выходит,
 * т.к. симлинк на директорию распознаётся `isDirectory()` и обходится по своему пути, а не
 * по цели; специальный анти-симлинк-guard не требуется для v1 dev-watcher'а).
 *
 * Несуществующая директория не бросает — возвращает стабильный хэш пустого обхода (тот же,
 * что для реально пустой директории), только предупреждает в консоль.
 */
export function hashDir(dir: string): string {
  const h = createHash('sha256')
  const walk = (d: string): void => {
    let entries: string[]
    try {
      entries = readdirSync(d).sort()
    } catch {
      if (d === dir) console.warn(`[themeon] hashDir: директория не найдена, хэш пустого обхода: ${dir}`)
      return
    }
    for (const name of entries) {
      const p = join(d, name)
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else {
        h.update(relative(dir, p))
        h.update('\0')
        h.update(readFileSync(p))
      }
    }
  }
  walk(dir)
  return h.digest('hex')
}
