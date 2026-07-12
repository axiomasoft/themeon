/**
 * Экспорт модели ThemeOn в DTCG Format Module 2025.10 (P1.7).
 *
 * `toDTCG(def)` отдаёт multi-file пачку: `base.tokens.json` (базовый sys-слой + все
 * ref-токены, на которые он ссылается — иначе curly-brace алиасы не резолвятся),
 * `<theme>.tokens.json` на каждый патч темы и опциональный `themeon.resolver.json`
 * (Resolver Module 2025.10 — Terrazzo подхватывает из коробки, R-11 §2). Скоуп v1 — P-D15:
 * примитивы структурной формой; `text` → `typography`; `shadow`/`gradient` — legacy-строкой;
 * composite сверх `text` не эмитим. Обход дерева — единственный `walkTree` (правило фазы §6).
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

/** Результат экспорта: карта «имя файла → DTCG-документ». */
export interface DTCGExport {
  files: Record<string, DTCGDocument>
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

type RawLeaf = string | number | TextStyleValue

/** Финальное значение токена → DTCG `$value` (структурная форма или legacy-строка). */
function toDTCGValue(type: TokenType, value: RawLeaf): unknown {
  switch (type) {
    case 'color':
      return typeof value === 'string' ? (parseColor(value) ?? value) : value
    case 'dimension':
      return typeof value === 'string' ? (splitDimension(value) ?? value) : value
    case 'duration':
      return typeof value === 'string' ? (splitDuration(value) ?? value) : value
    case 'number':
      return typeof value === 'number' ? value : Number(value)
    case 'fontFamily':
      // Стек «Inter, sans-serif» → массив имён (DTCG-форма); одиночное имя — строкой.
      return typeof value === 'string' && value.includes(',')
        ? value.split(',').map((s) => s.trim())
        : value
    case 'fontWeight':
      return value // число [1,1000] или строка ('bold') — как есть
    case 'cubicBezier':
      // Именованные кривые ('ease-out') не парсятся → legacy-строка.
      return typeof value === 'string' ? (splitCubicBezier(value) ?? value) : value
    case 'text': {
      const ts = value as TextStyleValue
      const out: Record<string, unknown> = { fontSize: splitDimension(ts.size) ?? ts.size }
      if (ts.lineHeight !== undefined) out.lineHeight = ts.lineHeight
      return out
    }
    case 'shadow':
    case 'gradient':
      return value // v1: CSS-строка целиком (legacy-форма)
    default:
      return value
  }
}

/** Эмитит один токен в документ; ссылку — curly-brace + постановка цели в очередь. */
function placeToken(doc: DTCGDocument, token: Token, emitted: Set<string>, refQueue: Token[]): void {
  const pk = token.path.join('.')
  if (emitted.has(pk)) return
  emitted.add(pk)
  let node: DTCGToken
  if (isToken(token.value)) {
    node = { $type: TYPE_TO_DTCG[token.type], $value: `{${token.value.path.join('.')}}` }
    refQueue.push(token.value)
  } else {
    node = { $type: TYPE_TO_DTCG[token.type], $value: toDTCGValue(token.type, token.value) }
  }
  setByPath(doc as Record<string, unknown>, token.path, node)
}

/**
 * Exports a {@link ThemeDefinition} to DTCG Format 2025.10 as a multi-file bundle: a base
 * document (`base.tokens.json`), one patch document per theme (`<theme>.tokens.json`) and an
 * optional resolver document (`themeon.resolver.json`, Resolver Module 2025.10). Primitives are
 * emitted in structural form; `text` maps to `typography`; `shadow`/`gradient` stay as legacy
 * strings (scope v1, P-D15). Token references become curly-brace aliases and their targets are
 * included in the base document so aliases stay resolvable.
 *
 * @param def a theme definition produced by `defineTheme`
 * @param opts split-themes and resolver-file toggles
 */
export function toDTCG(def: ThemeDefinition, opts: ToDTCGOptions = {}): DTCGExport {
  const splitThemes = opts.splitThemes ?? true
  const sysTree = def.sys as unknown as TokenTreeInput

  // ── base.tokens.json: sys-слой + транзитивно все ref-цели (иначе алиасы не резолвятся) ──
  const baseDoc: DTCGDocument = {}
  const emitted = new Set<string>()
  const refQueue: Token[] = []
  const baseTypeByPath = new Map<string, TokenType>()
  for (const { value } of walkTree(sysTree)) {
    if (!isToken(value)) continue
    baseTypeByPath.set(value.path.join('.'), value.type)
    placeToken(baseDoc, value, emitted, refQueue)
  }
  while (refQueue.length > 0) {
    placeToken(baseDoc, refQueue.shift()!, emitted, refQueue)
  }

  const files: Record<string, DTCGDocument> = { 'base.tokens.json': baseDoc }
  const themeNames = Object.keys(def.themes)

  if (splitThemes) {
    // ── <theme>.tokens.json: только патченные пути ──
    for (const [name, patch] of Object.entries(def.themes)) {
      const themeDoc: DTCGDocument = {}
      for (const { path, value } of walkTree(patch as unknown as TokenTreeInput)) {
        let node: DTCGToken
        if (isToken(value)) {
          node = { $type: TYPE_TO_DTCG[value.type], $value: `{${value.path.join('.')}}` }
          // Цель ссылки должна попасть в base.tokens.json, иначе алиас — dangling curly-brace
          // (P1.7 code-review HIGH): темы могут ссылаться на sys-токены, которых сама база не
          // обходит напрямую (напр. palette-токен вне дерева def.sys).
          refQueue.push(value)
        } else {
          const type = baseTypeByPath.get(path.join('.')) ?? 'dimension'
          node = { $type: TYPE_TO_DTCG[type], $value: toDTCGValue(type, value as RawLeaf) }
        }
        setByPath(themeDoc as Record<string, unknown>, path, node)
      }
      files[`${name}.tokens.json`] = themeDoc
    }
    // ── Дренируем ref-цели, обнаруженные при обходе тем, в base.tokens.json ──
    while (refQueue.length > 0) {
      placeToken(baseDoc, refQueue.shift()!, emitted, refQueue)
    }

    // ── themeon.resolver.json (Resolver Module требует у modifier ≥ 2 контекстов) ──
    if ((opts.resolverFile ?? true) && themeNames.length > 0) {
      const contexts: Record<string, unknown[]> = {}
      if (!Object.hasOwn(def.themes, 'light')) contexts.light = []
      for (const name of themeNames) contexts[name] = [{ $ref: `./${name}.tokens.json` }]
      const defaultCtx = Object.hasOwn(contexts, 'light') ? 'light' : themeNames[0]!
      files['themeon.resolver.json'] = {
        version: '2025.10',
        sets: { base: { sources: [{ $ref: './base.tokens.json' }] } },
        modifiers: { theme: { contexts, default: defaultCtx } },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
      }
    }
  }

  return { files }
}
