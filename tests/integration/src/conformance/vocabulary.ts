/**
 * Shared adapter conformance vocabulary (P2.6).
 *
 * Adapters must consume the compiler output (`ResolvedTheme` / serialized CSS) and must not
 * re-run naming or resolution with different options than the canonical contract fixture.
 */

/** How an adapter treats a compiled token or channel relative to the canonical contract. */
export type ConformanceClass = 'consumed' | 'ignored' | 'diagnostic'

export interface AdapterCase {
  id: string
  adapter: '@themeon/tailwind' | '@themeon/vite' | '@themeon/vue' | '@themeon/nuxt' | '@themeon/naive'
  class: ConformanceClass
  summary: string
}
