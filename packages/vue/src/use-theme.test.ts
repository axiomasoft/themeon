import { describe, expect, it, vi } from 'vitest'
import { createThemeState } from './state'
import type { StorageLike } from './types'

/**
 * Фейковый DOM-элемент: пишет `setAttribute`/`setProperty`/`removeProperty` в объекты —
 * `createThemeState` тестируется без DOM-окружения (vitest environment: node), как P1.6.
 */
function fakeElement(): {
  setAttribute(n: string, v: string): void
  style: { setProperty(n: string, v: string): void; removeProperty(n: string): string }
  attrs: Record<string, string>
  vars: Record<string, string>
} {
  const attrs: Record<string, string> = {}
  const vars: Record<string, string> = {}
  return {
    attrs,
    vars,
    setAttribute(n, v) {
      attrs[n] = v
    },
    style: {
      setProperty(n, v) {
        vars[n] = v
      },
      removeProperty(n) {
        const prev = vars[n] ?? ''
        delete vars[n]
        return prev
      },
    },
  }
}

/** Фейковое хранилище: `localStorage`-совместимый интерфейс поверх обычного объекта. */
function fakeStorage(): StorageLike & { readonly data: Record<string, string> } {
  const data: Record<string, string> = {}
  return {
    data,
    getItem: (k) => (Object.hasOwn(data, k) ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

/** Фейковый `MediaQueryList` — только `matches`, подписка на `change` не требуется в тестах. */
function fakeMedia(matches: boolean): { matches: boolean; addEventListener?: never } {
  return { matches }
}

/**
 * `MediaQueryList`-фейк, УМЕЮЩИЙ подписку (в отличие от `fakeMedia`) — нужен там, где проверяется
 * живая реакция на смену темы ОС при открытой вкладке. `emit()` играет реальный `change`-эвент:
 * сначала меняет `matches` (как это делает браузер), затем зовёт слушателей.
 */
function fakeLiveMedia(matches: boolean): {
  matches: boolean
  addEventListener: (t: 'change', cb: () => void) => void
  emit: (next: boolean) => void
} {
  const listeners: Array<() => void> = []
  return {
    matches,
    addEventListener(_t, cb) {
      listeners.push(cb)
    },
    emit(next) {
      this.matches = next
      for (const cb of listeners) cb()
    },
  }
}

describe('createThemeState', () => {
  it('init() без сохранённой темы при системной dark-схеме выбирает dark', () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(true),
    })

    state.init()

    expect(state.theme.value).toBe('dark')
    expect(el.attrs['data-theme']).toBe('dark')
  })

  it('init() с сохранённой темой побеждает системное предпочтение', () => {
    const el = fakeElement()
    const storage = fakeStorage()
    storage.setItem('themeon-theme', 'light')
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(true), // система хочет dark, но stored 'light' обязан победить
    })

    state.init()

    expect(state.theme.value).toBe('light')
  })

  it('set() пишет тему в фейковое хранилище и ставит атрибут', () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(false),
    })

    state.set('dark')

    expect(storage.data['themeon-theme']).toBe('dark')
    expect(el.attrs['data-theme']).toBe('dark')
  })

  it('set() темы из runtimeVars патчит переменные; следующий static-set их снимает', () => {
    const el = fakeElement()
    const state = createThemeState({
      target: () => el,
      storage: () => null,
      media: () => fakeMedia(false),
      runtimeVars: { tenant: { '--color-action-primary': 'oklch(0.5 0.1 250)' } },
    })

    state.set('tenant')
    expect(el.vars['--color-action-primary']).toBe('oklch(0.5 0.1 250)')

    state.set('light')
    expect(el.vars['--color-action-primary']).toBeUndefined()
  })

  it('toggle() без аргументов циклит первые две темы из опций', () => {
    const el = fakeElement()
    const state = createThemeState({
      target: () => el,
      storage: () => null,
      media: () => fakeMedia(false),
      themes: ['light', 'dark'],
    })
    state.set('light')

    state.toggle()
    expect(state.theme.value).toBe('dark')

    state.toggle()
    expect(state.theme.value).toBe('light')
  })

  it('создание состояния безопасно без реального DOM — пишет только set()/init()', () => {
    expect(() => createThemeState({ target: () => fakeElement() })).not.toThrow()
  })

  it('storageKey:null не обращается к хранилищу', () => {
    const el = fakeElement()
    let touched = false
    const storage: StorageLike = {
      getItem: () => {
        touched = true
        return null
      },
      setItem: () => {
        touched = true
      },
    }
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(false),
      storageKey: null,
    })

    state.init()
    state.set('dark')

    expect(touched).toBe(false)
  })

  it("default:'' + пустой персист + системная dark → init() даёт 'dark' (регресс P3.7/P5.9)", () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(true),
      default: '',
    })

    state.init()

    expect(state.theme.value).toBe('dark')
    expect(el.attrs['data-theme']).toBe('dark')
  })

  it('отравленный персист "" при не заданном themes уходит в системную тему и НЕ трогает хранилище', () => {
    const el = fakeElement()
    const storage = fakeStorage()
    storage.setItem('themeon-theme', '')
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(true),
    })

    state.init()

    expect(state.theme.value).toBe('dark')
    expect(state.preference.value).toBe('system')
    // P-D49: `init()` не пишет в хранилище — персист это след ЯВНОГО `set()`. Отравленное значение
    // остаётся лежать, но оно безвредно: оба канала (скрипт и init) классифицируют '' как «не задано».
    // Перезаписывать его резолвнутой темой значит сфабриковать выбор пользователя и навсегда
    // отписать его от prefers-color-scheme.
    expect(storage.data['themeon-theme']).toBe('')
  })

  it('первый визит без персиста: тема применена, но хранилище пусто (системное предпочтение живо, P-D49)', () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(true),
    })

    state.init()

    expect(state.theme.value).toBe('dark')
    expect(el.attrs['data-theme']).toBe('dark')
    expect(state.preference.value).toBe('system')
    expect(storage.data['themeon-theme']).toBeUndefined()
  })

  it("смена темы ОС при preference==='system' перекрашивает страницу вживую (P-D49)", () => {
    const el = fakeElement()
    const media = fakeLiveMedia(false)
    const state = createThemeState({
      target: () => el,
      storage: () => fakeStorage(),
      media: () => media,
    })

    state.init()
    expect(el.attrs['data-theme']).toBe('light')

    media.emit(true) // пользователь переключил ОС в тёмную тему при открытой вкладке

    expect(state.system.value).toBe('dark')
    expect(state.theme.value).toBe('dark')
    expect(el.attrs['data-theme']).toBe('dark')
    expect(state.preference.value).toBe('system') // намерение не изменилось
  })

  it('явно выбранная тема ОС-переключение игнорирует (явный выбор главнее системы)', () => {
    const el = fakeElement()
    const media = fakeLiveMedia(false)
    const state = createThemeState({
      target: () => el,
      storage: () => fakeStorage(),
      media: () => media,
    })

    state.init()
    state.set('light') // явный выбор пользователя

    media.emit(true)

    expect(state.system.value).toBe('dark') // системное предпочтение отслеживается…
    expect(state.theme.value).toBe('light') // …но тему не перебивает
    expect(el.attrs['data-theme']).toBe('light')
  })

  it("set('system') возвращает пользователя к системной теме и персистит НАМЕРЕНИЕ, а не резолв (P-D49)", () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const media = fakeLiveMedia(true)
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => media,
      themes: ['light', 'dark'],
    })

    state.init()
    state.set('light')
    expect(storage.data['themeon-theme']).toBe('light')

    state.set('system')

    expect(state.preference.value).toBe('system')
    expect(state.theme.value).toBe('dark') // резолв по текущей ОС
    expect(el.attrs['data-theme']).toBe('dark')
    // в хранилище — намерение, а не 'dark': иначе на следующем визите пользователь снова
    // окажется приколочен к теме, а не к «как в системе»
    expect(storage.data['themeon-theme']).toBe('system')
  })

  it("персист 'system' восстанавливает живое следование за ОС на следующем визите", () => {
    const el = fakeElement()
    const storage = fakeStorage()
    storage.setItem('themeon-theme', 'system')
    const media = fakeLiveMedia(true)
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => media,
      themes: ['light', 'dark'],
    })

    state.init()

    expect(state.preference.value).toBe('system')
    expect(state.theme.value).toBe('dark')

    media.emit(false)
    expect(state.theme.value).toBe('light') // следование живое, а не одноразовое
  })

  it("set('') предупреждает и не трогает атрибут/хранилище", () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(false),
    })

    state.set('')

    expect(warn).toHaveBeenCalled()
    // предупреждение обязано называть само значение — иначе источник пустой темы не найти
    expect(warn.mock.calls[0]?.[0]).toContain('""')
    expect(el.attrs['data-theme']).toBeUndefined()
    expect(storage.data['themeon-theme']).toBeUndefined()
    warn.mockRestore()
  })

  it("set('') не сбрасывает уже применённую тему (guard срабатывает ДО записи в theme.value)", () => {
    const el = fakeElement()
    const storage = fakeStorage()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const state = createThemeState({
      target: () => el,
      storage: () => storage,
      media: () => fakeMedia(true),
    })

    state.init()
    expect(state.theme.value).toBe('dark')

    state.set('   ')

    // theme.value/isDark обязаны остаться синхронными с DOM — иначе UI покажет чужое состояние
    expect(state.theme.value).toBe('dark')
    expect(state.isDark.value).toBe(true)
    expect(el.attrs['data-theme']).toBe('dark')
    // хранилище так и не тронуто: `init()` не пишет (P-D49), а отвергнутый `set('   ')` — тем более
    expect(storage.data['themeon-theme']).toBeUndefined()
    warn.mockRestore()
  })

  it('set() неизвестной темы (themes задан) предупреждает, но всё равно применяет', () => {
    const el = fakeElement()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const state = createThemeState({
      target: () => el,
      storage: () => null,
      media: () => fakeMedia(false),
      themes: ['light', 'dark'],
    })

    state.set('sepia')

    expect(warn).toHaveBeenCalled()
    expect(el.attrs['data-theme']).toBe('sepia')
    warn.mockRestore()
  })
})
