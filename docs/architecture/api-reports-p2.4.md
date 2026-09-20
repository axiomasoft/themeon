# API declaration reports (P2.4)

## Tool decision

| Option | Verdict |
|:--|:--|
| **@microsoft/api-extractor** | Rejected for this lane — extra config/rollup per package, review noise from formatter churn, and overlap with existing `api.test.ts` export-name freezes. |
| **TypeScript compiler API rollup** | Rejected — duplicates tsdown emit; harder to keep aligned with published tarball layout. |
| **Packed `.d.ts` text snapshots** (`scripts/generate-api-report.mjs`) | **Adopted** — reuses P2.3 `pack-consumer-tarballs.mjs`, reviews generic signatures/unions on real export-map entry files, separates formatting via `normalizeDts`. |

Reports cover **only** `package.json` `exports` entries that declare `types` (CSS paths excluded).

## Baselines and commands

| Command | Purpose |
|:--|:--|
| `pnpm api-report:update` | `pnpm build`, pack tarballs, refresh `etc/api/*.api.md` |
| `pnpm check:api` | Fail with unified diff when packed declarations drift |
| `node --test scripts/api-report-self-check.test.mjs` | Proves the gate is not a no-op |

Baselines are human-reviewed; intentional public type changes update them in the same PR as the code change.

## CI

`verify.yml` runs `pnpm check:api` after the consumer matrix. `pnpm test:types` adds positive/negative compile fixtures against the same packed tarballs.
