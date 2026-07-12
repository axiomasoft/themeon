/** Коды ошибок @themeon/colors (P2.1). */
export type ColorsErrorCode = 'BAD_COLOR' | 'BAD_SEED'

/** Ошибка @themeon/colors. Гейт fail-closed: непарсибельный вход всегда бросает, не пропускает. */
export class ColorsError extends Error {
  readonly code: ColorsErrorCode

  constructor(code: ColorsErrorCode, message: string) {
    super(message)
    this.name = 'ColorsError'
    this.code = code
  }
}
