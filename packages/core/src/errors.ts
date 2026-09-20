/** Коды ошибок ядра ThemeOn (P1.1) — расширяются по мере реализации P1.2–P1.7. */
export const THEMEON_ERROR_CODES = [
  'CYCLE', // циклическая ссылка токенов
  'UNKNOWN_PATH', // патч темы ссылается на несуществующий путь базы
  'BAD_VALUE', // число без единиц в dimension-группе и т.п.
  'NAME_COLLISION', // два пути дали одно имя переменной
  'DTCG_PARSE', // невалидный входной DTCG-документ
  'UNSAFE_PATH', // сегмент пути — `__proto__`/`constructor`/`prototype` (prototype pollution)
  'UNSAFE_CSS_TOKEN', // значение, интерполируемое в CSS-селектор/at-rule/комментарий, содержит `{`, `}` или `*/` (CSS-инъекция)
  'BAD_COLOR', // адаптер (@themeon/naive) получил цвет, непарсибельный consumer'ом (var()/color-mix()/…)
  'DTCG_NAME_COLLISION', // два разных пути токенов экранируются в одно DTCG-имя (P8.11)
  'DTCG_LOSSY_IMPORT', // lossy interchange without explicit allowLossy (D2, P0.1)
  'UNSUPPORTED_TENANT_TYPE', // tenant-патч трогает тип вне ALLOWED_TENANT_TYPES (shadow/gradient/cubicBezier — запрещены v1, P6.1/P-D70)
  'PATCH_LIMIT', // tenant patch exceeds depth, key-count or value-length bounds
  'PATCH_POLICY', // tenant patch path is outside the selected trust policy
  'PATCH_UNICODE', // tenant patch key/value contains Unicode controls or a lone surrogate
  'PATCH_CYCLE', // tenant patch introduced a token-reference cycle
  'EXTENSION_COLLISION', // two instance-scoped extensions share stage+capability+name
  'EXTENSION_CACHE', // extension or custom alias rule missing cache contribution
  'EXTENSION_ASYNC', // async extension hook rejected by the sync-first compiler
] as const

export type ThemeonErrorCode = (typeof THEMEON_ERROR_CODES)[number]

export interface ThemeonErrorOptions {
  readonly path?: readonly string[]
  readonly hint?: string
}

/** Единая ошибка пакета: код + сообщение (публичная поверхность — сообщение на английском). */
export class ThemeonError extends Error {
  readonly code: ThemeonErrorCode
  readonly path?: readonly string[]
  readonly hint?: string

  constructor(code: ThemeonErrorCode, message: string, options: ThemeonErrorOptions = {}) {
    super(message)
    this.name = 'ThemeonError'
    this.code = code
    if (options.path !== undefined) this.path = Object.freeze([...options.path])
    if (options.hint !== undefined) this.hint = options.hint
  }
}
