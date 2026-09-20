# Design audit — 2026.09.19-№1-THEMEON-COMPILER-HARDENING — 2026-09-20 (committed F1–F4 candidate)

**Режим:** whole-plan design audit (`task:plan-audit design`), read-only over product work  
**Маршрут аудитора:** `grok-4.6/high` (Cursor session; plan preferred whole-plan auditor)  
**Вердикт: RED**  
**Заход:** 4 — prior terminals: GREEN 2026-09-19 (spent by D13); RED 2026-09-20; RED 2026-09-20 post-finish; this run audits the committed F1–F4 repair at `23b440e` / HEAD `1cc3ae5`.

## Candidate and changed-risk delta

| Gate | Результат |
|:--|:--|
| Git freeze (D13/D5) | **OK** — `git ls-files` = 145 plan paths; freeze commit `23b440e` (`docs(plan): freeze compiler-hardening design candidate after F1–F4 repair`); HEAD `1cc3ae5` adds only the finish receipt JSON; `plan.md` blob identical; uncommitted plan delta = `.plan-cache/` only |
| `plan.md` digest | `sha256:ea40506422f6034e35b31c54011a151e796ec15fc39fe8a99930e83b1331932c` (matches finish receipt and `bundles/P0.4.json`) |
| Routing compiler | 24/24 items exactly once; 12 batches; digest `de83e87e4351ee71e8b526a9840164f348b6e2421c205e47a58912acb9c492cd` (unchanged) |
| `plan-lint` | **FAIL** — 1 error (`read-budget-v1` P3.6 bundle not byte-fresh); 1 warning (`phase-first`: P3 active while P2 is not terminal — recovered D12 truth) |
| `plan-lint --conflicts` | **OK** — 0 discrepancies |
| D11 exceptions | lines 4, 5, 6, 7, 12 SHA-256 match |
| P0.4 machine authority | **OK** — spec `Authority: routine`; `bundles/P0.4.json` has no `NPM-TRUSTED-PUBLISHER` gate; `plan_bundle.build(..., check=True)` passes for P0.4 and 22 other items |
| Generated item status | GREEN only P0.1–P0.3 and P1.1–P1.6; unproved items are 🟡/⬜ as D12 source requires; handwritten P0–P3 indexes match |
| Phase closures | only `phases/P1/P1.closed.md`; no `P3.closed.md` |
| Successor prose | **OK** — `plan.md` §3 and `roadmap.md` admit P0.4 after GREEN, not P0.1 |

Changed-risk vs the post-finish RED is the F1–F4 design-finish plus git freeze: P0.4 `Authority` is `routine`, phase indexes match generated status, successor is P0.4, candidate is committed. That closes prior F1–F4. The freeze itself is not `plan-lint` clean: `bundles/P3.6.json` still digests an older `status.md` than the `status.md` committed beside it.

## Findings

### F1 · Major · issue · frozen P3.6 bundle is not byte-fresh

**Adopted requirement:** Design-mode dry-renders bundles for every directly executable ready item, including ready items in a future phase. D5: the audit must validate generated-bundle freshness. Layout v2: `plan-lint` fail-closes a non-byte-fresh generated bundle (`D2(b)`). The F1–F4 finish claimed `plan-lint` 0 errors on this candidate.

**Evidence:**
- `python3 …/plan-lint.py` → `read-budget-v1: пункт P3.6: … generated bundle не byte-fresh: вид устарел: …/bundles/P3.6.json`.
- `plan_bundle.build(..., check=True)` passes for 23/24 items and fails only P3.6.
- Live `status.md` sha256 `db20274f3a56eac385efe4afc699924ed2417140cd8c7fd343b03c195db1525b` equals HEAD and `23b440e`.
- `bundles/P3.6.json` still records `status.md` as `4e24aec6e79108d740f4a45fb63dae318c405301da7486026c794466b4a4c471`.
- No other P3.6 input mismatches the live tree. The inconsistency is inside the frozen plan directory, not uncommitted product drift.

