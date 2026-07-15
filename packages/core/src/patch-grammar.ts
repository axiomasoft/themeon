/**
 * Единственный источник value-грамматики tenant-патча (P6.1, H3 И1). Потребляют и `patch.ts`
 * (валидация + сериализация tenant CSS), и P6.2 (JSON Schema, anti-drift) — регэксп-паттерны
 * экспортируются как СТРОКИ, чтобы схема P6.2 строила `pattern` из ТЕХ ЖЕ источников, а не
 * дублировала грамматику отдельным списком (drift = дыра, не опечатка).
 *
 * Позитивная allowlist-грамматика (OWASP WSTG 4.11.5 / A05:2025 Injection, `R-16 §2`):
 * значение ПРОХОДИТ, только если полностью матчит анкоренный (`^...$`) паттерн своего типа.
 * Метасимволы, которыми CSS-инъекция выходит из значения свойства (терминация правила,
 * комментарии, at-rules, HTML-контекст), отклоняются ОТДЕЛЬНО и РАНЬШЕ per-type-парсинга —
 * defense-in-depth: даже если один анкоренный паттерн окажется неполон, метасимвол-рубеж
 * ловит вектор первым. Скобки `(`/`)` НЕ входят в универсальный reject-набор: легитимны для
 * color-функций (`rgb()`/`oklch()`/…) — для остальных 6 типов анкоренный паттерн их и так не
 * матчит (все 7 типов проверены тест-векторами атак `patch.test.ts`, ни один вектор не
 * зависит от скобок для пробива).
 */

import { ThemeonError } from './errors'
import { COLOR_FN_SPACE_NAMES, NAMED_COLOR_NAMES, formatColor, parseColor } from './dtcg/color'
import type { TokenType } from './types'

/** Composite text-значение патча (уже нормализовано — `lineHeight` всегда строка на выходе,
 *  даже если тенант прислал число, RAW-число коэрсится в `validateTenantTextValue`). */
export interface TextStyleTenantValue {
  size: string
  lineHeight?: string
}

/**
 * Типы, допустимые в tenant-патче v1 (P-D70, дизайн-решение фазы). `shadow`/`gradient`/
 * `cubicBezier` — свободно-форменные CSS-строки, высший риск инъекции — остаются
 * operator-controlled; `applyThemePatch` бросает `UNSUPPORTED_TENANT_TYPE`, не молча
 * пропускает (tenant не должен думать, что кастомизация применилась).
 */
export const ALLOWED_TENANT_TYPES: ReadonlySet<TokenType> = new Set([
  'color',
  'dimension',
  'number',
  'duration',
  'fontFamily',
  'fontWeight',
  'text',
])

/**
 * Строгий конец строки для ОБОИХ потребителей паттерна (P6.2 anti-drift, R-16 §2 failure-path-1):
 * ECMA-262 `$` без `/m` уже строг, но PCRE `$` (внешний PHP/Flex*-валидатор — целевой consumer
 * схемы, см. докблок файла) по умолчанию матчит и ПЕРЕД финальным `\n` — `pattern` тогда
 * пропускает `"1rem\n"`, а `applyThemePatch`/`rejectMetachars` его бросает (`\n` ∈ METACHAR_RE) →
 * schema-accept/core-throw drift. `(?![\s\S])` — negative lookahead «нет ни одного символа
 * дальше» — ведёт себя одинаково в обоих движках (не завязан на `$`/`D`-модификатор).
 */
const END = '(?![\\s\\S])'

// ── Паттерны как строки (SSOT для P6.2 JSON Schema) ──
export const DIMENSION_PATTERN = `^-?\\d{1,4}(\\.\\d{1,4})?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)${END}`
export const NUMBER_PATTERN = `^-?\\d{1,4}(\\.\\d{1,4})?${END}`
export const DURATION_PATTERN = `^\\d{1,5}(\\.\\d{1,4})?(ms|s)${END}`
export const FONT_WEIGHT_PATTERN = `^([1-9]00|normal|bold|bolder|lighter)${END}`
export const FONT_FAMILY_PATTERN = `^[A-Za-z][A-Za-z0-9 _-]{0,63}(, ?[A-Za-z][A-Za-z0-9 _-]{0,63}){0,7}${END}`
export const TEXT_LINE_HEIGHT_PATTERN = `^\\d{1,2}(\\.\\d{1,3})?${END}`

