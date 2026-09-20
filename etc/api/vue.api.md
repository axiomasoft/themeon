# @themeon/vue

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
import { ComputedRef, InjectionKey, Plugin, Ref } from "vue";
import { ElementLike } from "@themeon/core/runtime";

//#region src/defaults.d.ts
/**
 * Зарезервированное имя ПРЕДПОЧТЕНИЯ (не темы!) «следовать за системой» — персистится вместо
 * резолвнутой темы (P-D49, канон VueUse `useColorMode.store: 'auto'` / next-themes `theme: 'system'`,
 * research R-13 §2.1). Хранить в `localStorage` резолвнутый результат вместо намерения — значит
 * убить «следовать за ОС»: пользователь навсегда приколачивается к теме первого визита.
 * Имя НЕ может быть именем темы (`themes` его не содержит) — `state.ts` предупреждает о коллизии.
 */
declare const SYSTEM_PREFERENCE = "system";
//#endregion
//#region src/types.d.ts
/** Минимальный интерфейс хранилища — совместим с `localStorage`, сидируется для тестов. */
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Разрешённое системное предпочтение цветовой схемы. */
type SystemPreference = 'dark' | 'light';
interface UseThemeOptions {
  /**
   * Known theme names; `toggle()` cycles the first two by default. Default `['light','dark']`.
   * `'system'` is a reserved *preference* (follow the OS), not a theme — do not list it here.
   */
  themes?: readonly string[];
  /**
   * Preference used when nothing is persisted. Either a theme name or `'system'` (follow the OS).
   * Default `'system'`.
   *
   * An empty or whitespace-only string means "not set" (same as omitting the option) and resolves
   * to `'system'`: that is how a missing value arrives over a JSON/env transport — Nitro coerces an
   * unset `runtimeConfig` value to `''` — and treating it as a theme name would kill the
   * `prefers-color-scheme` fallback.
   */
  default?: string;
  /** Ключ localStorage; `null` отключает персист. Default `'themeon-theme'`. */
  storageKey?: string | null;
  /** DOM-атрибут переключения. Default `'data-theme'` (D6). */
  attribute?: string;
  /** Отображение системного предпочтения → имя темы. Default `{ dark:'dark', light:'light' }`. */
  system?: {
    dark: string;
    light: string;
  };
  /** Глушить transition на кадр смены. Default `true`. */
  disableTransition?: boolean;
  /** Runtime var-патчи для тем, которых НЕТ в статическом `tokens.css` (тенант/динамика, P6). */
  runtimeVars?: Readonly<Record<string, Record<string, string>>>;
  /** Seam: целевой элемент. Default `() => document.documentElement`. */
  target?: () => (ElementLike & {
    setAttribute(n: string, v: string): void;
  }) | null;
  /** Seam: хранилище. Default `() => localStorage`. */
  storage?: () => StorageLike | null;
  /** Seam: медиа-квери. Default `(q) => matchMedia(q)`. */
  media?: (query: string) => {
    matches: boolean;
    addEventListener?: (t: 'change', cb: () => void) => void;
  };
}
interface UseThemeReturn {
  /**
   * The user's *intent* — `'system'` (follow the OS) or an explicit theme name. This is the value
   * that gets persisted, and the one a theme switcher should render as "selected".
   *
   * It is deliberately separate from `theme`: persisting the *resolved* theme instead of the intent
   * would silently unsubscribe the user from `prefers-color-scheme` forever (they could never get
   * back to "follow the OS"). Same split as VueUse `useColorMode` (`store`/`state`) and next-themes
   * (`theme`/`resolvedTheme`).
   */
  readonly preference: Readonly<Ref<string>>;
  /** The *resolved* theme actually applied to the DOM (`'system'` already resolved via `system`). */
  readonly theme: Readonly<Ref<string>>;
  /** The OS preference (`prefers-color-scheme`), tracked live. */
  readonly system: Readonly<Ref<SystemPreference>>;
  /** Whether the resolved `theme` is the dark one. */
  readonly isDark: ComputedRef<boolean>;
  /**
   * Sets the preference: a theme name, or `'system'` to follow the OS again. Applies the resolved
   * theme to the DOM (+ the `runtimeVars` patch, if any) and persists the *preference*.
   *
   * An empty or whitespace-only value is ignored — it warns and returns without touching the DOM or
   * storage, leaving the current theme in place (an empty string is not a theme, see
   * `UseThemeOptions.default`). An unknown theme (when `themes` is set) warns but is still applied.
   */
  set(preference: string): void;
  /** Cycles between two themes (by default the first two of `themes`), based on the resolved theme. */
  toggle(a?: string, b?: string): void;
  /** Client-only: reads persistence + `prefers-color-scheme`, resolves and applies the theme. */
  init(): void;
}
//#endregion
//#region src/global-extensions.d.ts
declare module 'vue' {
  interface ComponentCustomProperties {
    /** Per-app theme state provided by `themeonPlugin` (`app.use(themeonPlugin)`). */
    $theme: UseThemeReturn;
  }
}
//#endregion
//#region src/plugin.d.ts
/** Injection-ключ per-app состояния темы; используется `useTheme()` для `inject`. */
declare const THEME_INJECTION_KEY: InjectionKey<UseThemeReturn>;
declare const themeonPlugin: Plugin<UseThemeOptions | undefined>;
//#endregion
//#region src/use-theme.d.ts
/**
 * @example
 * ```ts
 * const { theme, isDark, set, toggle, init } = useTheme({ themes: ['light', 'dark'] })
 * onMounted(() => init())
 * ```
 */
