import { describe, expect, test } from 'vitest'
import { fromDTCG } from './from-dtcg'
import { toDTCG } from './to-dtcg'
import { defineTheme, defineTokens } from '../define'
import { resolveTheme } from '../resolve'
import { isToken } from '../types'
import type { DTCGDocument } from './types'
import type { TokenTreeInput } from '../types'
import { walkTree } from '../internal/walk'

describe('fromDTCG — формы значений', () => {
  test('color: строковая и структурная формы принимаются одинаково', () => {
    const doc: DTCGDocument = {
      color: {
        a: { $type: 'color', $value: '#3ab7bf' },
        b: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.72, 0.11, 221.19] } },
      },
    }
    const { definition } = fromDTCG(doc)
    const vars = resolveTheme(definition).vars
    expect(vars['--color-a']).toBe('#3ab7bf')
    expect(vars['--color-b']).toBe('oklch(0.72 0.11 221.19)')
  })

  test('dimension структурной формы → строка с единицами', () => {
    const { definition } = fromDTCG({
      space: { s: { $type: 'dimension', $value: { value: 0.5, unit: 'rem' } } },
    })
    expect(resolveTheme(definition).vars['--spacing-s']).toBe('0.5rem')
  })
})

describe('fromDTCG — $type-наследование по группам', () => {
  test('токены без $type берут тип из ближайшей группы', () => {
    const doc: DTCGDocument = {
      color: {
        $type: 'color',
        brand: { $value: '#000000' },
        nested: { deep: { $value: '#ffffff' } },
      },
    }
    const { definition, warnings } = fromDTCG(doc)
    const vars = resolveTheme(definition).vars
    expect(vars['--color-brand']).toBe('#000000')
    expect(vars['--color-nested-deep']).toBe('#ffffff')
    expect(warnings).toEqual([])
  })
})

describe('fromDTCG — алиасы', () => {
  test('curly-brace → реальная Token-ссылка (var-chain, не инлайн)', () => {
    const doc: DTCGDocument = {
      color: {
        forest: { 600: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.55, 0.13, 155] } } },
        action: { primary: { $type: 'color', $value: '{color.forest.600}' } },
      },
    }
    const { definition } = fromDTCG(doc)
    // ссылка обязана дойти до резолвера как Token, а не строка '{...}'.
    let actionToken
    for (const { path, value } of walkTree(definition.sys as unknown as TokenTreeInput)) {
      if (path.join('.') === 'color.action.primary') actionToken = value
    }
    expect(isToken(actionToken) && isToken((actionToken as { value: unknown }).value)).toBe(true)
    const vars = resolveTheme(definition).vars
    expect(vars['--color-action-primary']).toBe('var(--color-forest-600)')
  })

  test('$ref JSON Pointer на $value → Token-ссылка', () => {
    const doc: DTCGDocument = {
      color: {
        forest: { 600: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.55, 0.13, 155] } } },
        action: { primary: { $type: 'color', $value: { $ref: '#/color/forest/600/$value' } } },
      },
    }
    const { definition } = fromDTCG(doc)
    expect(resolveTheme(definition).vars['--color-action-primary']).toBe('var(--color-forest-600)')
  })

  test('нерезолвнутый алиас → warning + literal-строка', () => {
    const { warnings } = fromDTCG({ color: { a: { $type: 'color', $value: '{color.missing}' } } })
    expect(warnings.some((w) => w.includes('unresolved alias') && w.includes('color.missing'))).toBe(true)
  })
})

describe('fromDTCG — отчёт warnings', () => {
  test('неизвестный $type → warning, токен пропущен', () => {
    const { definition, warnings } = fromDTCG({
      x: { weird: { $type: 'border', $value: { color: '#000', width: '1px' } } },
    })
    expect(warnings.some((w) => w.includes('unsupported $type') && w.includes('border'))).toBe(true)
    expect(resolveTheme(definition).vars).toEqual({})
  })

  test('$root и $extends не поддержаны → warnings', () => {
    const { warnings } = fromDTCG({
      color: { $root: { $type: 'color', $value: '#000' }, $extends: 'other', a: { $type: 'color', $value: '#fff' } },
    })
    expect(warnings.some((w) => w.includes('$root'))).toBe(true)
    expect(warnings.some((w) => w.includes('$extends'))).toBe(true)
  })

  test('$extensions сообщается в warnings (модель ThemeOn не несёт $extensions-слота)', () => {
    const { warnings } = fromDTCG({
      color: { a: { $type: 'color', $value: '#000', $extensions: { 'com.acme': { foo: 1 } } } },
    })
    expect(warnings.some((w) => w.includes('$extensions'))).toBe(true)
  })

  test('property-level $ref (не на $value) → warning unsupported', () => {
    const { warnings } = fromDTCG({
      space: { a: { $type: 'dimension', $value: { $ref: '#/space/base/$value/value' } } },
    })
    expect(warnings.some((w) => w.includes('unsupported $ref'))).toBe(true)
  })
})

