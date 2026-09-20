/**
 * Tenant-патч (P6.1, H3 И1 — фикс подтверждённой дизайн-дыры класса stored-XSS,
 * `90_audit/FINAL_AUDIT_2026-07-12.md`): `applyThemePatch` валидирует sys-патч тенанта по
 * per-TokenType allowlist-грамматике (`patch-grammar.ts`, ЕДИНСТВЕННЫЙ источник) и отдаёт
 * И словарь переменных, И готовый CSS-текст из ОДНОГО прохода валидации — `serializeThemePatch`
 * лишь берёт `.css`. Ни одна функция здесь НЕ трогает `serializeThemeCss` (build-канал,
 * заморожен, P1.5) — tenant-путь инъекции статики в `<head>` отдельная функция намеренно
 * (Scope Excluded item'а).
 *
 * P0.3: hostile JSON is rejected against {@link TENANT_PATCH_POLICIES} *before* deep
 * recursion or expensive graph work. Default trust is `branding`; `trusted` is opt-in.
 *
 * `serializeThemePatch` возвращает ТОЛЬКО декларации внутри селектора, НИКОГДА не
 * `<style>`-тег: caller владеет элементом стиля и CSP-nonce (pre-mortem путь 4, Phase Context).
 */

import { ThemeonError } from './errors'
import { isToken } from './types'
import { assertSafeCssToken } from './serialize'
import { ALLOWED_TENANT_TYPES, validateTenantTextValue, validateTenantValue } from './patch-grammar'
import {
  DEFAULT_TENANT_TRUST,
  inspectPatchPath,
  inspectPatchValue,
  isReservedPatchKey,
  isSafePatchKey,
  resolveTenantPatchPolicy,
  type TenantPatchPolicy,
  type TenantTrustLevel,
} from './patch-policy'
import type { CssVarName, ResolvedTheme, ResolvedToken, Token, TokenTreeInput } from './types'

const TEXT_STYLE_KEYS = new Set(['size', 'lineHeight'])

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
  /**
   * Trust policy. Default {@link DEFAULT_TENANT_TRUST} (`branding`). `trusted` is never implied.
   */
  policy?: TenantTrustLevel
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

interface PatchLeaf {
  readonly path: string[]
  readonly value: unknown
}

function pathKey(path: readonly string[]): string {
  return JSON.stringify(path)
}

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

function serializeVars(vars: Readonly<Record<string, string>>, selector: string, layer: string | false): string {
  const indent = layer !== false ? '  ' : ''
  const lines = Object.entries(vars).map(([name, value]) => `${indent}  ${name}: ${value};`)
  const block = `${indent}${selector} {\n${lines.join('\n')}\n${indent}}`
  return layer !== false ? `@layer ${layer} {\n${block}\n}\n` : `${block}\n`
}

function isTextComposite(value: unknown): value is { size: string; lineHeight?: unknown } {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isToken(value)) return false
  if (typeof (value as { size?: unknown }).size !== 'string') return false
  return Object.keys(value).every((key) => TEXT_STYLE_KEYS.has(key))
}

function rejectLimit(path: readonly string[], hint: string): never {
  throw new ThemeonError('PATCH_LIMIT', 'Tenant patch exceeds the selected trust bounds', { path, hint })
}

function rejectUnicode(path: readonly string[], hint: string): never {
  throw new ThemeonError('PATCH_UNICODE', 'Tenant patch contains a disallowed Unicode sequence', { path, hint })
}

function assertValueSafe(raw: string, path: readonly string[], policy: TenantPatchPolicy): void {
  const verdict = inspectPatchValue(raw, policy.bounds)
  if (verdict.ok) return
  if (verdict.reason === 'length') {
    rejectLimit(path, `Shorten the value or select a higher trust policy (max ${policy.bounds.maxValueLength} characters)`)
  }
  if (verdict.reason === 'surrogate') {
    rejectUnicode(path, 'Replace invalid UTF-16 surrogates with well-formed text')
  }
  rejectUnicode(path, 'Remove Unicode control and bidi-override characters from tenant values')
}

