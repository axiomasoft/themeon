# P8 — Канон `@themeon/css` (соседство с Tailwind, самодостаточность composition) и `themeon check` (пороги контраста, исключения скана)

**Статус:** design-разведка (read-only, `packages/**` не тронут).
**Дата:** 2026-07-14.
**Метод:** только прогон/рендер. Реальный компилятор Tailwind v4.3.2 (`@tailwindcss/node@4.3.2`, `compile()` — тот же вход, что у `@tailwindcss/vite`/PostCSS-плагина) + headless Chrome (`google-chrome-stable --headless --dump-dom`, computed-стили) + реальный код пакетов (`packages/*/dist`).
**Вход:** `90_audit/AUDIT_2026-07-14_research-conformance.md` §§16, 22, 23, 26.
**Скретчпад:** `…/434caa2c-…/scratchpad/tw/` (`run.mjs` — 4 рецепта соседства, `run2.mjs` — без Preflight + entry пакета, `run3.mjs` — baseline + composition без reset, `run4.mjs` — sidebar/switcher, `run5.mjs` — финальный фикс composition, `run6.mjs` — кросс-чек с мостом), `…/cli/run.mjs` (init→build→check), `…/contrast.mjs`, `…/ladder.mjs`, `…/target.mjs`.

---

## 0. RAG-источники

| # | Документ | URL | Дата проверки |
|---|---|---|---|
| S1 | Tailwind v4 **Preflight** (что делает; в каком слое; как отключить) | https://tailwindcss.com/docs/preflight | 2026-07-14 |
| S2 | Tailwind v4 **Styling with utilities → cascade layers** (`@import "tailwindcss"` = `theme/base/components/utilities`) | https://tailwindcss.com/docs/styling-with-utilities#using-cascade-layers | 2026-07-14 |
| S3 | Реальный `preflight.css` 4.3.2 (первоисточник, не дока) | `node_modules/.pnpm/tailwindcss@4.3.2/…/preflight.css` | 2026-07-14 |
| S4 | **CSS Cascade 5** — `@layer`-statement до `@import`; unlayered > layered | https://www.w3.org/TR/css-cascade-5/ | 2026-07-14 |
| S5 | **APCA in a Nutshell** — Bronze Simple Mode: Lc 90/75/60/45/30/15 и их назначение | https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html | 2026-07-14 |
| S6 | APCA Easy Intro (тот же набор порогов, развёрнуто) | https://git.apcacontrast.com/documentation/APCAeasyIntro.html | 2026-07-14 |
| S7 | Tailwind discussion: третья библиотека между `base` и `utilities` | https://github.com/tailwindlabs/tailwindcss/discussions/13188 | 2026-07-14 |

**Ключевые цитаты.**
- S3 (факт, не доктрина): `h1,h2,h3,h4,h5,h6 { font-size: inherit; font-weight: inherit; }` и `button, input, … { font: inherit; border-radius: 0; background-color: transparent; box-shadow: none; }` — оба в `@layer base`.
- S1: отключение Preflight = **не импортировать** `tailwindcss/preflight.css` (импортировать `theme.css` + `utilities.css` раздельно).
- S5 (дословно): Lc **75** — «the minimum level for columns of body text»; Lc **60** — «minimum for content text that is not body, column, or block text»; Lc **45** — «larger, heavier text (36px normal / 24px bold) … pictograms with fine details, or smaller outline icons»; Lc **30** — «absolute minimum for any text not listed above» + «large/solid semantic & understandable non-text elements»; Lc **15** — «non-semantic non-text … dividers, and in some cases large buttons or thick focus-visible outlines».
- S4/S2: пустой `@layer a, b, c;` (statement без блока) **легален до `@import`**; unlayered-правила сильнее любых layered того же origin.

---

## 1. Соседство с Tailwind v4 (аудит #16) — рецепт установлен ЭМПИРИЧЕСКИ

