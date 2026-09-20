import { defineTheme, resolveTheme } from '@themeon/core'
import { fromDTCG } from '@themeon/core/dtcg'

export function roundTrip() {
  const theme = defineTheme({
    base: { color: { action: { primary: 'oklch(0.5 0.1 250)' } } },
  })
  const resolved = resolveTheme(theme)
  const dtcg = fromDTCG({ color: { action: { primary: { $value: '#3366cc', $type: 'color' } } } })
  return { resolved, dtcg }
}
