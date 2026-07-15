# R-06 — Упаковка/дистрибуция мульти-фреймворкового DS-пакета (Vue/Nuxt/Laravel), 2026

> RAG-research (агент, 2026-07-07). Все факты с URL-источниками.

## Монорепо и сборка

- Консенсус 2026: **pnpm workspaces** (+ опц. Turborepo). Сборщик библиотек: **tsdown** (наследник tsup на Rolldown; v0.20 янв-2026) — дефолт для greenfield; Rolldown 1.0 стабилен, **Vite 8** (март 2026) на Rolldown. ESM-first (~65% новых пакетов); CJS не нужен.
- `exports` map — единственный источник entrypoints+types (types per-export-path, `.d.mts`); Vite lib mode — только для Vue-SFC-пакета, не для core; pure-CSS пакет — вообще без бандлера (copy/lightning step).

## Nuxt-модуль (Nuxt 4)

- `defineNuxtModule<Options>().with({ meta, defaults, setup })` (object-syntax — рекомендация для публикуемых); `meta.compatibility.nuxt: '>=4.0.0'`.
- Auto-imports: `addComponentsDir`/`addImportsDir`; **gotcha:** runtime-код самого модуля не может полагаться на auto-imports — только явные импорты; магия достаётся приложению-потребителю.
- CSS: `nuxt.options.css.push(resolve('./runtime/styles/main.css'))`; опции → `runtimeConfig.public` (defu), не app.config; `moduleDependencies` вместо deprecated `installModule`.
- Источник: nuxt.com/docs/4.x/guide/modules/recipes-basics

## Laravel + Vite

- Гибридный паттерн подтверждён (прецедент BlatUI): **npm-пакет** владеет tokens.css/theme/JS; **Composer-пакет** — только Blade-компоненты (View API), не владеет стилями, ссылается на CSS-var контракты по именам. Consumer: `@import "@acme/design-system/tokens.css"` в своём `resources/css/app.css` через laravel-vite-plugin.
- Laravel НЕ в pnpm-монорепо — отдельный composer-пакет с документационной зависимостью от npm-пакета.

## Vite plugin / virtual modules

- UnoCSS: transform-скан → `virtual:uno.css` через resolveId/load → generateCSS on demand (тесный HMR). Panda: явный `panda codegen` → типизированный `styled-system/` (тяжелее, зато typed API).
- Trade-off: runtime CSS vars — multi-tenant/динамика без ребилда; build-time — детерминизм/payload. Практика 2026: **слоить, а не выбирать** — build-time каркас + runtime vars для значений темы.

## Layout-примитивы

- **Негативный вывод:** официального npm-пакета Every Layout / CUBE CSS с `@layer`-организацией НЕ существует (Every Layout — метод/сайт; порты неофициальные). Stack/Cluster/Sidebar/Center/Cover/Switcher — авторить самим под `@layer composition`.

## Sass vs native CSS 2026

- Native CSS (nesting + vars + @layer + @scope + color-mix/oklch) закрыл потребность; «браузер — теперь препроцессор». Sass — только опциональный build-time инструмент для генерации матриц; PostCSS — compat/минификация. Несущая причина CSS-vars-first: **runtime-природа** custom properties (смена темы/бренда без ребилда) vs compile-time Sass `$vars`.

## Дистрибуция CSS

```json
{
  "type": "module",
  "exports": { ".": "./dist/index.js", "./tokens.css": "./dist/tokens.css", "./reset.css": "./dist/reset.css", "./theme.css": "./dist/theme.css" },
  "sideEffects": ["**/*.css"]
}
```
- **Критично:** `sideEffects: false` при наличии importable CSS = класс реальных багов (bare `import "pkg/reset.css"` tree-shake'ится). Референс — radix-ui/themes package.json.

## Вердикт: структура монорепо

```
packages/
  tokens|core/   — модель+резолвер+сериализаторы, zero framework deps (tsdown)
  css/           — @layer reset/tokens/composition(своё)/components/utilities; pure CSS
  vue/           — composables/plugin (vite lib mode допустим)
  nuxt/          — тонкий @nuxt/kit модуль: css.push + auto-imports + runtimeConfig
apps/docs        — playground
(отдельно, PHP) laravel-пакет: Blade-компоненты на CSS-var контрактах
```
Прецедент архитектуры «headless-core + styling-compiler + per-framework shells» — Park UI + Ark UI + Panda CSS (Park UI вошёл в орг Chakra, конец 2025). Прямого аналога с Laravel/Blade-каналом не найдено.
