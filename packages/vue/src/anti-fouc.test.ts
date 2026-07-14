import { describe, expect, test } from 'vitest'
import { themeInitScript } from './anti-fouc'

/**
 * ВНИМАНИЕ (урок P3.7/P3.8): строковые ассерты на форму сгенерированного кода (`toContain`)
 * НЕ доказывают, что скрипт ведёт себя как `init()` — дважды именно они и пропустили дефект.
 * Правила резолва проверяются ПОВЕДЕНЧЕСКИ: ниже (исполнение IIFE) и, главное, в `parity.test.ts`
 * (декартово произведение входов через оба канала). Здесь остаётся то, для чего строка и нужна:
 * детерминизм (снапшот), минификация и injection-guard.
 */
describe('themeInitScript', () => {
  test('дефолтные опции дают детерминированную строку', () => {
    expect(themeInitScript()).toMatchInlineSnapshot(
      `"(function(){try{var e=document.documentElement,r=localStorage.getItem('themeon-theme')||'',s=r.trim()?r:'',p=s?s:'system',t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;e.setAttribute('data-theme',t)}catch(_){}})()"`,
    )
  })

  test('кастомные опции подставляются в строку', () => {
    const script = themeInitScript({
      storageKey: 'my-theme',
      attribute: 'data-mode',
      darkTheme: 'night',
      lightTheme: 'day',
    })
    expect(script).toContain(`localStorage.getItem('my-theme')`)
    expect(script).toContain(`e.setAttribute('data-mode',t)`)
    expect(script).toContain(`?'night':'day'`)
  })

  test("default:'' даёт ту же строку, что и незаданный default (P3.7: пустое = не задано)", () => {
    expect(themeInitScript({ default: '' })).toBe(themeInitScript({}))
    expect(themeInitScript({ default: '   ' })).toBe(themeInitScript({}))
  })

  test('имена тем проходят injection-guard', () => {
    expect(() => themeInitScript({ themes: ["it's"] })).toThrow(/must not contain/)
  })

  test.each([["it's"], ['"quoted"'], ['back`tick'], ['<script>'], ['back\\slash'], ['line\nbreak']])(
    'assertSafeScriptToken бросает на опасный токен %s',
    (unsafe) => {
      expect(() => themeInitScript({ storageKey: unsafe })).toThrow(/must not contain/)
    },
  )

  test('опасный `default` тоже отвергается (он подставляется в строку как литерал)', () => {
    expect(() => themeInitScript({ default: "it's" })).toThrow(/must not contain/)
  })

  test('результат — единственный statement без переносов строк (минифицирован)', () => {
    expect(themeInitScript()).not.toMatch(/\n/)
  })
})

/**
 * Поведенческие тесты: сгенерированный IIFE РЕАЛЬНО исполняется с фейковыми глобалами.
 * Согласованность с `init()` на всём пространстве входов доказывает `parity.test.ts`; здесь —
 * читаемые опорные сценарии самого скрипта.
 */
describe('themeInitScript — исполнение сгенерированного скрипта', () => {
  /** Выполняет скрипт с подставными `document`/`localStorage`/`matchMedia`, возвращает выставленный атрибут. */
  function run(
    script: string,
    { stored, systemDark = false }: { stored?: string | null; systemDark?: boolean },
  ): string | undefined {
    const attrs: Record<string, string> = {}
    const document = { documentElement: { setAttribute: (n: string, v: string) => void (attrs[n] = v) } }
    const localStorage = { getItem: () => stored ?? null }
    const matchMedia = (): { matches: boolean } => ({ matches: systemDark })
    new Function('document', 'localStorage', 'matchMedia', script)(document, localStorage, matchMedia)
    return attrs['data-theme']
  }

  test('нет персиста + системная dark → dark (системный фолбэк жив)', () => {
    expect(run(themeInitScript({ themes: ['light', 'dark'] }), { stored: null, systemDark: true })).toBe('dark')
  })

  test('валидный персист выигрывает у системы', () => {
    expect(run(themeInitScript({ themes: ['light', 'dark'] }), { stored: 'light', systemDark: true })).toBe('light')
  })

  test("персист 'system' — это НАМЕРЕНИЕ следовать за ОС, а не имя темы: резолвится вживую (P-D49)", () => {
    const script = themeInitScript({ themes: ['light', 'dark'] })
    expect(run(script, { stored: 'system', systemDark: true })).toBe('dark')
    expect(run(script, { stored: 'system', systemDark: false })).toBe('light')
    // в DOM обязана уехать РЕЗОЛВНУТАЯ тема, а не сам sentinel
    expect(run(script, { stored: 'system', systemDark: true })).not.toBe('system')
  })

  test('протухший персист (темы больше нет в themes) → фолбэк, а не мёртвое имя', () => {
    expect(run(themeInitScript({ themes: ['light', 'dark'] }), { stored: 'sepia', systemDark: true })).toBe('dark')
  })

  test('отравленный персист "" / "   " → фолбэк, а не пустой атрибут (P3.7)', () => {
    const script = themeInitScript({ themes: ['light', 'dark'] })
    expect(run(script, { stored: '', systemDark: true })).toBe('dark')
    expect(run(script, { stored: '   ', systemDark: true })).toBe('dark')
  })

  test('имя персиста НЕ переписывается: пробелы сохраняются (паритет с asThemeName, P3.8)', () => {
    // открытый набор: скрипт обязан выставить ' dark' как есть — ровно то же сделает init().
    // Тримить здесь значит развести каналы: скрипт красил бы 'dark', init() — ' dark'.
    expect(run(themeInitScript(), { stored: ' dark', systemDark: false })).toBe(' dark')
  })

  test('открытый набор (themes не задан) → любое непустое имя персиста принимается', () => {
    expect(run(themeInitScript(), { stored: 'tenant-42', systemDark: true })).toBe('tenant-42')
  })

  test('вырожденный набор themes:[] → отвергает ЛЮБОЙ персист (fail-closed, как init())', () => {
    expect(run(themeInitScript({ themes: [] }), { stored: 'dark', systemDark: false })).toBe('light')
  })

  test('default перебивает систему, когда персиста нет', () => {
    expect(run(themeInitScript({ default: 'light' }), { stored: null, systemDark: true })).toBe('light')
  })

  test("персист 'system' перебивает даже явный default (намерение пользователя главнее)", () => {
    expect(run(themeInitScript({ default: 'light', themes: ['light', 'dark'] }), { stored: 'system', systemDark: true })).toBe(
      'dark',
    )
  })
})
