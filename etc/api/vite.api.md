# @themeon/vite

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
import { Plugin } from "vite";
import { ResolveOptions, SerializeCssOptions } from "@themeon/core/compiler";
import { ThemeInitScriptOptions } from "@themeon/vue/anti-fouc";
import { ThemeDefinition } from "@themeon/core/authoring";

//#region src/types.d.ts
/** Disk artifacts for PHP/Laravel consumers (P3.3). */
interface ThemeonArtifactsOptions {
  /** Output directory relative to Vite root. Default `.themeon`. */
  dir?: string;
  /** Manifest filename inside `dir`. Default `manifest.json`. */
  manifestFile?: string;
  /** CSP artifact filename inside `dir`. Default `csp.json`. */
  cspFile?: string;
  /** Trailing debounce for watch/HMR artifact writes. Default `50` ms. */
  debounceMs?: number;
}
interface ThemeonViteOptions {
  /**
   * Тема (обязательна) — либо готовое определение, либо (async-)фабрика, вызываемая на каждый
   * `load()` виртуального модуля (перечитывает актуальное состояние при HMR).
   */
  theme: ThemeDefinition | (() => ThemeDefinition | Promise<ThemeDefinition>);
  /**
   * Абсолютные/нормализуемые пути файлов, изменение которых триггерит HMR виртуального модуля.
   * Без этой опции HMR не активен — тема живёт целиком в конфиге и меняется через рестарт Vite.
   */
  tokensFiles?: string[];
  /** Опции резолвера ядра (`resolveTheme`), проброс как есть. */
  resolve?: ResolveOptions;
  /** Опции сериализатора ядра (`serializeThemeCss`), проброс как есть. */
  serialize?: SerializeCssOptions;
  /** Id виртуального модуля. Default `'virtual:themeon.css'`. */
  virtualId?: string;
  /**
   * CSS-first канал для проектов без JS-энтри (напр. Laravel Blade): плагин пишет CSS темы в
   * реальный файл на диске и алиасит `virtualId` на него (`resolve.alias`) — документированный
   * `@import 'virtual:themeon.css'` в CSS остаётся рабочим, потому что резолвится как обычный
   * файл, а не virtual-модуль (virtual-модули в CSS `@import` не резолвятся — Blocker #1,
   * `findings/P8-vite-channel-hmr.md`). ДОПОЛНИТЕЛЬНАЯ опция, канон — `import` из JS (см. выше).
   * `true` — дефолтный путь `<root>/.themeon/theme.css`; объект — кастомный относительный путь.
   */
  cssImport?: boolean | {
    file?: string;
  };
  /**
   * Вставить анти-FOUC скрипт (`themeInitScript`, единый генератор P3.2) в `index.html` через
   * `transformIndexHtml`. `true` — с дефолтными опциями скрипта, объект — проброс опций.
   */
  injectFouc?: boolean | ThemeInitScriptOptions;
  /**
   * Emit PHP-readable `manifest.json` (+ optional `csp.json` when `injectFouc` is set) under
   * `.themeon/`. Defaults to `true` when `cssImport` is enabled; otherwise `false`.
   */
  artifacts?: boolean | ThemeonArtifactsOptions;
}
//#endregion
//#region src/index.d.ts
/** Создаёт Vite-плагин ThemeOn: виртуальный CSS темы + HMR + опц. анти-FOUC. */
declare function themeon(options: ThemeonViteOptions): Plugin;
//#endregion
export { type ThemeonArtifactsOptions, type ThemeonViteOptions, themeon };
```

## Export `./client`

<!-- types: ./client.d.ts -->

```dts
/**
 * Ambient types for ThemeOn Vite virtual modules (P3.3).
 *
 * @example
 * ```ts
 * /// <reference types="@themeon/vite/client" />
 * import themeCss from 'virtual:themeon.css'
 * ```
 */
declare module 'virtual:themeon.css' {
  const css: string
  export default css
}
```
