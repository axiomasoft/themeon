# Design audit — 2026.09.19-№1-THEMEON-COMPILER-HARDENING — 2026-09-20

**Режим:** whole-plan design audit (`task:plan-audit design`), read-only over product work  
**Маршрут аудитора:** `gpt-5.6-sol/xhigh`, provider-attested by `codex-turn-context-v1`  
**Вердикт: RED**

## Candidate and changed-risk delta

- `plan.md` remains byte-identical to the prior design audit candidate:
  `sha256:7a0b665a8c8e5b8523420a021d145d4f901a9eebe6d22f3a5b33bbb57f8e3722`.
- The Task Contract routing compiler resolves all 24 items exactly once; routing digest:
  `de83e87e4351ee71e8b526a9840164f348b6e2421c205e47a58912acb9c492cd`.
- The Task runtime canon conflict scan is GREEN (`plan-lint --conflicts`: 0 discrepancies).
- The current plan candidate is not committed: `git ls-files -- <plan-dir>` returns zero files,
  while the prior receipt names commit `09cec81463f8cf9bd905d52b28f46d4542848dfd`, where
  `plan.md` does not exist.
- The initial deterministic audit lint was RED: 58 errors and 2 warnings. After replacing the
  invalid prior handoff with this audit's owning continuation, the final lint remains RED with 53
  errors and 2 warnings. The remaining failures include invalid journal rows, stale terminal spec
  bindings, missing write-site evidence, missing/stale bundles and state projections,
  terminal-phase read-path violations, and contradictory status counts.

The unchanged `plan.md` hash therefore does not establish an unchanged whole-plan candidate. The
item specifications, journal, decisions, states, closures, status and handoff have materially
changed after the first audit, and there is no committed audit anchor from which to prove their
delta.

## Findings

### F1 · Critical · The audited plan was never frozen as a committed candidate

**Evidence:** the entire plan directory is untracked; the prior
`findings/design-delivery-receipt.json` points at `09cec81`, but that commit contains no plan
carrier. D5 requires every P0–P3 specification and route to be frozen before execution.

**Failure scenario:** a specification changes after audit or after an item close without forcing a
new audit or validation run. This is not hypothetical: terminal evidence for P0.5, P0.6 and P2.3
does not match the current item-spec digest.

**Owning continuation:** `design-finish: task:plan-design
2026.09.19-№1-THEMEON-COMPILER-HARDENING finish`. Establish one coherent committed candidate,
rebind or invalidate stale evidence, then run a fresh independent design audit.

### F2 · Critical · Phase dependency and completion evidence are not trustworthy

**Evidence:** final `plan-lint` reports 53 errors after the audit-owned handoff correction. P2.4 has
no terminal journal event and its generated state is `⬜ Not started`; P2.6 also remains
`⬜ Not started` in the phase/status projections; P2 has no closure carrier. Nevertheless P3 was
executed and `P3.closed.md` was emitted even though P3 declares terminal P2 as a dependency. P0
also has no phase closure, while P1 was executed and closed. Journal rows 36–47 omit required
identity/telemetry fields, and multiple earlier rows use friction values outside the closed enum.

**Failure scenario:** reconciliation or archive treats product work as accepted even though the
authoritative history cannot prove predecessor completion, acceptance, or the exact contract that
was validated.

**Owning continuation:** the design reconciliation must recover the earliest unproved transition,
materialize valid terminal evidence through the owning item routes, and regenerate phase closures
in dependency order. A bookkeeping-only status rewrite is insufficient.

### F3 · High · Nine terminal events contradict the compiled Routing contract

**Evidence:** the sole compiled routing table and the latest terminal journal event disagree for
P0.5, P0.6, P2.3, P2.5, P2.6, P3.1, P3.4, P3.5 and P3.6. P2.3/P2.5/P2.6/P3.1 are declared
`frontier/high` + `plan-run` but were recorded as `plan-exec/composer-2.5/high`; P3.4–P3.6 are
declared `plan-exec` but recorded as `plan-run`.

**Failure scenario:** the Task Contract route gate and its required review depth are bypassed, so
later GREEN state cannot show that the declared executor mode, class or batch contract was
satisfied.

**Owning continuation:** re-admit and revalidate affected items under the compiled route, starting
with the earliest affected item P0.5; do not rewrite historical rows to make them appear compliant.

### F4 · High · P0.4 is GREEN while its owner-gated acceptance remains false

**Evidence:** P0.4 requires an owner-approved external trusted-publisher configuration receipt and
proof of the protected release environment. `artifacts/P0.4/external-trust.json` records
`predicate_satisfied: false`, no release environment, and unobserved npm trusted publishing. The
owner deferred the gate and retained the token fallback, but the state says `🟢 Done` with no
pending work or deviation.

**Failure scenario:** release readiness is reported GREEN although the declared trusted-publishing
deliverable was neither performed nor formally removed from the contract.

**Owning continuation:** formalize the owner's deferral in a superseding decision/spec outcome, or
resume P0.4 when the declared gate is granted. It cannot remain an undeviated GREEN against the
current acceptance contract.

## Verified without a blocking design finding

- `plan.md` still has complete 1:1 Routing coverage for 24 items.
- All four phase indexes declare `Phase Assurance | v1`; their `direct-close-eligible` intent is
  advisory and does not itself create an audit requirement.
- The 24 stable item files retain the required v2 field set; no phase skeleton remains.
- The Task runtime canon and implementation conflict scan is clean.

## Coverage limits

This audit did not rerun product tests or judge the implementation itself. Existing product-test
claims may be reusable only after the owning lifecycle repair proves their carrier, spec digest,
route and dependency delta. No product files or generated plan projections were changed by this
audit.

## Verdict

The whole-plan design/lifecycle package is **RED**. Do not reconcile or archive it as complete, and
do not treat the earlier GREEN receipt as a current execution admission. Return to design finish,
repair the evidence graph without rewriting history, freeze a committed candidate, and request a
fresh independent audit.
