# Design audit — 2026.09.19-№1-THEMEON-COMPILER-HARDENING — 2026-09-20 (post-finish)

**Режим:** whole-plan design audit (`task:plan-audit design`), read-only over product work  
**Маршрут аудитора:** `grok-4.6/high` (Cursor session; plan preferred whole-plan auditor)  
**Вердикт: RED**  
**Заход:** 3 — prior terminals: GREEN 2026-09-19 (spent by D13); RED 2026-09-20; this run audits the D10–D13 finish candidate.

## Candidate and changed-risk delta

| Gate | Результат |
|:--|:--|
| `plan.md` digest | `sha256:d6bbd30a25cad6069d633560e623406542fdc8110ffe3d203262fb72d337c176` |
| Routing compiler | 24/24 items exactly once; digest `de83e87e4351ee71e8b526a9840164f348b6e2421c205e47a58912acb9c492cd` (unchanged vs 2026-09-20 RED) |
| `plan-lint` | **OK** — 0 errors, 1 warning (`phase-first`: P3 active while P2 is not terminal — recovered D12 truth) |
| `plan-lint --conflicts` | **OK** — 0 discrepancies |
| D11 exceptions | lines 4, 5, 6, 7, 12 SHA-256 match |
| Generated item status | GREEN only P0.1–P0.3 and P1.1–P1.6; unproved items are 🟡/⬜ as D12 source requires |
| Phase closures | only `phases/P1/P1.closed.md`; no `P3.closed.md` |
| Git freeze (D13/D5) | **FAIL** — `git ls-files -- <plan-dir>` = 0; HEAD `09cec81463f8cf9bd905d52b28f46d4542848dfd` has no `plan.md` |
| P0.4 machine authority | **FAIL** — bundle still compiles `[OWNER-GATE:NPM-TRUSTED-PUBLISHER]`; grant absent |

Changed-risk vs the spent 2026-09-19 GREEN receipt is the whole D10–D13 finish: journal recovery, reopened unproved items, residualized P0.4 spec, regenerated views. That delta repaired prior F2–F4 *status false-GREEN*, but did not freeze a committed candidate and left P0.4 unexecutable under the compiled authority contract.

## Findings

### F1 · Blocker · issue · uncommitted candidate (prior F1 not closed)

**Adopted requirement:** D13: the finish candidate must be git-committed before this audit; D5: P0–P3 specs and routes are frozen before execution. `plan.md` Execution Rules bind execution to a GREEN receipt against that frozen candidate.

**Evidence:** `git ls-files -- plans/2026.09.19-№1-THEMEON-COMPILER-HARDENING` returns zero paths. HEAD is `09cec81` (`build: перевели публикацию Themeon на npmjs`); `git cat-file` reports the plan path exists on disk but not in HEAD. Finish receipt `findings/design-finish-delivery-receipt-2026-09-20.json` still names that same commit. Handoff Remaining of the finish explicitly required the commit *before* this audit.

**Failure scenario:** a specification, decision, or journal byte changes after a GREEN receipt with no git anchor, so later execution cannot prove which candidate was admitted. This is the same demonstrated hole as 2026-09-20 F1; design-finish recorded it as remaining work and it was not done.

**Owning continuation:** `design-finish: task:plan-design 2026.09.19-№1-THEMEON-COMPILER-HARDENING finish` — repair F2–F4, then the owner commits the plan directory, then a fresh independent `task:plan-audit design`. Do not treat this RED as execution admission.

### F2 · Blocker · issue · P0.4 Authority still fail-closes the advertised successor

**Adopted requirement:** D10: in-plan re-admission does **not** require the npm/GitHub grant; later phases do not wait for it; close is `🟠 Done with deviations`. Layout v2: `Authority` is `routine` or a finite `[OWNER-GATE:…]`; `task_contract.build()` / bundle expose that gate and missing authorization stays `owner-gate/granted=false` (`plan-layout-v2.md` Authority; `task_contract.declared_authority`).

**Evidence:**
- `phases/P0/P0.4.md` `Authority` remains `[OWNER-GATE:NPM-TRUSTED-PUBLISHER] branch=\`release-trust\`; scope=\`configure npmjs trusted publisher and GitHub protected release environment …\``.
- `bundles/P0.4.json` `authority.gate.gate_id` = `NPM-TRUSTED-PUBLISHER` with that same configure-scope.
- No accepted Decision Log row contains `[OWNER-GRANT:NPM-TRUSTED-PUBLISHER]`.
- `artifacts/P0.4/external-trust.json` still has `predicate_satisfied: false`.
- D10 and P0.4 Implementation Rules say the grant is **not** required to re-admit; D12 names P0.4 as the earliest unproved item after GREEN.

