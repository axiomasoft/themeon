# R-11 — P1: точечный research для `@themeon/core` (типы, резолвер, naming, сериализаторы, applier)

> RAG-research (perplexity-web search_advanced, 2026-07-08) под детализацию фазы P1.
> Углубляет R-03 (DTCG), R-04 (Tailwind/CSS-native); НЕ пересматривает D1–D17.
> Все внешние факты — с URL; сомнительные места помечены `[VERIFY-ON-IMPL]`.

---

## 1. DTCG Format Module 2025.10 — точные shapes для `toDTCG`/`fromDTCG`

Спека: https://www.designtokens.org/TR/2025.10/format/ (CG-FINAL 2025-10-28, см. R-03).

### Color (`$type: "color"`)

Каноническая структурная форма 2025.10:

```json
{ "$type": "color",
  "$value": { "colorSpace": "oklch", "components": [0.72, 0.11, 221.19],
              "alpha": 1, "hex": "#3ab7bf" } }
```

- `colorSpace` (обязателен в структурной форме) — идентификаторы CSS Color 4: `srgb`, `display-p3`, `oklch`, `lab`, `hsl`…
- `components` — массив чисел, длина/диапазоны зависят от colorSpace (srgb: 3 × [0,1]).
- `alpha` — опционален, дефолт 1 (opaque). `hex` — опциональный 6-значный fallback **без** альфы (альфа всегда из `alpha`).
- Строковая форма (`"#ff0000"`, `"color(display-p3 1 0 0)"`) остаётся валидной — legacy.

**Импликация для ThemeOn:** `fromDTCG` обязан принимать обе формы (строку и объект) и нормализовать во внутреннее представление; `toDTCG` — эмитить структурную форму (внутренний авторинг OKLCH → `colorSpace: "oklch"`) + `hex`-fallback для старого тулинга.

### Dimension (`$type: "dimension"`)

Структурная форма: `{ "value": 0.5, "unit": "rem" }`; legacy-строка `"16px"` тоже валидна. `fromDTCG` принимает обе, `toDTCG` эмитит структурную.

### Алиасы

- Curly-brace `{group.token}` — строго token-level (весь `$value` целиком), имена без `{`/`}`/`.`, не начинаются с `$`.
- **Новое в 2025.10: `$ref` JSON Pointer (RFC 6901)** — property-level переиспользование, напр. `#/base/spacing/$value/value` (только числовая часть dimension). `[VERIFY-ON-IMPL: точный статус $ref в финальном тексте спеки — сверить раздел Aliases при написании конвертера]`
- Резолвер `@themeon/core` для собственной модели работает с typed-TS-ссылками (D2); `{path}` и `$ref` нужны только в `fromDTCG`-импорте.

### Composite types (13 типов зафиксированы)

`color, dimension, fontFamily, fontWeight, duration, cubicBezier, number, strokeStyle, border, transition, shadow, gradient, typography`.

- **shadow**: `{ color, offsetX, offsetY, blur, spread }` — dimension-объекты; `inset` — вне спеки (через `$extensions`).
- **typography**: `{ fontFamily, fontWeight, fontSize, lineHeight, letterSpacing }` — дети либо nested-токены (`$type`+`$value`), либо голые значения.
- **gradient**: `{ type: "linear", angle: {value,unit}, stops: [{position, color}] }`.
- **border**: `{ color, width, style: strokeStyle }`.

Правило конвертера: well-known поля валидировать, **неизвестные поля и `$extensions` сохранять** (round-trip без потерь).

### Прочие дельты 2025.10 vs драфты 2024

- `$type` наследуется вниз по группам; guessing типа из значения запрещён (токен без резолвимого типа = invalid).
- `$root` — зарезервированное имя «токен-корень группы»; `$extends` — наследование групп. `[VERIFY-ON-IMPL: оба — сверить с текстом спеки; perplexity мог экстраполировать]`

### Скоуп-рекомендация P1

`toDTCG`/`fromDTCG` v1: покрыть примитивы (color/dimension/number/fontFamily/fontWeight/duration/cubicBezier) + curly-brace алиасы + `$extensions`-passthrough. Composite (shadow/typography/gradient) — принять на импорт (маппинг в well-known группы shadow/text), эмитить по мере поддержки моделью. `$ref` JSON Pointer — импорт-only, минимальный.

Источники: https://www.designtokens.org/TR/2025.10/format/ · https://www.dembrandt.com/validator · https://design.gitlab.com/product-foundations/design-tokens-authoring

---

## 2. DTCG Resolver Module 2025.10 — темы в interchange

