/**
 * Экспорт модели ThemeOn в DTCG Format Module 2025.10 (P1.7; каноны — P8.11
 * `findings/P8-dtcg-2025-10-canon.md`).
 *
 * `toDTCG(def)` отдаёт multi-file пачку: `base.tokens.json` (базовый sys-слой + все
 * ref-токены, на которые он ссылается — иначе curly-brace алиасы не резолвятся),
 * `<theme>.tokens.json` на каждый патч темы и опциональный `themeon.resolver.json`
 * (Resolver Module 2025.10). Скоуп v1 — P-D15, ремедиация P8.11:
 *  - примитивы (`color`/`dimension`/…) — структурная форма; непредставимое (единица вне
 *    px/rem, непарсибельный цвет, неизвестная easing-кривая) НЕ эмитится тихой строкой —
 *    пропускается, уходит в `warnings` и в мост `$extensions["com.themeon"].unrepresentable`
 *    на корне документа (findings §3.2, §6 находки P8.11);
 *  - `text` эмитится ТОЛЬКО примитивами (`fontSize`/`lineHeight`), не `typography` — модель
 *    ThemeOn не несёт `fontFamily`/`fontWeight`/`letterSpacing`, которые требует §9.8 (Scope
 *    Excluded: расширение авторской модели `text`); оригинальный композит бридж-ится тем же
 *    мостом для лоссless-восстановления при импорте (P8.12);
 *  - `shadow`/`gradient` не эмитятся вовсе (структурного эмита в v1 нет, P-D60) — только мост;
 *  - сегменты пути с `.`/`{`/`}`/ведущим `$` экранируются (§5.1.1 MUST NOT) через ту же
 *    kebab-логику, что и naming-движок; оригинальный путь кладётся в `$extensions.path` на
 *    самом токене; коллизия эскейпа двух разных путей — `ThemeonError('DTCG_NAME_COLLISION')`;
 *  - `themeon.resolver.json`: modifier `theme` всегда получает синтетический base-only
 *    контекст (ключ `default`/`base`/`base-N` — первый не занятый темой) как `default`, что
 *    даёт ≥2 контекста без риска коллизии с именем темы (S3 §4.1.5.1 SHOULD, аудит #25).
 *
 * Обход дерева — единственный `walkTree` (правило фазы §6).
 */

import { walkTree } from '../internal/walk'
import { isToken } from '../types'
import { ThemeonError } from '../errors'
import { parseColor } from './color'
import type { DTCGDocument, DTCGToken } from './types'
import type { TextStyleValue, ThemeDefinition, Token, TokenTreeInput, TokenType } from '../types'

/** Опции эмита DTCG. */
export interface ToDTCGOptions {
  /** Эмитить темы отдельными файлами-патчами. Деф. `true`; `false` — только `base.tokens.json`. */
  splitThemes?: boolean
  /** Эмитить `themeon.resolver.json` (Resolver Module 2025.10). Деф. `true` (при наличии тем). */
  resolverFile?: boolean
}

/** Результат экспорта: карта «имя файла → DTCG-документ» + отчёт о потерях/деградациях. */
export interface DTCGExport {
  files: Record<string, DTCGDocument>
  /** Непредставимые значения, экранированные имена, пропущенные типы — по одной записи. */
  warnings: string[]
}

/** ThemeOn TokenType → DTCG `$type` (данные, не if-каскад). */
const TYPE_TO_DTCG: Readonly<Record<TokenType, string>> = {
  color: 'color',
  dimension: 'dimension',
  number: 'number',
  fontFamily: 'fontFamily',
  fontWeight: 'fontWeight',
  duration: 'duration',
  cubicBezier: 'cubicBezier',
  shadow: 'shadow',
  gradient: 'gradient',
  text: 'typography',
}

/** Сегменты пути, чья bracket-запись подменяет прототип/аксессор (prototype pollution, final-audit H2). */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Кладёт лист в DTCG-дерево по пути, создавая группы. Own-property через `defineProperty` +
 * гейт `UNSAFE_KEYS` — вход (пути токенов) в норме безопасен, но защита единообразна с ядром.
 */
