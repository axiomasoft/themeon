/**
 * Tenant-патч (P6.1, H3 И1 — фикс подтверждённой дизайн-дыры класса stored-XSS,
 * `90_audit/FINAL_AUDIT_2026-07-12.md`): `applyThemePatch` валидирует sys-патч тенанта по
 * per-TokenType allowlist-грамматике (`patch-grammar.ts`, ЕДИНСТВЕННЫЙ источник) и отдаёт
 * И словарь переменных, И готовый CSS-текст из ОДНОГО прохода валидации — `serializeThemePatch`
 * лишь берёт `.css`. Ни одна функция здесь НЕ трогает `serializeThemeCss` (build-канал,
 * заморожен, P1.5) — tenant-путь инъекции статики в `<head>` отдельная функция намеренно
 * (Scope Excluded item'а).
 *
 * `serializeThemePatch` возвращает ТОЛЬКО декларации внутри селектора, НИКОГДА не
 * `<style>`-тег: caller владеет элементом стиля и CSP-nonce (pre-mortem путь 4, Phase Context).
 */

import { ThemeonError } from './errors'
import { UNSAFE_KEYS } from './define'
import { assertSafeCssToken } from './serialize'
import { walkTree } from './internal/walk'
import { ALLOWED_TENANT_TYPES, validateTenantTextValue, validateTenantValue } from './patch-grammar'
import type { CssVarName, ResolvedTheme, ResolvedToken, TokenTreeInput } from './types'

/** Опции валидации+сериализации tenant-патча. */
export interface ApplyPatchOptions {
  /** Селектор блока деклараций. Default `':root'`. Проходит через `assertSafeCssToken` (reuse). */
  selector?: string
  /**
   * Cascade layer name; `false` (default) не оборачивает вывод. Tenant-патч инжектится сырым
   * в `<head>` ПОСЛЕ базовой темы (`themeon.tokens`, D8) — оборачивание в тот же/более ранний
   * layer заставило бы патч проиграть каскаду базового слоя по source-order layer-приоритета
   * (Implementation Rules item'а P6.1). Опция — для caller'ов с собственной layer-стратегией;
   * значение проходит через `assertSafeCssToken` (reuse), как в `serializeThemeCss`.
   */
  layer?: string | false
}

/** `serializeThemePatch` не добавляет опций поверх {@link ApplyPatchOptions} (алиас-тип, D15). */
export type SerializePatchOptions = ApplyPatchOptions

/** Результат `applyThemePatch`: провалидированный словарь `varName → значение` + CSS-текст того же прохода. */
export interface ApplyPatchResult {
  /** `varName → нормализованное значение`, порядок = `base.tokens` (детерминизм). */
  readonly vars: Readonly<Record<CssVarName, string>>
  /** `<selector> { --var: value; … }\n` — только декларации, без `<style>`-тега (см. модульный docblock). */
  readonly css: string
}

/** Ключ идентичности пути — тот же приём, что резолвер (P1.4, `resolve.ts::pathKey`): сегменты
 *  пути могут содержать `.`, поэтому не `join('.')`, а `JSON.stringify`. */
function pathKey(path: readonly string[]): string {
  return JSON.stringify(path)
}

/** Группирует `base.tokens` по пути: text-путь резолвится в ДВЕ записи (size + line-height
 *  companion, `formatTextVarNames`, naming.ts), любой другой тип — ровно в одну. */
function indexTokensByPath(base: ResolvedTheme): Map<string, ResolvedToken[]> {
  const index = new Map<string, ResolvedToken[]>()
  for (const token of base.tokens) {
    const key = pathKey(token.path)
    const bucket = index.get(key)
    if (bucket) bucket.push(token)
    else index.set(key, [token])
  }
  return index
}

/** Собирает `<selector> {\n  --var: value;\n}\n`, опционально в `@layer <name> { … }` — в
 *  детерминированном порядке `vars`. */
function serializeVars(vars: Readonly<Record<string, string>>, selector: string, layer: string | false): string {
  const indent = layer !== false ? '  ' : ''
  const lines = Object.entries(vars).map(([name, value]) => `${indent}  ${name}: ${value};`)
  const block = `${indent}${selector} {\n${lines.join('\n')}\n${indent}}`
  return layer !== false ? `@layer ${layer} {\n${block}\n}\n` : `${block}\n`
}

