# P8 — Канон цветового моста `@themeon/naive` → Naive UI

**Статус:** design-разведка (read-only, `packages/**` не тронут).
**Дата:** 2026-07-14.
**Метод:** прогоны на **установленном** naive-ui (импорт `es/*/styles/{light,dark}.mjs`, вызов `self(mergedCommon)` — ровно то, что делает `useTheme` в рантайме), seemly вызывается по-настоящему; APCA — `contrastAPCA` из `@themeon/colors`; литералы — `resolveTheme(defaultTheme)` из `@themeon/css`. Никаких фикстур: каждое число ниже получено исполнением.
**Вход:** `90_audit/AUDIT_2026-07-14_research-conformance.md` §§2 (Blocker), 3 (Blocker), 21 (Major).

**Пины (зафиксированы):**

| Пакет | Версия | Где |
|---|---|---|
| `naive-ui` | **2.44.1** | `node_modules/.pnpm/naive-ui@2.44.1_vue@3.5.39_typescript@6.0.3_`; catalog `pnpm-workspace.yaml`; peer `^2.44` |
| `seemly` | **0.3.10** | `node_modules/.pnpm/seemly@0.3.10` (транзитив naive-ui) |
| `colorjs.io` | **0.7.0** | catalog; прямая зависимость `@themeon/naive` |

> ⚠️ `20_research/R-05`/`R-14` перечисляют `baseColor` в списке common-токенов, **не раскрывая семантику** — из этого списка и родился Blocker #3. В этом документе R-xx источником не является: семантика взята из кода 2.44.1 (см. §0 и §2).
> ⚠️ Perplexity на прямой вопрос «что такое `baseColor`» **ответил неверно** («это не текст на primary-кнопках, а внутренний якорь нейтралей») — противоречит `button/styles/light.mjs:103` (`textColorPrimary: baseColor`). RAG по этому токену недостоверен; несущий факт установлен провенанс-сканом (§2.1).

---

## 0. RAG-источники

| # | Факт | URL | Дата |
|---|---|---|---|
| S1 | «**Suppl means supplementary**» + «Since primary color is too light for slider rail background» — 07akioni (maintainer) | https://github.com/tusen-ai/naive-ui/discussions/1373 | проверено 2026-07-14 |
| S2 | `GlobalThemeOverrides` ожидает конкретные литералы (hex/rgb); `var(...)`/`oklch(...)` отвергаются рантайм-валидатором; рецепт — «держать в Naive канонические hex, а CSS-переменные определять отдельно теми же значениями» | https://github.com/tusen-ai/naive-ui/discussions/2362 · https://www.naiveui.com/ (os-theme/customize-theme) | проверено 2026-07-14 |
| S3 | Radix: «Step **9** has the highest chroma of all steps»; «Step **10** is designed for component **hover** states, where step 9 is the component's normal state background»; 11 — low-contrast text, 12 — high-contrast text. **Отдельной ступени под pressed у Radix НЕТ** | https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale | проверено 2026-07-14 |
| S4 | Наивовский разбор цветов темы (`common` → `self()` компонента) — исходник, сверен с установленным 2.44.1: `_mixins/use-theme.mjs:74-76` `mergedCommon = merge({}, builtinCommon, globalCommonOverrides, …)`, `mergedSelf = merge(self(mergedCommon), builtinOverrides, globalSelfOverrides, …)` | https://github.com/tusen-ai/naive-ui/blob/main/src/_mixins/use-theme.ts | проверено 2026-07-14 (на коде 2.44.1) |
| S5 | `baseColor: base.neutralBase` = `#FFF` (light) / `#000` (dark) | https://github.com/tusen-ai/naive-ui/blob/main/src/_styles/common/light.ts · `.../dark.ts` | проверено 2026-07-14 (на коде 2.44.1) |
| S6 | Парсер seemly принимает **только** `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa`, `rgb(a, b, c)`/`rgba(…)` (через запятую!), `hsl(a)`, CSS-имена, `transparent` — регулярками; ничего другого | `seemly@0.3.10/es/color/index.js:5-18` (регулярки), `:154` (`throw [seemly/rgba]: Invalid color value`) | проверено 2026-07-14 |

---

## 1. Канон источника литералов (Blocker #2)

### 1.1 Эмпирика: `.vars` — транспорт CSS, литералы — в `.tokens[]`

Прогон `resolveTheme(defaultTheme, { refLayer })` по всем трём режимам (`e1-literals.mjs`):

| refLayer | `vars['--color-action-primary']` | `tokens[…].value` | `tokens[…].ref` |
|---|---|---|---|
| `'referenced'` (**деф.**) | `var(--color-accent-9)` | `oklch(0.5546 0.1427 153.03)` | `--color-accent-9` |
| `'all'` | `var(--color-accent-9)` | `oklch(0.5546 0.1427 153.03)` | `--color-accent-9` |
| `'inline'` | `oklch(0.5546 0.1427 153.03)` | `oklch(0.5546 0.1427 153.03)` | — |

