# Architecture Decision Records (IR)

Accepted decisions for the canonical IR and compatibility boundaries. Execution-plan decisions
(D1–D9) live in the
[plan decisions folder](https://github.com/axioma-studio/themeon/tree/main/plans/2026.09.19-%E2%84%961-THEMEON-COMPILER-HARDENING/decisions).

| ADR | File | Summary |
|:--|:--|:--|
| Identity | [ir-identity.md](./ir-identity) | Path tuple is canonical token identity |
| References | [ir-references.md](./ir-references) | Alias graph and resolution policy |
| Metadata | [ir-metadata.md](./ir-metadata) | `$description`, `$deprecated`, extensions |
| Immutability | [ir-immutability.md](./ir-immutability) | Frozen IR documents and outputs |
| Compatibility | [ir-compatibility.md](./ir-compatibility) | Additive public evolution rules |

**Drift:** `pnpm check:docs-architecture` ensures this index lists every `ir-*.md` file.
