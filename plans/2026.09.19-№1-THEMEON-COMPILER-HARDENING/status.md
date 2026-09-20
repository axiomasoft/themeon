<!-- plan-projection
projection: status-view
projection_version: v1
source_scope: plan core + phases + journal
through: 2026-09-20
inputs_sha256: 380c87be349b7ce0a71e890064e62531071357e57f270d509c7a7308ffbb351e
generated_by: task plan-views status
-->

# Статус плана

> Не править руками: это генерируемый вид.

## 0. Meta

| Поле | Значение |
|:--|:--|
| Version | — |
| Status | 🟡 In progress |
| Last Updated | 2026-09-20 |

## 4. Phase Index & Status Board

| Phase | Title | Items 🟢/всего | Status |
|:--|:--|:--|:--|
| P0 | Correctness, security and release foundation | 3/6 | 🟡 In progress |
| P1 | Canonical IR, compiler pipeline and diagnostics | 6/6 | 🟢 Done |
| P2 | Verification and external-consumer contracts | 0/6 | 🟡 In progress |
| P3 | Explainability, delivery tooling and durable documentation | 0/6 | 🟡 In progress |

## Phase P0

| ID | Title | Status | Updated |
|:--|:--|:--|:--|
| P0.1 | DTCG 2025.10 support and loss contract | 🟢 Done | 2026-09-20 |
| P0.2 | WCAG 2.2 normative contrast policy | 🟢 Done | 2026-09-20 |
| P0.3 | Tenant patch security envelope | 🟢 Done | 2026-09-20 |
| P0.4 | Trusted release and reusable verification | 🟠 Done with deviations | 2026-09-20 |
| P0.5 | Publication/package truth and dependency hygiene | 🟡 In progress | 2026-09-20 |
| P0.6 | Measured critical coverage gates | 🟡 In progress | 2026-09-20 |

## Phase P1

| ID | Title | Status | Updated |
|:--|:--|:--|:--|
| P1.1 | Characterize contracts and freeze IR ADRs | 🟢 Done | 2026-09-20 |
| P1.2 | Canonical immutable IR and input normalizers | 🟢 Done | 2026-09-20 |
| P1.3 | Reference graph and deterministic resolution | 🟢 Done | 2026-09-20 |
| P1.4 | Structured diagnostic contract and adapters | 🟢 Done | 2026-09-20 |
| P1.5 | Staged compiler, fingerprint and scoped extensions | 🟢 Done | 2026-09-20 |
| P1.6 | Additive subpaths and compatibility migration | 🟢 Done | 2026-09-20 |

## Phase P2

| ID | Title | Status | Updated |
|:--|:--|:--|:--|
| P2.1 | Property suites and deterministic generators | 🟡 In progress | 2026-09-20 |
| P2.2 | Targeted mutation gates for critical logic | 🟡 In progress | 2026-09-20 |
| P2.3 | Packed external-consumer matrix | 🟡 In progress | 2026-09-20 |
| P2.4 | API reports and TypeScript compatibility fixtures | ⬜ Not started | — |
| P2.5 | Portable performance and HMR budgets | 🟡 In progress | 2026-09-20 |
| P2.6 | Browser and adapter conformance; testing-kit verdict | 🟡 In progress | 2026-09-20 |

## Phase P3

| ID | Title | Status | Updated |
|:--|:--|:--|:--|
| P3.1 | Versioned inspect, explain and graph CLI | 🟡 In progress | 2026-09-20 |
| P3.2 | Semantic diff, doctor and migration dry-run | 🟡 In progress | 2026-09-20 |
| P3.3 | Typed Vite module, manifest and CSP artifact | 🟡 In progress | 2026-09-20 |
| P3.4 | Evidence-based testing-kit disposition | 🟡 In progress | 2026-09-20 |
| P3.5 | Evidence-gated stylelint integration | 🟡 In progress | 2026-09-20 |
| P3.6 | Durable architecture and compatibility docs | 🟡 In progress | 2026-09-20 |

## 6. Update Log

