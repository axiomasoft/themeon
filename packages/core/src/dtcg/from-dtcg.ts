/**
 * Импорт DTCG Format 2025.10 → модель ThemeOn (P1.7).
 *
 * `fromDTCG(files)` принимает одиночный документ или multi-file пачку и строит
 * `ThemeDefinition` (через публичный `defineTheme` — никакой второй логики оборачивания)
 * плюс `warnings[]` (по одной записи на находку: неподдержанный `$type`/`$ref`/поле,
 * `$extensions`, нерезолвнутый алиас). Обе формы значений (структурная и legacy-строка),
 * curly-brace алиасы и `$type`-наследование по группам поддержаны; `$root`/`$extends`/
 * property-level `$ref` — вне скоупа v1 (P-D15), фиксируются в warnings.
 *
 * Алиасы резолвятся в РЕАЛЬНЫЕ Token-ссылки через два прохода `defineTheme`: сначала база
 * без алиасов (даёт Token-цели), затем полная база, где alias-лист = Token-цель. Иначе
 * `"{color.forest.600}"` был бы обёрнут как обычная строка, а не ссылка (var-chain потерян).
 *
 * VERIFY-метки R-11 §1 закрыты по https://www.designtokens.org/TR/2025.10/format/ (2026-07-12):
 *  - `$ref` JSON Pointer (RFC 6901) — спека MUST-support, `{ "$ref": "#/…/$value" }` эквивалентно
 *    curly-brace; здесь поддержан import-only на указатели вида `#/a/b/$value` (весь `$value`),
 *    property-level (`…/$value/value`) — вне скоупа v1 → warning;
 *  - `$root` (зарезервированное имя root-токена группы) и `$extends` (наследование групп) —
 *    оба РЕАЛЬНО существуют в спеке (perplexity в R-11 не экстраполировал); в скоуп v1 не входят
 *    (P-D15) → warning, R-11 править не нужно;
 *  - `$type` наследуется вниз по группам (spec: «inherited from the closest parent group») —
 *    реализовано в walkDTCG параметром inheritedType.
 */

import { defineTheme } from '../define'
import { walkTree } from '../internal/walk'
import { isToken } from '../types'
import { formatColor } from './color'
import { setByPath } from './to-dtcg'
import type { DTCGColorValue, DTCGDimensionValue, DTCGDocument } from './types'
import type { SysPatch, SysTreeInput, TextStyleValue, ThemeDefinition, Token, TokenTreeInput } from '../types'

/** Результат импорта: рантайм-`ThemeDefinition` + отчёт о потерях/неподдержанном. */
export interface FromDTCGResult {
  definition: ThemeDefinition
  warnings: string[]
}

