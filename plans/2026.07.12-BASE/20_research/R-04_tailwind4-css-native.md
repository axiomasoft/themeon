# R-04 — Tailwind v4 и CSS-native примитивы темизации (2026)

> RAG-research (агент, 2026-07-07). Все факты с URL-источниками.

## Tailwind v4

- Актуально: **4.3.2** (2026-06-26). CSS-first конфиг через `@theme`; namespaces `--color-*`, `--font-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--breakpoint-*`, `--shadow-*`, `--ease-*` → генераторы утилит. https://tailwindcss.com/docs/theme
- Theme-переменные компилируются в обычные CSS custom properties на `:root` — доступны вне Tailwind.
- **`@theme inline`** — несущий механизм моста: когда theme-var ссылается на внешнюю CSS-переменную (`--color-primary: var(--ds-primary)`), inline заставляет резолвиться в месте употребления → работает subtree/tenant-скоупинг. `@theme` — только top-level; dark/tenant-оверрайды живут в обычном CSS.
- Сброс дефолтной палитры: `--*: initial;` внутри `@theme`.
- Dark-режим на атрибуте: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
- Паттерн интеграции внешней DS (документированный): сырые токены как plain CSS vars (`:root`/`[data-theme]`/`[data-tenant]`) → алиасинг нужного подмножества в `@theme inline`. Вывод: **Tailwind — адаптер, не ядро**.

## Baseline browser support 2026 (вердикт-таблица)

| Фича | Статус | Вердикт |
|---|---|---|
| CSS nesting | Widely available | безопасный дефолт |
| `:has()`, container queries (size) | Widely available | production |
| `@container style()` | Newly available | с fallback |
| `@property` | поддержан | ок для typed/animatable токенов |
| `light-dark()` | Newly available (Baseline 2026) | ок для evergreen |
| `color-mix()`, `oklch()` | широко | production |
| `@layer` | стандарт «modern CSS» | рекомендованный каркас каскада |

## Open Props

- Adam Argyle; ядро = 300+ сырых CSS vars, «суб-атомарно», без утилит/компонентов. Stable 1.6 (2023), **v2.0.0-beta** (июль 2026, не stable): OKLCH-палитра, реструктуризация @layer, @custom-media. Open Props UI — copy-paste CSS-компоненты, Vue-адаптер v5.3.0 (июнь 2026). Лагерь «tokens-first/framework-agnostic» (vs Tailwind/shadcn framework-coupled).

## Dark mode best practice 2026 (слоёная, не «или-или»)

`prefers-color-scheme` = входной сигнал по умолчанию → атрибут `data-theme` на `<html>` = поверхность явного пользовательского оверрайда (ставится до paint инлайн-скриптом/SSR) → `color-scheme` CSS-свойство синхронизируется → семантические var-токены везде → `light-dark()` — точечная оптимизация внутри определений токенов, НЕ верхний механизм состояния. shadcn использует class `.dark` (экосистемная инерция next-themes); для нового пакета чище `data-theme`.

```css
:root { color-scheme: light dark; --background: light-dark(#fff, #09090b); }
html[data-theme="light"] { color-scheme: light; }
html[data-theme="dark"] { color-scheme: dark; }
```

## Генерация палитр из seed

- **culori** — низкоуровневая цветовая математика (CSS Color 4, OKLCH, интерполяция). culorijs.org
- **APCA** — валидация контраста (Radix свои таргеты считает по APCA).
- **Leonardo** (Adobe) — генерация «от целевого контраста».
- **Radix Colors** — референс формы: 12-шаговые семантические шкалы (1-2 фоны, 3-5 интерактив/бордеры, 9 solid, 11-12 текст), альфа-варианты, dark-эквиваленты.
- Гибридный пайплайн 2026: seed → culori (OKLCH) → 12-шаговая тональная кривая (hue стабилен, chroma сжата на краях) → Radix-роли → APCA-валидация пар → CSS vars.

## Вердикт для фундамента ThemeOn

1. OKLCH — единственное пространство авторинга цвета.
2. Токены-ядро = plain CSS vars (прецедент Open Props); Tailwind-совместимость — одним шагом `@theme inline` на стороне потребителя.
3. `data-theme` (не class) как поверхность состояния темы; `light-dark()`+`color-scheme` — внутренняя оптимизация.
4. `@layer` (tokens, reset, base, composition, components, utilities, overrides) — скелет специфичности: дефолты пакета проигрывают оверрайдам приложения без `!important`.
5. `@property` для анимируемых токенов (плавная смена темы).
6. culori + APCA как зависимости палитро-генератора; форма — 12-шаговый Radix-стиль.
