# Fail loud, not silent

Every ThemeOn package that hits an unrecoverable input error throws a typed `ThemeonError`
(`code` + message) instead of guessing, coercing, or falling back to a default. A silently
"fixed" value is worse than a crash: it ships a broken theme that only shows up as a visual bug
weeks later, far from the input that caused it.

The canon is the `ThemeonErrorCode` union in
[`packages/core/src/errors.ts`](https://github.com/axioma-studio/themeon/blob/main/packages/core/src/errors.ts):
`CYCLE` / `UNKNOWN_PATH` / `BAD_VALUE` / `NAME_COLLISION` / `DTCG_PARSE` / `UNSAFE_PATH` /
`UNSAFE_CSS_TOKEN` / `BAD_COLOR` / `DTCG_NAME_COLLISION` / `UNSUPPORTED_TENANT_TYPE`.

✅ **Real project code** — `@themeon/naive` throws `BAD_COLOR` when a resolved color role isn't a
literal color `seemly`/Naive UI can consume (`packages/naive/src/to-native.ts`):

```ts
if (bad.size && (opts?.onInvalidColor ?? 'throw') === 'throw') {
  const lines = Array.from(bad, ([varName, raw]) => `${varName}: ${raw}`)
  throw new ThemeonError(
    'BAD_COLOR',
    `@themeon/naive: ${bad.size} color role(s) are not literal colours — Naive/seemly cannot ` +
      `consume them:\n  ${lines.join('\n  ')}\n` +
      'Colours must be resolvable by colorjs.io (hex/rgb/hsl/oklch/…). ' +
      'var()/color-mix()/light-dark()/currentColor/relative-color/calc() are not supported by seemly.',
  )
}
```

❌ **Antipattern** (illustrative — not real project history): silently skipping the bad role and
letting Naive UI receive `undefined`, or substituting a hardcoded fallback color:

```ts
// Antipattern — do not do this
if (bad.size) {
  // "it'll probably be fine" — Naive UI now renders with a color nobody chose,
  // and nothing in the build or the console tells you why.
  for (const [varName] of bad) componentOverrides[varName] = '#000000'
}
```

**Rule:** on invalid input, throw a `ThemeonError` with an actionable message and the offending
value(s) — never coerce, skip, or fall back silently.
