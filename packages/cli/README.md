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
themeon init [--force] [--tailwind]   # scaffold theme.config.ts (+ optional Tailwind bridge stub)
themeon build                          # compile theme.config.ts → tokens.css (implemented in P4.4)
themeon check                          # lint token coverage / APCA contrast / hardcoded values (implemented in P4.5)
```

`themeon --help` lists all three subcommands.

## `themeon init`

Writes a starter `theme.config.ts` (a minimal neutral+accent theme built with `defineTheme`
from `@themeon/core`) into the current directory. Re-running `init` without `--force` never
overwrites an existing file — it prints a warning and skips it instead. Pass `--tailwind` to
also scaffold a `tailwind-bridge.css` stub with instructions for the Tailwind v4 bridge
(`themeon build --tailwind`, P4.4).

After `init`, add the printed `@import "@themeon/css"` line to your CSS entry point.

## `build` / `check`

Registered now as stubs (print a "not implemented yet" warning and exit 0) so `themeon --help`
already shows the full command surface. Real implementations:

- `build` — jiti-loads `theme.config.ts`, runs it through `@themeon/core`'s
  `resolveTheme`/`serializeThemeCss`, and writes `tokens.css` (+ optional Tailwind bridge) — P4.4.
- `check` — three linters (token coverage, APCA contrast, hardcoded hex/px values) — P4.5.
