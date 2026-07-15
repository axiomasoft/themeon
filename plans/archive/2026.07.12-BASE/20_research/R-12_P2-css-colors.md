# R-12 — P2 углубление: `@themeon/css` + `@themeon/colors` (точечные API/edge-cases)

> RAG-research для детализации фазы P2 (2026-07-12). Углубляет R-04/R-06, НЕ заменяет их.
> **Отклонение метода:** perplexity-web MCP в сессии не подключён (ToolSearch не находит
> `search_advanced`/`search_deep`) — использованы WebSearch/WebFetch + npm registry как
> ground truth версий (паттерн P-D10). Все факты с URL.

## 1. Пины версий (ground truth registry.npmjs.org, 2026-07-12)

| Пакет | latest | Дата релиза | Лицензия | Комментарий |
|:--|:--|:--|:--|:--|
| `culori` | **4.0.2** | 2025-06-27 | MIT | v4 — мажор с breaking changes (§2) |
| `apca-w3` | **0.1.9** | 2022-07-04 | **Limited W3 License** | ⚠️ не MIT, не обновлялся 4 года (§3) |
| `colorjs.io` | **0.7.0** | **2026-07-11** | MIT | свежий релиз; встроенный `contrastAPCA` (§3) |
| `@radix-ui/colors` | 3.0.0 | 2023-10-02 | MIT | референс формы шкалы, не зависимость (§4) |
| `lightningcss` | 1.32.0 | 2026-03-09 | MPL-2.0 | кандидат build-тула pure-CSS пакета (§7) |
| `postcss` | 8.5.17 | 2026-07-11 | MIT | альтернатива/compat |
| `cssnano` | 8.0.2 | 2026-06-11 | MIT | минификация, если PostCSS-путь |

Источник: registry API `https://registry.npmjs.org/<pkg>` (dist-tags + time), 2026-07-12.

## 2. culori 4.x — точный API для seed→шкала

- **v4.0.0 (2025-01) breaking**: клампинг на парсинге (alpha→[0,1], L→диапазон пространства);
  числовые диапазоны HSL/HWB-синтаксиса исправлены [0,1]→[0,100]; missing components
  сериализуются `"0"` в legacy-синтаксисах и `"none"` в modern; добавлено пространство
  ICtCp (`itp`) + `differenceItp()`. **v4.0.2** — исправлены матрицы XYZ↔Oklab под финальную
  CSS Color 4 (важно: старые версии дают чуть другие OKLCH-числа!); улучшен error-handling
  `toGamut()` для пространств без lightness/chroma. **v4.0.1** — фикс reference error в
  tree-shaked сборке (`itp/definition.js`).
  https://github.com/evercoder/culori/releases
- **v3 breaking (наследуется)**: парсинг modern/legacy синтаксиса rgb/hsl разнесён по функциям
  (`parseRgb`/`parseRgbLegacy`); в `lab()`/`lch()` L — только `<percentage>`; снесены
  `color(--oklch)`-идентификаторы. https://culorijs.org/guides/migration/
- **Tree-shaking — обязателен для нас**: импорт из **`culori/fn`** (`useMode`, `modeOklch`,
  `modeRgb`, `modeP3`, низкоуровневые `parseHex`, `convertRgbToHsl`, `serializeHsl` — без
  регистрации пространств). Главный вход `culori` тянет всё. https://culorijs.org/guides/tree-shaking/