| Дата | Кто (role/model) | Что |
|:--|:--|:--|
| 2026-09-19 | plan-designer/gpt-5.6-sol/high | plan-design · no-op · Created layout-v2 upper layer from audits/2026-09-19-audit.md; detailed P0.1-P0.6; added P1-P3 skeleton contracts, D1-D4 and audit verdict matrix. Route capture required the marketplace root on PYTHONPATH. |
| 2026-09-19 | plan-designer/gpt-5.6-sol/high | plan-design · no-op · note сокращена; полный текст: journal.jsonl:2 |
| 2026-09-19 | plan-designer/gpt-5.6-sol/high | plan-design · no-op · Session-economy refinement: grouped compatible adjacent items into 12 execution sessions (P0=4, P1=2, P2=3, P3=3), retained item-level acceptance and kept phase, context and owner-gate boundaries explicit in D7. |
| 2026-09-19 | plan-auditor/composer-2.5/high | plan-audit · audit-green · Whole-plan design audit GREEN: 24/24 item specs, routing/roadmap/D7 aligned, P0.1 bundle digest matches plan.md; findings F1-F2 minor only. plan-lint/plan-delivery not run (shell hook). Report: findings/design-audit-2026-09-19.md; handoff opened exec P0.1. |
| 2026-09-19 | plan-exec/composer-2.5/high | plan-exec · no-op · DTCG matrix docs/standards/dtcg-2025.10.md; structured diagnostics; allowLossy default false; fixtures+matrix-coverage tests. Shell validation blocked by project hook. |
| 2026-09-19 | plan-exec/composer-2.5/high | plan-exec · no-op · WCAG 2.2 ratio API (wcag22.ts); checkThemeContrast normative pass vs apcaPass; CLI codes THEMEON_CONTRAST_WCAG_AA/APCA_ADVISORY/INDETERMINATE. Tests not run (shell hook). |
| 2026-09-19 | plan-run/grok-4.6/high | plan-run · in-progress · note сокращена; полный текст: journal.jsonl:7 |
| 2026-09-19 | grok-4.6/high | plan-run · closed-green · Tenant patch security envelope GREEN: branding default, TENANT_PATCH_POLICIES SSOT, envelope+parity. core test 330, typecheck, build. |
| 2026-09-19 | grok-4.6/high | plan-run · closed-green · Tenant patch security envelope GREEN: branding default, TENANT_PATCH_POLICIES SSOT, envelope+parity. core test 330, typecheck, build. |
| 2026-09-19 | plan-run/grok-4.6/high | plan-run · in-progress · START repository-only. Cursor cannot attest owner invocation; NPM-TRUSTED-PUBLISHER ungranted. Token fallback stays; no npm/GitHub mutate. |
| 2026-09-19 | plan-run/grok-4.6/high | plan-run · in-progress · Repo verify/release plumbing landed. Waiting NPM-TRUSTED-PUBLISHER: GitHub env release + npm OIDC. Token fallback kept. Checkpoint artifacts/P0.4/external-trust.json. |
| 2026-09-19 | plan-run/grok-4.6/high | plan-run · closed-green · Publication truth: README/install/changelog; 0.0.0 Changesets docs; dedupe cli/naive/tailwind devDeps; scripts/check-package-manifests.mjs. |
| 2026-09-19 | plan-run/composer-2.5/high | plan-run · closed-green · Measured critical coverage: coverage-baseline.json, vitest scoped includes, check-critical-coverage.mjs, testing-strategy.md; verify.yml wired. |
| 2026-09-19 | grok-4.6/high | plan-run · closed-green · P0.4 repo+CI closed-green. Owner deferred NPM-TRUSTED-PUBLISHER; token fallback kept; no publish. Journal close restored after missing terminal event. |
| 2026-09-19 | grok-4.6/high | plan-exec · in-progress · Resume P0.1: product already on disk; run declared Validation and close. |
| 2026-09-19 | grok-4.6/high | plan-exec · closed-green · DTCG 2025.10 matrix, diagnostics, allowLossy default false, fixtures+coverage tests. core 330, typecheck, build, pack. |
| 2026-09-19 | grok-4.6/high | plan-exec · in-progress · Resume P0.2: product already on disk; run declared Validation and close. |
| 2026-09-19 | grok-4.6/high | plan-exec · closed-green · WCAG 2.2 ratio API beside APCA advisory; CLI codes AA/APCA/indeterminate. colors 422, cli 50, typechecks. CLI vitest project name repaired. |
| 2026-09-19 | grok-4.6/high | plan-run · in-progress · START B1-MODEL P1.1: characterize authoring-runtime seams and freeze IR ADRs. No semantic production edit. |
| 2026-09-19 | grok-4.6/high | plan-run · closed-green · Characterized authoring-runtime seams; froze IR ADRs (identity/refs/metadata/immutability/compatibility). No production semantic edit. core 334. |
| 2026-09-19 | grok-4.6/high | plan-run · in-progress · START P1.2: canonical immutable IR, DSL/DTCG normalizers, compatibility facade. No root export change. |
| 2026-09-19 | grok-4.6/high | plan-run · closed-green · Canonical IR + DSL/DTCG normalizers + ThemeDefinition facade. Metadata on IR, not public Token. Root exports unchanged. |
| 2026-09-19 | grok-4.6/high | plan-run · in-progress · START P1.3: reference graph, identity-order resolution, cycle/missing policy, resolveTheme adapter. |
| 2026-09-19 | grok-4.6/high | plan-run · closed-green · P1.3 GREEN: alias graph CYCLE/MISSING_REF/DEPTH, Kahn identity-order, resolveTheme adapter, permutation-stable CSS. core 345/typecheck/build. |
| 2026-09-20 | grok-4.6/high | plan-run · in-progress · START P1.4: structured diagnostic contract, pretty/plain/json adapters, CLI/Vite/Nuxt mapping. No GitHub formatter. |
| 2026-09-20 | grok-4.6/high | plan-run · closed-green · P1.4 GREEN: structured Diagnostic schema/catalog, ThemeonError+graph+DTCG mapping, pretty/plain/json adapters, CLI/Vite/Nuxt consume codes. GitHub formatter deferred to P3. core 358/typecheck/build. |
| 2026-09-20 | grok-4.6/high | plan-run · in-progress · START P1.5: staged compiler, fingerprint, scoped extensions. Keep root exports. No new package. |
| 2026-09-20 | grok-4.6/high | plan-run · closed-green · P1.5 GREEN: staged compiler, fingerprint, scoped extensions. Root exports unchanged. core 375, root 1416, typecheck/build/lint/pack. |
| 2026-09-20 | grok-4.6/high | plan-run · in-progress · — |
| 2026-09-20 | grok-4.6/high | plan-run · closed-green · P1.6 GREEN: additive authoring/compiler/runtime/dtcg/tenant subpaths; root kept; packed ESM identity; consumers migrated. core 384, root 1425. |
| 2026-09-20 | grok-4.6/high | plan-close · closed-green · P1 GREEN direct-close: IR, graph, diagnostics, staged compiler, additive subpaths. |
| 2026-09-20 | plan-exec/composer-2.5/high | plan-exec · closed-green · P2.1 GREEN: property laws + generators + replay corpus; fast-check on @themeon/core only. |
| 2026-09-20 | plan-exec/composer-2.5/high | plan-exec · closed-green · P2.2 GREEN: Stryker targeted MSI gate on critical compiler paths; survivor triage ledger; not on PR verify. |
| 2026-09-20 | plan-exec/composer-2.5/high | plan-exec · closed-green · P2.3 GREEN: packed tarball external-consumer matrix; file: install, no workspace links; CI verify lane. |
| 2026-09-20 | plan-exec/composer-2.5/high | plan-exec · closed-green · P2.5 GREEN: benchmark corpus/harness, +30% regression budgets, Vite load warm path, correctness fingerprints; not on PR verify. |
| 2026-09-20 | plan-exec/composer-2.5/high | plan-exec · closed-green · P2.6 GREEN: adapter conformance matrix, compiled-contract fixture, D8 defer @themeon/testing, browser.yml periodic FF/WebKit, docs/testing/conformance.md. int-fast conformance 11 pass. |
| 2026-09-20 | plan-exec/composer-2.5/high | plan-exec · closed-green · P3.1 GREEN: themeon inspect/explain/graph, shared query layer, CLI schema v1, pretty/json/github + exit contract; core github diagnostics + compiler graph exports. core 399, cli 56 tests. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · in-progress · START P3.2: semantic diff, doctor, migrate dry-run on CLI query layer. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · closed-green · P3.2 GREEN: themeon diff/doctor/migrate, semantic schema v1, rename ambiguity + breaking fixtures. cli 63 tests, typecheck. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · in-progress · START P3.3: typed Vite virtual module, manifest/CSP artifacts, atomic watch output. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · closed-green · P3.3 GREEN: compileTheme delivery, @themeon/vite/client types, .themeon manifest+csp artifacts (atomic), consumer manifest read. core 402, vite 21 tests. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · in-progress · START P3.4: evidence-based testing-kit disposition (internal vs package). |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · closed-green · P3.4 GREEN: D8 affirmed internal; tests/internal/pack-harness shared by consumers+types; docs/testing/internal-kit.md. test:consumers 10, test:types 6. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · in-progress · START P3.5: evidence-gated stylelint (internal vs package vs skip). |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · closed-green · P3.5 GREEN: D9 internal stylelint kit; manifest deprecatedCssVariables; tests/stylelint-internal 5 tests; pnpm test:stylelint. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · in-progress · START P3.6: durable architecture docs, ADR index, drift checks. |
| 2026-09-20 | plan-run/composer-2.5/high | plan-run · closed-green · P3.6 GREEN: docs/architecture+adr index, check:docs-architecture, verify.yml, ROADMAP restored, docs:build. Phase P3 closed. |
| 2026-09-20 | gpt-5.6-sol/xhigh | plan-audit · audit-red · Whole-plan design audit RED: uncommitted candidate; invalid lifecycle evidence; Routing mismatches; P0.4 gate false. Evidence: findings/design-audit-2026-09-20.md. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: unproved terminal (route/schema/gate). Re-admit after fresh audit. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · write-site: pre_mutation: allow · pre_final: allow |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: Required Reads retargeted to P1 closure; prior terminal spec stale. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · D12 reopen: Required Reads retargeted to P1 closure; prior terminal spec stale. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · Design-finish: D10-D13, journal recovery, unproved items reopened, lint 0. Next audit-design. |
| 2026-09-20 | plan-auditor/grok-4.6/high | plan-audit · in-progress · START whole-plan design audit of D10-D13 finish candidate. Read-only over product. |
| 2026-09-20 | plan-auditor/grok-4.6/high | plan-audit · audit-red · Whole-plan design audit RED: uncommitted candidate; P0.4 Authority still gates successor; phase indexes stale; plan.md still opens P0.1. Evidence: findings/design-audit-2026-09-20-post-finish.md. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · START design-finish remediation of post-finish RED F1–F4. Authority routine; indexes; successor P0.4. No product. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · Design-finish F1–F4: P0.4 Authority routine; indexes=generated status; successor P0.4; lint 0. Next audit-design after git-commit. |
| 2026-09-20 | plan-auditor/grok-4.6/high | plan-audit · in-progress · START whole-plan design audit of committed F1–F4 candidate. Read-only over product. |
| 2026-09-20 | plan-auditor/grok-4.6/high | plan-audit · audit-red · Whole-plan design audit RED: frozen P3.6 bundle not byte-fresh vs status.md; plan-lint 1 error. Prior F1–F4 closed. Evidence: findings/design-audit-2026-09-20-committed.md. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · in-progress · START design-finish of committed-audit F1–F2. Rebuild P3.6 bundle after status; Routing why D10. No product. |
| 2026-09-20 | plan-designer/grok-4.6/high | plan-design · no-op · Design-finish committed-audit F1–F2: P3.6 bundle rebuilt after status; P0.4 Routing why D10. Next audit-design after git-commit. |
| 2026-09-20 | plan-auditor/grok-4.6/high | plan-audit · in-progress · START whole-plan design audit of committed F1–F2 candidate. Read-only over product. |
| 2026-09-20 | plan-auditor/grok-4.6/high | plan-audit · audit-green · Whole-plan design audit GREEN: committed F1–F2 freeze lint-clean; P0.4 Authority routine; successor P0.4. Evidence: findings/design-audit-2026-09-20-committed-f1-f2.md. |
| 2026-09-20 | plan-run/grok-4.6/high | plan-run · closed-deviations · P0.4 in-plan plumbing GREEN (D10 🟠). Residual NPM-TRUSTED-PUBLISHER outside plan; token fallback kept; GitHub env is github-pages only.
write-site: pre_mutation: allow · pre_final: allow |

## Owner Gates

- P0.4: known deviation
