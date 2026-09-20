# HANDOFF — 2026-09-20 — after P0.4

**Next:** exec-items: task:plan-exec 2026.09.19-№1-THEMEON-COMPILER-HARDENING P0.5 P0.6

| Параметр | Значение |
|:--|:--|
| Batch | B0-HYGIENE |
| Model class | implementation |
| Effort | high |
| Capabilities | plan-exec · publication/package truth · no npm publish |
| Context | continue-root |
| Суть | Re-admit P0.5 (then P0.6) under compiled Routing. Do not grant residual npm/GitHub configure scope. |

```session-continuity-decision/v1
{"evidence":["batch:0999082d064c57f8293369f0223cc3b55e24c8691c87bd9fd7958be1aed3273c","loaded-inputs:reusable","cold-start-cost:0","lifecycle:scope-complete","checkpoint:artifacts/P0.4/scope-complete.json"],"outcome":"continue-root","reason":"authorized-scope-complete","runnable":true,"schema_version":"session-continuity-decision/v1"}
```

**Native Cursor command:**

```bash
agent --workspace /home/vostrikov/projects/packages/themeon --model composer-2.5 --force --sandbox disabled --trust --approve-mcps 'task:plan-exec 2026.09.19-№1-THEMEON-COMPILER-HARDENING P0.5 P0.6'
```

**Done:** P0.4 closed 🟠 under D10: reusable `verify.yml`, SHA-pinned CI/release, OIDC publish job, pack/SBOM dry-run, token fallback documented. Residual `NPM-TRUSTED-PUBLISHER` remains outside this plan (`predicate_satisfied: false`). Local `pnpm build/lint/typecheck/test/test:int/check:pack` green.

**Remaining:** B0-HYGIENE P0.5–P0.6; close P0. Then remaining P2/P3 under Routing. Do not re-open GREEN P0.1–P0.3. Do not archive.

**Sources of truth:** `plan.md`; `phases/P0/P0.4.md`; `phases/P0/P0.4.state.md`; `decisions/D10-trusted-publisher-deferral.md`; `docs/architecture/release-security.md`; `artifacts/P0.4/external-trust.json`.

**Open risks:** GitHub has only `github-pages`; protected `release` environment and npm trusted publishers are unconfigured. Token fallback remains until that residual grant. Dirty-tree later-phase work must not be mistaken for P0.4 product scope.

**Workarounds/Deferred/Open questions:**
- workarounds: CSS tsdown `neverBundle` lists `@themeon/core/authoring` so TOKEN_BRAND is not inlined into `default.js`
- deferred: NPM-TRUSTED-PUBLISHER residual (D10); `@themeon/testing` and stylelint packages (D8/D9)
- open_questions: D7 solo-rationale nit (owner gate vs D10 routine) — optional later touch