/**
 * `color` не имеет единого exported-регэкспа в `validateColorValue` (14 CSS-нотаций разбирает
 * `parseColor` — программный dispatcher, не один анкоренный паттерн, `dtcg/color.ts`). P6.2
 * (JSON Schema для внешнего PHP-валидатора) тем не менее обязана дать что-то для `pattern` —
 * ниже СТРУКТУРНАЯ огибающая (envelope), построенная из ТЕХ ЖЕ списков имён, что и парсер
 * (`COLOR_FN_SPACE_NAMES`, `NAMED_COLOR_NAMES` — реэкспорт `dtcg/color.ts`, ноль дублирования
 * данных), а не из значений тест-векторов (анти-подгонка). Приоритет — БЕЗОПАСНОСТЬ, не
 * числовая точность: ни одна альтернатива не допускает ни одного символа из `METACHAR_RE`
 * (никаких `\s` — только литеральный пробел, иначе `\n`/`\t` просочились бы обратно), поэтому
 * даже если паттерн где-то ЛОЯЛЬНЕЕ `parseColor` (примет синтаксически похожую, но
 * нераспознанную комбинацию чисел) — это не дыра инъекции, это лишь более раннее расхождение с
 * `parseColor`, которое `applyThemePatch` всё равно перепроверит и добьёт `BAD_VALUE`
 * (defense-in-depth, R-16 §2 «сервер валидирует схемой, ядро ревалидирует»). Anti-drift тест
 * (`schema.test.ts`) проверяет ТОЛЬКО согласие на матрице легальных значений + вектор атак
 * P6.1 — не побитовую эквивалентность `parseColor` для произвольной строки (недостижимо без
 * дублирования самого парсера, что запрещено zero-dep-правилом D12).
 *
 * Регистр и пробелы по краям — сознательно СИММЕТРИЧНЫ `parseColor`: он матчит функции/именованные
 * цвета case-insensitive (`/i` на каждом `parse*` в `dtcg/color.ts`) и обрезает вход `.trim()`
 * ДО диспатча. Литералы ниже пропускаются через {@link ci} (посимвольный `[xX]`-класс — сам
 * паттерн строкой, `pattern`-поле JSON Schema не несёт regex-флагов, поэтому нечувствительность
 * к регистру обязана быть закодирована в теле паттерна, не во флаге), а вся альтернатива обёрнута
 * опциональными краевыми пробелами (`SP`, только литеральный пробел — `\n`/`\t` и так уже в
 * `METACHAR_RE`, до per-type-парсинга сюда не доходят ни при каком вводе). Без этого JSON Schema
 * (внешний PHP-контракт) отклоняла бы легальные `'RED'`/`'OKLCH(...)'`/`' red'`, которые
 * `validateTenantValue('color', …)` принимает — обратный drift (schema reject / core accept).
 */
const CSS_NUM = '-?\\d+(?:\\.\\d+)?%?'
const SP = ' *'
/** Посимвольный case-insensitive char-class для буквенного литерала (regex-метасимволы вроде `?` не трогает). */
function ci(literal: string): string {
  return literal.replace(/[a-zA-Z]/g, (ch) => `[${ch.toLowerCase()}${ch.toUpperCase()}]`)
}
function colorFnPattern(name: string): string {
  const n = ci(name)
  return `${n}\\(${SP}${CSS_NUM}(?:${SP}[, ]${SP}${CSS_NUM}){2}(?:${SP}[,/]${SP}${CSS_NUM})?${SP}\\)`
}
const COLOR_SPACE_FN_PATTERN = `${ci('color')}\\(${SP}(?:${COLOR_FN_SPACE_NAMES.map(ci).join('|')})(?: +${CSS_NUM}){3}(?:${SP}/${SP}${CSS_NUM})?${SP}\\)`
const HEX_PATTERN = '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})'
export const COLOR_PATTERN = `^${SP}(?:${HEX_PATTERN}|${colorFnPattern('rgba?')}|${colorFnPattern(
  'hsla?',
)}|${colorFnPattern('hwb')}|${colorFnPattern('lab')}|${colorFnPattern('lch')}|${colorFnPattern(
  'oklab',
)}|${colorFnPattern('oklch')}|${COLOR_SPACE_FN_PATTERN}|(?:${NAMED_COLOR_NAMES.map(ci).join('|')}))${SP}${END}`

