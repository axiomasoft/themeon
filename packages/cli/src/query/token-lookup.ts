import { canonicalId } from '@themeon/core/compiler'
import type { IrDocument, IrPath, IrToken } from '@themeon/core/compiler'

export function parseTokenPath(raw: string): IrPath {
  const trimmed = raw.trim()
  if (trimmed === '') throw new Error('Token path is required')
  return trimmed.split('.').filter((segment) => segment.length > 0)
}

export function pathLabel(path: readonly string[]): string {
  return path.join('.')
}

export function findIrToken(document: IrDocument, path: IrPath): IrToken | undefined {
  const id = canonicalId(path)
  for (const token of document.tokens) {
    if (token.id === id) return token
  }
  for (const list of Object.values(document.themes)) {
    for (const token of list) {
      if (token.id === id) return token
    }
  }
  return undefined
}

export function findResolvedByPath(
  resolved: import('@themeon/core/compiler').ResolvedTheme,
  path: IrPath,
): import('@themeon/core/compiler').ResolvedToken | undefined {
  const key = pathLabel(path)
  return resolved.tokens.find((token) => pathLabel(token.path) === key)
}
