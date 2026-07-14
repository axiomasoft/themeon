import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// ВНУТРИ пакета, не `os.tmpdir()`: `@tailwindcss/node` резолвит `@import "tailwindcss"` нодовой
// резолюцией от `base`-директории — из `/tmp` она не находит `node_modules` пакета
// (findings/P8-integration-harness.md §3.1/§7). `.tmp-*` покрыт корневым `.gitignore`.
const TMP_ROOT = join(import.meta.dirname, '..', '..', '.tmp-fixtures')

/** Создаёт tmp-директорию внутри `tests/integration` и материализует в ней файлы фикстуры. */
export function mkFixture(prefix: string, files: Record<string, string>): string {
  mkdirSync(TMP_ROOT, { recursive: true })
  const dir = mkdtempSync(join(TMP_ROOT, `${prefix}-`))
  for (const [name, content] of Object.entries(files)) {
    const full = join(dir, name)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

export function rmFixture(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}
