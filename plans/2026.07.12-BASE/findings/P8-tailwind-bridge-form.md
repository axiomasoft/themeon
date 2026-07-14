# P8 — Каноническая форма Tailwind v4-моста `@themeon/tailwind`

**Статус:** design-разведка (read-only, `packages/**` не тронут).
**Дата:** 2026-07-14.
**Метод:** реальная компиляция Tailwind (`@tailwindcss/node@4.3.2`, `compile()` — тот же движок, что в `packages/tailwind/src/tailwind-compile.test.ts`) × реальный браузер (**Chrome 150.0.7871.114 headless**, computed-стили через CDP `Runtime.evaluate` + `Emulation.setDeviceMetricsOverride`). Проверялись **вычисленные значения** (`getComputedStyle`), не текст CSS.
**Вход:** `90_audit/AUDIT_2026-07-14_research-conformance.md` §§4, 5, 28.

> ⚠️ `20_research/R-14 §2.1` («`@theme inline` НЕ создаёт глобальную переменную») — **ложная посылка**, эмпирически опровергнута (см. §2). В этом документе R-14 источником не является.

**Пин Tailwind (зафиксирован):** `pnpm-workspace.yaml` catalog → `tailwindcss: 4.3.2`, `@tailwindcss/node: 4.3.2`, `@tailwindcss/vite: 4.3.2`; в сторе — `node_modules/.pnpm/tailwindcss@4.3.2`, `@tailwindcss+node@4.3.2`, `@tailwindcss+oxide@4.3.2`. Все выводы ниже относятся к 4.3.2.

---

## 0. RAG-источники

| # | Факт | URL | Дата |
|---|---|---|---|
| S1 | `inline` меняет только утилиту: «Using the `inline` option, the utility class will use the theme variable **value** instead of referencing the actual theme variable» | https://tailwindcss.com/docs/theme (§Referencing other variables) | проверено 2026-07-14 (nav: v4.3) |
| S2 | Adam Wathan (**MEMBER**, 2025-05-01): «If you use `inline`, the actual value of the theme variable is inlined into the utility, instead of referencing a variable»; «I would personally only use `inline` when things don't work without it» | https://github.com/tailwindlabs/tailwindcss/discussions/17826 | проверено 2026-07-14 |
| S3 | Tree-shaking: «By default **only used CSS variables will be generated** in the final CSS output… use the `static` theme option» | https://tailwindcss.com/docs/theme (§Generating all CSS variables) | проверено 2026-07-14 |
| S4 | Robin Malfait (**MEMBER**, 2025-05-01): «Unfortunately in CSS **you can't use CSS variables in media queries** like that. That's one of the reasons why you have to use `theme(…)` to inline the value» + показан ровно наш баг: `@media (width >= var(--breakpoint-md))` | https://github.com/tailwindlabs/tailwindcss/discussions/17841 | проверено 2026-07-14 |
| S5 | «The `var()` function can not be used as property names, selectors, or **anything else besides property values**» | https://www.w3.org/TR/css-variables-1/ (§3) | CR Snapshot 2022-06-16; проверено 2026-07-14 |
| S6 | То же, MDN | https://developer.mozilla.org/en-US/docs/Web/CSS/var | last mod. 2026-05-06; проверено 2026-07-14 |
| S7 | Companion font-size: «You can also provide default `line-height`, `letter-spacing`, and `font-weight` values for a font size: `--text-tiny--line-height: 1.5rem`» | https://tailwindcss.com/docs/font-size (§Customizing your theme) | проверено 2026-07-14 |
| S8 | `[data-theme=dark]` — документированный хук dark-варианта | https://tailwindcss.com/docs/dark-mode (§Using a data attribute) | проверено 2026-07-14 |
| S9 | Исходники 4.3.2: полный список опций `@theme` — `inline`, `reference`, `default`, `static`, `prefix(…)` (парсер `src/index.ts:86-105`); `reference` **никогда не эмитит** переменные (`src/index.ts:655-656`: `if (value.options & ThemeOptions.REFERENCE) continue`); breakpoint-вариант подставляет значение темы **строкой** в media-условие (`src/variants.ts:1041-1046`); при `reference` утилита получает `var(--x, <theme value>)` с fallback (комментарий `src/theme.ts:200-205`) | tag `v4.3.2`, tailwindlabs/tailwindcss | проверено 2026-07-14 |