Причина — `core/src/resolve.ts:187`: `vars[varName] = directRef !== undefined ? \`var(${directRef})\` : valueStr`.
Патчи тем (`resolved.themes[k]`) материализуются **без** `ref` (`resolve.ts:264`) → там значение литеральное всегда. Именно поэтому `toNative(r, {theme:'dark'})` «работает», а база/light — нет: **асимметрия маскировала баг**.

**КАНОН:** единственный контракт ядра, дающий литерал при ЛЮБОМ `refLayer`, — **`ResolvedToken.value`**.
Адаптер обязан строить lookup так:

```ts
const lookup: Record<string, string> = {}
for (const t of resolved.tokens) lookup[t.varName] = t.value        // база (:root), ЛИТЕРАЛЫ
if (theme) for (const t of resolved.themes[theme] ?? []) lookup[t.varName] = t.value
```

`resolved.vars` в адаптере **не используется вообще** (это вход сериализатора/applier'а, не адаптеров).

### 1.2 Репро (реальный naive-ui + seemly)

`toNative(resolveTheme(defaultTheme))` (README-quickstart) даёт `common`, где **ни одного цвета**: `primaryColor:'var(--color-accent-9)'`, `baseColor:'var(--color-neutral-2)'`, `textColorBase:'var(--color-neutral-12)'`, …
- `changeColor('var(--color-accent-9)', {alpha:.5})` → **THROW** `[seemly/rgba]: Invalid color value var(--color-accent-9).`
- `checkboxLight.self({...commonLight, ...out.common})` → **THROW** тот же.
- Деривация тоже свалилась в fail-safe: `primaryColorPressed === primaryColorSuppl === primaryColor === 'var(--color-accent-9)'`.

### 1.3 Политика непарсибельных значений — **fail-loud**

Прогон `toHex()`/seemly по 12 значениям (`e4-final.mjs §A`):

| значение | colorjs.io 0.7.0 | текущий `toHex` | seemly |
|---|---|---|---|
| `oklch(0.55 0.15 155)` | ok | `#008a48` | ok |
| `oklch(… / 0.5)` | ok | `#008a4880` | ok (hex8 понимает) |
| `rgb(0 128 72 / 50%)` (modern) | ok | `#00804880` | ok **только после конверсии** (сам modern-синтаксис seemly не парсит!) |
| `hsl(155 100% 27%)` | ok | `#008a50` | ok |
| `transparent` | ok | `#00000000` | ok |
| `var(--x)` | THROW | **passthrough** | **THROW** |
| `color-mix(in oklch, red, blue)` | THROW | **passthrough** | **THROW** |
| `light-dark(#fff, #000)` | THROW | **passthrough** | **THROW** |
| `rgb(from #ff0000 r g b)` (relative) | THROW | **passthrough** | **THROW** |
| `currentColor` | THROW | **passthrough** | **THROW** |
| `calc(1px)` | THROW | **passthrough** | **THROW** |

Корень блокера — именно `catch { return value }` в `color.ts:23-31`: **молчаливый passthrough превращает ошибку конфигурации в креш внутри рендера чужого компонента** с сообщением, в котором нет ни имени роли, ни имени темы.

**КАНОН:**
1. `toHex()` остаётся чистой функцией, но получает **строгого брата** — внутренний `toHexStrict(value): string` (бросает). Публичный `toHex` (заморожен `api.test.ts`) сохраняет поведение passthrough **только** как low-level-утилита, но `toNative()` им **не пользуется**.
2. `toNative()` собирает **все** непарсибельные color-роли и бросает **один** `ThemeonError('BAD_COLOR')` со списком `varName → value` и подсказкой. Не первую попавшуюся — все сразу (DX: один прогон = полный список).
3. Опция-выход для толерантных пайплайнов: `toNative(resolved, { onInvalidColor: 'throw' | 'skip' })`, деф. **`'throw'`**. `'skip'` = роль не эмитится (Naive остаётся на стоке), поведение эквивалентно «частичной теме» (D3).
4. `kind:'raw'` (radius/shadow/font/size) не валидируется — там любая CSS-строка легальна.

Почему не «warning»: у адаптера нет логгера (осознанное решение P4.2), а `console.warn` в библиотеке — антипаттерн; выбор «бросить или пропустить» отдан вызывающему явной опцией.

---

## 2. Семантика `common` Naive и таблица маппинга (Blocker #3)

### 2.1 Провенанс-скан (ground truth, а не догадка)

Метод (`e3-provenance.mjs`): каждому интересному ключу `common` присвоен уникальный hex-сентинел → вызван `self()` **всех 81 light / 78 dark** компонентных тем 2.44.1 → найдены ключи, чьё значение **буквально равно** сентинелу. Это исчерпывающая карта прямого потребления.

**`baseColor` в DARK потребляется ИСКЛЮЧИТЕЛЬНО как ЧЕРНИЛА НА ЗАЛИВКЕ (8 компонентов):**
`button` (25 ключей: `textColor{,Hover,Pressed,Focus,Disabled}{Primary,Info,Success,Warning,Error}`), `tag.textColorChecked`, `icon-wrapper.iconColor`, `steps.indicatorTextColorProcess`, `calendar.dateTextColorCurrent`, `radio.buttonTextColorActive`, `float-button.textColorPrimary`, `switch.iconColor`.
**Ни одного поверхностного применения в dark.** (Все dark-темы перекрывают поверхности: `checkbox.color='#0000'`, `radio.color='#0000'`, `tabs.tabColorSegment=inputColor`, `layout.siderToggleButtonColor=popoverColor`, `alert` в dark вообще уходит на `*ColorSuppl` без `composite`.)

**`baseColor` в LIGHT — двойная роль:**
- чернила: те же `button` (25), `checkbox.checkMarkColor`, `tag.textColorChecked`, `icon-wrapper.iconColor`, `steps.indicatorTextColorProcess`, `calendar.dateTextColorCurrent`, `slider.indicatorTextColor`, `tooltip.textColor`;
- **поверхность**: `checkbox.color` (нечекнутый бокс), `radio.color`/`buttonColor`/`buttonColorActive`, `tabs.tabColorSegment`, `layout.siderToggleButtonColor`;
- **подложка `composite()`**: `alert/styles/light.mjs:41-86` — `composite(baseColor, changeColor(infoColor,{alpha:.08}))` ×8; `tooltip/styles/light.mjs:15` — `composite(baseColor,'rgba(0,0,0,.85)')`.

Т.е. инвариант Naive: **`baseColor` = экстремум канвы (`neutralBase`: `#FFF`/`#000`), и он же — чернила, потому что наивовские заливки подобраны под этот экстремум** (в dark у Naive `primaryColor` — светлая мята `#63e2b7`, на ней читается чёрный).

### 2.2 Почему ThemeOn ломается об этот инвариант

Шкала `@themeon/colors` — Radix-формы: **step 9 (solid) одинаков в light и dark** (прогон: `accent.light[9] = accent.dark[9] = #008a48`, L 0.5546). Это Radix-канон (S3: «step 9 — highest chroma… normal state background»), и он **несовместим** с наивовским предположением «в тёмной теме solid-акцент светлый». Следствие: чернила на наших заливках всегда ≈ белые (`--color-on-primary`), в обеих темах — что дефолт-тема и утверждает (`css/src/theme/default.ts:57` `onPrimary:'oklch(1 0 0)'`).

**Замер (реальный `btnDark.self`)** — `--color-bg-subtle → baseColor` (как в коде):
`textColorPrimary #151616` на `colorPrimary #008a48` → **APCA |Lc| 32.7** (порог проекта для текста — 60). В light: 71.0.

### 2.3 Отвергнутый вариант: `baseColor ← --color-on-primary`

Соблазнительно (в dark даёт Lc **75.6**), но **опасно в общем случае** — доказано контрпримером (`e4-final.mjs §B`): тема со светло-жёлтым primary `oklch(0.85 0.16 95)` обязана иметь **тёмные** чернила (`onPrimary: oklch(0.2 0 0)` = `#161616`). Тогда `baseColor = #161616` и в LIGHT-теме:

| ключ | значение | эффект |
|---|---|---|
| `checkbox.color` | `#161616` | **чёрный** нечекнутый бокс на белой странице (Lc 103 — «контраст» вместо поверхности) |
| `radio.color`, `radio.buttonColor` | `#161616` | чёрные радио |
| `tabs.tabColorSegment` | `#161616` | чёрная пилюля сегмент-таба |
| `tooltip.color`/`textColor` | `rgba(3,3,3,1)` / `#161616` | **чёрным по чёрному, Lc 0.0** |

Т.е. маппинг «on-primary → baseColor» работает **только пока on-primary белый** — то есть случайно, на дефолт-теме. Для «универсального дизайн-системного» адаптера это неприемлемо.

### 2.4 КАНОН маппинга

**Правило:** `common.baseColor` — **НЕ роль ThemeOn**. Он остаётся стоковым `neutralBase` (`#FFF`/`#000`): это одновременно (а) корректная подложка `composite()` и поверхность в light, (б) корректные чернила для тех акцентных ролей, которые тема **не** задаёт (D3-толерантность к частичным темам). Чернила ThemeOn (`--color-on-*`) подаются **точечно, по компонентам, только для ролей, которыми владеет тема**.

#### Таблица «роль ThemeOn → common-ключ Naive»

| Роль ThemeOn | Naive `common` | Где Naive это потребляет (2.44.1) | Статус |
|---|---|---|---|
| `--color-action-primary` | `primaryColor` | `button.colorPrimary`, `checkbox.colorChecked`, `tag.colorChecked`, `icon-wrapper.color`, `steps.indicatorColorProcess`, `switch.railColorActive`(light), `slider.fillColor`(light), `radio.dotColorActive`, `anchor.railColorActive`, `input.caretColor`, … (40+ ключей) | как есть |
| `--color-action-primary-hover` | `primaryColorHover` | `button.colorHoverPrimary/colorFocusPrimary`, `button.borderHover`, `tag.colorCheckedHover` | как есть |
| — (дерив., §3) | `primaryColorPressed` | `button.colorPressedPrimary`, `button.textColorPressed`, `anchor.linkTextColorPressed` | **изменить деривацию** |
| `--color-action-primary` (identity) | `primaryColorSuppl` | **только dark**: `slider.fillColor`, `switch.railColorActive`, `badge`(через статусы), `dropdown/menu.*Inverted`, `gradient-text.colorEnd*`, `alert.color*` | **изменить: suppl = base** |
| `--color-status-{success,warning,error,info}` | `{success,warning,error,info}Color` | `button.color{Type}`, `badge.color*`, `alert.icon*`, `progress.fill*`, `tag.textColor*`, `timeline`, `message`, `result`, … | как есть (роли в дефолт-теме отсутствуют → пропуск, D3) |
| — (дерив.) | `{…}ColorHover/Pressed/Suppl` | ↑ | **изменить деривацию** |
| `--color-bg-page` | `bodyColor` | `layout.color`, фон страницы | как есть |
| `--color-bg-elevated` | `cardColor`, `modalColor`, `popoverColor`, **`tableColor`** | `card`, `modal`, `popover`/`dropdown`/`select`, `data-table`; в dark `checkbox.checkMarkColor ← cardColor`(!) | **добавить `tableColor`** (сток: `tableColor = neutralCard`) |
| `--color-bg-subtle` | **`actionColor`, `tableHeaderColor`, `tabColor`** | `data-table` header, `collapse`/`tabs` треки, «второй уровень» поверхности. Сток light: `rgb(250,250,252)`/`rgb(247,247,250)` — ровно «шаг 2» | **перемапить с `baseColor`** |
| `--color-text` | `textColorBase`, `textColor1` | заголовки, `n-h*`, `titleTextColor` | как есть |
| `--color-text-muted` | `textColor2`, `textColor3` | body-текст компонентов, иконки | как есть (третьего уровня в ролях нет — осознанно) |
| `--color-border` | `borderColor`, `dividerColor` | рамки, разделители | как есть |
| **`--color-on-primary`** | **— (не в `common`)** | **per-component INK-оверрайды**, §2.5 | **добавить** |
| **`--color-link`** | **— (не в `common`)** | **per-component ACCENT-INK-оверрайды**, §4.1 | **добавить** |
| `--radius-md/-sm` | `borderRadius`, `borderRadiusSmall` | все компоненты | как есть |
| `--shadow-sm/md/lg` | `boxShadow1/2/3` | popover/card/modal | как есть |
| `--font-sans`, `--text-*` | `fontFamily`, `fontSize{Mini,Small,Medium,Large}` | все | как есть |
| `--color-border-strong`, `--color-focus-ring` | — | у Naive нет отдельных common-ключей (focus = `boxShadowFocus` из `primaryColor`) | не мапится, задокументировать |

#### 2.5 INK-таблица (`--color-on-<role>` → self-ключи), исчерпывающе по 2.44.1

Эмитится **только** для ролей, значения которых тема реально дала. Ink = `--color-on-<role>` если задан, иначе `--color-on-primary`, иначе — оверрайды не эмитятся вовсе (полный сток).

| Компонент | Ключи | Заливка (что под чернилами) | Появление |
|---|---|---|---|
| `Button` | `textColor{,Hover,Pressed,Focus,Disabled}{Primary\|Info\|Success\|Warning\|Error}` | `color{…}{Type}` = `{type}Color` | light + dark |
| `Checkbox` | `checkMarkColor` | `colorChecked = primaryColor` | light + dark (в dark сток берёт его из `cardColor`!) |
| `Tag` | `textColorChecked` | `colorChecked = primaryColor` | light + dark |
| `IconWrapper` | `iconColor` | `color = primaryColor` | light + dark |
| `Steps` | `indicatorTextColorProcess` | `indicatorColorProcess = primaryColor` | light + dark |
| `Calendar` | `dateTextColorCurrent` | `dateColorCurrent = primaryColor` | light + dark |
| `DatePicker` | `itemTextColorActive` | `itemColorActive = primaryColor` (сток берёт чернила из `popoverColor`!) | light + dark |
| `Radio` | `buttonTextColorActive` | `buttonColorActive = primaryColor` | **dark** (в light `buttonColorActive = baseColor`, т.е. заливки нет) |
| `FloatButton` | `textColorPrimary` | `colorPrimary = primaryColor` | **dark** |
| `Switch` | `iconColor` | рельс `railColorActive = primaryColorSuppl` | **dark** |

Обратите внимание: **`Checkbox.checkMarkColor` и `DatePicker.itemTextColorActive` в стоке идут НЕ от `baseColor`**, а от `cardColor`/`popoverColor` — то есть даже «правильный» `baseColor` их бы не починил. Только провенанс-скан это показывает.

#### 2.6 Проверка канона (реальный naive-ui, дефолт-тема)

`e4-final.mjs §C` — `self()` **81 light / 78 dark** компонента: **ни одного throw**.

| Пара | было (`bg-subtle→baseColor`) | стало (канон) |
|---|---|---|
| btn solid primary, **dark** | **32.7** | **75.6** |
| btn solid primary, light | 71.0 | **75.6** |
| checkbox check-mark, dark | 33.0 | **75.6** |
| tag checked, dark | 32.7 | **75.6** |
| steps indicator, dark | 32.7 | **75.6** |
| tooltip текст, light | 100.3 | 104.8 (= сток) |
| checkbox нечекнутый бокс, light | `#f7f8fa` | `#FFF` (= сток) |
| alert `colorInfo`, light | `rgba(230,238,249,1)` | `rgba(237,245,254,1)` (= сток) |

**Полная тема (все 5 акцентных ролей, `e5-fulltheme.mjs`)** — доказательство, что INK-таблица обязана покрывать и статусы: в dark со стоковыми чернилами (`baseColor=#000`) на НАШИХ статусных заливках выходит `Info 31.3 / Success 33.9 / Warning 51.4 / Error 29.0`; с INK-оверрайдами — `78.2 / 75.6 / 57.8 / 80.5`.

---

## 3. Канон деривации состояний (Major #21)

### 3.1 Что есть сейчас и почему это не работает

`color.ts:8-10` — `HOVER +0.06 L`, `SUPPL +0.10 L`, `PRESSED −0.06 L`, appearance-слепо, шкала темы не читается.
На дефолт-теме (light): тема даёт `primaryColorHover = accent-10 = #007a40` (**L 0.5082 — в light Radix step 10 ТЕМНЕЕ step 9**), а дерив-`pressed = #007837` (L 0.5009) → **ΔL(hover,pressed) = 0.007** — состояния неразличимы. Дерив-`suppl` при этом уезжает вверх (`#39a965`, L 0.6547).

### 3.2 Что означают состояния у Naive (2.44.1, замеры в OKLCH)

| | base | hover | pressed | suppl |
|---|---|---|---|---|
| stock **light** primary | `#18a058` L .6214 | `#36ad6a` **+.044** | `#0c7a43` **−.111** | `#36ad6a` = hover |
| stock **dark** primary | `#63e2b7` L .8294 | `#7fe7c4` **+.026** | `#5acea7` **−.056** | `rgb(42,148,125)` **−.228** |

- `*ColorSuppl` **потребляется исключительно dark-темами** (grep по `*/styles/light.mjs` — ноль вхождений; в dark — `alert`, `badge`, `slider`, `switch`, `dropdown`, `menu`, `timeline`, `gradient-text`). Это «supplementary» — вариант акцента **как ЗАЛИВКА на тёмной канве**, когда `primaryColor` для этого слишком светлый (S1, слова мейнтейнера).
- Ключевое совпадение: L стокового dark-`suppl` = **0.601** (primary) / **0.578** (error) — а `--color-action-primary` ThemeOn в dark = **L 0.5546**. **Наш solid-акцент живёт ровно в наивовской полосе `suppl`, а не `primaryColor`.**

### 3.3 КАНОН

```
Приоритет: явная роль темы  >  деривация.        (Rule 4 сохраняется)

hover    = роль `<base>-hover`, если тема её дала;
           иначе base + Δ(appearance)
pressed  = роль `<base>-pressed`, если тема её дала;
           иначе, если ЕСТЬ явный hover: экстраполяция base→hover с k=2 (OKLCH: L, C линейно; H — кратчайшей дугой)
           иначе: base + 2·Δ(appearance)
suppl    = роль `<base>-suppl`, если дала; иначе **= base** (identity)

Δ(appearance) = STEP10_DELTA = { light: −0.045, dark: +0.045 }   // = APPEARANCE_PARAMS шкалы @themeon/colors
appearance    = opts.appearance ?? resolved.schemes[opts.theme] ?? 'light'
                (fallback-эвристика: L(--color-bg-page) < 0.5 → 'dark')
```

Смысл: **состояния идут по СОБСТВЕННОЙ шкале темы, pressed — на ступень дальше hover в ту же сторону.** Это (а) совпадает с Radix (S3: 10 = hover solid; отдельной ступени pressed у Radix нет — её и надо синтезировать), (б) согласуется с нейтральной лестницей самой Naive в light (`hoverColor` L .965 → `pressedColor` L .947 — обе темнее фона, одна дальше другой), (в) даёт ОДНО правило для обеих тем.

Про доступ к шкале: у адаптера `ResolvedTheme`, ступеней нет — и **не нужно**: направление шкалы полностью восстанавливается из `appearance`, а если тема дала явный hover — из самого вектора `base→hover` (тогда даже кастомная, не-Radix шкала отработает верно). Единственная внешняя константа — `STEP10_DELTA`; канон: **`@themeon/colors` экспортирует её публично** (сейчас `APPEARANCE_PARAMS` приватен в `scale.ts:60-63`), `@themeon/naive` добавляет `@themeon/colors` в deps. Хардкод числа в адаптере = второй источник правды (нарушение R-01 §1).

### 3.4 Числа (реальный `button.self`, дефолт-тема, чернила = `--color-on-primary`)

| | base | hover | pressed | ΔL(h,p) |
|---|---|---|---|---|
| **light** L / APCA | .5553 / **75.6** | .5082 / **81.9** | .4601 / **87.7** | **0.048** (было 0.007) |
| **dark** L / APCA | .5553 / **75.6** | .6012 / **69.0** | .6464 / **62.0** | **0.045** (было 0.007) |

Полная тема (`e5`), статусы **без** явного hover, все ΔL(h,p) = 0.040…0.048; ни один `self()` не упал.

**Отвергнуто:**
- *«pressed зеркально hover» (конвенция Naive: hover светлее, pressed темнее)* — в light даёт «нажатие ОСВЕТЛЯЕТ кнопку» (pressed = base + 0.045 при hover = base − 0.045), что противоречит и явной роли темы (`accent-10` темнее), и здравому смыслу. В dark сработало бы, в light — нет ⇒ правило не единое.
- *«pressed = ступень 11 шкалы»* — на текущей шкале `@themeon/colors` step 11 в light **схлопывается на step 10** (L .5067 vs .5085 — это отдельная находка аудита #12), и адаптер к ступеням доступа не имеет. Непригодно.
- *«suppl = base + 0.10 L»* (текущее) — противоположно направлению стоковой Naive в dark (−0.23) и делает заливки блёклыми.

### 3.5 Остаточный риск деривации

В **dark** лестница идёт вверх по L ⇒ контраст белых чернил падает: 75.6 → 69.0 → **62.0**. Порог `text` (60) держится, порог `body` (75) — нет. Это неизбежно при Radix-направлении (10 светлее 9) и белых чернилах. Рекомендация: тест-инвариант «APCA(ink, fill) ≥ 60 для всех эмитируемых пар» (см. §6, T7), фейл — сигнал автору темы, а не адаптеру.

---

## 4. Новые находки (обнаружены при разведке; в аудите их нет)

### 4.1 [Blocker-класс] `primaryColor` у Naive — И заливка, И акцентные ЧЕРНИЛА на канве; в dark это даёт Lc 30.8

Провенанс-скан: `primaryColor` красит не только заливки, но и **текст/метки на канве** — `button.textColorText*`/`textColorGhost*` (text/ghost-кнопки), `menu.itemTextColorActive` (+20 ключей), `anchor.linkTextColorActive`, `tabs.tabTextColorActive*`, `typography.aTextColor`, `pagination.itemTextColorActive`, `dropdown.optionTextColorActive`, `radio.dotColorActive`, `spin.color`, `steps.indicatorTextColorFinish`, `time-picker`/`date-picker`/`cascader` active-текст.

У Radix эти роли **разведены**: 9 = solid fill, 11 = low-contrast text (S3). У Naive — один ключ. Итог на дефолт-теме:

| | accent-9 как чернила на канве |
|---|---|
| light: `#008a48` на `#fcfdfe` | Lc 68.9 (приемлемо) |
| **dark: `#008a48` на `#131314`** | **Lc 30.8** — ниже даже non-text-порога 45; активный пункт меню, ghost/text-кнопки, ссылки, активный таб **нечитаемы** |
| сток naive dark (`#63e2b7`) | Lc 75.6 |

**Это не баг темы, а системное свойство любой Radix-формы шкалы в тёмной теме Naive.** Канон — вторая, ACCENT-INK таблица оверрайдов из **уже существующей роли `--color-link`** (accent step 11): дефолт-тема даёт `#70d496` (dark) / `#007942` (light).
Замер после фикса: **dark 30.8 → 68.2**, light 68.9 → 75.6. `self()` всех компонентов — без ошибок.

Ключи (минимальный набор, проверен прогоном): `Button.textColorText*Primary`/`textColorGhost*Primary`, `Anchor.linkTextColorActive`, `Menu.itemTextColorActive{,Hover}`/`itemIconColorActive`, `Tabs.tabTextColorActive{Line,Bar,Card}`, `Pagination.itemTextColorActive`, `Typography.aTextColor`, `Dropdown.optionTextColorActive`.

> Развилка владельцу: `--color-link` семантически «ссылка», а нужна «текстовая ступень акцента». Либо (a) переиспользовать `link` (0 новых ролей), либо (b) ввести `--color-action-primary-text` (чище, +1 роль в контракте `@themeon/css`). Прямо перекликается с Q4 (генерализация).

### 4.2 [Major] Белые чернила не универсальны: «жёлтая полоса» APCA

Для заливок с L ≈ 0.70 (amber/warning) **ни белые, ни чёрные чернила не дают 60**: `#d48e00` → белые **57.8**, чёрные **51.4**. (У стоковой Naive та же болезнь: `#f0a020` + белый = **46.6**.) Отсюда: fallback «ink = on-primary» для статусов **недостаточен**; канон — роли `--color-on-{success,warning,error,info}` (по аналогии с `--color-on-primary`), а `themeon check` (P4.5) обязан гонять пары `(ink, fill)`, которые СОБИРАЕТ адаптер, а не только пары ролей ThemeOn (это же и корень того, что гейт `@themeon/css` не поймал Blocker #3).

---

## 5. Эталонные куски кода

```ts
// ── color.ts ──────────────────────────────────────────────────────────────
import { STEP10_DELTA } from '@themeon/colors'   // { light: -0.045, dark: +0.045 } — публичный экспорт (новый)

/** Литерал → hex. Бросает на непарсибельном (var()/color-mix()/currentColor/…). */
export function toHexStrict(value: string): string {
  return new Color(value).toString({ format: 'hex', collapse: false })  // colorjs бросит сам
}

export interface DeriveInput {
  base: string
  appearance: 'light' | 'dark'
  hover?: string        // явная роль темы, если есть
  pressed?: string
  suppl?: string
}

export function deriveInteractionStates(i: DeriveInput): { hover: string; pressed: string; suppl: string } {
  const d = STEP10_DELTA[i.appearance]
  const hover = i.hover ?? shiftL(i.base, d)
  const pressed = i.pressed ?? (i.hover ? extrapolateOklch(i.base, i.hover, 2) : shiftL(i.base, 2 * d))
  const suppl = i.suppl ?? i.base            // identity: наш solid = наивовский «suppl»-диапазон
  return { hover, pressed, suppl }
}
```

```ts
// ── to-native.ts ──────────────────────────────────────────────────────────
function buildLookup(resolved: ResolvedTheme, theme?: string): Record<string, string> {
  const lookup: Record<string, string> = {}
  for (const t of resolved.tokens) lookup[t.varName] = t.value              // ЛИТЕРАЛЫ (не .vars!)
  if (theme !== undefined) for (const t of resolved.themes[theme] ?? []) lookup[t.varName] = t.value
  return lookup
}

function appearanceOf(resolved: ResolvedTheme, opts?: ToNativeOptions): 'light' | 'dark' {
  if (opts?.appearance) return opts.appearance
  if (opts?.theme && resolved.schemes[opts.theme]) return resolved.schemes[opts.theme]
  return 'light'
}

export function toNative(resolved: ResolvedTheme, opts?: ToNativeOptions): GlobalThemeOverrides {
  const lookup = buildLookup(resolved, opts?.theme)
  const appearance = appearanceOf(resolved, opts)
  const bad: string[] = []
  const color = (v: CssVarName): string | undefined => {
    const raw = lookup[v]; if (raw === undefined) return undefined
    try { return toHexStrict(raw) } catch { bad.push(`${v}: ${raw}`); return undefined }
  }
  // …common (§2.4) + INK-оверрайды (§2.5) + ACCENT-INK (§4.1); baseColor НЕ ТРОГАЕМ…
  if (bad.length && (opts?.onInvalidColor ?? 'throw') === 'throw') {
    throw new ThemeonError('BAD_COLOR',
      `@themeon/naive: ${bad.length} color role(s) are not literal colours — Naive/seemly cannot ` +
      `consume them:\n  ${bad.join('\n  ')}\n` +
      `Colours must be resolvable by colorjs.io (hex/rgb/hsl/oklch/…). ` +
      `var()/color-mix()/light-dark()/currentColor are not supported by seemly.`)
  }
  return mergeOverrides({ common, ...inkOverrides } as GlobalThemeOverrides, opts?.overrides)
}
```

---

## 6. Обязательные интеграционные тесты (через НАСТОЯЩИЙ naive-ui)

Все — красные до фикса, зелёные после. Никаких самодельных `vars`-фикстур: вход строится **только** `resolveTheme(defaultTheme)` с **дефолтным** `refLayer`.

| # | Тест | Что ловит |
|---|---|---|
| **T1** | `toNative(resolveTheme(defaultTheme))` — каждое значение `common`, помеченное `kind:'color'`, матчит `/^#[0-9a-f]{6}([0-9a-f]{2})?$/i` | Blocker #2 (сейчас `var(--…)`) |
| **T2** | `for (const c of ALL_NAIVE_STYLES) c.self({...commonLight, ...out.common})` **не бросает**; то же с `commonDark` + `toNative(r,{theme:'dark'})` (импорт `naive-ui/es/*/styles/*.mjs`; минимум: button, checkbox, radio, dropdown, anchor, alert, input, tag, tooltip, slider, switch, badge, menu) | Blocker #2 в рантайме seemly |
| **T3** | `changeColor(out.common.primaryColor, {alpha:.5})` — не бросает (прямой контракт seemly) | Blocker #2 |
| **T4** | `toNative()` на теме с `--color-x: 'color-mix(in oklch, red, blue)'` → **бросает `ThemeonError('BAD_COLOR')`**, сообщение содержит имя var'а; с `{onInvalidColor:'skip'}` — не бросает и ключ отсутствует | §1.3 fail-loud |
| **T5** | `btnDark.self(merged).textColorPrimary === toHex(vars['--color-on-primary'])` **и** `APCA(textColorPrimary, colorPrimary) ≥ 60` (факт: 32.7 → 75.6) | Blocker #3 |
| **T6** | `out.common.baseColor === undefined` (адаптер не трогает канву) **и** `checkboxLight.self(merged).color === '#FFF'` (поверхность не поехала) **и** `alertLight.self(merged).colorInfo === alertLight.self(commonLight).colorInfo` при равных статусах (composite-подложка цела) | Blocker #3, регресс-щит от «on-primary→baseColor» |
| **T7** | Для каждой эмитируемой пары (ink, fill) — `|APCA| ≥ 60`, обе темы, все роли, которыми владеет тема | §2.6 / §4.2 |
| **T8** | `ΔL_oklch(primaryColorHover, primaryColorPressed) ≥ 0.03` в light И dark; `primaryColorPressed !== primaryColorHover !== primaryColor` (факт: 0.007 → 0.048/0.045) | Major #21 |
| **T9** | `out.common.primaryColorSuppl === out.common.primaryColor` (suppl-identity); `alertDark.self(merged).colorInfo` — валидный rgba (seemly не бросил) | Major #21 |
| **T10** | Явная роль сильнее деривации: тема с `--color-action-primary-pressed` → `common.primaryColorPressed` равен ей байт-в-байт | Rule 4 |
| **T11** | dark: `APCA(menuDark.self(merged).itemTextColorActive, common.bodyColor) ≥ 60` (факт: 30.8 → 68.2) | новая находка §4.1 |
| **T12** | Паритет каналов: `toNative(resolveTheme(t, {refLayer:'inline'}))` **глубоко равен** `toNative(resolveTheme(t))` и `…{refLayer:'all'}` — выход адаптера не зависит от транспорта ref-слоя | корень Blocker #2 (нельзя починить только `inline`) |

Инфраструктура: `packages/naive/src/*.test.ts` уже имеет `naive-ui` в devDeps — импорт `naive-ui/es/**/styles/*.mjs` доступен без нового пакета.

---

## 7. Развилки для владельца

1. **Ink-таблица per-component** (§2.5) — это новая ответственность адаптера (~14 ключей на primary-only тему, +5 на каждый заданный статус). Альтернатив нет: `baseColor` физически один и обслуживает и наши, и стоковые заливки (§2.3). Подтвердить объём.
2. **§4.1 (accent-ink в dark)** — принять в P8 (тогда `--color-link` или новая роль `--color-action-primary-text`) либо вынести в отдельную фазу. Без этого дефолт-тема в dark даёт нечитаемые меню/ссылки/ghost-кнопки (Lc 30.8) — по тяжести это Blocker.
3. **Роли `--color-on-{status}`** (§4.2) — расширение контракта `@themeon/css`. Без них статусные кнопки в жёлтой полосе не проходят APCA.
4. **`STEP10_DELTA` в публичный API `@themeon/colors`** + `@themeon/colors` в deps `@themeon/naive` (сейчас его там нет).
5. **`ToNativeOptions`**: добавить `appearance?: 'light'|'dark'` и `onInvalidColor?: 'throw'|'skip'` — оба фиксируются `api.test.ts` (публичный контракт).
6. Q4-связка: `varMap`/`roles`-опция сделала бы обе INK-таблицы настраиваемыми — но канон обязан быть корректен **по умолчанию**, без настройки.

---

## 8. Воспроизведение

Скрипты (scratchpad, вне репо): `e1-literals.mjs` (§1), `e2-canon.mjs` (§2.2, §3.2), `e3-provenance.mjs` (§2.1 — провенанс-скан), `e4-final.mjs` (§1.3, §2.3, §2.6, §4.1), `e5-fulltheme.mjs` (§2.6 полная тема, §3.4), `e6-ink.mjs` (§4.2).
Все импортируют **установленный** `naive-ui@2.44.1` (`es/**/styles/*.mjs`), `seemly@0.3.10`, собранные `packages/{core,colors,css}/dist`.
