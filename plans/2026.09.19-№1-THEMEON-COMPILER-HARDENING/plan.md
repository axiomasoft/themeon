# 2026.09.19-№1-THEMEON-COMPILER-HARDENING — План №1 — Compiler hardening ThemeOn

## 0. Meta

| Поле | Значение |
|:--|:--|
| Plan ID | 2026.09.19-№1-THEMEON-COMPILER-HARDENING |
| Short ID | PLAN1 |
| Title | План №1 — Compiler hardening ThemeOn |
| Layout | v2 |
| Document Type | Executable Master Plan |
| Authoring Model | gpt-5.6-sol/high (provider-attested, `codex-turn-context-v1`, 2026-09-19) |
| Repository | themeon |
| Related Packages | `@themeon/core`, `@themeon/colors`, `@themeon/cli`, `@themeon/css`, `@themeon/vite`, `@themeon/vue`, `@themeon/nuxt`, `@themeon/tailwind`, `@themeon/naive`; root CI/release/docs |
| Execution Mode | design-all → independent whole-plan audit → execute; no item is runnable before a GREEN audit receipt |
| Target Operator Classes | Composer 2.5 or Grok 4.6, selected per Routing and attested at launch; implementation/high minimum |
| Approval Owner | repository owner |
| Home | repo:themeon |
| visibility | private |
| supersedes | — |
| Paused By | — |

## 1. Context

План превращает уже работающий набор пакетов ThemeOn в формально определённый typed theme
compiler без переписывания проекта и без преждевременного дробления `@themeon/core`.
Исходный аудит `audits/2026-09-19-audit.md` используется как non-normative вход: каждое
предложение сверяется с текущим кодом и либо принимается, либо адаптируется, либо остаётся
trigger-gated в `ROADMAP.md`. Матрица разбора находится в `findings/audit-verdicts.md`.

Целевой поток — authoring model → canonical IR → normalize/validate/resolve/transform/emit →
immutable compiled representation → runtime/adapters. Совместимость текущего root API и
zero-runtime-dependency core сохраняется до доказанного миграционного пути. P0 сначала закрывает
стандарты, accessibility, tenant security и release truth; P1 вводит IR/pipeline/diagnostics;
P2 закрепляет изменения проверками внешнего потребителя; P3 добавляет объяснимость и tooling.

План не включает публикацию релиза, новый framework adapter, React/Svelte, Composer/Blade,
Bootstrap/Vuetify/PrimeVue или preset registry. Эти действия остаются под существующими
consumer-trigger условиями `ROADMAP.md` и требуют отдельного owner-authorized плана.

## 2. Execution Rules

