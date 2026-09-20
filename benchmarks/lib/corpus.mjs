import { defineTheme, defineTokens } from '@themeon/core'

/** @param {number} leafCount */
export function flatColorLeaves(leafCount) {
  const perGroup = Math.max(1, Math.ceil(Math.sqrt(leafCount)))
  const color = {}
  let placed = 0
  for (let g = 0; g < perGroup && placed < leafCount; g++) {
    const group = `g${g}`
    color[group] = {}
    for (let l = 0; l < perGroup && placed < leafCount; l++) {
      const n = placed++
      color[group][`t${l}`] = `#${(n % 0xffffff).toString(16).padStart(6, '0')}`
    }
  }
  return color
}

/**
 * @param {{ leafCount: number, themeCount: number }} spec
 */
export function corpusScaled(spec) {
  const baseColor = flatColorLeaves(spec.leafCount)
  const themes = {}
  for (let t = 0; t < spec.themeCount; t++) {
    const patchColor = {}
    let patched = 0
    const budget = Math.max(1, Math.floor(spec.leafCount / Math.max(1, spec.themeCount)))
    outer: for (const [group, leaves] of Object.entries(baseColor)) {
      patchColor[group] = {}
      for (const [leaf, value] of Object.entries(leaves)) {
        if (patched >= budget) break outer
        patchColor[group][leaf] =
          typeof value === 'string' ? `#${((patched + t + 1) % 0xffffff).toString(16).padStart(6, '0')}` : value
        patched++
      }
    }
    themes[`theme-${t}`] = { color: patchColor }
  }
  return defineTheme({ base: { color: baseColor }, themes })
}

export function corpusSmall() {
  return corpusScaled({ leafCount: 200, themeCount: 2 })
}

export function corpusMedium() {
  return corpusScaled({ leafCount: 2000, themeCount: 4 })
}

export function corpusLarge() {
  return corpusScaled({ leafCount: 10_000, themeCount: 20 })
}


/** Wide “component” layer: many sibling tokens under one subtree. */
export function corpusWideComponent(count) {
  const color = { component: {} }
  for (let i = 0; i < count; i++) {
    color.component[`c${i}`] = `#${(i % 0xffffff).toString(16).padStart(6, '0')}`
  }
  return defineTheme({ base: { color } })
}

/** Medium base with up to 500 overrides per tenant theme (existing paths only). */
export function corpusTenantPatch() {
  const leafCount = 2000
  const baseColor = flatColorLeaves(leafCount)
  const themes = {}
  for (let t = 0; t < 4; t++) {
    const patchColor = {}
    let n = 0
    outer: for (const [group, leaves] of Object.entries(baseColor)) {
      patchColor[group] = {}
      for (const [leaf] of Object.entries(leaves)) {
        if (n >= 500) break outer
        patchColor[group][leaf] = `#${((t * 500 + n) % 0xffffff).toString(16).padStart(6, '0')}`
        n++
      }
    }
    themes[`tenant-${t}`] = { color: patchColor }
  }
  return defineTheme({ base: { color: baseColor }, themes })
}

export const corpusCatalog = Object.freeze({
  small: corpusSmall,
  medium: corpusMedium,
  large: corpusLarge,
  wideComponent: () => corpusWideComponent(5000),
  tenantPatch: corpusTenantPatch,
})
