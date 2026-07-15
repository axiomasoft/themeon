# AUDIT 2026-07-14 — поведенческие контракты закрытых фаз P1–P4 против собственного research

| Поле | Значение |
|:--|:--|
| Дата | 2026-07-14 |
| Метод | Workflow `themeon-research-conformance-audit`: 7 доменов (core / colors / css / vue / nuxt+vite / naive / tailwind+cli) → 37 сырых → верификация 2 линзами (реальность кода / реальность канона, внешние факты — свежим RAG) → **28 подтверждено, 9 отсеяно** |
| Модель | opus/high (81 агент, 4.26M токенов) |
| Триггер | При ревью P3.7 вскрылось: research (`R-13` §2.1) выписал канон `store`/`system`/`state`, а P3.1 его не реализовал — **никто не сверял поведенческий контракт кода с research перед закрытием item'а**. Аудит искал остальные случаи того же класса |
| Статус находок | НЕ исправлены (кроме класса P3.7/P3.8). Ремедиация — фаза **P8** |

## Системный вывод (важнее отдельных находок)

**Пакет сломан на собственных документированных happy-path'ах**, и ни один тест этого не поймал,
потому что **каждый тест мокает границу**:

- `@themeon/vite` тестируется вызовом хуков плагина на фейковом контексте — через настоящий Vite
  плагин не прогонялся НИ РАЗУ (и не работает: находка #1).
- `@themeon/tailwind` проверяется строковыми ассертами на текст `@theme inline`, а не компиляцией
  реальным Tailwind (#4, #5 — компиляция вскрыла оба сразу).
- `@themeon/naive` тестируется на `refLayer:'inline'`, тогда как README показывает ДЕФОЛТНЫЙ путь
  резолва, на котором адаптер отдаёт `var(--…)`-строки вместо цветов (#2).
- Ряд VERIFY-меток самого research (R-14 §2.2) снят «конструктивно», без эмпирики — и оба раза
  посылка оказалась ложной.

Лекарство того же класса, что `parity.test.ts` (P3.8): **проверять РЕЗУЛЬТАТ через настоящую трубу**
(реальный Vite-билд, реальная компиляция Tailwind, реальный naive-ui), а не форму строки на фейке.

**Research тоже дефектен** — его нельзя брать как истину в ремедиации:
- `R-13` §4.4 — рецепт `@import "virtual:themeon.css"` в CSS **не работает** (породил #1);
- `R-14` §2.1 — «`@theme inline` НЕ создаёт глобальную переменную» **ложно** (породило #5);
- `R-13` §4.3 — из верного факта («UnoCSS шлёт `js-update`») сделан ОБРАТНЫЙ вывод (породило #18).
Ремедиация обязана перепроверять внешние факты RAG'ом, а не цитировать R-xx.

## Сводка: Blocker — 5, Major — 18, Minor — 5

| # | Severity | Пакет | Находка |
|:--|:--|:--|:--|
| 1 | Blocker | `vite` | Единственный документированный способ подключения (`@import 'virtual:themeon.css'` в CSS) в Vite не работает: CSS `@import` не резолвит virtual-модули плагинов |
| 2 | Blocker | `naive` | toNative() читает `resolved.vars` — на дефолтном пути резолва это `var(--ref)`-строки, а не цвета: инвариант «только hex» (P-D29) не выполняется, Naive/seemly падает |
| 3 | Blocker | `naive` | `--color-bg-subtle` → `baseColor`: у Naive `baseColor` — это НЕ фон-поверхность, а базовый white/black, которым красится ТЕКСТ на solid-кнопках; `--color-on-primary` (точная роль под это) не замаплен вовсе |
| 4 | Blocker | `tailwind` | `breakpoint` включён в self-referential `@theme inline` → Tailwind генерирует `@media (width >= var(--breakpoint-md))` — невалидный media-query, ВСЕ адаптивные варианты (`md:`/`lg:`) мертвы |
| 5 | Blocker | `tailwind` | `@theme inline` ВСЁ РАВНО эмитит глобальную переменную — self-referential форма кладёт в `:root,:host` циклическое `--color-x: var(--color-x)`; при обратном порядке подключения CSS оно перебивает tokens.css и убивает ВСЕ токены |
| 6 | Major | `core` | toDTCG эмитит DTCG-невалидные `dimension`: любые единицы (%/em/vh) и legacy-строки, тогда как спека 2025.10 требует объект `{value, unit}` c unit ∈ {px, rem} |
| 7 | Major | `core` | toDTCG эмитит DTCG-невалидные `color`: непарсибельные нотации уходят legacy-строкой (в 2025.10 строка не валидна), `hsl()` — валидный colorSpace спеки — не парсится вовсе |
| 8 | Major | `core` | fromDTCG теряет `$type`, объявленный на КОРНЕВОЙ группе документа → структурные токены молча выбрасываются |
| 9 | Major | `core` | fromDTCG понимает multi-file только под собственные имена файлов ThemeOn (`base.tokens.json`/`*.tokens.json`) — чужой DTCG-бандл импортируется в ПУСТУЮ тему, молча |
| 10 | Major | `core` | Нет `hex`-fallback для OKLCH — то есть ровно для канонического формата авторинга ThemeOn; hex эмитится только там, где он бесполезен (srgb) |
| 11 | Major | `core` | Сегменты пути с точкой (канонически поддержанные naming-движком, напр. `space['1.5']`) эмитятся в DTCG как имена токенов/групп с `.` — спека это прямо запрещает |
| 12 | Major | `colors` | Текстовые шаги 11/12 зажаты диапазоном (0, L₁₀) → шаг 11 схлопывается на шаг 10, а для тёмных seed'ов 11 ≡ 12: роли Radix «low-contrast text» / «high-contrast text» / «hover solid» перестают различаться |
| 13 | Major | `colors` | Cap гауссианы `min(1.2, …)` позволяет шагам 6–8 превысить chroma seed'а → шаг 9 перестаёт быть самым насыщенным шагом шкалы (прямое нарушение формы Radix) |
| 14 | Major | `colors` | Нет проверки seed'а относительно якоря L₁: seed темнее 0.188 (dark) / светлее 0.993 (light) инвертирует и схлопывает шкалу — при этом план утверждает, что монотонность гарантирована «при любом seed» |
| 15 | Major | `colors` | Полупрозрачный bg безусловно композитится на БЕЛУЮ подложку — в тёмных темах гейт считает контраст против фона, которого не существует |
| 16 | Major | `css` | Документированный рецепт соседства с Tailwind v4 ставит ВСЕ слои themeon НИЖЕ Tailwind Preflight — h1..h4 и .btn ломаются у любого, кто последует README |
| 17 | Major | `vue` | `matchMedia` (и `document`) не client-гейтятся — `init()` бросает там, где `localStorage` аккуратно защищён; `initialized=true` выставлен ДО броска, поэтому повтор — молчаливый no-op |
| 18 | Major | `vite` | HMR токенов мёртв: `css-update` для virtual-модуля — молчаливый no-op в клиенте Vite (нужен `js-update`, как у UnoCSS) |
| 19 | Major | `nuxt` | D13 dev-watcher регенерирует БАЙТ-В-БАЙТ тот же CSS: `importModule` — это нативный `import()`, ESM-кэш, никакого «fresh jiti instance» |
| 20 | Major | `nuxt` | `hashDir` обходит директорию без ignore-списка, а дефолтный `tokensDir = dirname(theme)` легко оказывается rootDir → синхронный sha256 всего проекта (включая node_modules) на каждое сохранение файла в dev |
| 21 | Major | `naive` | Деривация `*Hover/*Pressed/*Suppl` фиксированными ±L-дельтами вместо соседних ступеней собственной 12-step шкалы: pressed сливается с hover, направление suppl противоречит Naive |
| 22 | Major | `cli` | `themeon check` гоняет все contrast-пары как `usage:'body'` (порог \|Lc\| 75), а собственный гейт `@themeon/css` — как `'text'` (60): дефолтная тема пакета ПРОВАЛИВАЕТ свой же линтер (exit 1) |
| 23 | Major | `cli` | Скан не исключает СГЕНЕРИРОВАННЫЕ файлы (`--out`-tokens и bridge.css): unused-половина token-coverage глохнет, hardcode сыпет ложными warning'ами на собственный вывод |
| 24 | Minor | `core` | toDTCG не имеет канала warnings, хотя ТЗ P1.7 требует «legacy-строка + warning» на каждый непарсибельный цвет/именованную easing |
| 25 | Minor | `core` | themeon.resolver.json может получить modifier с ОДНИМ контекстом, что нарушает правило Resolver Module («modifier ≥ 2 contexts») |
| 26 | Minor | `css` | `.container` и `.cover` молча зависят от `box-sizing: border-box` из слоя reset, хотя `composition.css` контрактно самодостаточен |
| 27 | Minor | `vue` | `$theme` регистрируется в `globalProperties`, но `ComponentCustomProperties` не аугментирован — фича нерабочая в любом типизированном проекте |
| 28 | Minor | `tailwind` | Double-dash companion (`--text-2xl--line-height`): ТЗ требовало исключать, код включает, тест закрепляет включение, а Completion Notes и Update Log рапортуют «исключение double-dash companion» — сверки кода с планом не было |

## Находки (полностью)

### 1. [Blocker] Единственный документированный способ подключения (`@import 'virtual:themeon.css'` в CSS) в Vite не работает: CSS `@import` не резолвит virtual-модули плагинов

**Файл:** `packages/vite/README.md`

**План/research предписывает:** R-13 §4.4 (строки 267-272): «в `resources/css/app.css` — `@import "virtual:themeon.css";`… Виртуальный маршрут даёт HMR токенов в dev». Тот же рецепт закреплён в ТЗ P3.5 (`phases/P3.md`, Inputs «Laravel-рецепт: R-13 §4.4»).

**Код делает:** `packages/vite/README.md` — ВСЕ три рецепта (Quickstart, «Laravel + Vite», «Plain / vanilla») показывают подключение только так: ```css\n@import 'virtual:themeon.css';\n@import '@themeon/css/index.css';\n``` Нигде не показан канонический `import 'virtual:themeon.css'` из JS-энтри. `packages/vite/src/index.ts:44-51` регистрирует `resolveId`/`load` — хуки плагин-контейнера, которые CSS-конвейер не спрашивает.

**Где это видно потребителю:** Потребитель пакета копирует README (Laravel: `resources/css/app.css` с `@import 'virtual:themeon.css'`) → `vite build`/`vite dev` падает или логирует «Unable to resolve @import» + ENOENT; тема не подключается вообще. Даже если бы @import инлайнился, виртуальный модуль не был бы отдельным узлом графа → `this.environment.moduleGraph.getModuleById(RESOLVED)` в `hotUpdate` вернул бы `null` (`index.ts:60-61`) → HMR второй раз мёртв. Пакет по факту работает только при `import 'virtual:themeon.css'` из JS — способ, которого нет ни в README, ни в research.

**Канон 2026 (RAG):** Vite 8.1.4 (ground truth в репо: `.../vite/dist/node/chunks/node.js:22535-22553`) обрабатывает `@import` в CSS через postcss-import с собственным резолвером: `resolve: (id) => atImportResolvers.css(...)` — это `createBackCompatIdResolver` (fs-резолвер, `createCSSResolvers`, строки 22408-22421), плагинные `resolveId` в нём НЕ участвуют; `load: async (id) => await fs.promises.readFile(id, 'utf-8')` — чтение с диска. Для `virtual:themeon.css` резолв не найдёт файл → `logger.error('Unable to resolve `@import "virtual:themeon.css"`')` → `readFile('virtual:themeon.css')` → ENOENT. Канон подтверждён на эталоне: UnoCSS документирует ТОЛЬКО `import 'virtual:uno.css'` из JS-энтри (https://unocss.dev/integrations/vite), а запрос на CSS-`@import` виртуального модуля — известное ограничение (https://github.com/unocss/unocss/issues/3853). Virtual-module конвенция: https://vite.dev/guide/api-plugin


### 2. [Blocker] toNative() читает `resolved.vars` — на дефолтном пути резолва это `var(--ref)`-строки, а не цвета: инвариант «только hex» (P-D29) не выполняется, Naive/seemly падает

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/naive/src/to-native.ts`

**План/research предписывает:** R-05 §вердикт п.3 (`plans/2026.07.12-BASE/20_research/R-05_ui-library-adapters.md:31`): «AntDV — резолвить токены в hex ДО подачи в seed». R-14 §1.3 (`R-14_P4-naive-tailwind-cli.md:65-69`): «резолвить цвета в hex/rgba ДО подачи в Naive… подавать все 4 варианта явными hex/rgba. Это конструктивно устраняет риск неизвестной oklch-поддержки seemly». P-D29 (`plan.md:190`): «подаёт ВСЕ цвета в Naive как hex/rgba (`toHex`)». P4.6 Rule 5 (`phases/P4.md`, ~строка 1243): «Naive VERIFY seemly (§1.3): не требуется эмпирически, т.к. P-D29 конструктивно обошёл (hex-выход)» — гейт снят на ложной посылке.

**Код делает:** `to-native.ts:13-19` `buildLookup()`: `const lookup = { ...resolved.vars }`. Но `packages/core/src/resolve.ts:187` пишет в `vars` именно var-chain: `vars[varName] = directRef !== undefined ? `var(${directRef})` : valueStr` — `.vars` это ТРАНСПОРТ ДЛЯ CSS-эмита (`serialize.ts:120` его и потребляет), а литерал лежит рядом, в `resolved.tokens[].value` («финальное CSS-значение, цепочки ссылок схлопнуты», `core/src/types.ts:108`). `toHex()` (`color.ts:23-31`) на `var(...)` кидает внутри colorjs.io и по catch-у ВОЗВРАЩАЕТ СТРОКУ КАК ЕСТЬ. Прогон на собственной дефолт-теме проекта (`resolveTheme(defaultTheme)`, дефолт `refLayer:'referenced'` — ровно README-quickstart `packages/naive/README.md`): `toNative(r).common` = `{primaryColor:'var(--color-accent-9)', primaryColorHover:'var(--color-accent-10)', primaryColorPressed:'var(--color-accent-9)', primaryColorSuppl:'var(--color-accent-9)', bodyColor:'var(--color-neutral-1)', baseColor:'var(--color-neutral-2)', textColorBase:'var(--color-neutral-12)', …}` — НИ ОДНОГО hex. (С `{theme:'dark'}` роли из dark-патча приходят литералами — патчи материализуются без ref, `resolve.ts:264` — поэтому dark выглядит рабочим, а база/light сломана: асимметрия маскирует баг.) Тесты не ловят: фикстура `to-native.test.ts:24` строит `vars: Object.fromEntries(tokens.map(t => [t.varName, t.value]))`, т.е. подсовывает литералы там, где реальный резолвер даёт `var()`.

**Где это видно потребителю:** Потребитель делает ровно то, что написано в `packages/naive/README.md` (quickstart) и в P4.2: `const resolved = resolveTheme(defineTheme(...))` (или берёт `defaultTheme` из `@themeon/css`), `<NConfigProvider :theme-overrides="toNative(resolved)">`. В светлой теме первый же `<NCheckbox>` / `<NRadio>` / `<NDropdown>` / `<NAnchor>` / `<NAlert>` внутри провайдера роняет рендер: `[seemly/rgba]: Invalid color value var(--color-accent-9)` из `useTheme` → белый экран/Vue error. Компоненты без seemly-математики (NButton) не падают, но `primaryColorPressed`/`Suppl` равны `primaryColor` (деривация тоже свалилась в fail-safe passthrough) → нет обратной связи на нажатие. В dark всё работает — баг проявляется только на базовой/светлой теме, т.е. проедет мимо любого dark-смока.

**Канон 2026 (RAG):** naive-ui 2.44.1 (установлен в репо) вычисляет темы компонентов ОТ смёрженного common: `es/_mixins/use-theme.mjs:74-76` — `mergedCommon = merge({}, builtinCommon, globalCommonOverrides, …)`, `mergedSelf = self(mergedCommon)`. `self()` гоняет наши значения через seemly: `es/checkbox/styles/light.mjs:42` `changeColor(primaryColor,…)`, `es/radio/styles/light.mjs:32`, `es/dropdown/styles/light.mjs:46`, `es/anchor/styles/light.mjs:17`, `es/alert/styles/light.mjs:41-86` `composite(baseColor, changeColor(infoColor,…))`. Эмпирически (seemly@0.3.10, node): `changeColor('var(--x)',{alpha:.5})` → THROW `[seemly/rgba]: Invalid color value var(--x)`; `checkboxLight.self({...commonLight, primaryColor:'var(--color-accent-9)'})` → THROW `[seemly/rgba]: Invalid color value var(--color-accent-9)`. Подтверждение канона: https://github.com/tusen-ai/naive-ui/discussions/2614 — «var(--x) is not a safe value for color fields; changeColor chokes on unresolved custom property → Invalid color value; resolve the CSS custom property to a real color string in JS first». Док темизации: https://www.naiveui.com/en-US/os-theme/docs/customize-theme


### 3. [Blocker] `--color-bg-subtle` → `baseColor`: у Naive `baseColor` — это НЕ фон-поверхность, а базовый white/black, которым красится ТЕКСТ на solid-кнопках; `--color-on-primary` (точная роль под это) не замаплен вовсе

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/naive/src/common-map.ts`

**План/research предписывает:** R-05 §Naive (`R-05_ui-library-adapters.md:10`) и R-14 §1.2 (`R-14:53-56`) перечисляют `baseColor` в списке ключевых `common`-токенов, НЕ раскрывая семантику — из чего план вывел маппинг. P4.2 Implementation Rule 5 (`phases/P4.md:423`): «`--color-bg-subtle` → `baseColor` (color)». При этом дефолт-тема держит ровно ту роль, которая тут нужна: `packages/css/src/theme/default.ts:57` `onPrimary: 'oklch(1 0 0)'` с комментарием «текст на solid-кнопке (accent step 9)… APCA-порог» — и `--color-on-primary` в `NAIVE_COMMON_MAP` отсутствует.

**Код делает:** `common-map.ts:68`: `'--color-bg-subtle': { key: 'baseColor', kind: 'color' }`. Прогон `toNative(resolveTheme(defaultTheme,{refLayer:'inline'}))`: light → `baseColor: '#f7f8fa'`; `{theme:'dark'}` → `baseColor: '#151616'`. `--color-on-primary` не встречается ни в `NAIVE_COMMON_MAP`, ни в `DERIVABLE_BASES`.

**Где это видно потребителю:** Пилот включает dark-тему: `btnDark.self(mergedCommon)` (реальный прогон naive-ui 2.44.1 с выходом `toNative(resolved,{theme:'dark'})`) даёт solid primary-кнопку `colorPrimary '#008a48'` с ЛЕЙБЛОМ `textColorPrimary '#151616'` — почти чёрный текст на средне-зелёной кнопке, APCA |Lc| = **32.7** при собственном пороге проекта ≥60 (`themeon check contrast`, P2.7); у стоковой Naive там 76.9. Кнопка «Сохранить» практически нечитаема. То же для success/warning/error/info-кнопок и для рамок/фонов NAlert (`composite(baseColor, …)`). В light — тише, но тоже деградация: 71.0 вместо 75.6. Правильный источник (`--color-on-primary` = белый) в теме есть и не используется. Собственный APCA-гейт это не ловит: он проверяет пары ThemeOn-ролей, а не пары, которые СОБИРАЕТ Naive из нашего маппинга.

**Канон 2026 (RAG):** naive-ui 2.44.1 (установлен): `es/_styles/common/light.mjs:76` `baseColor: base.neutralBase` где `neutralBase: '#FFF'` (строка 4); `es/_styles/common/dark.mjs:75` → `'#000'`. Этот токен компоненты берут как ЦВЕТ ТЕКСТА НА ЗАЛИВКЕ: `es/button/styles/light.mjs:103-107` `textColorPrimary: baseColor, textColorHoverPrimary: baseColor, textColorPressedPrimary: baseColor…` — и то же для Info/Success/Warning/Error (строки 130-215); плюс `composite(baseColor, …)` для сплющивания альфы в 12 компонентных темах (`es/alert/styles/light.mjs:41-86` и др.). Источник: https://github.com/tusen-ai/naive-ui/blob/main/src/_styles/common/light.ts + https://github.com/tusen-ai/naive-ui/blob/main/src/button/styles/light.ts (проверено на установленном 2.44.1). Что `baseColor` НЕ следует использовать как поверхность и что текст на solid-кнопке идёт от него — подтверждает и то, что stock-dark Naive даёт `textColorPrimary '#000'` на `#63e2b7` (APCA |Lc| 76.9).


### 4. [Blocker] `breakpoint` включён в self-referential `@theme inline` → Tailwind генерирует `@media (width >= var(--breakpoint-md))` — невалидный media-query, ВСЕ адаптивные варианты (`md:`/`lg:`) мертвы

**Файл:** `packages/tailwind/src/namespaces.ts:9-21 (+ bridge.ts:78)`

**План/research предписывает:** R-14 §2.1 «Для ThemeOn inline нужен ВСЕГДА» + P-D31 (plan.md:192) «`@theme inline` ОБЯЗАТЕЛЕН, не опция; форма mapping — self-referential `--x: var(--x)`; non-inline `@theme` в генераторе запрещён». P4.1 Inputs (phases/P4.md) перечисляет `breakpoint` в наборе namespace'ов моста наравне с `color`/`spacing`. Ни research, ни план нигде не отделяют `--breakpoint-*` — namespace, чьё значение Tailwind обязан подставить ЛИТЕРАЛОМ в `@media` на этапе сборки, — от namespace'ов, которые живут в значениях свойств.

**Код делает:** namespaces.ts:9-21 — `TAILWIND_NAMESPACES = ['color','font-weight','font','text','tracking','leading','breakpoint','spacing','radius','shadow','ease']`; bridge.ts:78 — `lines = filtered.map((name) => `  ${name}: var(${name});`)`. Т.е. `--breakpoint-md` уходит в бридж как `--breakpoint-md: var(--breakpoint-md);`. Эмпирический прогон РЕАЛЬНОГО Tailwind 4.3.2 (`@tailwindcss/node` compile, тот же движок, что в `tailwind-compile.test.ts`) на теме с `breakpoint: { md: '48rem', lg: '64rem' }` дал в `@layer utilities`: `.md\:bg-action-primary { @media (width >= var(--breakpoint-md)) { … } }` и `@media (width >= var(--breakpoint-lg))`. Compile-тест пакета этого не ловит: он билдит только `['bg-action-primary']`, ни одного responsive-варианта.

**Где это видно потребителю:** Потребитель делает `themeon build --tailwind bridge.css` на теме с брейкпоинтами (D14 — «один источник брейкпоинтов», т.е. они ОБЯЗАНЫ быть в теме) и пишет `class="md:flex lg:p-md"`. Правило компилируется, но `@media (width >= var(--breakpoint-md))` невалиден → блок отбрасывается браузером → ни один `md:`/`lg:`-класс никогда не применяется. Ни ошибки сборки, ни warning'а: адаптивная вёрстка молча не работает на всех ширинах.

**Канон 2026 (RAG):** var() нельзя использовать в media-query: «custom properties do not work inside media queries», браузер считает такой @media невалидным; Tailwind-мейнтейнеры для v4 явно рекомендуют инлайнить литерал через `theme(--breakpoint-md)`, а не `var(--breakpoint-md)` — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties (+ https://stackoverflow.com/questions/40722882/css-native-variables-not-working-in-media-queries); Tailwind v4 theme namespaces: https://tailwindcss.com/docs/theme


### 5. [Blocker] `@theme inline` ВСЁ РАВНО эмитит глобальную переменную — self-referential форма кладёт в `:root,:host` циклическое `--color-x: var(--color-x)`; при обратном порядке подключения CSS оно перебивает tokens.css и убивает ВСЕ токены

**Файл:** `packages/tailwind/src/bridge.ts:78 (+ src/tailwind-compile.test.ts:57-60)`

**План/research предписывает:** R-14 §2.1: «`@theme inline { --color-x: var(--ref) }`: Tailwind **НЕ создаёт** глобальную `--color-x`» + цитата discussion #18560. R-14 §2.2 ставит VERIFY-метку: «проверить (b) `--color-action-primary` НЕ появляется дублем в собранном CSS от Tailwind» и даёт fallback-план — «использовать разные имена (`--color-primary: var(--color-action-primary)`)». P-D31 (plan.md:192) повторяет тот же fallback.

**Код делает:** bridge.ts:78 эмитит `--x: var(--x);`. Реальный Tailwind 4.3.2 (мой прогон, идентичная конфигурация compile-теста) выдаёт: `@layer theme { :root, :host { … --color-action-primary: var(--color-action-primary); --color-text: var(--color-text); --spacing-md: var(--spacing-md); } }` — глобальная переменная СОЗДАЁТСЯ, и она самоссылочная. Compile-тест это увидел, но истолковал наоборот: `const selfRefCount = (out.match(/--color-action-primary:\s*var\(--color-action-primary\);/g) ?? []).length; expect(selfRefCount).toBe(1)` с комментарием «(b) единственное self-referential объявление … не дубль». Completion Notes P4.1 записали «self-referential форма компилируется без дубль-объявления… fallback-план P-D31 НЕ понадобился» — т.е. VERIFY-метка закрыта на противоположном факте. Работает всё только потому, что `@layer themeon.tokens` из tokens.css объявляется ПОСЛЕ `@layer theme, base, components, utilities` и потому выигрывает каскад. Эмпирика: если поменять порядок (`@import "./tokens.css"` до `@import "tailwindcss"`), layer-order становится `themeon.tokens, theme, …` → выигрывает `theme` → в `:root` остаётся `--color-action-primary: var(--color-action-primary)`.

**Где это видно потребителю:** Vite/Nuxt-приложение: `main.ts` делает `import '@themeon/css'` (tokens.css, `@layer themeon.tokens`), а Tailwind-энтри `app.css` подключается позже — или пользователь пишет `@import "./tokens.css"; @import "tailwindcss"; @import "./bridge.css";`. Порядок объявления слоёв переворачивается, `@layer theme` выигрывает, и `--color-*` во всём документе становится invalid-at-computed-value-time → и Tailwind-утилиты (`bg-action-primary`), и рукописный CSS на `var(--color-text)` теряют значения (прозрачный фон / унаследованный цвет). Ни ошибки сборки, ни предупреждения. Задокументированный fallback (разные имена LHS/RHS) устраняет цикл конструктивно, но был отклонён как ненужный.

**Канон 2026 (RAG):** (1) `@theme inline` эмитит переменную в `:root,:host` и отличается только тем, что утилита использует значение, а не `var()`: https://github.com/tailwindlabs/tailwindcss/discussions/17826 (+ https://tailwindcss.com/docs/theme) — т.е. посылка R-14 §2.1 фактически неверна. (2) Самоссылочная custom property = цикл в графе зависимостей → invalid at computed-value time, свойство считается незаданным: https://www.w3.org/TR/css-variables-1/ (§ cycles).


### 6. [Major] toDTCG эмитит DTCG-невалидные `dimension`: любые единицы (%/em/vh) и legacy-строки, тогда как спека 2025.10 требует объект `{value, unit}` c unit ∈ {px, rem}

**Файл:** `packages/core/src/dtcg/to-dtcg.ts`

**План/research предписывает:** R-11 §1 (20_research/R-11_P1-core-engine.md:32): «Dimension ($type: "dimension"). Структурная форма: `{ "value": 0.5, "unit": "rem" }`; legacy-строка `"16px"` тоже валидна. `fromDTCG` принимает обе, `toDTCG` эмитит структурную». P1.md:649 (таблица маппинга P1.7): «dimension (space/radius/breakpoint) | dimension | `'1rem'` → `{value: 1, unit: 'rem'}`; произвольные строки (`calc(...)`) → legacy-строка».

**Код делает:** packages/core/src/dtcg/to-dtcg.ts:71-75 — `function splitDimension(s){ const m = /^(-?\d*\.?\d+)([a-z%]+)$/i.exec(s.trim()); ... return {value: Number(m[1]), unit: m[2]} }` (юнит — ЛЮБАЯ буквенная последовательность или `%`), и to-dtcg.ts:98-99 — `case 'dimension': return typeof value === 'string' ? (splitDimension(value) ?? value) : value` (не распарсилось → строка как `$value`). Т.е. `space: { gutter: '2%' }` → `{"$type":"dimension","$value":{"value":2,"unit":"%"}}`; `space: { fluid: 'clamp(1rem,2vw,2rem)' }` → `{"$type":"dimension","$value":"clamp(...)"}`.

**Где это видно потребителю:** Потребитель делает `toDTCG(theme)` и кладёт `base.tokens.json` в Terrazzo / Style Dictionary v5 / DTCG-валидатор (dembrandt.com/validator) — ровно тот сценарий, ради которого мост существует (D2, master §3). Любой токен с `%`, `em`, `vh`, `ch`, `calc()`/`clamp()` (типовые в space/radius) либо отвергается валидатором как невалидный dimension, либо тихо интерпретируется как строка. При этом ThemeOn заявляет «DTCG 2025.10 — канонический interchange-формат» и не сигналит проблему ничем (см. отдельную находку про отсутствие warnings у toDTCG).

**Канон 2026 (RAG):** https://www.designtokens.org/TR/2025.10/format/ (Design Tokens Format Module 2025.10, §dimension): «The value MUST be an object containing a numeric `value` (integer or floating-point) and `unit` of measurement (`"px"` or `"rem"`)» — строковая форма `"16px"` для `$type: dimension` НЕ валидна, unit ограничен px|rem. Тот же документ по duration: «a `unit` of milliseconds (`"ms"`) or seconds (`"s"`)». То есть и R-11 (утверждает валидность legacy-строк), и код (любые единицы) отстали от канона.


### 7. [Major] toDTCG эмитит DTCG-невалидные `color`: непарсибельные нотации уходят legacy-строкой (в 2025.10 строка не валидна), `hsl()` — валидный colorSpace спеки — не парсится вовсе

**Файл:** `packages/core/src/dtcg/color.ts`

**План/research предписывает:** R-11 §1 (R-11_P1-core-engine.md:26): «Строковая форма (`"#ff0000"`, `"color(display-p3 1 0 0)"`) остаётся валидной — legacy»; R-11 §1:23 перечисляет colorSpace «идентификаторы CSS Color 4: srgb, display-p3, oklch, lab, hsl…». P-D11 (plan.md:173): «best-effort микро-парсер hex/rgb()/oklch() (~60 LOC) в `dtcg/color.ts`, непарсибельное — legacy-строковая форма + warning».

**Код делает:** packages/core/src/dtcg/color.ts:113-116 — `export function parseColor(css){ const s = css.trim(); return parseHex(s) ?? parseRgb(s) ?? parseOklch(s) }` — `hsl()`/`lab()`/`color()`/`color-mix()`/именованные цвета → `null`; to-dtcg.ts:96-97 — `case 'color': return typeof value === 'string' ? (parseColor(value) ?? value) : value` → в документ уходит `{"$type":"color","$value":"hsl(210 40% 96%)"}`.

**Где это видно потребителю:** Тема с любым `hsl()`/`lab()`/`color-mix()`-цветом (а также донорские палитры пилотов P5, где hex/hsl соседствуют) экспортируется в `base.tokens.json` со строковым `$value` → строгий DTCG-валидатор/Terrazzo помечает токен невалидным, Figma/Tokens Studio-импорт его не подхватывает. Потребитель об этом не узнаёт: `toDTCG` не возвращает warnings.

**Канон 2026 (RAG):** https://www.designtokens.org/TR/2025.10/color/ (Color Module 2025.10): `$value` для `$type: color` — ОБЪЕКТ с обязательными `colorSpace` + `components`; «Plain CSS strings like "#ff0000" are not valid as the primary $value structure». Нормативный список colorSpace включает `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `srgb`, `srgb-linear`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50` — то есть `hsl()` не «непарсибельная экзотика», а первоклассный colorSpace, который мост обязан уметь. R-11 §1 («строковая форма остаётся валидной») — устаревшее утверждение, код на него опёрся.


### 8. [Major] fromDTCG теряет `$type`, объявленный на КОРНЕВОЙ группе документа → структурные токены молча выбрасываются

**Файл:** `packages/core/src/dtcg/from-dtcg.ts`

**План/research предписывает:** R-11 §1 (R-11_P1-core-engine.md:53): «`$type` наследуется вниз по группам; guessing типа из значения запрещён (токен без резолвимого типа = invalid)». P1.md:658: «`$type`-наследование по группам — реализовать при импорте (спуск по дереву)». Completion Notes P1.7 (P1.md:674) прямо рапортует: «`$type`-наследование подтверждено и реализовано» в `walkDTCG` параметром `inheritedType`.

**Код делает:** packages/core/src/dtcg/from-dtcg.ts:301 — `walkDTCG(baseDoc, baseDoc, [], undefined, baseEntries, warnings)` (и :322 для тем): корневой узел передаётся с `inheritedType = undefined`, а внутри `walkDTCG` (:170-174) любой ключ, начинающийся с `$`, безусловно `continue` — собственный `$type` корневого документа НИКОГДА не читается. `$type` подгрупп читается только при рекурсии в них (:189 `typeof c.$type === 'string' ? c.$type : inheritedType`). Дальше `dtcgValueToRaw` с `type === undefined` уходит в `default:` (:118-123) и на объектном `$value` пишет `warnings.push('token "…" has unsupported $type "(none)", skipped')` и возвращает `undefined` → токен НЕ попадает в определение.

**Где это видно потребителю:** Импорт реального DTCG-файла вида `{"$type":"color","brand":{"primary":{"$value":{"colorSpace":"oklch","components":[...]}}}}` (палитра одним типом на файл — самый частый экспорт) даёт `definition` БЕЗ единого токена и пачку warnings «unsupported $type (none), skipped». Пользователь видит пустую тему вместо импортированной палитры.

**Канон 2026 (RAG):** https://www.designtokens.org/TR/2025.10/format/: «if any of the token's parent groups have a `$type` property, then the token's type is inherited from the closest parent group with a `$type` property» — корневой объект файла и есть группа, `$type` на нём легален и наследуется вниз (типовой паттерн однотипных файлов Tokens Studio / Style Dictionary: `{"$type":"color", "brand": {...}}`).


### 9. [Major] fromDTCG понимает multi-file только под собственные имена файлов ThemeOn (`base.tokens.json`/`*.tokens.json`) — чужой DTCG-бандл импортируется в ПУСТУЮ тему, молча

**Файл:** `packages/core/src/dtcg/from-dtcg.ts`

**План/research предписывает:** D2 (00_MASTER_PLAN.md:202): «DTCG 2025.10 — interchange (`to/fromDTCG`) … DTCG-мост сохраняет совместимость с чужими пайплайнами»; §6.1 (master:227): «Если появится дизайнер с Figma — `fromDTCG()` уже есть». R-03 (R-03_dtcg-token-pipelines.md:16): пайплайн Tokens Studio — «Figma → DTCG JSON в git → нормализация → build» (имена файлов — произвольные: `global.json`, `light.json`, `core.json`). P1.7 Code Guidance (P1.md:641): `fromDTCG(files: DTCGDocument | Record<string, DTCGDocument>)` — семантика имён не задана.

**Код делает:** packages/core/src/dtcg/from-dtcg.ts:263-266 `isFileMap` = «все ключи оканчиваются на `.json`» → любой чужой бандл считается file-map; :285-289 — `baseDoc = map['base.tokens.json'] ?? {}` и темы берутся ТОЛЬКО из ключей, оканчивающихся на `.tokens.json` (`k.replace(/\.tokens\.json$/, '')`). Для входа `{'global.json': doc, 'dark.json': doc}` получаем `baseDoc = {}`, `themeDocs = {}` → `defineTheme({ base: {} })` → определение без токенов, и ни одного warning (warnings пишутся только при обходе документов, а обходить нечего).

**Где это видно потребителю:** Разработчик экспортирует токены из Tokens Studio/Terrazzo (файлы `global.json`, `semantic.json`, `dark.json`) и зовёт `fromDTCG(files)` → получает `{ definition: <пустая тема>, warnings: [] }`. Ни ошибки, ни предупреждения; `resolveTheme` дальше отдаёт пустой CSS. Мост работает фактически только на round-trip собственного `toDTCG`.

**Канон 2026 (RAG):** —


### 10. [Major] Нет `hex`-fallback для OKLCH — то есть ровно для канонического формата авторинга ThemeOn; hex эмитится только там, где он бесполезен (srgb)

**Файл:** `packages/core/src/dtcg/color.ts`

**План/research предписывает:** R-11 §1 (R-11_P1-core-engine.md:28): «**Импликация для ThemeOn:** … `toDTCG` — эмитить структурную форму (внутренний авторинг OKLCH → `colorSpace: "oklch"`) + `hex`-fallback для старого тулинга». R-11 §7 сводка (строка 229): «DTCG color = `{colorSpace, components, alpha, hex}` … `toDTCG`/`fromDTCG`: принимать обе формы, эмитить структурную + hex». D7 (master:207): «Цвет: OKLCH-авторинг».

**Код делает:** packages/core/src/dtcg/color.ts:85-104 `parseOklch` возвращает `{ colorSpace: 'oklch', components: [L,C,H] }` — поля `hex` нет и оно нигде не досчитывается; hex ставится только в `parseHex` (:51) и `parseRgb` (:74), т.е. когда исходное значение и так было sRGB. `toDTCGValue` (to-dtcg.ts:96-97) отдаёт результат `parseColor` как есть.

**Где это видно потребителю:** Любая тема, авторенная по канону D7 (OKLCH), экспортируется в DTCG без единого `hex`-fallback. Старое тулинг-звено (Style Dictionary-профиль/плагин Figma/парсер, не знающий oklch) видит `{colorSpace:"oklch", components:[…]}` и не может отрисовать/сконвертировать цвет — ровно тот сценарий, ради которого R-11 требовал hex.

**Канон 2026 (RAG):** https://www.designtokens.org/TR/2025.10/color/: «`hex` … A string that represents a fallback value of the color. The fallback color MUST be formatted in 6 digit CSS hex color notation» — назначение поля именно fallback для тулинга, не понимающего широкие colorSpace (в первую очередь oklch).


### 11. [Major] Сегменты пути с точкой (канонически поддержанные naming-движком, напр. `space['1.5']`) эмитятся в DTCG как имена токенов/групп с `.` — спека это прямо запрещает

**Файл:** `packages/core/src/dtcg/to-dtcg.ts`

**План/research предписывает:** R-11 §1 (R-11_P1-core-engine.md:36): «Curly-brace `{group.token}` — строго token-level (весь `$value` целиком), **имена без `{`/`}`/`.`**, не начинаются с `$`». При этом naming engine ThemeOn специально поддерживает дробные ключи: P1.md:371 (обязательный тест) «`['space','1.5']` → `--spacing-1-5`», и это зафиксировано тестом в `naming.test.ts`.

**Код делает:** packages/core/src/dtcg/to-dtcg.ts:53-69 `setByPath(doc, token.path, node)` кладёт сегмент как есть → `{"space": {"1.5": {"$type":"dimension", …}}}`; ссылки на такой токен эмитятся как `{space.1.5}` (to-dtcg.ts:135 `` `{${token.value.path.join('.')}}` ``), а `fromDTCG` разбирает алиасы тем же dotted-join (from-dtcg.ts:51-64) — путь `space.1.5` неразличим с `space → 1 → 5`.

**Где это видно потребителю:** Тема с Tailwind-совместимой дробной шкалой (`space: { '1.5': '0.375rem' }` — прямо предусмотрено ТЗ P1.3) экспортируется в DTCG-документ с невалидными именами; Terrazzo/Style Dictionary либо отвергают файл, либо строят другой путь. Round-trip внутри ThemeOn при этом «зелёный», поэтому баг не виден тестами.

**Канон 2026 (RAG):** https://www.designtokens.org/TR/2025.10/format/: «due to the syntax used for token aliases the following characters MUST NOT be used anywhere in a token or group name: `{`, `}`, `.` (period)» — имя токена `1.5` невалидно, а алиас `{space.1.5}` неразрешим для любого стороннего резолвера.


### 12. [Major] Текстовые шаги 11/12 зажаты диапазоном (0, L₁₀) → шаг 11 схлопывается на шаг 10, а для тёмных seed'ов 11 ≡ 12: роли Radix «low-contrast text» / «high-contrast text» / «hover solid» перестают различаться

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/colors/src/scale.ts`

**План/research предписывает:** R-12 §4 (20_research/R-12_P2-css-colors.md:88-92): «9 **solid** (максимальная chroma, шаг = seed) · 10 hovered solid · 11 low-contrast text · 12 high-contrast text». P2.md:322-329 задаёт числовой контракт: «lightness — бинарный поиск (24 итерации) по `L ∈ (0, L₁₀)` (light; для dark — `(L₁₀, 1)`) до целевого `|Lc(candidate, шаг 2)| = 68` (шаг 11) и `= 90` (шаг 12)»; P2.2 Why (P2.md:260): «шкала, у которой читаемость текста ГАРАНТИРОВАНА конструктивно».

**Код делает:** scale.ts:238 `const [lLow, lHigh] = appearance === 'light' ? [0, l10] : [l10, 1]` + solveLightnessForContrast (scale.ts:168-194), который при недостижимом таргете молча «сходится к ближайшему достижимому краю» (комментарий scale.ts:165-166). Для light-темы |Lc| против шага 2 монотонно УБЫВАЕТ с ростом L, а верхняя граница поиска = L₁₀ = L₉ − 0.045. Для любого seed с L₉ ≲ 0.6 значение Lc на границе уже выше таргета 68 → шаг 11 прилипает к L₁₀. Проверено запуском кода (tsx, реальные seed'ы дефолт-темы пакета `packages/css/src/theme/default.ts:15-16`):
• `oklch(0.55 0.02 260)` (neutral дефолт-темы), light: шаг 10 = `L=0.5050 #5f656f`, шаг 11 = `L=0.5050 #5f656f` — БАЙТ-В-БАЙТ один цвет; |Lc(11,2)| = 75.3, а не 68.
• `oklch(0.55 0.15 155)` (accent дефолт-темы), light: шаг 10 `#007a40`, шаг 11 `#007942`; |Lc(11,2)| = 73.1 вместо 68.
• `oklch(0.3 0.1 260)` (edge-seed из СОБСТВЕННОГО тест-набора P2.md:341-343), light: шаги 10/11/12 все L=0.255 → `#0f2241` / `#05204d` / `#14233b`; |Lc(11,2)| = 96.8 и |Lc(12,2)| = 96.9 — разница 0.1 Lc вместо 68 vs 90.
• `oklch(0.9 0.18 100)` (edge-seed оттуда же), dark: шаг 10 `#ffef89`, шаг 11 `#ffef84`, шаг 12 `#f9efb1` — тот же коллапс.
Тесты (scale.test.ts:70-72) проверяют только НИЖНИЕ границы (`≥ 60`, `≥ 75`) и монотонность лишь на шагах 1→10 (scale.test.ts:52-59), поэтому коллапс проходит зелёным.

**Где это видно потребителю:** В дефолт-теме, которую пакет реально шипит (`@themeon/css` → `dist/tokens.css`): `--color-text-muted` = neutral 11 и neutral 10 — один и тот же `#5f656f`; `--color-link` (accent 11 `#007942`) визуально неотличим от `--color-action-primary-hover` (accent 10 `#007a40`) — ссылка и hover-состояние solid-кнопки один цвет. Для тенанта с тёмным брендовым seed (`oklch(0.3 0.1 260)`) `--color-text` (шаг 12) и `--color-text-muted` (шаг 11) выходят одним цветом → «приглушённый» текст неотличим от основного, а контракт STEP_ROLES («Low-contrast text» / «High-contrast text») ложен.

**Канон 2026 (RAG):** https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale — «Steps 11 and 12 are designed for text. Step 11 is designed for low-contrast text. Step 12 is designed for high-contrast text»; «Step 10 is designed for component hover states, where step 9 is the component's normal state background». Гарантия Radix — таргеты по APCA против фоновых шагов 1–2, при этом 11 и 12 — РАЗНЫЕ таргеты (низкий/высокий), а не два имени одного цвета.


### 13. [Major] Cap гауссианы `min(1.2, …)` позволяет шагам 6–8 превысить chroma seed'а → шаг 9 перестаёт быть самым насыщенным шагом шкалы (прямое нарушение формы Radix)

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/colors/src/scale.ts`

**План/research предписывает:** R-12 §4 (R-12_P2-css-colors.md:91): «9 **solid** (максимальная chroma, шаг = seed)». R-04 §«Генерация палитр из seed» (R-04_tailwind4-css-native.md:46): «12-шаговая тональная кривая (hue стабилен, chroma сжата на краях)» — chroma должна СЖИМАТЬСЯ к краям, а не разгоняться выше seed'а.

**Код делает:** scale.ts:225 `let c = c9 * Math.min(1.2, gaussianWeight(l, mu) / g9)` (и scale.ts:232 для шага 10) — множитель ограничен сверху 1.2, т.е. явно РАЗРЕШЁН рост chroma до 120 % от chroma seed'а на шагах, чей lightness ближе к пику гауссианы μ (0.60 light / 0.66 dark), чем сам seed. Проверено запуском: seed `oklch(0.3 0.1 260)`, light → шаг 7 C=0.120, шаг 8 C=0.120 при шаге 9 (seed) C=0.100; seed `#0a0a23`, dark → шаги 3–8 C=0.0611 при шаге 9 C=0.0509. Инварианта «c9 = max по шкале» нет ни в scale.ts, ни в scale.test.ts.

**Где это видно потребителю:** Бренд с тёмным насыщенным seed (тёмно-синий `oklch(0.3 0.1 260)`): рамка/бордер (шаг 8) и hover-бордер выходят ЯРЧЕ и «цветнее» самой solid-кнопки бренда (шаг 9) — визуально фирменный цвет выглядит выцветшим относительно окружающих его элементов той же шкалы. Потребитель, который берёт шкалу как «форму Radix», получает шкалу, где «чистейший» шаг не 9.

**Канон 2026 (RAG):** https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale — «Step 9 has the highest chroma of all steps in the scale. In other words, it's the purest step, the step mixed with the least amount of white or black.»


### 14. [Major] Нет проверки seed'а относительно якоря L₁: seed темнее 0.188 (dark) / светлее 0.993 (light) инвертирует и схлопывает шкалу — при этом план утверждает, что монотонность гарантирована «при любом seed»

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/colors/src/scale.ts`

**План/research предписывает:** P2.md:313-318: «`L₁ = 0.993` (light) / `0.188` (dark); шаги 1–9 — интерполяция `Lᵢ = L₁ + (L₉ − L₁) · tᵢ` … **Монотонность 1→9 гарантирована конструкцией при любом seed**. Шаг 10 (hover solid): `L₁₀ = L₉ − 0.045` (light) / `L₉ + 0.045` (dark)». Тест-инвариант P2.md:347: «lightness строго монотонна на шагах 1→10 (убывает light / растёт dark)». R-12 §4: шаги 1–2 — фоны, 6–8 — бордеры (т.е. должны быть различимы).

**Код делает:** scale.ts:222-233 — интерполяция от `l1` к `l9` без какой-либо валидации взаимного расположения `l1` и `l9`, плюс `l10 = l9 + step10Delta` (для dark `+0.045`). Утверждение плана верно только по модулю: НАПРАВЛЕНИЕ монотонности определяется знаком (l9 − l1). Проверено запуском: seed `#0a0a23` (тёмно-синий бренд, L₉ = 0.163 < L₁ = 0.188), appearance `dark` → шаги 1..9 идут L = 0.1880 → 0.1629 (УБЫВАЮТ, хотя тест ждёт рост), весь диапазон 9 шагов — ΔL = 0.025 (`#121318`, `#11121c`, `#0e0e2d`, `#0e0d2d`, `#0e0d2c`, `#0d0d2c`, `#0c0c2b`, `#0c0b29`, `#0a0a23` — визуально один цвет), а шаг 10 (hover solid, L=0.2079 `#131333`) оказывается СВЕТЛЕЕ шага 1 «App background». Такого seed'а нет в тестовом наборе (P2.md:341-343: 8 хроматических L=0.55 + 4 edge-case), поэтому собственный инвариант-тест на монотонность его не ловит — он бы упал.

**Где это видно потребителю:** Тенант/пилот с тёмным брендовым seed (`#0a0a23`, `#0b1020` — типичный «корпоративный navy») запрашивает тёмную шкалу: фон приложения, фоны UI-элементов, бордеры (шаги 6–8) и solid (шаг 9) получаются одним near-black — бордеры и границы карточек невидимы, hover-solid светлее фона страницы. Ошибки/варнинга нет — `generateScale` молча отдаёт такую шкалу.

**Канон 2026 (RAG):** https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale — шаги 1–2 «App background / Subtle background», 6–8 — «Subtle borders / UI element border / Hovered UI element border»: роли предполагают различимые ступени, а не 9 шагов внутри ΔL 0.025.


### 15. [Major] Полупрозрачный bg безусловно композитится на БЕЛУЮ подложку — в тёмных темах гейт считает контраст против фона, которого не существует

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/colors/src/contrast.ts`

**План/research предписывает:** Ни план (P2.md:166-209, публичный контракт `contrastAPCA(fg, bg)`), ни R-12 §3 (описывает API apca-w3: `alphaBlend`, `sRGBtoY`, `APCAcontrast`) не вводят подложку по умолчанию; R-12 §3 фиксирует лишь знаковость Lc и пороги. Правило «bg с альфой → на белое» — необъявленное поведенческое решение, принятое в коде.

**Код делает:** contrast.ts:77-89 `flattenAlpha`: `const WHITE = [1,1,1]` → `compositeOver(bgSrgb.coords, bgSrgb.alpha ?? 1, WHITE)` — белая подложка зашита безусловно, независимо от темы. Проверено запуском: `contrastAPCA('#fff','oklch(0.2 0 0)')` = −107.0, а `contrastAPCA('#fff','oklch(0.2 0 0 / 0.6)')` = −78.3 (и дальше падает с ростом прозрачности), хотя на реальной тёмной странице такой полупрозрачный слой лежит на почти чёрном фоне и контраст практически не меняется.

**Где это видно потребителю:** D15-гейт публикации тенант-темы (`checkContrast` из `gen-tokens.mjs`/CLI `themeon check`): тёмная тема с полупрозрачным elevated-фоном (`--color-bg-elevated: oklch(0.22 0 0 / 0.55)`) и белым текстом получает заниженный |Lc| и ложно ПРОВАЛИВАЕТ гейт (`pass: false`, файл не пишется) — валидная тема не публикуется, а причина в невидимой белой подложке.


### 16. [Major] Документированный рецепт соседства с Tailwind v4 ставит ВСЕ слои themeon НИЖЕ Tailwind Preflight — h1..h4 и .btn ломаются у любого, кто последует README

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/css/README.md:100-113`

**План/research предписывает:** R-12 §5 (plans/2026.07.12-BASE/20_research/R-12_P2-css-colors.md:~150): «Порядок layers фиксируется первым упоминанием → пакет обязан шипить декларацию порядка первым statement'ом entry-CSS; потребитель, использующий и ThemeOn и Tailwind, УПРАВЛЯЕТ СТАРШИНСТВОМ порядком своих @import/@layer-деклараций». Research НЕ говорит, в какую сторону — но и не проверял, что произойдёт. План P2.7 Code Guidance (phases/P2.md:~1050) прямо предписал: «рецепт соседства с Tailwind v4 (наш layers-statement ДО Tailwind-импорта)». P-D21 (plan.md:183) добавляет: «коллизии у потребителя решает D8 + рецепт @import … layer()». D8 (00_MASTER_PLAN.md:208): «CSS потребителя вне layers всегда сильнее; ноль !important».

**Код делает:** packages/css/README.md:104-113 — «Both systems' layer orders can coexist … as long as ThemeOn's layer-order statement is declared **before** Tailwind's `@import "tailwindcss"` … mixing unrelated layer names (`themeon.*` vs Tailwind's unprefixed names) **does not create a specificity conflict either way**» + блок:
```css
@import "@themeon/css/layers.css"; /* declares the themeon.* order first */
@import "tailwindcss";
@import "@themeon/css/tokens.css";
@import "@themeon/css/index.css";
```
При этом packages/css/src/layers.css:2-3 объявляет `@layer themeon.tokens, …, themeon.utilities;` — т.е. ВСЕ 7 имён themeon регистрируются ПЕРВЫМИ, а имена Tailwind (`theme, base, components, utilities`) — ПОСЛЕ. В каскаде слоёв побеждает ПОСЛЕДНИЙ объявленный слой, значит Tailwind `base` (Preflight) > themeon.utilities > … > themeon.base > themeon.reset. Утверждение README «does not create a specificity conflict either way» ложно: конфликт разрешается детерминированно и НЕ в пользу ThemeOn.

**Где это видно потребителю:** Потребитель ThemeOn+Tailwind копирует рецепт из README дословно. Результат: (1) Preflight `h1..h6 {font-size: inherit; font-weight: inherit}` из слоя `base` перебивает `@layer themeon.base { h1 { font-size: var(--text-4xl, 2.5rem) } }` (packages/css/src/_base-body.css:23) — ВСЕ заголовки схлопываются в 1rem/normal, типографика пакета мертва; (2) Preflight `button { background-color: transparent }` перебивает `@layer themeon.components { :where(.btn) { background: var(--btn-bg) } }` (packages/css/src/components/btn.css:20) — `<button class="btn">` становится прозрачной кнопкой без фона; (3) обещание D8 «ноль !important» не работает: пользователь НЕ может починить это своим layered-CSS и вынужден либо !important, либо переворачивать порядок импортов вопреки README. Правильный порядок для этого рецепта — Tailwind ПЕРВЫМ (или как минимум `@layer theme, base, components, themeon.tokens, …, utilities`), а README и P2.7 предписывают обратное.

**Канон 2026 (RAG):** Verified RAG (perplexity, 2026-07-14): Tailwind v4 `@import "tailwindcss"` разворачивается в `@layer theme, base, components, utilities;` + `@import "tailwindcss/preflight.css" layer(base)`; Preflight живёт в слое `base` и содержит `h1,h2,h3,h4,h5,h6 { font-size: inherit; font-weight: inherit; }` (докой v4 заявлено «all heading elements are unstyled») и `button,[type='button'],[type='reset'],[type='submit'] { background-color: transparent; background-image: none; }`. Источники: https://tailwindcss.com/docs/preflight, https://tailwindcss.com/docs/styling-with-utilities#using-cascade-layers, https://github.com/tailwindlabs/tailwindcss/discussions/16109.


### 17. [Major] `matchMedia` (и `document`) не client-гейтятся — `init()` бросает там, где `localStorage` аккуратно защищён; `initialized=true` выставлен ДО броска, поэтому повтор — молчаливый no-op

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/vue/src/state.ts`

**План/research предписывает:** R-13 §2.3 (`plans/2026.07.12-BASE/20_research/R-13_P3-vue-nuxt-vite.md:90-91`): «`matchMedia`/`localStorage` в composable гейтить `import.meta.client` / `onMounted` (на сервере их нет)». План — `phases/P3.md:16` инвариант фазы №3: «`matchMedia`/`localStorage` гейтить `import.meta.client`/`onMounted`/`typeof window`»; `phases/P3.md:81` (P3.1 Implementation Rule 3): «Никаких прямых обращений к `document`/`localStorage`/`window` вне client-гейта. Гейт — `typeof document !== 'undefined'`».

**Код делает:** Из трёх глобалов защищён ровно один. `packages/vue/src/state.ts:70-81` — `getStorage` по умолчанию: `try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }`. Но `packages/vue/src/state.ts:82` — `const getMedia = options.media ?? ((query: string) => matchMedia(query))` — ни `typeof`-проверки, ни `try/catch`; и `packages/vue/src/state.ts:69` — `const getTarget = options.target ?? (() => document.documentElement)` — то же. Вызов: `packages/vue/src/state.ts:196` — `const media = getMedia('(prefers-color-scheme: dark)')`, причём флаг `initialized = true` выставлен строкой раньше (`state.ts:180`), ДО первого обращения к `matchMedia`.

**Где это видно потребителю:** Потребитель `@themeon/vue` пишет обычный компонентный тест: vitest `environment: 'jsdom'`, `mount(App, { global: { plugins: [themeonPlugin] } })`, компонент зовёт `init()` в `onMounted` (ровно как в JSDoc `use-theme.ts:32-33`). Тест падает `TypeError: matchMedia is not a function` — при том что `localStorage` в том же коде заботливо обёрнут в try/catch. Хуже второй эффект: `initialized` уже `true`, поэтому даже если потребитель добавит matchMedia-шим и вызовет `init()` повторно (или это сделает Nuxt-рантайм-плагин после ошибки в другом плагине), второй вызов молча выйдет по `if (initialized) return` — тема НИКОГДА не применится, атрибут `data-theme` не выставится, и ошибка выглядит как «пакет не работает», а не как «нужен шим». Симметричный случай: любой SSR-путь, где `init()`/`set()` вызван не под `import.meta.client` (например, потребитель дёрнул `set()` в серверном компоненте), даёт `ReferenceError: matchMedia is not defined` / `document is not defined` вместо безобидного no-op, хотя инвариант фазы №2 обещает SSR-нейтральность.

**Канон 2026 (RAG):** jsdom по-прежнему НЕ реализует `window.matchMedia` — README jsdom, раздел «Unimplemented parts of the web platform» (https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform) + открытый апстрим-issue «Implement Window matchMedia()»; каноничный обходной путь в Vitest/Jest — руками объявлять `Object.defineProperty(window,'matchMedia',…)` в setup-файле (https://vitest.dev/guide/environment). Т.е. `TypeError: matchMedia is not a function` в jsdom-окружении — не экзотика, а дефолт.


### 18. [Major] HMR токенов мёртв: `css-update` для virtual-модуля — молчаливый no-op в клиенте Vite (нужен `js-update`, как у UnoCSS)

**Файл:** `packages/vite/src/index.ts`

**План/research предписывает:** R-13 §4.3 (`plans/2026.07.12-BASE/20_research/R-13_P3-vue-nuxt-vite.md:260-262`) сам выписал факт и сделал из него ОБРАТНЫЙ вывод: «UnoCSS шлёт `js-update`, т.к. CSS импортится как JS-модуль; для чистого `.css`-virtual корректнее `css-update`». Этот вывод закреплён в R-13 §4.2 (строки 237-249), §6.4 (строка 303-306), P-D26 (`plan.md:188`: «`this.environment.hot.send({type:'update',updates:[{type:'css-update',…}]})`») и в ТЗ P3.5 Implementation Rule 3 (`phases/P3.md`, Code Guidance строки 229-238).

**Код делает:** `packages/vite/src/index.ts:58-75` — `hotUpdate({file})`: `this.environment.hot.send({ type: 'update', updates: [{ type: 'css-update', path: mod.url, acceptedPath: mod.url, timestamp: Date.now() }] })` и `return []`. `mod.url` виртуального модуля = `/@id/__x00__virtual:themeon.css`.

**Где это видно потребителю:** Laravel/plain-проект по README: правит `theme.config.ts` из `tokensFiles` при `vite dev`. Плагин инвалидирует модуль и шлёт `css-update` с `path: '/@id/__x00__virtual:themeon.css'`. В DOM нет `<link>` с таким href (виртуальный CSS живёт в `<style data-vite-dev-id>`), клиент делает `return` — НИЧЕГО не происходит. При этом `return []` из `hotUpdate` подавляет и дефолтную обработку Vite (full-reload тоже не будет). Итог: тема не обновляется до ручного F5 — ровно тот «мёртвый HMR», против которого затевался D13. Юнит-тесты (`packages/vite/src/index.test.ts:91-107`) это не ловят: они ассертят, что плагин ОТПРАВИЛ `css-update` в мок, т.е. проверяют реализацию, а не эффект; живого смока `@themeon/vite` в фазе не было (P3.6 гоняла только Nuxt-playground).

**Канон 2026 (RAG):** Клиент Vite 8.1.4 (ground-truth в репо: `node_modules/.pnpm/vite@8.1.4_.../node_modules/vite/dist/client/client.mjs:967-971`) обрабатывает НЕ-`js-update` так: `const el = Array.from(document.querySelectorAll("link")).find(e => !outdatedLinkTags.has(e) && cleanUrl(e.href).includes(searchUrl)); if (!el) return;` — т.е. `css-update` умеет ТОЛЬКО подменять `<link rel=stylesheet>`. Исходник с комментарием «// css-update // this is only sent when a css file referenced with <link> is updated»: https://github.com/vitejs/vite/blob/main/packages/vite/src/client/client.ts (зеркало https://fossies.org/linux/vite/packages/vite/src/client/client.ts). CSS, пришедший из JS-графа (а virtual-модуль — всегда он), в dev инжектится как `<style data-vite-dev-id>` и обновляется только через `js-update` → re-import модуля → `updateStyle()`. Поэтому UnoCSS шлёт `js-update` (https://unocss.dev/integrations/vite, `packages-integrations/vite/src/modes/global/dev.ts`). Хук: https://vite.dev/changes/hotupdate-hook


### 19. [Major] D13 dev-watcher регенерирует БАЙТ-В-БАЙТ тот же CSS: `importModule` — это нативный `import()`, ESM-кэш, никакого «fresh jiti instance»

**Файл:** `packages/nuxt/src/module.ts`

**План/research предписывает:** D13 (`00_MASTER_PLAN.md:213`) и ТЗ P3.4 (`phases/P3.md`, Implementation Rule 3 + Why) обещают «конструктивный фикс класса `SOURCE_REL`-бага»: watcher по хэшу директории + `updateTemplates` → «Vite подхватывает HMR CSS» (R-13 §3.4, строки 177-189). Смысл item'а — чтобы правка файла темы в dev меняла CSS.

**Код делает:** `packages/nuxt/src/module.ts:87-102` — комментарий утверждает: «Перечитывает файл темы с диска при каждом вызове (fresh `importModule` → fresh jiti instance, без переиспользования закэшированного модуля) — иначе… dev-watcher (D13) перезаписывал бы tokens.css БАЙТ-В-БАЙТ тем же контентом… (P3.4 code-review HIGH: token HMR мёртв)». Реально: `const themeModule = await importModule<ThemeModuleExports>(themePath)` — БЕЗ cache-busting; `getContents` (строки 111-120) зовёт `loadTheme()` на каждый `updateTemplates`.

**Где это видно потребителю:** `nuxt dev`, в `nuxt.config` задан `themeon.theme: './theme.config.ts'`. Пользователь меняет цвет в теме и сохраняет → `builder:watch` срабатывает → `hashDir` даёт новый хэш → `updateTemplates({filter})` вызывает `getContents()` → `loadTheme()` возвращает ТОТ ЖЕ закэшированный объект модуля (URL не менялся) → `.nuxt/themeon-tokens.css` перезаписывается идентичным содержимым → в браузере ничего не меняется до перезапуска dev-сервера. Это ровно `SOURCE_REL`-класс дефекта, который D13 объявлен закрывшим. Ни один тест это не покрывает (`module.test.ts` тестирует только чистые хелперы), а живой смок P3.6 codegen НЕ трогал: `apps/playground/nuxt.config.ts` не задаёт `theme` — ветка `if (options.theme)` вообще ни разу не исполнялась на живом Nuxt.

**Канон 2026 (RAG):** `@nuxt/kit` 4.4.8 (ground truth в репо: `node_modules/.pnpm/@nuxt+kit@4.4.8_.../node_modules/@nuxt/kit/dist/index.mjs:452-454`): `async function importModule(id, opts) { return await import(pathToFileURL(resolveModule(id, opts)).href).then(...) }` — это НАТИВНЫЙ динамический `import()` без query-суффикса, никакого jiti. Node кэширует ESM-модули по URL навсегда, `require.cache`-трюки к `import` неприменимы (https://nodejs.org/api/esm.html). Единственный рабочий приём — импорт нового специфера (`?v=<counter>`/mtime), что и предписывает канон Nuxt-модуля для `builder:watch` + `updateTemplates` (https://nuxt.com/docs/3.x/guide/modules/recipes-advanced).


### 20. [Major] `hashDir` обходит директорию без ignore-списка, а дефолтный `tokensDir = dirname(theme)` легко оказывается rootDir → синхронный sha256 всего проекта (включая node_modules) на каждое сохранение файла в dev

**Файл:** `packages/nuxt/src/internal/hash-dir.ts`

**План/research предписывает:** R-13 §3.4 (строки 177-189) и ТЗ P3.4 Implementation Rule 3/4 (`phases/P3.md`) описывают watcher как «хэш ДИРЕКТОРИИ токенов» и задают `hashDir` без каких-либо исключений: «Игнорировать несуществующую директорию… Не следовать за symlink наружу» — про node_modules/.git/.output/buildDir ни research, ни план не думали, молча предполагая выделенную маленькую директорию токенов.

**Код делает:** `packages/nuxt/src/module.ts:130` — `const tokensDir = options.tokensDir ? await resolvePath(options.tokensDir) : dirname(themePath)`; `module.ts:136-149` — на КАЖДОЕ `builder:watch`-событие: `if (!abs.startsWith(tokensDir)) return; const nextHash = hashDir(tokensDir)`. `packages/nuxt/src/internal/hash-dir.ts:18-48` — `walk()` рекурсивно `readdirSync` + `readFileSync` ВСЕГО содержимого, синхронно, без единого фильтра.

**Где это видно потребителю:** Типовое размещение темы — в корне проекта (`themeon: { theme: './theme.config.ts' }`; ровно такую форму пути показывает и README `@themeon/vite`). Тогда `tokensDir = dirname(themePath) = rootDir`, а `nuxt.options.watch.push(rootDir)`. Дальше: (1) фильтр `abs.startsWith(tokensDir)` пропускает ЛЮБОЕ событие (любой `.vue`-файл в `app/`); (2) на каждое сохранение файла запускается синхронный рекурсивный обход и sha256 всего rootDir — включая `node_modules` (сотни МБ) и `.git`. Dev-сервер замирает на секунды-десятки секунд при каждом сохранении. Отдельный побочный эффект: `nuxt.options.watch` = rootDir заставляет parcel-watcher (дефолт Nuxt 4) подписаться на весь корень (`resolvePathsToWatch(..., {parentDirectories:true})` вытесняет более узкие `app`/`server`-пути). Дефолт `tokensDir` обязан быть либо запрещён для rootDir, либо `hashDir` — иметь ignore-список (node_modules/.git/буилддир), либо оба.

**Канон 2026 (RAG):** Nuxt 4.4.8 (ground truth: `node_modules/.pnpm/nuxt@4.4.8_.../node_modules/nuxt/dist/index.mjs:8620-8654, 8797-8822`) действительно добавляет пути из `nuxt.options.watch` во все три реализации watcher'а и эмитит `builder:watch` для них (т.е. регистрация из R-13 §3.4 верна) — а сам Nuxt везде исключает `node_modules`/`buildDir` через `isIgnored` (`ignored: [isIgnored, /[\\/]node_modules[\\/]/]`). Референс дизайна watcher'а: https://nuxt.com/docs/4.x/guide/modules/recipes-advanced


### 21. [Major] Деривация `*Hover/*Pressed/*Suppl` фиксированными ±L-дельтами вместо соседних ступеней собственной 12-step шкалы: pressed сливается с hover, направление suppl противоречит Naive

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/naive/src/color.ts`

**План/research предписывает:** R-14 §1.3 (`R-14_P4-naive-tailwind-cli.md:66-69`): «Безопасная стратегия адаптера: НЕ полагаться на seemly-деривацию — **вычислять `*Hover/*Pressed/*Suppl` из наших шкал (`@themeon/colors`, соседние ступени 12-step)** и подавать все 4 варианта явными hex/rgba». P-D29 (`plan.md:190`) переписал это на «OKLCH-lightness-сдвиг, дельты hover +0.06 / suppl +0.10 / pressed −0.06», не отметив, что источником перестала быть шкала темы, и не проверив совместимость направления сдвигов с реальной шкалой `@themeon/colors` (Radix-форма).

**Код делает:** `color.ts:8-10` `HOVER_DELTA = 0.06 / SUPPL_DELTA = 0.1 / PRESSED_DELTA = -0.06` (hover и suppl всегда СВЕТЛЕЕ, pressed темнее) + `deriveInteractionStates` (`color.ts:40-59`) — шкала темы не читается вообще. На дефолт-теме проекта (light, inline-резолв) это даёт: `primaryColor #008a48` (OKLCH L 0.5553), `primaryColorHover` из темы = `--color-action-primary-hover` = accent-10 = `#007a40` (L 0.5082 — Radix step 10 в light ТЕМНЕЕ step 9), а derived `primaryColorPressed = #007837` (L 0.5009). Разница hover/pressed по L — 0.007.

**Где это видно потребителю:** Дефолт-тема `@themeon/css` + любой пилот: solid primary-кнопка в light — hover `#007a40` и pressed `#007837` визуально неразличимы (ΔL 0.007), нажатие не даёт никакой обратной связи; при этом derived suppl уезжает в другую сторону (`#39a965`, L 0.6547), т.е. три «состояния» одного акцента расходятся по разным направлениям вместо согласованных ступеней шкалы. Для статусных ролей (`--color-status-*`), где тема обычно НЕ задаёт hover, derived hover (светлее) и мапнутый primary-hover (темнее) дают несогласованное поведение между primary и success/warning/error в одном UI.

**Канон 2026 (RAG):** naive-ui 2.44.1 stock dark common (`es/_styles/common/dark.mjs`): `primaryColor '#63e2b7'`, `primaryColorSuppl 'rgba(42, 148, 125, 1)'` — suppl в тёмной теме ТЕМНЕЕ основного, тогда как адаптер всегда светлит на +0.10 L. Док: https://www.naiveui.com/en-US/os-theme/docs/customize-theme; https://github.com/tusen-ai/naive-ui/blob/main/src/_styles/common/dark.ts


### 22. [Major] `themeon check` гоняет все contrast-пары как `usage:'body'` (порог |Lc| 75), а собственный гейт `@themeon/css` — как `'text'` (60): дефолтная тема пакета ПРОВАЛИВАЕТ свой же линтер (exit 1)

**Файл:** `packages/cli/src/checks/contrast.ts:14-18`

**План/research предписывает:** R-14 §3.3: «`Math.abs(Lc)` против порога (≥60 для body, ≥75 для мелкого — как в P2.7 гейте)»; P4.5 Code Guidance (phases/P4.md) прямо задаёт эталон вывода: «dark-тема, `on-primary`/`action-primary` дают `|Lc| 58 < 60` → error» — т.е. порог для этих пар = 60. Реальный гейт P2.7 (`packages/css/scripts/gen-tokens.mjs:39-53`) для `textMuted` и `onPrimary/action.primary` использует `usage: 'text'` (LC_THRESHOLDS.text = 60), `'body'` (75) — только для `text/bg.page`.

**Код делает:** contrast.ts:14-18 — `CONTRAST_PAIRS = [{fg:'--color-text', bg:'--color-bg-page', usage:'body'}, {fg:'--color-text-muted', bg:'--color-bg-subtle', usage:'body'}, {fg:'--color-on-primary', bg:'--color-action-primary', usage:'body'}]` — все три `'body'` → порог 75 (packages/colors/src/contrast.ts:33-38 `LC_THRESHOLDS.body = 75`). Прогон `checkContractPairs(resolveTheme(defaultTheme,{refLayer:'inline'}))` на РЕАЛЬНОЙ дефолт-теме `@themeon/css` даёт: `{level:'error', rule:'contrast', message:'APCA 68.0 < 75 for text.muted on bg.subtle (theme dark)'}`. Базовые пары проходят на грани: on-primary |Lc| 75.7, text.muted/bg.subtle 75.3. При этом `packages/css/src/theme/default.ts` в комментарии фиксирует, что onPrimary подбирался под порог 60 («|Lc| 58.7 < 60 на грани провала гейта»).

**Где это видно потребителю:** Пользователь ставит пакет, берёт дефолтную тему `@themeon/css` (или скаффолд `themeon init`, чья dark-тема тоже не тюнилась под 75) и запускает `themeon check` — CLI печатает `[contrast] APCA 68.0 < 75 for text.muted on bg.subtle (theme dark)` и падает с exit 1 на теме, которую сам же пакет собрал и провёл через свой APCA-гейт. «Качество как фича» (§4.10 master) даёт красный на собственном дефолте в CI потребителя.

**Канон 2026 (RAG):** APCA Nutshell-уровни (body 75 / text 60 / large 45) сами по себе корректно закодированы в `@themeon/colors` — расхождение внутреннее: линтер CLI классифицирует те же пары строже, чем гейт, которым тема валидировалась при генерации.


### 23. [Major] Скан не исключает СГЕНЕРИРОВАННЫЕ файлы (`--out`-tokens и bridge.css): unused-половина token-coverage глохнет, hardcode сыпет ложными warning'ами на собственный вывод

**Файл:** `packages/cli/src/commands/check.ts:31-32, packages/cli/src/checks/hardcode.ts:22`

**План/research предписывает:** P4.5 Implementation Rules 3-4 (phases/P4.md): «**Исключать из скана**: сам `tokens.css` (по имени/пути), файл-конфиг темы (`*.config.ts`/`opts.config`), `node_modules`, `dist`» и «`tinyglobby glob(patterns, { cwd, ignore: ['**/node_modules/**','**/dist/**', <tokens.css>, <config>] })`». R-14 §3.3: «Исключать сам `tokens.css` и файл-конфиг темы из скана (там литералы легитимны)».

**Код делает:** check.ts:32 — `DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**']` (ни `<tokens.css>`, ни `<config>`); реальный путь вывода (`--out`, `--tailwind`) в `runCheck` вообще не передаётся. Исключение делается post-hoc и только в hardcode: hardcode.ts:22 `EXCLUDE_FILE_RE = /(^|\/)tokens\.css$|\.config\.ts$/` — по ЗАХАРДКОЖЕННОМУ имени файла. `checkCoverage` не исключает ничего. Эмпирика (`runInit`+`runBuild`+`runCheck` на скаффолде): (а) `--out src/styles/theme.css` → 8 warning'ов `hardcoded color literal oklch(...) src/styles/theme.css:5..19` — линтер ругается на файл, который сам же и сгенерировал; (б) при `--tailwind src/styles/bridge.css` bridge.css попадает в скан, а он состоит из `--x: var(--x)` по каждому токену → множество B поглощает всё множество A → «unused token»-warning'ов стало 0 (в том же проекте без bridge их было 7).

**Где это видно потребителю:** Проект, где tokens.css лежит не под именем `tokens.css` (`themeon build --out src/assets/theme.css` — легальный флаг), получает десятки ложных `hardcode`-warning'ов на собственный сгенерированный файл. А любой проект, который генерирует Tailwind-мост (штатный сценарий P4), полностью теряет вторую половину token-coverage: неиспользуемые токены больше не детектируются никогда, хотя именно они — половина заявленного в §4.10 master линтера.


### 24. [Minor] toDTCG не имеет канала warnings, хотя ТЗ P1.7 требует «legacy-строка + warning» на каждый непарсибельный цвет/именованную easing

**Файл:** `packages/core/src/dtcg/to-dtcg.ts`

**План/research предписывает:** P1.md:648 и :654 (таблица маппинга P1.7): «color | `parseColor(value)` → структурная форма + `hex`-fallback; **не спарсилось → legacy-строка + warning**»; «ease | cubicBezier | именованные (`ease-out`) → **legacy-строка + warning**». P-D11 (plan.md:173): «непарсибельное — legacy-строковая форма + warning».

**Код делает:** packages/core/src/dtcg/to-dtcg.ts:28-30 — `export interface DTCGExport { files: Record<string, DTCGDocument> }` (поля warnings нет); `toDTCGValue` (:94-126) на всех деградациях (`parseColor(value) ?? value`, `splitDimension(value) ?? value`, `splitCubicBezier(value) ?? value`) молча подставляет исходную строку. `toDTCG` (:159-221) не возвращает и не логирует ничего.

**Где это видно потребителю:** Тема с `ease: { out: 'ease-out' }` и `color: { brand: 'hsl(...)' }` экспортируется «успешно», но полученный `base.tokens.json` содержит невалидные для 2025.10 значения. Пользователь узнаёт об этом только от стороннего валидатора — пакет, чья заявленная фича «качество как фича» (master §4.10), сам деградацию не сигналит.

**Канон 2026 (RAG):** —


### 25. [Minor] themeon.resolver.json может получить modifier с ОДНИМ контекстом, что нарушает правило Resolver Module («modifier ≥ 2 contexts»)

**Файл:** `packages/core/src/dtcg/to-dtcg.ts`

**План/research предписывает:** R-11 §2 (R-11_P1-core-engine.md:70-72): «Правила: **modifier ≥ 2 contexts**; modifier не может ссылаться на modifier; `$ref` без циклов».

**Код делает:** packages/core/src/dtcg/to-dtcg.ts:206-217 — `if (!Object.hasOwn(def.themes, 'light')) contexts.light = []; for (const name of themeNames) contexts[name] = [{ $ref: … }]`. Если единственная тема называется `light`, пустой light-контекст не добавляется и `contexts` содержит ровно один ключ → `modifiers.theme` с одним контекстом.

**Где это видно потребителю:** `defineTheme({ base, themes: { light: {...} } })` (база — тёмная, единственная тема — светлая) → `themeon.resolver.json` с одноконтекстным modifier; Terrazzo, референс-реализация Resolver Module, такой файл отвергает. Кейс редкий, но эмит формально невалиден и ничем не сигналится.

**Канон 2026 (RAG):** —


### 26. [Minor] `.container` и `.cover` молча зависят от `box-sizing: border-box` из слоя reset, хотя `composition.css` контрактно самодостаточен

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/css/src/composition/container.css:8-12`

**План/research предписывает:** P2.4 Implementation Rules (phases/P2.md:~269): «каждый примитив — **самостоятельный файл, работающий при одиночном импорте `composition.css`**; никаких зависимостей от base/components». README (packages/css/README.md, таблица Entry files) продаёт `./composition.css` как отдельный публичный entry, а `exports` (packages/css/package.json:26) его отдельно экспортирует — сценарий «беру только примитивы» заявлен официально.

**Код делает:** `box-sizing` объявлен ровно в двух местах пакета (grep): `packages/css/src/_reset-body.css:13` (`*, *::before, *::after { box-sizing: border-box }`, слой themeon.reset) и `packages/css/src/composition/center.css:7` (`box-sizing: content-box` — осознанно, по канону EL Center). `container.css:8-12` (`max-inline-size: var(--container-max, 72rem); padding-inline: var(--container-pad, var(--spacing-md, 1rem))`) и `cover.css` (`min-block-size: var(--cover-min-height, 100svh); padding: var(--cover-pad, var(--spacing-md, 1rem))`) НЕ объявляют box-sizing вообще — их геометрия корректна только если где-то ещё подключён `reset.css`.

**Где это видно потребителю:** Потребитель делает ровно то, что разрешает ТЗ и README — `@import "@themeon/css/composition.css";` без `reset.css` (например, у него уже свой reset без универсального border-box, или он берёт только layout-слой в существующий проект). Тогда действует UA-дефолт `content-box`: `.container` занимает 72rem + 2×1rem паддинга = 74rem вместо обещанных 72rem (ломает вёрстку по сетке), а `.cover` получает `min-height: 100svh + 2rem` → на каждой «обложке» появляется постоянный вертикальный скроллбар, хотя весь смысл примитива — ровно один экран. `.center` от этого защищён явным `box-sizing`, `.container`/`.cover` — нет; тестов на этот сценарий нет (test/dist.test.ts проверяет только @layer/!important/fallback).


### 27. [Minor] `$theme` регистрируется в `globalProperties`, но `ComponentCustomProperties` не аугментирован — фича нерабочая в любом типизированном проекте

**Файл:** `/home/vostrikov/projects/packages/themeon/packages/vue/src/plugin.ts`

**План/research предписывает:** R-13 §2.4 (`R-13_P3-vue-nuxt-vite.md:94-97`): «`app.use(ThemeonPlugin, options)` → `install(app, options)`: `app.provide(themeKey, api)` + опц. `app.config.globalProperties.$theme`». План `phases/P3.md` (P3.2, Intent): «Vue-плагин `themeonPlugin` (… + опц. `$theme` globalProperty)»; эталонный код P3.2 Code Guidance содержит `app.config.globalProperties.$theme = api`.

**Код делает:** `packages/vue/src/plugin.ts:22` — `app.config.globalProperties.$theme = api`. При этом ни в одном файле `packages/vue/src/*` нет `declare module 'vue' { interface ComponentCustomProperties { $theme: UseThemeReturn } }` (grep по `ComponentCustomProperties` в `packages/vue/src` и `packages/nuxt/src` — 0 совпадений), и `packages/vue/src/index.ts` такой декларации не реэкспортирует.

**Где это видно потребителю:** Потребитель, следуя README/плану, пишет в шаблоне `<button @click="$theme.toggle()">{{ $theme.theme }}</button>`. Рантайм работает, но `vue-tsc --noEmit` / `nuxi typecheck` (стандартный CI-гейт Vue/Nuxt-проекта) падает: `Property '$theme' does not exist on type 'ComponentCustomProperties & …'`. Обойти можно только руками дописав аугментацию в своём проекте — то есть публично объявленная фича пакета из коробки непригодна в любом типизированном проекте, и об этом нигде не сказано.

**Канон 2026 (RAG):** Vue docs, TypeScript / Augmenting Global Properties: значения из `app.config.globalProperties` требуют аугментации интерфейса `ComponentCustomProperties` через `declare module 'vue'`, иначе TS и проверка типов шаблонов о свойстве не знают и выдают «Property does not exist» (https://vuejs.org/guide/typescript/options-api#augmenting-global-properties).


### 28. [Minor] Double-dash companion (`--text-2xl--line-height`): ТЗ требовало исключать, код включает, тест закрепляет включение, а Completion Notes и Update Log рапортуют «исключение double-dash companion» — сверки кода с планом не было

**Файл:** `packages/tailwind/src/bridge.ts:69-82 (+ phases/P4.md P4.1 Completion Notes)`

**План/research предписывает:** P4.1 Code Guidance (phases/P4.md): «чтобы не плодить мусор — **исключать companion-переменные с `--`-разделителем внутри имени**: если `varName` содержит `--` после первого символа (double-dash companion P1.3), пропустить. Задокументировать в Rule/тесте», и обязательный тест «(4) double-dash companion исключён».

**Код делает:** bridge.ts не содержит НИКАКОЙ проверки на double-dash: единственный фильтр — `filtered = [...names].filter((name) => matchNamespace(name, namespaces) !== null)` (bridge.ts:75), а `matchNamespace` матчит `--text-2xl--line-height` по префиксу `--text-`. bridge.test.ts:85-89 закрепляет ПРОТИВОПОЛОЖНОЕ: «double-dash line-height companion включён … expect(out).toContain('--text-2xl--line-height: var(--text-2xl--line-height);')». При этом Completion Notes P4.1 и Update Log (plan.md:252) утверждают: «`src/bridge.ts` (… исключение double-dash companion-переменных P1.3)». Known Deviations P4.1 (3 пункта) про это отклонение молчат.

**Где это видно потребителю:** Прямого сбоя нет (включение companion — правильное решение), но: (1) статус item'а и отчёт фазы описывают поведение, противоположное коду — следующий, кто будет чинить finding'и #1/#2 по этим Notes, будет исходить из ложной картины; (2) companion-переменные наследуют ту же циклическую самоссылку `--text-2xl--line-height: var(--text-2xl--line-height)` в `:root,:host`, т.е. попадают под сценарий finding #2.

**Канон 2026 (RAG):** Tailwind v4 действительно использует companion `--text-*--line-height` для сборки line-height в утилиту `text-*` (https://tailwindcss.com/docs/theme) — т.е. фактическое поведение кода (включать) полезнее, чем требование ТЗ (исключать); проблема в том, что решение приняли молча, зафиксировали в отчёте как обратное и не провели через Known Deviations.


## Отсеяно верификацией (9) — НЕ чинить без перепроверки

- **Канал breakpoints обходит naming engine: ключи `resolved.breakpoints` и имена `@custom-media` строятся сырым `join('-')`, а не `kebabSegment` — второй путь именования в пакете** (`packages/core/src/resolve.ts`)
  - опровергнуто: Цитаты приведены точно, но не предписывают того, что им приписывают. (1) P-D14 (plan.md:176) говорит про имена CSS-переменных: «ResolvedTheme несёт готовые varName→value … сериализатор и applier ничего не именуют сами», обоснование — паритет build/runtime и устранение класса «две копии kebab» (R-01 §1: дубль kebab() в runtime и codegen разошёлся на цифрах). Имя переменной брейкпоинта в коде именно
- **`checkContrast([])` возвращает `pass: true` — гейт, объявленный fail-closed, на пустом списке пар fail-open** (`/home/vostrikov/projects/packages/themeon/packages/colors/src/contrast.ts`)
  - опровергнуто: Neither the plan nor the research ever defines "fail-closed" as "empty batch must fail". Every occurrence (P2.md:140, P2.md:200, P4.md:1011/1029/1103 item (8), and the originating audit finding H3 in FINAL_AUDIT_2026-07-12.md:25) defines it exactly as: unparseable pair = throw, not skip; and a FAILING pair must block. R-12/R-14 contain zero statements about empty-input semantics (grep for «пуст|em
- **`.switcher` — половина канонического Every Layout Switcher: реализован только `threshold`, механика `limit` (quantity-query) выброшена** (`/home/vostrikov/projects/packages/themeon/packages/css/src/composition/switcher.css:7-15`)
  - опровергнуто: Код-цитата верна (switcher.css:7-15 — только threshold, grep nth-last-child/limit по src и dist = 0), но приписанное расхождение не существует ни на одном из трёх уровней. (1) План: P2.md:689-697 в разделе Code Guidance item'а P2.4 предписывает ровно этот CSS дословно — код совпадает с ТЗ побайтово; ничего «молча» не разошлось, примитив спроектирован и закрыт именно таким. (2) Research: R-12 §7 (с
- **`interpolate-size: allow-keywords` из research-списка «современных включений themeon.base» потерян по дороге research → план → код** (`/home/vostrikov/projects/packages/themeon/packages/css/src/_base-body.css:12-40`)
  - опровергнуто: Research quote is accurate (R-12_P2-css-colors.md:132-134 does list `interpolate-size: allow-keywords` among "современные включения для themeon.base"), but the finding fails on both the plan level and the canon level.

PLAN (level 2) — the finder skipped it. phases/P2.md:456-500 does not just say "reset per R-12 §6"; it materializes the LITERAL enumerated composition of reset.css ("эталон (адаптир
- **Бургер-меню работает только при наличии `.page-shell` в предках; без него мобильная навигация исчезает молча и без фолбэка** (`/home/vostrikov/projects/packages/themeon/packages/css/src/blueprints/header.css:54-62`)
  - опровергнуто: Coupling is real but the attributed harm is not. header.css:29-31 hides .nav-burger by default and only header.css:54-62 (@container page (inline-size < 48rem)) reveals it; the `page` container is declared solely in page-shell.css:13, so without a .page-shell ancestor the burger indeed never appears, and there is no @media/@supports/:has() fallback anywhere in packages/css/src. HOWEVER: the claim 
- **`storageKey: null` (персист выключен) невыразим в `themeInitScript` — два канала расходятся ровно тем способом, который P3.8 объявляет невозможным** (`/home/vostrikov/projects/packages/themeon/packages/vue/src/anti-fouc.ts`)
  - опровергнуто: Evidence misattributed on all three levels. (1) Research: R-13 §2.1 (R-13_P3-vue-nuxt-vite.md:36-70) documents VueUse `useColorMode`'s COMPOSABLE options as "референс формы return-типа" (§2.2) — and that contract IS honored: `packages/vue/src/types.ts:35` declares `storageKey?: string | null` and `state.ts:64/161/183` gates both read and write on `storageKey !== null` (tested: use-theme.test.ts:15
- **Набор `themes` и системный маппинг `system`/`darkTheme`/`lightTheme` никак не связаны: системная ветка резолвится в тему, которой нет в наборе, и НИ ОДИН канал не предупреждает** (`/home/vostrikov/projects/packages/themeon/packages/vue/src/state.ts`)
  - опровергнуто: Refuted on all three legs.

(1) RESEARCH DOES NOT PRESCRIBE IT. R-13 §2.1 does quote VueUse's `modes?: Partial<Record<T | BasicColorSchema, string>>`, but the very next section of the same file frames it as a shape reference, not an obligation: §2.2 "VueUse форма — только референс"; §6.2 "свой `useTheme()` ~80 LOC … VueUse `useColorMode` только референс формы". §6.5's invariant list ("N тем; persi
- **Singleton-fallback молча форкает ВТОРОЕ состояние с ДЕФОЛТНЫМИ опциями, даже когда плагин установлен — два владельца записи в DOM (нарушен инвариант фазы №1)** (`/home/vostrikov/projects/packages/themeon/packages/vue/src/use-theme.ts`)
  - опровергнуто: Механизм в коде описан верно (use-theme.ts:39-53 — inject только под hasInjectionContext(), нет ветки «провайдер есть, контекст потерян», dev-warn одноразовый), НО единственный пользовательский сценарий находки ложен. Утверждение «top-level await в Nuxt-компоненте теряет инжекционный контекст» неверно: SFC-компилятор Vue оборачивает top-level await в withAsyncContext(), восстанавливая currentInsta
- **`cssBridge()` из контракта адаптера (D10) не реализован и не объявлен отклонением — адаптер отдаёт только одну из двух обязательных сериализаций** (`/home/vostrikov/projects/packages/themeon/packages/naive/src/index.ts`)
  - опровергнуто: Literal facts check out (no `cssBridge` anywhere in packages/naive; index.ts exports only the 5 functions; P4.2 Known Deviations is "—"), but the impact chain is refuted by code elsewhere. The declared signature `cssBridge?(theme: ResolvedTheme): string` is a pure function of ResolvedTheme, and that serialization already exists as first-class core API: `packages/core/src/serialize.ts` `serializeTh
