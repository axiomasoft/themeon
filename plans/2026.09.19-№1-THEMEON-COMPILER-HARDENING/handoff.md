# HANDOFF — 2026-09-20 — after P0

**Next:** audit-design: task:plan-audit 2026.09.19-№1-THEMEON-COMPILER-HARDENING design

| Параметр | Значение |
|:--|:--|
| Batch | n/a |
| Model class | frontier |
| Effort | high |
| Capabilities | plan audit · independent whole-plan design review · no product expansion |
| Context | cold-start-root: design-root-terminal |
| Суть | Independent design audit of the F1–F4 repair candidate (P0.4 Authority routine, phase indexes aligned, successor P0.4). Do not execute items. |

```session-continuity-decision/v1
{"evidence":["batch:de83e87e4351ee71e8b526a9840164f348b6e2421c205e47a58912acb9c492cd","loaded-inputs:not-reusable","cold-start-cost:2","checkpoint:findings/design-finish-2026-09-20-f2-f4.md"],"outcome":"cold-start-root","reason":"design-root-terminal","runnable":true,"schema_version":"session-continuity-decision/v1"}
```

**Native Cursor command:**

```bash
agent --workspace /home/vostrikov/projects/packages/themeon --model grok-4.6 --force --sandbox disabled --trust --approve-mcps 'task:plan-audit 2026.09.19-№1-THEMEON-COMPILER-HARDENING design'
```

**Done:** Design-finish remediation of post-finish RED F1–F4. P0.4 `Authority` is `routine`; residual `NPM-TRUSTED-PUBLISHER` is roadmap-only (D10). Phase indexes match generated status (P2.4 `⬜`). `plan.md` §3 and `roadmap.md` admit P0.4 after GREEN. Decision views regenerated. `plan-lint` 0 errors / 1 recovered phase-order warning. Routing table membership unchanged.

**Remaining:** Independent `task:plan-audit design` of this committed candidate. After GREEN, re-admit P0.4 under compiled Routing as `🟠` (D10). Do not archive. Do not execute items from this design root.

**Sources of truth:** `plan.md`; `phases/P0/P0.4.md`; `roadmap.md`; `decisions/D10-trusted-publisher-deferral.md`; `decisions/D12-lifecycle-evidence-recovery.md`; `findings/design-finish-2026-09-20-f2-f4.md`; `bundles/P0.4.json`; `journal.jsonl`.

**Open risks:** Existing implementation may still be valid; lifecycle still proves only P0.1–P0.3 and P1. A GREEN receipt still requires a committed candidate. Launching P0.4 must not grant residual npm/GitHub configure scope.

**Workarounds/Deferred/Open questions:**
- workarounds: D11 friction exceptions remain valid (hash-matched)
- deferred: NPM-TRUSTED-PUBLISHER residual (D10, outside this item's machine gate); `@themeon/testing` and stylelint packages (D8/D9)
- open_questions: —
