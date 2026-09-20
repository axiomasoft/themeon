import { irFromDefinition } from '../model/from-definition'
import type { IrDocument } from '../model/ir'
import type { ThemeDefinition } from '../types'

/** DSL → IR. `defineTheme` remains the public authoring function (ADR ir-compatibility). */
export function normalizeDsl(def: ThemeDefinition, file?: string): IrDocument {
  return irFromDefinition(def, file !== undefined ? { kind: 'dsl', file } : { kind: 'dsl' })
}
