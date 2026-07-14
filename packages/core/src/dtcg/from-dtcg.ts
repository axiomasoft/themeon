/**
 * Импорт DTCG Format 2025.10 → модель ThemeOn (P1.7; канон multi-file/корневого `$type` —
 * P8.12 `findings/P8-dtcg-2025-10-canon.md` §7).
 *
 * `fromDTCG(files, opts?)` принимает одиночный документ или multi-file пачку и строит
 * `ThemeDefinition` (через публичный `defineTheme` — никакой второй логики оборачивания)
 * плюс `warnings[]` (по одной записи на находку: неподдержанный `$type`/`$ref`/поле,
 * `$extensions`, нерезолвнутый алиас). Обе формы значений (структурная и legacy-строка),
 * curly-brace алиасы и `$type`-наследование по группам (включая КОРЕНЬ документа, §6.1/§5.2.2)
 * поддержаны; `$root`/`$extends`/property-level `$ref` — вне скоупа v1 (P-D15), фиксируются в
 * warnings.
 *
 * Multi-file бандл: имена файлов НЕ нормативны (спека регламентирует только рекомендуемые
 * расширения, §4.2) — база/темы различаются в таком порядке: (а) resolver-документ в бандле
 * (детект по содержимому — `version === '2025.10'` + `sets`/`modifiers`, независимо от имени
 * файла) — единственный нормативный способ композиции (Resolver Module, S3); (б) явные опции
 * `opts.base`/`opts.themes`; (в) автодетект-эвристика: документ с наибольшим числом уникальных
 * путей — база, документ, чьи пути — подмножество путей базы — тема патча (имя = basename без
 * расширений); (г) `$themes.json`/`$metadata.json` (Tokens Studio) распознаются и пропускаются
 * явно, в базу как мусорные группы не попадают.
 *
 * Пустой результат импорта (ни одного токена) — НЕ тихая пустая тема: по умолчанию громкий
 * warning с диагнозом, `opts.onEmpty: 'error'` — `ThemeonError('DTCG_PARSE', …)`.
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
 *    реализовано в walkDTCG параметром inheritedType, включая КОРЕНЬ документа (P8.12: раньше
 *    `doc.$type` безусловно отбрасывался как `$`-ключ, ни разу не читаясь).
 */

import { defineTheme } from '../define'
import { walkTree } from '../internal/walk'
import { isToken } from '../types'
import { ThemeonError } from '../errors'
import { formatColor } from './color'
import { setByPath } from './to-dtcg'
import type { DTCGColorValue, DTCGDimensionValue, DTCGDocument } from './types'
import type { SysPatch, SysTreeInput, TextStyleValue, ThemeDefinition, Token, TokenTreeInput } from '../types'

/** Опции импорта DTCG. */
export interface FromDTCGOptions {
  /** Явное имя файла базы в бандле — пропускает автодетект (но НЕ resolver-документ, §7 (а)). */
  base?: string
  /** Явная карта «имя темы → имя файла бандла» — пропускает автодетект (но НЕ resolver-документ). */
  themes?: Record<string, string>
  /** Пустой результат импорта (ни одного токена): `'warn'` (деф.) — громкий warning с диагнозом; `'error'` — `ThemeonError('DTCG_PARSE', …)`. */
  onEmpty?: 'warn' | 'error'
}

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
      if (type === undefined) {
        // §5.2.2 MUST NOT: тип не угадывается по значению — токен без резолвимого $type
        // (ни свой, ни унаследованный от группы/корня) невалиден, а не «типизируется по форме».
        warnings.push(`token "${where}" has no resolvable $type (not set on the token nor inherited from a parent group, spec §5.2.2), skipped`)
        return undefined
      }
      // $type известен, но не реализован структурно (не DTCG-стандартный или вне скоупа v1):
      // примитивы пропускаем как есть, структурные объекты — предупреждаем и пропускаем.
      if (typeof $value === 'string' || typeof $value === 'number') return $value
      warnings.push(`token "${where}" has unsupported $type "${type}", skipped`)
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
      // §6.1: «A group is identified as a JSON object that does NOT contain a $value property.»
      // Обратное тоже нормативно: узел с $value — это токен, он НЕ может нести дочерние
      // токены/группы одновременно. Спека: «Tools MUST report this as an error.»
      const extraKeys = Object.keys(c).filter((k) => !k.startsWith('$'))
      if (extraKeys.length > 0) {
        throw new ThemeonError(
          'DTCG_PARSE',
          `token "${here.join('.') || '(root)'}" has "$value" alongside child key(s) ${extraKeys.join(', ')} — a token MUST NOT also be a group (spec §6.1)`,
        )
      }
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