Отдельная спека (не часть Format Module), общий лейбл 2025.10. Файл `*.resolver.json`.

Структура: `version: "2025.10"` (обязателен, точная строка) + `sets` (имя → `{sources: [...]}`)
+ `modifiers` (имя → `{contexts: {light: [...], dark: [...]}, default}`) + `resolutionOrder`
(упорядоченный массив `$ref` на sets/modifiers; позже = сильнее). Правила: modifier ≥ 2
contexts; modifier не может ссылаться на modifier; `$ref` без циклов; inline-элементы
resolutionOrder требуют `name`+`type`.

**Тема = modifier-контекст с override-set поверх базового set** — точное соответствие модели ThemeOn «тема = патч sys-слоя» (D6/D15):

```json
{ "version": "2025.10",
  "sets": { "base": { "sources": [{ "$ref": "./base.tokens.json" }] } },
  "modifiers": { "theme": { "contexts": { "light": [], "dark": [{ "$ref": "./dark.tokens.json" }] }, "default": "light" } },
  "resolutionOrder": [{ "$ref": "#/sets/base" }, { "$ref": "#/modifiers/theme" }] }
```

Тулы 2026: **Terrazzo 2.x — референс-реализация** (единственный полный resolver);
Style Dictionary v5 — DTCG-aligned по формату, но `.resolver.json` нативно НЕ понимает.

**Скоуп-рекомендация P1:** `toDTCG(theme)` эмитит **multi-file**: `base.tokens.json` + `<theme>.tokens.json` (патчи) + опциональный `themeon.resolver.json` по схеме выше — тогда Terrazzo подхватывает из коробки. Реализовывать полный Resolver-движок в ядре НЕ нужно (у ThemeOn свой резолвер, D2).

Источники: https://terrazzo.app/docs/guides/resolvers/ · https://htmlspecs.com/css/design-tokens-resolver/ · https://styledictionary.com/versions/v5/migration/ · https://terrazzo.app/docs/integrations/js/

---

## 3. Tailwind v4.3 — детали namespaces для naming engine (уточнение D5)

Источник: https://tailwindcss.com/docs/theme (проверено через зеркало+обзоры; R-04 base).

### Полный список namespaces (v4.x)

`--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*` (letter-spacing),
`--leading-*` (line-height), `--spacing-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`,
`--text-shadow-*`, `--drop-shadow-*`, `--blur-*`, `--perspective-*`, `--aspect-*`,
`--ease-*`, `--animate-*`, `--breakpoint-*`, `--container-*` (max-width/container-утилиты).

### Критично для naming engine (новое vs R-04)

1. **Double-dash сабопции**: `--text-2xl` (font-size) + `--text-2xl--line-height`
   (companion, `calc(2 / 1.5)`). Это конвенция Tailwind для метрик размера. Letter-spacing
   companion (`--text-N--letter-spacing`) в дефолтной теме НЕТ — tracking живёт отдельно
   в `--tracking-*`. → Naming engine ThemeOn должен уметь эмитить пару
   `--text-<size>` / `--text-<size>--line-height` из composite text-токена
   (`text.2xl = {size, lineHeight}`), иначе Tailwind-мост (P4) потеряет leading.
2. **`--spacing` (без суффикса) — базовый скаляр** (деф. `0.25rem`): утилиты `mt-8`
   генерятся как `calc(var(--spacing) * 8)` динамически, `--spacing-8` не требуется.
   Финитная шкала = `--spacing: initial` + явные `--spacing-N`. → У ThemeOn шкала
   финитная (space.* токены) — мост в P4 обязан гасить динамику (`--spacing: initial`)
   и эмитить явные значения; naming engine это учитывать не должен (просто `--spacing-N`).
3. **Wipe-синтаксис**: `--color-*: initial` (namespace) / `--*: initial` (вся тема) —
   рецепт «ThemeOn как единственный источник» для моста.
4. **`@theme inline`** — эмитит в утилиту само выражение (`var(--ds-x)`), а не обёртку;
   обязателен, когда theme-var ссылается на внешнюю переменную (наш случай: subtree/
   tenant-скоупинг). **`@theme static`** — эмитит все переменные независимо от usage
   (нужно, если потребитель хочет полный набор в runtime). Мост P4: `@theme inline` —
   канон (подтверждает D5), `static` — опция генератора.

### Следствие для канона имён ThemeOn (P1)

