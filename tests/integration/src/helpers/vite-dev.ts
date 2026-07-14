import { createServer, type PluginOption, type ViteDevServer } from 'vite'

export interface ViteDevHandle {
  server: ViteDevServer
  url: string
}

/**
 * Тонкий хелпер: поднимает настоящий `createServer()` Vite (не CLI-спавн — `findings/
 * P8-vite-channel-hmr.md` §2 использует тот же приём) на свободном порте 127.0.0.1, отдаёт URL,
 * закрывает сервер после `fn`. Никакой нормализации — ассерты делает вызывающий тест.
 */
export async function withViteDev<T>(
  root: string,
  options: { plugins?: PluginOption[] },
  fn: (handle: ViteDevHandle) => Promise<T>,
): Promise<T> {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: options.plugins ?? [],
    server: { port: 0, strictPort: false, host: '127.0.0.1' },
  })
  await server.listen()
  const address = server.httpServer?.address()
  const port = typeof address === 'object' && address ? address.port : undefined
  if (!port) throw new Error('vite dev server не сообщил порт')

  try {
    return await fn({ server, url: `http://127.0.0.1:${port}/` })
  } finally {
    await server.close()
  }
}
