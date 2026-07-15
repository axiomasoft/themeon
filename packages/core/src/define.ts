/**
 * Авторский API пакета (P1.2): `defineTokens` / `defineTheme`.
 *
 * Это то, что физически пишет потребитель ThemeOn. Листья дерева оборачиваются в
 * замороженные branded `Token` с полным путём (P-D12 leaf-wrapping): typed-ссылка —
 * это реальный JS-объект Token, который несёт метаданные (путь для var-chain, тип,
 * значение или другой Token как ссылку). Резолюция цепочек, naming и валидация единиц —
 * НЕ здесь (P1.3/P1.4); тут только оборачивание и рантайм-проверка «ключи патча ⊆ базы».
 */

import { TOKEN_BRAND, isToken } from './types'
import { ThemeonError } from './errors'
import { walkTree } from './internal/walk'
import type {
  AutoComplete,
  SysPatch,
  SysTreeInput,
  TextStyleValue,
  ThemeDefinition,
  Token,
  TokenLeafInput,
  TokenTreeInput,
  TokenType,
  Tokenized,
  WellKnownSys,
} from './types'

/** Имя корневой группы токенов: известные well-known + любая своя строка. */
export type GroupName = AutoComplete<keyof WellKnownSys & string>

/**
 * Единственная рантайм-таблица «группа → TokenType» пакета.
 * Для известной группы тип берётся отсюда без анализа значения (namespace-таблица
 * префиксов — отдельная сущность в naming.ts, P1.3). Для неизвестной группы работает
 * эвристика inferByValue.
 */
const GROUP_TYPE_MAP: Readonly<Record<string, TokenType>> = {
  color: 'color',
  space: 'dimension',
  radius: 'dimension',
  text: 'text',
  font: 'fontFamily',
  fontWeight: 'fontWeight',
  tracking: 'dimension',
  leading: 'number',
  shadow: 'shadow',
  gradient: 'gradient',
  z: 'number',
  ease: 'cubicBezier',
  duration: 'duration',
  breakpoint: 'dimension',
}

/** Единственные ключи, допустимые в TextStyleValue (types.ts) — держим в синхроне с walk.ts. */
const TEXT_STYLE_KEYS = new Set(['size', 'lineHeight'])

/** TextStyleValue — объект-композит с обязательным строковым size, ключи ⊆ {size,lineHeight} (не Token). */
function isTextStyleValue(v: TokenLeafInput): v is TextStyleValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    !isToken(v) &&
    typeof (v as { size?: unknown }).size === 'string' &&
    Object.keys(v).every((k) => TEXT_STYLE_KEYS.has(k))
  )
}

/** Строка похожа на цвет: hex или именованная цветовая функция. */
function looksLikeColor(s: string): boolean {
  return /^(#|rgb|hsl|oklch|oklab|color\()/.test(s.trim())
}

/**
 * Эвристика типа по значению листа — ТОЛЬКО для неизвестной группы.
 * Порядок проверок фиксирован ТЗ P1.2; последняя ветка — dimension + dev-warn.
 */
function inferByValue(value: TokenLeafInput, path: readonly string[]): TokenType {
  if (isTextStyleValue(value)) return 'text'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    if (looksLikeColor(value)) return 'color'
    // единицы длины → dimension; единицы времени → duration (пересечений нет).
    if (/(px|rem|em|%|vh|vw|ch|ex)$/.test(value)) return 'dimension'
    if (/(ms|s)$/.test(value)) return 'duration'
  }
  console.warn(
    `[themeon] cannot infer token type for ${path.join('.')}, defaulting to dimension`,
  )
  return 'dimension'
}

/**
 * Тип токена по группе и значению:
 *  - известная группа → GROUP_TYPE_MAP (значение не анализируется);
 *  - ссылка (Token) в неизвестной группе → тип цели ссылки;
 *  - иначе → эвристика по значению.
 */
function inferTokenType(group: string, value: TokenLeafInput, path: readonly string[]): TokenType {
  // Object.hasOwn (не `in`/индексация) — иначе группа с именем прототип-члена
  // (`toString`, `constructor`, ...) читает функцию из Object.prototype как "known".
  if (Object.hasOwn(GROUP_TYPE_MAP, group)) return GROUP_TYPE_MAP[group]!
  if (isToken(value)) return value.type
  return inferByValue(value, path)
}

/** Собирает один замороженный branded Token. Ссылка (Token в value) остаётся ссылкой. */
function makeToken(group: string, path: string[], value: TokenLeafInput): Token {
  const frozenPath = Object.freeze([...path]) as readonly string[]
  // TextStyleValue заморозить (авторский объект), Token уже заморожен, примитивы — no-op.
  const frozenValue = isTextStyleValue(value) ? Object.freeze({ ...value }) : value
  return Object.freeze({
    [TOKEN_BRAND]: true as const,
    type: inferTokenType(group, value, path),
    path: frozenPath,
    value: frozenValue,
  }) as Token
}

/** Кладёт лист в результирующее дерево по относительному пути, создавая подгруппы. */
/** Ключи, чья bracket-запись (`node[key] = ...`) идёт через unset/наследуемый аксессор
 *  вместо создания own-property — `__proto__` подменяет прототип узла целиком (verified
 *  final-audit H2, 2026-07-12), `constructor`/`prototype` — тот же класс риска. Экспортируется
 *  для reuse в `patch.ts` (P6.1, tenant-путь — тот же класс атаки на входе с внешним JSON). */
