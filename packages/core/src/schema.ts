/**
 * `tenantThemeSchema` (P6.2) — JSON Schema draft 2020-12 для sys-слоя патча тенанта, ВНЕШНИЙ
 * контракт (PHP/Flex*-сервер валидирует tenant-ввод ДО вызова `applyThemePatch`/
 * `serializeThemePatch`, P6.1 — defense-in-depth, ядро ревалидирует независимо). Схема — ДАННЫЕ
 * (plain object), не тянет ajv/json-schema-либу (`@themeon/core` остаётся zero-dep, D12).
 *
 * ЕДИНЫЙ источник `pattern`/allowed-типов — `patch-grammar.ts` (P6.1): хардкодить регэксп
 * здесь ВТОРОЙ раз запрещено, anti-drift тест (`schema.test.ts`) ловит расхождение схема↔ядро
 * (fail-closed, `R-16 §2`). Типы вне `ALLOWED_TENANT_TYPES` (shadow/gradient/cubicBezier) НЕ
 * попадают в `properties` — tenant физически не может их запросить схемой.
 */
import {
  ALLOWED_TENANT_TYPES,
  COLOR_PATTERN,
  DIMENSION_PATTERN,
  DURATION_PATTERN,
  FONT_FAMILY_PATTERN,
  FONT_WEIGHT_PATTERN,
  NUMBER_PATTERN,
  TEXT_LINE_HEIGHT_PATTERN,
} from './patch-grammar'
import { UNSAFE_KEYS } from './define'
import type { ResolvedTheme, TokenType } from './types'

/** Один узел JSON Schema — либо группа (`object`), либо лист (per-type `pattern`/composite `text`). */
export type JsonSchemaNode = Readonly<Record<string, unknown>>

/** Форма, которую строит {@link tenantThemeSchema} (подмножество draft 2020-12, используемых ключей). */
export interface JsonSchema {
  readonly $schema: 'https://json-schema.org/draft/2020-12/schema'
  readonly type: 'object'
  readonly additionalProperties: false
  readonly properties: Readonly<Record<string, JsonSchemaNode>>
}

/** Опции {@link tenantThemeSchema}. Пусто в v1 — зарезервировано для будущего `$id`/версионирования (Scope Excluded P6.2). */
export interface TenantSchemaOptions {}

function leafPatternFor(type: Exclude<TokenType, 'text'>): string {
  switch (type) {
    case 'color':
      return COLOR_PATTERN
    case 'dimension':
      return DIMENSION_PATTERN
    case 'number':
      return NUMBER_PATTERN
    case 'duration':
      return DURATION_PATTERN
    case 'fontWeight':
      return FONT_WEIGHT_PATTERN
    case 'fontFamily':
      return FONT_FAMILY_PATTERN
    default:
      // Недостижимо: вызывающий код фильтрует по ALLOWED_TENANT_TYPES ДО вызова
      // (shadow/gradient/cubicBezier сюда не попадают, 'text' обрабатывается отдельной веткой).
      throw new Error(`schema.ts: unexpected tenant type "${type}" (not in ALLOWED_TENANT_TYPES leaf set)`)
  }
}

/** `text` — композит `{ size, lineHeight? }`, тот же контракт, что `validateTenantTextValue` (P6.1). */
function textLeafSchema(): JsonSchemaNode {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: {
      size: { type: 'string', pattern: DIMENSION_PATTERN },
      lineHeight: { type: 'string', pattern: TEXT_LINE_HEIGHT_PATTERN },
    },
  }
}

/** Вставляет `leaf` по вложенному `path` в дерево `properties`, заводя `object`-группы по пути. */
function insertLeaf(root: Record<string, JsonSchemaNode>, path: readonly string[], leaf: JsonSchemaNode): void {
  let properties = root
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!
    // Пути базы — авторские (theme.config.ts), не tenant-ввод, но защита по построению дешева
    // и симметрична guard'у P6.1 patch.ts (UNSAFE_PATH) — сегмент-ловушка сюда не просочится.
    if (UNSAFE_KEYS.has(segment)) continue
    const existing = properties[segment] as { properties: Record<string, JsonSchemaNode> } | undefined
    if (existing === undefined) {
      const group: { type: 'object'; additionalProperties: false; properties: Record<string, JsonSchemaNode> } = {
        type: 'object',
        additionalProperties: false,
        properties: {},
      }
      properties[segment] = group
      properties = group.properties
    } else {
      properties = existing.properties
    }
  }
  const lastSegment = path[path.length - 1]!
  if (UNSAFE_KEYS.has(lastSegment)) return
  properties[lastSegment] = leaf
}

/**
 * Builds a JSON Schema (draft 2020-12) describing the legal tenant patch shape for `base` —
 * only `ALLOWED_TENANT_TYPES` paths are included, each leaf carrying the exact `pattern` used
 * by {@link import('./patch').applyThemePatch} (`patch-grammar.ts`, single source of truth).
 * `additionalProperties: false` at every level rejects tenant-added keys structurally, before
 * any per-value grammar check runs. Output order always follows `base.tokens` (same
 * determinism guarantee as `applyThemePatch`).
 *
 * @example
 * ```ts
 * const schema = tenantThemeSchema(base)
 * // { $schema: '...2020-12/schema', type: 'object', additionalProperties: false,
 * //   properties: { color: { type: 'object', additionalProperties: false,
 * //     properties: { bg: { ... properties: { page: { type: 'string', pattern: COLOR_PATTERN } } } } } } }
 * ```
 */
export function tenantThemeSchema(base: ResolvedTheme, _opts: TenantSchemaOptions = {}): JsonSchema {
  const properties: Record<string, JsonSchemaNode> = {}
  const seenPaths = new Set<string>()

  for (const token of base.tokens) {
    if (!ALLOWED_TENANT_TYPES.has(token.type)) continue
    const pathKey = JSON.stringify(token.path)
    if (seenPaths.has(pathKey)) continue // 'text' резолвится в ДВЕ ResolvedToken (size+line-height) — одна схема-запись
    seenPaths.add(pathKey)

    const leaf = token.type === 'text' ? textLeafSchema() : { type: 'string', pattern: leafPatternFor(token.type) }
    insertLeaf(properties, token.path, leaf)
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties,
  }
}
