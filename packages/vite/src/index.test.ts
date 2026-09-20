import { describe, expect, it, vi } from 'vitest'
import { defineTheme, defineTokens } from '@themeon/core'
import { themeon } from './index'
import type { Plugin } from 'vite'
import type { ThemeonViteOptions } from './types'

/** Минимальная тема для тестов — одна база, без доп. тем. */
function makeTheme() {
  const palette = defineTokens('color', { neutral: { 0: 'oklch(0.99 0 0)' } })
  return defineTheme({
    base: { color: { bg: { page: palette.neutral[0] } } },
  })
}

/**
 * Хелперы приведения хук-полей плагина к вызываемой форме: Vite типизирует хуки как
 * `ObjectHook<Fn>` (голая функция ИЛИ `{handler}`-обёртка с фильтрами) — здесь везде голая
 * функция (как в Code Guidance), но точный `this`-контекст (`PluginContext`) избыточен для
 * теста; приводим свободно через `unknown`.
 */
type AnyFn = (...args: unknown[]) => unknown
function asFn(hook: unknown): AnyFn {
  return hook as AnyFn
}
function callWith(hook: unknown, thisArg: unknown, ...args: unknown[]): unknown {
  return (hook as (...a: unknown[]) => unknown).apply(thisArg, args)
}

function makePlugin(overrides: Partial<ThemeonViteOptions> = {}): Plugin {
  return themeon({ theme: makeTheme(), ...overrides })
}

describe('themeon() — фабрика', () => {
  it('без `theme` бросает', () => {
    // @ts-expect-error — теста ради: theme обязателен
    expect(() => themeon({})).toThrow('`theme` option is required')
  })
})

describe('resolveId', () => {
  it('публичный id → resolved-id с ведущим \\0', () => {
    const plugin = makePlugin()
    expect(asFn(plugin.resolveId)('virtual:themeon.css')).toBe('\0virtual:themeon.css')
  })

  it('чужой id → undefined', () => {
    const plugin = makePlugin()
    expect(asFn(plugin.resolveId)('some/other/id.css')).toBeUndefined()
  })

  it('кастомный `virtualId` меняет публичный/resolved id', () => {
    const plugin = makePlugin({ virtualId: 'virtual:my-theme.css' })
    expect(asFn(plugin.resolveId)('virtual:my-theme.css')).toBe('\0virtual:my-theme.css')
    expect(asFn(plugin.resolveId)('virtual:themeon.css')).toBeUndefined()
  })
})

describe('load', () => {
  it('resolved-id → CSS с @layer themeon.tokens и :root', async () => {
    const plugin = makePlugin()
    const css = await asFn(plugin.load)('\0virtual:themeon.css')
    expect(css).toContain('@layer themeon.tokens')
    expect(css).toContain(':root')
  })

  it('чужой id → undefined', async () => {
    const plugin = makePlugin()
    expect(await asFn(plugin.load)('/some/other.css')).toBeUndefined()
  })

  it('повторный load без инвалидации переиспользует последнюю доставку (один compile)', async () => {
    const themeFactory = vi.fn(() => makeTheme())
    const plugin = themeon({ theme: themeFactory })
    await asFn(plugin.load)('\0virtual:themeon.css')
    await asFn(plugin.load)('\0virtual:themeon.css')
    expect(themeFactory).toHaveBeenCalledTimes(1)
  })

  it('resolve failure reports THEMEON_BAD_VALUE through this.error, not message parsing', async () => {
    const plugin = themeon({
      theme: defineTheme({ base: { space: { 4: 16 as unknown as string } } }),
    })
    const error = vi.fn((message: string): never => {
      throw new Error(message)
    })
    await expect(callWith(plugin.load, { error }, '\0virtual:themeon.css')).rejects.toThrow(/THEMEON_BAD_VALUE/)
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(error.mock.calls[0]?.[0])).toContain('THEMEON_BAD_VALUE')
    expect(String(error.mock.calls[0]?.[0])).toContain('error')
  })
})

