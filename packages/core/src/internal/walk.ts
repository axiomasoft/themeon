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
import type { TokenLeafInput, TokenTreeInput } from '../types'

/** Одна запись обхода: путь от корня переданного дерева + сырой лист. */
export interface WalkEntry {
  /** Путь относительно корня дерева, переданного в walkTree (без префикса группы). */
  path: string[]
  /** Лист: Token (в т.ч. ссылка), строка, число или TextStyleValue. */
  value: TokenLeafInput
}

/**
 * Лист = НЕ вложенная подгруппа. Три случая листа:
 *  - примитив (string/number) — `typeof !== 'object'`;
 *  - Token (в т.ч. ссылка на другой токен) — по бренд-символу;
 *  - TextStyleValue — объект-композит, опознаётся по строковому полю `size`.
 * Всё остальное (обычный объект без `size`) — подгруппа, в неё надо спускаться.
 */
export function isLeaf(v: unknown): v is TokenLeafInput {
  if (typeof v !== 'object' || v === null) return true
  if (isToken(v)) return true
  // TextStyleValue: единственный «объект-лист» — распознаём по обязательному size:string.
  return typeof (v as { size?: unknown }).size === 'string'
}

/**
 * Обходит дерево токенов в детерминированном порядке ключей (`Object.entries` —
 * порядок вставки для строковых ключей; целочисленные ключи движок JS сортирует
 * численно — детерминизм сохраняется в любом случае). Спускается только в подгруппы,
 * листья отдаёт как есть.
 */
export function* walkTree(tree: TokenTreeInput, basePath: string[] = []): Generator<WalkEntry> {
  for (const [key, value] of Object.entries(tree)) {
    const path = [...basePath, key]
    if (isLeaf(value)) {
      yield { path, value }
    } else {
      // value — подгруппа (проверено isLeaf); сузить тип для рекурсии.
      yield* walkTree(value as TokenTreeInput, path)
    }
  }
}
