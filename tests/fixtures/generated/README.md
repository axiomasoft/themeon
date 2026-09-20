# Generated test fixtures (P2.1)

| Path | Purpose |
|:--|:--|
| `replay/corpus-*.json` | Committed minimal counterexamples replayed without randomness |
| `replay/<law>-<timestamp>.json` | Ephemeral failures from local `runProperty` (gitignored) |

Do not hand-edit timestamped failure files; shrink and promote a minimal case into `corpus-*.json` when fixing a real bug.
