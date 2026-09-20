import stylelint from 'stylelint'
import type { LoadedManifest } from '../manifest'
import { isThemeShapedVar, loadManifestFile } from '../manifest'
import { customPropertiesInValue } from '../vars-in-value'

export const ruleName = 'themeon/unknown-custom-property'

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (name: string) =>
    `Custom property "${name}" is not listed in the ThemeOn Vite manifest (THEMEON_UNKNOWN_CUSTOM_PROPERTY)`,
  manifest: (reason: string) =>
    `ThemeOn manifest could not be loaded (${reason}) (THEMEON_MANIFEST_UNAVAILABLE)`,
})

function manifestFromOptions(options: { manifestPath?: string }): LoadedManifest | null {
  const path = options.manifestPath?.trim()
  if (path === undefined || path === '') return null
  return loadManifestFile(path)
}

const ruleFunction: stylelint.Rule = (primary, secondaryOptions) => {
  const options = (secondaryOptions ?? {}) as { manifestPath?: string }
  const manifest = manifestFromOptions(options)
  if (manifest === null) return () => undefined
  if (!manifest.ok) {
    return (root, result) => {
      stylelint.utils.report({
        ruleName,
        result,
        node: root,
        message: messages.manifest(manifest.reason),
        word: manifest.reason,
      })
    }
  }

  return (root, result) => {
    root.walkDecls((decl) => {
      for (const name of customPropertiesInValue(decl.value)) {
        if (manifest.cssVariables.has(name)) continue
        if (!isThemeShapedVar(name, manifest.themeGroups)) continue
        stylelint.utils.report({
          ruleName,
          result,
          node: decl,
          message: messages.rejected(name),
          word: name,
        })
      }
    })
  }
}

ruleFunction.ruleName = ruleName
ruleFunction.messages = messages

export default stylelint.createPlugin(ruleName, ruleFunction)
