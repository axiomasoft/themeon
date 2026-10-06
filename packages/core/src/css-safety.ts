/**
 * CSS-syntax guards for everything ThemeOn interpolates into a declaration (P0 hardening).
 *
 * `resolveTheme` is the single choke point every emitter reads from (static serializer, Tailwind
 * bridge, runtime applier, UI-kit adapters), so names and values are validated there once, with
 * the token path in the error. Authoring code is trusted, but token trees also arrive through
 * interchange (`fromDTCG` on a Figma / Tokens Studio export, generated files), and a value like
 * `red; } body { background: url(//evil) } :root {` used to be written into `tokens.css`
 * verbatim.
 *
 * The value guard is a tiny tokenizer, not a blacklist regex: `;` inside parentheses or quotes is
 * legitimate (`url("data:image/svg+xml;utf8,…")`), at top level it terminates the declaration.
 * It is not a CSS validator — `--x: banana` stays allowed; only structure-breaking input is
 * rejected.
 */
import { ThemeonError } from './errors'

/**
 * `--` followed by CSS ident code points: ASCII letters, digits, `-`, `_` and any non-ASCII code
 * point from U+00A0 (C1 controls excluded). Covers everything `formatVarName` produces from a sane
 * key, including non-Latin keys (`--color-фон`).
 */
const CUSTOM_PROPERTY_NAME_RE = /^--[\w\-\u00A0-\u{10FFFF}]+$/u

/** C0/C1 control characters (TAB allowed) — never legitimate in a token value. */
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_RE = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F]/

function unsafe(label: string, reason: string, value: string): never {
  throw new ThemeonError(
    'UNSAFE_CSS_TOKEN',
    `${label} ${reason} (CSS-injection guard): ${JSON.stringify(value.length > 120 ? `${value.slice(0, 117)}...` : value)}`,
  )
}

function consumeEscape(value: string, start: number): { character: string; end: number } {
  let end = start + 1
  const hex = /^[\da-f]{1,6}/i.exec(value.slice(end, end + 6))?.[0]
  if (hex === undefined) return { character: value[end]!, end: end + 1 }
  const point = Number.parseInt(hex, 16)
  const character = point === 0 || point > 0x10ffff ? '\uFFFD' : String.fromCodePoint(point)
  end += hex.length
  if (value[end] === ' ' || value[end] === '\t') end++
  return { character, end }
}

/** Consume a CSS name, including hex escapes (e.g. `u\\72l` is `url`). */
function consumeName(value: string, start: number): { name: string; end: number } {
  let name = ''
  let i = start
  while (i < value.length) {
    const ch = value[i]!
    if (/[\w\-\u0080-\uFFFF]/.test(ch)) {
      name += ch
      i++
    } else if (ch === '\\' && i + 1 < value.length) {
      const escape = consumeEscape(value, i)
      name += escape.character
      i = escape.end
    } else {
      break
    }
  }
  return { name, end: i }
}

/**
 * An unquoted URL is a token, not a parenthesized block. A quote inside it produces a bad-url
 * token; CSS then discards input through the next `)`, regardless of apparent string quotes.
 * Reject that recovery path rather than letting our quote state disagree with the browser.
 */
