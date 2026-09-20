const VAR_RE = /var\(\s*(--[a-zA-Z0-9_-]+)/g

/** Collect custom property names referenced via `var(--name` in a declaration value. */
export function customPropertiesInValue(value: string): readonly string[] {
  const names: string[] = []
  for (const match of value.matchAll(VAR_RE)) {
    const name = match[1]
    if (name !== undefined) names.push(name)
  }
  return names
}
