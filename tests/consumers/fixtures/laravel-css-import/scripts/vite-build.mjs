import { build } from 'vite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const built = await build({
  root,
  logLevel: 'silent',
  configFile: false,
  build: { write: false, minify: false },
})

const out = Array.isArray(built) ? built[0] : built
const css = out.output
  .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))
  .map((chunk) => String(chunk.source ?? ''))
  .join('\n')

if (!css.includes('--color-bg-page')) {
  throw new Error(`laravel CSS channel missing design tokens:\n${css.slice(0, 800)}`)
}
