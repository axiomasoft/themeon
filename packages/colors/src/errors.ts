/** Коды ошибок @themeon/colors (P2.1; SEED_OUT_OF_BAND/CONTRAST_UNREACHABLE — P8.5). */
export type ColorsErrorCode = 'BAD_COLOR' | 'BAD_SEED' | 'SEED_OUT_OF_BAND' | 'CONTRAST_UNREACHABLE'

/** Ошибка @themeon/colors. Гейт fail-closed: непарсибельный вход всегда бросает, не пропускает. */
export class ColorsError extends Error {
  readonly code: ColorsErrorCode

  constructor(code: ColorsErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ColorsError'
    this.code = code
  }
}