**Расхождения в источниках (важно):**
- **Документация молчит** про `@theme reference`, про комбинации опций, про `default`/`prefix()`, про форму `@import "tailwindcss" theme(reference)` и про `var(--tw-leading, …)`-слот. Всё это установлено по исходникам 4.3.2 + эмпирикой.
- В S2 Adam показывает, что `@theme inline` **всё равно** эмитит `--color-potato` в `:root, :host`. На 4.3.2 — не эмитит. Оба верны: `inline` **не подавляет** эмиссию; переменная исчезает из-за tree-shaking (S3), потому что на неё больше никто не ссылается. `@theme static inline` это разводит (эмитит И инлайнит). **Это ключ к пониманию Blocker #5** (см. §2).
- Часто цитируемый ответ в discussion #18560 — от **rozsazoltan (CONTRIBUTOR, не мейнтейнер)**. Как источник «канона» не годится.
- Ни W3C, ни MDN не говорят дословно «var() не работает в media-query»; они говорят строго сильнее — var() допустим **только** в значениях свойств. Дословная формулировка про media-queries есть у мейнтейнера (S4).

---

## 1. Механика (эмпирически, 4.3.2)

Утилита получает `var()` или литерал — это решает `inline`. Эмиссию в `:root, :host` решает **tree-shaking + `reference`/`static`**, а не `inline`:

| форма `@theme` | эмиссия в `:root, :host` | что попадает в утилиту |
|---|---|---|
| `@theme { --color-x: <лит> }` | **да** (если переменная используется) | `var(--color-x)` |
| `@theme static { … }` | **да, всегда** | `var(--color-x)` |
| `@theme inline { --color-x: <лит> }` | нет (никто не ссылается → tree-shaken) | **литерал** |
| `@theme inline { --color-x: var(--color-x) }` | **ДА** — утилита ссылается на `--color-x`, tree-shaker считает её used → эмитит **с её же значением** → `--color-x: var(--color-x)` (**цикл**) | `var(--color-x)` |
| `@theme inline { --color-a: var(--color-b) }` | нет (`--color-a` никем не используется) | `var(--color-b)` |
| `@theme reference { --color-x: <лит> }` | **никогда** | `var(--color-x, <лит>)` |

**Blocker #5 объяснён точно:** цикл рождается не из `inline` как такового, а из **совпадения имени ключа и имени, на которое ссылается значение** (self-reference). Tree-shaker видит `var(--color-x)` в утилите → помечает `--color-x` used → эмитит её со значением `var(--color-x)`.

**Blocker #4 объяснён точно:** `--breakpoint-*` вообще не ходит через var-путь. `variants.ts:1041-1046` подставляет **строку значения** в `@media (width >= ${value})`. Что бы ты ни положил в значение (`inline` или нет) — оно попадёт в media-условие дословно. `var(...)` там невалиден (S5/S6) → правило молча отбрасывается браузером. Функциональные `min-*`/`max-*` варианты от этого защищены (`if (value.includes('var(')) return null`), а именованные `sm:`/`md:` — **нет**.

---

## 2. Матрица: кандидаты × 5 требований

Каждая клетка — **вычисленное браузером значение**, не текст CSS. Проверка идёт для **трёх порядков подключения**:
`O1` = `tailwindcss` → `bridge` → `tokens` (текущая фикстура); `O2` = `tokens` → `tailwindcss` → `bridge`; `O3` = layer-statement `@themeon/css` → `tokens` → `tailwindcss` → `bridge` (реальный `import '@themeon/css'` в `main.ts`).
Дополнительно — «link-order»-прогон, где `tokens.css` **вообще вне import-графа Tailwind** (отдельный `<link>` до/после бандла).

