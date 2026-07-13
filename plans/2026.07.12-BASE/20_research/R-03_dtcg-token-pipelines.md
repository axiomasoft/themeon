# R-03 — Стандарты design tokens и токен-пайплайны (состояние 2026)

> RAG-research (агент, 2026-07-07). Все факты с URL-источниками.

## W3C DTCG — стабилен, продакшен-готов

- **«Design Tokens Format Module 2025.10»** опубликован 2025-10-28, статус Stable (Community Group report, не W3C Rec, но явно «safe for production»). https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
- Формат: JSON, `$value`/`$type` (наследуется вниз)/`$description`; composite types (typography, shadow); alias-синтаксис `{token.path}`.
- Версионирование датами (2025.10); 2026 — год adoption, не нового breaking-спека.
- Референс-реализации к 2026: Figma, Penpot, Sketch, Tokens Studio, Style Dictionary, Terrazzo.

## Инструменты

- **Style Dictionary v5** (v5.0.0 — 2025-05-16; v5.5.0 — июнь 2026): переехал из Amazon в community-org `style-dictionary/*`. Node 22+, DTCG first-class (с v4), полный 2025.10 (resolvers) — WIP. Модель transforms → formats → platforms. Сильно для multi-platform (iOS/Android). https://github.com/style-dictionary/style-dictionary/releases
- **Terrazzo 2.x** (ex-Cobalt UI; @terrazzo/cli 2.2.0, май 2026): DTCG-native компилятор, реализует **Resolver module** (`sets/modifiers/resolutionOrder`) — формальная модель мульти-контекстной резолюции (темы/бренды/breakpoints). Заявляет «единственный с полным DTCG». Совместный RFC со Style Dictionary. Web-фокус (CSS/JS/TS). https://terrazzo.app/docs/
- **Tokens Studio (Figma)**: переключаемый формат legacy/DTCG; экспорт требует нормализации перед codegen (расхождения по dimension-shape, deprecated composition type). Пайплайн designer→code: Figma → DTCG JSON в git → нормализация → build. https://docs.tokens.studio/manage-settings/token-format
- **theo (Salesforce) — мёртв**, не ориентироваться.

## Паттерн «TS-объект как источник»

Живой архитектурный паттерн 2026 (не одна доминирующая либа): рукописное TS-дерево `as const` → build-скрипт резолвит алиасы → `tokens.css` + типизированные TS-экспорты (`keyof typeof` unions). Примеры: GregKWhite/token-pipeline, balena-io-modules/design-tokens. Ниша «библиотека для этого» — открыта.

## Слои (канон, сошлись все источники)

**Primitive** (core/base/global: `color.blue.600`, `space.4` — бренд-нейтрально, продукт не потребляет напрямую) → **Semantic** (alias/functional: `color.surface.base`, `color.action.primary.bg` — роль, ссылается на primitive; именно этот слой мутируют темы/тенанты) → **Component** (`button.primary.bg.hover`, ссылается на semantic) → опциональный **Alias/export** (стабильные публичные имена, шимы миграции). Референсы: Adobe Spectrum (spectrum-design-data, mode как metadata-измерение, не в имени), Shopify Polaris, Radix (числовые шкалы).

## CSS-var naming (консенсус)

- Примитивы: `--<hue>-<step>` (`--gray-50`) без семантики в имени.
- Semantic: `--color-<role>-<modifier>` (`--color-bg-page`, `--color-fg-on-primary`), `--space-<domain>-<size>`.
- Component-scoped: `--<component>-<prop>[-<state>]`, локально в селекторе компонента, не в `:root`.
- Анти-паттерны: тема/mode в имени (`--color-bg-dark` — нет, override через `[data-theme]`), палитра в семантическом имени (`--color-blue-500-primary`), глобальные franken-токены.
- Отдельный namespace для поведенческих переменных: `--js-*`/`--sys-*`.

## Вердикт для ThemeOn

DTCG 2025.10 — принять как канонический interchange-формат (import/export), не изобретать схему. Style Dictionary/Terrazzo — не тащить в ядро (web-only задача + TS-first авторинг), но обеспечить DTCG-совместимость модели, чтобы пайплайны подключались. Слои Primitive→Semantic→Component и трёхуровневый naming — принять как канон.
