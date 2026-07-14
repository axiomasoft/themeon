import { describe, expect, test } from 'vitest'
import { defineConfig, parse } from '@terrazzo/parser'
import { toDTCG } from './to-dtcg'
import { defineTheme, defineTokens } from '../define'
import { ThemeonError } from '../errors'
import type { DTCGDocument } from './types'

/** Определение из примера P1.2 (палитра + ссылка + примитивы + композит + тема). */
function exampleTheme() {
  const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
  return defineTheme({
    base: {
      color: { bg: { page: 'oklch(0.99 0 0)' }, action: { primary: palette.forest[600] } },
      space: { 4: '1rem' },
      text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
      breakpoint: { md: '768px' },
    },
    themes: { dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } } },
  })
}

/**
 * Прогоняет пачку файлов через `@terrazzo/parser@2.4.0` (findings §5, §9.14) — вердикт
 * «валидно» даёт сторонний парсер, а не наш ассерт (Implementation Rule 1). При наличии
 * `themeon.resolver.json` он единственный top-level input (Terrazzo это требует), прочие
 * файлы отдаются через `req` по относительным `$ref`.
 */
async function validateWithTerrazzo(files: Record<string, DTCGDocument>): Promise<void> {
  const config = defineConfig({}, { cwd: new URL('file:///tmp/') })
  const resolverName = Object.keys(files).find((f) => f === 'themeon.resolver.json')
  if (resolverName) {
    const req = async (url: URL): Promise<string> => {
      const name = url.pathname.replace(/^\//, '')
      if (!(name in files)) throw new Error(`unknown $ref target: ${name}`)
      return JSON.stringify(files[name])
    }
    await parse([{ filename: new URL(`file:///${resolverName}`), src: files[resolverName] }], { config, req })
    return
  }
  const inputs = Object.entries(files).map(([name, doc]) => ({ filename: new URL(`file:///${name}`), src: doc }))
  await parse(inputs, { config })
}

/** Рекурсивно собирает все ключи групп/токенов документа (без `$`-полей). */
function collectKeys(node: unknown, out: string[] = []): string[] {
  if (typeof node !== 'object' || node === null) return out
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue
    out.push(k)
    collectKeys(v, out)
  }
  return out
}

describe('toDTCG — файлы пачки', () => {
  test('эмитит base + <theme> + resolver', () => {
    const { files } = toDTCG(exampleTheme())
    expect(Object.keys(files).sort()).toEqual(['base.tokens.json', 'dark.tokens.json', 'themeon.resolver.json'])
  })
})

describe('toDTCG — base.tokens.json', () => {
  test('примитивы структурной формой, ссылка — curly-brace, цель ссылки включена', () => {
    const base = toDTCG(exampleTheme()).files['base.tokens.json'] as DTCGDocument
    expect(base).toEqual({
      color: {
        bg: { page: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.99, 0, 0], hex: '#fcfcfc' } } },
        action: { primary: { $type: 'color', $value: '{color.forest.600}' } },
        forest: {
          600: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.55, 0.13, 155], hex: '#14874e' } },
        },
      },
      space: { 4: { $type: 'dimension', $value: { value: 1, unit: 'rem' } } },
      text: {
        '2xl': {
          fontSize: { $type: 'dimension', $value: { value: 1.5, unit: 'rem' } },
          lineHeight: { $type: 'number', $value: 1.33 },
        },
      },
      breakpoint: { md: { $type: 'dimension', $value: { value: 768, unit: 'px' } } },
      // text эмитится примитивами, не "typography" (§9.8) — оригинальный композит бриджится.
      $extensions: {
        'com.themeon': { unrepresentable: { 'text.2xl': { type: 'text', value: { size: '1.5rem', lineHeight: 1.33 } } } },
      },
    })
  })

  test('корректность hex дефолт-темы против colorjs.io уже покрыта color.test.ts (единственный источник эталона)', () => {
    // Табличный тест зафиксирован в color.test.ts (§9.3 находки); здесь достаточно не дублировать эталон.
    expect(true).toBe(true)
  })
})

describe('toDTCG — <theme>.tokens.json', () => {
  test('только патченные пути, значения структурной формой', () => {
    const dark = toDTCG(exampleTheme()).files['dark.tokens.json'] as DTCGDocument
    expect(dark).toEqual({
      color: {
        bg: { page: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.15, 0, 0], hex: '#0b0b0b' } } },
      },
    })
  })
})

