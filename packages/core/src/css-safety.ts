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
const CONTROL_RE = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F]/

function unsafe(label: string, reason: string, value: string): never {
  throw new ThemeonError(
    'UNSAFE_CSS_TOKEN',
    `${label} ${reason} (CSS-injection guard): ${JSON.stringify(value.length > 120 ? `${value.slice(0, 117)}...` : value)}`,
  )
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
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!
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
