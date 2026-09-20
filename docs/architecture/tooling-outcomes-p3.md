# P3 tooling outcomes (evidence-gated)

P3.4 and P3.5 chose **internal** branches; no new npm packages.

| Item | Decision | Location | Promote when |
|:--|:--|:--|:--|
| Testing helpers | D8 | `tests/internal/pack-harness/`, `docs/testing/internal-kit.md` | ≥2 external reuse sites + frozen API |
| Stylelint rules | D9 | `tests/stylelint-internal/`, `docs/testing/stylelint-internal-kit.md` | External Stylelint consumer + frozen API |

Audit recommendations alone do not authorize publication (D4).

**Validation:** `pnpm test:consumers`, `pnpm test:types`, `pnpm test:stylelint`.
