/**
 * P6.5 — сквозной multi-tenant демо-стенд (капстоун-доказательство H3 end-to-end). Самодостаточный
 * framework-agnostic Node-стаб (P-D71: не интеграция в CoreX/Flex*, mock-store вместо БД):
 * `renderTenantPage(tenantId)` реализует канонический рубеж-порядок defense-in-depth —
 * schema-валидация (P6.2, играет роль ВНЕШНЕГО PHP/Flex*-валидатора) → fail-closed APCA-гейт
 * (P6.3-композиция: `applyThemePatch` + `checkThemeContrast`) → `serializeThemePatch` (P6.1) →
 * инъекция ТОЛЬКО в `<style nonce>`-элемент `<head>` + анти-FOUC `themeInitScript()`.
 *
 * `validateTenantPatchAgainstSchema` — МИНИМАЛЬНЫЙ walker поднадмножества JSON Schema,
 * которое реально эмитит `tenantThemeSchema()` (object/additionalProperties/required/pattern/
 * anyOf/number-min-max-multipleOf). Это НЕ замена ajv/opis настоящего Flex*-сервера — здесь он
 * лишь играет роль внешнего потребителя схемы (P6.2 Scope Excluded: `@themeon/core` рантайм-
 * валидацию схемой сознательно не делает, "ядро лишь строит объект, не валидирует рантайм").
 */
import {
  applyThemePatch,
  defineTheme,
  resolveTheme,
  serializeThemeCss,
  serializeThemePatch,
  tenantThemeSchema,
  type JsonSchema,
  type JsonSchemaNode,
  type ResolvedTheme,
  type TokenTreeInput,
} from '@themeon/core'
import { checkThemeContrast } from '@themeon/colors'
import { themeInitScript } from '@themeon/vue/anti-fouc'

/** Демо-nonce фиксирован (детерминированный тест-снапшот); в проде — криптослучайный per-request. */
export const DEMO_NONCE = 'demo-nonce-9f3a'

const theme = defineTheme({
  base: {
    color: {
      text: '#1a1a1a',
      bg: { page: '#ffffff' },
      action: { primary: '#1a4fd6' },
      onPrimary: '#ffffff',
    },
    radius: { md: '8px' },
  },
})

/** Базовая (дефолт) тема демо-стенда — та же схема ролей, что `packages/colors/src/contrast.test.ts`
 *  (`--color-text`/`--color-bg-page`/`--color-action-primary`/`--color-on-primary`). */
export const base: ResolvedTheme = resolveTheme(theme)

/** Mock-хранилище tenant-патчей (JSONB-образно) — subdomain→tenant→патч (P-D71, стаб). */
export const TENANT_STORE: Readonly<Record<string, TokenTreeInput>> = {
  // Легальный патч: бренд-цвет + скругление — обе роли контраста (onPrimary/action.primary)
  // остаются проходными (тёмно-синий → тёмно-фиолетовый, оба темнее порога APCA 'text').
  acme: { color: { action: { primary: '#5a1e8c' } }, radius: { md: '4px' } },
  // Вектор атаки R-16 §2 (CSS-инъекция/stored-XSS): `}` закрывает декларацию, `</style>` рвёт
  // элемент, `<script>` — полезная нагрузка.
  evil: { color: { action: { primary: 'red}</style><script>window.__xss=1</script>' } } },
  // Низкоконтрастный: текст почти сливается с фоном (тёмная-на-тёмном далеко от APCA-порога).
  lowContrast: { color: { text: '#fbfbfb' } },
} as const

/** Признак leaf-узла (по наличию `pattern`/`anyOf`/`type` вне `'object'`) в дереве {@link JsonSchemaNode}. */
function isSchemaObjectNode(node: JsonSchemaNode): boolean {
  return node.type === 'object'
}

/**
 * Минимальный рекурсивный валидатор JSON Schema-поднадмножества {@link tenantThemeSchema}:
 * `object`(`additionalProperties`/`required`/`properties`) · `string`(`pattern`) ·
 * `number`(`minimum`/`maximum`/`multipleOf`) · `anyOf`. Бросает `Error` на первом расхождении —
 * играет роль внешнего сервера, ЕЩЁ ДО того, как значение доходит до `applyThemePatch` (P6.1).
 */
function validateAgainstSchemaNode(node: JsonSchemaNode, value: unknown, path: string): void {
  const anyOf = node.anyOf as readonly JsonSchemaNode[] | undefined
  if (anyOf !== undefined) {
    const matches = anyOf.some((branch) => {
      try {
        validateAgainstSchemaNode(branch, value, path)
        return true
      } catch {
        return false
      }
    })
    if (!matches) throw new Error(`tenant schema violation at "${path}": value matches none of the anyOf branches`)
    return
  }

  if (isSchemaObjectNode(node)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`tenant schema violation at "${path}": expected object`)
    }
    const properties = (node.properties ?? {}) as Record<string, JsonSchemaNode>
    const required = (node.required as readonly string[] | undefined) ?? []
    const record = value as Record<string, unknown>
    for (const key of required) {
      if (!(key in record)) throw new Error(`tenant schema violation at "${path}": missing required "${key}"`)
    }
    for (const key of Object.keys(record)) {
      if (node.additionalProperties === false && !(key in properties)) {
        throw new Error(`tenant schema violation at "${path}.${key}": additional property not allowed by tenant schema`)
      }
      const child = properties[key]
      if (child !== undefined) validateAgainstSchemaNode(child, record[key], `${path}.${key}`)
    }
    return
  }

  if (node.type === 'string') {
    if (typeof value !== 'string') throw new Error(`tenant schema violation at "${path}": expected string`)
    const pattern = node.pattern as string | undefined
    if (pattern !== undefined && !new RegExp(pattern).test(value)) {
      throw new Error(`tenant schema violation at "${path}": "${value}" does not match tenant schema pattern`)
    }
    return
  }

  if (node.type === 'number') {
    if (typeof value !== 'number') throw new Error(`tenant schema violation at "${path}": expected number`)
    const { minimum, maximum, multipleOf } = node as { minimum?: number; maximum?: number; multipleOf?: number }
    if (minimum !== undefined && value < minimum) throw new Error(`tenant schema violation at "${path}": ${value} < minimum ${minimum}`)
    if (maximum !== undefined && value > maximum) throw new Error(`tenant schema violation at "${path}": ${value} > maximum ${maximum}`)
    if (multipleOf !== undefined) {
      const quotient = value / multipleOf
      if (Math.abs(quotient - Math.round(quotient)) >= 1e-9) {
        throw new Error(`tenant schema violation at "${path}": ${value} is not a multiple of ${multipleOf}`)
      }
    }
    return
  }

  throw new Error(`tenant schema violation at "${path}": unsupported schema node (unreachable for tenantThemeSchema output)`)
}

