# R-15 — P5 углублённый research: миграция живых Nuxt-проектов (dterema → vintera) на ThemeOn

> Фаза P5 (пилоты). Не про новый код пакета — про **безопасную миграцию прод-фронтенда**
> dterema/vintera на уже готовый ThemeOn (P0–P4 закрыты). Точечное углубление поверх
> R-01 (dterema-аудит), R-02 (vintera-аудит), R-13 (Nuxt/Vue), R-14 (Tailwind-мост).
> R-01..R-14 НЕ переделываются. Дата research: **2026-07-13** (2 прохода; вторая RAG-итерация
> перед детализацией P5 — уточнения/коррекции §1–§9 собраны в **§10**, старые секции не тронуты).
>
> **Метод-отклонение (как в R-12/R-13/R-14):** perplexity-web MCP в этой сессии недоступен —
> research выполнен через WebSearch + WebFetch (spec/docs/GitHub-обсуждения) + прямой
> код-аудит живых пилотов (`~/projects/dterema/app`, `~/projects/vintera/vintera`, 2026-07-13).
> Каждый внешний факт — с URL и датой доступа. Непроверенное — `[UNVERIFIED]`.
> Решения D1–D17 (00_MASTER_PLAN §5), особо **D5** (легаси-алиасы), **D14** (breakpoints),
> **D17** (пилот-порядок) — не пересматриваются, а операционализируются под миграцию.

---

## 0. Ground truth пилотов (код-аудит 2026-07-13, поверх R-01/R-02)

| Факт | dterema (`~/projects/dterema/app`) | vintera (`~/projects/vintera/vintera`) |
|---|---|---|
| Стек | nuxt 4.4.2, naive-ui 2.44.1, sass (indented), **без Tailwind** | nuxt 4.4.7, naive-ui 2.44.1, **tailwindcss v4 + `@tailwindcss/vite`**, sass |
| Токены | `app/config/theme/*.ts` (директория, 11 файлов) | `app/config/theme/*.ts` (11 файлов) |
| Как токены попадают на страницу | **`<link rel="stylesheet" href="/styles/base-vars.css">` в `app.head.link`** (`nuxt.config`), НЕ через `css:[]` | генерируемый `base-vars.css` (артефакт, `.gitignore`) + `app.plugins/theme-fouc.ts` |
| App-CSS вход | `css: ['~/styles/app.sass']` | `css: ['~/styles/tailwind.css', …]` (индекс ~130 в массиве) |
| Tailwind-мост | нет | **ручной** `app/styles/tailwind.css`: `@import "tailwindcss"` + `@theme { --color-primary: var(--primary); … 14 пар }` (см. §4) |
| Живой баг kebab (R-01 §2-3) | `--size-2-xl`/`--size-5-xl` dead-refs | **подтверждён**: `typography.sass:16` `var(--size-5-xl, 48px)`, `:25` `var(--size-2-xl, 24px)`; токены `size2xl:'24px'`/`size5xl:'48px'` → генерят `--size2xl`/`--size5xl` → заголовки живут на fallback |
| Breakpoints (D14, R-02 §3) | `theme/breakpoints.ts` (640/768/1024/1280/1536/1800) + `composables/useResponsive.ts` + Naive medium | 3 копии, **разные шкалы**: `theme/breakpoints.ts` (…1800) vs `useAppBreakpoints.ts` (410/576/768/992/1600/1800) |
| Watcher-баг (R-02 §2) | частичный | `SOURCE_REL=['app/config/theme.ts', …]` — путь на несуществующий файл (стал директорией), HMR мёртв |

**Следствие для механики миграции:** dterema и vintera доставляют токены **разными путями**
(dterema — статический `<link>`; ThemeOn Nuxt-модуль доставляет через `nuxt.options.css` +
head-скрипт анти-FOUC). Значит миграция — это не «поправить пути», а **замена канала доставки**:
снять ручной `<link>`/`css:`-вход и `modules/sync-styles-css-vars.ts`, подключить `@themeon/nuxt`.
Это и есть источник P5-рисков (FOUC/порядок каскада/SSR), не сами значения токенов.

---

## 1. Инкрементальная миграция CSS-переменных без визуальных регрессий (D5)

**Стратегия «алиас-мост, затем снос»** — индустриальный консенсус для смены имён переменных
без визуального регресса; ровно то, что заложено в D5 (`aliases: 'legacy-v0'`).

- Механика ThemeOn уже готова (P1.3, коммит `827764f`): `src/aliases/legacy-v0.ts` эмитит
  старые имена (`--primary`, `--bg-base`, …) **дублями** рядом с каноническими (`--color-primary`,
  `--color-bg-page`). На время миграции существуют ОБА множества → потребительский CSS,
  ссылающийся на `var(--primary)`, продолжает работать байт-в-байт.
- Классический паттерн ретрофита темизации через дубль-объявление и fallback подтверждён
  как безопасный подход (Ben Nadel, retrofitting theming via CSS custom properties, 2020;
  MUI CSS-theme-variables migration guide — оба описывают «старое имя как алиас на новое»).
  Источники: <https://www.bennadel.com/blog/3777-retrofitting-theming-into-a-legacy-app-using-less-css-and-css-custom-properties.htm> (доступ 2026-07-13),
  <https://v5.mui.com/material-ui/experimental-api/css-theme-variables/migration/> (доступ 2026-07-13).
- **Порядок P5 (D17): dterema → vintera → (octoclick опц.)**. dterema дисциплинирован
  (везде `var(--*)`, `color-mix`), поэтому его пустой diff — эталон. vintera регрессировал
  в хардкод (R-02 §1) → на нём ловим регрессии и чистим хардкод через `themeon check` (P4).
- **Последовательность внутри пилота (рекомендация детализатору):**
  1. Baseline: снять множество генерируемых переменных ДО (см. §2).
  2. Подключить `@themeon/nuxt` c `aliases: 'legacy-v0'`, снять старый пайплайн
     (`config/theme/*`, `utils/theme-css-vars.ts`, `scripts/*`, `modules/sync-styles-css-vars.ts`).
  3. Parity-гейт: diff переменных обязан быть пустым (кроме санкционированных — см. §3).
  4. Починка `--size-2-xl`-класса: это **санкционированный** ненулевой diff (переменные
     `--size-2-xl`/`--size-5-xl` ПОЯВЛЯЮТСЯ впервые — их раньше не было из-за kebab-бага;
     заголовки перестают жить на fallback). Занести в `expectedVarDiff`.
  5. Свести breakpoints к одному источнику (D14, §5).
  6. **vintera-only:** заменить ручной `tailwind.css` на генерируемый `@theme inline`-мост (§4),
     вычистить хардкод по `themeon check --hardcode`.
  7. Снять `aliases: 'legacy-v0'` последним шагом; повторный parity-гейт ловит забытые
     `var(--legacy)`-ссылки (станут невалидными → визуальный/coverage-регресс).

**Ключевой риск инкрементальности:** алиас-мост скрывает недомигрированные ссылки до самого
снятия опции. Поэтому снятие алиасов — отдельный item с полным `themeon check --coverage` +
визуальным прогоном, а не «sed и коммит».

---

## 2. Как надёжно снять и сравнить множество вычисленных CSS custom properties

Это ядро parity-гейта (§2б плана). Есть два уровня снятия — **declared** (из генерируемого
файла) и **computed** (из браузера) — и они дают РАЗНЫЕ ответы. Детализатор обязан выбрать явно.

