# Roadmap исполнения — 2026.09.19-№1-THEMEON-COMPILER-HARDENING

**Обновлён:** 2026-09-20 · **Соответствует plan.md:** v0.3.0

## Admission

Execution is closed until an independent cold-start `task:plan-audit 2026.09.19-№1-THEMEON-COMPILER-HARDENING design` emits a GREEN receipt with no blocking findings. A GREEN receipt admits P0.4 (solo `plan-run`, D10 `🟠` deviations), not P0.1. Any material plan repair after that receipt invalidates it and requires another whole-plan audit.

## Правило выбора модели

- Only exact `composer-2.5` or `grok-4.6` selectors are allowed for execution.
- Preferred/fallback follows `plan.md` Routing. Every launch records provider attestation, exact selector and effort; fallback uses equal-or-higher review and is journaled.
- Composer 2.5 owns bounded fixture-led work; Grok 4.6 owns broad cross-package, architecture, security and complex integration work.
- Failed entitlement/connectivity is a launch blocker, not permission for auto-selection or a third model.

## Последовательность

1. Whole-plan audit and repairs/re-audit until GREEN. Candidate must be git-committed first (D13/F1).
2. After GREEN: solo P0.4 `plan-run` as `🟠` under D10 (in-plan plumbing; residual `NPM-TRUSTED-PUBLISHER` is not this item's machine gate). Then B0-HYGIENE P0.5–P0.6; close P0. Do not re-execute GREEN P0.1–P0.3.
3. P1 is already GREEN — skip. Then P2 in three sessions: B2-VERIFY P2.1–P2.2; B2-PACKAGE P2.3–P2.4; B2-RUNTIME P2.5–P2.6; close P2. P2.4 stays not started until its owning route runs.
4. P3 in three sessions: B3-CLI P3.1–P3.2; solo P3.3; B3-TOOLING P3.4–P3.6; close P3.
5. Whole-plan reconciliation and archive. Trigger-gated ecosystem work remains outside this plan.

## Гейты владельца

| Гейт | Где | Что утверждает | Блокирует |
|:--|:--|:--|:--|
| `WHOLE-PLAN-AUDIT-GREEN` | all | Independent design receipt | All execution until GREEN. GREEN admits P0.4, not P0.1. |
| `NPM-TRUSTED-PUBLISHER` | residual (outside plan, D10) | External npm/GitHub trusted publishing settings, no publish/tag/version | Residual work only; does not block P0.4 in-plan close or later phases. |
| Evidence decisions | P3.4/P3.5 | Testing/stylelint internal/package/skip branch | Only the relevant optional product branch. |

## Группировка

The execution map contains 12 recommended sessions instead of 20. Batches never cross a phase,
mix execution modes or erase item-level closure. P0.3 remains solo for the tenant security boundary,
P0.4 remains solo for D10 residual close-with-deviations (machine `Authority` is `routine`), and
P3.3 for its distinct Vite/Laravel/CSP capability and context budget. Every batch can cold-start at
an item boundary only through its durable receipt.