function assertKeySafe(key: string, path: readonly string[], policy: TenantPatchPolicy): void {
  if (isReservedPatchKey(key)) {
    throw new ThemeonError(
      'UNSAFE_PATH',
      'Tenant patch path segment is reserved and not allowed',
      { path: [...path, key], hint: 'Remove __proto__, constructor and prototype keys from tenant JSON' },
    )
  }
  if (!isSafePatchKey(key, policy.bounds)) {
    const verdict = inspectPatchValue(key, { ...policy.bounds, maxValueLength: policy.bounds.maxKeyLength })
    if (verdict.ok === false && verdict.reason === 'surrogate') {
      rejectUnicode(path, 'Replace invalid UTF-16 surrogates in object keys')
    }
    if (verdict.ok === false && verdict.reason === 'unicode') {
      rejectUnicode(path, 'Remove Unicode control characters from object keys')
    }
    if (key.length > policy.bounds.maxKeyLength) {
      rejectLimit(path, `Shorten the object key (max ${policy.bounds.maxKeyLength} characters)`)
    }
    throw new ThemeonError(
      'BAD_VALUE',
      'Tenant patch object key is not in the allowed alphabet',
      { path: [...path, key], hint: 'Use keys matching [A-Za-z0-9_-]{1,64}' },
    )
  }
}

/**
 * Iterative envelope: depth, key budget, reserved keys, Unicode and value length.
 * Aborts at the first violation so a hostile tree cannot blow the stack or the key counter.
 */
function collectPatchLeaves(patch: unknown, policy: TenantPatchPolicy): PatchLeaf[] {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new ThemeonError('BAD_VALUE', 'Tenant patch must be a JSON object', {
      hint: 'Send a plain object of token path groups, not an array or primitive',
    })
  }

  const leaves: PatchLeaf[] = []
  const stack: { node: object; path: string[]; depth: number }[] = [{ node: patch, path: [], depth: 0 }]
  let keys = 0

  while (stack.length > 0) {
    const current = stack.pop()!
    if (current.depth > policy.bounds.maxDepth) {
      rejectLimit(current.path, `Flatten the patch (max depth ${policy.bounds.maxDepth} for ${policy.trust})`)
    }

    for (const key of Object.getOwnPropertyNames(current.node)) {
      keys += 1
      if (keys > policy.bounds.maxKeys) {
        rejectLimit(current.path, `Reduce the number of keys (max ${policy.bounds.maxKeys} for ${policy.trust})`)
      }
      assertKeySafe(key, current.path, policy)

      const value = (current.node as Record<string, unknown>)[key]
      const childPath = [...current.path, key]

      if (isToken(value)) {
        if (!policy.allowTokenReferences) {
          throw new ThemeonError('PATCH_POLICY', 'Tenant patch must not supply token graph references', {
            path: childPath,
            hint: 'Send a literal value, or select the trusted policy for owner-authored references',
          })
        }
        leaves.push({ path: childPath, value })
        continue
      }

      if (isTextComposite(value)) {
        assertValueSafe(value.size, childPath, policy)
        if (value.lineHeight !== undefined) {
          const lineHeight = typeof value.lineHeight === 'number' ? String(value.lineHeight) : value.lineHeight
          if (typeof lineHeight === 'string') assertValueSafe(lineHeight, childPath, policy)
        }
        leaves.push({ path: childPath, value })
        continue
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (typeof value === 'boolean') {
          throw new ThemeonError('BAD_VALUE', 'Tenant patch values must be strings, numbers or text composites', {
            path: childPath,
            hint: 'Replace booleans with a typed token value',
          })
        }
        assertValueSafe(String(value), childPath, policy)
        leaves.push({ path: childPath, value })
        continue
      }

      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new ThemeonError('BAD_VALUE', 'Tenant patch nodes must be objects or typed leaves', {
          path: childPath,
          hint: 'Remove arrays, nulls and non-JSON token payloads',
        })
      }

      stack.push({ node: value, path: childPath, depth: current.depth + 1 })
    }
  }

  return leaves
}

