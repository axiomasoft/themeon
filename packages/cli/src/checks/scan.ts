/**
 * `scanSources` (P4.5) — собирает исходники потребителя для coverage/hardcode-линтеров через
 * `tinyglobby`. Тонкая обёртка: glob → чтение файлов utf8 → `{file, content}[]`. `file` —
 * путь относительно `cwd` (как возвращает `tinyglobby` по умолчанию, `absolute:false`) — тот же
 * путь идёт в `Finding.file` для отчёта.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { glob } from 'tinyglobby'
import type { SourceFile } from './types'

export async function scanSources(
  cwd: string,
  patterns: readonly string[],
  ignore: readonly string[],
): Promise<SourceFile[]> {
  const files = await glob(patterns, { cwd, ignore: [...ignore] })
  const sources = await Promise.all(
    files.map(async (file): Promise<SourceFile> => ({ file, content: await readFile(join(cwd, file), 'utf8') })),
  )
  return sources
}
