# Вердикты по `audits/2026-09-19-audit.md`

Аудит — non-normative вход. Ниже зафиксировано, как его рекомендации преобразованы в scope
плана после чтения текущего дерева на commit `09cec81`.

## Принято в текущий план

| Область аудита | Вердикт | Владелец |
|:--|:--|:--|
| DTCG 2025.10 matrix, explicit loss policy, round-trip evidence | Принято: P0 фиксирует фактическую матрицу, P1 переносит metadata/loss diagnostics в IR, P2 закрепляет property/fixture tests. | P0.1, P1, P2 |
| WCAG 2.2 alongside APCA | Принято: WCAG — normative, APCA — advisory/experimental. | D3, P0.2 |
| Tenant patch security | Принято как отдельный security item до расширения compiler API. | P0.3 |
| Trusted publishing and full release verification | Принято с owner-gate на внешние npm/GitHub settings; публикация и tag не входят в scope. | P0.4 |
| README/publication truth and duplicate workspace dependencies | Принято как bounded hygiene, после live registry verification. | P0.5 |
| Risk-oriented coverage gates | Принято с measured baseline и staged thresholds, без мгновенного монорепозиторного 100% gate. | P0.6 |
| Canonical IR, staged compiler, structured diagnostics, instance-scoped plugins | Принято compatibility-first; root API не сужается, core физически не дробится. | D1, P1 |
| Property/mutation/consumer/API/performance/browser verification | Принято, но детализируется после P1, когда новые contracts стабильны. | P2 |
| CLI explain/diff/graph, typed Vite manifest, testing/stylelint tooling | Принято после P1/P2 prerequisites; объём делится на execution-ready items при детализации P3. | P3 |
| Durable architecture/ADR documentation | Принято как deliverable соответствующих фаз, не как отдельный параллельный источник истины. | P1–P3 |

## Принято с изменением

- Proposed `packages/core/src/**` tree is a target seam map, not a mandatory mass move. P1 first
  freezes interfaces and characterization tests, then moves only files required by those seams.
- Subpath exports are additive first. Removing helpers from `@themeon/core` root is outside this
  pre-1.0 hardening plan unless consumer evidence and a major migration decision are added.
- `@themeon/testing` is allowed only after a second consumer surface is proved in P2; a shared
  internal fixture library may precede publication.
- Performance gates compare deterministic stored baselines with a noise budget; a raw millisecond
  threshold is not accepted as portable evidence.
- Browser expansion is periodic/release-scoped for Firefox/WebKit; Chromium remains the fast lane.

## Отклонено или отложено

- Rewriting core on Style Dictionary, making DTCG JSON the authoring format, global mutable plugin
  registration, formatter mutation, or build-time network access are rejected by D1.
- Physical `@themeon/dtcg`, plugin-kit, adapter-kit and manifest packages are deferred until there
  are independent consumers; internal/subpath contracts come first.
- Bootstrap, Vuetify, PrimeVue, Composer/Blade, presets, React and Svelte stay in `ROADMAP.md` under
  its real-consumer triggers. This plan cannot weaken those triggers.
- A real Laravel/Nuxt ecosystem pilot is not manufactured from fixtures. Existing integration
  fixtures may verify packaging, while a real pilot requires separate evidence and owner scope.
- Release publication, tags and credential/trust configuration are not implicitly authorized by
  creating this plan.

## Repository evidence snapshot

- `RAG:—` `packages/core/package.json`: one root export and zero runtime dependencies.
- `RAG:—` `packages/core/src/index.ts`: current public facade spans authoring, resolver,
  serialization, runtime, tenant and DTCG functions.
- `RAG:—` `packages/core/src/types.ts`: token identity is path-based and lacks the proposed
  source/metadata/diagnostic IR.
- `RAG:—` `packages/core/src/define.ts`: unsafe prototype-path segments are already rejected;
  P0.3 must preserve this existing protection and examine remaining size/CSS/schema seams.
- `RAG:—` `vitest.config.ts`: V8 provider exists, thresholds are absent.
- `RAG:—` `.github/workflows/release.yml`: release builds then uses `NODE_AUTH_TOKEN` from
  `secrets.NPM_TOKEN`; full verify lanes are not rerun in that job.
- `RAG:—` `README.md`: claims “unpublished”, while commit `09cec81` states npmjs publication;
  P0.5 verifies external truth before editing prose.
- `RAG:—` `packages/cli/package.json` and `packages/naive/package.json`: workspace runtime
  dependencies are duplicated in devDependencies.
- External standard/version assertions from the audit remain `[UNVERIFIED]` until their owning
  P0 item captures official primary-source evidence.

