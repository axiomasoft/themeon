/** Коды ошибок ядра ThemeOn (P1.1) — расширяются по мере реализации P1.2–P1.7. */
export type ThemeonErrorCode =
  | 'CYCLE' // циклическая ссылка токенов
  | 'UNKNOWN_PATH' // патч темы ссылается на несуществующий путь базы
  | 'BAD_VALUE' // число без единиц в dimension-группе и т.п.
  | 'NAME_COLLISION' // два пути дали одно имя переменной
  | 'DTCG_PARSE' // невалидный входной DTCG-документ
  | 'UNSAFE_PATH' // сегмент пути — `__proto__`/`constructor`/`prototype` (prototype pollution)
  | 'UNSAFE_CSS_TOKEN' // значение, интерполируемое в CSS-селектор/at-rule/комментарий, содержит `{`, `}` или `*/` (CSS-инъекция)
  | 'BAD_COLOR' // адаптер (@themeon/naive) получил цвет, непарсибельный consumer'ом (var()/color-mix()/…)

/** Единая ошибка пакета: код + сообщение (публичная поверхность — сообщение на английском). */
export class ThemeonError extends Error {
  readonly code: ThemeonErrorCode

  constructor(code: ThemeonErrorCode, message: string) {
    super(message)
    this.name = 'ThemeonError'
    this.code = code
  }
}
