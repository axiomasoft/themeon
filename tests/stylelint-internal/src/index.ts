import type { Plugin } from 'stylelint'
import deprecatedCustomProperty from './rules/deprecated-custom-property'
import unknownCustomProperty from './rules/unknown-custom-property'

/** Internal Stylelint plugin (not published). Requires explicit `manifestPath` per rule. */
const plugins: Plugin[] = [unknownCustomProperty, deprecatedCustomProperty]
export default plugins

export { loadManifestFile, parseManifestJson } from './manifest'