### 1.1 Измерения (Chrome, computed-стили; 4 рецепта, реальная компиляция Tailwind 4.3.2)

Кандидаты-утилиты в билде: `p-0`, `text-red-500`, `bg-transparent`. Разметка: `<h1>`, `<button class="btn">`, `<button class="btn p-0">`, `<button class="btn consumer-override">` (+ неслоёный CSS потребителя).

| Рецепт (порядок) | `h1` font-size | `.btn` background | `.btn` padding-l | `.btn.p-0` padding-l | unlayered override | вердикт |
|---|---|---|---|---|---|---|
| **A** — README как есть: `layers.css` → `tailwindcss` → tokens → index | **16px** ❌ | **rgba(0,0,0,0)** ❌ | **0px** ❌ | 0px | ✅ rgb(1,2,3) | **сломан** |
| **B** — Tailwind первым: `tailwindcss` → tokens → index | 40px ✅ | oklch(0.5546 …) ✅ | 17.6px ✅ | **17.6px** ❌ (утилита не работает) | ✅ | **сломан** |
| **C** — комбинированный order-statement первым (см. ниже) | 40px ✅ | oklch(0.5546 …) ✅ | 17.6px ✅ | **0px** ✅ | ✅ | **РАБОЧИЙ** |
| **D** — то же, но themeon ПОСЛЕ `components` | 40px ✅ | ✅ | ✅ | 0px ✅ | ✅ | рабочий, но хуже C (см. §1.3) |
| **E** — Tailwind без Preflight (S1) | 40px ✅ (+`font-weight:700`) | ✅ | ✅ | 0px ✅ | ✅ | рабочий (альтернатива) |