Требования: **U1** утилиты живы с теми же именами классов (`bg-action-primary`, `p-md`, `text-2xl`) · **U2** `[data-theme=dark]` реально перекрашивает утилиту · **U3** нет цикла в `:root,:host` (замер: `getComputedStyle(:root).--color-action-primary` не пуст) · **U4** `md:` даёт `@media (width >= 48rem)`-литерал и реально применяется на 1000px и не применяется на 400px · **U5** companion `--text-2xl--line-height` работает (`line-height: 30px` при `font-size: 24px`).

| # | Кандидат | O1 | O2 | O3 | U1 | U2 | U3 | U4 | U5 | Итог |
|---|---|---|---|---|---|---|---|---|---|---|
| **C0** | **текущий код**: `@theme inline { --x: var(--x) }`, breakpoint внутри | ч | ✗ | ✗ | ✗ | ✗ | ✗ | **✗** | ✗ | **FAIL** |
| C1 | `inline` self-ref без breakpoint + `@theme` с литеральными breakpoint | ч | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | **FAIL** |
| C2 | `inline` с разными именами (fallback P-D31: `--color-primary: var(--color-action-primary)`) | ч | ч | ч | **✗** | — | ✓ | ✗ | ✗ | **FAIL** |
| C3 | обычный `@theme` с литералами | ✓ | ✗ | ✗ | ✓ | **✗** | ✓ | ✓ | ✓ | **FAIL** |
| C4 | `@theme static` с литералами | ✓ | ✗ | ✗ | ✓ | **✗** | ✓ | ✓ | ✓ | **FAIL** |
| C6 | `@theme inline` с литералами | ✗ | ✗ | ✗ | ✓ | **✗** | ✓ | ✓ | ✓ | **FAIL** |
| C7 | префикс токенов (`--to-color-*`) + `inline` с разными именами | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS*, но ломает var-контракт |
| C5 | **`@theme reference`** с литералами | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PASS (кроме shadow, см. §3) |
| **C9** | **`@theme reference`: литералы + `shadow-*` как `var()`** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS — ВЕРДИКТ** |

(`ч` = частично: часть требований проходит.)

### Чем доказан провал каждого отвергнутого

**C0 (текущий код) — оба Blocker'а воспроизведены на вычисленных стилях:**

| порядок | `.bg-action-primary` background-color | `--color-action-primary` в `:root` | `.p-md` padding | `.md:bg-action-primary` @1000px |
|---|---|---|---|---|
| O1 | `oklch(0.55 0.15 155)` → dark `oklch(0.75 …)` ✓ | `oklch(0.55 0.15 155)` | `16px` | **`rgba(0,0,0,0)` — НЕ ПРИМЕНЕНО** |
| O2 | **`rgba(0,0,0,0)`** | **(пусто)** | **`0px`** | `rgba(0,0,0,0)` |
| O3 | **`rgba(0,0,0,0)`** | **(пусто)** | **`0px`** | `rgba(0,0,0,0)` |

- **#4:** в O1 всё «работает», кроме `md:` — сгенерировано `@media (width >= var(--breakpoint-md))`, браузер отбросил блок → фон не применён ни на 1000px, ни на 400px. Все `md:`/`lg:` мертвы. Compile-тест пакета этого не видит: он билдит только `['bg-action-primary']`.
- **#5:** в O2/O3 (`tokens.css` подключён до Tailwind) `@layer themeon.tokens` объявлен **раньше** `@layer theme` → выигрывает `theme` → в `:root` остаётся `--color-action-primary: var(--color-action-primary)` → цикл → *invalid at computed-value time* → **пусто**. Гибнут не только Tailwind-утилиты (`padding: 0px`), но и любой рукописный `var(--color-*)`. Ни ошибки сборки, ни warning'а.
- **link-order-прогон** (tokens отдельным `<link>` **до** бандла): `bg = rgba(0,0,0,0)`, `--color-action-primary = (пусто)` — тот же коллапс без всякого `@import`.

**C1** — чинит только #4. В O2/O3 тот же полный коллапс (цикл никуда не делся).

