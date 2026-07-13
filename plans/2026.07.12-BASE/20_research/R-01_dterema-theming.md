# R-01 — Анализ темизации dterema (эталонный донор паттерна)

> Источник: код-аудит `/home/vostrikov/projects/dterema/app/` (агент, 2026-07-07).
> Стек: nuxt@4.4.2, naive-ui@2.44.1, @bg-dev/nuxt-naiveui@2.0.0, vue@3.5.31, sass@1.99 (indented), без Tailwind.

## Архитектура (что работает и подлежит обобщению)

**Токены — TS-объекты, 2 слоя:**
- `app/config/theme/palette.ts` — примитивы: шкалы 50–900 (`forest/amber/neutral`), `as const satisfies Palette`
- `app/config/theme/tokens.ts` — семантика: `themeLight/themeDark: ThemeTokens` (primary/bg*/text*/border*/shadow*/opacity/transition), ссылается на palette
- `app/config/theme/{typography,spacing,radius,layout,zIndex,gradients,tracking,breakpoints,motion}.ts` — по словарю на категорию
- Типы: `app/types/theme.ts`, `app/types/theme-tokens.ts` (`ColorScale`, `ThemeTokens`)

**Тройной пайплайн одного источника:**
1. **Build-time (анти-FOUC):** `scripts/sync-css-vars.mjs` (jiti) → `scripts/lib/styles-css-vars-codegen.ts::renderGeneratedBaseVarsCss()` → `public/styles/base-vars.css` (`:root{}` + `html[data-theme="dark"]{}`), подключается `<link>` в head до JS. Регенерация: postinstall, `yarn gen:styles`, кастомный Nuxt-модуль `modules/sync-styles-css-vars.ts` (hook `build:before` + vite-плагин watcher, debounce 80ms).
2. **Runtime (переключение темы):** `useTheme()` (`useState` + `localStorage['theme']`) → `applyCssVars(mode)` → `documentElement.style.setProperty()` + `data-theme` атрибут.
3. **Naive UI:** `naiveCommonFromThemeTokens(ThemeTokens) → GlobalThemeOverrides.common` (~20 полей вручную) + `mergeNaiveDesktopOverride()` (defu, responsive < 1800px); build-time конфиг в `nuxt.config` + runtime пропы на `<NaiveConfig>`.

**Naming:** camelCase → `--kebab-case` (`bgBase` → `--bg-base`); категории с префиксом (`--spacing-*`, `--radius-*`, `--z-*`), семантика без префикса (`--primary`).

**Компонентный паттерн:** локальные CSS-переменные-модификаторы (`:where(.btn-link) { --btn-bg: ...; }`, `.btn-link--primary { --btn-bg: var(--gradient-brand) }`) — BEM + custom-property override.

## Дефекты (требования к пакету «от противного»)

1. **Дубль генератора:** `kebab()`/`tokensToCssVars()` скопированы в `app/utils/theme-css-vars.ts` (runtime) и `scripts/lib/styles-css-vars-codegen.ts` (codegen) — рассинхронизация возможна.
2. **Баг kebab() с цифрами:** `/([A-Z])/g` → `size2xl` даёт `--size2xl`, а `sizeXl` даёт `--size-xl` — несогласованный naming в одной группе.
3. **Мёртвые ссылки из-за бага:** `core/typography.sass` использует `var(--size-5-xl, 48px)` — переменной не существует (реально `--size5xl`); h1–h4 живут на fallback'ах, токены заголовков фактически отключены. Тихий баг.
4. **Breakpoints ×3:** `theme/breakpoints.ts` (строки), `useAppBreakpoints.ts` (числа, hardcode для vueuse), `NAIVE_UI_MEDIUM_BREAKPOINT=1800` — три независимых копии.
5. **Две color-mode системы:** кастомный `useTheme()` (`data-theme` + localStorage) и встроенный в `@bg-dev/nuxt-naiveui` (`useNaiveColorMode`, cookie, class `dark`) — не синхронизированы, модульная не отключена.
6. **Хрупкий `<NaiveConfig>`:** пропы `theme/theme-overrides` летят fallthrough-атрибутами в компонент с `defineProps({})` и перебивают внутренний биндинг только за счёт порядка `mergeProps` — недокументированная зависимость от внутренностей модуля.
7. Naive component-overrides — пустые заглушки (`common: {}`), только common-слой реализован.
8. `success/warning/error/info` — сырые hex вне палитры, ручная синхронизация light/dark.
9. Нет multi-theme/бренд-абстракции (жёстко light/dark), нет `@layer` (каскад держится порядком @import), Sass используется только как синтаксис.
10. `useTheme().toggle()` не вызывается ни из одного UI — переключателя темы нет.

## Вывод для ThemeOn

Ядро паттерна (TS-токены → dual pipeline CSS vars → адаптер Naive) — рабочее и проверенное, но реализовано с багами класса «ручная сборка»: дубли, naming-дрейф, отсутствие линтера соответствия var-ссылок ↔ сгенерированных переменных. Пакет должен дать: единый резолвер/нейминг, генераторы build+runtime из одного модуля, token-coverage линтер, единый источник breakpoints для CSS/JS/UI-lib, одну color-mode систему с анти-FOUC.
