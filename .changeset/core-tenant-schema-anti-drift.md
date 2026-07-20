---
"@themeon/core": minor
"@themeon/cli": minor
---

New `tenantThemeSchema(base, opts?)` in `@themeon/core` — builds a JSON Schema (draft 2020-12)
describing the legal multi-tenant sys-patch shape for a given resolved theme: only
`ALLOWED_TENANT_TYPES` paths are included, every leaf's `pattern` is drawn from the exact same
grammar constants that `applyThemePatch`/`serializeThemePatch` validate against
(`patch-grammar.ts`, single source of truth — no second copy of the regexes), and
`additionalProperties: false` rejects tenant-added keys at every level. This is the external
contract a PHP/Flex* server validates tenant input against before ever calling into
`@themeon/core` (defense-in-depth — the core still re-validates independently). New CLI command
`themeon schema [--out <file.json>]` (`themeon` package) emits it from a `theme.config.ts`.