- Аудит — источник гипотез, не готовая спецификация; перед правкой исполнитель сверяет названные repository seams (`RAG:—`) и официальные внешние документы для стандартов (`RAG:✅`).
- Сначала additive compatibility: существующий `@themeon/core` root entrypoint и текущие сериализаторы остаются рабочими; удаление/сужение public API требует отдельного решения и major-version плана.
- Canonical IR не зависит от DOM/CSS/framework packages; runtime не разрешает token graph повторно; formatters не мутируют IR.
- `@themeon/core` сохраняет zero runtime dependencies. Новая runtime dependency требует отдельного D# с vendor-vs-build обоснованием.
- P1 не создаёт новые npm-пакеты: сначала внутренние seams и subpath exports. `@themeon/testing` и stylelint plugin допускаются только после стабилизации IR в P1.
- APCA остаётся experimental/advisory; нормативные accessibility gates используют явно выбранные WCAG 2.2 критерии.
- Tenant-controlled input рассматривается как untrusted; prototype keys, resource-bearing CSS, depth/size limits и schema/runtime parity проверяются fail-closed.
- Release/tag/publish, изменение npm trusted-publisher settings и GitHub protected environment запрещены без точного owner-gate; обычные repository workflow edits этим запретом не блокируются.
- Один item закрывается по фактическим Validation carriers; generated state/status/decision views не редактируются вручную.
- Канонические статусы — `⬜ Not started`, `🟡 In progress`, `🟢 Done`, `🟠 Done with deviations`, `🔴 Blocked`, `⛔ Skipped by decision`.
- Основной локальный контур: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:pack`; интеграционные lanes запускаются по риску item, а не автоматически для несвязанных docs-only изменений.
- Жизненный цикл жёсткий: (1) все P0–P3 и все item-спеки детализированы; (2) отдельная холодная сессия выполняет `task:plan-audit <ID> design`; (3) execution открывается только после GREEN audit receipt без неснятых blocking findings (D5, D13).
- Receipt 2026-09-19 spent by RED 2026-09-20 audit. This finish candidate (D10–D13 plus post-audit F2–F4 repair) requires a fresh independent design audit before any re-admission `plan-exec`/`plan-run`. Product work already on disk is reusable evidence, not current GREEN. The candidate must be committed before that audit (F1). After GREEN, admit P0.4 (solo `plan-run`, D10 `🟠`), not P0.1.
- Перед каждым execution launch оператор аттестует exact model selector. `composer-2.5` — базовый выбор для bounded, хорошо специфицированных изменений; `grok-4.6` — для длинного cross-package context, security/adversarial, architecture и сложных integration trajectories.
- Если предпочтительный executor недоступен или provider не может подтвердить selector, допустим только явный fallback из той же пары с не более низким effort/review; смена фиксируется в journal. Ни auto-selector, ни третья модель не соответствуют этому плану без нового owner decision.
- После закрытия item/фазы regenerated views и `handoff.md` обязаны согласовываться с journal; обычный repair выполняется в owning attempt.

## 3. Routing

Routing покрывает все items P0–P3. Конкретная модель — plan-level ограничение поверх Task route: активный provider обязан доказать и exact selector, и minimum class/effort. Источники выбора и ограничения поиска зафиксированы в `research/executor-model-selection.md` и D6.

| Batch | Items | Model class/effort | Exec | Review | Почему |
|:--|:--|:--|:--|:--|:--|
| B0-STANDARDS | P0.1 | implementation/high | plan-exec | full | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Shared standards evidence and fixture setup with P0.2. |
| B0-STANDARDS | P0.2 | implementation/high | plan-exec | full | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Reuses P0.1 evidence/diagnostic context while retaining separate acceptance. |
| solo | P0.3 | frontier/high | plan-run | full | Grok 4.6 preferred; Composer 2.5 fallback. Security/adversarial boundary. |
| solo | P0.4 | frontier/high | plan-run | full | Grok 4.6 preferred; Composer 2.5 fallback; residual NPM-TRUSTED-PUBLISHER is roadmap-only (D10). |
| B0-HYGIENE | P0.5 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Shared manifest context. |
| B0-HYGIENE | P0.6 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Shared CI context. |
| B1-MODEL | P1.1 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Architecture context continues into IR and graph. |
| B1-MODEL | P1.2 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Reuses frozen ADR and characterization context. |
| B1-MODEL | P1.3 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Consumes the just-built IR without a cold start. |
| B1-COMPILER | P1.4 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Diagnostic contract feeds compiler and exports. |
| B1-COMPILER | P1.5 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Long compiler trajectory reuses diagnostic context. |
| B1-COMPILER | P1.6 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Export migration closes the same compiler context. |
| B2-VERIFY | P2.1 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Deterministic property work. |
| B2-VERIFY | P2.2 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Reuses generators and critical-module context. |
| B2-PACKAGE | P2.3 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Packed-consumer harness feeds API reporting. |
| B2-PACKAGE | P2.4 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Reuses tarballs, declarations and resolver modes. |
| B2-RUNTIME | P2.5 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Performance corpus feeds browser/adapter checks. |
| B2-RUNTIME | P2.6 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Reuses runtime, HMR and browser setup. |
| B3-CLI | P3.1 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Query/schema layer continues into semantic diff. |
| B3-CLI | P3.2 | frontier/high | plan-run | full | recommended: Grok 4.6 preferred; Composer 2.5 fallback. Reuses CLI schemas, provenance and golden fixtures. |
| solo | P3.3 | frontier/high | plan-run | full | Grok 4.6 preferred; Composer 2.5 fallback. Vite/Laravel/CSP integration. |
| B3-TOOLING | P3.4 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Evidence branch and shared package setup. |
| B3-TOOLING | P3.5 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Reuses disposition and manifest evidence. |
| B3-TOOLING | P3.6 | implementation/high | plan-exec | light | recommended: Composer 2.5 preferred; Grok 4.6 fallback. Documents the selected tooling outcomes. |

Whole-plan design audit: separate cold-start root, preferred Grok 4.6/high for broad-context
adversarial review, fallback Composer 2.5/high. The audit is not execution authority; a GREEN
receipt admits P0.4 (solo `plan-run`, D10 `🟠` deviations) or returns findings to design. Do not
re-open GREEN P0.1–P0.3.

## 5. Decision Log

Решения находятся в `decisions/`; generated views собираются командой
`python3 <task-package>/scripts/plan-views.py decisions --plan-dir <plan-dir>`.
