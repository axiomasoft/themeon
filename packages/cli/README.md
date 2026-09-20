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
themeon init [--force] [--tailwind]      # scaffold theme/theme.config.ts (+ optional Tailwind bridge stub)
themeon build [--config] [--out] [--tailwind] [--ref-layer] [--aliases]
                                          # compile theme/theme.config.ts → tokens.css (+ optional Tailwind bridge)
themeon check [--config] [--src] [--out] [--tailwind] [--ignore] [--no-coverage] [--no-contrast]
              [--no-hardcode] [--allow-px] [--coverage-ignore]
                                          # lint token coverage / APCA contrast / hardcoded values
themeon inspect [--config] [--format pretty|json|github] [--ref-layer] [--aliases]
                                          # compiler fingerprint, counts and diagnostics
themeon explain <token> [--config] [--format pretty|json|github] [--ref-layer] [--aliases]
                                          # alias chain, CSS variable and theme overrides
themeon graph [--config] [--format pretty|json|github] [--ref-layer] [--aliases]
                                          # alias reference graph (deterministic, capped)
themeon diff <old> [new] [--format pretty|json|github] [--ref-layer] [--aliases]
                                          # semantic diff between two configs (versioned change classes)
themeon doctor [--config] [--baseline] [--format pretty|json|github] [--ref-layer] [--aliases]
                                          # compile/graph health; optional baseline diff + dry-run hints
themeon migrate <from> [to] [--format pretty|json|github] [--ref-layer] [--aliases]
                                          # dry-run migration hints only (never writes sources)
themeon schema [--config] [--out]         # tenant-patch JSON Schema (draft 2020-12)
```

`themeon --help` lists all subcommands.

Query commands (`inspect`, `explain`, `graph`) share one compiler query layer and emit
versioned JSON when `--format json` (schema version `1`). Semantic commands (`diff`, `doctor`,
`migrate`) use schema version `1` with additive change classes (`token.added`, `value.changed`,
`token.renamed.candidate`, …). Each hint names confidence and evidence; rename-like matches stay
`safety: unknown` when ambiguous. `migrate` is dry-run only. Exit code `1` on compile/graph
blocking errors, unknown explain paths, or breaking semantic diffs; warnings alone do not fail
unless paired with errors. `--format github` prints GitHub Actions workflow annotations for
diagnostics only.

## `themeon init`

Writes a starter `theme/theme.config.ts` (a minimal neutral+accent theme built with `defineTheme`
from `@themeon/core`) into the current directory — not the project root: a theme file living at
the root prevents `@themeon/nuxt`'s dev-watcher from doing granular CSS hot-reload (it would have
to watch the whole project). Re-running `init` without `--force` never overwrites an existing
file — it prints a warning and skips it instead. Pass `--tailwind` to also scaffold a
`tailwind-bridge.css` stub with instructions for the Tailwind v4 bridge (`themeon build
--tailwind`).

After `init`, add the printed `@import "@themeon/css"` line to your CSS entry point.

## `themeon build`

jiti-loads `--config` (default `theme/theme.config.ts`), runs it through `@themeon/core`'s
`resolveTheme`/`serializeThemeCss`, and writes `--out` (default `tokens.css`). Pass `--tailwind
<path>` to also emit a Tailwind v4 `@theme reference` bridge (`@themeon/tailwind`) at that path.
`--ref-layer`/`--aliases` are passed through to `resolveTheme`.

## `themeon check`

Three linters, run against `--config` (default `theme/theme.config.ts`) + your source files
(default glob `**/*.css`, `**/*.vue`; override with `--src`):

- **token coverage** — flags `var(--x)` references to variables ThemeOn doesn't generate
  (`error`) and tokens ThemeOn generates but nothing references (`warning`). A literal
  `var(--x, fallback)` fallback is never treated as a separate reference. Project-owned or
  third-party custom properties (component-library vars like `--reka-*`, your own `--pad`, …)
  aren't ThemeOn tokens either — use `--coverage-ignore <prefix1,prefix2,…>` to exclude them from
  the dead-ref `error` instead of disabling the whole linter with `--no-coverage`.
- **contrast** — WCAG 2.2 AA (normative) plus APCA (advisory) on the semantic pairs from
  `SEMANTIC_CONTRAST_PAIRS`/`checkThemeContrast` (`@themeon/colors`, shared with `@themeon/css`'s
  build-time gate). WCAG failures are `error` (`THEMEON_CONTRAST_WCAG_AA`); APCA-only findings are
  `warning` (`THEMEON_CONTRAST_APCA_ADVISORY`). Unparseable colors and indeterminate contexts are
  fail-closed (`error` / `warning`, not skip).
- **hardcode** — hex literals, raw `Npx` values (0/1 allowed by default, `--allow-px` extends the
  allowlist) and `rgb()`/`hsl()`/`oklch()` literals in your source files. Always a `warning` — it
  never fails the build on its own.

**Scan exclusions.** ThemeOn's own generated output must never be scanned as if it were your
source (it would report false hardcode warnings and make `unused` coverage always read `0`, since
a Tailwind bridge references every token by construction). Two independent defenses:
1. **Path-based**: `node_modules`/`dist`/`.output`/`.nuxt`, plus the *actual* `--out` (default
   `tokens.css`, same default as `build`), `--tailwind` and `--config` paths passed to this same
   `check` invocation, plus any extra globs from `--ignore` (comma-separated).
2. **Content-based** (works even without matching flags): any file whose content starts with a
   ThemeOn "generated by" banner is skipped regardless of its path — both `themeon build` outputs
   carry one by default.

If, after exclusions, the scan matches zero files, `check` reports a `warning` (`no sources
scanned`) instead of silently treating an empty input as a clean pass.

Exit code is `1` only when at least one `error`-level finding was reported; warnings never affect
the exit code. Disable a linter with `--no-coverage`/`--no-contrast`/`--no-hardcode`.