**C2 (fallback P-D31 из плана)** — **ломает публичный контракт имён классов**: замер показал `.bg-action-primary → rgba(0,0,0,0)`, а работает `.bg-primary → oklch(0.55 0.15 155)`. Т.е. `--color-action-primary` → класс `bg-primary`. Чтобы сохранить `bg-action-primary`, LHS обязан быть ровно `--color-action-primary` → self-reference → цикл. **Fallback-план P-D31 в его записанном виде нереализуем без слома имён классов.** (Плюс в C2 переименованы только цвета — spacing остался self-ref и в O2/O3 продолжал убивать `p-md`: `padding: 0px`.)

**C3 / C4 (`@theme` / `@theme static` с литералами)** — **U2 падает при обратном порядке**: Tailwind эмитит `:root{--color-action-primary: <светлый литерал>}` в `@layer theme`; специфичность `:root` и `[data-theme="dark"]` одинакова (0,1,0) → решает порядок слоёв; в O2/O3 `theme` объявлен позже `themeon.tokens` → выигрывает Tailwind → **dark не перекрашивает**: `bgLight == bgDark == oklch(0.55 0.15 155)`. Это ровно та ловушка, из-за которой в плане и появилось «inline обязателен». Итог: не «inline vs non-inline», а **эмиссия vs не-эмиссия**.

**C6 (`inline` + литералы)** — утилита получает литерал: `.bg-action-primary { background-color: oklch(0.55 0.15 155) }`. Dark мёртв во **всех** порядках (`bgLight == bgDark`). Подтверждает исходную интуицию плана, но не спасает.

**C7 (префикс `--to-*` + `inline` с разными именами)** — функционально зелёный во всех трёх порядках (эмиссии нет: `--color-action-primary` никем не используется → tree-shaken). **Но** требует переименовать ВСЕ публичные переменные ThemeOn (`--color-text` → `--to-color-text`), т.е. сломать `packages/css/src/contract.ts`, весь рукописный CSS компонентов, `themeVars`, naive-адаптер и пилотную миграцию. Цена несопоставима с выигрышем **нуля** (C9 даёт то же самое, ничего не ломая). Отвергнут.

---

## 3. Единственный нюанс, который разделил C5 и C9: `shadow-*`

Tailwind **разбирает** значение `--shadow-*` на этапе сборки (чтобы подставить `--tw-shadow-color` для модификаторов вида `shadow-black/25`). Поэтому форма значения меняет семантику:

| форма | что в утилите | dark-своп `--shadow-md` доходит? | модификатор цвета тени |
|---|---|---|---|
| значение = литерал (C5) | `--tw-shadow: 0 2px 8px var(--tw-shadow-color, oklch(0 0 0/.15))` | **НЕТ** (значение запечено) | да |
| значение = `var(--shadow-md)` (C9, и так же в текущем C0) | `--tw-shadow: var(--shadow-md)` | **ДА** | нет |

Замер (тема с `dark: { shadow: { md: '0 8px 32px oklch(0 0 0 / 0.8)' } }`, computed `box-shadow`):
- C5: light `oklch(0 0 0/0.15) 0px 2px 8px` → dark **тот же** → `shadowSwaps: NO`.
- C9: light `… 0px 2px 8px` → dark `oklch(0 0 0/0.8) 0px 8px 32px` → `shadowSwaps: YES`.

`shadow` — **единственный** namespace ThemeOn с таким поведением: `color`/`spacing`/`radius`/`text`/`leading`/`tracking`/`font`/`font-weight`/`ease` под `reference` все дают `var(--x, <лит>)` и свопятся. Поэтому канон = C9: `reference` + литералы **везде, кроме `shadow-*`**. Это сохраняет сегодняшнюю семантику `shadow` (C0 тоже эмитит `--tw-shadow: var(--shadow-md)`), т.е. **регрессии нет ни в чём**.

---

## 4. ВЕРДИКТ — каноническая форма моста

> **`@theme reference` с литеральными значениями; `shadow-*` — значением-`var()`; `breakpoint-*` — обязательно литералом; companion-переменные (`--x--line-height`) включать.**

