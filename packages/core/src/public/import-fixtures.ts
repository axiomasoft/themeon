/**
 * TypeScript import fixtures (P1.6): old root + new subpaths must typecheck together.
 * Runtime identity is asserted in `exports.test.ts`.
 */
import {
  defineTheme as rootDefineTheme,
  defineTokens as rootDefineTokens,
  resolveTheme as rootResolveTheme,
  serializeThemeCss as rootSerializeThemeCss,
  applyTheme as rootApplyTheme,
  fromDTCG as rootFromDTCG,
  tenantThemeSchema as rootTenantThemeSchema,
} from '../index'
import { defineTheme, defineTokens } from './authoring'
import { compileTheme, resolveTheme, serializeThemeCss } from './compiler'
import { applyTheme, themeVars } from './runtime'
import { fromDTCG, toDTCG } from './dtcg'
import { tenantThemeSchema } from './tenant'
import type { ThemeDefinition } from './authoring'
import type { CompileResult } from './compiler'
import type { ElementLike } from './runtime'
import type { FromDTCGResult } from './dtcg'
import type { JsonSchema } from './tenant'

export const fixtures = {
  rootDefineTheme,
  rootDefineTokens,
  rootResolveTheme,
  rootSerializeThemeCss,
  rootApplyTheme,
  rootFromDTCG,
  rootTenantThemeSchema,
  defineTheme,
  defineTokens,
  compileTheme,
  resolveTheme,
  serializeThemeCss,
  applyTheme,
  themeVars,
  fromDTCG,
  toDTCG,
  tenantThemeSchema,
} as const

export type Fixtures = {
  theme: ThemeDefinition
  compiled: CompileResult
  el: ElementLike
  imported: FromDTCGResult
  schema: JsonSchema
}