/** Tokens Studio multi-file sync (S5): `$themes.json`/`$metadata.json` — не DTCG-токены. */
function isTokensStudioMetaFile(name: string): boolean {
  const base = name.split('/').pop() ?? name
  return base === '$themes.json' || base === '$metadata.json'
}

/** Детект resolver-документа по содержимому (§7 (а)), НЕ по имени файла (S3 §4.1.2/§4.1.4/§4.1.5). */
function isLikelyResolver(doc: DTCGDocument): boolean {
  const d = doc as Record<string, unknown>
  return d.version === '2025.10' && (typeof d.sets === 'object' || typeof d.modifiers === 'object')
}

/** Пути всех листьев-токенов документа (для эвристики «подмножество путей», без семантики типов). */
function collectLeafPaths(doc: DTCGDocument): Set<string> {
  const out = new Set<string>()
  const walk = (node: Record<string, unknown>, path: string[]): void => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || UNSAFE_KEYS.has(key)) continue
      if (typeof child !== 'object' || child === null) continue
      const c = child as Record<string, unknown>
      const here = [...path, key]
      if (Object.hasOwn(c, '$value')) out.add(here.join('.'))
      else walk(c, here)
    }
  }
  walk(doc, [])
  return out
}

/** Рекурсивный merge двух DTCG-документов (resolver `sets`/`contexts` могут ссылаться на несколько файлов). */
function deepMergeDocs(a: DTCGDocument, b: DTCGDocument): DTCGDocument {
  const out: Record<string, unknown> = { ...a }
  for (const [k, v] of Object.entries(b)) {
    const existing = out[k]
    const bothPlainGroups =
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !Object.hasOwn(v, '$value') &&
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      !Object.hasOwn(existing as object, '$value')
    out[k] = bothPlainGroups ? deepMergeDocs(existing as DTCGDocument, v as DTCGDocument) : v
  }
  return out
}

