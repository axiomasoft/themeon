import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { defineTheme, resolveTheme } from '@themeon/core'
import { tailwindBridge } from '@themeon/tailwind'
import { toNative } from '@themeon/naive'
import { themeon } from '@themeon/vite'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import { buildFoucScriptOptions } from '../../../../packages/nuxt/src/internal/normalize'
import {
  canonicalThemeCss,
  conformanceTheme,
  resolvedConformanceContract,
} from '../conformance/compiled-contract'
import type { AdapterCase } from '../conformance/vocabulary'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { viteBuild } from '../helpers/vite-build'

const manifestPath = join(import.meta.dirname, '../conformance/matrix.manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { cases: AdapterCase[] }

describe('adapter conformance matrix (P2.6)', () => {
  test('manifest lists every enforced case id', () => {
    const ids = manifest.cases.map((c) => c.id).sort()
    expect(ids).toEqual(
      [
        'naive-consumed-hex',
        'naive-diagnostic-bad-color',
        'nuxt-fouc-consumed',
        'tailwind-consumed-color',
        'tailwind-ignored-non-namespace',
        'vite-consumed-css',
        'vite-diagnostic-resolve',
        'vue-fouc-consumed',
      ].sort(),
    )
  })

  test('tailwind-consumed-color: bridge literals match resolved compiler contract', () => {
    const resolved = resolvedConformanceContract()
    const bridge = tailwindBridge(resolved)
    expect(bridge).toMatch(/--color-action-primary:\s*oklch\(0\.55 0\.15 155\)/)
    expect(bridge).toContain('@theme reference')
  })

  test('tailwind-ignored-non-namespace: gradient tokens stay out of the bridge', () => {
    const resolved = resolvedConformanceContract()
    const bridge = tailwindBridge(resolved)
    expect(canonicalThemeCss()).toContain('--gradient-brand')
    expect(bridge).not.toContain('--gradient-brand')
  })

  test('vite-consumed-css: plugin load path matches serializeThemeCss(resolveTheme(theme))', async () => {
    const dir = mkFixture('adapter-vite-css', {
      'index.html': '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>',
      'main.js': `import 'virtual:themeon.css'\n`,
    })
    try {
      const expected = canonicalThemeCss()
      const { css } = await viteBuild(dir, { plugins: [themeon({ theme: conformanceTheme })] })
      expect(css.replace(/\s+/g, ' ')).toContain(
        expected.replace(/\s+/g, ' ').slice(0, 80),
      )
      expect(css).toMatch(/--color-action-primary:\s*oklch\(0\.55 0\.15 155\)/)
    } finally {
      rmFixture(dir)
    }
  })

  test('vite-diagnostic-resolve: broken theme fails build with [themeon] diagnostic text', async () => {
    const broken = defineTheme({
      base: { space: { 4: 16 as unknown as string } },
    })
    const dir = mkFixture('adapter-vite-broken', {
      'index.html': '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>',
      'main.js': `import 'virtual:themeon.css'\n`,
    })
    try {
      await expect(viteBuild(dir, { plugins: [themeon({ theme: broken })] })).rejects.toThrow(
        /\[themeon\].*THEMEON_BAD_VALUE/,
      )
    } finally {
      rmFixture(dir)
    }
  })

  test('vite-fouc-consumed: transformIndexHtml uses the same themeInitScript() as @themeon/vue', () => {
    const plugin = themeon({
      theme: conformanceTheme,
      injectFouc: { themes: ['light', 'dark'], attribute: 'data-theme' },
    })
    const hook = plugin.transformIndexHtml as (() => Array<{ children?: string; injectTo?: string }>) | undefined
    const tags = hook?.call(plugin) ?? []
    expect(tags[0]?.children).toBe(themeInitScript({ themes: ['light', 'dark'], attribute: 'data-theme' }))
    expect(tags[0]?.injectTo).toBe('head-prepend')
  })

  test('vue-fouc-consumed + nuxt-fouc-consumed: Nuxt maps module options to the same generator', () => {
    const shared = {
      storageKey: 'k',
      attribute: 'data-mode',
      default: '',
      themes: ['light', 'dark'] as const,
    }
    const fromVue = themeInitScript(shared)
    const fromNuxt = themeInitScript(
      buildFoucScriptOptions({
        ...shared,
        theme: undefined,
      }),
    )
    expect(fromNuxt).toBe(fromVue)
  })

  test('naive-consumed-hex: toNative(resolveTheme(theme)) never emits var() color strings', () => {
    const out = toNative(resolvedConformanceContract()) as { common: Record<string, unknown> }
    for (const [key, value] of Object.entries(out.common)) {
      if (typeof value !== 'string') continue
      if (!/color/i.test(key)) continue
      expect(value).not.toContain('var(')
      expect(value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
    }
  })

  test('naive-diagnostic-bad-color: unparsable role throws BAD_COLOR', () => {
    const theme = defineTheme({
      base: { color: { bg: { page: 'not-a-color' } } },
    })
    let thrown: unknown
    try {
      toNative(resolveTheme(theme))
    } catch (e) {
      thrown = e
    }
    expect((thrown as { code?: string }).code).toBe('BAD_COLOR')
  })
})
