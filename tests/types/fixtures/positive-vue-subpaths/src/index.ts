import type { UseThemeReturn } from '@themeon/vue'
import { themeonPlugin, useTheme } from '@themeon/vue'
import { themeInitScript } from '@themeon/vue/anti-fouc'

export type ThemeReturn = UseThemeReturn
export const plugin = themeonPlugin
export const hook = useTheme
export const script = themeInitScript
