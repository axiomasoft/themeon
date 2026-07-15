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

/**
 * fix(P6.2 adversarial-verify MED): `validateTenantValue`/`validateTenantTextValue`
 * (patch-grammar.ts:235,207) coerce a raw JSON *number* to its `String(...)` form BEFORE running
 * the type pattern — so `600` (fontWeight), `50` (number) и `1.4` (text.lineHeight) — все
 * натуральные numeric-формы токена — ядро ПРИНИМАЕТ. Схема, объявляя лист `type:'string'`,
 * структурно отклоняет JSON-число ДО того, как `pattern` вообще проверяется (JSON Schema:
 * `type` — первый гейт) → server rejects / core accepts drift на легальном вводе. Только эти три
 * листа затронуты: `color`/`dimension`/`duration`/`fontFamily` даже после `String(n)`-коэрсии не
 * матчат свой паттерн (dimension/duration требуют unit-суффикс, color/fontFamily требуют буквы) —
 * там числовой JS-инпут и ядро бросает, дрейфа нет, doubling не нужен.
 */
function numericLeafFor(type: 'number' | 'fontWeight'): JsonSchemaNode {
  switch (type) {
    case 'number':
      // NUMBER_PATTERN: `-?\d{1,4}(\.\d{1,4})?` — до 4 целых + 4 дробных знака.
      return { type: 'number', minimum: -9999.9999, maximum: 9999.9999 }
    case 'fontWeight':
      // Числовая ветка FONT_WEIGHT_PATTERN — только `[1-9]00` (сотни 100..900); именованные
      // ключевые слова (normal/bold/bolder/lighter) числом не выразимы, остаются string-only.
      return { type: 'number', minimum: 100, maximum: 900, multipleOf: 100 }
  }
}

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

/** Строковый лист `{type:'string', pattern}` либо, для `number`/`fontWeight`, `anyOf` со
 *  string-веткой (та же `pattern`) и number-веткой ({@link numericLeafFor}) — см. докблок там же. */
function scalarLeafSchema(type: Exclude<TokenType, 'text'>): JsonSchemaNode {
  const stringLeaf = { type: 'string', pattern: leafPatternFor(type) }
  if (type === 'number' || type === 'fontWeight') {
    return { anyOf: [stringLeaf, numericLeafFor(type)] }
  }
  return stringLeaf
}

/** `text` — композит `{ size, lineHeight? }`, тот же контракт, что `validateTenantTextValue` (P6.1). */
function textLeafSchema(): JsonSchemaNode {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: {
      size: { type: 'string', pattern: DIMENSION_PATTERN },
      // TEXT_LINE_HEIGHT_PATTERN: `\d{1,2}(\.\d{1,3})?` — неотрицательное, 1-2 целых+до 3 дробных
      // знаков (0..99.xxx). `validateTenantTextValue` (patch-grammar.ts:207) коэрсит JSON-число в
      // строку ДО этого паттерна — схема обязана принимать ту же numeric-форму (см. докблок
      // {@link numericLeafFor} — тот же класс drift, что fontWeight/number).
      lineHeight: { anyOf: [{ type: 'string', pattern: TEXT_LINE_HEIGHT_PATTERN }, { type: 'number', minimum: 0, maximum: 99.999 }] },
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

    const leaf = token.type === 'text' ? textLeafSchema() : scalarLeafSchema(token.type)
    insertLeaf(properties, token.path, leaf)
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties,
  }
}
