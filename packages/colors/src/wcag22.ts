import { ColorSpace, HSL, HWB, Lab, LCH, OKLCH, P3, sRGB, to } from 'colorjs.io/fn'

import { ColorsError } from './errors'

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)
ColorSpace.register(HSL)
ColorSpace.register(HWB)
ColorSpace.register(Lab)
ColorSpace.register(LCH)
ColorSpace.register(P3)
import type { ContrastOptions } from './contrast'

/** WCAG 2.2 success criterion 1.4.3 — normal text at level AA. RAG:✅ https://www.w3.org/TR/WCAG22/#contrast-minimum (retrieved 2026-09-19) */
export const WCAG22_AA_NORMAL_TEXT_RATIO = 4.5

/** WCAG 2.2 — large text at level AA (1.4.3). RAG:✅ same primary source (retrieved 2026-09-19) */
export const WCAG22_AA_LARGE_TEXT_RATIO = 3

/** WCAG 2.2 success criterion 1.4.11 — non-text contrast at level AA. RAG:✅ https://www.w3.org/TR/WCAG22/#non-text-contrast (retrieved 2026-09-19) */
export const WCAG22_AA_NON_TEXT_RATIO = 3

export type Wcag22TextSize = 'normal' | 'large'

export type Wcag22IndeterminateReason =
  | 'unparseable'
  | 'alpha_needs_base'
  | 'gradient'
  | 'non_solid'

export interface Wcag22TextContext {
  readonly level: 'AA'
  readonly size: Wcag22TextSize
}

export type Wcag22Policy =
  | { readonly kind: 'wcag22-text'; readonly context: Wcag22TextContext }
  | { readonly kind: 'wcag22-non-text' }
  | { readonly kind: 'apca-advisory' }

export interface Wcag22ContrastOk {
  readonly status: 'pass' | 'fail'
  readonly policy: 'wcag22-text' | 'wcag22-non-text'
  readonly ratio: number
  readonly threshold: number
  readonly pass: boolean
}

export interface Wcag22ContrastIndeterminate {
  readonly status: 'indeterminate'
  readonly policy: 'wcag22-text' | 'wcag22-non-text'
  readonly reason: Wcag22IndeterminateReason
  readonly message: string
}

export type Wcag22ContrastResult = Wcag22ContrastOk | Wcag22ContrastIndeterminate

const GRADIENT_RE = /^(?:linear|radial|conic)-gradient\(/i

function channelLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Relative luminance for sRGB (WCAG 2.x definition). */
export function relativeLuminanceSrgb(coords: readonly [number, number, number]): number {
  const [r, g, b] = coords.map(channelLinear) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function wcagContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function compositeOver(
  coords: readonly [number, number, number],
  alpha: number,
  backdrop: readonly [number, number, number],
): [number, number, number] {
  if (alpha >= 1) return [coords[0], coords[1], coords[2]]
  return [
    coords[0] * alpha + backdrop[0] * (1 - alpha),
    coords[1] * alpha + backdrop[1] * (1 - alpha),
    coords[2] * alpha + backdrop[2] * (1 - alpha),
  ]
}

function opaqueSrgb(
  fg: string,
  bg: string,
  base: string | undefined,
): [[number, number, number], [number, number, number]] {
  if (GRADIENT_RE.test(fg.trim()) || GRADIENT_RE.test(bg.trim())) {
    throw new ColorsError('GRADIENT_UNSUPPORTED', 'WCAG contrast ratio requires solid colors, not CSS gradients')
  }
  const bgSrgb = to(bg, 'srgb')
  const bgAlpha = bgSrgb.alpha ?? 1
  let bgCoords = bgSrgb.coords as [number, number, number]
  if (bgAlpha < 1) {
    if (base === undefined) {
      throw new ColorsError(
        'ALPHA_NEEDS_BASE',
        `Semi-transparent background requires opts.base for WCAG contrast (${JSON.stringify(bg)})`,
      )
    }
    const baseSrgb = to(base, 'srgb')
    if ((baseSrgb.alpha ?? 1) < 1) {
      throw new ColorsError('ALPHA_NEEDS_BASE', `Base backdrop must be opaque: ${JSON.stringify(base)}`)
    }
    bgCoords = compositeOver(bgCoords, bgAlpha, baseSrgb.coords as [number, number, number])
  }
  const fgSrgb = to(fg, 'srgb')
  const fgCoords = compositeOver(fgSrgb.coords as [number, number, number], fgSrgb.alpha ?? 1, bgCoords)
  return [fgCoords, bgCoords]
}

/**
 * WCAG 2.2 contrast ratio for a foreground/background pair (opaque after alpha flattening).
 * @throws {ColorsError} `BAD_COLOR`, `ALPHA_NEEDS_BASE`, or `GRADIENT_UNSUPPORTED`
 */
export function contrastWCAG22Ratio(fg: string, bg: string, opts?: ContrastOptions): number {
  try {
    const [fgCoords, bgCoords] = opaqueSrgb(fg, bg, opts?.base)
    const lFg = relativeLuminanceSrgb(fgCoords)
    const lBg = relativeLuminanceSrgb(bgCoords)
    return wcagContrastRatio(lFg, lBg)
  } catch (error) {
    if (error instanceof ColorsError) throw error
    throw new ColorsError(
      'BAD_COLOR',
      `Could not parse color pair for WCAG contrast: fg=${JSON.stringify(fg)}, bg=${JSON.stringify(bg)}`,
      { cause: error },
    )
  }
}

export function wcag22Threshold(policy: Wcag22Policy): number | null {
  switch (policy.kind) {
    case 'wcag22-text':
      return policy.context.size === 'large' ? WCAG22_AA_LARGE_TEXT_RATIO : WCAG22_AA_NORMAL_TEXT_RATIO
    case 'wcag22-non-text':
      return WCAG22_AA_NON_TEXT_RATIO
    case 'apca-advisory':
      return null
  }
}

export function evaluateWcag22Policy(
  fg: string,
  bg: string,
  policy: Extract<Wcag22Policy, { kind: 'wcag22-text' } | { kind: 'wcag22-non-text' }>,
  opts?: ContrastOptions,
): Wcag22ContrastResult {
  const policyName = policy.kind
  try {
    const ratio = contrastWCAG22Ratio(fg, bg, opts)
    const threshold =
      policy.kind === 'wcag22-text'
        ? policy.context.size === 'large'
          ? WCAG22_AA_LARGE_TEXT_RATIO
          : WCAG22_AA_NORMAL_TEXT_RATIO
        : WCAG22_AA_NON_TEXT_RATIO
    const pass = ratio >= threshold
    return { status: pass ? 'pass' : 'fail', policy: policyName, ratio, threshold, pass }
  } catch (error) {
    if (error instanceof ColorsError) {
      if (error.code === 'GRADIENT_UNSUPPORTED') {
        return {
          status: 'indeterminate',
          policy: policyName,
          reason: 'gradient',
          message: error.message,
        }
      }
      if (error.code === 'ALPHA_NEEDS_BASE') {
        return {
          status: 'indeterminate',
          policy: policyName,
          reason: 'alpha_needs_base',
          message: error.message,
        }
      }
      if (error.code === 'BAD_COLOR') {
        return {
          status: 'indeterminate',
          policy: policyName,
          reason: 'unparseable',
          message: error.message,
        }
      }
    }
    return {
      status: 'indeterminate',
      policy: policyName,
      reason: 'unparseable',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
