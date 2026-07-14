import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createThemeLoader } from './theme-loader'

// Фикстуры ОБЯЗАНЫ жить внутри пакета (не `os.tmpdir()`): темы импортируют `@themeon/core`,
// и резолвер jiti идёт вверх по дереву `node_modules` от файла темы — вне монорепо резолюция
// не найдёт workspace-пакет. `.tmp-*` — уже в `.gitignore` репозитория.
const TMP_ROOT = join(import.meta.dirname, '..', '..', '.tmp-theme-loader')

// Фикстуры пишутся НАСТОЯЩИМ `defineTheme(...)` (замороженный объект, P8.4 §0) — литерал-фикстура
// прошла бы мимо блокера, который чинит этот item (findings/P8-nuxt-vue-runtime.md §0/T2).
// Читаем `.sys.color.action.primary.value` напрямую (не через `resolveTheme`/`serializeThemeCss`
// пакета `@themeon/core`, импортированного этим тест-файлом): jiti грузит тему через СВОЙ,
// независимый от Vitest'овского SSR-резолвера, ESM-путь — `@themeon/core`, увиденный ИЗНУТРИ
// загруженной темы, и `@themeon/core`, импортированный здесь наверху файла, физически два разных
// instance-а модуля в среде vitest (dual-module hazard тестового рантайма, не прод-бага: реальный
// `nuxt dev` грузит оба через один граф Vite/Nuxt). `Token`-брендинг (`TOKEN_BRAND`-symbol)
// поэтому не переживает эту границу в тесте — берём сырое значение листа, оно от инстанса не зависит.
const primaryValue = (theme: unknown): unknown =>
  (theme as { sys: { color: { action: { primary: { value: unknown } } } } }).sys.color.action.primary.value

let dir: string

beforeEach(() => {
  mkdirSync(TMP_ROOT, { recursive: true })
  dir = mkdtempSync(join(TMP_ROOT, 'run-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('createThemeLoader', () => {
  it('загружает тему с default export (форма themeon init, замороженный объект)', async () => {
    const file = join(dir, 'theme.config.ts')
    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\n\nconst theme = defineTheme({\n  base: { color: { action: { primary: 'oklch(0.42 0.2 30)' } } },\n})\n\nexport default theme\n`,
    )

    const { loadTheme } = createThemeLoader(file, './theme.config.ts', undefined)
    const theme = await loadTheme()

    expect(Object.isFrozen(theme)).toBe(true)
    expect(primaryValue(await loadTheme())).toBe('oklch(0.42 0.2 30)')
  })

  it('загружает тему с именованным export const theme', async () => {
    const file = join(dir, 'theme.config.ts')
    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\n\nexport const theme = defineTheme({\n  base: { color: { action: { primary: 'oklch(0.42 0.2 30)' } } },\n})\n`,
    )

    const { loadTheme } = createThemeLoader(file, './theme.config.ts', undefined)
    expect(primaryValue(await loadTheme())).toBe('oklch(0.42 0.2 30)')
  })

  it('загружает тему с именованным export const defaultTheme', async () => {
    const file = join(dir, 'theme.config.ts')
    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\n\nexport const defaultTheme = defineTheme({\n  base: { color: { action: { primary: 'oklch(0.42 0.2 30)' } } },\n})\n`,
    )

    const { loadTheme } = createThemeLoader(file, './theme.config.ts', undefined)
    expect(primaryValue(await loadTheme())).toBe('oklch(0.42 0.2 30)')
  })

  it('бросает с адресом файла из опции, если ни одна форма экспорта не найдена', async () => {
    const file = join(dir, 'theme.config.ts')
    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\n\nexport const somethingElse = defineTheme({\n  base: { color: { action: { primary: 'oklch(0.42 0.2 30)' } } },\n})\n`,
    )

    const { loadTheme } = createThemeLoader(file, './theme.config.ts', undefined)
    await expect(loadTheme()).rejects.toThrow(
      '[themeon] module: файл темы "./theme.config.ts" должен экспортировать тему',
    )
  })

  it('перечитывает файл с диска на каждый вызов (moduleCache/fsCache выключены) — правка отражается без нового загрузчика', async () => {
    const file = join(dir, 'theme.config.ts')
    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\n\nexport default defineTheme({\n  base: { color: { action: { primary: 'oklch(0.42 0.2 30)' } } },\n})\n`,
    )

    const { loadTheme } = createThemeLoader(file, './theme.config.ts', undefined)
    expect(primaryValue(await loadTheme())).toBe('oklch(0.42 0.2 30)')

    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\n\nexport default defineTheme({\n  base: { color: { action: { primary: 'oklch(0.11 0.05 200)' } } },\n})\n`,
    )
    expect(primaryValue(await loadTheme())).toBe('oklch(0.11 0.05 200)')
  })

  it('перечитывает граф импортов темы, а не только entry — правка ИМПОРТИРУЕМОГО файла отражается', async () => {
    writeFileSync(join(dir, 'palette.ts'), `export const primary = 'oklch(0.42 0.2 30)'\n`)
    const file = join(dir, 'theme.config.ts')
    writeFileSync(
      file,
      `import { defineTheme } from '@themeon/core'\nimport { primary } from './palette'\n\nexport default defineTheme({\n  base: { color: { action: { primary } } },\n})\n`,
    )

    const { loadTheme } = createThemeLoader(file, './theme.config.ts', undefined)
    expect(primaryValue(await loadTheme())).toBe('oklch(0.42 0.2 30)')

    writeFileSync(join(dir, 'palette.ts'), `export const primary = 'oklch(0.77 0.1 90)'\n`)
    expect(primaryValue(await loadTheme())).toBe('oklch(0.77 0.1 90)')
  })
})
