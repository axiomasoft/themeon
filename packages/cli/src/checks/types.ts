/**
 * `themeon check` (P4.5) — общие типы трёх линтеров (token-coverage / APCA-contrast /
 * hardcode). `Finding` — единый формат находки, печатается CLI-раннером и проверяется тестами
 * буквально (уровень/правило/сообщение/файл:строка).
 */

export type Level = 'error' | 'warning'
export type Rule = 'token-coverage' | 'contrast' | 'hardcode'

export interface Finding {
  readonly level: Level
  readonly rule: Rule
  readonly message: string
  readonly file?: string
  readonly line?: number
}

/** Прочитанный исходник потребителя (`scanSources`) — вход coverage/hardcode-линтеров. */
export interface SourceFile {
  readonly file: string
  readonly content: string
}