const DIMENSION_RE = new RegExp(DIMENSION_PATTERN)
const NUMBER_RE = new RegExp(NUMBER_PATTERN)
const DURATION_RE = new RegExp(DURATION_PATTERN)
const FONT_WEIGHT_RE = new RegExp(FONT_WEIGHT_PATTERN)
const FONT_FAMILY_RE = new RegExp(FONT_FAMILY_PATTERN)
const TEXT_LINE_HEIGHT_RE = new RegExp(TEXT_LINE_HEIGHT_PATTERN)

/**
 * Метасимволы, ни одному легальному значению ни одного из `ALLOWED_TENANT_TYPES` не нужные:
 * `{`/`}` — терминатор правила/блока; `;` — терминатор декларации; `:` — старт нового
 * свойства/селекторный контекст; `@` — at-rules; `<`/`>` — выход в HTML-контекст (stored XSS,
 * H3 И1); кавычки `"`/`'`/`` ` `` и `\` (включая CSS unicode-escape `\NN` — обратный слэш сам
 * по себе уже reject); перевод строки/таб. `/*` (комментарий) и вызов функции `url(...)`
 * (CSS Exfil, `@import`, R-16 §2) проверяются отдельными паттернами.
 *
 * `URL_RE` матчит `url` ТОЛЬКО как начало вызова функции (`url` + опциональные пробелы + `(` —
 * ровно то, во что CSS-токенайзер разворачивает эксфильтрацию/`@import`), не произвольную
 * подстроку: голое `/url/i` ловило `url` внутри легального именованного цвета `burlywood`
 * (`NAMED_COLOR_NAMES`, `dtcg/color.ts`) — `COLOR_PATTERN` его принимает (в списке имён),
 * `rejectMetachars` бросал `UNSAFE_CSS_TOKEN` ДО того, как `validateColorValue` вообще
 * запускался — schema-accept/core-throw drift на легальном вводе, не инъекции. Сужение до
 * `url\s*\(` не открывает вектор: сам вызов `url(` по-прежнему ловится при любом количестве
 * пробелов перед скобкой, а `(`/`)` не входят в позитивную грамматику ни одного НЕ-color типа
 * (см. докблок файла), color же валидируется `parseColor`, который не распознаёт `url(...)`
 * как цвет и бросит `BAD_VALUE` отдельно.
 */
