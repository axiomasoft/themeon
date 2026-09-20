import stylelint from 'stylelint'
import type { LoadedManifest } from '../manifest'
import { loadManifestFile } from '../manifest'
import { customPropertiesInValue } from '../vars-in-value'

export const ruleName = 'themeon/deprecated-custom-property'

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (name: string, detail: string) =>
    detail !== ''
      ? `Custom property "${name}" is deprecated: ${detail} (THEMEON_DEPRECATED_CUSTOM_PROPERTY)`
      : `Custom property "${name}" is deprecated (THEMEON_DEPRECATED_CUSTOM_PROPERTY)`,
  manifest: (reason: string) =>
    `ThemeOn manifest could not be loaded (${reason}) (THEMEON_MANIFEST_UNAVAILABLE)`,
})

function messageText(
  factory: string | ((...args: string[]) => string) | undefined,
  ...args: string[]
): string {
  if (typeof factory === 'function') return factory(...args)
  return factory ?? args.join(' ')
}

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
        message: messageText(messages.manifest, manifest.reason),
        word: manifest.reason,
      })
    }
  }

  return (root, result) => {
    root.walkDecls((decl) => {
      for (const name of customPropertiesInValue(decl.value)) {
        if (!manifest.deprecated.has(name)) continue
        stylelint.utils.report({
          ruleName,
          result,
          node: decl,
          message: messageText(messages.rejected, name, manifest.deprecated.get(name) ?? ''),
          word: name,
        })
      }
    })
  }
}

ruleFunction.ruleName = ruleName
ruleFunction.messages = messages

export default stylelint.createPlugin(ruleName, ruleFunction)
