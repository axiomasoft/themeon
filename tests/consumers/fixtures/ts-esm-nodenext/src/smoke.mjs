import { defineTheme } from '@themeon/core'
import { compileTheme } from '@themeon/core/compiler'

const theme = defineTheme({
  base: { color: { bg: { page: 'oklch(1 0 0)' } } },
})
const css = compileTheme(theme).css
if (!css.includes('--color-bg-page')) {
  throw new Error('expected resolved token in CSS output')
}