Число-обработка naming engine обязана выдавать ровно Tailwind-форму: `2xl` остаётся
литералом `2xl` (`--text-2xl`, `--breakpoint-2xl`, `--container-7xl`), никаких `-2-xl`.
Тест-кейсы: `size2xl → --text-2xl`, `space1_5 / space-1.5 → --spacing-1-5`
(дробные шаги Tailwind пишет через точку в имени класса, но в var-имени — дефис:
`--spacing-1.5` невалиден как dashed-ident без экранирования → выбрать `1-5`-форму
и покрыть тестом; `[VERIFY-ON-IMPL: как именно default theme.css именует дробные шаги]`).

Источники: https://tailwindcss.com/docs/theme · https://blog.logrocket.com/tailwind-css-guide/

---

## 4. `@custom-media` — НЕ шипнут нативно (важная поправка к сериализатору D14)

- MDN (2026): experimental, **не Baseline**, отсутствует в стабильных Chrome/Firefox/Safari/Edge; Firefox — только Nightly-флаг. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@custom-media
- Продакшен-путь — только build-transform: `postcss-custom-media` или Lightning CSS.
- Нюанс спеки: несколько `@custom-media` с одним именем допустимы, «scope-aware override» ещё обсуждается — не полагаться.

**Импликация для P1 (уточнение реализации D14, решение не меняется):** сериализатор
эмитит breakpoints тремя каналами: (а) CSS vars `--breakpoint-*` в `:root`;
(б) `@custom-media --bp-md (min-width: 768px)` — **опция** `emitCustomMedia`
(деф. true, но в доке пакета явно: требует postcss-custom-media/LightningCSS у
потребителя; Vite/Lightning CSS транспилирует из коробки `[VERIFY-ON-IMPL: проверить
lightningcss custom-media флаг в Vite 8 дефолтах]`); (в) JS-экспорт `breakpoints`
(числа+единицы) для vueuse/адаптеров. Внутри собственного CSS пакета (`@themeon/css`, P2)
в медиа-запросах использовать конкретные значения из токенов, не `@custom-media` —
пакет обязан работать без PostCSS у потребителя.

---

## 5. Runtime applier: `@property` / `CSS.registerProperty` / `setProperty` — gotchas

Источник: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property

- `@property` (CSS) ≡ `CSS.registerProperty()` (JS). Прецеденс: среди `@property` —
  последняя в порядке стилей; **JS-регистрация побеждает CSS**. Повторная регистрация =
  полная перезапись определения (не патч).
- Имена custom properties **case-sensitive** (`--colorPrimary` ≠ `--colorprimary`) —
  ещё один аргумент за единый naming engine на build и runtime (D4).
- Для **зарегистрированного** свойства невалидное значение через `setProperty` молча
  отбрасывается → откат к `initialValue` (выглядит как «случайный дефолт») —
  applier должен валидировать значения ДО записи (в P1 — минимум: dev-warn).
- `removeProperty('--x')` = снять inline → значение из каскада/`initialValue` —
  это канонический механизм `resetTheme()`/снятия tenant-патча.
- Паттерн для токен-движка: **static schema, dynamic values** — регистрировать типы
  (`@property`) один раз при старте (генерируемый блок в static CSS — уже в D6/R-04
  для анимируемых токенов), затем менять только значения `setProperty`. Не менять
  `syntax` существующего имени между версиями (контракт!) — новое имя + deprecation.
- Inline-стили от applier проигрывают `!important` в CSS потребителя — задокументировать
  как известное ограничение (у ThemeOn `@layer`-каркас делает `!important` ненужным, D8).

**Импликация P1:** сигнатура applier — `applyTheme(el: HTMLElement, patch: ResolvedVars, opts?)`
+ `clearTheme(el, names?)` через `removeProperty`; parity-тест build/runtime гоняет один
и тот же resolved-словарь через CSS-сериализатор и через applier и сравнивает имена/значения.

---

## 6. Prior art TS-first API — форма `defineTheme` (подтверждение D2 + заимствования)

### vanilla-extract (https://vanilla-extract.style/documentation/theming/)

- `createThemeContract(shape)` → типизированный контракт (лифы = CSS-var ссылки), CSS не эмитит.
- `createTheme(contract, values)` → `[className, vars]`; **полнота реализации контракта
  проверяется структурной типизацией** (пропуск токена = ошибка компиляции).
- `assignInlineVars(vars, partial)` — типизированный частичный runtime-патч.
- Заимствовать: (а) контракт и реализация — разные сущности; тема ThemeOn = `Partial`-патч
  sys-контракта с проверкой «ключи ⊆ контракта»; (б) потребитель никогда не пишет
  строку `var(--x)` — только typed-ссылку.

