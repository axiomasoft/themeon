# R-07 — Конкурентный ландшафт DS-тулкитов и валидация ниши (2026)

> RAG-research (агент, 2026-07-07). Все факты с URL-источниками.

## Zero-runtime CSS-in-JS

| Инструмент | Статус | Вне React |
|---|---|---|
| **Panda CSS** | жив, token-engine, multi-brand гайды (июнь 2026), Chakra на нём | **да** — офиц. гайды Vue/Svelte/Solid/Astro |
| vanilla-extract | зрел, стабилен (Porsche DS) | да, но без token-DSL — движок, не token-продукт |
| StyleX | итерации внутри Meta | React-only на практике |
| Pigment CSS (MUI) | **alpha, on hold** | привязан к MUI |

## Прочие слои

- **UnoCSS** — годен как web-authoring-движок (layer 3), не как источник токенов; community token-bridge пресеты тонкие; wind3/wind4 несовместимости.
- **Ark UI** (headless, Zag; React/Solid/Vue) — «bring your own tokens», философски ближайшая модель декаплинга. **Radix Themes** — React-locked. **Park UI** — ближайший готовый opinionated стартер, но React/Next-scoped.
- Токен-стартеры: DTCG 2025.10 + Style Dictionary examples (multi-brand-multi-platform, tailwind-preset), divriots/starter-style-dictionary, Terrazzo/@terrazzo/plugin-css. **Современного Vue-экосистемного DS-стартера нет** («Vue Design System» — исторический).

## Multi-tenant / white-label (прямо для FlexCRM/FlexCMS/FlexStore)

Консенсус-паттерн (адоптить как чеклист, не изобретать):
- Семантический токен-слой в коде ↔ tenant-значения отдельно.
- Тема тенанта в БД как **структурированный JSON (JSONB)** со схемой (brand, surface/text, shape/spacing, typography, mode overrides, version/checksum) — НЕ произвольный CSS.
- Резолюция **до paint**: server/edge по subdomain/domain → инлайн CSS vars в `<head>`; при сотнях тенантов — прекомпилированные hashed per-tenant CSS на edge.
- Tailwind остаётся семантическим (`bg-primary` → `var(...)`), никаких per-tenant ребилдов.
- Guardrails: schema-валидация диапазонов, автоматический WCAG/контраст-чек при публикации, запрет произвольного CSS.

## Типизация токенов в TS

Готовой доминирующей либы нет — DIY ~50 LOC: `as const` + `keyof typeof` unions, branded types (`ColorTokenName` ≠ `SpaceTokenName`), `AutoComplete<T> = T | (string & {})` для расширяемости, discriminated unions по `$type` (совместимо с формой `@tokens-studio/types`). Реальный маленький гэп — закрыть в пакете.

## Прямой аналог задумки — НЕ НАЙДЕН

- Ближайший prior art: **TokiForge** (`@tokiforge/core|react|vue|svelte`, CLI): framework-agnostic токен/тем-рантайм, runtime-переключение без ребилда, <3KB, SSR-safe, экспорт CSS/SCSS/JS/TS/JSON. **Но: адаптеров к компонентным библиотекам НЕТ** (подтверждено) — останавливается на фреймворк-биндингах. Зрелость/лицензия не подтверждены — перед любой опорой проверить репо. [UNVERIFIED: звёзды/лицензия]
- Никто не продуктизировал единый адаптерный слой Vuetify+Naive+Bootstrap одновременно.

## Синтез: что брать готовое, что строить

| Категория | Референс | Стратегия |
|---|---|---|
| Формат токенов | DTCG 2025.10 | адоптить as-is |
| Build-пайплайн | Style Dictionary / Terrazzo | совместимость, не встраивание |
| CSS-движок | Panda / UnoCSS | опциональные цели вывода, не ядро |
| Headless-философия | Ark UI | образец декаплинга токены↔компоненты |
| Multi-tenant | индустриальный консенсус | чеклист as-is |
| Typed tokens | нет либы | DIY внутри ядра (~50 LOC) |
| **Адаптеры UI-библиотек + layout-примитивы, портируемые Vue/Nuxt/Blade** | **никто** | **строить — это ниша ThemeOn** |