Итог: README-рецепт (#16) подтверждён как **катастрофический**, причём хуже, чем описано в аудите: у `.btn` обнуляются не только `background`, но и `padding` и `border-radius` (Preflight `button {border-radius:0; background-color:transparent}` + `padding:0`), а `body`/`p` получают tailwind-овый `--default-font-family` вместо `--font-sans` themeon. Также ложно и второе утверждение README («does not create a specificity conflict either way»): конфликт есть и решается детерминированно **против** ThemeOn.

### 1.2 Канонический рецепт (готовый блок для README)

```css
/* 1. Порядок слоёв объявляется ОДНИМ statement'ом, до всех @import.
      Он легален до @import (CSS Cascade 5) и фиксирует старшинство:
      Tailwind base (Preflight) < themeon.* < Tailwind components/utilities. */
@layer theme, base,
       themeon.tokens, themeon.reset, themeon.base, themeon.composition,
       themeon.blueprints, themeon.components, themeon.utilities,
       components, utilities;

/* 2. Импорты — в любом удобном порядке: старшинство уже зафиксировано выше. */
@import "tailwindcss";
@import "@themeon/css/tokens.css";
@import "@themeon/css/index.css";
```

Эквивалент через отдельный entry пакета (см. §1.4):

```css
@import "@themeon/css/layers-tailwind.css";   /* тот же statement, первым */
@import "tailwindcss";
@import "@themeon/css/tokens.css";
@import "@themeon/css/index.css";
```

Гарантии (все три измерены, рецепты C/F):
- (а) Preflight **не** убивает `themeon.base` (h1 = 40px) и `.btn` (bg/padding/radius на месте);
- (б) Tailwind-утилиты по-прежнему перебивают компоненты ThemeOn (`class="btn p-0"` → `padding: 0`);
- (в) неслоёный CSS потребителя сильнее всего (D8, ноль `!important`) — `rgb(1,2,3)`/`11px` побеждают в любом рецепте.

**Альтернатива (тоже рабочая, рецепт E)** — отключить Preflight: у `@themeon/css` есть свой reset, два reset'а в каскаде избыточны.

```css
@layer theme, base, themeon.tokens, …, themeon.utilities, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);   /* preflight.css НЕ импортируем */
@import "@themeon/css/tokens.css";
@import "@themeon/css/index.css";
```

### 1.3 Почему themeon-слои ставятся МЕЖДУ `base` и `components` (C), а не после (D)

Оба варианта проходят (а)/(б)/(в). Но в D слой `components` Tailwind (штатное место для пользовательских `@layer components { .my-card {…} }`) оказывается **слабее** `themeon.components` → потребитель теряет нативный tailwind-way переопределить `.btn`/`.card` и вынужден писать unlayered. C сохраняет обе лестницы: `themeon.components` < `components` (пользовательские) < `utilities`.

### 1.4 Что менять в пакете

1. **`packages/css/README.md` §«Co-existing with Tailwind v4»** — заменить целиком блоком §1.2. Утверждение «does not create a specificity conflict either way» — удалить (опровергнуто рендером).
2. **Новый entry `packages/css/src/layers-tailwind.css`** (+ `exports["./layers-tailwind.css"]`): один statement из §1.2. Даёт потребителю однострочник вместо ручного переписывания порядка и защищает от опечатки в 11 именах слоёв. Проверено: рецепт F (`@import "@themeon/css/layers-tailwind.css"` первым) даёт те же computed-стили, что C.
   *Замечание:* файл упоминает 4 имени Tailwind (`theme, base, components, utilities`). Для не-Tailwind потребителя он безвреден (пустые слои), но подключать его им не нужно — они берут `layers.css`.
3. **`packages/css/src/_base-body.css` — `font-weight` заголовков.** Измерено: themeon-only `h1` → `font-weight: 700` (UA-дефолт), с Tailwind по рецепту C → **400** (Preflight `h1..h6 { font-weight: inherit }` — правило author-origin, оно бьёт UA-origin независимо от слоёв; слои переупорядочивают только author-origin). Т.е. даже рабочий рецепт не восстанавливает жирность заголовков. `themeon.base` обязан объявлять `font-weight` сам (самодостаточность типографики, тот же класс дефекта, что #26). Минимальный фикс: `h1,h2,h3,h4 { font-weight: 700 }` (или `600` — дизайнерское решение). Токена `--font-weight-*` в контракте нет → либо литерал, либо расширение контракта (тогда `contract.ts` + `theme/default.ts` + `test/contract.test.ts`, отдельный item).
4. **`layers.css` не меняется** — его порядок корректен; проблема была только в рецепте.
5. Рецепт README `@import "@themeon/css/reset.css" layer(vendor)` — **проверен, верен**: `@import … layer(vendor)` вкладывает внутренние `themeon.*` слои внутрь `vendor`, и `@layer app{}` после `vendor` их перебивает (измерено: 11px против 40px/44px). Оставить как есть.

### 1.5 Кросс-чек с каноном Tailwind-моста (соседний агент)

Соседний агент нашёл (#5): при self-referential `@theme inline` и подключении `tokens.css` **до** Tailwind слой `theme` объявляется позже `themeon.tokens` → выигрывает Tailwind → `:root{--color-x: var(--color-x)}` → цикл → все `--color-*` пусты.

Прогнал обе конфигурации с **текущим (не починенным) мостом**:

| вход | `--color-action-primary` в `:root` | `.btn` bg | утилита `bg-action-primary` |
|---|---|---|---|
| рецепт C (order-statement) + мост | `oklch(0.5546 0.1427 153.03)` ✅ | ✅ | ✅ |
| `layers.css` → tokens → мост → tailwind | **пусто** ❌ | rgba(0,0,0,0) | rgba(0,0,0,0) |

**Вывод:** канонический order-statement §1.2 **сам по себе** снимает коллапс #5 (он ставит `themeon.tokens` ПОСЛЕ `theme`), независимо от того, какую форму моста выберет соседний агент. Их фикс (`@theme reference`, нулевая эмиссия) снимает зависимость от порядка полностью — рецепты совместимы и усиливают друг друга. **Конфликта канонов нет.**

---

## 2. Самодостаточность composition (аудит #26)

### 2.1 Измерения (Chrome, viewport 1600×813, импортирован ТОЛЬКО `composition.css`)

| элемент | без reset (UA `content-box`) | с `reset.css` | ожидание контракта |
|---|---|---|---|
| `.container` | offsetWidth **1184px** ❌ (72rem + 2×1rem) | 1152px | 1152px (`--container-max: 72rem`) |
| `.cover` | offsetHeight **845px** ❌, `document.scrollHeight` 894 → постоянный вертикальный скролл | 813px = ровно `100svh` | один экран |
| `.with-sidebar > :first-child` | 368px ❌ при `--sidebar-width: 20rem` и `padding:24px` у ребёнка | 321px | ≈320px |
| `.switcher > *`, `.grid`, `.stack`, `.cluster` | 442px / без изменений | 442px | разницы **нет** (измерено) |
| `.center` | 480px (`content-box`, осознанно) | 480px | 480px |

### 2.2 Канон

`box-sizing: border-box` объявляется **локально в тех примитивах, чью геометрию пакет задаёт сам** — и только в них:

- `container.css`: `.container { box-sizing: border-box; … }`
- `cover.css`: `.cover { box-sizing: border-box; … }`
- `sidebar.css`: `.with-sidebar { box-sizing: border-box; }` + `.with-sidebar > * { box-sizing: border-box; }` (пакет задаёт детям `flex-basis: var(--sidebar-width)` / `min-inline-size` — параметр обязан означать внешний размер)
- `stack`/`cluster`/`switcher`/`grid` — **не трогать** (разницы нет: измерено, flex-basis там 0/999-clamp, паддинг ребёнка складывается одинаково).
- `.center` — **оставить `content-box`** (канон Every Layout: паддинг добавляется снаружи меры).

**Проверено, что фикс не ломает `.center`:** при реальном порядке импортов `_composition-body.css` (`sidebar.css` идёт **раньше** `center.css`) правило `.with-sidebar > *` (0-1-0) перебивается более поздним `.center` (0-1-0, тот же слой) → `.center` внутри `.with-sidebar` сохраняет `content-box` (измерено: `boxSizing: "content-box"`, 480px). Тест на это обязателен (§5), т.к. инвариант держится на порядке `@import` в `_composition-body.css`.

Итог с фиксом и БЕЗ reset: `.container` 1152px, `.cover` 813px (== `100svh`), `.center` content-box — совпадает с поведением «reset + composition».

---

## 3. Пороги контраста (аудит #22) — SSOT

### 3.1 Канон уровней (S5)

| Роль текста/элемента | APCA-уровень | Обоснование (S5, дословно) |
|---|---|---|
| Основной текст (колонки body-текста) | **75** (`body`) | «the minimum level for columns of body text» |
| Второстепенный текст (подписи, метаданные, `.badge`, `.text-muted`), лейблы кнопок | **60** (`text`) | «minimum for content text that is **not** body, column, or block text» |
| Крупный/жирный текст (≥36px/400, ≥24px/700) | 45 (`large`) | «larger, heavier text … such as headlines» |
| Фокус-кольцо, границы UI-компонентов, несущие смысл | **45** (`non-text`) | S5 сам по себе допускает 30 (semantic non-text) и даже 15 («thick focus-visible outlines»), но кольцо пакета — `outline: 2px` (тонкое). Берём 45 = уже закодированный `LC_THRESHOLDS['non-text']` и совместимо с WCAG 2.2 SC 1.4.11/2.4.11 (3:1). Ослабление до 30 — сознательное решение, не дефолт. |
| Декоративные разделители (`--color-border`) | **не гейтится** | S5 Lc 15 territory; гейт на 45 провалила бы любую Radix-подобную шкалу (light 24.0) — это не дефект темы. |

### 3.2 КАНОНИЧЕСКАЯ таблица пар + фактические |Lc| дефолт-темы `@themeon/css`

Числа — прогон `contrastAPCA` (`@themeon/colors/dist`) на `resolveTheme(defaultTheme, {refLayer:'inline'})`, обе темы:

| # | Пара (fg / bg) | usage | треб. | light |Lc| | dark |Lc| | вердикт |
|---|---|---|---|---|---|---|
| 1 | `text` / `bg-page` | body | 75 | 92.7 | 90.2 | ✅ |
| 2 | `text` / `bg-subtle` | body | 75 | 90.0 | 90.0 | ✅ |
| 3 | `text` / `bg-elevated` | body | 75 | 92.7 | 90.2 | ✅ |
| 4 | `text-muted` / `bg-page` | text | 60 | 78.0 | 68.2 | ✅ |
| 5 | `text-muted` / `bg-subtle` | text | 60 | 75.3 | 68.0 | ✅ (сегодня CLI гейтит это как `body` 75 → **ложный error 68.0 < 75**, #22) |
| 6 | `text-muted` / `bg-elevated` | text | 60 | 78.0 | 68.2 | ✅ |
| 7 | `link` / `bg-page` | **body 75** | 75 | 75.3 | **68.2** | ❌ **dark FAIL** |
| 8 | `link` / `bg-subtle` | body | 75 | 72.7 | **68.0** | ❌ **обе FAIL** |
| 9 | `link-hover` / `bg-page` | body | 75 | 92.3 | 90.2 | ✅ |
| 10 | `on-primary` / `action-primary` | text | 60 | 75.7 | 75.7 | ✅ |
| 11 | `on-primary` / `action-primary-hover` | text | 60 | 81.8 | 68.8 | ✅ |
| 12 | `focus-ring` / `bg-page` | non-text | 45 | **43.7** | **11.8** | ❌ **обе FAIL** |
| 13 | `focus-ring` / `bg-subtle` | non-text | 45 | **41.0** | ~11.6 | ❌ **обе FAIL** |
| 14 | `focus-ring` / `bg-elevated` | non-text | 45 | 43.7 | 11.8 | ❌ **обе FAIL** |

**Сознательно НЕ в таблице:**
- `focus-ring` / `action-primary` (кольцо вокруг залитой кнопки): `.btn:focus-visible` рисует `outline` с `outline-offset: 2px` → соседний цвет — фон страницы, а не лицо кнопки. Гейтить нечего (измерено 24.9 light / 17.5 dark — пара недостижима ни на одной шкале Radix-формы).
- `border` / `bg-*` — декоративный (см. §3.1).
- `border-strong` / `bg-*` — grep по `packages/css/src/**/*.css`: `--color-border-strong` **не используется ни одним правилом пакета** (только `--color-focus-ring`). Это токен «для потребителя» → в обязательный гейт не входит; если появится input-скелет с бордером как единственным индикатором — добавить как `non-text` 45.
- `link` в `text`-классе: `a{color:var(--color-link)}` в `_base-body.css` красит **все** якоря, включая инлайновые внутри `<p>` → это body-текст по определению. Понижать до 60 нельзя без изменения роли.

### 3.3 Что чинить (с числами)

Все 3 провала имеют **один корень — тёмная шкала `@themeon/colors`** (и один краевой — светлый шаг 8):

| Требование к шкале | сейчас | нужно |
|---|---|---|
| dark step **11** vs step 1/2 (роли `text-muted`, `link`) | 68.2 / 68.0 | **≥75** → `L ≥ 0.850` (neutral, C 0.018) и `L ≥ 0.835` (accent, C 0.127); сейчас `L = 0.8091` / `0.7930` |
| dark step **8** vs step 1/2 (роль `focus-ring`) | **10.9 / 11.8** | **≥45** → `L ≥ 0.660` (C 0.12 h155); сейчас `L = 0.4052` |
| light step **8** vs step 1/2 (роль `focus-ring`) | 43.7 / 41.0 | ≥45 → `L ≤ 0.702`; сейчас `L = 0.7272` |
| step 9 (solid) — белый текст | 75.7 / 75.7 | ≥60 ✅ (уже) |
| step 10 (hover solid) — белый текст | 81.8 / 68.8 | ≥60 ✅ (уже) |

Диагностика тёмной шкалы (лестница |Lc| шага vs шаг 1, `ladder.mjs`): dark-шаги **1–7 дают Lc 0.0** (все внутри low-clip APCA), 8 → 10.9, 9 → 27.4, 10 → 33.4, затем скачок 11 → 68.2, 12 → 90.2. Светлая: 6→24.0, 7→33.5, 8→46.2, 9→72.2, 10/11→78.0, 12→92.7. Т.е. **средние шаги тёмной шкалы схлопнуты**, и ни один шаг ≤10 не даёт 45 → на текущей математике фокус-кольцо в dark **недостижимо в принципе**. Это прямое подтверждение аудит-находок #12/#13/#14.

**ЗАВИСИМОСТЬ (явно):** пороги §3.2 — устойчивы (выведены из APCA-семантики ролей, не из значений темы), но **числа темы и вердикты «FAIL» пересчитываются после фикса шкалы/альфа-подложки соседним агентом (`@themeon/colors`)**. Порядок работ: сначала канон шкалы → затем прогон таблицы §3.2 → затем (если шкала всё равно не даёт цели) точечные литералы в `theme/default.ts` (прецедент уже есть — `onPrimary: 'oklch(1 0 0)'`):
- dark `focusRing` ≥ `oklch(0.660 0.12 155)`;
- light `focusRing` ≤ `oklch(0.702 0.12 155)`;
- dark `link` ≥ `oklch(0.835 0.127 154)` (или маппинг на шаг 12).

### 3.4 Где живёт SSOT

**Канон: `@themeon/colors`** — новый экспорт рядом с `LC_THRESHOLDS`/`checkContrast`:

```ts
// packages/colors/src/contrast.ts
export interface SemanticPairSpec { fg: string; bg: string; usage: ContrastUsage; label: string }
export const SEMANTIC_CONTRAST_PAIRS: readonly SemanticPairSpec[] = [ /* таблица §3.2, 14 пар */ ]
/** Прогон таблицы по lookup varName→литеральное значение (одна тема). Пары с отсутствующей ролью — skip. */
export function checkThemeContrast(lookup: Record<string, string>): ContrastCheckResult
```

Почему `colors`, а не `css/contract.ts`:
1. **оба** потребителя уже зависят от `@themeon/colors` — `packages/cli` (`dependencies`: core, tailwind, **colors**) и `packages/css` (devDep colors, `gen-tokens.mjs` уже импортирует `checkContrast`). Ни одной новой зависимости.
2. Положить таблицу в `@themeon/css` значило бы завести зависимость `cli → css` (CSS-пакет) ради JS-таблицы — инверсия слоёв (`css → colors`, не наоборот).
3. Порог + движок + таблица пар — одна политика a11y, один модуль.

Тогда:
- `packages/cli/src/checks/contrast.ts` — удаляет свой локальный `CONTRAST_PAIRS` (3 пары, все `body`) и зовёт `checkThemeContrast` на каждую тему;
- `packages/css/scripts/gen-tokens.mjs` — удаляет `gatePairs()` (5 пар, свои usage) и зовёт то же самое;
- дрейф имён закрывается тестом: каждое `fg`/`bg` из `SEMANTIC_CONTRAST_PAIRS` обязано присутствовать в `CSS_CONTRACT` (`packages/css/test/contract.test.ts`).

---

## 4. Исключения скана `themeon check` (аудит #23)

### 4.1 Воспроизведение (реальный скаффолд: `runInit` → `runBuild --out src/styles/theme.css --tailwind src/styles/bridge.css` → `runCheck`)

Потребительский `src/app.css` содержит одну живую ссылку (`var(--color-text)`) и одну мёртвую (`var(--color-nope)`).

| | сегодня (`DEFAULT_IGNORE = node_modules, dist`) | с фиксом |
|---|---|---|
| просканировано файлов | `src/app.css`, **`src/styles/theme.css`**, **`src/styles/bridge.css`** | `src/app.css` |
| `hardcode` warnings | **8** (все — на собственный сгенерированный `theme.css:5..19`) | **0** |
| `token-coverage` unused | **0** (bridge.css «использует» все токены) | **6** |
| `token-coverage` dead-ref error | 1 (`src/app.css:2` — настоящая находка) | 1 ✅ (сохраняется) |
| exit | 1 | 1 (по dead-ref, как и должно) |

Подтверждено и то, что `hardcode.ts` `EXCLUDE_FILE_RE = /(^|\/)tokens\.css$|\.config\.ts$/` бесполезен при легальном `--out src/styles/theme.css` (имя другое), а `checkCoverage` не исключает вообще ничего.

### 4.2 Канон

**Исключения принадлежат сканеру, а не отдельному линтеру.** Единственный список строится в `runCheck` и передаётся в `scanSources`; `EXCLUDE_FILE_RE` из `hardcode.ts` **удаляется** (иначе два разных набора исключений: hardcode исключает, coverage — нет; ровно этот рассинхрон и дал «unused = 0»).

Итоговый ignore-набор (defense in depth, обе части проверены прогоном):

1. **Пути, а не имена.** `DEFAULT_IGNORE` = `**/node_modules/**`, `**/dist/**`, `**/.output/**`, `**/.nuxt/**` + **фактический** `opts.config` (относительный путь) + **фактические** `--out`/`--tailwind`, если переданы. Для этого `check` получает те же флаги, что `build`: `--out` (default `tokens.css`) и `--tailwind`, плюс общий `--ignore` (comma-separated globs) для всего остального.
2. **Content-based авто-skip по баннеру** (path-independent; работает, даже если пользователь не продублировал флаги). Оба генератора уже подписывают свой вывод:
   - `serializeThemeCss` (core): `/* generated by @themeon/core */` (дефолтный баннер; `runBuild` его не отключает — проверено на реальном выходе);
   - `tailwindBridge`: `/* Generated by @themeon/tailwind — do not edit. */`.

   Канон: вынести баннер в **один экспорт `@themeon/core`** (напр. `GENERATED_BANNER` + `GENERATED_BANNER_RE = /^\s*\/\*\s*generated by @themeon\//i`), привести баннер `@themeon/tailwind` к тому же префиксу, и в `scanSources` отбрасывать любой файл, чьё содержимое начинается с этого маркера.
   **Проверено:** только по баннеру, с пустым списком флагов, скан оставил ровно `src/app.css` → `unused = 6`, `hardcode = 0`, dead-ref error сохранён.
   Оговорка: `gen-tokens.mjs` намеренно пишет `dist/tokens.css` пакета c `banner: false` (P-D22, «первый statement = `@layer themeon.tokens`»); это `dist/**` — и так в ignore.
3. `themeon check` **не должен** молча считать «unused = 0» валидным результатом: если после исключений B ⊇ A и при этом в скане не осталось ни одного файла — это `warning: no sources scanned` (защита от «зелёного» линтера на пустом входе).

---

## 5. Обязательные тесты (DoD ремедиации)

**`@themeon/css`**
1. **`.btn` / типографика под Tailwind (реальная компиляция + рендер).** Компилировать канонический рецепт §1.2 реальным `@tailwindcss/node@4` и снимать computed-стили в headless-Chrome: `h1` = `--text-4xl`, `.btn` background = `--color-action-primary`, `.btn.p-0` padding = 0, unlayered-override побеждает. Регресс-тест на #16 (сегодня падал бы на A). *(Скрипт-донор: `scratchpad/tw/run.mjs`.)*
2. Тот же прогон на рецепте-антиподе (A) — обязан **падать** (иначе тест ничего не сторожит).
3. `h1..h4` имеют `font-weight` из `themeon.base` (не UA) — рендер под Preflight.
4. **composition без reset:** импорт ТОЛЬКО `composition.css` → `.container` offsetWidth == `--container-max`, `.cover` offsetHeight == viewport (`100svh`), `.with-sidebar > :first-child` == `--sidebar-width` при паддинге у ребёнка.
5. **`.center` остаётся `content-box`** — в т.ч. будучи прямым ребёнком `.with-sidebar` (сторожит порядок `@import` в `_composition-body.css`).

**Контраст / SSOT**
6. **«Дефолтная тема пакета проходит собственный `themeon check`»**: `checkContrastPairs(resolveTheme(defaultTheme,{refLayer:'inline'}))` → **пустой** список findings. Сегодня: `error: APCA 68.0 < 75 for text.muted on bg.subtle (theme dark)`, exit 1 (воспроизведено).
7. **Один SSOT**: тест утверждает, что `packages/cli/src/checks/contrast.ts` и `packages/css/scripts/gen-tokens.mjs` дают **идентичный** набор пар/порогов на одной и той же теме (иначе #22 воспроизводится в другой форме).
8. Каждое имя `fg`/`bg` из `SEMANTIC_CONTRAST_PAIRS` присутствует в `CSS_CONTRACT`.
9. Табличный тест порогов: `LC_THRESHOLDS` = `{body:75, text:60, large:45, 'non-text':45}` (сторожит случайный сдвиг уровня).

**CLI**
10. **init → build(`--out src/styles/theme.css --tailwind src/styles/bridge.css`) → check** на временном скаффолде: `hardcode`-warning'ов на сгенерированных файлах = 0; `unused token`-warning'ов > 0; настоящий dead-ref (`--color-nope`) по-прежнему `error`.
11. То же **без** флагов `--out/--tailwind` у `check` — авто-skip по баннеру даёт тот же результат.
12. `scanSources` не отдаёт ни одного файла с маркером `GENERATED_BANNER_RE`.

---

## 6. Остаточные риски и зависимости

- **Зависимость от канона `@themeon/colors` (соседний агент):** числа §3.2 (и три «FAIL») пересчитываются после фикса шкалы/альфа-подложки. Сами **пороги** §3.1–3.2 от этого не зависят (они выведены из APCA-семантики ролей). Целевые числа для шкалы — §3.3.
- **Зависимость от канона `@themeon/tailwind` (соседний агент):** нулевая в одну сторону — рецепт §1.2 работает и с текущим (эмитирующим) мостом, и с `@theme reference` (§1.5, измерено). Обратная зависимость тоже снята: их фикс не требует менять порядок слоёв.
- Рецепт §1.2 проверен на Tailwind **4.3.2** через `@tailwindcss/node.compile()` — тот же вход, что у `@tailwindcss/vite` и PostCSS-плагина. Прогон через сам Vite-плагин (dev-сервер) не делался; риск низкий, но тест №1 стоит держать на реальном компиляторе, чтобы поймать смену дефолтного набора слоёв в 4.x.
- `layers-tailwind.css` фиксирует имена слоёв Tailwind (`theme/base/components/utilities`). Если Tailwind 5 сменит набор — файл придётся обновить; это отражено в тесте №1 (он упадёт).
- Понижение `focus-ring` до Lc 30 (APCA «semantic non-text») — легальная альтернатива, но **не спасает** тёмную тему (11.8): фикс шкалы обязателен в любом случае.
- `check --ignore`/`--out`/`--tailwind` — новые флаги; `--out` c дефолтом `tokens.css` (как в `build`) означает, что `check` по умолчанию исключит `./tokens.css` из скана даже там, где его нет. Безвредно, но должно быть в описании флага.
