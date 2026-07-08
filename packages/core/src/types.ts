/**
 * Модель типов ThemeOn (P1.1): branded Token, well-known sys-группы, выход резолвера.
 * Полный контракт пакета — реализация (defineTokens/defineTheme/resolveTheme/…)
 * приходит в следующих item'ах фазы P1 и опирается ровно на эти типы.
 */

/**
 * Брендирующий символ. Экспортируется из `types.ts`, чтобы внутренние модули пакета
 * (define.ts в P1.2 и далее) могли конструировать реальные Token — но НЕ реэкспортируется
 * из публичного `index.ts` (P1.8), поэтому потребитель пакета не может слепить Token
 * литералом: без доступа к символу структурная проверка компилятора обязана провалиться.
 */
export const TOKEN_BRAND: unique symbol = Symbol('themeon.token')

/** Автокомплит известных значений без запрета произвольных строк. */
export type AutoComplete<T extends string> = T | (string & {})

/** 10 типов ядра v1 (подмножество DTCG-13 + собственный composite 'text'). */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'number'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'shadow'
  | 'gradient'
  | 'text'

/** Composite text-токен: пара значений для double-dash companion (R-11 §3). */
export interface TextStyleValue {
  /** font-size, строка с единицами: '1.5rem' */
  size: string
  /** line-height: unitless-число или строка */
  lineHeight?: number | string
}

export type TokenLeafInput = string | number | TextStyleValue | Token

export interface TokenTreeInput {
  [key: string]: TokenLeafInput | TokenTreeInput
}

/** Лист после defineTokens/defineTheme. Иммутабелен (Object.freeze — P1.2). */
export interface Token<TType extends TokenType = TokenType> {
  readonly [TOKEN_BRAND]: true
  readonly type: TType
  /** Полный путь от группы: ['color','forest','600'] */
  readonly path: readonly string[]
  /** Авторское значение; Token — если это ссылка на другой токен. */
  readonly value: string | number | TextStyleValue | Token
}

/** Type guard: отличает Token от структурно похожего объекта по наличию бренд-символа. */
export function isToken(v: unknown): v is Token {
  if (typeof v !== 'object' || v === null) return false
  return (v as Record<symbol, unknown>)[TOKEN_BRAND] === true
}

/** Дерево после оборачивания листьев. */
export type Tokenized<T> = {
  readonly [K in keyof T]: T[K] extends TokenLeafInput ? Token : Tokenized<T[K]>
}

/** Well-known sys-группы (master §4.2). Каждая опциональна; расширение — доп. ключами. */
export interface WellKnownSys {
  color?: TokenTreeInput // роли: bg.page, action.primary…
  space?: Record<string, string | Token> // ТОЛЬКО с единицами (правило P1.4)
  radius?: Record<string, string | Token>
  text?: Record<string, TextStyleValue | Token> // композит size+lineHeight
  font?: Record<string, string | Token> // font-family стеки
  fontWeight?: Record<string, number | string | Token>
  tracking?: Record<string, string | Token> // letter-spacing, отдельный namespace
  leading?: Record<string, number | string | Token> // standalone line-height
  shadow?: Record<string, string | Token> // CSS-строка целиком (v1)
  gradient?: Record<string, string | Token>
  z?: Record<string, number | Token>
  ease?: Record<string, string | Token>
  duration?: Record<string, string | Token>
  breakpoint?: Record<string, string | Token> // '640px' — единицы обязательны
}
export type SysTreeInput = WellKnownSys & { [group: string]: TokenTreeInput | undefined }

/** Глубокий частичный патч sys-дерева (тема/тенант). Ключи ⊆ базового дерева. */
export type SysPatch<T> = {
  [K in keyof T]?: T[K] extends TokenLeafInput ? TokenLeafInput : SysPatch<T[K]>
}

/** Определение темы (выход defineTheme — P1.2). */
export interface ThemeDefinition<TSys extends SysTreeInput = SysTreeInput> {
  readonly sys: Tokenized<TSys>
  /** Сырые патчи тем; резолвятся в resolveTheme (P1.4). */
  readonly themes: Readonly<Record<string, SysPatch<TSys>>>
  /** color-scheme per тема; конвенция: тема 'dark' → 'dark' автоматически (P-D16). */
  readonly schemes: Readonly<Record<string, 'light' | 'dark'>>
}

/** Брендированная var()-ссылка. */
export type CssVarRef = `var(--${string})`
export type CssVarName = `--${string}`

/* ── Выход резолвера (реализация — P1.4) ── */
export interface ResolvedToken {
  readonly path: readonly string[]
  readonly varName: CssVarName
  readonly type: TokenType
  /** Финальное CSS-значение (цепочки ссылок схлопнуты). */
  readonly value: string
  /** varName непосредственной цели ссылки — для var-chain эмита (P-D13). */
  readonly ref?: CssVarName
}
export interface ResolvedTheme {
  readonly tokens: readonly ResolvedToken[] // база (:root)
  readonly themes: Readonly<Record<string, readonly ResolvedToken[]>> // патчи
  readonly aliases: ReadonlyArray<{ alias: CssVarName; target: CssVarName }>
  readonly breakpoints: Readonly<Record<string, { value: string; px: number | null }>>
  /** Плоский словарь базы varName→value — вход applier'а и адаптеров. */
  readonly vars: Readonly<Record<string, string>>
  readonly schemes: Readonly<Record<string, 'light' | 'dark'>>
}
