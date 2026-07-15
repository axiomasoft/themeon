# R-02 — Анализ темизации vintera + доказательство copy-paste-дрейфа

> Источник: код-аудит `/home/vostrikov/projects/vintera/vintera/` (агент, 2026-07-07).
> Стек: nuxt@4.4.7 (`compatibilityVersion: 4`), vue@3.5.35, naive-ui@2.44.1, @bg-dev/nuxt-naiveui@2.0.0, **tailwindcss@4.3.0** (`@tailwindcss/vite`), sass.

## Тот же паттерн, что в dterema

Файл-в-файл идентичная структура: `app/config/theme/` (11 файлов), `app/utils/theme-css-vars.ts`, `app/utils/naive-ui.ts`, `scripts/sync-css-vars.mjs`, `scripts/lib/styles-css-vars-codegen.ts`, `modules/sync-styles-css-vars.ts`, `public/styles/base-vars.css` (артефакт в .gitignore), `useTheme`/`useAppTheme`, `app/plugins/theme-fouc.ts` (анти-FOUC инлайн-скрипт, дублирован строкой в head + JS-эквивалент в плагине).

Отличия-надстройки vintera:
- **Tailwind v4 мост уже опробован:** `app/styles/tailwind.css` = `@import "tailwindcss"` + `@theme { --color-primary: var(--primary); ... }` — Tailwind-утилиты как тонкий алиас-слой над теми же custom properties. Прецедент для @themeon/tailwind.
- Naive component-overrides реально заполнены (Switch/Input/DatePicker/Popover, «тёмный хром») — с комментом «Перенесено из octoclick» → **третий проект-носитель паттерна** (`~/projects/octoclick-new`).
- `types/` в корне репо (у dterema — `app/types/`) → все относительные импорты скопированных файлов вручную переправлены. Прямое доказательство ручного переноса.

## Дрейф копий (главный аргумент за пакет)

1. **Регресс дисциплины:** dterema везде `var(--size-sm)`/`color-mix(...)`; vintera в тех же файлах — хардкод (`#bf36ff`, `rgb(255 255 255 / 30%)`, `13px`) в 10 файлах, **вопреки собственному** `.agents/skills/theme-system/SKILL.md` («только var(--*)»).
2. **Watcher-баг унаследован и мутировал:** `SOURCE_REL` в vintera указывает на несуществующий `app/config/theme.ts` (файл стал директорией — список не обновили): HMR-регенерация base-vars.css не срабатывает вовсе; в dterema частично (2 файла из 11). Классический баг рассинхронизированных копий.
3. **Breakpoints ×3, причём шкалы разные:** `theme/breakpoints.ts` (640/768/1024/1280/1536/1800 — CSS-переменные `--breakpoint-*` никем не потребляются), `useAppBreakpoints.ts` (410/576/768/992/1600/1800 — другая шкала!), ad-hoc `@media (max-width: 992px)` в scoped-стилях.
4. **Методология задекларирована ≠ реализована:** skill объявляет CUBE CSS, stylelint enforce'ит BEM, фактический код — BEM; composition-примитивов (stack/cluster) нет, единственный layout-примитив — `.container`.
5. Неиспользуемые токены (`gradients.purple/glass` без утилит) — нет контроля покрытия.
6. Баг kebab()/`--size-2-xl` — тот же, что в dterema (общий предок).

## Кандидаты на извлечение в пакет (по убыванию уверенности)

1. Движок «TS-токены → CSS vars»: codegen + CLI + Nuxt-модуль-watcher (различаются только путями).
2. Контракты типов: `ThemeTokens`, `AppTheme`, `Palette`, `ColorScale` (форма идентична; per-project расширения — `purple/sunset/glass`, `textMuted`).
3. `*ToCssVars()` runtime-функции (посимвольно идентичны).
4. Naive-адаптер: `naiveCommonFromThemeTokens` + `mergeNaiveDesktopOverride`.
5. Каркас `styles/{core,ui,animations}` (reset/typography/container/scrollbar/buttons/badges/gradients) — «дизайн-система по умолчанию», сейчас дрейфует независимо.
6. `stylelint.config.mjs` (90% общий).

НЕ кандидаты (бренд): значения palette/tokens/gradients, шрифтовые пары, конкретные Naive-оверрайды «хрома».

## Вывод

Минимум 3 проекта (dterema, vintera, octoclick) разделяют паттерн ручным copy-paste без общего пакета. Копии дрейфуют по качеству и багам в обе стороны. Это классический Rule-of-Three сигнал: экстракция обоснована. Дополнительно vintera уже валидировал Tailwind-v4-мост поверх тех же переменных.