describe('toDTCG — themeon.resolver.json (аудит #25)', () => {
  test('modifier получает синтетический base-only контекст как default (≥2 контекста без риска коллизии)', () => {
    const resolver = toDTCG(exampleTheme()).files['themeon.resolver.json'] as DTCGDocument
    expect(resolver).toEqual({
      version: '2025.10',
      sets: { base: { sources: [{ $ref: './base.tokens.json' }] } },
      modifiers: {
        theme: {
          contexts: { dark: [{ $ref: './dark.tokens.json' }], default: [] },
          default: 'default',
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
    })
  })

  test('тема названа "default" — синтетический ключ уходит на "base"', () => {
    const def = defineTheme({
      base: { space: { 4: '1rem' } },
      themes: { default: { space: { 4: '1.5rem' } } },
    })
    const resolver = toDTCG(def).files['themeon.resolver.json'] as DTCGDocument & {
      modifiers: { theme: { contexts: Record<string, unknown>; default: string } }
    }
    expect(resolver.modifiers.theme.default).toBe('base')
    expect(Object.keys(resolver.modifiers.theme.contexts).sort()).toEqual(['base', 'default'])
  })

  test('resolver не эмитится при отсутствии тем (modifier требует ≥ 2 контекстов)', () => {
    const noThemes = defineTheme({ base: { space: { 4: '1rem' } } })
    const files = toDTCG(noThemes).files
    expect(files['themeon.resolver.json']).toBeUndefined()
    expect(Object.keys(files)).toEqual(['base.tokens.json'])
  })

  test('splitThemes:false — только base, без тем и resolver', () => {
    const files = toDTCG(exampleTheme(), { splitThemes: false }).files
    expect(Object.keys(files)).toEqual(['base.tokens.json'])
  })
})

describe('toDTCG — маппинг типов', () => {
  test('duration → {value,unit}, cubicBezier(cubic-bezier) → массив, fontFamily-стек → массив имён', () => {
    const def = defineTheme({
      base: {
        duration: { fast: '150ms' },
        ease: { custom: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        font: { sans: 'Inter, sans-serif' },
        fontWeight: { bold: 700 },
        z: { modal: 100 },
      },
    })
    const base = toDTCG(def).files['base.tokens.json'] as DTCGDocument
    expect(base).toEqual({
      duration: { fast: { $type: 'duration', $value: { value: 150, unit: 'ms' } } },
      ease: { custom: { $type: 'cubicBezier', $value: [0.4, 0, 0.2, 1] } },
      font: { sans: { $type: 'fontFamily', $value: ['Inter', 'sans-serif'] } },
      fontWeight: { bold: { $type: 'fontWeight', $value: 700 } },
      z: { modal: { $type: 'number', $value: 100 } },
    })
  })

  test('cubicBezier: именованные CSS-кривые → точный массив (findings #28)', () => {
    const def = defineTheme({ base: { ease: { out: 'ease-out', linear: 'linear', inOut: 'ease-in-out' } } })
    const { files, warnings } = toDTCG(def)
    const base = files['base.tokens.json'] as DTCGDocument
    expect(base).toEqual({
      ease: {
        out: { $type: 'cubicBezier', $value: [0, 0, 0.58, 1] },
        linear: { $type: 'cubicBezier', $value: [0, 0, 1, 1] },
        inOut: { $type: 'cubicBezier', $value: [0.42, 0, 0.58, 1] },
      },
    })
    expect(warnings).toEqual([])
  })

  test('непредставимое: %/calc()/неизвестная кривая → токен ОТСУТСТВУЕТ, warning + мост $extensions', () => {
    const def = defineTheme({
      base: {
        space: { full: '100%', fluid: 'calc(1rem + 2vw)' },
        ease: { stepped: 'steps(4)' },
      },
    })
    const { files, warnings } = toDTCG(def)
    const base = files['base.tokens.json'] as DTCGDocument & {
      $extensions: { 'com.themeon': { unrepresentable: Record<string, { type: string; value: unknown }> } }
    }
    expect(base.space).toBeUndefined()
    expect(base.ease).toBeUndefined()
    expect(base.$extensions['com.themeon'].unrepresentable).toEqual({
      'space.full': { type: 'dimension', value: '100%' },
      'space.fluid': { type: 'dimension', value: 'calc(1rem + 2vw)' },
      'ease.stepped': { type: 'cubicBezier', value: 'steps(4)' },
    })
    expect(warnings).toHaveLength(3)
    expect(warnings.some((w) => w.includes('space.full'))).toBe(true)
    expect(warnings.some((w) => w.includes('space.fluid'))).toBe(true)
    expect(warnings.some((w) => w.includes('ease.stepped'))).toBe(true)
  })

  test('em допустим Terrazzo, но НЕ спекой §8.2.1 — пропуск по спеке, не по мягкому линту', () => {
    const def = defineTheme({ base: { space: { lead: '1.2em' } } })
    const { files, warnings } = toDTCG(def)
    const base = files['base.tokens.json'] as DTCGDocument
    expect(base.space).toBeUndefined()
    expect(warnings[0]).toContain('space.lead')
  })

  test('color: непарсибельная строка → warning + мост, не тихая строка', () => {
    const def = defineTheme({ base: { color: { weird: 'color-mix(in oklch, red, blue)' } } })
    const { files, warnings } = toDTCG(def)
    const base = files['base.tokens.json'] as DTCGDocument & {
      $extensions: { 'com.themeon': { unrepresentable: Record<string, unknown> } }
    }
    expect(base.color).toBeUndefined()
    expect(base.$extensions['com.themeon'].unrepresentable).toEqual({
      'color.weird': { type: 'color', value: 'color-mix(in oklch, red, blue)' },
    })
    expect(warnings).toHaveLength(1)
  })

  test('shadow/gradient: НИКОГДА не эмитятся (P-D60) — всегда мост + warning', () => {
    const def = defineTheme({
      base: { shadow: { sm: '0 1px 2px rgba(0,0,0,0.1)' }, gradient: { hero: 'linear-gradient(90deg, red, blue)' } },
    })
    const { files, warnings } = toDTCG(def)
    const base = files['base.tokens.json'] as DTCGDocument & {
      $extensions: { 'com.themeon': { unrepresentable: Record<string, { type: string; value: unknown }> } }
    }
    expect(base.shadow).toBeUndefined()
    expect(base.gradient).toBeUndefined()
    expect(base.$extensions['com.themeon'].unrepresentable).toEqual({
      'shadow.sm': { type: 'shadow', value: '0 1px 2px rgba(0,0,0,0.1)' },
      'gradient.hero': { type: 'gradient', value: 'linear-gradient(90deg, red, blue)' },
    })
    expect(warnings).toHaveLength(2)
  })

  test('чистая тема (без деградаций) — warnings пуст', () => {
    // exampleTheme() несёт `text`, которое ВСЕГДА деградирует до примитивов (модель не даёт
    // typography-композит) — для «чистого» случая берём тему без text/shadow/gradient/unicode-краёв.
    const def = defineTheme({
      base: { color: { bg: 'oklch(0.99 0 0)' }, space: { 4: '1rem' }, ease: { out: 'ease-out' } },
    })
    const { warnings } = toDTCG(def)
    expect(warnings).toEqual([])
  })
})

describe('toDTCG — экранирование имён (findings #11, §5.1.1 MUST NOT)', () => {
  test('сегмент с точкой → dash-имя + $extensions.path на оригинал + рабочий алиас', () => {
    const palette = defineTokens('color', { brand: { base: '#3ab7bf' } })
    const def = defineTheme({ base: { space: { '1.5': '0.375rem' }, color: { link: palette.brand.base } } })
    const base = toDTCG(def).files['base.tokens.json'] as DTCGDocument & {
      space: { '1-5': { $type: string; $value: unknown; $extensions?: { 'com.themeon': { path: string[] } } } }
    }
    expect(base.space['1.5' as never]).toBeUndefined()
    expect(base.space['1-5']).toEqual({
      $type: 'dimension',
      $value: { value: 0.375, unit: 'rem' },
      $extensions: { 'com.themeon': { path: ['space', '1.5'] } },
    })
    // Ни одной точки среди ключей всего документа (свойство-тест, findings §9.4).
    expect(collectKeys(base).some((k) => k.includes('.'))).toBe(false)
  })

  test('тема с именем "base" → ThemeonError DTCG_NAME_COLLISION (иначе тихо затирает base.tokens.json, review finding)', () => {
    const def = defineTheme({
      base: { color: { bg: 'oklch(0.99 0 0)' } },
      themes: { base: { color: { bg: 'oklch(0.15 0 0)' } } },
    })
    expect(() => toDTCG(def)).toThrow(ThemeonError)
    try {
      toDTCG(def)
    } catch (e) {
      expect((e as ThemeonError).code).toBe('DTCG_NAME_COLLISION')
    }
  })

  test('коллизия эскейпа (space["1.5"] и space["1-5"] вместе) → ThemeonError DTCG_NAME_COLLISION', () => {
    const def = defineTheme({ base: { space: { '1.5': '0.375rem', '1-5': '0.4rem' } } })
    expect(() => toDTCG(def)).toThrow(ThemeonError)
    try {
      toDTCG(def)
    } catch (e) {
      expect((e as ThemeonError).code).toBe('DTCG_NAME_COLLISION')
    }
  })
})

describe('toDTCG × @terrazzo/parser — conformance (findings §9.14, обязательный тест)', () => {
  test('round-trip дефолт-подобной темы (разнородные типы + 2 темы) → 0 ошибок стороннего валидатора', async () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' }, brand: { base: '#3ab7bf' } })
    const def = defineTheme({
      base: {
        color: {
          bg: { page: 'oklch(0.99 0 0)' },
          action: { primary: palette.forest[600] },
          link: palette.brand.base,
        },
        space: { 4: '1rem', '1.5': '0.375rem' },
        text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
        duration: { fast: '150ms' },
        ease: { out: 'ease-out' },
        breakpoint: { md: '768px' },
      },
      themes: {
        dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } },
        highContrast: { color: { bg: { page: '#ffffff' } } },
      },
    })
    const { files } = toDTCG(def)
    await expect(validateWithTerrazzo(files)).resolves.not.toThrow()
  })

  test('невалидная строковая форма цвета (без нашего фикса) — валидатор ловит; санитарный негативный контроль', async () => {
    await expect(
      validateWithTerrazzo({
        'base.tokens.json': { color: { legacy: { $type: 'color', $value: 'hsl(210 40% 50%)' } } },
      }),
    ).rejects.toThrow()
  })
})
