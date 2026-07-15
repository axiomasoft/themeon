# R-05 — Naive UI и модели темизации UI-библиотек (адаптерный слой), 2026

> RAG-research (агент, 2026-07-07): npm registry напрямую, context7 (naive-ui docs), GitHub.

## Naive UI: состояние и риск

- Актуально: **2.44.1** (2026-03-08), релизы ~поквартально весь 2025–2026. peerDep `vue ^3.0.0`, тестируется на Vue 3.5.x. **Не мёртв, но не быстр.**
- **Orphan-риск средний (в ADR):** автор 07akioni ушёл (сейчас DeepSeek), TuSimple → CreateAI (пивот в AI-игры, орг `tusen-ai`) — хосту проект не нужен; 390 issues / 271 PR открыто; де-факто community-carried. Не «blind-trust dependency».
- Модель темизации: `NConfigProvider` + `theme-overrides: GlobalThemeOverrides` (`{ common, ComponentName, peers }`); `darkTheme` объект в `:theme`; `createTheme([...])` для tree-shaken; `useThemeVars()` — реактивные резолвнутые токены внутри скоупа.
- Ключевые `common`-токены: `primaryColor(+Hover/Pressed/Suppl)`, `info/success/warning/errorColor`, `baseColor`, `bodyColor`, `textColorBase/1/2/3`, `borderColor`, `borderRadius`, `fontFamily`, `fontSize*`, `height{Tiny..Huge}`, `boxShadow1/2/3`.
- **Официального CSS-var-входа/выхода НЕТ** (issue #4515 — отказ): только JS-объект. Workarounds: `n-el` subtree-vars, `useThemeVars()`+`v-bind()` (SFC-локально), ручная проекция merged-темы на `:root` через setProperty. → Адаптер: реактивный мост «наши токены → GlobalThemeOverrides», Naive — потребитель, никогда не источник.

## Сравнительная таблица адаптеров

| Библиотека | Вход | Выход | Глубина токенов | Близость к DTCG |
|---|---|---|---|---|
| Naive UI | JS-объект (prop) | нет CSS-var экспорта | flat common + per-component | низкая |
| Vuetify 3 | JS `createVuetify({theme})` | авто `--v-theme-*` (RGB-триплеты) | flat color map + `on-*` | средняя |
| **PrimeVue v4** | `definePreset` из **@primeuix/themes** (не @primevue/themes!) | CSS vars всегда (primitive/semantic), component опц. | **3-tier primitive→semantic→component** | **высшая — референс** |
| Element Plus | SCSS `@forward with(...)` или `--el-*` runtime | `--el-*`, dark через `html.dark` | dual: SCSS compile + CSS vars runtime | средняя, лучший скоупинг (`.tenant-x { --el-color-primary }`) |
| Ant Design Vue 4 | `ConfigProvider :theme {token, algorithm}` | Seed→Map→Alias pipeline | 3-слойный, алгоритмический | **каверза: algorithm не умеет считать от CSS-var ссылок — только резолвнутые hex/rgba** |
| Bootstrap 5.3 | чистые CSS vars, `data-bs-theme` | `--bs-*` официально | flat, subtree-scoped атрибутом | лёгкий кейс (маппинг-таблица); `--bs-primary` один не перекрашивает всё |
| shadcn/ui(-vue) | нет runtime-объекта: CSS vars в скопированном коде | `:root`/`.dark` vars + Tailwind-утилиты | semantic-only | другой вектор: **registry** |

**Почему выиграл shadcn:** не глубиной токенов, а структурным устранением адаптерной проблемы — компоненты копируются, темизация = правка своих CSS vars. Переносимая идея — **registry-схема** (`registry-item.json`: `{components, cssVars, css, dependencies}`) как версионируемый, устанавливаемый бандл «тема+адаптеры».

## Вердикт для адаптерного слоя ThemeOn

1. Источник истины — собственные DTCG-shaped токены (primitive→semantic→component, стиль PrimeVue); UI-библиотека всегда потребитель.
2. Каждый адаптер обязан выдавать 2 сериализации: (a) нативный JS-объект библиотеки, (b) CSS custom properties на `:root`/scoped-атрибут для всего, куда библиотека не дотягивается.
3. Naive-адаптер — самое слабое звено (ручной мост, бюджетировать время); AntDV — резолвить токены в hex ДО подачи в seed; Bootstrap/Element Plus — простые статические маппинг-таблицы (можно build-time-only режим).
4. Украсть у shadcn идею registry-дистрибуции пресетов (тема × набор адаптеров = один устанавливаемый юнит), а не copy-paste компонентов.
5. Orphan-риск Naive UI зафиксировать в ADR; адаптер — отдельный пакет, ядро от него не зависит.
