import { bundle, Features } from 'lightningcss'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'

// Baseline-2026 floor (R-12 §7): Chrome 125, Firefox 132, Safari 18.2.
const TARGETS = { chrome: 125 << 16, firefox: 132 << 16, safari: (18 << 16) | (2 << 8) }
// P2.6 code-review (MED): для этих targets lightningcss считает `-webkit-background-clip`
// избыточным и вычищает его при минификации — даже если он написан вручную в исходнике
// (`gradient.css` .text-gradient). Safari's real support for unprefixed `background-clip: text`
// не гарантирован (long-standing caniuse-предупреждение), поэтому ручной prefix должен пережить
// сборку. `exclude: Features.VendorPrefixes` отключает и добавление, и удаление вендор-префиксов
// лайтнингcss'ом — проверено (2026-07-12): единственная затронутая декларация во всём dist —
// именно `-webkit-background-clip` в components.css; `-webkit-text-size-adjust`/
// `-webkit-font-smoothing` в reset.css не входят в compat-таблицу лайтнингcss и не менялись
// в любом случае.
const EXCLUDE = Features.VendorPrefixes

const ENTRIES = [
  'index.css',
  'layers.css',
  'reset.css',
  'base.css',
  'composition.css',
  'blueprints.css',
  'components.css',
  'utilities.css',
]

export function buildCss(root = new URL('..', import.meta.url).pathname) {
  mkdirSync(`${root}/dist`, { recursive: true })
  for (const entry of ENTRIES) {
    const { code } = bundle({
      filename: `${root}/src/${entry}`,
      minify: true,
      targets: TARGETS,
      exclude: EXCLUDE,
    })
    // Атомарная публикация (P2.3 code-review, MED): пишем во временный файл в той же
    // директории и переименовываем — rename() атомарен на POSIX-ФС, читатели в параллельных
    // vitest-форках никогда не видят truncate/write-окно чужого writeFileSync().
    const dest = `${root}/dist/${entry}`
    const tmp = `${dest}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
    writeFileSync(tmp, code)
    renameSync(tmp, dest)
  }
}

// CLI-запуск (node scripts/build.mjs)
if (import.meta.url === `file://${process.argv[1]}`) buildCss()