export function setByPath(root: Record<string, unknown>, path: readonly string[], leaf: unknown): void {
  let node = root
  for (let i = 0; i < path.length; i++) {
    const key = path[i]!
    if (UNSAFE_KEYS.has(key)) {
      throw new ThemeonError('UNSAFE_PATH', `Token path segment "${key}" is reserved and not allowed (path: ${path.join('.')})`)
    }
    if (i === path.length - 1) {
      Object.defineProperty(node, key, { value: leaf, writable: true, enumerable: true, configurable: true })
      break
    }
    if (!Object.hasOwn(node, key)) {
      Object.defineProperty(node, key, { value: {}, writable: true, enumerable: true, configurable: true })
    }
    node = node[key] as Record<string, unknown>
  }
}

function splitDimension(s: string): { value: number; unit: string } | null {
  const m = /^(-?\d*\.?\d+)([a-z%]+)$/i.exec(s.trim())
  if (!m) return null
  return { value: Number(m[1]), unit: m[2]! }
}

/** `dimension` спеки 2025.10 (§8.2.1): unit ТОЛЬКО `px`/`rem`. Всё прочее — непредставимо. */
function toDTCGDimension(s: string): { value: number; unit: 'px' | 'rem' } | null {
  const parsed = splitDimension(s)
  if (!parsed || (parsed.unit !== 'px' && parsed.unit !== 'rem')) return null
  return { value: parsed.value, unit: parsed.unit }
}

function splitDuration(s: string): { value: number; unit: string } | null {
  const m = /^(-?\d*\.?\d+)(ms|s)$/i.exec(s.trim())
  if (!m) return null
  return { value: Number(m[1]), unit: m[2]! }
}

function splitCubicBezier(s: string): number[] | null {
  const m = /^cubic-bezier\(([^)]+)\)$/i.exec(s.trim())
  if (!m) return null
  const nums = m[1]!.split(',').map((p) => Number(p.trim()))
  if (nums.length !== 4 || nums.some(Number.isNaN)) return null
  return nums
}

/** Именованные CSS-кривые → точный bezier-эквивалент (findings #28, MUST — массив 4 чисел). */
const NAMED_EASINGS: Readonly<Record<string, number[]>> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
}

function toDTCGCubicBezier(s: string): number[] | null {
  return splitCubicBezier(s) ?? NAMED_EASINGS[s.trim().toLowerCase()] ?? null
}

type RawLeaf = string | number | TextStyleValue

/**
 * DTCG-имя не допускает `.`/`{`/`}` и не может начинаться с `$` (§5.1.1 MUST NOT). Экранирует
 * ТОЛЬКО «грязные» сегменты — той же разделительной логикой, что naming-движок
 * (`[._\s]+ → '-'`), поэтому DTCG-имя совпадает с CSS-сегментом («одно имя», findings §11).
 */