### Panda CSS (https://panda-css.com/docs/customization/conditions · https://panda-css.com/docs/guides/multiple-themes)

- `defineTokens` (примитивы) / `defineSemanticTokens` (роли) — прямое соответствие ref/sys (D3).
- Ссылки — **строковые** `"{colors.x.y}"` + условия `{ base, _dark }` в `$value`.
  ThemeOn сознательно сильнее: typed-ссылки вместо строк (D2); строковый синтаксис
  оставить только в `fromDTCG`.
- Условная карта `{base, _dark}` — анти-паттерн для ThemeOn: тема — отдельный патч-объект
  (D6), не условие внутри значения (иначе N тем взрывают каждое значение).

### Terrazzo JS (https://terrazzo.app/docs/cli/integrations/vanilla-extract/)

- Генерит vanilla-extract контракты из DTCG + режимы как отдельные value-sets поверх
  единого shape-контракта — подтверждает модель «один контракт, N тем-патчей».

### TypeScript 6.0 — приёмы для типов P1

- **`const` type parameters**: `defineTokens<const T>(tokens: T): T` — сохраняет
  литеральные ключи без `as const` у потребителя (основной механизм typed-ссылок).
- **`satisfies`** — валидация схемы well-known групп без потери литеральности.
- Branded types (`string & { __brand }`) — живой канон для `CssVarRef<Name>`; TS 6.0
  ничего не ломает.
- **Recursion depth**: глубокие mapped/conditional types по всему дереву токенов упираются
  в instantiation-depth лимиты → трансформации типов держать мелкими (ThemeOn: дерево
  фиксированной глубины — группа→токен(→сабтокен), рекурсивные mapped types не нужны;
  well-known группы описывать явными интерфейсами, generic — только на расширении).
- `AutoComplete<T> = T | (string & {})` — паттерн жив, изменений нет.

Источники доп.: https://github.com/astahmer/atomic-css-devtools/blob/main/panda.preset.ts

---

## 7. Сводка импликаций для ТЗ фазы P1

| # | Находка | Куда в P1 |
|:--|:--|:--|
| 1 | DTCG color = `{colorSpace, components, alpha, hex}`; строки legacy-валидны | `toDTCG`/`fromDTCG`: принимать обе формы, эмитить структурную + hex |
| 2 | dimension = `{value, unit}`; 13 типов; `$type`-наследование; `$extensions` passthrough | схема конвертера + round-trip тесты |
| 3 | Resolver Module — отдельная спека; тема = modifier-контекст | `toDTCG` эмитит base+патчи+опц. `.resolver.json`; свой Resolver-движок НЕ строить |
| 4 | Tailwind `--text-N--line-height` double-dash companion; tracking отдельно | naming engine: пара имён из composite text-токена |
| 5 | Tailwind `--spacing` — динамический скаляр; финитная шкала = `initial`+явные | ядро эмитит `--spacing-N`; гашение динамики — забота моста (P4), задокументировать |
| 6 | `@custom-media` НЕ шипнут (не Baseline, 2026) | сериализатор: опция `emitCustomMedia` + JS-экспорт breakpoints; в доке — требование postcss/lightningcss |
| 7 | JS-регистрация `@property` бьёт CSS; невалидное значение → тихий откат к initialValue; имена case-sensitive | applier: dev-валидация значений, `clearTheme` через `removeProperty`, static-schema/dynamic-values |
| 8 | vanilla-extract: контракт ≠ реализация, полнота типами | `defineTheme`: sys-контракт + `Partial`-патчи тем с типовой проверкой ключей |
| 9 | TS 6.0: `const` type params + `satisfies`; беречь recursion depth | сигнатуры `defineTokens<const T>`, явные интерфейсы well-known групп |

## Провенанс и оговорки

- Метод: 4 × perplexity-web `search_advanced` (web), 2026-07-08. Ответы — синтез
  Perplexity; ключевые URL перечислены по секциям. Первичные: designtokens.org (спека),
  MDN (@custom-media, @property), tailwindcss.com/docs/theme, terrazzo.app,
  vanilla-extract.style, panda-css.com.
- `[VERIFY-ON-IMPL]`-метки (3 шт.): `$ref`/`$root`/`$extends` в финальном тексте DTCG
  2025.10; именование дробных spacing-шагов в default theme.css Tailwind; custom-media
  транспиляция Lightning CSS в Vite 8 дефолтах. Проверяются исполнителем при написании
  соответствующего кода по первоисточникам (спека/theme.css в node_modules/док Vite).
- TS-версия «6.0.3» — из R-10 (registry ground truth), здесь не перепроверялась.
