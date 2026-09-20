/**
 * Резолвер (P1.4): сердце ядра ThemeOn.
 *
 * `resolveTheme` схлопывает цепочки Token-ссылок, валидирует значения (единицы в
 * dimension-группах), применяет naming РОВНО ОДИН раз (P-D14) и отдаёт `ResolvedTheme` —
 * готовые пары «имя переменной → значение». Именно здесь паритет build/runtime обеспечен
 * ПО ПОСТРОЕНИЮ: сериализатор (P1.5) и applier (P1.6) получают уже разрешённые имена и
 * значения и не могут разойтись (D4). Naming/kebab/обход дерева резолвер не дублирует —
 * зовёт `formatVarName`/`walkTree`; второй копии этих функций в пакете нет (R-01 §1).
 */

import { ThemeonError } from './errors'
import { GRAPH_MAX_DEPTH, buildGraph, comparePath } from './graph/build'
import { walkTree } from './internal/walk'
import { irFromDefinition } from './model/from-definition'
import { formatVarName, formatTextVarNames } from './naming'
import { legacyV0Alias } from './aliases/legacy-v0'
import { isToken } from './types'
import type { NamingOptions } from './naming'
import type { AliasesOption } from './aliases/legacy-v0'
import type {
  CssVarName,
  ResolvedTheme,
  ResolvedToken,
  TextStyleValue,
  ThemeDefinition,
  Token,
  TokenTreeInput,
  TokenType,
} from './types'

/** Опции резолвера: naming (prefix) + легаси-алиасы + транспорт ref-слоя. */
export interface ResolveOptions extends NamingOptions {
  /** Легаси-алиасы: `'legacy-v0'` | своя функция-правило | `undefined` (без алиасов). */
  aliases?: AliasesOption
  /**
   * Транспорт ref-слоя (P-D13):
   *  - `'referenced'` (деф.) — эмитить только ref-переменные, на которые sys ссылается
   *    НЕПОСРЕДСТВЕННО; sys-токен со ссылкой = var-chain на них, глубже цепочка схлопнута;
   *  - `'all'` — эмитить ВСЕ ref-токены, достижимые из sys транзитивно (включая промежуточные
   *    звенья цепочек); каждое звено — своя переменная, var-chain сохранён целиком;
   *  - `'inline'` — ref-слой не эмитить, финальные значения инлайнить прямо в sys-переменные.
   *
   * У резолвера нет реестра всех палитр (Token'ы, созданные `defineTokens` вне sys-дерева) —
   * он видит их только как цели ссылок. Поэтому `'all'` = «все достижимые из sys ref-токены»:
   * палитра, на которую никто не ссылается, в CSS не попадает — это фича token-coverage, не бага.
   */
  refLayer?: 'referenced' | 'all' | 'inline'
}

/** Ключ идентичности пути (сегменты могут содержать '.', поэтому не join('.') — JSON.stringify). */
function pathKey(path: readonly string[]): string {
  return JSON.stringify(path)
}

/** Результат схлопывания цепочки ссылок одного токена. */
interface ChainResult {
  /** Финальное значение — цепочка Token-ссылок пройдена до не-Token листа. */
  finalValue: string | number | TextStyleValue
  /** Ref-токены после исходного (цели ссылок), в порядке следования по цепочке. */
  chain: Token[]
}

/**
 * Идёт по `token.value`, пока это Token (ссылка), до финального значения.
 * Повтор пути в цепочке → `ThemeonError('CYCLE', ...)` с печатью всей цепочки путей.
 */
function resolveChain(start: Token): ChainResult {
  const visited: string[] = [start.path.join('.')]
  const seen = new Set<string>([pathKey(start.path)])
  const chain: Token[] = []
  let current = start
  while (isToken(current.value)) {
    const next: Token = current.value
    const key = pathKey(next.path)
    const display = next.path.join('.')
    if (seen.has(key)) {
      throw new ThemeonError(
        'CYCLE',
        `Circular token reference: ${[...visited, display].join(' → ')}`,
      )
    }
    seen.add(key)
    visited.push(display)
    chain.push(next)
    current = next
  }
  return { finalValue: current.value as string | number | TextStyleValue, chain }
}