describe('fromDTCG — multi-file', () => {
  test('пачка файлов: base + <theme> распознаётся, тема резолвится', () => {
    const files: Record<string, DTCGDocument> = {
      'base.tokens.json': { color: { bg: { $type: 'color', $value: '#ffffff' } } },
      'dark.tokens.json': { color: { bg: { $type: 'color', $value: '#000000' } } },
    }
    const { definition } = fromDTCG(files)
    const r = resolveTheme(definition)
    expect(r.vars['--color-bg']).toBe('#ffffff')
    expect(r.themes.dark).toEqual([
      { path: ['color', 'bg'], varName: '--color-bg', type: 'color', value: '#000000' },
    ])
    // тема 'dark' по конвенции P-D16 получает color-scheme dark.
    expect(r.schemes).toEqual({ dark: 'dark' })
  })
})

describe('fromDTCG — P8.12: корневой $type (Major #8)', () => {
  test('{"$type":"color", "brand": {...}} — самый частый экспорт Tokens Studio — не пуст', () => {
    const doc: DTCGDocument = {
      $type: 'color',
      color: { brand: { primary: { $value: { colorSpace: 'oklch', components: [0.6, 0.15, 250] } } } },
    }
    const { definition, warnings } = fromDTCG(doc)
    expect(resolveTheme(definition).vars['--color-brand-primary']).toBe('oklch(0.6 0.15 250)')
    expect(warnings).toEqual([])
  })
})

describe('fromDTCG — P8.12: multi-file под чужими именами (Major #9)', () => {
  test('чужой бандл {global.json, dark.json} импортируется НЕ пустым (наибольший файл — база)', () => {
    const files: Record<string, DTCGDocument> = {
      'global.json': {
        color: {
          $type: 'color',
          bg: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
          fg: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } },
        },
      },
      'dark.json': {
        color: { $type: 'color', bg: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } } },
      },
    }
    const { definition, warnings } = fromDTCG(files)
    const r = resolveTheme(definition)
    expect(r.vars['--color-bg']).toBe('#ffffff')
    expect(r.vars['--color-fg']).toBe('#000000')
    expect(r.themes.dark).toEqual([{ path: ['color', 'bg'], varName: '--color-bg', type: 'color', value: '#000000' }])
    expect(warnings).toEqual([])
  })

  test('резолвер-документ с произвольным именем файла разбирает базу/темы, не по именам файлов', () => {
    const files: Record<string, DTCGDocument> = {
      'core.json': { color: { bg: { $type: 'color', $value: '#ffffff' } } },
      'light-mode.json': { color: { bg: { $type: 'color', $value: '#eeeeee' } } },
      'weird-name.json': {
        version: '2025.10',
        sets: { base: { sources: [{ $ref: './core.json' }] } },
        modifiers: { theme: { contexts: { light: [{ $ref: './light-mode.json' }], default: [] }, default: 'default' } },
      },
    }
    const { definition, warnings } = fromDTCG(files)
    const r = resolveTheme(definition)
    expect(r.vars['--color-bg']).toBe('#ffffff')
    expect(r.themes.light).toEqual([{ path: ['color', 'bg'], varName: '--color-bg', type: 'color', value: '#eeeeee' }])
    expect(warnings).toEqual([])
  })

  test('$themes.json/$metadata.json (Tokens Studio) распознаются и пропускаются, в sys не попадают', () => {
    const files: Record<string, DTCGDocument> = {
      'global.json': { color: { bg: { $type: 'color', $value: '#ffffff' } } },
      '$themes.json': [{ id: 'x', name: 'dark' }] as unknown as DTCGDocument,
      '$metadata.json': { tokenSetOrder: ['global'] } as unknown as DTCGDocument,
    }
    const { definition, warnings } = fromDTCG(files)
    expect(resolveTheme(definition).vars['--color-bg']).toBe('#ffffff')
    expect(Object.keys(definition.themes)).toEqual([])
    expect(warnings).toEqual([])
  })

  test('onEmpty: без опций — громкий warning с диагнозом; opts.onEmpty="error" — ThemeonError', () => {
    const files: Record<string, DTCGDocument> = {
      '$themes.json': [] as unknown as DTCGDocument,
      '$metadata.json': {} as unknown as DTCGDocument,
    }
    const { definition, warnings } = fromDTCG(files)
    expect(resolveTheme(definition).vars).toEqual({})
    expect(warnings.some((w) => w.includes('0 tokens parsed'))).toBe(true)
    expect(() => fromDTCG(files, { onEmpty: 'error' })).toThrow(/0 tokens parsed/)
  })
})