Почему именно `reference`: он единственный **конструктивно** снимает конфликт — Tailwind **не эмитит** ни одной переменной ThemeOn (`@layer theme { :root, :host { … } }` содержит только собственные дефолты Tailwind), поэтому **порядка подключения CSS больше не существует как проблемы**: перебивать нечего. Утилита получает `var(--color-x, <литерал>)` — своп `[data-theme=dark]` из `tokens.css` доходит, а литерал остаётся graceful-fallback'ом, если `tokens.css` не подключён. Имена классов **не меняются**.

### Эталонный кусок генератора (`packages/tailwind/src/bridge.ts`)

```ts
/** Namespace'ы, значение которых Tailwind разбирает на этапе сборки → значение обязано быть var(),
 *  иначе runtime-своп темы до утилиты не доходит (эмпирика 4.3.2: только shadow). */
const VALUE_PARSED_NAMESPACES = new Set(['shadow'])

/** Namespace'ы, чьё значение Tailwind подставляет строкой в @media → var() там невалиден (S4/S5). */
const LITERAL_ONLY_NAMESPACES = new Set(['breakpoint'])

export function tailwindBridge(resolved: ResolvedTheme, opts?: TailwindBridgeOptions): string {
  // …сбор имён и фильтрация по namespace — без изменений (matchNamespace, longest-prefix)…
  const lines = filtered.map((name) => {
    const ns = matchNamespace(name, namespaces)!
    const literal = literalValueOf(resolved, name) // базовое значение; для var-chain — резолвленное
    if (LITERAL_ONLY_NAMESPACES.has(ns)) return `  ${name}: ${literal};`   // --breakpoint-md: 48rem;
    if (VALUE_PARSED_NAMESPACES.has(ns))  return `  ${name}: var(${name});` // --shadow-md: var(--shadow-md);
    return `  ${name}: ${literal};`                                         // --color-x: oklch(…);
  })
  // ЕДИНСТВЕННЫЙ блок; `inline` не эмитится НИКОГДА.
  return `${BANNER}\n@theme reference {\n${lines.join('\n')}\n}\n`
}
```