declare function useTheme(options?: UseThemeOptions): UseThemeReturn;
//#endregion
export { SYSTEM_PREFERENCE, type StorageLike, type SystemPreference, THEME_INJECTION_KEY, type UseThemeOptions, type UseThemeReturn, themeonPlugin, useTheme };
```

## Export `./anti-fouc`

<!-- types: ./dist/anti-fouc.d.ts -->

```dts
//#region src/anti-fouc.d.ts
interface ThemeInitScriptOptions {
  /** `localStorage` key. Default `'themeon-theme'` — must match `useTheme()`. */
  storageKey?: string;
  /** DOM attribute driving the switch. Default `'data-theme'` (D6) — must match `useTheme()`. */
  attribute?: string;
  /** Theme name used when the OS prefers dark. Default `'dark'`. */
  darkTheme?: string;
  /** Theme name used when the OS prefers light. Default `'light'`. */
  lightTheme?: string;
  /**
   * Preference used when nothing is persisted — a theme name, or `'system'` to follow the OS.
   * Default `'system'`. Empty/whitespace-only means "not set" (P3.7). Same meaning as
   * `UseThemeOptions.default`: both channels must resolve it identically or the first paint flashes.
   */
  default?: string;
  /**
   * Known theme names — same meaning as `UseThemeOptions.themes`. When set, a persisted theme
   * outside the set is rejected and the fallback applies, exactly like `init()`. When unset the set
   * is open and any non-blank persisted name is trusted — also exactly like `init()`. Both channels
   * must validate persistence by the SAME rules, otherwise a stale theme name (`'sepia'` after it
   * was removed) gets painted by the script and repainted by `init()` — a visible flash.
   */
  themes?: readonly string[];
}
/**
 * Генерирует тело анти-FOUC IIFE (без `<script>`-тегов — обёртку ставит потребитель:
 * `app.head.script` в Nuxt P3.4, `transformIndexHtml` в Vite P3.5). Детерминирован (снапшот-
 * тест) — одна минифицированная строка, без лишних пробелов.
 *
 * @example
 * ```ts
 * themeInitScript()
 * // "(function(){try{var e=document.documentElement,r=localStorage.getItem('themeon-theme')||'',s=r.trim()?r:'',p=s?s:'system',t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;e.setAttribute('data-theme',t)}catch(_){}})()"
 * ```
 */
declare function themeInitScript(options?: ThemeInitScriptOptions): string;
//#endregion
export { ThemeInitScriptOptions, themeInitScript };
```
