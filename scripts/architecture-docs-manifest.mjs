/**
 * SSOT lists for architecture documentation drift checks (P3.6).
 * Update when adding/removing durable docs under docs/architecture or docs/adr.
 */
export const architectureDocs = [
  'api-reports-p2.4.md',
  'compiler-compatibility.md',
  'current-compiler.md',
  'diagnostics-and-errors.md',
  'machine-contracts.md',
  'overview.md',
  'package-graph.md',
  'property-testing-p2.1.md',
  'release-security.md',
  'security-model.md',
  'testing-strategy.md',
  'tooling-outcomes-p3.md',
]

export const adrDocs = [
  'ir-compatibility.md',
  'ir-identity.md',
  'ir-immutability.md',
  'ir-metadata.md',
  'ir-references.md',
]

/** Phrases that must not appear in durable architecture docs (stale pre-P1 claims). */
export const forbiddenStalePhrases = [
  'IR, graph, diagnostics-for-compiler, and subpath exports do not exist yet',
  'Constraints for P1.2–P1.6',
]