describe('configResolved — резолв tokensFiles', () => {
  it('относительный tokensFiles резолвится в абсолютный путь от config.root (D3)', async () => {
    const plugin = makePlugin({ tokensFiles: ['./theme.config.ts'] })
    const mod = { url: '/virtual:themeon.css' }
    const environment = {
      moduleGraph: { getModuleById: vi.fn(() => mod), invalidateModule: vi.fn() },
    }
    callWith(plugin.configResolved, undefined, { root: '/proj' })

    // hotUpdate({file}) Vite всегда даёт абсолютный путь — до фикса D3 это никогда не матчилось.
    const result = await callWith(plugin.hotUpdate, { environment }, {
      file: '/proj/theme.config.ts',
      server: {},
    })

    expect(environment.moduleGraph.invalidateModule).toHaveBeenCalledWith(mod)
    expect(result).toEqual([mod])
  })
})

describe('hotUpdate', () => {
  function fakeEnvironment(mod: { url: string } | undefined) {
    return {
      moduleGraph: {
        getModuleById: vi.fn(() => mod),
        invalidateModule: vi.fn(),
      },
    }
  }

  function withResolvedRoot(plugin: Plugin, root: string): Plugin {
    callWith(plugin.configResolved, undefined, { root })
    return plugin
  }

  it('файл ∈ tokensFiles: invalidateModule + возвращает [mod] (P-D55, supersedes P-D26)', async () => {
    const plugin = withResolvedRoot(
      makePlugin({ tokensFiles: ['/proj/tokens/theme.ts'] }),
      '/proj',
    )
    const mod = { url: '/@id/__x00__virtual:themeon.css' }
    const environment = fakeEnvironment(mod)

    const result = await callWith(plugin.hotUpdate, { environment }, {
      file: '/proj/tokens/theme.ts',
      server: {},
    })

    expect(environment.moduleGraph.getModuleById).toHaveBeenCalledWith('\0virtual:themeon.css')
    expect(environment.moduleGraph.invalidateModule).toHaveBeenCalledWith(mod)
    expect(result).toEqual([mod])
  })

  it('файл не из tokensFiles — no-op (undefined, invalidateModule не зовётся)', async () => {
    const plugin = withResolvedRoot(
      makePlugin({ tokensFiles: ['/proj/tokens/theme.ts'] }),
      '/proj',
    )
    const environment = fakeEnvironment({ url: '/virtual:themeon.css' })

    const result = await callWith(plugin.hotUpdate, { environment }, {
      file: '/proj/other-file.ts',
      server: {},
    })

    expect(result).toBeUndefined()
    expect(environment.moduleGraph.invalidateModule).not.toHaveBeenCalled()
  })

  it('без tokensFiles — HMR неактивен, любой файл — no-op', async () => {
    const plugin = withResolvedRoot(makePlugin(), '/proj')
    const environment = fakeEnvironment({ url: '/virtual:themeon.css' })

    const result = await callWith(plugin.hotUpdate, { environment }, {
      file: '/proj/tokens/theme.ts',
      server: {},
    })

    expect(result).toBeUndefined()
  })

  it('модуль ещё не в графе (никто не импортировал virtual) — no-op без падения', async () => {
    const plugin = withResolvedRoot(
      makePlugin({ tokensFiles: ['/proj/tokens/theme.ts'] }),
      '/proj',
    )
    const environment = fakeEnvironment(undefined)

    await expect(
      callWith(plugin.hotUpdate, { environment }, {
        file: '/proj/tokens/theme.ts',
        server: {},
      }),
    ).resolves.toBeUndefined()
  })
})

describe('transformIndexHtml', () => {
  it('injectFouc:true → script-tag head-prepend с IIFE', () => {
    const plugin = makePlugin({ injectFouc: true })
    const result = asFn(plugin.transformIndexHtml)()
    expect(result).toEqual([
      expect.objectContaining({
        tag: 'script',
        injectTo: 'head-prepend',
        children: expect.stringContaining('document.documentElement'),
      }),
    ])
  })

  it('injectFouc с опциями — проброс в themeInitScript', () => {
    const plugin = makePlugin({ injectFouc: { attribute: 'data-mode' } })
    const result = asFn(plugin.transformIndexHtml)() as Array<{ children: string }>
    expect(result[0]?.children).toContain('data-mode')
  })

  it('без injectFouc — undefined', () => {
    const plugin = makePlugin()
    expect(asFn(plugin.transformIndexHtml)()).toBeUndefined()
  })
})