### 2.1 Что «считается» пустым diff — три ловушки

1. **computed ≠ declared для custom properties.** По спецификации CSS Variables L1 вычисленное
   значение НЕзарегистрированного custom property — это «specified value с подставленными `var()`,
   либо guaranteed-invalid». То есть `getComputedStyle(el).getPropertyValue('--primary')`, где
   `--primary: var(--color-primary)` и `--color-primary:#2d7030`, вернёт **`#2d7030`** (var()
   раскрыт), а НЕ строку `var(--color-primary)`.
   Источники: <https://www.w3.org/TR/css-variables-1/> и
   <https://drafts.csswg.org/css-variables/> (доступ 2026-07-13);
   <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties> (доступ 2026-07-13).
   **Следствие:** computed-снимок раскрывает алиасы до конечных значений — удобно для
   value-parity, но `color-mix()`/`calc()` НЕ вычисляются (остаются текстом функции), если
   переменная не зарегистрирована через `@property` с конкретным `syntax`. Registered-свойства
   (universal `*` syntax) ведут себя как unregistered; при конкретном syntax — подставляются
   уже как computed value (Properties & Values API L1:
   <https://www.w3.org/TR/css-properties-values-api-1/>, доступ 2026-07-13).
2. **Whitespace.** Историческ `getComputedStyle` возвращал значение custom property с
   **ведущим пробелом** (`--x: red` → `" red"`); спека позже предписала триммить, но реализации
   расходятся по версиям. jQuery добавляла явный trim именно из-за этого (коммиты
   `219ccf5`/`efadfe9`: «Trim whitespace surrounding CSS Custom Properties values»:
   <https://github.com/jquery/jquery/commit/219ccf5c5ffd751adb782335f0a36da79070f102>,
   доступ 2026-07-13). **Всегда `.trim()` имя и значение перед сравнением.**
3. **Порядок объявления не значим для значения, но значим для diff-инструмента.** Множество
   переменных — это **set/map по имени**, не список. Сравнивать как отсортированную map
   `name → normalized(value)`, иначе перестановка строк в генераторе даст ложный diff.

### 2.2 Рекомендуемый метод parity-гейта (для детализатора)

**Primary — declared-level, из генерируемого артефакта (не браузер):** это буквально то, что
плата называет «множество генерируемых CSS-переменных», и это детерминировано побайтно (P-D22).
Парсить сгенерированный CSS (у dterema — `public/styles/base-vars.css` ДО и ThemeOn `tokens.css`
ПОСЛЕ) в `{ selector → { varName → value } }` для каждого блока (`:root`, `[data-theme="dark"]`,
`html[data-theme="dark"]` — нормализовать селектор тоже), затем:
- нормализация значения: `.trim()`, collapse внутренних пробелов до одного, lowercase hex,
  единый формат (`rgb( a b c / d )` vs `rgba(a,b,c,d)` — привести обе стороны),
  канонизировать `0px`↔`0`? — **нет**, не канонизировать единицы (может скрыть реальный
  регресс); лучше оставить как есть и заносить осознанные различия в `expectedVarDiff`.
- сравнение: symmetric diff множеств имён (**обязан быть пуст** — модуль legacy-алиасов
  гарантирует присутствие старых имён) + value-diff по общим именам.
- **Именно name-set diff — главный инвариант.** value-diff может быть ненулевым легитимно
  (dterema авторит `color-mix()`, ThemeOn может пре-резолвить в статический hex — визуально
  идентично, строкой различается). Такой value-diff — кандидат в `expectedVarDiff` с
  обоснованием, а не автоматический стоп.

**Secondary — computed-level, headless-кросс-чек:** прогнать реальную страницу в headless
(Playwright, см. §6), собрать `getComputedStyle(document.documentElement)` для всех `--*` в
light и dark, сравнить ДО/ПОСЛЕ. Ловит то, что declared-парсинг пропустит: реальный порядок
каскада (какое объявление победило), эффект `[data-theme]`-переключения, живые алиас-цепочки.
Скрипт сбора всех custom properties страницы — Tyler Gaw, «How to Get All Custom Properties on
a Page in JavaScript»: <https://tylergaw.com/blog/how-to-get-all-custom-properties-on-a-page-in-javascript/>
(доступ 2026-07-13; метод: перебор `document.styleSheets` → `cssRules` → свойства на `--`).
Важно: `getComputedStyle` НЕ перечисляет custom properties как индексируемые (исторический
баг Chromium #949807) — нельзя итерировать по индексам, только `getPropertyValue('--known-name')`
по заранее известному списку имён (взять из declared-парсинга).

**Вывод:** declared-diff = обязательный автоматический гейт (в `themeon-p5-pilots.js`);
computed-diff = адверсариальный кросс-чек на review-стадии (opus/xhigh), ловит каскад/SSR.

---

## 3. Санкционированные (ожидаемые) отличия — `expectedVarDiff`

Заносить в конфиг гейта с обоснованием (не «молча пропустить»):

1. **`--size-2-xl` / `--size-5-xl` (и весь класс `-N-xl`) ПОЯВЛЯЮТСЯ.** Раньше kebab-баг генерил
   `--size2xl`/`--size5xl`, а стили ссылались на `--size-2-xl`/`--size-5-xl` → dead-ref → fallback.
   ThemeOn-naming (P1.3, тесты `1-5`-формы) генерит канонически `--text-2xl` и т.п. **Диф здесь —
   это ПОЧИНКА** (заголовки съезжают с 48px/24px fallback на реальные токены). Требует
   визуального подтверждения, что значения токена == значениям fallback (в vintera они совпадают:
   `size2xl:'24px'`==fallback `24px`, `size5xl:'48px'`==`48px` — значит визуально изменений быть
   не должно, только исчезает хрупкость). **Проверить эквивалентность до/после явно.**
2. **Старые имена `--size2xl`/`--size5xl` ИСЧЕЗАЮТ** (их никто не потреблял — dead tokens).
3. **Канонические `--color-*`/`--spacing-*`/`--text-*` ПОЯВЛЯЮТСЯ** рядом с легаси (это цель D5,
   не регресс) — при `aliases:'legacy-v0'` легаси-имена present, канон present, diff имён по
   легаси-множеству пуст.
4. **value-diff от пре-резолва функций** (`color-mix`/`calc` → статика) — только если визуально
   эквивалентно; каждый случай перечислить поимённо.

Всё остальное непустое = стоп фазы (P-D33).

---

## 4. vintera: Tailwind v4 `@theme inline`-мост поверх/вместо ручного `tailwind.css`

### 4.1 Точная семантика `@theme` vs `@theme inline` (для замены ручного моста)

Разница — в выводе утилит, производных от theme-переменной, и в эмиссии глобальной `:root`-переменной:

- **`@theme { --color-x: <val> }`** (без inline): Tailwind ЭМИТИТ собственную глобальную
  `--color-x` в `:root` И утилита ссылается на неё: `.bg-x { background: var(--color-x) }`.
- **`@theme inline { --color-x: <val> }`**: Tailwind НЕ эмитит глобальную переменную; значение
  `<val>` **инлайнится прямо в утилиту**: `.bg-x { background: <val> }`.

Источники: <https://github.com/tailwindlabs/tailwindcss/discussions/18560> (доступ 2026-07-13);
<https://tailwindcss.com/docs/theme> (доступ 2026-07-13);
<https://github.com/tailwindlabs/tailwindcss/discussions/17826> (доступ 2026-07-13).

**Критично для рантайм-темизации.** Если хотим, чтобы Tailwind-утилита подхватывала смену темы
через `[data-theme]`, `<val>` должен быть `var(--runtime-token)`. Тогда:
- `@theme inline { --color-primary: var(--color-primary) }` → `.bg-primary { background: var(--color-primary) }`
  → утилита ссылается на **рантайм**-`--color-primary` (тот, что ThemeOn эмитит в `:root`/`[data-theme]`),
  и dark-mode перекрывает `--color-primary` в `:root` → утилита меняется. Глобальной дубль-переменной
  от Tailwind НЕТ → нет коллизии с ThemeOn-переменной того же имени.
- Это ровно **P-D31 / P4.1** — `@themeon/tailwind::tailwindBridge()` уже генерит именно
  self-referential `@theme inline { --x: var(--x) }`, non-inline не эмитится никогда
  (`packages/tailwind/src/bridge.ts`, коммент строк 6–8). Мост из P4 — правильный по этой семантике.

> Замечание по нюансу: при non-inline `@theme`, если значение — `var(--other)`, Tailwind создаёт
> собственную глобальную `--color-x`, чья подстановка НЕ перекрывается вариантом (dark) без
> переопределения самой `--other` — обсуждение #18560 прямо не советует inline для «override-friendly»
> архитектур, НО в случае ThemeOn ключ theme-переменной и рантайм-переменная **одноимённы**
> (`--color-primary`), поэтому non-inline дал бы циклическую/дублирующую `:root`-переменную —
> inline здесь единственно корректен. Это уже зафиксировано P-D31; P5 его не пересматривает.

### 4.2 Что реально меняется в vintera (код-факт, не гипотеза)

Текущий `app/styles/tailwind.css` (14 пар, подтверждён 2026-07-13):
```css
@import "tailwindcss";
@theme {                              /* NB: без inline + ЛЕГАСИ-имена справа */
  --color-primary: var(--primary);
  --color-canvas:  var(--bg-base);
  --color-surface: var(--bg-card);
  --color-content: var(--text-primary);
  --color-muted:   var(--text-secondary);
  /* … divider/overlay/faint/success/warning/error/info/primary-hover/accent … */
}
```

Здесь **две проблемы для миграции**, обе — работа детализатора:

1. **non-inline + legacy-имена справа.** Пока живы алиасы (`--primary` present), это работает.
   Но `@theme` (non-inline) эмитит глобальные `--color-primary` и т.д. → при подключённом ThemeOn,
   который эмитит СВОЙ `--color-primary`, возможна двойная `:root`-декларация того же имени.
   Замена на генерируемый `@theme inline`-мост (self-ref) это устраняет. → **item: заменить
   ручной `tailwind.css` `@theme{}`-блок на `@import` генерируемого `@themeon/tailwind` бриджа**,
   `@import "tailwindcss"` оставить.

2. **⚠ Имена Tailwind-утилит поменяются — риск сломать шаблоны.** vintera хендмейд-мост завёл
   СВОИ короткие семантические ключи: `--color-canvas/surface/content/muted/faint/divider/overlay`
   → в шаблонах используются классы `bg-canvas`, `text-content`, `bg-surface`, `text-muted` и т.п.
   Генерируемый `@themeon/tailwind` мост выведет ключи из **канонических sys-имён ThemeOn**
   (`--color-bg-page`, `--color-text`, …) → классы станут `bg-bg-page`, `text-text` и пр. —
   **другие**. Прямая замена сломает все шаблоны, использующие `bg-canvas`/`text-content`.
   **Это НЕ покрывается parity-гейтом по переменным** (переменные совпадут; сломаются имена
   Tailwind-утилит в разметке `.vue`). Решение — выбор детализатора, два варианта:
   - (a) **Тонкий рукописный alias-inline-мост** поверх генерируемого: сохранить короткие имена
     `@theme inline { --color-canvas: var(--color-bg-page); … }` — тогда `bg-canvas` продолжает
     работать, а справа стоит канон ThemeOn. Меньше правок разметки, но частично ручной мост.
   - (b) **Codemod разметки** `bg-canvas→bg-bg-page` и т.д. по всем `.vue` + parity по классам.
     Чище к канону, дороже и рискованнее (легко пропустить динамически собранный класс —
     Tailwind upgrade-tool сам предупреждает, что программно собранные имена классов codemod
     не ловит: <https://tailwindcss.com/docs/upgrade-guide> / discussion,
     <https://www.digitalapplied.com/blog/tailwind-css-v4-2026-migration-best-practices>, доступ 2026-07-13).
   **Рекомендация:** вариант (a) на время пилота (сохраняет визуал и шаблоны, риск минимален),
   codemod (b) — отдельным пост-пилотным item при желании выпилить короткие алиасы. Это ложится
   в дух D5 (алиасы как мост, снос — отдельно). **Обязательно занести выбор в `phases/P5.md` как
   не-цель/цель явно** — sonnet не должен решать это сам.

3. **`@import` порядок в Tailwind v4.** `@import "tailwindcss"` должен идти так, чтобы
   `@theme`-блоки моста были видны компилятору Tailwind; Tailwind v4 собирает theme из всех
   `@theme`-ат-правил в графе импортов. Хардкод-чистку (`themeon check --hardcode`, R-02 §1 —
   `#bf36ff`, `rgb(255 255 255/30%)`, `13px` в 10 файлах) делать ПОСЛЕ переключения моста, но
   ДО снятия алиасов.

---

## 5. Breakpoints → один источник (D14)

- dterema: `theme/breakpoints.ts` (sm640/md768/lg1024/xl1280/2xl1536/wide1800) + `useResponsive.ts`
  + Naive medium (1800). vintera: те же файлы, но `useAppBreakpoints.ts` — **другая шкала**
  (410/576/768/992/1600/1800). Это ровно D14 / R-02 §3.
- ThemeOn (D14): один источник в токенах → CSS-vars `--breakpoint-*` + `@custom-media` +
  JS-экспорт (для vueuse) + значения адаптерам. **P5-item:** свести обе JS-копии
  (`useAppBreakpoints`/`useResponsive`) и Naive-порог к импорту брейкпоинтов из ThemeOn-темы.
- **Риск изменения поведения:** у vintera `useAppBreakpoints` реально иная шкала (992 vs 1024 и
  т.д.) — унификация СМЕНИТ пороги адаптива → это **визуальный/поведенческий** diff, не ловится
  parity-гейтом по переменным. Требует: (1) решить в дизайне, какая шкала канонична (шкала
  `theme/breakpoints.ts`, т.к. `--breakpoint-*` совпадают с Tailwind-namespace D5); (2) явный
  визуальный прогон адаптива на ключевых ширинах (410/576/768/992/1024/1600/1800). Занести
  расхождение шкал как **известное поведенческое отклонение** в `phases/P5.md`.
- `@custom-media` vs `@container`: сам пакет `@themeon/css` бургер-порог решает через `@container`
  (P-D22, Baseline-2026), но пилоты вольны потреблять `--breakpoint-*` в своих `@media`. Не
  навязывать пилотам container-queries в P5 — это выходит за скоуп (снос дублей, не рефактор адаптива).

---

## 6. Nuxt 4: подводные камни замены локального theme-модуля внешним пакетом

### 6.1 Канал доставки токенов и порядок каскада

- Nuxt-модуль `@themeon/nuxt` (P3) кладёт токены через `nuxt.options.css` (`css.push`) + head-скрипт
  анти-FOUC. **Порядок в `nuxt.options.css` = порядок каскада**: `unshift`/index 'first' — низший
  приоритет (грузится раньше), `push`/'last' — перекрывает всё. Подтверждено поведением
  `injectPosition` в `@nuxtjs/tailwindcss` (`'first'`≡`css.unshift`, `'last'`≡`css.push`):
  <https://tailwindcss.nuxtjs.org/getting-started/module-options/> (доступ 2026-07-13);
  Nuxt styling: <https://nuxt.com/docs/4.x/getting-started/styling> (доступ 2026-07-13);
  обсуждения порядка загрузки CSS: <https://github.com/nuxt/nuxt/discussions/20659>,
  <https://github.com/nuxt/nuxt/discussions/9906> (доступ 2026-07-13).
- **Токены (`@layer themeon.tokens`) должны идти РАНЬШЕ прикладного CSS**, чтобы `@layer`-каскад
  (D8) работал и потребительский CSS вне layers побеждал. Модуль обязан вставлять токены в
  начало (`unshift`/`injectPosition:'first'`), а не в конец — иначе прикладной `app.sass`
  окажется под токенами и layer-порядок нарушится. **VERIFY на пилоте:** проверить фактический
  порядок `<link>`/`<style>` в SSR-HTML head после подключения модуля.
- dterema сейчас грузит `base-vars.css` **статическим `<link>` в head** (не через `css:[]`).
  При миграции этот `<link>` снять и `app.head.link`-запись удалить — иначе двойной источник
  переменных (старый файл + модуль) → парадоксально «пустой» parity (значения те же), но мёртвая
  копия старого пайплайна. **Адверсариальный review обязан искать оставшийся `base-vars.css`
  `<link>` / незаснесённый `public/styles/base-vars.css` / живой `modules/sync-styles-css-vars.ts`.**

### 6.2 Анти-FOUC при SSR

- Смена канала = смена момента вставки токенов. Раньше: статический `<link>` (render-blocking,
  до paint). Теперь: head-скрипт модуля + модульный CSS. **Инвариант:** SSR-разметка не должна
  зависеть от темы (иначе hydration mismatch — прецедент P3.6, `<ClientOnly fallback>` в
  playground, коммит `a23bc82`). Токены обязаны быть в `<head>` ДО первого paint; тема-зависимый
  текст/классы в SSR = FOUC/mismatch. External stylesheets render-blocking по определению
  (<https://nuxt.com/docs/4.x/getting-started/styling>, доступ 2026-07-13), что здесь на пользу
  (токены блокируют paint = нет вспышки), но head-скрипт выбора темы должен исполниться до paint.
- vintera уже имеет `app/plugins/theme-fouc.ts` (дублированный инлайн-скрипт, R-02 §Тот же паттерн).
  При миграции его СНЯТЬ — анти-FOUC теперь поставляет модуль (D6: «один генерируемый скрипт вместо
  двух рукописных»). Оставленный старый плагин = два конкурирующих color-mode-инициализатора.
- Также снять/не-использовать встроенный color-mode `@bg-dev/nuxt-naiveui` (R-01 §5, две системы) —
  единая система через `useTheme()` ThemeOn (D6). Это поведенческий, не переменный, diff.

### 6.3 Layers, auto-imports, коллизии композаблов

- **Auto-import коллизия.** Оба пилота имеют локальный `useTheme()`/`useAppTheme()`
  (`useState`+localStorage). `@themeon/nuxt` авто-импортит СВОЙ `useTheme` (P3). Два авто-импорта
  одного имени → Nuxt-правило приоритета: файлы проекта (`app/composables/`) перекрывают импорты
  из слоёв/модулей. Т.е. локальный `useTheme` **затенит** модульный, если не удалён.
  <https://nuxt.com/docs/4.x/guide/concepts/auto-imports> и
  <https://nuxt.com/docs/4.x/directory-structure/app/composables> (доступ 2026-07-13):
  «project files override any layer». **Item обязан удалить локальные `useTheme`/`useAppTheme`/
  `applyCssVars` и переключить вызовы на модульный `useTheme` из `@themeon/nuxt`** — иначе
  миграция «подключена», а работает старый композабл (мёртвый пакет).
- **Layers vs module.** ThemeOn поставляется как **модуль** (`modules:['@themeon/nuxt']`), не как
  layer (`extends`). Приоритет: слои, идущие раньше в `extends`, выше; проект перекрывает всё
  (<https://nuxt.com/docs/4.x/getting-started/layers>, доступ 2026-07-13). Для P5 layers не нужны —
  пилот подключает модуль, локальный `modules/sync-styles-css-vars.ts` удаляет. Не вводить
  `extends`-слои в пилотах (лишняя сложность вне скоупа).
- **`modules/` авто-скан.** Nuxt авто-регистрирует локальные `~/modules/*`
  (<https://nuxt.com/docs/4.x/directory-structure/modules>, доступ 2026-07-13). Файл
  `modules/sync-styles-css-vars.ts` надо **физически удалить**, а не только убрать из `modules:[]`
  (он в массиве может не значиться — авто-скан подхватит его сам). Оставленный = живой старый
  watcher параллельно ThemeOn dev-watcher (D13) → конкурирующая регенерация.

---

## 7. Версии/пины (переподтвердить `npm view` при исполнении P5.1)

| Пакет в пилотах | Замечен (2026-07-13, аудит) | Нота |
|---|---|---|
| nuxt (dterema/vintera) | 4.4.2 / 4.4.7 | `@themeon/nuxt` compat `>=4` (D13) — ок |
| naive-ui | 2.44.1 (оба) | совпадает с peer `@themeon/naive` (R-14) |
| tailwindcss (vintera) | v4 (`@tailwindcss/vite`) | мост `@themeon/tailwind` целит v4 (R-14: 4.3.2) — переподтвердить точный minor |
| `@bg-dev/nuxt-naiveui` | 2.0.0 (оба) | color-mode отключить (D6/R-01 §5) |

Все версии живого пилота **переподтвердить на момент запуска P5** (окно 2–3 недели, паттерн P-D10);
пилот-репо на feature-ветках с грязным деревом (P-D33 preflight) — привести в чистое ДО старта.

---

## 8. Сводка для детализатора P5 (чего нельзя решать sonnet'у самому)

1. **Метод parity-гейта** (§2.2): declared-diff из генерируемого CSS = обязательный автогейт;
   computed-diff (headless) = адверсариальный кросс-чек. Нормализация значений — по §2.2.
2. **`expectedVarDiff`** (§3): `--size-2-xl`/`-5-xl` появляются (починка, визуально-эквивалентна),
   `--size2xl/5xl` исчезают, канон появляется рядом с легаси. Value-diff от пре-резолва функций —
   перечислить поимённо.
3. **vintera Tailwind (§4.2):** имена утилит `bg-canvas`/`text-content` сломаются при генерируемом
   мосте. Выбрать (a) тонкий alias-inline-мост (рекоменд.) или (b) codemod разметки. **Явно** в ТЗ.
4. **breakpoints (§5):** vintera-шкала `useAppBreakpoints` реально другая — унификация меняет
   пороги адаптива (поведенческий diff, не переменный). Канон = `theme/breakpoints.ts`. Визуальный
   прогон на ширинах 410/576/768/992/1024/1600/1800.
5. **Nuxt-канал (§6):** снять статический `<link base-vars.css>` (dterema) / `theme-fouc.ts` +
   `modules/sync-styles-css-vars.ts` (оба) + локальные `useTheme` — иначе мёртвые копии рядом с
   живым пакетом. Порядок `css`: токены `unshift`/'first'. color-mode `@bg-dev/nuxt-naiveui` off.
6. **Снятие алиасов — отдельный последний item** с `themeon check --coverage` + визуал.
7. Всё, что parity по переменным НЕ ловит (визуал при совпавших переменных, FOUC, SSR-mismatch,
   мёртвая копия пайплайна, смена Tailwind-классов, смена breakpoint-порогов) — предмет
   обязательного adversarial-review (opus/xhigh) и Playwright-визуалки (§ниже).

### Инструмент визуалки (review-стадия)
Playwright `toHaveScreenshot()` (pixelmatch, `animations:'disabled'`, `maxDiffPixelRatio≈0.01`) —
базлайн ДО, сравнение ПОСЛЕ; `toHaveCSS()` для точечной проверки вычисленных стилей без
скрин-базлайна. Источники: <https://playwright.dev/docs/test-snapshots> (доступ 2026-07-13);
<https://testdino.com/blog/playwright-visual-testing> (доступ 2026-07-13). `[UNVERIFIED]` наличие
Playwright в окружении пилотов — проверить/поставить как devDep в ветке `themeon-migration/P5`,
либо ограничиться computed-diff headless-скриптом (§2.2), если браузер-раннер недоступен в sandbox
(прецедент P2.5/P3.6 — живой браузер-render как Known Deviation).

---

## 9. Источники (все — доступ 2026-07-13)

- CSS Variables L1: <https://www.w3.org/TR/css-variables-1/> · <https://drafts.csswg.org/css-variables/>
- CSS Properties & Values API L1 (@property/registered): <https://www.w3.org/TR/css-properties-values-api-1/>
- MDN custom properties: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties>
- MDN getComputedStyle: <https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle>
- jQuery trim-whitespace коммиты: <https://github.com/jquery/jquery/commit/219ccf5c5ffd751adb782335f0a36da79070f102> · <https://github.com/jquery/jquery/commit/efadfe991a5c287af561a9326bf1427d726c91c1>
- Собрать все custom properties страницы: <https://tylergaw.com/blog/how-to-get-all-custom-properties-on-a-page-in-javascript/>
- Chromium #949807 (getComputedStyle не перечисляет custom props): <https://bugs.chromium.org/p/chromium/issues/detail?id=949807>
- Tailwind `@theme` vs `@theme inline`: <https://github.com/tailwindlabs/tailwindcss/discussions/18560> · <https://github.com/tailwindlabs/tailwindcss/discussions/17826> · <https://tailwindcss.com/docs/theme>
- Tailwind v4 migration (codemod пределы): <https://www.digitalapplied.com/blog/tailwind-css-v4-2026-migration-best-practices>
- Retrofit theming via CSS custom props: <https://www.bennadel.com/blog/3777-retrofitting-theming-into-a-legacy-app-using-less-css-and-css-custom-properties.htm>
- MUI CSS theme variables migration: <https://v5.mui.com/material-ui/experimental-api/css-theme-variables/migration/>
- Sass→native CSS handbook: <https://dev.to/karsten_biedermann/a-practical-migration-handbook-from-sassscss-to-modern-native-css-1l88> · Sass CSS-var syntax breaking change: <https://sass-lang.com/documentation/breaking-changes/css-vars/>
- Nuxt 4 styling / css order: <https://nuxt.com/docs/4.x/getting-started/styling> · <https://github.com/nuxt/nuxt/discussions/20659> · <https://github.com/nuxt/nuxt/discussions/9906>
- Nuxt injectPosition (css.unshift/push): <https://tailwindcss.nuxtjs.org/getting-started/module-options/>
- Nuxt 4 layers / auto-imports / composables / modules: <https://nuxt.com/docs/4.x/getting-started/layers> · <https://nuxt.com/docs/4.x/guide/concepts/auto-imports> · <https://nuxt.com/docs/4.x/directory-structure/app/composables> · <https://nuxt.com/docs/4.x/directory-structure/modules>
- Playwright visual regression: <https://playwright.dev/docs/test-snapshots> · <https://testdino.com/blog/playwright-visual-testing>

---

## 10. Deepening pass 2 (2026-07-13, вторая RAG-итерация перед детализацией P5)

> Метод тот же: perplexity-web MCP в сессии **не подключён** (`claude mcp list` → connected
> только Figma + context7; конфиг `~/.config/perplexity-web-mcp/config.json` есть, но сервер
> не поднят) → WebSearch/WebFetch + прямой код-аудит. Всё ниже — **уточнения и коррекции**
> к §1–§9, не замена. Решения D1–D17 не пересматриваются. Каждый факт — URL + дата доступа.

### 10.1 КОРРЕКЦИЯ §2.2 — enumeration custom properties в `getComputedStyle` УЖЕ доступен

§2.2 опирался на исторический Chromium-баг #949807 («нельзя итерировать по индексам, только
`getPropertyValue('--known-name')`»). **Это устарело.** Chromium **зашипил** custom-property
enumeration в `getComputedStyle()` в **Chrome 141** (Intent to Ship от 2025-09-04, LGTM'ы
рецензентов к 2025-09-09, Finch-раскатка). Firefox/Safari баг **никогда не имели**.
Источник: <https://groups.google.com/a/chromium.org/g/blink-dev/c/ELhr0cJgb7E> (доступ 2026-07-13);
баг-трекер <https://issues.chromium.org/issues/41451306> (доступ 2026-07-13).

**Следствие для computed-кросс-чека (§2.2 Secondary):** на актуальном браузере (2026-07) можно
перечислять все custom properties напрямую, БЕЗ заранее известного списка имён:
```js
[...getComputedStyle(document.documentElement)].filter((p) => p.startsWith('--'))
  .map((p) => [p.trim(), getComputedStyle(document.documentElement).getPropertyValue(p).trim()])
```
(источник паттерна: CSS-Tricks/Tyler Gaw, актуализировано — <https://css-tricks.com/how-to-get-all-custom-properties-on-a-page-in-javascript/>, доступ 2026-07-13).
Это упрощает computed-diff (не нужно предварительно парсить declared-имена только чтобы знать,
что спрашивать). **НО declared-diff остаётся primary-гейтом** (детерминизм, P-D22) — enumeration
меняет только удобство secondary-кросс-чека. **VERIFY на исполнении:** какой Chromium в
Playwright-раннере sandbox; если < 141 — fallback на known-name-список из declared-парсинга
(механизм §2.2 остаётся валидным как деградация). Firefox-канал enumeration надёжен независимо.

### 10.2 Sass-миграция: почему `#{$var}`-breaking-change пилотов НЕ задевает (углубление к §9-ссылке)

Оба пилота держат Sass (indented/scss) — но **только как синтаксис-обёртку**, потребляя токены
через `var(--x)` в plain-CSS-значениях (R-01 §9, R-02 §4). Ключевой Sass-breaking-change —
«SassScript в значении custom property требует интерполяции»: `--x: $c` **не** компилируется как
ожидается, надо `--x: #{$c}`; интерполяция при этом **срезает кавычки** (для строк — обходить
`meta.inspect()`). Введён в Dart Sass 1.0.0 / LibSass 3.5.0.
Источник: <https://sass-lang.com/documentation/breaking-changes/css-vars/> (доступ 2026-07-13);
<https://sass-lang.com/documentation/style-rules/declarations/> (доступ 2026-07-13).

**Почему это N/A для миграции пилота:** custom properties в пилотах **генерятся не из Sass**, а
codegen'ом (`base-vars.css`) → Sass-файлы их только читают (`var(--x)`), а `var()` — валидный
plain-CSS-токен, интерполяция не нужна. ThemeOn — native-CSS (D16), пилоты Sass у себя
**оставляют** (P5 не выпиливает Sass — это вне скоупа).

**Единственный adversarial-греп для review:** любой Sass-файл пилота, который САМ **объявляет**
custom property из Sass-переменной (`--x: #{$sass}` или ошибочно `--x: $sass`) — такие места
после снятия codegen'а могут стать источником нового значения переменной мимо ThemeOn.
Ожидается 0 совпадений (токены исторически codegen'ились, не из Sass), но проверить:
```
grep -rnE '--[a-z0-9-]+:\s*(#\{|\$)' app/**/*.sass app/**/*.scss
```
Непустой результат = переменная, живущая вне ThemeOn-источника → занести в анализ до parity.
Общий контекст Sass→native-CSS: <https://dev.to/karsten_biedermann/a-practical-migration-handbook-from-sassscss-to-modern-native-css-1l88> (доступ 2026-07-13).

### 10.3 КОД-ФАКТ §6.1 подтверждён в готовом пакете + нюанс `css:false`

R-15 §6.1 рекомендовал «токены `unshift`/'first'». **Это уже реализовано** в `@themeon/nuxt`
(P3, репо `~/projects/packages/themeon`): `packages/nuxt/src/module.ts:55`
`nuxt.options.css.unshift(...FOUNDATION_CSS)` (`FOUNDATION_CSS = ['@themeon/css/tokens.css',
'@themeon/css/index.css']`, `internal/normalize.ts:5`); сгенерированный вариант — тоже `unshift`
(`module.ts:127`). Тест `module.test.ts:19` фиксирует порядок. Т.е. модуль **конструктивно**
кладёт токены с наименьшим приоритетом (грузятся первыми, `@layer`-каскад D8 работает).
Подтверждающий внешний факт механики Nuxt: `injectPosition:'first'` ≡ `css.unshift`, first =
низший приоритет, last перекрывает — <https://tailwindcss.nuxtjs.org/getting-started/module-options/>
(доступ 2026-07-13); паттерн `nuxt.options.css.unshift(resolver.resolve(...))` в модулях —
<https://nuxt.com/docs/4.x/guide/modules/recipes-basics> (доступ 2026-07-13).

**⚠ Нюанс, критичный для dterema (P-D34):** пилоты подключают модуль с **`css: false`** — тогда
ветка `unshift(...FOUNDATION_CSS)` (`module.ts:53–55`) **пропускается**, токены пакет НЕ эмитит.
Для dterema токены доставляет статический `<link href="/styles/base-vars.css">` (CLI-артефакт
`themeon build --aliases legacy-v0`, P-D34). **Значит порядком каскада токенов управляет НЕ
модуль, а размещение этого `<link>` в head пилота** — он обязан идти ДО app-CSS
(`css:['~/styles/app.sass']`). Модульная `unshift`-гарантия здесь не действует (ветка выключена).
Adversarial-review dterema: убедиться, что `<link base-vars.css>` рендерится в SSR-head **раньше**
app-стилей; иначе токены (`@layer themeon.tokens`) окажутся ниже прикладного CSS. (Для vintera
при том же `css:false` — та же логика; плюс Tailwind-мост, §4.)

### 10.4 Prior art для cascade-layers в Nuxt (справочно, вне скоупа P5)

Существует `@web-baseline/nuxt-css-layer` (Nuxt-4-совместим): PostCSS-плагин, читающий слой из
import-query (`a.css?layer=base`) и `<style layer="">`. Источник:
<https://www.npmjs.com/package/@web-baseline/nuxt-css-layer> · <https://github.com/web-baseline/nuxt-css-layer> (доступ 2026-07-13).
**Не адоптировать в P5** — `@themeon/css` объявляет `@layer` первым statement'ом внутри самих
CSS-entry (P-D20), внешний слой-инжектор не нужен; занесено только чтобы детализатор не изобретал.

### 10.5 Версия Tailwind — переподтвердить точный minor на P5.6

Свежий фактчек противоречит пину R-14 (там 4.3.2): versionlog/change-логи на 2026-07 называют
latest **v4.2.446 (2026-04-21)** (<https://versionlog.com/tailwind-css/4.0/> · релизы
<https://github.com/tailwindlabs/tailwindcss/releases>, доступ 2026-07-13). Расхождение
schema-версий (Tailwind публикует и «4.x.y», и внутренние «4.2.NNN») — **не блокер**: `@theme` /
`@theme inline` стабильны на всей v4, семантика §4.1 не меняется. **Действие для P5.6:** исполнитель
делает `npm view tailwindcss version` в живом vintera и целит фактический установленный minor
(паттерн P-D10 «registry — ground truth, окно 2–3 нед»), НЕ хардкодит 4.3.2 из R-14 вслепую.
`@theme inline` — полностью поддержан (<https://tailwindcss.com/docs/theme>, доступ 2026-07-13).

### 10.6 Дельта к «сводке для детализатора» (§8)

Добавить к §8 два пункта, всё остальное §8 в силе:
- **(§8.1-доп)** computed-кросс-чек теперь может enumerate'ить custom props напрямую (Chrome ≥141 /
  FF / Safari) — но declared-diff остаётся обязательным автогейтом; проверить версию браузера раннера.
- **(§8.5-доп)** при `css:false` (P-D34) модульная `unshift`-гарантия порядка ВЫКЛЮЧЕНА — порядок
  токенов задаёт размещение статического `<link base-vars.css>` в head пилота (dterema); это
  предмет adversarial-review, parity по значениям его не ловит.

### 10.7 Источники deepening-pass (все — доступ 2026-07-13)

- Chrome 141 ship custom-property enumeration: <https://groups.google.com/a/chromium.org/g/blink-dev/c/ELhr0cJgb7E> · <https://issues.chromium.org/issues/41451306>
- Enumerate all custom props (актуализировано): <https://css-tricks.com/how-to-get-all-custom-properties-on-a-page-in-javascript/>
- Sass CSS-var breaking change + declarations: <https://sass-lang.com/documentation/breaking-changes/css-vars/> · <https://sass-lang.com/documentation/style-rules/declarations/>
- Nuxt module css.unshift / injectPosition: <https://nuxt.com/docs/4.x/guide/modules/recipes-basics> · <https://tailwindcss.nuxtjs.org/getting-started/module-options/>
- Nuxt cascade-layers prior art: <https://www.npmjs.com/package/@web-baseline/nuxt-css-layer> · <https://github.com/web-baseline/nuxt-css-layer>
- Tailwind v4 latest/@theme: <https://versionlog.com/tailwind-css/4.0/> · <https://github.com/tailwindlabs/tailwindcss/releases> · <https://tailwindcss.com/docs/theme>
- Код-факт пакета: `~/projects/packages/themeon/packages/nuxt/src/module.ts:53–55,125–127` · `internal/normalize.ts:5` · `module.test.ts:19`

---

## 11. Deepening pass 3 (2026-07-13, третья RAG-итерация перед детализацией/исполнением P5)

> Метод тот же (perplexity-web MCP по-прежнему **не подключён**: `claude mcp list` → connected
> только Figma + context7; конфиг `~/.config/perplexity-web-mcp/config.json` есть, daemon не поднят)
> → WebSearch/WebFetch + прямой код-аудит живых пилотов 2026-07-13. Всё ниже — **уточнения,
> подтверждения и один новый guard** к §1–§10, не замена. Ни одно D1–D17 / P-D34–P-D43 не
> пересматривается. Каждый внешний факт — URL + дата доступа. **Ни один item-план P5 не меняется**
> — это review-гварды и подтверждения свежести фактов.

### 11.1 НОВЫЙ guard §4 — Tailwind `dark:`-ВАРИАНТ ≠ механизм theme-переменных (vintera)

R-15 §4 разбирал `@theme inline`-мост (theme-**переменные**) и слом имён утилит (`bg-canvas`).
Не разобран **отдельный** механизм — Tailwind-**вариант** `dark:` (`dark:bg-x`, `dark:text-y`):

- В Tailwind v4 `dark:` **по умолчанию** повешен на `@media (prefers-color-scheme: dark)` — то есть
  на **OS-предпочтение**, а НЕ на класс/атрибут. Ключ `darkMode` из конфига v3 удалён; переключить
  `dark:` на атрибут можно только CSS-директивой:
  `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
  (`:where()` держит специфичность 0). Источники:
  <https://tailwindcss.com/docs/dark-mode> (доступ 2026-07-13);
  <https://schoen.world/n/tailwind-dark-mode-custom-variant> (доступ 2026-07-13).
- **Риск (латентный):** ThemeOn держит состояние темы на атрибуте `data-theme` (D6), НЕ на
  `prefers-color-scheme` и НЕ на классе `.dark`. Значит любой `dark:`-утилити-класс в шаблонах
  vintera реагировал бы на OS-настройку, **рассинхронизированную** с ThemeOn-тумблером (юзер жмёт
  dark → `dark:`-утилиты остаются light, если ОС светлая). Parity по переменным этого НЕ ловит.
- **Код-факт (аудит 2026-07-13):** `grep -rnE '\bdark:[a-z]' app/ --include=*.vue` →
  **0 совпадений** в vintera И **0** в dterema. Значит риск сейчас **не материализован** — это
  **guard, не действие**. В `tailwind.css` vintera нет ни `@custom-variant`, ни `darkMode`,
  ни `data-theme` (подтверждено).
- **Инструкция детализатору (P5.7 / non-goal + adversarial-review):** (1) НЕ вводить
  `@custom-variant dark` в P5, раз `dark:`-утилит нет (лишний код); (2) но **зафиксировать в
  `phases/P5.md` как явный review-guard**: если в ходе миграции кто-то добавит `dark:`-класс, он
  обязан сопровождаться `@custom-variant dark (&:where([data-theme=dark], …))` в `tailwind.css` —
  иначе тёмная тема vintera разъедется по OS-предпочтению. Adversarial-review P5.7 гоняет тот же
  греп и требует остаться на 0 (или guard-директива present).

### 11.2 НОВЫЙ операционный рычаг §6.1/§10.3 — unhead `tagPriority` управляет порядком `<link>`

§10.3/P-D40 верно фиксируют: при `css:false` порядок каскада токенов задаёт **позиция**
`<link base-vars.css>` в SSR-head, а модульная `unshift`-гарантия выключена. Не назван **рычаг**,
которым порядок чинится, если adversarial-review найдёт `<link>` НИЖЕ app-CSS:

- Nuxt рендерит head через **unhead**, который сортирует теги по `tagPriority`
  (`number | 'critical' | 'high' | 'low' | 'before:<key>' | 'after:<key>'`; меньше число = раньше
  в документе). Источники: <https://unhead.unjs.io/docs/head/guides/core-concepts/positions>
  (доступ 2026-07-13); <https://nuxt.com/docs/4.x/api/composables/use-head> (доступ 2026-07-13);
  известное ограничение «нельзя ставить ПОСЛЕ Nuxt-тегов» — <https://github.com/nuxt/nuxt/issues/22082>
  (доступ 2026-07-13).
- **Код-факт:** dterema объявляет токен-`<link>` в `nuxt.config.ts` `app.head.link[...]`
  (`{ rel:'stylesheet', href:'/styles/base-vars.css' }`, стр. 29) **без** `tagPriority`. Если в
  SSR-head он окажется после бандл-CSS — **фикс: добавить `tagPriority: 'critical'`** (или
  `'before:...'` со ссылкой на ключ app-стиля) этой же записи. Правка **локальна и не трогает
  значения** → parity остаётся зелёным.
- **Инструкция детализатору:** P5.4/P5.9 adversarial-review уже требует проверить порядок в
  SSR-head (P-D40); добавить в remediation-ноту, что рычаг починки — `tagPriority` на head.link,
  а не переезд на `css:[]` (переезд сменил бы канал → FOUC-риск, чего P5.md избегает намеренно,
  стр. 15 «канал `<link>` сохраняется байт-в-байт»).

### 11.3 ПОДТВЕРЖДЕНИЕ §4.1 — семантика `@theme inline` (прямая цитата мейнтейнера)

Рассуждение §4.1 («self-referential `@theme inline { --x: var(--x) }` корректен, non-inline дал бы
дубль-`:root`») подтверждено первоисточником. Мейнтейнер в #18560: *«С `@theme inline` вы сами
отвечаете за override переменной, т.к. глобальной переменной не существует; с `@theme` значение
встраивается в глобальную переменную, и её можно переопределить позже»*. Ключ для ThemeOn:
inline **инлайнит значение в утилиту**, а значение — это `var(--runtime-token)` (тот, что ThemeOn
эмитит в `:root`/`[data-theme]`), поэтому dark-override работает через **рантайм-переменную**, а не
через theme-переменную; глобального дубля Tailwind не создаёт. Источник (fetch 2026-07-13):
<https://github.com/tailwindlabs/tailwindcss/discussions/18560>. **§4.1 / P-D31 в силе без правок.**

> Общий готча (подтверждён): plain `@theme` со статическим значением «печёт» его на build →
> dark-mode «молча ничего не делает». Именно поэтому мост ThemeOn всегда `@theme inline` (P4.1).

### 11.4 ПОДТВЕРЖДЕНИЕ §10.5 / P-D42 — живая версия Tailwind в vintera = **4.3.0**

Прямой замер: `node -e "require('./node_modules/tailwindcss/package.json').version"` в
`~/projects/vintera/vintera` → **`4.3.0`**. Это снимает расхождение пинов (R-14 хардкод `4.3.2`;
§10.5 latest-фактчек `4.2.446`) — **фактически установлен `4.3.0`** (совпадает с P-D42). `@theme` /
`@theme inline` стабильны на всей v4, семантика §4.1 от minor не зависит
(<https://tailwindcss.com/docs/theme>, доступ 2026-07-13). **Действие P5.7 (P-D10):** исполнитель
переподтверждает `npm view`/локальный замер на момент старта, целит установленный minor, НЕ
хардкодит из research.

### 11.5 РЕИНФОРС §6.2 — `storageKey='theme'` уже в P5.md; корневая причина и почему обязателен

Continuity ключа персиста УЖЕ прописан в `phases/P5.md` (P5.4 стр. 588–589, 622; P5.9 стр. 960–961)
— здесь только корневая причина из кода пакета, чтобы sonnet понимал, почему это не косметика:

- **Код-факт:** `@themeon/vue` дефолт `DEFAULT_STORAGE_KEY = 'themeon-theme'`
  (`packages/vue/src/defaults.ts:8`); `@themeon/nuxt` `MODULE_DEFAULTS.storageKey = 'themeon-theme'`
  (`packages/nuxt/src/internal/normalize.ts:14`). Оба пилота персистят под ключом **`'theme'`**
  (`app/composables/useTheme.ts` `STORAGE_KEY='theme'` — dterema стр. 12, vintera стр. 4).
- **Если не задать `themeon: { storageKey: 'theme' }`** — вернувшиеся юзеры (сохранённый `'theme'`)
  прочитаются ThemeOn'ом из `'themeon-theme'` (пусто) → сброс на `prefers-color-scheme` при первой
  загрузке после деплоя. **Parity по переменным этого НЕ ловит; чистый-браузер визуал-тест тоже
  НЕ ловит** (у него нет сохранённого ключа ни там, ни там) — только у returning-user.
- **Одна опция чинит и рантайм, и анти-FOUC:** `toPublicRuntimeConfig` (для `useTheme`) и
  `toAntiFoucConfig` (для head-скрипта) **оба** читают `options.storageKey ?? default`
  (`normalize.ts:28,46`) — значит `storageKey:'theme'` синхронизирует composable И FOUC-скрипт
  одним значением (D6-инвариант «один источник ключа»). `attribute` (`data-theme`) и имена тем
  (`light`/`dark`) у пилотов уже совпадают с дефолтами ThemeOn → доп-настройка не нужна.

### 11.6 ПОДТВЕРЖДЕНИЕ §6.2/§6.3 — механика отключения color-mode `@bg-dev/nuxt-naiveui`

R-15 §6.2/§6.3 требуют «отключить/не использовать» встроенную color-mode-систему (R-01 §5, две
системы). Конкретика механизма (для исполнителя P5.4/P5.9):

- Вторая система — композабл **`useNaiveColorMode`** модуля `@bg-dev/nuxt-naiveui` (cookie + класс
  `dark`, R-01 §5). Он самостоятелен; ThemeOn-`useTheme` (атрибут `data-theme` + localStorage) — не
  синхронизирован с ним конструктивно.
- Практика: НЕ монтировать `NaiveColorModeSwitch`, НЕ вызывать `useNaiveColorMode`; при
  использовании `NaiveConfig`-компонента модуля дефолтные темы гасятся `defaults: false`; в
  `nuxt.config` предпочтение фиксируется `naiveui.colorModePreference`. Источники:
  <https://nuxt-naiveui.bg.tn/composables/useNaiveColorMode.html> ·
  <https://nuxt-naiveui.bg.tn/components/naive-config.html> ·
  <https://www.npmjs.com/package/@bg-dev/nuxt-naiveui> (доступ 2026-07-13).
- Для P5 достаточно **не вызывать** `useNaiveColorMode` и вести тему только через ThemeOn — это
  поведенческий (не переменный) diff, предмет визуал-review, не parity-гейта (как и отмечено §6.2).

### 11.7 ПОДТВЕРЖДЕНИЕ §10.1 — enumeration custom properties в Chrome 141 остаётся актуальным

Повторная сверка: custom-property enumeration в `getComputedStyle()` зашиплен в **Chrome 141**
(Firefox/Safari баг не имели). Для secondary computed-кросс-чека (§2.2) на актуальном раннере
можно перечислять `--*` напрямую; **declared-diff остаётся primary-автогейтом**. VERIFY версии
Chromium в Playwright-раннере sandbox на исполнении (< 141 → fallback на known-name-список).
Источник (без изменений): <https://groups.google.com/a/chromium.org/g/blink-dev/c/ELhr0cJgb7E>
(доступ 2026-07-13). Дельта к §10.1 нет — только подтверждение свежести.

### 11.8 Дельта к «сводке для детализатора» (§8 / §10.6)

Добавить к §8 (всё прежнее в силе):
- **(§8.3-доп, guard)** Tailwind `dark:`-вариант: в обоих пилотах **0** `dark:`-классов сегодня →
  guard, не действие; при появлении `dark:` требуется `@custom-variant dark (&:where([data-theme=dark],…))`,
  иначе тёмная тема vintera разъедется по OS-предпочтению (§11.1). Adversarial-review P5.7.
- **(§8.5-доп, рычаг)** если SSR-head кладёт `<link base-vars.css>` ниже app-CSS — чинить
  `tagPriority:'critical'` на `app.head.link`-записи (unhead), НЕ переездом на `css:[]` (§11.2).
- **(§8.6-доп, факт)** живой Tailwind vintera = `4.3.0` (§11.4, подтверждает P-D42).
- **(§8-подтв.)** `storageKey:'theme'` — не косметика: дефолт пакета `'themeon-theme'`, одна опция
  чинит и рантайм, и FOUC-скрипт; уже в P5.md (§11.5).

### 11.9 Источники deepening-pass 3 (все — доступ 2026-07-13)

- Tailwind dark mode / `@custom-variant` (data-theme): <https://tailwindcss.com/docs/dark-mode> · <https://schoen.world/n/tailwind-dark-mode-custom-variant> · <https://tailwindcss.com/docs/theme>
- Tailwind `@theme` vs `@theme inline` (цитата мейнтейнера): <https://github.com/tailwindlabs/tailwindcss/discussions/18560>
- unhead / Nuxt tagPriority (порядок head-тегов): <https://unhead.unjs.io/docs/head/guides/core-concepts/positions> · <https://nuxt.com/docs/4.x/api/composables/use-head> · <https://github.com/nuxt/nuxt/issues/22082>
- @bg-dev/nuxt-naiveui color-mode: <https://nuxt-naiveui.bg.tn/composables/useNaiveColorMode.html> · <https://nuxt-naiveui.bg.tn/components/naive-config.html> · <https://www.npmjs.com/package/@bg-dev/nuxt-naiveui>
- Chrome 141 custom-property enumeration (подтверждение): <https://groups.google.com/a/chromium.org/g/blink-dev/c/ELhr0cJgb7E>
- Код-факты (аудит 2026-07-13): vintera/dterema `grep -rnE '\bdark:[a-z]' app/ --include=*.vue` → 0/0 · vintera `node_modules/tailwindcss` → `4.3.0` · пилоты `app/composables/useTheme.ts` `STORAGE_KEY='theme'` · пакет `packages/vue/src/defaults.ts:8` (`'themeon-theme'`) · `packages/nuxt/src/internal/normalize.ts:14,28,46` · `packages/nuxt/src/types.ts:10,16` (опции `storageKey`/`attribute`)