**Failure scenario:** after a hypothetical GREEN, `task:plan-run … P0.4` hits `AUTHORITY_BOUNDARY` and cannot close the in-plan plumbing. If the owner invocation is treated as a grant, the compiled scope authorizes the residual npm/GitHub configure work that D10 moved **outside** this plan. Either way the recovered successor is not a coherent executable item.

**Owning continuation:** same design-finish. Set P0.4 `Authority` to `routine` (in-plan plumbing + D10 deviation). Keep `NPM-TRUSTED-PUBLISHER` only on roadmap/residual owner-gates, not as this item’s machine gate. Rebuild `bundles/P0.4.json`. Do not grant the residual configure scope by launching P0.4.

### F3 · Major · issue · handwritten phase indexes contradict recovered status

**Adopted requirement:** repository files on the v2 executor path are `plan.md` → `phases/<Pn>/<Pn>.md` → item spec (`plan-protocol` §2). One fact has one owner; generated `status.md` / `*.state.md` are the status projections. D12: P2.4 never had a journal event and stays `⬜ Not started`; unproved items are not GREEN.

**Evidence:** generated states match D12 source (P2.4 `⬜ Not started`; P2.1–P2.3/P2.5–P2.6 and all P3 `🟡 In progress`; P1 GREEN). Handwritten indexes do not:

| Carrier | False claim |
|:--|:--|
| `phases/P2/P2.md` item table | P2.1–P2.5 `🟢 Done`, including **P2.4** |
| `phases/P3/P3.md` item table | P3.1–P3.6 `🟢 Done` |
| `phases/P0/P0.md` item table | P0.3 still `⬜ Not started` (generated: GREEN) |
| `phases/P1/P1.md` item table | P1.1–P1.6 still `⬜ Not started` (phase is closed GREEN) |

**Failure scenario:** an executor or closer reading the phase index treats P2.4 as already accepted and skips it, or treats P3 as terminal while P2 is not.

**Owning continuation:** design-finish must align those index tables with generated status (or stop putting live status on the handwritten index if a later layout change makes status projection-only). P2.4 must not read GREEN.

### F4 · Major · issue · master plan still tells a GREEN audit to open P0.1

**Adopted requirement:** D12 consequences: earliest unproved item after the next GREEN design audit is P0.4. Semantic Next must name the actual successor (`plan-protocol` §6).

**Evidence:** `plan.md` §3 still says the audit receipt “opens P0.1 or returns findings to design”. `roadmap.md` sequence after GREEN still starts at B0-STANDARDS P0.1–P0.2. P0.1–P0.3 are already GREEN.

**Failure scenario:** a cold executor follows `plan.md`/`roadmap.md` instead of D12 and re-executes completed P0.1 or skips the P0.4 residual close.

**Owning continuation:** design-finish updates `plan.md` §3 and `roadmap.md` Admission/sequence so a GREEN receipt admits P0.4 (solo `plan-run`, D10 deviations), not P0.1.

## Bookkeeping (not a product finding)

Generated `decisions/_current.md` / `_index.md` D12 cell is stale versus `decisions/D12-lifecycle-evidence-recovery.md`: the view still says keep P2.1/P2.2 GREEN; the source reopens them. Deterministic `plan-views.py decisions` repair belongs in the same design-finish. Review-mode forbids treating that drift as a product defect.

D12 `## Решение` has two items numbered `5.` (informal-row digest vs invalidate `P3.closed.md`). Nit; fix while touching D12 if the body is edited.

## Verified without a blocking design finding

- 24 item specs remain detailed (no skeleton / `[NEEDS CLARIFICATION]`). Required v2 fields present; `Authority` optional except P0.4.
- Routing table covers every item 1:1; D7 twelve-session grouping still matches §3.
- Prior RED F2 (53 lint errors, informal journal, false P3 close) and F3 (route-mismatched terminals kept as current GREEN) are repaired as *status*: unproved items are 🟡/⬜; P1 closure remains; D11 hashes match.
- Prior RED F4 (P0.4 undeviated GREEN vs false gate) is repaired as *status* (item 🟡, D10 accepted, spec residualized) and reopened as F2 here on the machine gate.
- `open-questions.md` empty. Phase Assurance v1 present on P0–P3 (advisory).
- P0.4 bundle `plan.md` digest matches the live file. Product tests were not rerun.

## Coverage limits

This audit did not rerun product tests, pack, or CI. Existing on-disk implementation remains reusable evidence after owning-route re-admission (D12 §6), not current GREEN for reopened items. Generated decision-view drift was observed, not regenerated (RED return to design-finish). No product files were changed.

## Verdict

The D10–D13 finish candidate is **RED**. Do not admit `plan-exec`/`plan-run`. Return to design-finish, repair F2–F4, **git-commit** the plan directory, then request a fresh independent `task:plan-audit design`.
