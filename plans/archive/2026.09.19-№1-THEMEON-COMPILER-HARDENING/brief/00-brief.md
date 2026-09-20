# Owner brief — 2026-09-19

## REPOSITORY-OWNER-MESSAGE

The repository owner invoked:

```text
$ task:plan-design audits/2026-09-19-audit.md new
```

The authorized product is a new executable plan derived from the named audit. This brief does not
authorize implementation, package publication, release tags, external npm/GitHub configuration or
consumer-triggered ecosystem packages.

## Designer interpretation

- Create a new layout-v2 plan and fully design every phase before any execution.
- Treat the audit as evidence/requirements, not authority to bypass `ROADMAP.md` triggers.
- Preserve the existing repository/package architecture unless an explicit plan decision changes it.
- Run one independent whole-plan design audit after the complete design and before execution.
- For execution, make the choice between Cursor Composer 2.5 and xAI Grok 4.6 explicit and
  fail closed when the selected model cannot be attested by the active provider.
- Return the whole-plan audit as the only successor; the design invocation performs no product implementation.

## REPOSITORY-OWNER-CORRECTION

The owner clarified on 2026-09-19 that the intended lifecycle is:

1. design the entire plan;
2. audit the entire design;
3. execute only after the audit is GREEN.

The owner also required search and Perplexity verification for the Composer 2.5 versus Grok 4.6
choice. This correction supersedes the earlier phase-first interpretation.
