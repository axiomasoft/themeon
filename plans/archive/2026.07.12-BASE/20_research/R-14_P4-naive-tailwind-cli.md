# R-14 — P4 углублённый research: `@themeon/naive` + `@themeon/tailwind` + CLI `themeon`

> Фаза P4 (L3-адаптеры + L4 CLI). Точечное углубление поверх R-05 (ui-library-adapters) и
> R-07 (landscape). R-01..R-13 не переделываются. Дата research: **2026-07-13**.
>
> **Метод-отклонение (как в R-12/R-13):** perplexity-web MCP недоступен в этой сессии —
> research выполнен через WebSearch + WebFetch + `npm view` (ground-truth registry, паттерн
> P-D10). Пины версий — живой registry `dist-tags.latest`, дата публикации приведена.

---

## 0. Пины версий (ground truth `npm view <pkg> dist-tags.latest`, 2026-07-13)

| Пакет | latest | Опубликован | Роль в P4 |
|---|---|---|---|
| `naive-ui` | **2.44.1** | 2026-03-08 | peer адаптера `@themeon/naive` (не двигался с R-05; см. §1) |
| `tailwindcss` | **4.3.2** | 2026-06-29 | целевой Tailwind для `@themeon/tailwind` (peer/dev) |
| `@tailwindcss/vite` | **4.3.2** | 2026-06-29 | интеграция v4 (если нужен смок-прогон бриджа) |
| `citty` | **0.2.2** | 2026-04-01 | кандидат CLI-каркаса (unjs, `defineCommand`) |
| `commander` | **15.0.0** | 2026-05-29 | альтернативный CLI-каркас (стабильный, 1.0+) |
| `cac` | 7.0.0 | 2026-02-27 | второй альтернативный CLI (легковес, VoidZero-adjacent) |
| `jiti` | **2.7.0** | 2026-05-05 | загрузка TS-конфига темы в CLI/бридже (уже паттерн P3 nuxt-codegen) |
| `tinyglobby` | **0.2.17** | 2026-05-30 | glob-скан файлов для `themeon check` (voidzero/tsdown-стек) |
| `colorjs.io` | **0.7.0** | 2026-07-11 | APCA-движок `check contrast` (тот же, что P-D18 в `@themeon/colors`) |
| `picocolors` | 1.1.1 | 2024-10-16 | цветной вывод CLI (если не consola) |
| `consola` | 3.4.2 | 2025-03-18 | логгер CLI (unjs, парный к citty) |

Все пины **переподтвердить `npm view` при исполнении P4.1** (паттерн P0.1 / P-D10) — окно
2–3 недели между research и кодом.

---

## 1. `@themeon/naive` — Naive UI адаптер

### 1.1 Состояние библиотеки (обновление R-05 §1)
- **2.44.1 (2026-03-08) — по-прежнему latest.** С момента R-05 (2026-07-07) новых релизов
  НЕ было → квартальный ритм подтверждён, orphan-риск (D11) без изменений. peerDep `vue ^3.0.0`,
  тестируется на 3.5.x. Пакет `@themeon/vue` уже пинит `vue ^3.5` (P-D23) — совместимо.