/**
 * Collapses all Token reference chains of a theme definition, validates values, applies the
 * naming engine exactly once (P-D14) and returns a {@link ResolvedTheme} of ready
 * `varName → value` pairs. The serializer (P1.5) and the runtime applier (P1.6) consume this
 * output verbatim, which makes build/runtime output identical by construction (D4).
 *
 * Errors (all {@link ThemeonError}): `CYCLE` (circular reference), `BAD_VALUE` (a dimension
 * token — group `space`/`radius`/`breakpoint` or `text.size` — carries a unitless number),
 * `NAME_COLLISION` (two token paths produce the same CSS variable name).
 *
 * @param def theme definition produced by `defineTheme`
 * @param opts prefix, legacy aliases and ref-layer transport
 * @example
 * ```ts
 * const resolved = resolveTheme(theme, { refLayer: 'referenced', aliases: 'legacy-v0' })
 * resolved.vars['--color-bg-page'] // 'oklch(0.99 0 0)'
 * ```
 */
export function resolveTheme(def: ThemeDefinition, opts: ResolveOptions = {}): ResolvedTheme {
  const graph = buildGraph(irFromDefinition(def, { kind: 'dsl' }))
  const depthIssue = graph.issues.find((issue) => issue.code === 'DEPTH')
  if (depthIssue) {
    throw new ThemeonError(
      'CYCLE',
      `Token reference chain exceeds GRAPH_MAX_DEPTH (${GRAPH_MAX_DEPTH}) at ${depthIssue.from}`,
    )
  }

  const refLayer = opts.refLayer ?? 'referenced'
  const aliasRule = opts.aliases === 'legacy-v0' ? legacyV0Alias : opts.aliases

  const vars: Record<string, string> = {}
  const aliases: { alias: CssVarName; target: CssVarName }[] = []
  const breakpoints: Record<string, { value: string; px: number | null }> = {}

  // varName → идентичность пути-владельца: повтор с другим путём = NAME_COLLISION.
  const nameOwners = new Map<string, string>()
  function claim(varName: string, path: readonly string[]): void {
    const pk = pathKey(path)
    const prev = nameOwners.get(varName)
    if (prev !== undefined && prev !== pk) {
      throw new ThemeonError(
        'NAME_COLLISION',
        `CSS variable "${varName}" is produced by two token paths: ` +
          `"${(JSON.parse(prev) as string[]).join('.')}" and "${path.join('.')}"`,
      )
    }
    nameOwners.set(varName, pk)
  }

  /**
   * Превращает финальное значение в 1..2 `ResolvedToken` (text-композит даёт пару size +
   * companion), проверяет единицы, клеймит имена. Для базы (`emitVars=true`) заполняет `vars`
   * (var-chain при `directRef`) и `breakpoints`; для тем — только массив `into`.
   */
  function materialize(
    path: readonly string[],
    type: TokenType,
    finalValue: string | number | TextStyleValue,
    directRef: CssVarName | undefined,
    into: ResolvedToken[],
    emitVars: boolean,
  ): void {
    const group = path[0] ?? ''

    // TextStyleValue → две переменные (size + double-dash companion line-height).
    if (typeof finalValue === 'object' && finalValue !== null) {
      if (typeof finalValue.size !== 'string') {
        throw new ThemeonError(
          'BAD_VALUE',
          `Text token '${path.join('.')}' size must be a string with units`,
        )
      }
      const names = formatTextVarNames(path, opts)
      claim(names.size, path)
      into.push({ path, varName: names.size, type, value: finalValue.size })
      if (emitVars) vars[names.size] = finalValue.size
      if (finalValue.lineHeight !== undefined) {
        const lh = String(finalValue.lineHeight)
        claim(names.lineHeight, path)
        into.push({ path, varName: names.lineHeight, type, value: lh })
        if (emitVars) vars[names.lineHeight] = lh
      }
      return
    }

    // Единицы: space/radius/breakpoint (dimension) не принимают голое число.
    if (
      (group === 'space' || group === 'radius' || group === 'breakpoint') &&
      typeof finalValue === 'number'
    ) {
      throw new ThemeonError(
        'BAD_VALUE',
        `Dimension token '${path.join('.')}' must be a string with units, got number ${finalValue}`,
      )
    }

    const valueStr = typeof finalValue === 'number' ? String(finalValue) : finalValue
    const varName = formatVarName(path, opts)
    claim(varName, path)
    into.push(
      directRef !== undefined
        ? { path, varName, type, value: valueStr, ref: directRef }
        : { path, varName, type, value: valueStr },
    )

    if (emitVars) {
      vars[varName] = directRef !== undefined ? `var(${directRef})` : valueStr
      if (group === 'breakpoint') {
        const name = path.slice(1).join('-')
        const m = /^(\d+(?:\.\d+)?)px$/.exec(valueStr)
        breakpoints[name] = { value: valueStr, px: m ? Number(m[1]) : null }
      }
    }
  }

  // ── 1. Сбор sys-токенов; порядок — канонический id, не Object.entries (P1.3) ──
  const sysTokens: Token[] = []
  const baseTypeByPath = new Map<string, TokenType>()
  for (const { value } of walkTree(def.sys as unknown as TokenTreeInput)) {
    if (isToken(value)) {
      sysTokens.push(value)
      baseTypeByPath.set(pathKey(value.path), value.type)
    }
  }
  sysTokens.sort((a, b) => comparePath(a.path, b.path))

  // ── 2. Реестр эмитируемых ref-токенов (заодно ранняя проверка циклов на всех цепочках) ──
  const emittedRefPaths = new Set<string>()
  const refTokens: Token[] = []
  const refSeen = new Map<string, Token>()
  for (const token of sysTokens) {
    const { chain } = resolveChain(token)
    if (refLayer === 'inline') continue
    // 'referenced' — только непосредственная цель; 'all' — вся цепочка.
    const links = refLayer === 'all' ? chain : chain.slice(0, 1)
    for (const ref of links) {
      const pk = pathKey(ref.path)
      emittedRefPaths.add(pk)
      const seenRef = refSeen.get(pk)
      if (seenRef === undefined) {
        refSeen.set(pk, ref)
        refTokens.push(ref)
      } else if (seenRef !== ref) {
        // Разные Token'ы с совпадающим путём (напр. два defineTokens с одинаковой
        // структурой) дали бы одну и ту же CSS-переменную с разным значением —
        // тот же класс ошибки, что и NAME_COLLISION в sys-слое (claim()).
        throw new ThemeonError(
          'NAME_COLLISION',
          `CSS variable "${formatVarName(ref.path, opts)}" is produced by two different ` +
            `ref tokens sharing the path "${ref.path.join('.')}"`,
        )
      }
    }
  }
  refTokens.sort((a, b) => comparePath(a.path, b.path))

  /** Var-chain-цель токена: непосредственная ссылка, если эта цель реально эмитится. */
  function directRefOf(token: Token): CssVarName | undefined {
    if (isToken(token.value) && emittedRefPaths.has(pathKey(token.value.path))) {
      return formatVarName(token.value.path, opts)
    }
    return undefined
  }

  // ── 3. Эмит ref-слоя (сначала) и sys-слоя (следом) в единый список базы ──
  const refResolved: ResolvedToken[] = []
  for (const token of refTokens) {
    const { finalValue } = resolveChain(token)
    materialize(token.path, token.type, finalValue, directRefOf(token), refResolved, true)
  }
  const sysResolved: ResolvedToken[] = []
  for (const token of sysTokens) {
    const { finalValue } = resolveChain(token)
    materialize(token.path, token.type, finalValue, directRefOf(token), sysResolved, true)
  }

  // ── 4. Темы: патчи резолвятся тем же кодом; значения инлайнятся (без var-chain в блоке темы) ──
  const themesOut: Record<string, readonly ResolvedToken[]> = {}
  for (const [themeName, patch] of Object.entries(def.themes)) {
    const list: ResolvedToken[] = []
    const patchLeaves = [...walkTree(patch as unknown as TokenTreeInput)].sort((a, b) =>
      comparePath(a.path, b.path),
    )
    for (const { path, value } of patchLeaves) {
      const type = baseTypeByPath.get(pathKey(path)) ?? 'dimension'
      const finalValue = isToken(value)
        ? resolveChain(value).finalValue
        : (value as string | number | TextStyleValue)
      materialize(path, type, finalValue, undefined, list, false)
    }
    themesOut[themeName] = Object.freeze(list)
  }

  // ── 5. Легаси-алиасы (только базовые sys-токены; ref-палитры не алиасятся) ──
  if (aliasRule) {
    for (const token of sysTokens) {
      const alias = aliasRule(token.path)
      if (alias !== null) {
        const target = formatVarName(token.path, opts)
        // Алиас пишется в тот же `vars`, что и реальные токены — обязан пройти через
        // claim(), иначе тихо перезаписывает существующее значение (last-write-wins).
        claim(alias, token.path)
        aliases.push({ alias, target })
        vars[alias] = `var(${target})`
      }
    }
  }

  return Object.freeze({
    tokens: Object.freeze([...refResolved, ...sysResolved]),
    themes: Object.freeze(themesOut),
    aliases: Object.freeze(aliases),
    breakpoints: Object.freeze(breakpoints),
    vars: Object.freeze(vars),
    schemes: def.schemes,
  }) as ResolvedTheme
}
