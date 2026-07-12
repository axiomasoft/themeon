# themeon

ThemeOn design-token CLI: scaffold a theme, compile it to CSS, and lint your project against
it. Bare `themeon` package name (not `@themeon/*`) — this is the CLI umbrella, not a scoped
library adapter.

## Install

```sh
npm i -D themeon
```

## Commands

```sh
themeon init [--force] [--tailwind]      # scaffold theme.config.ts (+ optional Tailwind bridge stub)
themeon build [--config] [--out] [--tailwind] [--ref-layer] [--aliases]
                                          # compile theme.config.ts → tokens.css (+ optional Tailwind bridge)
themeon check [--config] [--src] [--no-coverage] [--no-contrast] [--no-hardcode] [--allow-px]
              [--coverage-ignore]
                                          # lint token coverage / APCA contrast / hardcoded values
```

`themeon --help` lists all three subcommands.

## `themeon init`

Writes a starter `theme.config.ts` (a minimal neutral+accent theme built with `defineTheme`
from `@themeon/core`) into the current directory. Re-running `init` without `--force` never
overwrites an existing file — it prints a warning and skips it instead. Pass `--tailwind` to
also scaffold a `tailwind-bridge.css` stub with instructions for the Tailwind v4 bridge
(`themeon build --tailwind`).

After `init`, add the printed `@import "@themeon/css"` line to your CSS entry point.

## `themeon build`

jiti-loads `theme.config.ts`, runs it through `@themeon/core`'s `resolveTheme`/`serializeThemeCss`,
and writes `--out` (default `tokens.css`). Pass `--tailwind <path>` to also emit a Tailwind v4
`@theme inline` bridge (`@themeon/tailwind`) at that path. `--ref-layer`/`--aliases` are passed
through to `resolveTheme`.

## `themeon check`

Three linters, run against `theme.config.ts` + your source files (default glob
`**/*.css`, `**/*.vue`; override with `--src`):

- **token coverage** — flags `var(--x)` references to variables ThemeOn doesn't generate
  (`error`) and tokens ThemeOn generates but nothing references (`warning`). A literal
  `var(--x, fallback)` fallback is never treated as a separate reference. Project-owned or
  third-party custom properties (component-library vars like `--reka-*`, your own `--pad`, …)
  aren't ThemeOn tokens either — use `--coverage-ignore <prefix1,prefix2,…>` to exclude them from
  the dead-ref `error` instead of disabling the whole linter with `--no-coverage`.
- **contrast** — APCA contrast of a fixed set of semantic text-on-bg role pairs (`--color-text`
  on `--color-bg-page`, etc.), for the base theme and every theme patch. Reuses
  `checkContrast`/`LC_THRESHOLDS` from `@themeon/colors` — fail-closed: an unparseable color is
  an `error`, not a skip. A failing pair is an `error`.
- **hardcode** — hex literals, raw `Npx` values (0/1 allowed by default, `--allow-px` extends the
  allowlist) and `rgb()`/`hsl()`/`oklch()` literals in your source files. Always a `warning` — it
  never fails the build on its own. `tokens.css` and `*.config.ts` files are excluded from the
  scan (their literals are the source of truth).

Exit code is `1` only when at least one `error`-level finding was reported; warnings never affect
the exit code. Disable a linter with `--no-coverage`/`--no-contrast`/`--no-hardcode`.
