/**
 * `@themeon/tailwind` — public entry `.`.
 *
 * Re-exports only. Public surface is frozen by `api.test.ts`.
 */

export { tailwindBridge } from './bridge'
export type { TailwindBridgeOptions } from './bridge'
export { TAILWIND_NAMESPACES } from './namespaces'
export { TAILWIND_LAYER_ORDER, tailwindLayerPreamble } from './layers'