**Failure scenario:** a GREEN receipt against this freeze cannot prove the layout-v2 lint carrier. A later P3.6 (or whole-plan lint) run fail-closes before dispatch even though P0.4 itself is fresh. The finish’s “lint 0” claim is false on the committed bytes.

**Owning continuation:** `design-finish: task:plan-design 2026.09.19-№1-THEMEON-COMPILER-HARDENING finish` — rebuild `bundles/P3.6.json` with `plan-views.py bundle --item P3.6` (do not hand-edit), confirm `plan-lint` 0 errors, commit that generated file, then a fresh independent `task:plan-audit design`. Do not treat this RED as execution admission. Do not grant residual npm/GitHub configure scope.

### F2 · Minor · issue · Routing why-column still says P0.4’s owner gate is mandatory

**Adopted requirement:** D10: P0.4 machine `Authority` is `routine`; residual `NPM-TRUSTED-PUBLISHER` lives only on roadmap/owner-gates; launching P0.4 does not grant that configure scope.

**Evidence:** `plan.md` §3 row P0.4 “Почему” still ends with “external owner gate remains mandatory.” Spec, bundle, D10, and roadmap owner-gates already residualize the grant.

**Failure scenario:** a cold executor reading only the Routing table hesitates to re-admit P0.4, or treats the owner invocation as the residual npm/GitHub grant. Machine admission is `routine`, so this does not fail-close launch.

**Owning continuation:** same design-finish may drop that clause from the why-column while rebuilding P3.6. Not independently blocking.

## Bookkeeping (not a product finding)

- `phase-first` warning (P3 active while P2 is not terminal) is recovered D12 truth; do not “fix” it by false-GREEN P2/P3.
- Regenerating `status.md` after this journal append is view reconciliation, not a P3.6 repair.
- Dirty working-tree product files (`README.md`, `package.json`, `packages/cli/README.md`, workflows) match the frozen P3.6/P0.4 bundle hashes where those files are inputs; they are not this finding.
- Untracked `.plan-cache/` is on-demand generated history; not part of the freeze.

## Verified without a blocking design finding

- Prior F1 (uncommitted candidate): closed. Plan directory is in git at `23b440e`; HEAD only adds the finish receipt.
- Prior F2 (P0.4 `NPM-TRUSTED-PUBLISHER` machine gate): closed. `Authority: routine`; bundle has no gate; spec text does not match `_LEGACY_AUTHORITY_RE`.
- Prior F3 (handwritten phase indexes false GREEN, including P2.4): closed. Indexes match generated states; P2.4 stays `⬜ Not started`.
- Prior F4 (successor still P0.1): closed. `plan.md` §3 and `roadmap.md` admit P0.4 after GREEN.
- 24 item specs remain detailed (no `[NEEDS CLARIFICATION]`). Required v2 fields present.
- Routing table 1:1; D7 twelve-session grouping still matches §3.
- D11 hashes match. `open-questions.md` empty. Phase Assurance v1 present on P0–P3 (advisory).
- Decision views (`_current.md` / `_index.md`) match D10–D13 sources.
- P0.4 bundle `plan.md` digest matches the live file. Product tests were not rerun.

## Coverage limits

This audit did not rerun product tests, pack, or CI. Existing on-disk implementation remains reusable evidence after owning-route re-admission (D12 §6), not current GREEN for reopened items. `task_contract.build()` was not used (provider `core` import path); authority was checked from the spec, bundle JSON, and `declared_authority` regex. No product files were changed. P3.6.json was not rebuilt in this audit (repair would dirty the freeze and is owned by design-finish).

## Verdict

The committed F1–F4 candidate is **RED**. Do not admit `plan-exec`/`plan-run`. Return to design-finish, rebuild the stale P3.6 bundle, **git-commit** that generated file, then request a fresh independent `task:plan-audit design`. After a later GREEN, re-admit P0.4 as `🟠` under D10 — not P0.1.