- **Gamut mapping — три инструмента** (https://culorijs.org/api/,
  https://github.com/evercoder/culori/blob/main/src/clamp.js):
  - `clampChroma(color, mode, rgbGamut)` — бисекция по chroma; известный минус: иногда
    десатурирует сильнее необходимого;
  - **`toGamut(dest = 'rgb', mode = 'oklch', delta = differenceEuclidean('oklch'), jnd = 0.02)`** —
    алгоритм CSS Color 4 (кандидат сравнивается с clipped-версией через delta+JND) —
    **рекомендуемый для шкал** (совпадает с тем, что делают браузеры);
  - `inGamut`/`clampGamut` — грубый clip.
- Вывод для `@themeon/colors`: пин `culori@4.0.2`, импорты только `culori/fn`,
  gamut-стратегия `toGamut('rgb')` для sRGB-вывода + опционально `p3`.

## 3. APCA: apca-w3 vs colorjs.io — ⚠️ лицензионная развилка (решение дизайн-сессии P2)

- **API `apca-w3@0.1.9`**: `sRGBtoY([r,g,b])` → luminance; `APCAcontrast(txtY, bgY)` → **знаковый
  Lc** (отрицательный для light-on-dark — сравнивать по модулю); `calcAPCA(txt, bg)`;
  `fontLookupAPCA(Lc)` → массив [Lc, 9 размеров px для весов 100–900]; также `reverseAPCA`,
  `alphaBlend`, `displayP3toY`, `adobeRGBtoY`. Peer-зависимость `colorparsley`.
  https://www.npmjs.com/package/apca-w3 · https://github.com/Myndex/apca-w3
- **Пороги Lc** (для CLI `themeon check` и гейта тенант-тем, D15): **Lc 90** — предпочтительно
  body-text; **Lc 75** — минимум body-text; **Lc 60** — минимум прочего контент-текста
  (fluent text); **Lc 45** — крупный/жирный текст (headlines) и минимум для non-text UI;
  ниже 30/15 — только disabled/декоратив.
  https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html
- **⚠️ Лицензия apca-w3 — НЕ permissive** («Limited W3 License»): коммерческое использование
  запрещено без отдельного соглашения, **кроме** предсказания контраста web-контента в рамках
  W3-cooperative agreement; запрещены medical/safety/military-применения; пункт об
  audit-доступе Myndex Research к коммерческим интеграциям. Есть открытая дискуссия
  «Is a Permissive License Available?» — permissive-лицензии нет.
  https://github.com/Myndex/apca-w3/blob/master/LICENSE.md ·
  https://git.apcacontrast.com/documentation/LICENSE.html ·
  https://github.com/Myndex/apca-w3/discussions/12
- **Альтернатива: `colorjs.io@0.7.0` (MIT, релиз 2026-07-11)** — реализует APCA 0.0.98G-4g как
  `contrastAPCA` среди прочих контраст-алгоритмов (WCAG21, Michelson, Weber, Lstar, DeltaPhi).
  https://colorjs.io/docs/contrast — но тянет целую цветовую библиотеку рядом с culori
  (дублирование функционала в deps `@themeon/colors`).
- Ещё альтернатива-ориентир: Bridge-PCA (drop-in замена WCAG2-чисел на APCA-технологии,
  тот же автор, та же лицензионная семья). https://github.com/Myndex/SAPC-APCA
- **Развилка для fable-дизайна P2** (D7 пинует «APCA», но не пакет):
  (а) `apca-w3` как обычная dependency — использование ThemeOn = ровно разрешённый скоуп
  (web-content contrast), лицензия остаётся на пакете, мы не вендорим код; минусы — не-MIT
  в дереве зависимостей MIT-пакета (ползёт в NOTICE потребителей), стагнация с 2022,
  audit-клауза отпугивает enterprise;
  (б) `colorjs.io` — MIT, живой (0.7.0 вчера), но вторая color-библиотека рядом с culori;
  (в) собственная реализация формулы — юридически мутно (лицензия Myndex покрывает алгоритм,
  не только код) — НЕ рекомендуется.
  Заметка: WCAG3 по-прежнему draft, APCA — кандидат, не норматив; в 2026 это guardrail-метрика,
  не комплаенс (https://www.w3.org/WAI/GL/task-forces/silver/wiki/User:Myndex/APCA_model).

## 4. Radix Colors — референс формы 12-шаговой шкалы (углубление R-04)

- **Семантика шагов** (https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette):
  1 «App background» · 2 «Subtle background» · 3 нормальный фон UI-элемента · 4 hovered ·
  5 active/selected · 6 «Subtle borders» · 7 «UI element border / focus rings» ·
  8 hovered border · 9 **solid** (максимальная chroma, шаг = seed) · 10 hovered solid ·
  11 low-contrast text · 12 high-contrast text.
- **v3.0.0** (2023-10): у каждой шкалы alpha-вариант + P3-вариант (alpha-блендинг в P3 ≠ sRGB,
  wide-gamut нужен для полной сатурации на P3-дисплеях); контраст-таргеты Radix считаются
  **по APCA**. https://www.radix-ui.com/colors/docs/overview/releases ·
  https://x.com/radix_ui/status/1708914830881476976
- **Генератор кастом-палитры** (https://www.radix-ui.com/colors/custom) — чёрный ящик (веб-тул),
  но реконструированный сообществом алгоритм: OKLCH; hue стабилен; **chroma распределяется
  гауссианой по lightness** (пик chroma ~L 0.6 light / ~0.7 dark); интерполяция между
  якорями; **step 9 = введённый seed, step 10 = darker hover**, остальные производные.
  Референсы-реконструкции: https://www.breakcolorui.com/docs/colors ·
  https://oklch.fyi/color-palettes · Мини-вывод для `@themeon/colors`: воспроизводим ФОРМУ
  (12 ролей + светлая/тёмная пары + гауссова chroma-кривая), не пиксельную идентичность Radix.

## 5. `@layer` — edge-cases соседства с Tailwind v4 и потребительским CSS

- Tailwind v4 сам построен на реальных cascade layers: инжектит `theme → base → components →
  utilities`. https://tailwindcss.com/blog/tailwindcss-v4
- **Порядок layers фиксируется первым упоминанием** → пакет обязан шипить декларацию порядка
  (`@layer themeon.tokens, themeon.reset, themeon.base, themeon.composition,
  themeon.components, themeon.utilities;`) первым statement'ом entry-CSS; потребитель,
  использующий и ThemeOn и Tailwind, управляет старшинством порядком своих `@import`/`@layer`-
  деклараций (прецедент документации: MUI «CSS Layers»,
  https://mui.com/material-ui/customization/css-layers/).
- **Unlayered CSS потребителя всегда сильнее любого нашего layer** — это и есть D8-гарантия
  «ноль !important»; сторонний CSS без layers конфликтует только сам с собой.
  https://css-tricks.com/using-css-cascade-layers-with-tailwind-utilities/
- Потребитель может воткнуть наш файл в свой layer: `@import url("@themeon/css/reset.css")
  layer(vendor)` — вложенность даст `vendor.themeon.reset`; документировать как рецепт.
- Известный подводный камень Tailwind v4: `@apply`/`@utility` внутри чужих `@layer` работает
  иначе, чем в v3 (https://github.com/tailwindlabs/tailwindcss/discussions/17082) — для нас
  не блокер (мы не используем @apply), но упомянуть в доке моста.

## 6. Reset/base 2026 — «минимальный интенциональный», не мега-reset

- Консенсус 2026: короткий (~20 строк) reset в отдельном layer; «эра защитного мега-reset
  закончилась». https://www.cssportal.com/blog/modern-css-reset-do-you-still-need-one/
- Референсы: Josh Comeau «My Custom CSS Reset» (обновлялся 2025–2026: `interpolate-size`
  добавлен 2025-03, уточнение line-height/WCAG 2026-03)
  https://www.joshwcomeau.com/css/custom-css-reset/ · Andy Bell «A (more) Modern CSS Reset»
  https://piccalil.li/blog/a-more-modern-css-reset/ (via https://jakelazaroff.com/words/my-modern-css-reset/).
- Современные включения для `themeon.base`: `text-wrap: balance` на заголовках,
  `text-wrap: pretty` на параграфах, `interpolate-size: allow-keywords` (анимация к auto),
  `color-scheme` наследование. Всё — внутри layer (низкая специфичность = наша D8-модель).

## 7. Композиция-примитивы и site-blueprints — конвенции параметров

- **Every Layout — конвенции пропсов** (официального npm-пакета нет, R-06 §5 подтверждён):
  Stack — `margin-block-start: var(--space, 1.5em)`; Cluster/Switcher — `gap: var(--gutter, ...)`;
  Switcher — `--switcher-target-container-width` (порог переключения ряд↔столбец);
  Sidebar — gap-based, без внешних margins. https://every-layout.dev/layouts/stack/ ·
  https://every-layout.dev/layouts/sidebar/ · https://every-layout.dev/layouts/
  Вывод: наша схема `--<primitive>-gap`/`--<primitive>-threshold` (план §4 P2) совместима по
  духу, но префиксованные имена (не голые `--space`/`--gutter`) — правильнее: голые имена
  наследуются сквозь вложенные примитивы и дают спуки-эффекты (известная боль EL).
- **Бургер/nav CSS-only (P-D4 site-blueprints)**: **Popover API + CSS Anchor Positioning —
  Baseline 2026** (anchor positioning: Chrome 125+ / Firefox 132+ / Safari 18.2+; `@position-try`
  fallback-флипы — Safari 18.4+). Popover даёт бесплатно: light-dismiss, Esc, top-layer
  (без z-index), фокус-менеджмент — **бургер-меню без JS реально**.
  https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using ·
  https://css-irl.info/anchor-positioning-and-the-popover-api/ ·
  https://iankduffy.com/articles/building-mobile-menu-with-the-popover-api
  Рецепт blueprint'а: разметка с `popover`/`popovertarget` в доке (пакет — только CSS),
  деградация: без anchor-positioning меню остаётся работоспособным (top-layer центр/фуллскрин).

## 8. Сборка pure-CSS пакета

- **lightningcss 1.32.0** (MPL-2.0 — тул, не зависимость рантайма): CLI
  `lightningcss --bundle --minify --targets ">= 0.25%" input.css -o output.css`;
  `--bundle` инлайнит `@import`; `drafts: { customMedia: true }` компилирует `@custom-media`
  под таргеты (закрывает не-Baseline статус @custom-media из R-11!); `browserslistToTargets()`
  для browserslist-запросов. https://lightningcss.dev/docs.html
- `[VERIFY при исполнении P2]`: сохранность `@layer`-структуры lightningcss'ом при
  `--bundle --minify` (докой явно не заявлена) — дым-тест в CI: grep `@layer themeon` в dist.
- Exports-map/sideEffects для CSS — канон уже в R-06 §«Дистрибуция CSS» (`sideEffects:
  ["**/*.css"]`, per-file exports) — не дублирую.

## 9. Сводка выводов для fable-дизайна P2

1. `culori@4.0.2` (пин точный: 4.0.2 фиксит Oklab-матрицы), импорт только из `culori/fn`,
   gamut — `toGamut('rgb'|'p3', 'oklch')`.
2. **Открытая развилка APCA-пакета** (§3): apca-w3 (точный, но Limited W3 License + стагнация)
   vs colorjs.io 0.7.0 (MIT, свежий, но вторая color-lib). Решить в дизайн-сессии явным D#.
3. Пороги гейтов: Lc 75 body / 60 текст / 45 крупный+non-text UI; Lc — знаковый, сравнивать |Lc|.
4. Шкала: форма Radix (роли шагов §4), seed = step 9, гауссова chroma; light+dark пары;
   alpha/P3-варианты — v2-кандидат, не обязательство P2.
5. `@layer`-порядок декларировать первым statement'ом; рецепты соседства с Tailwind v4 и
   `@import ... layer()` — в доку.
6. Reset — минимальный, в layer, с text-wrap balance/pretty (референсы Comeau/Bell §6).
7. Примитивы — префиксованные custom properties (не голые `--space`), Switcher-порог по EL.
8. Site-blueprints: бургер на Popover API (Baseline 2026), anchor-positioning с деградацией.
9. Сборка CSS — lightningcss bundle+minify+drafts.customMedia; VERIFY-метка на @layer в dist.