function assertNoReferenceCycle(start: Token, path: readonly string[]): void {
  const seen = new Set<string>([pathKey(start.path)])
  let current: Token = start
  while (isToken(current.value)) {
    const next: Token = current.value
    const key = pathKey(next.path)
    if (seen.has(key)) {
      throw new ThemeonError('PATCH_CYCLE', 'Tenant patch introduced a token reference cycle', {
        path,
        hint: 'Break the reference loop before applying the patch',
      })
    }
    seen.add(key)
    current = next
  }
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
 *   `PATCH_LIMIT` — depth, key count or value length exceeds the selected trust bounds;
 *   `PATCH_UNICODE` — a key or value contains controls or a lone surrogate;
 *   `PATCH_POLICY` — the path is outside the selected trust policy;
 *   `PATCH_CYCLE` — a trusted token reference formed a cycle;
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
  const { selector = ':root', layer = false, policy: trust = DEFAULT_TENANT_TRUST } = opts
  const policy = resolveTenantPatchPolicy(trust)
  assertSafeCssToken(selector, 'selector')
  if (layer !== false) assertSafeCssToken(layer, 'layer')

  const leaves = collectPatchLeaves(patch, policy)
  const tokensByPath = indexTokensByPath(base)
  const touched = new Map<CssVarName, string>()

  for (const { path, value } of leaves) {
    const allowed = inspectPatchPath(path, policy)
    if (!allowed.ok) {
      const hint =
        allowed.reason === 'internal'
          ? 'Internal/private token paths are not patchable at this trust level'
          : allowed.reason === 'primitive'
            ? 'Primitive/palette paths stay owner-controlled unless policy is trusted'
            : 'branding allows semantic colors, fonts, radii and logos only; pass policy: "extended" or "trusted"'
      throw new ThemeonError('PATCH_POLICY', 'Tenant patch path is outside the selected trust policy', { path, hint })
    }

    let leaf: unknown = value
    if (isToken(leaf)) {
      assertNoReferenceCycle(leaf, path)
      let current: Token | unknown = leaf
      while (isToken(current)) current = current.value
      leaf = current
    }

    const matches = tokensByPath.get(pathKey(path))
    if (matches === undefined || matches.length === 0) {
      throw new ThemeonError('UNKNOWN_PATH', 'Tenant patch references an unknown path', {
        path,
        hint: 'Patch only paths that exist on the resolved base theme',
      })
    }

    const type = matches[0]!.type
    if (!ALLOWED_TENANT_TYPES.has(type)) {
      throw new ThemeonError(
        'UNSUPPORTED_TENANT_TYPE',
        'Tenant patch touches a token type that is not allowed',
        {
          path,
          hint: `Allowed types: ${[...ALLOWED_TENANT_TYPES].join(', ')}`,
        },
      )
    }

    if (type === 'text') {
      const styled = validateTenantTextValue(leaf)
      const sizeToken = matches.find((t) => !t.varName.endsWith('--line-height'))
      if (sizeToken === undefined) {
        throw new ThemeonError('UNKNOWN_PATH', 'Tenant patch path has no size variable in base', {
          path,
          hint: 'The base theme must expose the text size CSS variable',
        })
      }
      touched.set(sizeToken.varName, styled.size)
      if (styled.lineHeight !== undefined) {
        const lineHeightToken = matches.find((t) => t.varName.endsWith('--line-height'))
        if (lineHeightToken === undefined) {
          throw new ThemeonError(
            'UNKNOWN_PATH',
            'Tenant patch sets lineHeight but base has no line-height companion variable',
            { path, hint: 'Define a text token with a line-height companion in the base theme' },
          )
        }
        touched.set(lineHeightToken.varName, styled.lineHeight)
      }
      continue
    }

    const normalized = validateTenantValue(type, leaf)
    touched.set(matches[0]!.varName, normalized)
  }

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