const METACHAR_RE = /[{};:@<>"'`\\\n\r\t]/
const COMMENT_RE = /\/\*/
const URL_RE = /url\s*\(/i

/** Reject-рубеж ДО per-type-парсинга (defense-in-depth) — throw `UNSAFE_CSS_TOKEN`, fail-loud. */
function rejectMetachars(value: string): void {
  if (METACHAR_RE.test(value) || COMMENT_RE.test(value) || URL_RE.test(value)) {
    throw new ThemeonError(
      'UNSAFE_CSS_TOKEN',
      `Tenant value contains a rejected CSS metacharacter, comment marker or "url(" call: ${JSON.stringify(value)}`,
    )
  }
}

function matchOrThrow(re: RegExp, value: string, type: TokenType): string {
  if (!re.test(value)) {
    throw new ThemeonError(
      'BAD_VALUE',
      `Tenant value for type "${type}" does not match the allowed grammar: ${JSON.stringify(value)}`,
    )
  }
  return value
}

/**
 * Цвет — positive-валидатор `parseColor` (zero-dep, 14 CSS-нотаций) ПОСЛЕ reject метасимволов
 * (defense-in-depth — «parseColor вернул не-null» само по себе не значит «значение
 * безопасно»: непризнанные функциональные нотации типа `expression(...)` уже не матчат ни
 * один известный `parseColor`-паттерн и получают `null`, но полагаться на это как на
 * единственный рубеж запрещено Code Guidance item'а). Значение нормализуется через
 * `formatColor` — канонический вывод, не эхо авторской строки.
 */
function validateColorValue(value: string): string {
  const parsed = parseColor(value)
  if (parsed === null) {
    throw new ThemeonError(
      'BAD_VALUE',
      `Tenant color value is not a recognized CSS color notation: ${JSON.stringify(value)}`,
    )
  }
  return formatColor(parsed)
}

/**
 * `text` — композит `{ size, lineHeight? }` (тот же формат, что `TextStyleValue`, types.ts).
 * Голая строка НЕ принимается: `walkTree`/`isLeaf` (P1.2) уже требуют объект с обязательным
 * строковым `size` для этого класса листа, тот же контракт соблюдается здесь.
 */
function validateTextStyleValue(rawValue: unknown): TextStyleTenantValue {
  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    throw new ThemeonError(
      'BAD_VALUE',
      `Tenant value for type "text" must be an object { size, lineHeight? }, got ${JSON.stringify(rawValue)}`,
    )
  }
  const obj = rawValue as Record<string, unknown>
  const allowedKeys = new Set(['size', 'lineHeight'])
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      throw new ThemeonError(
        'BAD_VALUE',
        `Tenant value for type "text" has an unexpected key "${key}" (allowed: size, lineHeight)`,
      )
    }
  }
  if (typeof obj.size !== 'string') {
    throw new ThemeonError('BAD_VALUE', 'Tenant value for type "text" must have a string "size"')
  }
  rejectMetachars(obj.size)
  const size = matchOrThrow(DIMENSION_RE, obj.size, 'dimension')

  if (obj.lineHeight === undefined) return { size }

  const lineHeightRaw = typeof obj.lineHeight === 'number' ? String(obj.lineHeight) : obj.lineHeight
  if (typeof lineHeightRaw !== 'string') {
    throw new ThemeonError(
      'BAD_VALUE',
      `Tenant "text.lineHeight" must be a string or number, got ${typeof obj.lineHeight}`,
    )
  }
  rejectMetachars(lineHeightRaw)
  if (!TEXT_LINE_HEIGHT_RE.test(lineHeightRaw)) {
    throw new ThemeonError(
      'BAD_VALUE',
      `Tenant "text.lineHeight" does not match the allowed grammar: ${JSON.stringify(lineHeightRaw)}`,
    )
  }
  return { size, lineHeight: lineHeightRaw }
}

/**
 * Валидирует один tenant-значение по грамматике `type` и возвращает нормализованную строку.
 * `type === 'text'` сюда НЕ приходит — композит идёт через {@link validateTenantTextValue}
 * (сигнатура возвращает объект, не строку — размер + опциональная line-height, две
 * CSS-переменные на выходе, `patch.ts` их эмитит порознь).
 *
 * @throws {ThemeonError} `UNSAFE_CSS_TOKEN` на метасимвол/`url`/комментарий;
 *   `BAD_VALUE` на значение вне грамматики типа;
 *   `UNSUPPORTED_TENANT_TYPE` на тип вне {@link ALLOWED_TENANT_TYPES} (shadow/gradient/…).
 */
export function validateTenantValue(type: TokenType, rawValue: unknown): string {
  const value = typeof rawValue === 'number' ? String(rawValue) : rawValue
  if (typeof value !== 'string') {
    throw new ThemeonError(
      'BAD_VALUE',
      `Tenant value for type "${type}" must be a string or number, got ${typeof rawValue}`,
    )
  }
  rejectMetachars(value)
  switch (type) {
    case 'color':
      return validateColorValue(value)
    case 'dimension':
      return matchOrThrow(DIMENSION_RE, value, type)
    case 'number':
      return matchOrThrow(NUMBER_RE, value, type)
    case 'duration':
      return matchOrThrow(DURATION_RE, value, type)
    case 'fontWeight':
      return matchOrThrow(FONT_WEIGHT_RE, value, type)
    case 'fontFamily':
      return matchOrThrow(FONT_FAMILY_RE, value, type)
    default:
      throw new ThemeonError(
        'UNSUPPORTED_TENANT_TYPE',
        `Tenant type "${type}" is not allowed in v1 patches (allowed: ${[...ALLOWED_TENANT_TYPES].join(', ')})`,
      )
  }
}

/** Композит-вариант {@link validateTenantValue} для `type === 'text'` (см. там же). */
export function validateTenantTextValue(rawValue: unknown): TextStyleTenantValue {
  return validateTextStyleValue(rawValue)
}