function escapeDTCGSegment(seg: string): string {
  if (!/[.{}]/.test(seg) && !seg.startsWith('$')) return seg
  const prefixed = seg.startsWith('$') ? `x${seg}` : seg
  return prefixed.replace(/[.{}\s]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
}

/**
 * ThemeOn-путь → DTCG-путь (по сегменту). Пишет обнаруженное соответствие в `pathMap`
 * (общий на весь экспорт — коллизия видна и между base/theme-файлами) и бросает
 * `DTCG_NAME_COLLISION`, если два РАЗНЫХ оригинальных пути экранируются в один и тот же
 * DTCG-путь (напр. `space['1.5']` и `space['1-5']` вместе — findings #11).
 */
function toDTCGPath(path: readonly string[], pathMap: Map<string, string>): string[] {
  const escaped = path.map(escapeDTCGSegment)
  const key = escaped.join('.')
  const original = path.join('.')
  const seen = pathMap.get(key)
  if (seen !== undefined && seen !== original) {
    throw new ThemeonError(
      'DTCG_NAME_COLLISION',
      `DTCG token names "${seen}" and "${original}" both escape to "${key}" — rename one of the tokens`,
    )
  }
  pathMap.set(key, original)
  return escaped
}

/** Помечает узел (токен ИЛИ группа) мостом на оригинальный путь — только если экранирование его изменило. */
function attachPathExtension(node: object, originalPath: readonly string[], dtcgPath: readonly string[]): void {
  if (originalPath.join('.') === dtcgPath.join('.')) return
  ;(node as Record<string, unknown>).$extensions = { 'com.themeon': { path: [...originalPath] } }
}

/** Аккумулятор непредставимых значений документа: DTCG-путь → `{type, value}` исходника. */
type Bridge = Record<string, { type: string; value: unknown }>

/** Ставит собранный мост непредставимого на корень документа (§3.2 находки), если он не пуст. */
function attachRootBridge(doc: DTCGDocument, bridge: Bridge): void {
  if (Object.keys(bridge).length === 0) return
  ;(doc as Record<string, unknown>).$extensions = { 'com.themeon': { unrepresentable: bridge } }
}

interface ValueResult {
  ok: boolean
  dtcgValue?: unknown
  original?: unknown
}

/** Примитивы (color/dimension/duration/number/fontFamily/fontWeight/cubicBezier) → DTCG `$value`. */
function toDTCGValue(type: TokenType, value: RawLeaf, where: string, warnings: string[]): ValueResult {
  switch (type) {
    case 'color': {
      if (typeof value !== 'string') return { ok: true, dtcgValue: value }
      const parsed = parseColor(value)
      if (parsed) return { ok: true, dtcgValue: parsed }
      warnings.push(`color token "${where}" is not representable as a DTCG structural value ("${value}"), skipped and bridged via $extensions`)
      return { ok: false, original: value }
    }
    case 'dimension': {
      if (typeof value !== 'string') return { ok: true, dtcgValue: value }
      const dim = toDTCGDimension(value)
      if (dim) return { ok: true, dtcgValue: dim }
      warnings.push(
        `dimension token "${where}" has a unit unsupported by DTCG (spec §8.2.1 — only px/rem; got "${value}"), skipped and bridged via $extensions`,
      )
      return { ok: false, original: value }
    }
    case 'duration':
      return { ok: true, dtcgValue: typeof value === 'string' ? (splitDuration(value) ?? value) : value }
    case 'number':
      return { ok: true, dtcgValue: typeof value === 'number' ? value : Number(value) }
    case 'fontFamily':
      // Стек «Inter, sans-serif» → массив имён (DTCG-форма); одиночное имя — строкой.
      return {
        ok: true,
        dtcgValue: typeof value === 'string' && value.includes(',') ? value.split(',').map((s) => s.trim()) : value,
      }
    case 'fontWeight':
      return { ok: true, dtcgValue: value } // число [1,1000] или строка ('bold') — как есть
    case 'cubicBezier': {
      if (typeof value !== 'string') return { ok: true, dtcgValue: value }
      const bezier = toDTCGCubicBezier(value)
      if (bezier) return { ok: true, dtcgValue: bezier }
      warnings.push(`cubicBezier token "${where}" is not a recognized easing ("${value}"), skipped and bridged via $extensions`)
      return { ok: false, original: value }
    }
    default:
      return { ok: true, dtcgValue: value }
  }
}

/**
 * `text` → примитивы `fontSize`(dimension)/`lineHeight`(number), НИКОГДА `typography`: §9.8
 * требует все 5 полей (`fontFamily`/`fontWeight`/`letterSpacing`/`fontSize`/`lineHeight`), а
 * `TextStyleValue` несёт только 2 — расширение модели вне скоупа (Scope Excluded, findings §8 Q1
 * вариант B). Оригинальный композит всегда уходит в мост (лоссless для импорта P8.12).
 */
function emitText(ts: TextStyleValue, where: string, warnings: string[], bridge: Bridge): Record<string, DTCGToken> | null {
  bridge[where] = { type: 'text', value: ts }
  const dim = toDTCGDimension(ts.size)
  if (!dim) {
    warnings.push(
      `text token "${where}" has a fontSize unit unsupported by DTCG dimension ("${ts.size}"), skipped and bridged via $extensions`,
    )
    return null
  }
  warnings.push(
    `text token "${where}" emitted as dimension/number primitives, not DTCG "typography" (spec §9.8 requires ` +
      `fontFamily/fontWeight/letterSpacing, out of scope for the ThemeOn text model); original composite bridged via $extensions`,
  )
  const group: Record<string, DTCGToken> = { fontSize: { $type: 'dimension', $value: dim } }
  if (ts.lineHeight !== undefined) {
    const lh = typeof ts.lineHeight === 'number' ? ts.lineHeight : Number(ts.lineHeight)
    if (!Number.isNaN(lh)) group.lineHeight = { $type: 'number', $value: lh }
  }
  return group
}

/**
 * Эмитит одно НЕ-ссылочное значение (`isToken(value)` уже отсечён вызывающим): токен, группу
 * примитивов (`text`) или `null` (непредставимо целиком — уже забриджено и провареновано).
 */
function emitLeaf(type: TokenType, value: RawLeaf, where: string, warnings: string[], bridge: Bridge): DTCGToken | Record<string, DTCGToken> | null {
  if (type === 'text') return emitText(value as TextStyleValue, where, warnings, bridge)
  if (type === 'shadow' || type === 'gradient') {
    warnings.push(
      `${type} token "${where}" has no DTCG structural form (v1 scope, P-D60), skipped and bridged via $extensions as a legacy string`,
    )
    bridge[where] = { type, value }
    return null
  }
  const result = toDTCGValue(type, value, where, warnings)
  if (!result.ok) {
    bridge[where] = { type, value: result.original }
    return null
  }
  return { $type: TYPE_TO_DTCG[type], $value: result.dtcgValue }
}

/** Эмитит один токен базы в документ; ссылку — curly-brace + постановка цели в очередь. */
function placeToken(
  doc: DTCGDocument,
  token: Token,
  emitted: Set<string>,
  refQueue: Token[],
  warnings: string[],
  bridge: Bridge,
  pathMap: Map<string, string>,
): void {
  const pk = token.path.join('.')
  if (emitted.has(pk)) return
  emitted.add(pk)
  const dtcgPath = toDTCGPath(token.path, pathMap)
  if (isToken(token.value)) {
    const targetPath = toDTCGPath(token.value.path, pathMap)
    const node: DTCGToken = { $type: TYPE_TO_DTCG[token.type], $value: `{${targetPath.join('.')}}` }
    attachPathExtension(node, token.path, dtcgPath)
    setByPath(doc as Record<string, unknown>, dtcgPath, node)
    refQueue.push(token.value)
    return
  }
  const node = emitLeaf(token.type, token.value as RawLeaf, pk, warnings, bridge)
  if (node === null) return
  attachPathExtension(node, token.path, dtcgPath)
  setByPath(doc as Record<string, unknown>, dtcgPath, node)
}

/** Первый незанятый темами ключ из `default`/`base`/`base-2`/… — синтетический base-only контекст (аудит #25). */
function pickResolverDefaultKey(themeNames: readonly string[]): string {
  const taken = new Set(themeNames)
  if (!taken.has('default')) return 'default'
  if (!taken.has('base')) return 'base'
  let i = 2
  while (taken.has(`base-${i}`)) i++
  return `base-${i}`
}

/**
 * Exports a {@link ThemeDefinition} to DTCG Format 2025.10 as a multi-file bundle: a base
 * document (`base.tokens.json`), one patch document per theme (`<theme>.tokens.json`) and an
 * optional resolver document (`themeon.resolver.json`, Resolver Module 2025.10). Primitives are
 * emitted in structural form; `text` is emitted as `fontSize`/`lineHeight` primitives (not
 * `typography` — the model has no `fontFamily`/`fontWeight`/`letterSpacing`); `shadow`/`gradient`
 * are not emitted at all (no structural form in v1). Anything unrepresentable is skipped, reported
 * in `warnings`, and bridged via a root-level `$extensions["com.themeon"].unrepresentable` map for
 * lossless round-tripping. Token references become curly-brace aliases and their targets are
 * included in the base document so aliases stay resolvable. Path segments containing `.`/`{`/`}`
 * or starting with `$` are escaped (DTCG §5.1.1); the original path is preserved via a per-token
 * `$extensions["com.themeon"].path`.
 *
 * @param def a theme definition produced by `defineTheme`
 * @param opts split-themes and resolver-file toggles
 * @example
 * ```ts
 * const { files, warnings } = toDTCG(theme)
 * files['base.tokens.json'] // DTCG document, ready for Terrazzo / Style Dictionary
 * ```
 */
export function toDTCG(def: ThemeDefinition, opts: ToDTCGOptions = {}): DTCGExport {
  const splitThemes = opts.splitThemes ?? true
  const sysTree = def.sys as unknown as TokenTreeInput
  const warnings: string[] = []
  const pathMap = new Map<string, string>()

  // ── base.tokens.json: sys-слой + транзитивно все ref-цели (иначе алиасы не резолвятся) ──
  const baseDoc: DTCGDocument = {}
  const baseBridge: Bridge = {}
  const emitted = new Set<string>()
  const refQueue: Token[] = []
  const baseTypeByPath = new Map<string, TokenType>()
  for (const { value } of walkTree(sysTree)) {
    if (!isToken(value)) continue
    baseTypeByPath.set(value.path.join('.'), value.type)
    placeToken(baseDoc, value, emitted, refQueue, warnings, baseBridge, pathMap)
  }
  while (refQueue.length > 0) {
    placeToken(baseDoc, refQueue.shift()!, emitted, refQueue, warnings, baseBridge, pathMap)
  }

  const files: Record<string, DTCGDocument> = { 'base.tokens.json': baseDoc }
  const themeNames = Object.keys(def.themes)

  // Тема с именем "base" эмитила бы в тот же файл, что base.tokens.json, молча затирая ВЕСЬ
  // sys-слой патчем темы (P8.11 review finding, fail-loud правило 4 — раньше падало тихо).
  if (themeNames.includes('base')) {
    throw new ThemeonError(
      'DTCG_NAME_COLLISION',
      'Theme name "base" collides with the reserved "base.tokens.json" filename — rename the theme',
    )
  }

  if (splitThemes) {
    // ── <theme>.tokens.json: только патченные пути ──
    for (const [name, patch] of Object.entries(def.themes)) {
      const themeDoc: DTCGDocument = {}
      const themeBridge: Bridge = {}
      for (const { path, value } of walkTree(patch as unknown as TokenTreeInput)) {
        const dtcgPath = toDTCGPath(path, pathMap)
        if (isToken(value)) {
          const targetPath = toDTCGPath(value.path, pathMap)
          const node: DTCGToken = { $type: TYPE_TO_DTCG[value.type], $value: `{${targetPath.join('.')}}` }
          attachPathExtension(node, path, dtcgPath)
          setByPath(themeDoc as Record<string, unknown>, dtcgPath, node)
          // Цель ссылки должна попасть в base.tokens.json, иначе алиас — dangling curly-brace
          // (P1.7 code-review HIGH): темы могут ссылаться на sys-токены, которых сама база не
          // обходит напрямую (напр. palette-токен вне дерева def.sys).
          refQueue.push(value)
          continue
        }
        const type = baseTypeByPath.get(path.join('.')) ?? 'dimension'
        const node = emitLeaf(type, value as RawLeaf, path.join('.'), warnings, themeBridge)
        if (node === null) continue
        attachPathExtension(node, path, dtcgPath)
        setByPath(themeDoc as Record<string, unknown>, dtcgPath, node)
      }
      attachRootBridge(themeDoc, themeBridge)
      files[`${name}.tokens.json`] = themeDoc
    }
    // ── Дренируем ref-цели, обнаруженные при обходе тем, в base.tokens.json ──
    while (refQueue.length > 0) {
      placeToken(baseDoc, refQueue.shift()!, emitted, refQueue, warnings, baseBridge, pathMap)
    }

    // ── themeon.resolver.json: modifier получает синтетический base-only контекст как default
    //    (Resolver Module §4.1.5.1 SHOULD ≥2 контекста, аудит #25 — жёсткий ключ 'light' терял
    //    контекст при одноимённой теме) ──
    if ((opts.resolverFile ?? true) && themeNames.length > 0) {
      const contexts: Record<string, unknown[]> = {}
      for (const name of themeNames) contexts[name] = [{ $ref: `./${name}.tokens.json` }]
      const defaultKey = pickResolverDefaultKey(themeNames)
      contexts[defaultKey] = []
      files['themeon.resolver.json'] = {
        version: '2025.10',
        sets: { base: { sources: [{ $ref: './base.tokens.json' }] } },
        modifiers: { theme: { contexts, default: defaultKey } },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
      }
    }
  }

  attachRootBridge(baseDoc, baseBridge)
  return { files, warnings }
}
