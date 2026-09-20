# Reducer-owned design continuity

The owner requires whole-plan independent audit before execution. Design is complete across P0–P3 and 24 items. The generated P0.1 bundle is a required lint carrier but confers no execution authority before audit GREEN. The current design root is terminal and cannot self-audit independently.

```json
{
  "work_estimate": {
    "route_attested": true,
    "capabilities_attested": true,
    "capabilities_sufficient": true,
    "context_attested": false,
    "context_health": "separate-audit-required",
    "batch_receipt_valid": false,
    "remaining_batch_digest": null,
    "loaded_inputs_reusable": false,
    "cold_start_cost": null,
    "lifecycle": "whole-plan-independent-audit",
    "isolated_review": true,
    "reviewer_task": "task:plan-audit",
    "checkpoint": "plan.md + roadmap.md + phases/P0-P3 + research/executor-model-selection.md",
    "external_pause": null,
    "schema_version": "session-work-estimate/v1"
  },
  "decision": {
    "outcome": "cold-start-root",
    "reason": "whole-plan-independent-audit",
    "evidence": ["complete-design:P0-P3/24-items", "owner-lifecycle:design-audit-execute", "model-research:official+perplexity"],
    "runnable": true,
    "schema_version": "session-continuity-decision/v1"
  },
  "next_carrier": {
    "kind": "audit-design",
    "command_id": "task:plan-audit",
    "plan_id": "2026.09.19-№1-THEMEON-COMPILER-HARDENING",
    "arguments": ["2026.09.19-№1-THEMEON-COMPILER-HARDENING", "design"],
    "context_kind": "cold-start-root",
    "item_ids": [],
    "cold_start_scope": ["whole-plan"],
    "continuity": {"outcome":"cold-start-root","reason":"whole-plan-independent-audit","evidence":["complete-design:P0-P3/24-items"],"runnable":true,"schema_version":"session-continuity-decision/v1"}
  }
}
```
