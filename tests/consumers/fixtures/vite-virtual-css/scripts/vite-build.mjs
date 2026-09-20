import { build } from 'vite'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = await import(join(root, 'vite.config.js'))

const built = await build({
  root,
  configFile: false,
  logLevel: 'silent',
  plugins: config.default.plugins ?? [],
  build: { write: false, minify: false },
})

const out = Array.isArray(built) ? built[0] : built
const css = out.output
  .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'))
  .map((chunk) => String(chunk.source ?? ''))
  .join('\n')

if (!css.includes('--color-action-primary')) {
  throw new Error(`packed vite consumer missing token CSS:\n${css.slice(0, 500)}`)
}

const manifestPath = join(root, '.themeon/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest.schemaVersion !== 1 || manifest.owner !== '@themeon/vite') {
  throw new Error(`invalid themeon manifest: ${JSON.stringify(manifest)}`)
}
if (manifest.css.sha256.length !== 64) {
  throw new Error(`manifest css.sha256 missing: ${manifestPath}`)
}
