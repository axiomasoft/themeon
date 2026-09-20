import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineTheme } from '@themeon/core'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import { themeon } from './index'

function makeTheme() {
  return defineTheme({
    base: { color: { bg: { page: 'oklch(0.99 0 0)' } } },
    themes: { dark: { color: { bg: { page: 'oklch(0.2 0 0)' } } } },
  })
}

type AnyFn = (...args: unknown[]) => unknown
function asFn(hook: unknown): AnyFn {
  return hook as AnyFn
}
function callWith(hook: unknown, thisArg: unknown, ...args: unknown[]): unknown {
  return (hook as (...a: unknown[]) => unknown).apply(thisArg, args)
}

describe('delivery artifacts (P3.3)', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  it('writes PHP-readable manifest and CSP when artifacts enabled', async () => {
    const root = mkdtempSync(join(tmpdir(), 'themeon-manifest-'))
    dirs.push(root)
    const plugin = themeon({
      theme: makeTheme(),
      artifacts: true,
      injectFouc: true,
    })
    callWith(plugin.configResolved, undefined, { root })

    await callWith(plugin.buildStart, { error: vi.fn() })

    const manifest = JSON.parse(
      readFileSync(join(root, '.themeon/manifest.json'), 'utf8'),
    ) as { schemaVersion: number; owner: string; fingerprint: string; css: { sha256: string } }
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.owner).toBe('@themeon/vite')
    expect(manifest.fingerprint).toMatch(/^[0-9a-f]{16}$/)

    const csp = JSON.parse(readFileSync(join(root, '.themeon/csp.json'), 'utf8')) as {
      script: { cspSha256: string }
    }
    expect(csp.script.cspSha256).toBeTruthy()
    expect(themeInitScript()).toContain('document.documentElement')
  })

  it('HMR refresh updates manifest fingerprint after theme change', async () => {
    const root = mkdtempSync(join(tmpdir(), 'themeon-hmr-manifest-'))
    dirs.push(root)
    const tokenPath = join(root, 'theme.config.ts')
    let generation = 0
    const plugin = themeon({
      theme: () => {
        generation += 1
        return defineTheme({
          base: {
            color: {
              bg: { page: generation === 1 ? 'oklch(0.99 0 0)' : 'oklch(0.95 0.02 0)' },
            },
          },
        })
      },
      tokensFiles: [tokenPath],
      artifacts: { debounceMs: 0 },
    })
    callWith(plugin.configResolved, undefined, { root })
    await callWith(plugin.buildStart, { error: vi.fn() })

    const readFingerprint = () =>
      JSON.parse(readFileSync(join(root, '.themeon/manifest.json'), 'utf8')).fingerprint as string

    const first = readFingerprint()
    generation = 1
    const mod = { url: '/virtual:themeon.css' }
    const environment = {
      moduleGraph: { getModuleById: vi.fn(() => mod), invalidateModule: vi.fn() },
    }
    await callWith(plugin.hotUpdate, { environment }, { file: tokenPath, server: {} })
    const second = readFingerprint()
    expect(second).not.toBe(first)
  })
})
