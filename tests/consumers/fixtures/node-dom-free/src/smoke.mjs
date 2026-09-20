import { defineTheme } from '@themeon/core/authoring'
import { compileTheme } from '@themeon/core/compiler'
import { wcagContrastRatio } from '@themeon/colors'

if (typeof globalThis.document !== 'undefined') {
  throw new Error('DOM must not be required for this cell')
}

const theme = defineTheme({
  base: { color: { bg: { page: '#ffffff' }, text: { primary: '#111111' } } },
})
const { css } = compileTheme(theme)
if (!css.includes('--color-bg-page')) {
  throw new Error('compiler path failed without DOM')
}

const ratio = wcagContrastRatio('#111111', '#ffffff')
if (ratio < 10) {
  throw new Error(`unexpected contrast ratio: ${ratio}`)
}
