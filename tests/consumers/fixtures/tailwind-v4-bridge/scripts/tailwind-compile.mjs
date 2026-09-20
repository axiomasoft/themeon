import { defineTheme, resolveTheme } from '@themeon/core'
import { tailwindBridge } from '@themeon/tailwind'
import { compile } from '@tailwindcss/node'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const consumerRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const theme = defineTheme({
  base: {
    color: { action: { primary: 'oklch(0.55 0.15 255)' } },
    bg: { page: 'oklch(1 0 0)' },
  },
})

const resolved = resolveTheme(theme)
const bridgeCss = tailwindBridge(resolved)
const input = `@import "tailwindcss";\n${bridgeCss}\n`

const result = await compile(input, {
  base: consumerRoot,
  onDependency: () => {},
})

const css = result.build(['bg-action-primary'])
if (!css.includes('background-color')) {
  throw new Error(`tailwind bridge did not emit utility CSS:\n${css}`)
}
