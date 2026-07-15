# CLI (`themeon`)

`init` / `build` / `check` — scaffold a theme, compile it to `tokens.css`, lint token
coverage, contrast and hardcoded values.

## Main exports

| Command / export | What it does |
|:--|:--|
| `themeon init` | Scaffolds `theme/theme.config.ts` (minimal neutral+accent theme via `defineTheme`); `--tailwind` also scaffolds a bridge stub. |
| `themeon build` | Compiles `theme.config.ts` → `tokens.css` (`resolveTheme`/`serializeThemeCss`); `--tailwind <path>` also emits the Tailwind bridge. |
| `themeon check` | Three linters against config + source files: token coverage, APCA contrast, hardcoded values. |
| `runInit` / `runBuild` / `runCheck` / `runSchema` (`.` JS entry) | Programmatic API behind the three subcommands — for embedding/testing outside the CLI binary. |

## Example

```sh
npm i -D themeon
themeon init                 # writes theme/theme.config.ts
themeon build                # theme/theme.config.ts → tokens.css
themeon check                # token coverage / APCA contrast / hardcode lint
```

Exit code is `1` only when at least one `error`-level `check` finding was reported — warnings
never affect the exit code.

Full API & options → [`packages/cli/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/cli#readme).
