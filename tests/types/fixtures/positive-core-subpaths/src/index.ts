import { defineTheme, resolveTheme } from '@themeon/core'
import { defineTheme as defineAuthoring } from '@themeon/core/authoring'
import { compileTheme } from '@themeon/core/compiler'
import { applyTheme } from '@themeon/core/runtime'
import { fromDTCG } from '@themeon/core/dtcg'
import { tenantThemeSchema } from '@themeon/core/tenant'

const theme = defineTheme({
  base: { color: { fg: 'oklch(0.2 0.02 250)' } },
})

export const smoke = {
  defineAuthoring,
  compileTheme,
  applyTheme,
  fromDTCG,
  tenantThemeSchema,
  resolved: resolveTheme(theme),
}