/** Внешний (симулированный) рубеж 1 — играет роль PHP/Flex*-сервера, валидирующего tenant-ввод
 *  ДО того, как патч доходит до `@themeon/core` (defense-in-depth, P6.2 Why). */
export function validateTenantPatchAgainstSchema(schema: JsonSchema, patch: unknown): void {
  validateAgainstSchemaNode(schema as unknown as JsonSchemaNode, patch, '$')
}

export interface RenderResult {
  readonly html: string
  readonly usedDefaultFallback: boolean
}

/**
 * Канонический сквозной флоу (Implementation Rules): schema (P6.2) → APCA-гейт (P6.3) →
 * `serializeThemePatch` (P6.1) → инъекция `<style nonce>`. Throw на ЛЮБОМ рубеже — страница НЕ
 * рендерится (fail-closed, ни один рубеж не "пропускает дальше").
 */
export function renderTenantPage(tenantId: string): string {
  const patch = TENANT_STORE[tenantId]
  if (patch === undefined) throw new Error(`renderTenantPage: unknown tenant "${tenantId}"`)

  // Рубеж 1 — внешний валидатор схемой (симулирует Flex*/PHP-сервер, P6.2).
  const schema = tenantThemeSchema(base)
  validateTenantPatchAgainstSchema(schema, patch)

  // Рубеж 2 — APCA-гейт (P6.3 композиция): `applyThemePatch` (P6.1, ОДИН проход валидации ядра —
  // defense-in-depth рубеж 2, независимый от рубежа 1) → эффективный lookup → `checkThemeContrast`.
  const { vars } = applyThemePatch(base, patch)
  const lookup = { ...base.vars, ...vars }
  const { pass, reports } = checkThemeContrast(lookup)
  if (!pass) {
    const failed = reports
      .filter((r) => !r.pass)
      .map((r) => `${r.pair.label}: |Lc|=${Math.abs(r.lc).toFixed(1)} < ${r.required}`)
      .join('; ')
    throw new Error(`renderTenantPage: APCA contrast gate failed for tenant "${tenantId}": ${failed}`)
  }

  // Рубеж 3 — `serializeThemePatch` (P6.1 публичный контракт, а не внутреннее поле рубежа 2 —
  // тот же путь, которым реально пользовался бы внешний consumer). Патч инжектится СВЕРХ базовой
  // статики (`serializeThemeCss`, build-канал, D8/D14) — тот же source-order, что в проде
  // (Implementation Rules P6.1: tenant-патч ПОСЛЕ базовой темы, не вместо неё).
  const patchCss = serializeThemePatch(base, patch)

  return buildHtml(patchCss)
}

/** Дефолт-страница без tenant-патча — только базовая статика (`serializeThemeCss`), для
 *  fallback-пути (см. `renderTenantPageOrDefault`). */
export function renderDefaultPage(): string {
  return buildHtml('')
}

/** Fail-closed откат: любой throw на любом рубеже → дефолт-тема, НЕ прокидывает исключение
 *  наружу (Implementation Rules: "отказ любого → страница НЕ публикуется (или откат на
 *  дефолт-тему)"). Возвращает признак отката — тест сверяет, что откат случился по нужной причине. */
export function renderTenantPageOrDefault(tenantId: string): RenderResult {
  try {
    return { html: renderTenantPage(tenantId), usedDefaultFallback: false }
  } catch {
    return { html: renderDefaultPage(), usedDefaultFallback: true }
  }
}

/** Собирает документ: базовая статика (`serializeThemeCss`) + опционально tenant-патч ПОСЛЕ неё
 *  (тот же source-order, что в проде) — ОБА блока ТОЛЬКО в `<style nonce>` (никогда не голый
 *  concat в атрибут/скрипт) + анти-FOUC `themeInitScript()` (pre-mortem путь 4, Phase Context). */
function buildHtml(patchCss: string): string {
  const baseCss = serializeThemeCss(base)
  return (
    `<!doctype html><html><head>` +
    `<style nonce="${DEMO_NONCE}">${baseCss}${patchCss}</style>` +
    `<script nonce="${DEMO_NONCE}">${themeInitScript()}</script>` +
    `</head><body>` +
    `<button id="cta" style="background:var(--color-action-primary);color:var(--color-on-primary)">CTA</button>` +
    `</body></html>`
  )
}