describe('fromDTCG — P8.12: явные опции opts.base/opts.themes', () => {
  test('opts.base/opts.themes переопределяют автодетект по произвольным именам файлов', () => {
    const files: Record<string, DTCGDocument> = {
      'a.json': { color: { bg: { $type: 'color', $value: '#ffffff' } } },
      'b.json': { color: { bg: { $type: 'color', $value: '#eeeeee' } } },
      'c.json': { color: { bg: { $type: 'color', $value: '#111111' } } },
    }
    const { definition, warnings } = fromDTCG(files, { base: 'b.json', themes: { night: 'c.json' } })
    const r = resolveTheme(definition)
    expect(r.vars['--color-bg']).toBe('#eeeeee')
    expect(r.themes.night).toEqual([{ path: ['color', 'bg'], varName: '--color-bg', type: 'color', value: '#111111' }])
    expect(warnings).toEqual([])
  })
})

describe('fromDTCG — P8.12: $value рядом с дочерними ключами (§6.1 MUST report error)', () => {
  test('узел с $value и дочерним non-$ ключом одновременно → ThemeonError', () => {
    expect(() => fromDTCG({ color: { a: { $type: 'color', $value: '#000000', nested: { b: 1 } } } })).toThrow(
      /MUST NOT also be a group/,
    )
  })
})

describe('fromDTCG — P8.12: токен без резолвимого $type (§5.2.2 MUST NOT guess)', () => {
  test('токен без своего/унаследованного $type → warning, тип не угадывается по значению', () => {
    const { definition, warnings } = fromDTCG({ mystery: { a: { $value: '#000000' } } })
    expect(resolveTheme(definition).vars).toEqual({})
    expect(warnings.some((w) => w.includes('no resolvable $type') && w.includes('mystery.a'))).toBe(true)
  })
})

describe('fromDTCG — P8.12: round-trip fromDTCG(TokensStudioBundle) → toDTCG (#16)', () => {
  test('чужой бандл (не наш toDTCG-вывод) реимпортируется, а повторный toDTCG остаётся валиден терразцо-подобно', () => {
    const files: Record<string, DTCGDocument> = {
      'global.json': {
        color: {
          $type: 'color',
          bg: { $value: { colorSpace: 'srgb', components: [1, 1, 1] } },
        },
        space: { $type: 'dimension', base: { $value: { value: 1, unit: 'rem' } } },
      },
      'dark.json': { color: { bg: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] } } } },
    }
    const { definition, warnings } = fromDTCG(files)
    expect(warnings).toEqual([])
    const reExported = toDTCG(definition)
    expect(reExported.warnings).toEqual([])
    expect(reExported.files['base.tokens.json']).toBeDefined()
    expect(reExported.files['dark.tokens.json']).toBeDefined()
  })
})

describe('round-trip ядра', () => {
  test('resolveTheme(fromDTCG(toDTCG(def))).vars эквивалентен resolveTheme(def).vars', () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
    const def = defineTheme({
      base: {
        color: { bg: { page: 'oklch(0.99 0 0)' }, action: { primary: palette.forest[600] } },
        space: { 4: '1rem' },
        text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
        breakpoint: { md: '768px' },
      },
      themes: { dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } } },
    })

    const back = fromDTCG(toDTCG(def).files)
    expect(back.warnings).toEqual([])

    // P8.11: `text` эмитится примитивами (`fontSize`/`lineHeight`), не `typography` (модель
    // ThemeOn не несёт 5 полей §9.8) — импорт видит два отдельных токена группы, а не композит,
    // отсюда `--text-2xl-font-size`/`--text-2xl-line-height` вместо `--text-2xl`/`--text-2xl--line-height`
    // (композитный round-trip `text` — предмет P8.12, здесь важна СТАБИЛЬНОСТЬ остальных типов).
    const original = resolveTheme(def, { refLayer: 'referenced' })
    const roundTripped = resolveTheme(back.definition, { refLayer: 'referenced' })
    const { '--text-2xl': _origText, '--text-2xl--line-height': _origLh, ...restOriginal } = original.vars
    const { '--text-2xl-font-size': roundFontSize, '--text-2xl-line-height': roundLh, ...restRoundTripped } =
      roundTripped.vars
    expect(restRoundTripped).toEqual(restOriginal)
    expect(roundFontSize).toBe(_origText)
    expect(String(roundLh)).toBe(String(_origLh))
  })

  test('round-trip сохраняет var-chain ссылки в базе', () => {
    const palette = defineTokens('color', { brand: { base: '#3ab7bf' } })
    const def = defineTheme({
      base: { color: { link: palette.brand.base } },
    })
    const back = fromDTCG(toDTCG(def).files)
    const vars = resolveTheme(back.definition).vars
    expect(vars['--color-link']).toBe('var(--color-brand-base)')
    expect(vars['--color-brand-base']).toBe('#3ab7bf')
  })
})