Обязательные свойства генератора:
1. **`@theme reference`** — единственная форма. `@theme inline` / `@theme` / `@theme static` в генераторе **запрещены** (переворачивает P-D31: запрет теперь на `inline`, а не на non-inline).
2. **Namespace-набор не меняется** (`TAILWIND_NAMESPACES`, longest-prefix-матчинг сохраняется): `breakpoint` **остаётся** в мосте — но эмитится литералом (без него `md:`/`lg:` не сгенерируются вовсе).
3. **`--shadow-*` — `var(--shadow-*)`** (единственное исключение из «литерал»).
4. **Companion `--text-*--line-height` включать** (finding #28 — включение правильное; ТЗ P4.1 «исключать» **отменить**). Замер: с companion → `line-height: var(--tw-leading, var(--text-2xl--line-height, 1.25))`; без него → `var(--tw-leading, var(--text-2xl--line-height))` (работает, но без build-time fallback'а). Включение строго лучше. Требует записи в Known Deviations, а не молчаливого расхождения.
5. Значение-литерал берётся из `resolved.vars[name] ?? token.value`. Для токена, которого нет в базе (существует только в патче темы), литерал = значение патча — это лишь fallback (см. остаточные риски).

### Обязательные интеграционные тесты (реальная компиляция + проверка эффекта)

Текущий `tailwind-compile.test.ts` пропустил оба Blocker'а: он билдил только `['bg-action-primary']` (ни одного responsive-варианта) и **истолковал цикл как успех** (`selfRefCount === 1` = «нет дубля»). Минимум:

1. **`md:`/`lg:` — литерал в media**: `result.build(['md:bg-action-primary'])` → `expect(out).toMatch(/@media \(width >= 768px\)/)` (значение брейкпоинта фикстуры — литерал темы: `48rem`, если фикстура в rem) и **обязательный негативный ассерт** `expect(out).not.toMatch(/@media[^{]*var\(/)` — `var(` в любом `@media` = провал.
2. **Нулевая эмиссия**: вырезать `@layer theme { :root, :host { … } }` из выхода и утверждать, что там **нет ни одного** имени из `resolved.tokens`. (Замена сегодняшнего `selfRefCount === 1`, который закреплял баг.)
3. **Анти-цикл**: `expect(out).not.toMatch(/--([\w-]+):\s*var\(--\1\)/)` — самоссылка любой переменной вне `shadow`-namespace.
4. **Инвариантность к порядку** — компиляция **трёх** входов (`O1`/`O2`/`O3` из §2) и сравнение: набор утилит и `@layer theme`-блок обязаны совпадать; ни в одном порядке `--color-*` не должен объявляться Tailwind'ом.
5. **Эффект в браузере** (или честно эмулированный каскад): `.bg-action-primary` меняет computed background-color при `[data-theme=dark]`; `.p-md` = 16px; `.text-2xl` = 24px/30px; `.md:bg-action-primary` применён на 1000px и НЕ применён на 400px. Без этого шага текстовые ассерты снова пропустят «CSS сгенерирован, но не действует».
6. **Companion**: `.text-2xl` эмитит обе строки (`font-size` + `line-height`).
7. **`shadow-md`** свопится под `[data-theme=dark]` (защита от отката к литералу).

---

## 5. Остаточные риски

1. **Fallback устаревает.** `var(--color-x, <литерал>)` запекает литерал в бандл. Если `tokens.css` пересобрали, а Tailwind-бандл — нет, fallback разойдётся с темой. Практически безвреден: fallback срабатывает, **только** если `--color-x` не объявлена вообще (т.е. `tokens.css` не подключён). Оба артефакта генерятся одним `themeon build` — держать их в одном шаге сборки.
2. **Токен, живущий только в патче темы** (`include: 'all'` union): его fallback = значение тёмной темы. В светлой теме, если `tokens.css` не подключён, `bg-*` такого токена возьмёт тёмное значение. Крайний край; альтернатива — не включать в мост имена, которых нет в базе (сузит `include` до `'base'`), но тогда пропадёт утилита. Оставить union, задокументировать.
3. **`shadow-<color>`-модификаторы** (`shadow-md shadow-black/25`) с `var()`-значением тени не работают — но они не работают и сегодня (C0 эмитит то же `--tw-shadow: var(--shadow-md)`). Не регрессия; если понадобятся — придётся выбирать между ними и runtime-свопом теней.
4. **`@theme reference` не документирован** (docs молчат; поведение подтверждено исходниками 4.3.2 `src/index.ts:655-656` + эмпирикой). Это внутренне-стабильная, но не контрактная опция: **пин Tailwind обязателен**, а тест №2 («нулевая эмиссия») — сторож на случай изменения семантики в 4.4+.
5. **Breakpoints принципиально не runtime-темизируемы** (S4, мейнтейнер): значение уходит в `@media` литералом. Смена брейкпоинтов на лету через `[data-theme]` невозможна ни при какой форме моста — это ограничение Tailwind, а не ThemeOn. `--breakpoint-*` в `tokens.css` остаётся (для `@custom-media` и рукописного CSS), но на утилиты `md:` он не влияет.
6. **`@supports not (color-mix())`-ветка** opacity-модификаторов (`bg-action-primary/50`) запекает светлый литерал: `color-mix(in srgb, oklch(0.55 …) 50%, transparent)`. Основная ветка использует `var()` и свопится. Затрагивает только браузеры без `color-mix` — вне Baseline-политики проекта.

---

## 6. Артефакты прогона

Скретчпад (`…/434caa2c-…/scratchpad/exp/`): `theme.mjs` (фикстура + 8 генераторов моста), `compile.mjs` (8 кандидатов × 3 порядка = 24 реальные компиляции), `cdp.mjs` (Chrome 150 headless, computed-стили на 1000px и 400px), `link-order.mjs` (tokens вне import-графа), `shadow.mjs`, `hybrid.mjs` (C5/C8/C9), `companion.mjs`; сырьё — `out/computed.json`, `out/*/out.css`.