function consumeUnquotedUrl(value: string, start: number, label: string): number {
  for (let i = start; i < value.length; i++) {
    const ch = value[i]!
    if (ch === ')') return i
    if (ch === '\\') {
      if (i + 1 === value.length) unsafe(label, 'has an unterminated URL escape', value)
      i = consumeEscape(value, i).end - 1
      continue
    }
    if (ch === ' ' || ch === '\t') {
      while (value[i + 1] === ' ' || value[i + 1] === '\t') i++
      if (value[i + 1] !== ')') unsafe(label, 'has whitespace inside an unquoted URL', value)
    }
    if (/['"({}]/.test(ch) || (ch === '/' && value[i + 1] === '*')) {
      unsafe(label, 'has an unsafe unquoted URL', value)
    }
  }
  return unsafe(label, 'has an unterminated URL', value)
}

/** Throws `UNSAFE_CSS_TOKEN` unless `name` is a well-formed custom property name. */
export function assertSafeCustomPropertyName(name: string, label: string): void {
  if (!CUSTOM_PROPERTY_NAME_RE.test(name)) {
    unsafe(label, 'is not a valid CSS custom property name', name)
  }
}

/**
 * Throws `UNSAFE_CSS_TOKEN` if `value` could escape its declaration: a top-level `;`, any `{`/`}`
 * outside a string, a comment opener, unbalanced quotes/brackets, a dangling escape, control
 * characters, or an HTML end-tag opener `</` (the CSS may be inlined into a `<style>` element).
 */
export function assertSafeDeclarationValue(value: string, label: string): void {
  if (CONTROL_RE.test(value)) unsafe(label, 'must not contain control characters', value)
  if (value.includes('</') || value.includes('<!--')) {
    unsafe(label, 'must not contain "</" or "<!--"', value)
  }

  let quote: '"' | "'" | null = null
  const closers: string[] = []
  // Most token values contain neither url() nor escapes. They need only the structural scan.
  // Escapes take the full name-token path because CSS can spell `url` as `u\72l`.
  const mayContainUrl = /url|\\/i.test(value)
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!
    if (mayContainUrl && quote === null && /[\w\-\\\u0080-\uFFFF]/.test(ch)) {
      const { name, end } = consumeName(value, i)
      if (end > i) {
        if (name.toLowerCase() === 'url' && value[end] === '(') {
          let content = end + 1
          while (value[content] === ' ' || value[content] === '\t') content++
          if (value[content] !== '"' && value[content] !== "'") {
            i = consumeUnquotedUrl(value, content, label)
            continue
          }
        }
        i = end - 1
        continue
      }
    }
    if (ch === '\\') {
      if (i === value.length - 1) unsafe(label, 'must not end with a backslash', value)
      i++ // escaped code point is inert
      continue
    }
    if (quote !== null) {
      if (ch === quote) quote = null
      continue
    }
    switch (ch) {
      case '"':
      case "'":
        quote = ch
        break
      case '(':
        closers.push(')')
        break
      case '[':
        closers.push(']')
        break
      case ')':
      case ']':
        if (closers.pop() !== ch) unsafe(label, `has an unbalanced "${ch}"`, value)
        break
      case '{':
      case '}':
        return unsafe(label, 'must not contain "{" or "}" outside a string', value)
      case ';':
        if (closers.length === 0) unsafe(label, 'must not contain a top-level ";"', value)
        break
      case '/':
        if (value[i + 1] === '*') unsafe(label, 'must not contain a comment', value)
        break
      default:
        break
    }
  }
  if (quote !== null) unsafe(label, 'has an unterminated string', value)
  if (closers.length > 0) unsafe(label, `has an unclosed "${closers.at(-1) === ')' ? '(' : '['}"`, value)
}

/** Color schemes are interpolated as declaration values, including for JS callers. */
export function assertSafeColorScheme(value: unknown, label: string): asserts value is 'light' | 'dark' {
  if (value !== 'light' && value !== 'dark') {
    throw new ThemeonError('BAD_VALUE', `${label} must be 'light' or 'dark'`)
  }
}

/**
 * Throws `UNSAFE_CSS_TOKEN` unless `value` can sit inside a double-quoted attribute selector
 * (`[data-theme="…"]`): no `"`, backslash, control characters or the generic structural
 * metacharacters rejected by `assertSafeCssToken`.
 */
export function assertSafeAttributeValue(value: string, label: string): void {
  if (/["\\{}<;@]/.test(value) || CONTROL_RE.test(value)) {
    unsafe(label, 'must not contain quotes, backslash, "{", "}", "<", ";", "@" or control characters', value)
  }
}