export const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function assignByPath(root: Record<string, unknown>, path: string[], leaf: unknown): void {
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
    // Object.hasOwn — `in` читает через прототип-цепочку и молчаливо считает
    // унаследованный ключ существующим.
    if (!Object.hasOwn(node, key)) {
      Object.defineProperty(node, key, { value: {}, writable: true, enumerable: true, configurable: true })
    }
    node = node[key] as Record<string, unknown>
  }
}

/** Рекурсивно замораживает объект и все вложенные (уже замороженные — пропускает). */
function freezeDeep(obj: object): void {
  Object.freeze(obj)
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null && !Object.isFrozen(v)) freezeDeep(v)
  }
}

/**
 * Wraps every leaf of a token tree in a frozen branded {@link Token} carrying the full
 * path `[group, ...keys]`. A leaf that is already a Token (a reference) stays a reference:
 * the new Token's `value` is the referenced Token. The `const` type parameter preserves
 * literal keys without requiring `as const` at the call site (TS 6.0).
 *
 * @param group root group name (drives token type inference for well-known groups)
 * @param tree nested plain object of token values
 * @example
 * ```ts
 * const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
 * palette.forest[600].value // 'oklch(0.55 0.13 155)'
 * ```
 */
export function defineTokens<const T extends TokenTreeInput>(
  group: GroupName,
  tree: T,
): Tokenized<T> {
  const root: Record<string, unknown> = {}
  for (const { path, value } of walkTree(tree)) {
    const token = makeToken(group, [group, ...path], value)
    assignByPath(root, path, token)
  }
  freezeDeep(root)
  return root as unknown as Tokenized<T>
}

/** Configuration for {@link defineTheme}. */
export interface ThemeConfig<TSys extends SysTreeInput> {
  /** Base sys-contract: the full set of tokens every theme shares. */
  base: TSys
  /** Named partial patches; each key must exist in `base` (checked at runtime). */
  themes?: Record<string, SysPatch<TSys>>
  /** Overrides the color-scheme convention (P-D16); a theme named `dark` defaults to `dark`. */
  schemes?: Record<string, 'light' | 'dark'>
}

/**
 * Builds a {@link ThemeDefinition} from a base sys-contract and named theme patches.
 *
 * The base tree is wrapped into frozen Tokens (via {@link defineTokens} per group);
 * theme patches are kept raw (resolution is P1.4) but validated eagerly: every patched
 * path must exist in `base`, otherwise a `ThemeonError('UNKNOWN_PATH')` is thrown with the
 * offending path and the valid keys at that level. A theme named `dark` receives
 * `color-scheme: dark` unless overridden in `schemes` (P-D16).
 *
 * @param config base contract, optional patches and scheme overrides
 * @example
 * ```ts
 * const theme = defineTheme({
 *   base: { color: { bg: { page: 'oklch(0.99 0 0)' } }, space: { 4: '1rem' } },
 *   themes: { dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } } },
 * })
 * theme.schemes.dark // 'dark' (convention P-D16)
 * ```
 */
export function defineTheme<const TSys extends SysTreeInput>(
  config: ThemeConfig<TSys>,
): ThemeDefinition<TSys> {
  // 1) обернуть base по группам (Token-листья не переоборачиваются — ссылка остаётся ссылкой).
  const sys: Record<string, unknown> = {}
  for (const [group, subtree] of Object.entries(config.base)) {
    if (subtree === undefined) continue
    sys[group] = defineTokens(group, subtree as TokenTreeInput)
  }
  Object.freeze(sys)

  // 2) валидация патчей тем: каждый путь патча обязан существовать в base.
  const themes = config.themes ?? {}
  for (const [themeName, patch] of Object.entries(themes)) {
    validatePatchPaths(patch as TokenTreeInput, config.base as Record<string, unknown>, themeName)
  }

  // 3) schemes: конвенция «тема dark → color-scheme dark», если не переопределено.
  const schemes: Record<string, 'light' | 'dark'> = { ...config.schemes }
  if ('dark' in themes && !('dark' in schemes)) schemes.dark = 'dark'

  return Object.freeze({
    sys: sys as unknown as Tokenized<TSys>,
    themes: Object.freeze({ ...themes }) as Readonly<Record<string, SysPatch<TSys>>>,
    schemes: Object.freeze(schemes),
  }) as ThemeDefinition<TSys>
}

/**
 * Проверяет, что каждый путь-лист патча существует в базовом дереве.
 * Ошибка — публичная (`UNKNOWN_PATH`), сообщение на английском: печатает полный путь,
 * первый несуществующий сегмент и перечень валидных ключей уровня.
 */
function validatePatchPaths(
  patch: TokenTreeInput,
  base: Record<string, unknown>,
  themeName: string,
): void {
  for (const { path } of walkTree(patch)) {
    let node: unknown = base
    for (const key of path) {
      // Object.hasOwn — `in` пропускает ключи-имена прототип-членов (toString, constructor)
      // мимо гейта UNKNOWN_PATH, потому что они существуют унаследованно от Object.prototype.
      if (typeof node !== 'object' || node === null || !Object.hasOwn(node, key)) {
        const validKeys = typeof node === 'object' && node !== null ? Object.keys(node) : []
        throw new ThemeonError(
          'UNKNOWN_PATH',
          `Theme "${themeName}" patches unknown path "${path.join('.')}": ` +
            `key "${key}" does not exist in base. ` +
            `Valid keys at this level: ${validKeys.join(', ') || '(none)'}`,
        )
      }
      node = (node as Record<string, unknown>)[key]
    }
  }
}
