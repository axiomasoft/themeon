# Input sources

| Source | SHA-256 / revision | Role |
|:--|:--|:--|
| `audits/2026-09-19-audit.md` | `f1bc4ac7499ad43927dfeae3ce9940f7e9a6f781c7136cbb6a4151f458f5fcfc` | Non-normative audit input; recommendations adjudicated in `findings/audit-verdicts.md`. |
| Repository baseline | `09cec81463f8cf9bd905d52b28f46d4542848dfd` | Code/manifests/workflows inspected during upper-layer design. |
| Cursor Composer 2.5 docs/blog | retrieved 2026-09-19 | Primary evidence for model identity, context, tools, positioning and pricing. |
| xAI Grok 4.6 docs/news | retrieved 2026-09-19 | Primary evidence for availability, context, reasoning controls, tools and pricing. |
| Perplexity web synthesis | queried 2026-09-19 | Secondary corroboration only; responses omitted usable citation URLs. |

Full URLs and retrieval limitations for model selection are in `research/executor-model-selection.md`.
External links inside the audit are not treated as captured evidence. Their owning P0 items must
verify official primary sources and record date/version before emitting `RAG:✅` claims.

| Source | Retrieved | Role |
|:--|:--|:--|
| [DTCG Format 2025.10](https://www.designtokens.org/TR/2025.10/format/) | 2026-09-19 | P0.1 matrix (`docs/standards/dtcg-2025.10.md`) |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 2026-09-19 | P0.2 contrast thresholds (1.4.3 / 1.4.11 AA) |