/**
 * Validates a tenant sys-patch against `base`'s resolved token grammar and turns it into a
 * variable dictionary plus ready-to-inject CSS declarations, in one validation pass (P6.3's
 * APCA gate consumes `.vars` directly — it never re-validates). Every patched path must exist
 * in `base.tokens` and resolve to a type in `ALLOWED_TENANT_TYPES` ({@link
 * ALLOWED_TENANT_TYPES}); every value must pass the type's positive allowlist grammar
 * (`patch-grammar.ts`) — anything else throws loudly rather than being silently dropped or
 * escaped. Output order always follows `base.tokens` (never the patch's own key order), so the
 * same `(base, patch)` pair always serializes byte-for-byte identically.
 *
 * @throws {ThemeonError}
 *   `UNSAFE_PATH` — a path segment is `__proto__`/`constructor`/`prototype`;
 *   `UNKNOWN_PATH` — a path is not present in `base`;
 *   `UNSUPPORTED_TENANT_TYPE` — the path's type is outside `ALLOWED_TENANT_TYPES`
 *   (`shadow`/`gradient`/`cubicBezier` — forbidden in v1 tenant patches, P-D70);
 *   `UNSAFE_CSS_TOKEN` — a value contains a rejected CSS metacharacter, comment marker or
 *   `url` substring (stored-XSS / CSS-injection guard, H3 И1);
 *   `BAD_VALUE` — a value does not match its type's grammar.
 * @example
 * ```ts
 * const { vars, css } = applyThemePatch(base, { color: { bg: { page: '#101014' } } })
 * css // ':root {\n  --color-bg-page: #101014;\n}\n'
 * ```
 */
export function applyThemePatch(
  base: ResolvedTheme,
  patch: TokenTreeInput,
  opts: ApplyPatchOptions = {},
): ApplyPatchResult {
  const { selector = ':root', layer = false } = opts
  assertSafeCssToken(selector, 'selector')
  if (layer !== false) assertSafeCssToken(layer, 'layer')

  const tokensByPath = indexTokensByPath(base)
  const touched = new Map<CssVarName, string>()

  for (const { path, value } of walkTree(patch)) {
    for (const segment of path) {
      if (UNSAFE_KEYS.has(segment)) {
        throw new ThemeonError(
          'UNSAFE_PATH',
          `Tenant patch path segment "${segment}" is reserved and not allowed (path: ${path.join('.')})`,
        )
      }
    }

    const matches = tokensByPath.get(pathKey(path))
    if (matches === undefined || matches.length === 0) {
      throw new ThemeonError('UNKNOWN_PATH', `Tenant patch references unknown path "${path.join('.')}"`)
    }

    const type = matches[0]!.type
    if (!ALLOWED_TENANT_TYPES.has(type)) {
      throw new ThemeonError(
        'UNSUPPORTED_TENANT_TYPE',
        `Tenant patch touches path "${path.join('.')}" of type "${type}", not allowed in v1 ` +
          `(allowed: ${[...ALLOWED_TENANT_TYPES].join(', ')})`,
      )
    }

    if (type === 'text') {
      const styled = validateTenantTextValue(value)
      const sizeToken = matches.find((t) => !t.varName.endsWith('--line-height'))
      if (sizeToken === undefined) {
        throw new ThemeonError('UNKNOWN_PATH', `Tenant patch path "${path.join('.')}" has no size variable in base`)
      }
      touched.set(sizeToken.varName, styled.size)
      if (styled.lineHeight !== undefined) {
        const lineHeightToken = matches.find((t) => t.varName.endsWith('--line-height'))
        if (lineHeightToken === undefined) {
          throw new ThemeonError(
            'UNKNOWN_PATH',
            `Tenant patch sets "lineHeight" for "${path.join('.')}" but base has no line-height companion variable`,
          )
        }
        touched.set(lineHeightToken.varName, styled.lineHeight)
      }
      continue
    }

    // Не-text тип резолвится ровно в одну переменную по построению резолвера (P1.4
    // `claim()`): два токена с тем же путём и разными varName значили бы NAME_COLLISION
    // раньше, до того как патч сюда попал.
    const normalized = validateTenantValue(type, value)
    touched.set(matches[0]!.varName, normalized)
  }

  // Детерминированный порядок вывода = порядок `base.tokens`, НЕ порядок ключей патча/JSON (D14).
  const vars: Record<string, string> = {}
  for (const token of base.tokens) {
    if (touched.has(token.varName)) vars[token.varName] = touched.get(token.varName)!
  }

  const varsFrozen = Object.freeze(vars) as Readonly<Record<CssVarName, string>>
  return { vars: varsFrozen, css: serializeVars(varsFrozen, selector, layer) }
}

/**
 * `.css`-обёртка над {@link applyThemePatch} (contract name, D15) — тот же validation pass,
 * возвращает только `.css`. Прямая интеграция: caller инжектит результат в `<style nonce="…">`
 * элемент, который сам создаёт и владеет (nonce/CSP — забота caller'а, не этой функции).
 *
 * @example
 * ```ts
 * const css = serializeThemePatch(base, { color: { bg: { page: '#101014' } } })
 * // ':root {\n  --color-bg-page: #101014;\n}\n'
 * ```
 */
export function serializeThemePatch(
  base: ResolvedTheme,
  patch: TokenTreeInput,
  opts: SerializePatchOptions = {},
): string {
  return applyThemePatch(base, patch, opts).css
}
