# Architecture overview

ThemeOn compiles typed theme definitions into CSS custom properties and adapter-facing
structures. One canonical compile path feeds CLI, Vite, Nuxt, and conformance tests.

## Pipeline

```
defineTokens / defineTheme          fromDTCG (allowLossy default false)
        \                              /
         v                            v
              ThemeDefinition (frozen)
                        |
            normalizeDsl / IR document
                        |
                        v
                  compileTheme
         (graph, resolve, serialize, fingerprint)
                        |
          +-------------+-------------+
          v             v             v
    ResolvedTheme      CSS      diagnostics[]
          |             |
          v             v
   adapters/runtime   static CSS + Vite manifest (.themeon/)
```

DTCG is interchange only (D2). Tenant JSON patches use a separate security envelope
(`docs/architecture/security-model.md`), not the IR authoring path.

## Public surfaces

| Surface | Import | Use when |
|:--|:--|:--|
| Root | `@themeon/core` | App theme config, resolve, serialize |
| Compiler | `@themeon/core/compiler` | `compileTheme`, manifest builders, staged extensions |
| Runtime | `@themeon/core/runtime` | `applyTheme` in the browser |
| DTCG | `@themeon/core/dtcg` | Import/export design-token files |
| Tenant | `@themeon/core/tenant` | Untrusted patch JSON |

Subpaths re-export the same module instances as the root entry (`compiler-compatibility.md`).

## Delivery (P3)

- **CLI** — `inspect`, `explain`, `graph`, `diff`, `doctor`, `migrate` (dry-run) over one compile.
- **Vite** — `virtual:themeon.css`, atomic `.themeon/manifest.json` (+ optional `csp.json`).
- **Internal tooling** — packed-consumer matrix, internal testing kit (D8), internal Stylelint rules (D9).

## Out of scope (explicit)

- Published `@themeon/testing` / `@themeon/stylelint-plugin` until external reuse proves a package (D8, D9, D4).
- Composer/Blade, new UI adapters, preset registry — see repository [`ROADMAP.md`](https://github.com/axioma-studio/themeon/blob/main/ROADMAP.md).