/** Резолвит `{ $ref: './name.json' }` в документ бандла; отсутствующая цель — ERROR (S3 §4.1.6). */
function resolveRefDoc(
  src: unknown,
  files: Record<string, DTCGDocument>,
  resolverName: string,
  warnings: string[],
): DTCGDocument {
  const ref = (src as { $ref?: unknown } | null)?.$ref
  if (typeof ref !== 'string') {
    warnings.push(`resolver "${resolverName}" has a non-"$ref" source (inline sets are out of scope, v1), skipped`)
    return {}
  }
  const name = ref.replace(/^\.\//, '')
  const doc = files[name]
  if (!doc) {
    throw new ThemeonError('DTCG_PARSE', `resolver "${resolverName}" references "${ref}" which does not resolve to a bundle file`)
  }
  return doc
}

/** (а) Резолвер-документ (§7): `sets[*].sources` → база; первый modifier `.contexts[ctx]` → тема `ctx`. */
function resolveFromResolverDoc(
  resolver: DTCGDocument,
  resolverName: string,
  files: Record<string, DTCGDocument>,
  warnings: string[],
): { baseDoc: DTCGDocument; themeDocs: Record<string, DTCGDocument> } {
  const d = resolver as Record<string, unknown>

  let baseDoc: DTCGDocument = {}
  if (d.sets && typeof d.sets === 'object') {
    for (const setDef of Object.values(d.sets as Record<string, unknown>)) {
      const sources = (setDef as { sources?: unknown } | null)?.sources
      if (!Array.isArray(sources)) continue
      for (const src of sources) baseDoc = deepMergeDocs(baseDoc, resolveRefDoc(src, files, resolverName, warnings))
    }
  }

  const themeDocs: Record<string, DTCGDocument> = {}
  if (d.modifiers && typeof d.modifiers === 'object') {
    const modNames = Object.keys(d.modifiers as Record<string, unknown>)
    if (modNames.length > 1) {
      warnings.push(
        `resolver "${resolverName}" has ${modNames.length} modifiers, only "${modNames[0]}" is used ` +
          `(resolver features beyond sets+1 modifier are ignored, out of scope v1)`,
      )
    }
    const modifier = (d.modifiers as Record<string, unknown>)[modNames[0]!] as { contexts?: unknown } | undefined
    const contexts = modifier?.contexts
    if (contexts && typeof contexts === 'object') {
      for (const [ctxName, sources] of Object.entries(contexts as Record<string, unknown>)) {
        if (!Array.isArray(sources) || sources.length === 0) continue // base-only sentinel context (P8.11 pickResolverDefaultKey), не тема
        let ctxDoc: DTCGDocument = {}
        for (const src of sources) ctxDoc = deepMergeDocs(ctxDoc, resolveRefDoc(src, files, resolverName, warnings))
        themeDocs[ctxName] = ctxDoc
      }
    }
  }

  return { baseDoc, themeDocs }
}

/** (б) Явные опции: `opts.base`/`opts.themes` — детерминированный ручной контракт. */
function resolveFromExplicitOptions(
  candidates: Record<string, DTCGDocument>,
  opts: FromDTCGOptions,
  warnings: string[],
): { baseDoc: DTCGDocument; themeDocs: Record<string, DTCGDocument> } {
  let baseDoc: DTCGDocument = {}
  if (opts.base !== undefined) {
    const doc = candidates[opts.base]
    if (!doc) warnings.push(`opts.base "${opts.base}" not found in bundle, using an empty base`)
    else baseDoc = doc
  }
  const themeDocs: Record<string, DTCGDocument> = {}
  if (opts.themes) {
    for (const [themeName, fileName] of Object.entries(opts.themes)) {
      const doc = candidates[fileName]
      if (!doc) {
        warnings.push(`opts.themes["${themeName}"] file "${fileName}" not found in bundle, skipped`)
        continue
      }
      themeDocs[themeName] = doc
    }
  }
  return { baseDoc, themeDocs }
}

/** (в) Автодетект-эвристика: наибольшее число уникальных путей — база; подмножество путей базы — тема. */
function resolveByHeuristic(
  candidates: Record<string, DTCGDocument>,
  warnings: string[],
): { baseDoc: DTCGDocument; themeDocs: Record<string, DTCGDocument> } {
  const names = Object.keys(candidates)
  if (names.length === 0) return { baseDoc: {}, themeDocs: {} }
  if (names.length === 1) return { baseDoc: candidates[names[0]!]!, themeDocs: {} }

  const pathSets = new Map<string, Set<string>>()
  for (const name of names) pathSets.set(name, collectLeafPaths(candidates[name]!))

  let baseName = names[0]!
  let baseSize = pathSets.get(baseName)!.size
  for (const name of names.slice(1)) {
    const size = pathSets.get(name)!.size
    if (size > baseSize) {
      baseName = name
      baseSize = size
    }
  }
  const basePaths = pathSets.get(baseName)!

  const themeDocs: Record<string, DTCGDocument> = {}
  for (const name of names) {
    if (name === baseName) continue
    const paths = pathSets.get(name)!
    if (paths.size === 0) {
      warnings.push(`bundle file "${name}" has no recognizable tokens, skipped`)
      continue
    }
    let isSubset = true
    for (const p of paths) {
      if (!basePaths.has(p)) {
        isSubset = false
        break
      }
    }
    if (isSubset) {
      const themeName = name.replace(/\.tokens\.json$/, '').replace(/\.json$/, '')
      themeDocs[themeName] = candidates[name]!
    } else {
      warnings.push(`bundle file "${name}" is neither the base (fewer unique paths than "${baseName}") nor a strict patch of it, skipped`)
    }
  }
  return { baseDoc: candidates[baseName]!, themeDocs }
}

/** Различает базу/темы в multi-file бандле по канону §7: resolver → явные опции → эвристика. */
function resolveBundle(
  files: Record<string, DTCGDocument>,
  opts: FromDTCGOptions,
  warnings: string[],
): { baseDoc: DTCGDocument; themeDocs: Record<string, DTCGDocument> } {
  const candidates: Record<string, DTCGDocument> = {}
  for (const [name, doc] of Object.entries(files)) {
    if (isTokensStudioMetaFile(name)) continue // (г): распознаны и пропущены, в базу не попадают
    candidates[name] = doc
  }

  const resolverEntries = Object.entries(candidates).filter(([, doc]) => isLikelyResolver(doc))
  if (resolverEntries.length > 0) {
    if (resolverEntries.length > 1) {
      warnings.push(`bundle has ${resolverEntries.length} resolver-like documents, using "${resolverEntries[0]![0]}" and ignoring the rest`)
    }
    const [resolverName, resolver] = resolverEntries[0]!
    const rest: Record<string, DTCGDocument> = {}
    for (const [name, doc] of Object.entries(candidates)) if (name !== resolverName) rest[name] = doc
    return resolveFromResolverDoc(resolver, resolverName, rest, warnings)
  }

  if (opts.base !== undefined || opts.themes !== undefined) return resolveFromExplicitOptions(candidates, opts, warnings)

  return resolveByHeuristic(candidates, warnings)
}

/**
 * Imports a DTCG Format 2025.10 document (or a multi-file bundle) into a runtime
 * {@link ThemeDefinition} plus a `warnings` report. Both structural and legacy-string values are
 * accepted; curly-brace aliases and `$ref` pointers to whole `$value` nodes become real token
 * references; `$type` is inherited down groups, including the document ROOT (spec §5.2.2/§6.1).
 * Bundle base/theme detection order: a resolver document present in the bundle (any filename) →
 * explicit `opts.base`/`opts.themes` → a subset-of-paths heuristic; Tokens Studio
 * `$themes.json`/`$metadata.json` are recognized and skipped. An import that yields zero tokens
 * is never silent: a loud warning by default, or `opts.onEmpty: 'error'` to throw. Unsupported
 * constructs (`$root`, `$extends`, property-level `$ref`, an unresolvable `$type`, `$extensions`)
 * are collected in `warnings` (scope v1, P-D15). Types for the returned definition are the
 * consumer's own concern (import is untyped).
 *
 * @param files a single DTCG document or a map of `<name>.json → document`
 * @param opts base/theme file selection and empty-result handling
 */
export function fromDTCG(files: DTCGDocument | Record<string, DTCGDocument>, opts: FromDTCGOptions = {}): FromDTCGResult {
  const warnings: string[] = []

  let baseDoc: DTCGDocument = {}
  let themeDocs: Record<string, DTCGDocument> = {}
  let fileCount = 1
  if (isFileMap(files)) {
    const map = files as Record<string, DTCGDocument>
    fileCount = Object.keys(map).length
    ;({ baseDoc, themeDocs } = resolveBundle(map, opts, warnings))
  } else {
    baseDoc = files as DTCGDocument
  }

  // ── База: разобрать → итеративно резолвить alias-цепочки ЛЮБОЙ глубины ──
  // Каждый раунд достраивает tokenByPath алиасами, чья цель уже стала известным Token (напр.
  // primitive→semantic→component); раунды повторяются, пока размер карты растёт — так
  // многошаговые цепочки сводятся к реальным Token-ссылкам, а не деградируют в первом же
  // непрямом алиасе до литеральной строки (P1.7 code-review HIGH: fromDTCG resolved only one
  // level of aliasing).
  const baseEntries: LeafEntry[] = []
  const baseRootType = typeof (baseDoc as Record<string, unknown>).$type === 'string' ? ((baseDoc as Record<string, unknown>).$type as string) : undefined
  walkDTCG(baseDoc, baseDoc, [], baseRootType, baseEntries, warnings)
  const basePathSet = new Set(baseEntries.map((e) => e.path.join('.')))
  let tokenByPath = new Map<string, Token>()
  let prevSize = -1
  while (tokenByPath.size !== prevSize) {
    prevSize = tokenByPath.size
    const resolvableEntries = baseEntries.filter(
      (e) => e.kind === 'value' || (e.kind === 'alias' && tokenByPath.has(e.aliasPath!)),
    )
    const partialBase = buildTree(resolvableEntries, tokenByPath, warnings)
    const defRound = defineTheme({ base: partialBase as SysTreeInput })
    tokenByPath = flattenTokens(defRound)
  }

  // ── Полная база: alias-листья = Token-цели ──
  const fullBase = buildTree(baseEntries, tokenByPath, warnings)

  // ── Темы: только пути, существующие в базе (иначе defineTheme бросил бы UNKNOWN_PATH) ──
  const themes: Record<string, unknown> = {}
  for (const [name, doc] of Object.entries(themeDocs)) {
    const tEntries: LeafEntry[] = []
    const themeRootType = typeof (doc as Record<string, unknown>).$type === 'string' ? ((doc as Record<string, unknown>).$type as string) : undefined
    walkDTCG(doc, doc, [], themeRootType, tEntries, warnings)
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

  // Fail-loud (§7.3): ни одного токена импортировано — не тихая пустая тема.
  if (flattenTokens(definition).size === 0) {
    const msg = `0 tokens parsed from ${fileCount} file(s): none matched base/theme detection`
    if (opts.onEmpty === 'error') throw new ThemeonError('DTCG_PARSE', msg)
    warnings.push(msg)
  }

  return { definition, warnings }
}
