import { defineTheme } from '@themeon/core'
import { compileTheme } from '@themeon/core/compiler'
import type { ThemeDefinition } from '@themeon/core/authoring'

export function sampleTheme(): ThemeDefinition {
  return defineTheme({
    base: { color: { bg: { page: 'oklch(1 0 0)' } } },
  })
}

export function compileSample(theme: ThemeDefinition): string {
  return compileTheme(theme).css
}