/** Разобранный лист DTCG-документа: конкретное значение либо алиас на путь другого токена. */
interface LeafEntry {
  path: string[]
  kind: 'value' | 'alias'
  value?: string | number | TextStyleValue
  aliasPath?: string
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Curly-brace алиас: `{group.token}` целиком (без вложенных скобок). */
function curlyInner(s: string): string | null {
  const t = s.trim()
  return /^\{[^{}]+\}$/.test(t) ? t.slice(1, -1) : null
}

/** JSON Pointer `#/a/b/$value` → dotted-путь токена `a.b` (только указатели на весь `$value`). */
function pointerToPath(ref: string): string | null {
  if (!ref.startsWith('#/')) return null
  const segs = ref
    .slice(2)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
  if (segs[segs.length - 1] !== '$value') return null
  return segs.slice(0, -1).join('.')
}

/** DTCG `$value` (структурная форма или строка) → значение ThemeOn по `$type`. */
function dtcgValueToRaw(
  type: string | undefined,
  $value: unknown,
  path: string[],
  warnings: string[],
): string | number | TextStyleValue | undefined {
  const where = path.join('.')
  switch (type) {
    case 'color':
      if (typeof $value === 'object' && $value !== null && Object.hasOwn($value, 'colorSpace')) {
        return formatColor($value as DTCGColorValue)
      }
      if (typeof $value === 'string') return $value
      warnings.push(`color token "${where}" has an unrecognized $value, skipped`)
      return undefined
    case 'dimension':
    case 'duration':
      if (typeof $value === 'object' && $value !== null && Object.hasOwn($value, 'value')) {
        const d = $value as DTCGDimensionValue
        return `${d.value}${d.unit}`
      }
      if (typeof $value === 'string') return $value
      warnings.push(`${type} token "${where}" has an unrecognized $value, skipped`)
      return undefined
    case 'number':
      if (typeof $value === 'number') return $value
      if (typeof $value === 'string' && !Number.isNaN(Number($value))) return Number($value)
      warnings.push(`number token "${where}" has a non-numeric $value, skipped`)
      return undefined
    case 'fontFamily':
      if (Array.isArray($value)) return $value.join(', ')
      if (typeof $value === 'string') return $value
      warnings.push(`fontFamily token "${where}" has an unrecognized $value, skipped`)
      return undefined
    case 'fontWeight':
      if (typeof $value === 'number' || typeof $value === 'string') return $value
      warnings.push(`fontWeight token "${where}" has an unrecognized $value, skipped`)
      return undefined
    case 'cubicBezier':
      if (Array.isArray($value) && $value.length === 4) return `cubic-bezier(${$value.join(', ')})`
      if (typeof $value === 'string') return $value
      warnings.push(`cubicBezier token "${where}" has an unrecognized $value, skipped`)
      return undefined
    case 'typography':
      return typographyToText($value, path, warnings)
    case 'shadow':
    case 'gradient':
      if (typeof $value === 'string') return $value
      warnings.push(`composite ${type} token "${where}" is not supported structurally (v1), skipped`)
      return undefined
    default:
      // Нет $type или незнакомый: примитивы пропускаем как есть (defineTheme выведет тип по
      // группе/значению), структурные объекты без известного типа — предупреждаем и пропускаем.
      if (typeof $value === 'string' || typeof $value === 'number') return $value
      warnings.push(`token "${where}" has unsupported $type "${type ?? '(none)'}", skipped`)
      return undefined
  }
}

/** DTCG `typography` → `TextStyleValue`; поля сверх `fontSize`/`lineHeight` → warnings. */
function typographyToText(
  $value: unknown,
  path: string[],
  warnings: string[],
): TextStyleValue | undefined {
  const where = path.join('.')
  if (typeof $value !== 'object' || $value === null) {
    warnings.push(`typography token "${where}" has an unrecognized $value, skipped`)
    return undefined
  }
  const v = $value as Record<string, unknown>
  const fs = v.fontSize
  let size: string | undefined
  if (typeof fs === 'object' && fs !== null && Object.hasOwn(fs, 'value')) {
    const d = fs as DTCGDimensionValue
    size = `${d.value}${d.unit}`
  } else if (typeof fs === 'string') {
    size = fs
  }
  if (size === undefined) {
    warnings.push(`typography token "${where}" has no usable fontSize, skipped`)
    return undefined
  }
  const out: TextStyleValue = { size }
  if (typeof v.lineHeight === 'number' || typeof v.lineHeight === 'string') out.lineHeight = v.lineHeight
  for (const k of Object.keys(v)) {
    if (k !== 'fontSize' && k !== 'lineHeight') {
      warnings.push(`typography field "${k}" at "${where}" is not supported (only fontSize/lineHeight), ignored`)
    }
  }
  return out
}

/** Рекурсивно спускается по DTCG-документу, собирая листья; `$type` наследуется по группам. */
function walkDTCG(
  root: DTCGDocument,
  node: Record<string, unknown>,
  path: string[],
  inheritedType: string | undefined,
  entries: LeafEntry[],
  warnings: string[],
): void {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) {
      if (key === '$root') warnings.push(`$root token at "${path.join('.') || '(root)'}" is not supported (v1), skipped`)
      else if (key === '$extends') warnings.push(`$extends at "${path.join('.') || '(root)'}" is not supported (v1), ignored`)
      continue
    }
    if (UNSAFE_KEYS.has(key)) {
      warnings.push(`unsafe key "${key}" at "${path.join('.') || '(root)'}" skipped`)
      continue
    }
    if (typeof child !== 'object' || child === null) {
      warnings.push(`unexpected non-object at "${[...path, key].join('.')}", skipped`)
      continue
    }
    const c = child as Record<string, unknown>
    const here = [...path, key]
    if (Object.hasOwn(c, '$value')) {
      handleToken(root, here, typeof c.$type === 'string' ? c.$type : inheritedType, c, entries, warnings)
    } else {
      walkDTCG(root, c, here, typeof c.$type === 'string' ? c.$type : inheritedType, entries, warnings)
    }
  }
}

/** Обрабатывает узел-токен: алиас (curly/`$ref`) или конкретное значение. */
function handleToken(
  root: DTCGDocument,
  path: string[],
  type: string | undefined,
  node: Record<string, unknown>,
  entries: LeafEntry[],
  warnings: string[],
): void {
  if (node.$extensions !== undefined) {
    warnings.push(
      `token "${path.join('.')}" has $extensions which are not carried into the ThemeDefinition ` +
        `(the ThemeOn model has no $extensions slot); reported here for round-trip awareness`,
    )
  }
  const $value = node.$value

  const inner = typeof $value === 'string' ? curlyInner($value) : null
  if (inner !== null) {
    entries.push({ path, kind: 'alias', aliasPath: inner })
    return
  }
  if (typeof $value === 'object' && $value !== null && Object.hasOwn($value, '$ref')) {
    const ref = ($value as { $ref: unknown }).$ref
    const target = typeof ref === 'string' ? pointerToPath(ref) : null
    if (target !== null) entries.push({ path, kind: 'alias', aliasPath: target })
    else warnings.push(`unsupported $ref "${String(ref)}" at "${path.join('.')}" (only "#/…/$value" pointers supported v1), skipped`)
    return
  }

  const raw = dtcgValueToRaw(type, $value, path, warnings)
  if (raw !== undefined) entries.push({ path, kind: 'value', value: raw })
}

