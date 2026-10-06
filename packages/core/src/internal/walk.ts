/**
 * Единственный обходчик дерева токенов ThemeOn (P1.2).
 *
 * Здесь живёт вся логика «спуститься по вложенному объекту токенов до листьев».
 * define.ts, resolve.ts (P1.4) и dtcg (P1.7) обязаны звать именно `walkTree` —
 * второй копии обходчика в пакете быть не должно (класс багов R-01 §1: две копии
 * kebab/обхода расходятся, и никто не замечает). `isLeaf` — единственный критерий
 * «это лист, а не подгруппа».
 */

import { isToken } from '../types'
import type { TokenLeafInput } from '../types'

/**
 * Structural input of the walker: any (readonly) object tree. Authoring trees
 * (`TokenTreeInput`), wrapped trees (`Tokenized<T>`) and theme patches (`SysPatch<T>`) are all
 * assignable, so callers no longer need `as unknown as TokenTreeInput` double casts.
 */
export type TokenTreeLike = { readonly [key: string]: unknown }

/** Одна запись обхода: путь от корня переданного дерева + сырой лист. */
export interface WalkEntry {
  /** Путь относительно корня дерева, переданного в walkTree (без префикса группы). */
  path: string[]
  /** Лист: Token (в т.ч. ссылка), строка, число или TextStyleValue. */
  value: TokenLeafInput
}

/** Единственные ключи, допустимые в TextStyleValue (types.ts) — иначе это подгруппа. */
const TEXT_STYLE_KEYS = new Set(['size', 'lineHeight'])

/**
 * Лист = НЕ вложенная подгруппа. Три случая листа:
 *  - примитив (string/number) — `typeof !== 'object'`;
 *  - Token (в т.ч. ссылка на другой токен) — по бренд-символу;
 *  - TextStyleValue — объект-композит с обязательным строковым `size` и ключами ⊆
 *    {size, lineHeight}. Строгий allowlist ключей нужен, иначе любой объект-подгруппа
 *    с полем `size` (частый ключ компонентного sizing) молча теряет соседние ключи
 *    (P1.2 code-review HIGH: `{ size, radius }` схлопывался в один Token без radius).
 * Всё остальное (объект без `size` или с посторонними ключами) — подгруппа, в неё
 * надо спускаться.
 */
export function isLeaf(v: unknown): v is TokenLeafInput {
  if (typeof v !== 'object' || v === null) return true
  if (isToken(v)) return true
  if (typeof (v as { size?: unknown }).size !== 'string') return false
  return Object.keys(v).every((k) => TEXT_STYLE_KEYS.has(k))
}

/**
 * Обходит дерево токенов в детерминированном порядке ключей (`Object.entries` —
 * порядок вставки для строковых ключей; целочисленные ключи движок JS сортирует
 * численно — детерминизм сохраняется в любом случае). Спускается только в подгруппы,
 * листья отдаёт как есть.
 */
export function* walkTree(
  tree: TokenTreeLike,
  basePath: readonly string[] = [],
): Generator<WalkEntry, void, undefined> {
  for (const [key, value] of Object.entries(tree)) {
    const path = [...basePath, key]
    if (isLeaf(value)) {
      yield { path, value }
    } else if (isSubtree(value)) {
      yield* walkTree(value, path)
    }
  }
}

/** Non-leaf branch of {@link isLeaf}: a non-null object that is not a Token or text style. */
function isSubtree(v: unknown): v is TokenTreeLike {
  return typeof v === 'object' && v !== null
}
