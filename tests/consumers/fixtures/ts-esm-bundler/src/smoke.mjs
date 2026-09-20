import { defineTheme, resolveTheme } from '@themeon/core'
import { fromDTCG } from '@themeon/core/dtcg'

const theme = defineTheme({
  base: { color: { action: { primary: 'oklch(0.5 0.1 250)' } } },
})
const resolved = resolveTheme(theme)
if (!resolved.vars['--color-action-primary']) {
  throw new Error('missing resolved var')
}

const dtcg = fromDTCG({
  color: { action: { primary: { $value: '#3366cc', $type: 'color' } } },
})
if (!dtcg.definition) {
  throw new Error('expected DTCG import to yield definition')
}