/** Плоские листья → вложенное дерево ThemeOn; alias-лист = Token-цель из карты (иначе literal). */
function buildTree(
  entries: LeafEntry[],
  tokenByPath: Map<string, Token> | null,
  warnings: string[],
): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const e of entries) {
    let leaf: unknown
    if (e.kind === 'alias') {
      const target = tokenByPath?.get(e.aliasPath!)
      if (target) {
        leaf = target
      } else {
        warnings.push(`unresolved alias "{${e.aliasPath}}" at "${e.path.join('.')}", kept as literal string`)
        leaf = `{${e.aliasPath}}`
      }
    } else {
      leaf = e.value
    }
    setByPath(root, e.path, leaf)
  }
  return root
}

/** Плоская карта «dotted-путь → Token» из sys-дерева определения (цели для алиасов). */
function flattenTokens(def: ThemeDefinition): Map<string, Token> {
  const map = new Map<string, Token>()
  for (const { value } of walkTree(def.sys as unknown as TokenTreeInput)) {
    if (isToken(value)) map.set(value.path.join('.'), value)
  }
  return map
}

/** true, если вход — карта файлов (все ключи — имена `*.json`), а не одиночный документ. */
function isFileMap(files: DTCGDocument | Record<string, DTCGDocument>): boolean {
  const keys = Object.keys(files)
  return keys.length > 0 && keys.every((k) => k.endsWith('.json'))
}

/**
 * Imports a DTCG Format 2025.10 document (or a multi-file bundle) into a runtime
 * {@link ThemeDefinition} plus a `warnings` report. Both structural and legacy-string values are
 * accepted; curly-brace aliases and `$ref` pointers to whole `$value` nodes become real token
 * references; `$type` is inherited down groups. Unsupported constructs (`$root`, `$extends`,
 * property-level `$ref`, unknown `$type`, `$extensions`) are collected in `warnings` (scope v1,
 * P-D15). Types for the returned definition are the consumer's own concern (import is untyped).
 *
 * @param files a single DTCG document or a map of `<name>.json → document`
 */
export function fromDTCG(files: DTCGDocument | Record<string, DTCGDocument>): FromDTCGResult {
  const warnings: string[] = []

  let baseDoc: DTCGDocument = {}
  const themeDocs: Record<string, DTCGDocument> = {}
  if (isFileMap(files)) {
    const map = files as Record<string, DTCGDocument>
    baseDoc = map['base.tokens.json'] ?? {}
    for (const [k, v] of Object.entries(map)) {
      if (k === 'base.tokens.json' || k === 'themeon.resolver.json') continue
      if (k.endsWith('.tokens.json')) themeDocs[k.replace(/\.tokens\.json$/, '')] = v
    }
  } else {
    baseDoc = files as DTCGDocument
  }

  // ── База: разобрать → построить value-only дерево → 1-й defineTheme (цели алиасов) ──
  const baseEntries: LeafEntry[] = []
  walkDTCG(baseDoc, baseDoc, [], undefined, baseEntries, warnings)
  const basePathSet = new Set(baseEntries.map((e) => e.path.join('.')))
  const valueOnlyBase = buildTree(baseEntries.filter((e) => e.kind === 'value'), null, warnings)
  const defA = defineTheme({ base: valueOnlyBase as SysTreeInput })
  const tokenByPath = flattenTokens(defA)

  // ── Полная база: alias-листья = Token-цели ──
  const fullBase = buildTree(baseEntries, tokenByPath, warnings)

  // ── Темы: только пути, существующие в базе (иначе defineTheme бросил бы UNKNOWN_PATH) ──
  const themes: Record<string, unknown> = {}
  for (const [name, doc] of Object.entries(themeDocs)) {
    const tEntries: LeafEntry[] = []
    walkDTCG(doc, doc, [], undefined, tEntries, warnings)
    const kept = tEntries.filter((e) => {
      if (basePathSet.has(e.path.join('.'))) return true
      warnings.push(`theme "${name}" patches unknown base path "${e.path.join('.')}", skipped`)
      return false
    })
    themes[name] = buildTree(kept, tokenByPath, warnings)
  }

  const definition = defineTheme({
    base: fullBase as SysTreeInput,
    themes: themes as Record<string, SysPatch<SysTreeInput>>,
  })
  return { definition, warnings }
}
