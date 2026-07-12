import { bundle } from 'lightningcss'
import { mkdirSync, writeFileSync } from 'node:fs'

// Baseline-2026 floor (R-12 §7): Chrome 125, Firefox 132, Safari 18.2.
const TARGETS = { chrome: 125 << 16, firefox: 132 << 16, safari: (18 << 16) | (2 << 8) }

// P2.4–P2.6 дополняют список своими entry (composition/blueprints/components/utilities).
const ENTRIES = ['index.css', 'layers.css', 'reset.css', 'base.css']

export function buildCss(root = new URL('..', import.meta.url).pathname) {
  mkdirSync(`${root}/dist`, { recursive: true })
  for (const entry of ENTRIES) {
    const { code } = bundle({ filename: `${root}/src/${entry}`, minify: true, targets: TARGETS })
    writeFileSync(`${root}/dist/${entry}`, code)
  }
}

// CLI-запуск (node scripts/build.mjs)
if (import.meta.url === `file://${process.argv[1]}`) buildCss()
