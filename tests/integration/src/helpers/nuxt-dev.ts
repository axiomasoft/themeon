import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer } from 'node:net'
import { join } from 'node:path'

const NUXT_BIN = join(import.meta.dirname, '..', '..', 'node_modules', '.bin', 'nuxt')

export interface NuxtDevHandle {
  url: string
  tokensCssPath: string
  stop: () => Promise<void>
}

/** Свободный порт от ОС (bind на 0, читаем назначенный, сразу закрываем). */
function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      const port = typeof address === 'object' && address ? address.port : undefined
      srv.close((err) => {
        if (err) reject(err)
        else if (port) resolve(port)
        else reject(new Error('не удалось определить свободный порт'))
      })
    })
  })
}

/**
 * Ждёт первого успешного ответа на `url`. Собирает stdout/stderr процесса ТОЛЬКО для сообщения
 * об ошибке при таймауте — polling HTTP, не парсинг банера: в этой среде (проверено эмпирически)
 * `nuxt dev`, заспавненный из-под vitest, реально биндится и отвечает на порт (доказано прямым
 * `curl` на слушающий сокет процесса), но НИЧЕГО не пишет в переданный pipe stdout/stderr —
 * regex-парсинг баннера из findings §6e в этой среде недостижим.
 */
async function pollOk(proc: ChildProcessWithoutNullStreams, url: string, timeoutMs: number): Promise<void> {
  let buf = ''
  proc.stdout.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
  })
  proc.stderr.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
  })
  let spawnError: unknown
  proc.once('error', (err) => {
    spawnError = err
  })

  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError
    if (proc.exitCode !== null) {
      throw new Error(`nuxt dev завершился раньше времени (код ${proc.exitCode}), вывод:\n${buf}`)
    }
    try {
      const res = await fetch(url)
      if (res.ok) return
      lastError = new Error(`статус ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`GET ${url} не ответил 200 за ${timeoutMs}ms: ${String(lastError)}, вывод:\n${buf}`)
}

/**
 * Тонкий хелпер: поднимает настоящий `nuxt dev` на fixture-директории на заранее выбранном
 * свободном порте, ждёт первого 200 и возвращает URL + путь к сгенерированному
 * `.nuxt/themeon-tokens.css` + функцию остановки. `NUXT_IGNORE_LOCK=1` — иначе конфликт с
 * dev-сервером разработчика (findings/P8-integration-harness.md §6e).
 */
export async function spawnNuxtDev(fixtureDir: string): Promise<NuxtDevHandle> {
  const port = await pickFreePort()
  const url = `http://127.0.0.1:${port}/`

  const proc = spawn(NUXT_BIN, ['dev', '--port', String(port)], {
    cwd: fixtureDir,
    env: { ...process.env, NUXT_IGNORE_LOCK: '1' },
  }) as ChildProcessWithoutNullStreams

  await pollOk(proc, url, 45_000)

  return {
    url,
    tokensCssPath: join(fixtureDir, '.nuxt', 'themeon-tokens.css'),
    stop: () =>
      new Promise((resolve) => {
        proc.once('close', () => resolve())
        proc.kill()
      }),
  }
}
