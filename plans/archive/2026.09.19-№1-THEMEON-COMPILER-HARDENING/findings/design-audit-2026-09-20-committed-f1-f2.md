# Design audit — 2026.09.19-№1-THEMEON-COMPILER-HARDENING — 2026-09-20 (committed F1–F2 candidate)

**РЕЖИМ:** whole-plan design audit (`task:plan-audit design`), read-only over product work  
**ВХОД:** `findings/design-finish-2026-09-20-committed-f1-f2.md`; freeze `5307e92`; HEAD `93e8631`  
**СКОУП:** D10–D13 finish plus committed-audit F1–F2 repair (P3.6 bundle rebuilt after status; P0.4 Routing why D10)  
**НЕ ТРОГАТЬ:** product code; historical journal `command`/`result`; GREEN P0.1–P0.3 and P1 terminals; D8/D9/D10 machine Authority; Routing table membership; P2.4 Not started  
**Маршрут аудитора:** `grok-4.6/high` (Cursor session; plan preferred whole-plan auditor)  
**Вердикт: GREEN**  
**Заход:** 5 — prior terminals: GREEN 2026-09-19 (spent by D13); RED 2026-09-20; RED 2026-09-20 post-finish; RED 2026-09-20 committed; this run audits the committed F1–F2 repair.

## Candidate and changed-risk delta

| Gate | Результат |
|:--|:--|
| Git freeze (D13/D5) | **OK** — `git ls-files` = 149 plan paths; freeze commit `5307e92` (`docs(plan): freeze compiler-hardening candidate after P3.6 bundle repair`); HEAD `93e8631` binds the finish receipt; `plan.md` blob identical to HEAD; uncommitted plan delta = `.plan-cache/` only |
| `plan.md` digest | `sha256:0999082d064c57f8293369f0223cc3b55e24c8691c87bd9fd7958be1aed3273c` (matches finish receipt and `bundles/P0.4.json` / `bundles/P3.6.json`) |
| Routing compiler | 24/24 items exactly once; 12 sessions (9 named batches + 3 solo); digest `53c5adf255a9bc6ca3e45f2d5ef48c946a30c127a6b1d279b6b051ebcb526cdb` (changed vs prior `de83e87e…` only by the P0.4 why-column F2 repair; membership unchanged) |
| `plan-lint` | **OK** — 0 errors; 1 warning (`phase-first`: P3 active while P2 is not terminal — recovered D12 truth) |
| `plan-lint --conflicts` | **OK** — 0 discrepancies |
| Bundles | `plan_bundle.build_all(..., check=True)` passes for 24/24 items |
| D11 exceptions | lines 4, 5, 6, 7, 12 SHA-256 match `journal-exceptions.jsonl` |
| P0.4 machine authority | **OK** — spec `Authority: routine`; `task_contract.declared_authority(..., for_execution=True)` returns `None` (no finite gate); bundle has no `NPM-TRUSTED-PUBLISHER` gate |
| Generated item status | GREEN only P0.1–P0.3 and P1.1–P1.6; unproved items are 🟡/⬜ as D12 source requires; handwritten P0–P3 indexes match |
| Phase closures | only `phases/P1/P1.closed.md`; no `P0.closed.md` / `P2.closed.md` / `P3.closed.md` |
| Successor prose | **OK** — `plan.md` §3 and `roadmap.md` admit P0.4 after GREEN, not P0.1 |

Changed-risk vs the committed RED is the F1–F2 design-finish plus git freeze: `bundles/P3.6.json` now digests live `status.md` `40ea103d…`; P0.4 Routing why residualizes `NPM-TRUSTED-PUBLISHER` to D10/roadmap. That closes prior F1–F2. Prior F1–F4 from post-finish remain closed.

## Findings

No blocking, Major, or Minor findings.

### F1 · Nit · nitpick · D7 still explains P0.4 solo by an owner gate

**Adopted requirement:** none as a gate — D10 already set machine `Authority` to `routine`; Routing why and `roadmap.md` already residualize the grant. Recorded only because D7 `Почему` is now stale relative to D10.

**Evidence:** `decisions/D7-session-optimized-batches.md` still says “P0.4 stays solo because of its owner/irreversible gate.” Compiled Routing keeps P0.4 `solo` with why “residual NPM-TRUSTED-PUBLISHER is roadmap-only (D10).”

**Failure scenario:** a reader of D7 alone may think launching P0.4 still requires the npm/GitHub grant. Machine admission does not.

**Owning continuation:** optional later design touch of D7 rationale. Does not return to design-finish and does not block P0.4 re-admission.

## Bookkeeping (not a product finding)

- `phase-first` warning (P3 active while P2 is not terminal) is recovered D12 truth; do not “fix” it by false-GREEN P2/P3.
- Regenerating `status.md` after this journal append, then rebuilding `bundles/P3.6.json`, is the one allowed audit-owned bookkeeping repair (P3.6 Inputs/Required Reads include generated `status.md`).
- Dirty working-tree product files that are P0.4 bundle inputs (`package.json`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, package manifests) match the frozen bundle hashes; they are reusable evidence, not this finding.
- Untracked `.plan-cache/` is on-demand generated history; not part of the freeze.

## Brief coverage

| Мысль brief | Носитель | Вердикт |
|:--|:--|:--|
| Полный design P0–P3 до execution | 24 item specs, phase indexes, D1–D13 | Покрыто |
| Независимый whole-plan audit до кода | D5, D13, `roadmap.md` admission, этот отчёт | Покрыто (GREEN) |
| Audit — гипотезы, не authority | `plan.md` §1–2, `findings/audit-verdicts.md` | Покрыто |
| Composer 2.5 / Grok 4.6 explicit routing | `plan.md` §3, D6, `research/executor-model-selection.md` | Покрыто; launch preflight остаётся на операторе |
| Без publish/tag/ecosystem без триггеров | D4, D10, phase Scope Excluded | Покрыто |

## Verified without a blocking design finding

- Prior F1 (stale P3.6 bundle): closed. Live `status.md` sha256 equals both P3.6 digest entries.
- Prior F2 (Routing why “external owner gate remains mandatory”): closed.
- Prior post-finish F1–F4 (uncommitted candidate; P0.4 machine gate; false-GREEN indexes; successor P0.1): remain closed.
- 24 item specs remain detailed (no skeleton / `[NEEDS CLARIFICATION]`). Required v2 fields present.
- Routing table 1:1; D7 twelve-session grouping still matches §3 (P0.4/P0.3/P3.3 solo).
- D11 hashes match. `open-questions.md` empty. Phase Assurance v1 present on P0–P3 (advisory).
- Decision views (`_current.md` / `_index.md`) match D10–D13 sources.
- P0.4 bundle `plan.md` digest matches the live file. Product tests were not rerun.

## Coverage limits

This audit did not rerun product tests, pack, or CI. Existing on-disk implementation remains reusable evidence after owning-route re-admission (D12 §6), not current GREEN for reopened items. No product files were changed. Independent of this GREEN, launching P0.4 must not grant residual npm/GitHub configure scope.

## Verdict

The committed F1–F2 candidate is **GREEN**. Gate `WHOLE-PLAN-AUDIT-GREEN` is satisfied for execution admission. Re-admit P0.4 as `🟠` under D10 (solo `plan-run`) — not P0.1. Do not archive. Do not execute items from this audit invocation.