- Решение архитектуры не меняется: Naive — **потребитель** токенов, официального CSS-var
  входа/выхода нет (issue #4515 отклонён — R-05). Мост: `ResolvedTheme → GlobalThemeOverrides`.

### 1.2 `GlobalThemeOverrides` — форма API (для сигнатур `toNative`)
Импортируется из `naive-ui`, три уровня (подтверждено официальным doc customize-theme):
```ts
import type { GlobalThemeOverrides } from 'naive-ui'

const overrides: GlobalThemeOverrides = {
  common: { primaryColor: '#…', primaryColorHover: '#…', /* … */ },  // общие
  Button: { textColor: '#…' },                                       // per-component
  Select: { peers: { InternalSelection: { textColor: '#…' } } },     // вложенные peers
}
```
- `common` — ключевые токены (из R-05 §Naive): `primaryColor(+Hover/Pressed/Suppl)`,
  `info/success/warning/errorColor` (+ те же 3 суффикса каждый), `baseColor`, `bodyColor`,
  `textColorBase/1/2/3`, `borderColor`, `borderRadius`, `fontFamily`, `fontSize*`,
  `height{Tiny..Huge}`, `boxShadow1/2/3`.
- Значения — **строки** (CSS-цвет/длина). `toNative(theme): GlobalThemeOverrides` резолвит
  наши sys-токены в эти строки. Тип отдаётся напрямую в `<NConfigProvider :theme-overrides>`.

### 1.3 EDGE-CASE (критично): OKLCH → Naive внутренняя цветовая математика `seemly`
- Naive **выводит** `primaryColorHover/Pressed/Suppl` из `primaryColor`, если те не заданы,
  через свою color-lib **`seemly`** (`changeColor`/`composite`/`scaleColor`). Историческая
  `seemly` парсит **hex/rgb/rgba/hsl** — поддержка `oklch()` **НЕ подтверждена** (WebSearch не
  дал явного ответа; проверить парсинг `seemly.rgba('oklch(...)')` эмпирически при P4).
- **Прямой аналог AntDV-урока (R-05 §вердикт п.3):** резолвить цвета в **hex/rgba ДО** подачи
  в Naive. Безопасная стратегия адаптера: НЕ полагаться на seemly-деривацию — вычислять
  `*Hover/*Pressed/*Suppl` из наших шкал (`@themeon/colors`, соседние ступени 12-step) и
  подавать все 4 варианта **явными hex/rgba**. Это конструктивно устраняет риск неизвестной
  oklch-поддержки seemly и делает адаптер детерминированным.
- **VERIFY-метка P4:** до реализации — минимальный смок: подать `primaryColor:'oklch(...)'`
  без hover/pressed в `NConfigProvider`, проверить, не падает ли seemly и корректны ли
  производные (issue-класс «слайдер не перекрашивается в dark» — Discussion #1373).

> ⚠️ **ОПРОВЕРГНУТО/УТОЧНЕНО (2026-07-14, P8)**: VERIFY снят эмпирически (провенанс-скан 81
> light/78 dark компонентных тем naive-ui 2.44.1) — `seemly@0.3.10` парсит регулярками ТОЛЬКО
> `#rgb(a)`/`#rrggbb(aa)`/`rgb()`/`rgba()`/`hsl()`/CSS-имена/`transparent`; `oklch()` и, что
> критичнее, **`var(--…)`-строки** (`resolved.vars`) не парсятся вовсе — `changeColor('var(--x)',
> …)` бросает `[seemly/rgba]: Invalid color value`. Именно на этом упал Blocker #2: код читал
> `.vars` (var-строки), а не `.tokens[].value` (литералы). Канон —
> `findings/P8-naive-color-canon.md` §1.2/S6; решение — **P-D56/P-D57** (supersedes P-D29).

### 1.4 Breakpoint-мёрж (донор `mergeNaiveDesktopOverride`, R-01/R-02)
- **`theme-overrides` НЕ реактивен к брейкпоинтам сам по себе** (подтверждено: prop не
  responsive). Публичного `useBreakpoint`-composable Naive **не экспортирует** — брейкпоинты
  живут внутри Grid `responsive="screen"` (issue #1379 — фича-запрос так и открыт).
- Значит паттерн донора = **consumer/adapter-side**: `computed<GlobalThemeOverrides>()`,
  который **deep-merge** десктоп-патч поверх базовых overrides по текущему брейкпоинту.
  Источник брейкпоинта — НЕ Naive, а `@vueuse/core useBreakpoints` ИЛИ наш JS-экспорт
  брейкпоинтов из токенов (D14: один источник брейкпоинтов). Адаптер даёт хелпер
  `mergeOverrides(base, patch)` (deep-merge) + опц. `breakpointOverrides` map.
- **Deep-merge семантика:** Naive внутри сам deep-merge'ит `theme-overrides` на встроенную
  тему (`common`/per-component/`peers` рекурсивно). Наш `mergeOverrides` обязан быть таким же
  рекурсивным (не `Object.assign` — иначе `peers`/per-component затрутся). Референс поведения —
  lodash-style deep merge; в ядре zero-dep (D2) → своя ~20 LOC рекурсия или `defu` (unjs, уже
  в дереве через nuxt-стек P3). **VERIFY:** порядок — база → breakpoint-патч → tenant-патч.

### 1.5 Прямой `NConfigProvider` (без fallthrough-хака, D10)
- `<NConfigProvider :theme="darkTheme|null" :theme-overrides="overrides">`. `darkTheme`/
  `lightTheme` импортируются из `naive-ui`; `theme={darkTheme}` включает тёмную встроенную
  базу, поверх — наши overrides. `useThemeVars()` даёт реактивные **резолвнутые** токены
  внутри скоупа (для SFC `v-bind()`) — референс, не механизм состояния.
- Вложенные `NConfigProvider` наследуют overrides родителя (`inherit-theme-overrides`,
  дефолт вкл.) с deep-merge → multi-tenant scoping возможен вложением. Адаптер отдаёт объект
  напрямую в проп; хрупкий `<NaiveConfig>`-fallthrough @bg-dev (R-01 §6) не используется.

---

## 2. `@themeon/tailwind` — мост в Tailwind v4 (`@theme inline`)

### 2.1 ГЛАВНАЯ находка — почему `@theme inline` ОБЯЗАТЕЛЕН, а не «по вкусу»
Официальный doc + discussions (#18560, #17826) дают жёсткое правило, и оно **прямо
противоположно** дженерик-совету «используй inline только когда без него не работает». Для
ThemeOn inline нужен **ВСЕГДА**, потому что наши sys-токены — runtime-swappable через
`[data-theme]`:

- **`@theme { --color-x: … }` (non-inline):** Tailwind создаёт **глобальную** переменную
  `--color-x` в `:root` И утилиту `.bg-x { background: var(--color-x) }`. Если значение —
  ссылка `var(--ref)`, подстановка резолвится **в скоупе `:root`** (где объявлена), результат
  инхеритится вниз и **НЕ переопределяется** под `[data-theme=dark]` → **тёмная тема ломается**.
- **`@theme inline { --color-x: var(--ref) }`:** Tailwind **НЕ создаёт** глобальную
  `--color-x`; вместо этого **встраивает значение** (`var(--ref)`) прямо в утилиту:
  `.bg-x { background: var(--ref) }`. `var(--ref)` **ре-резолвится в каждом подскоупе**, где
  `[data-theme=dark] { --ref: … }` его переопределяет → **тёмная тема работает**.

Цитата (discussion #18560): *«A variable declared in `@theme` (without inline) has a
corresponding global variable… whereas a color declared in `@theme inline` does not have a
global variable, so you need to override the assigned variable directly.»*

**Вывод для бриджа (закрепить в спеке P4, это фикс класса багов, не стиль):**
```css
/* сгенерённый @themeon/tailwind bridge.css, @import рядом с "tailwindcss" */
@theme inline {
  --color-action-primary: var(--color-action-primary); /* → utility .bg-action-primary { background: var(--color-action-primary) } */
  --spacing-md: var(--spacing-md);
  --radius-md: var(--radius-md);
  /* … по одному mapping на каждый sys-токен из ResolvedTheme … */
}
```
Runtime-`:root { --color-action-primary: … }` и `[data-theme] { … }` живут в нашем
`tokens.css` (не в бридже). Утилиты Tailwind ссылаются на них через inline-подстановку →
переключение темы работает без ребилда (несущая причина всей архитектуры, §4.4 master).

> ⚠️ **ОПРОВЕРГНУТО (2026-07-14, P8)**: посылка «`@theme inline` НЕ создаёт глобальную
> `--color-x`» ФАКТИЧЕСКИ НЕВЕРНА — 24 реальные компиляции Tailwind 4.3.2 × computed-стили в
> headless Chrome показали, что `inline` управляет только тем, что попадает В УТИЛИТУ; эмиссию
> переменной в `:root`/`:host` решают tree-shaking и `reference`/`static`-режим независимо. Это
> Blocker #5: self-referential `@theme inline { --color-x: var(--color-x) }` всё равно кладёт
> циклическую `--color-x: var(--color-x)` в `:root`, которая при обратном порядке подключения
> CSS перебивает `tokens.css` и обнуляет ВСЕ токены. Канон —
> `findings/P8-tailwind-bridge-form.md`; решение — **P-D54** (supersedes P-D31, мост переведён на
> `@theme reference` + литералы).

### 2.2 EDGE-CASE: self-referential mapping в `@theme inline`
Т.к. ThemeOn уже именует переменные в Tailwind-namespace (D5: `--color-*`, `--spacing-*`),
имя в `@theme inline` **совпадает** с runtime-именем в `tokens.css` (`--color-action-primary:
var(--color-action-primary)`). Поскольку `@theme inline` **не эмитит** глобальную переменную
(§2.1), коллизии объявлений быть не должно — Tailwind лишь регистрирует имя для генерации
утилиты и встраивает RHS. **Но это тонко и не покрыто явным примером в доке** →
**VERIFY P4:** реальный прогон Tailwind 4.3.2 на bridge со self-referential mapping,
проверить (a) утилита эмитит `var(--color-action-primary)`, (b) `--color-action-primary`
НЕ появляется дублем в собранном CSS от Tailwind, (c) `[data-theme=dark]`-своп доходит до
утилиты. Fallback-план если self-reference не работает: использовать разные имена
(`--color-primary: var(--color-action-primary)` → утилита `.bg-primary`), ценой второго
набора имён.

> ⚠️ **ОПРОВЕРГНУТО (2026-07-14, P8)**: VERIFY снят реальными компиляциями — (b) НЕВЕРНО:
> `--color-action-primary` появляется в `:root` дублем-циклом (Blocker #5, см. §2.1 выше).
> Дополнительно вскрылся отдельный блокер той же self-referential формы: `breakpoint`,
> включённый в self-ref `@theme inline`, генерирует `@media (width >= var(--breakpoint-md))` —
> синтаксически невалидный media-query, из-за чего ВСЕ адаптивные варианты (`md:`/`lg:`)
> перестают применяться (Blocker #4). Fallback-план (разные имена LHS/RHS) тоже НЕРЕАЛИЗУЕМ:
> он переименовывает публичные классы (`bg-action-primary` → `bg-primary`). Канон —
> `findings/P8-tailwind-bridge-form.md`; решение — **P-D54** (supersedes P-D31 вместе с
> fallback-планом — мост переведён на `@theme reference` + литеральные значения, `breakpoint`
> — литерал всегда).

### 2.3 Прочее по Tailwind v4
- **Tailwind v4 генерирует утилиты ТОЛЬКО из `@theme`-объявленных переменных**, НЕ из
  произвольных `:root`-переменных. → Бридж **обязателен**: одних наших `:root`-токенов
  недостаточно, чтобы `bg-*`/`p-*` заработали. (Подтверждено core-concepts doc.)
- v4 — CSS-first (`@import "tailwindcss"` + `@theme`), `tailwind.config.js` больше не дефолт.
  Бридж — **CSS-файл** (`@theme inline {…}`), который потребитель `@import`'ит; НЕ JS-конфиг.
- Генератор бриджа — чистая функция `ResolvedTheme → string` (как `serializeThemeCss` ядра),
  один проход по sys-слою, отфильтрованному по Tailwind-namespace-префиксам. Zero-runtime.
- `@theme inline` доступен с Tailwind **v4.0**, стабилен в 4.3.2 → без риска свежего API.

---

## 3. CLI `themeon` (L4) — `init` / `build` / `check`

### 3.1 Каркас CLI — развилка (решение для детализации)
| Кандидат | + | − | Вердикт |
|---|---|---|---|
| **citty 0.2.2** | unjs-стек (парный consola/jiti/tinyglobby), `defineCommand`+`subCommands`, нативный `util.parseArgs`, ESM, lazy-subcommands | **всё ещё 0.x** (хотя в проде nuxi/Nuxt) | **рекомендуется** — идиоматичен для voidzero/unjs-дерева ThemeOn (уже jiti в P3) |
| commander 15.0.0 | 1.0+, огромная база, TS-native | не-unjs, свой стиль, тяжелее для мелкого CLI | fallback если 0.x citty не устроит |
| cac 7.0.0 | легковес, VoidZero-adjacent (Vite-экосистема) | менее активен | второй fallback |

`citty` API (подтверждено репо): `defineCommand({ meta, args:{ …: {type:'positional'|'string'|
'boolean'|'enum', required?, default?} }, run({args}) })` + `runMain(main)` + `subCommands:
{ init, build, check }` (lazy-import для веса). **VERIFY:** citty 0.2.2 ESM-only явно не
задекларирован в README — проверить `package.json exports`/`type` при P4.1 (профиль attw
esm-only монорепо, как P0.4).

### 3.2 `themeon build` — загрузка TS-темы
- Пользователь пишет `theme.config.ts` (`defineTheme`, P1). CLI грузит его в рантайме через
  **jiti 2.7.0** (тот же паттерн, что nuxt-codegen P3.4 `importModule`):
  ```ts
  import { createJiti } from 'jiti'
  const jiti = createJiti(import.meta.url)
  const theme = await jiti.import('./theme.config.ts', { default: true }) // ← default ?? mod
  ```
  `{ default: true }` = shortcut `mod?.default ?? mod`; `fsCache`/`moduleCache`/`interopDefault`
  дефолтно вкл. → загрузка TS без пред-компиляции.
- Дальше — `resolveTheme` + `serializeThemeCss` ядра (P1) → пишет `tokens.css`. CLI-`build` =
  тонкая обёртка над уже готовым конвейером ядра (не новая логика резолва).

### 3.3 `themeon check` — три линтера (§4.10 master, вывод из найденных багов)
Общий пайплайн: `tinyglobby` собирает файлы (`**/*.{css,vue,ts,tsx,html}` минус
`node_modules`), парсит, сверяет.

**(1) token-coverage** — ловит класс `--size-2-xl` (мёртвые ссылки) + неиспользуемые токены:
- Множество А = все генерируемые переменные (из `ResolvedTheme` → имена var).
- Множество Б = все `var(--*)`-обращения в исходниках потребителя (regex
  `var\(\s*(--[\w-]+)` по CSS/Vue/шаблонам).
- **Мёртвые ссылки** = Б∖А (используется, не генерируется) → **ошибка**.
- **Неиспользуемые токены** = А∖Б (генерируется, не используется) → **warning**.
- Осторожно: `var(--x, fallback)` — fallback не должен считаться отдельной ссылкой; вложенные
  `var()` — рекурсивный разбор. Regex достаточно для v1 (не нужен полный CSS-AST); при желании
  точности — lightningcss visitor (уже devDep `@themeon/css`, P-D22).

**(2) contrast** — APCA семантических пар для каждой темы:
- Движок — **`colorjs.io` 0.7.0** `contrastAPCA` (P-D18, тот же, что `@themeon/colors`; НЕ
  тянуть apca-w3 — лицензия). Резолвим пары (text-on-bg) в каждой теме → `Math.abs(Lc)` против
  порога (≥60 для body, ≥75 для мелкого — как в P2.7 гейте). Fail-closed (P-D19-семантика).
- Переиспользовать `checkContrast` из `@themeon/colors` (P2.1/P2.7) — не дублировать формулу.

**(3) hardcode** — сырые hex/px в стилях потребителя (замена молча-нарушаемому skill-запрету,
vintera регрессировал — master §2):
- Regex по CSS/Vue `<style>`: hex `#[0-9a-fA-F]{3,8}\b`, сырые `\d+px` (кроме `0`, `1px`
  бордеров — конфигурируемый allowlist), `rgb(`/`hsl(`/`oklch(` литералы вне `tokens.css`/
  `theme.config.ts`. Выдаёт файл:строку. **stylelint-совместимость** (§4.10) — опционально:
  можно оформить как отдельное stylelint-правило позже (P7), в v1 — встроенный чек CLI.
- Исключать сам `tokens.css` и файл-конфиг темы из скана (там литералы легитимны).

### 3.4 `themeon init`
- Скаффолд: пишет стартовый `theme.config.ts` (пример `defineTheme` с neutral+accent, дефолт
  из `@themeon/css` P-D19) + строку `@import` для `@themeon/css` + опц. bridge для Tailwind.
  Механический скаффолдер, prompt'ы опциональны (для соло-DX можно без интерактива).

---

## 4. Сквозные выводы для детализации P4 (что НЕ пересматривать / что решить)

**Подтверждено, менять не нужно:**
- D5 «мост в Tailwind = тривиальный `@theme inline`» — **валиден и обязателен** (§2.1), причём
  причина глубже, чем «тривиальность»: inline — единственный режим, где runtime-своп темы
  доходит до утилит. Зафиксировать как инвариант, не опцию.
- D10/D11 — Naive потребитель, изолированный пакет, прямой `NConfigProvider` (§1.5).
- P-D18 — `colorjs.io contrastAPCA` переиспользуется в `check contrast` (§3.3).

**Решить агенту детализации (развилки, оба варианта описаны выше):**
1. CLI-каркас: **citty** (реком., §3.1) vs commander vs cac — с учётом 0.x citty (VERIFY ESM).
2. Naive derived-цвета: вычислять `*Hover/*Pressed/*Suppl` самим из `@themeon/colors` и
   подавать hex/rgba (реком., §1.3) vs доверять seemly-деривации (риск oklch).
3. Deep-merge overrides: своя ~20 LOC рекурсия vs `defu` (§1.4).

**VERIFY-метки для реализации P4 (эмпирические, до/во время кода):**
- [ ] seemly парсит `oklch()`? (§1.3) — иначе резолвить в hex до Naive.
- [ ] self-referential `@theme inline { --color-x: var(--color-x) }` в Tailwind 4.3.2 не даёт
      дубль-объявления и доносит `[data-theme]`-своп до утилиты (§2.2).
- [ ] citty 0.2.2 ESM-only-совместим с монорепным attw-профилем (§3.1).
- [ ] `themeon check` token-coverage корректно игнорирует `var(--x, fallback)`-fallback (§3.3).

---

## Источники (URL)
- Naive UI customize-theme (офиц. doc, GitHub main): https://github.com/tusen-ai/naive-ui/blob/main/demo/pages/docs/customize-theme/enUS/index.md
- Naive UI config-provider: https://www.naiveui.com/en-US/os-theme/components/config-provider
- Naive UI theme docs: https://www.naiveui.com/en-US/os-theme/docs/theme
- Naive UI issue #1379 (нет публичного breakpoint API): https://github.com/tusen-ai/naive-ui/issues/1379
- Naive UI discussion #2362 (component-level overrides / peers): https://github.com/tusen-ai/naive-ui/discussions/2362
- Tailwind v4 theme docs: https://tailwindcss.com/docs/theme
- Tailwind v4 functions & directives: https://tailwindcss.com/docs/functions-and-directives
- Tailwind discussion #18560 (@theme vs @theme inline): https://github.com/tailwindlabs/tailwindcss/discussions/18560
- Tailwind discussion #17826 (@theme inline usage): https://github.com/tailwindlabs/tailwindcss/discussions/17826
- citty (unjs): https://github.com/unjs/citty
- jiti 2.x README (createJiti / import default): https://github.com/unjs/jiti/blob/main/README.md
- tinyglobby: https://www.npmjs.com/package/tinyglobby
- Версии — `npm view <pkg> dist-tags.latest` / `time`, 2026-07-13 (ground truth).
