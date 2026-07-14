# P8 — Канон DTCG-моста `@themeon/core` (спека 2025.10)

**Статус:** design-разведка (read-only, `packages/**` не тронут).
**Дата:** 2026-07-14. **Метод:** первоисточник (спека) + эмпирический прогон текущего кода + прогон через сторонний парсер/линтер DTCG (`@terrazzo/parser@2.4.0`).
**Вход:** `plans/2026.07.12-BASE/90_audit/AUDIT_2026-07-14_research-conformance.md` §§6–11, 24, 25.

> ⚠️ `20_research/R-11` содержит устаревшие утверждения (в т.ч. «строковая форма цвета валидна»). В этом документе R-11 **не** используется как источник. Источник — только спека.

---

## 0. RAG-источники

| # | Документ | URL | Версия / дата |
|---|---|---|---|
| S1 | DTCG **Format Module** | https://www.designtokens.org/tr/2025.10/format/ | 2025.10, «28 October 2025» (шапка документа) |
| S2 | DTCG **Color Module** | https://www.designtokens.org/tr/2025.10/color/ | 2025.10 |
| S3 | DTCG **Resolver Module** | https://www.designtokens.org/tr/2025.10/resolver/ | 2025.10 |
| S4 | `@terrazzo/parser` (референс-реализация DTCG: парсер + `core/valid-*` линты + `validateResolver`) | npm `@terrazzo/parser@2.4.0` | прогнан локально 2026-07-14 |
| S5 | Tokens Studio, multi-file sync (реальные имена файлов: `global.json`, `$themes.json`, `$metadata.json`) | https://docs.tokens.studio/token-storage/remote-multi-file-sync | 2026-07-14 |

Конформанс-оговорка S1/S2/S3 §1: «all authoring guidelines, diagrams, examples, and notes … are non-normative. **Everything else in this specification is normative.**» → таблицы «Required Y/N» и текст разделов 8.x/4.x — нормативны.

---

## 1. Нормативные требования (цитаты)

### 1.1 Цвет (S2 §4.1, S1 §8.1)

- S1 §8.1: «Represents a color in the UI. For details on how to represent colors, see the **Color** module.» → форма цвета целиком делегирована S2.
- S2 §4.1: «For color tokens, the `$type` property **MUST** be set to the string `color`. The `$value` property can then be used to specify the details of the color, **The `$value` object contains the following properties**:»
  - «**colorSpace (required)**: A string that specifies the color space or color model.»
  - «**components (required)**: An array representing the color components. … Each element of the array **MUST** be either: A number [или] The `'none'` keyword.»
  - «**alpha (optional)**: … If omitted, the alpha value of the color **MUST** be assumed to be 1 (fully opaque).»
  - «**hex (optional)**: A string that represents a **fallback value** of the color. The fallback color **MUST** be formatted in **6 digit** CSS hex color notation format to avoid conflicts with the provided alpha value.»
- **Строковая форма `$value` спекой 2025.10 не предусмотрена вовсе** — `$value` описан как объект. Подтверждено прогоном S4: `{"$type":"color","$value":"hsl(210 40% 50%)"}` → `lint:core/valid-color: Migrate to the new object format`.
- Полный список `colorSpace` (S2 §4.2): `srgb`, `srgb-linear`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50` (14 шт.).
- Компоненты (S2 §4.2.1/§4.2.3/§4.2.8): `srgb` — `[R,G,B]`, каждый 0..1; `hsl` — `[Hue 0..<360, Saturation 0..100, Lightness 0..100]`; `oklch` — `[L 0..1, Chroma ≥0 (практически ≤0.5), Hue 0..<360]`.

### 1.2 Dimension (S1 §8.2, §8.2.1)

> «The `$type` property **MUST** be set to the string `dimension`. The value **MUST** be an object containing a numeric `value` (integer or floating-point) and `unit` of measurement (`"px"` or `"rem"`).»
> §8.2.1 Validation: «`$value.unit` may only be `"px"` or `"rem"`.» … «`$value.unit` is still required even if `$value.value` is `0`.»

Таблица §8.2: `value` — Required **Y**; `unit` — Required **Y**, «Supported values: `"px"`, `"rem"`».
→ `%`, `em`, `vh`, `ch`, `calc()`, `clamp()` **не представимы** типом `dimension`. Строковая форма `$value` тоже невалидна.

### 1.3 Прочие типы

| Тип | Норма (S1) |
|---|---|
| `duration` §8.5 | «object containing a numeric `value` … and a `unit` of milliseconds (`"ms"`) or seconds (`"s"`)»; §8.5.1: «`$value.unit` may only be `"ms"` or `"s"`» |
| `cubicBezier` §8.6 | «The value **MUST** be an array containing four numbers … [P1x, P1y, P2x, P2y]» → строка `ease-out` **невалидна** |
| `fontWeight` §8.4 | «a number value in the range [1, 1000] or one of the pre-defined string values» (`thin`…`black`) |
| `fontFamily` §8.3 | «a string value containing a single font name **or an array of strings**» |
| `shadow` §9.6 | «The value **MUST** be either: a single shadow object … or an array of shadow objects» → CSS-строка **невалидна** |
| `typography` §9.8 | «The value **MUST** be an object with the following properties: `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`» → **все 5 обязательны** (подтверждено S4: любой пропуск → `lint:core/valid-typography: Missing required property …`) |
| §8.8 | `$type` **MUST** быть «one of the values specified in this specification's respective type definitions» → **кастомные `$type` запрещены** |

### 1.4 Имена (S1 §5.1.1) — Character restrictions

> «token and group names **MUST NOT** begin with the `$` character.
> Furthermore, due to the syntax used for token aliases the following characters **MUST NOT** be used anywhere in a token or group name:
> `{` (left curly bracket) · `}` (right curly bracket) · **`.` (period)**»

### 1.5 Наследование `$type` (S1 §5.2.2, §6.1, §6.7.3)

> §5.2.2: «If the `$type` property is not set on a token … **if any of the token's parent groups have a `$type` property, then the token's type is inherited from the closest parent group** with a `$type` property. Otherwise … the token **MUST** be considered invalid. **Tools MUST NOT attempt to guess the type of a token by inspecting the contents of its value.**»
> §6.1: «A group is identified as a **JSON object that does NOT contain a `$value` property**. Groups MAY contain: Child tokens · Nested groups · **Group properties — properties prefixed with `$` (e.g. `$description`, `$type`)**.»
> §6.7.3: precedence — token `$type` → resolved group `$type` → parent group `$type` (walking up) → invalid.

→ **Корень документа — это группа** (объект без `$value`), значит `$type` на корне нормативно наследуется вниз. Подтверждено S4: `{"$type":"color","brand":{"primary":{"$value":{…}}}}` → VALID, токен `brand.primary` распознан.

### 1.6 Алиасы (S1 §7.1.1, §7.1.2, §6.7.2)

- Curly-brace `{group.token}` — «resolves to the `$value` property of the target token»; §6.7.2: «Token paths are constructed by concatenating group names and token names with **periods (`.`)**» → отсюда и запрет `.` в именах (§5.1.1).
- JSON Pointer `{"$ref": "#/…/$value"}` — §7.1.2 «Required Support».

### 1.7 Multi-file / бандлы (S1 §4.2)

> §4.2: «The following file extensions are **recommended** by this spec: `.tokens` · `.tokens.json` … Tools that can save design token files **SHOULD** append one of the recommended file extensions.»

**Больше в Format Module про файлы нет ничего.** Понятий «база / тема / бандл / имя файла» спека **не вводит**. Композиция нескольких документов — предмет Resolver Module (S3), а не Format Module.
→ Любая семантика, привязанная к именам `base.tokens.json` / `<theme>.tokens.json`, — **приватная конвенция ThemeOn, не норма**. Реальные экспортёры используют другие имена (S5: `global.json`, `$themes.json`, `$metadata.json`).

### 1.8 Resolver Module (S3 §4.1.5.1) — правило «≥ 2 контекстов»

Дословно:

> «A modifier **MUST** declare a `contexts` map of a string value to an array of token sources. …
> A modifier **SHOULD** have **two or more `contexts`**, since one is the equivalent of a **set**. A modifier **MUST NOT** have an empty `contexts` map. **Tools SHOULD throw an error for modifiers with only 1 context.** Tools **MUST** throw an error for modifiers with 0 contexts.»

**Вердикт по #25 (уточнение аудита):** правило ≥2 — **SHOULD, не MUST**. Нормативно оно есть, но нарушение делает документ не невалидным, а «tool-dependent»: конформное средство *SHOULD* упасть. Эмпирика S4: `@terrazzo/parser` проверяет только `contexts.length === 0` (`"contexts" can’t be empty object.`) и **пропускает** 1 контекст. Т.е. это **риск интероперабельности**, а не хард-фейл — но чинить надо, т.к. любой конформный тул вправе бросить ошибку.

Прочее нормативное по S3 (актуально для нашего эмита): §4.1.2 «The document **MUST** provide a `version` at the root level, and it **MUST** be `2025.10`» — соблюдено; §4.1.5.1 «A modifier **MAY** declare a `default` value that **MUST** match one of the keys in `contexts`» — соблюдено.

---

## 2. Эмпирика: что код делает СЕЙЧАС

Прогон бандла `packages/core/src/index.ts` (esbuild → ESM, скретчпад) + валидация каждого эмита через `@terrazzo/parser@2.4.0`.

| Вход (`defineTheme`) | Фактический эмит `toDTCG` | Вердикт S4 (сторонний парсер) |
|---|---|---|
| `color.brand: 'oklch(0.72 0.11 221)'` | `{colorSpace:'oklch',components:[0.72,0.11,221]}` — **без `hex`** | VALID (но fallback потерян → #10) |
| `color.legacy: 'hsl(210 40% 50%)'` | `$value: "hsl(210 40% 50%)"` (строка) | **INVALID** `core/valid-color: Migrate to the new object format` |
| `color.named: 'rebeccapurple'` | `$value: "rebeccapurple"` | **INVALID** (то же) |
| `space.md: '16px'` | `{value:16,unit:'px'}` | VALID |
| `space.full: '100%'` | `{value:100,unit:'%'}` | **INVALID** `core/valid-dimension: Unit % not allowed` |
| `space.lead: '1.2em'` | `{value:1.2,unit:'em'}` | S4 пропускает (его линт допускает `em`), но **спека §8.2.1 — только `px`/`rem`** → **INVALID по спеке** |
| `space.gutter: 'calc(100% - 2rem)'` | `$value: "calc(100% - 2rem)"` | **INVALID** `core/valid-dimension: Migrate to the new object format` |
| `space['1.5']: '0.375rem'` | ключ группы `"1.5"` | Парсится, но **§5.1.1 MUST NOT**; алиас `{space.1.5}` → S4: **`Could not resolve alias {space.1.5}`** |
| `ease.out: 'ease-out'` | `$value: "ease-out"` | **INVALID** `core/valid-cubic-bezier: Expected [number, number, number, number]` |
| `shadow.sm: '0 1px 2px …'` | CSS-строка | **INVALID** `core/valid-shadow: Missing required properties: color, offsetX, offsetY, blur, spread` |
| `text.body: {size:'1rem',lineHeight:1.5}` → `typography` | `{fontSize:{…},lineHeight:1.5}` | **INVALID** `core/valid-typography: Missing required "fontFamily" / "fontWeight" / "letterSpacing"` |
| `themes: {light}` (одна тема) | modifier `theme` c **1 контекстом** | S4 пропускает; спека — SHOULD-нарушение (#25) |
| `themes: {dark}` | contexts `{light:[], dark:[…]}` — 2 шт. | ок (коллизия имени только при теме `light`) |

**Импорт:**

| Вход `fromDTCG` | Факт |
|---|---|
| `{$type:'color', brand:{primary:{$value:{…}}}}` (корневой `$type`) | `sys = {}`, 1 warning `unsupported $type "(none)"` → **#8 подтверждён** |
| `{'global.json':{…}, 'dark.json':{…}}` (бандл Tokens Studio) | `sys = {}`, `themes = []`, **`warnings = []`** → **#9 подтверждён; худший исход: тихая пустая тема** |
| `{brand:{$type:'color', primary:{…}}}` (вложенный `$type`) | работает |

---

## 3. Канон + что менять в коде

Все канонические формы ниже **прогнаны через `@terrazzo/parser` и приняты как VALID** (см. §5).

| # | Находка | Канон (норма) | Что менять (файл / функция) |
|---|---|---|---|
| **#6** | `dimension` с `%`/`em`/`vh`, legacy-строки `calc()`/`clamp()` | `dimension` представим **только** для `px`/`rem`. Всё прочее **не эмитить как токен** (кастомного `$type` спека не даёт, §8.8) → **пропуск + warning + мост `$extensions` на корне документа** (см. §3.2) | `to-dtcg.ts`: `splitDimension` → `toDimension(): {value,unit:'px'\|'rem'} \| null`; `toDTCGValue`/`placeToken` — при `null` не класть узел, а вернуть «непредставимо» |
| **#7** | невалидный `color` (строки; `hsl()` не парсится) | `$value` цвета — **всегда объект** `{colorSpace, components[, alpha][, hex]}`. Парсер обязан покрывать `hsl()`/`hwb()`/`lab()`/`lch()`/`oklab()`/`color(<space> …)` — все 14 colorSpace спеки, каждый **без конверсии** (нотация ↔ colorSpace 1:1). Непарсибельное (`rebeccapurple`, `var()`, `color-mix()`) → **пропуск + warning + `$extensions`-мост** | `color.ts`: `parseColor` — добавить `hsl/hwb/lab/lch/oklab/color()`; `to-dtcg.ts`: `toDTCGValue` case `color` — убрать fallback `?? value` |
| **#10** | нет `hex`-fallback для OKLCH | Для **любого** цвета вне `srgb` считать `hex` (6-значный, §4.1) → zero-dep конвертер (см. §4) | `color.ts`: новый `oklchToHex`/`toSrgbHex`; `parseOklch` → добавляет `hex` |
| **#11** | сегменты пути с `.` (`space['1.5']`) | В DTCG-имени `.` запрещён (§5.1.1). **Экранировать только «грязные» сегменты** тем же правилом, что уже в naming-движке (`[._\s]+ → '-'`): `1.5` → `1-5`. Тогда DTCG-имя совпадает с CSS-сегментом (`--spacing-1-5`) — инвариант «одно имя». Оригинальный путь класть в `$extensions["com.themeon"].path` → импорт восстанавливает `1.5` без потерь. **Коллизия** (`space['1.5']` и `space['1-5']` вместе) → **ошибка** `ThemeonError('DTCG_NAME_COLLISION')`, не тихая перезапись | `to-dtcg.ts`: новый `escapeDTCGSegment(seg)` (только если сегмент содержит `.`/`{`/`}` или начинается с `$`); `placeToken` + генерация curly-алиасов — через него; `from-dtcg.ts`: `handleToken` читает `$extensions["com.themeon"].path`. **`naming.ts` не трогать** (канон `space['1.5']` → `--spacing-1-5` сохраняется) |
| **#24** | у `toDTCG` нет канала warnings | `toDTCG(def, opts) → { files, warnings }` (см. §6) | `to-dtcg.ts`: `DTCGExport` + `warnings: string[]`; проброс аккумулятора в `toDTCGValue`/`placeToken` |
| **#25** | resolver-modifier с 1 контекстом | «modifier SHOULD have two or more contexts» (S3 §4.1.5.1). Правило: если тем < 2 — добавить **синтетический base-only контекст** с **гарантированно неконфликтным ключом** (`default`, при занятости — `base`, далее суффикс) и сделать его `default`. Текущий баг: ключ жёстко `light` → при теме с именем `light` перезаписывается и остаётся 1 контекст | `to-dtcg.ts`, блок `themeon.resolver.json`: заменить `if (!Object.hasOwn(def.themes,'light')) contexts.light = []` на выбор уникального ключа **после** заполнения тем |
| **#8** | `fromDTCG` не читает `$type` корневой группы | Корень документа — группа (§6.1); `$type` на нём наследуется (§5.2.2/§6.7.3) | `from-dtcg.ts`: вызов `walkDTCG(doc, doc, [], **typeof doc.$type === 'string' ? doc.$type : undefined**, …)` — одна строка. **Плюс** (§5.2.2 «Tools MUST NOT guess the type … by inspecting the contents of its value»): `default`-ветка `dtcgValueToRaw`, которая молча пропускает примитивы без `$type`, должна давать warning `token has no resolvable $type` (сейчас тип угадывает `defineTheme`) |
| **#9** | multi-file только под собственными именами | Имена файлов **не нормативны** (§4.2). Контракт импорта — см. §7 | `from-dtcg.ts`: `isFileMap`, разбор `base.tokens.json`/`*.tokens.json` → новый контракт `fromDTCG(files, opts?)` |
| **#26 (НОВОЕ, Major)** | `text` → `typography` эмитит невалидный композит | §9.8: обязательны **все 5** полей (`fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`). ThemeOn-`TextStyleValue = {size, lineHeight?}` **принципиально непредставим** как `typography` | Развилка владельца (§8, Q3) |
| **#27 (НОВОЕ, Major)** | `shadow`/`gradient` CSS-строкой | §9.6/§9.7: строковой формы нет; `shadow` MUST быть объектом/массивом объектов | Либо структурный эмит, либо **не эмитить + `$extensions`-мост** (согласованно с #6/#7). Развилка (§8, Q3) |
| **#28 (НОВОЕ, Minor)** | `cubicBezier: 'ease-out'` строкой | §8.6: MUST — массив 4 чисел. Именованные CSS-кривые имеют **точные** bezier-эквиваленты → таблица-данные: `linear [0,0,1,1]`, `ease [0.25,0.1,0.25,1]`, `ease-in [0.42,0,1,1]`, `ease-out [0,0,0.58,1]`, `ease-in-out [0.42,0,0.58,1]` | `to-dtcg.ts`: `splitCubicBezier` + `NAMED_EASINGS`; `step-*`/прочее → пропуск + warning |

### 3.2 Мост `$extensions` для непредставимого (общий механизм для #6/#7/#27)

Спека (§6.3.2) разрешает `$extensions` на группе; корень документа — группа. Форма:

```jsonc
{
  "$extensions": {
    "com.themeon": {
      "unrepresentable": {
        "space.full":   { "type": "dimension", "value": "100%" },
        "space.gutter": { "type": "dimension", "value": "calc(100% - 2rem)" },
        "color.named":  { "type": "color",     "value": "rebeccapurple" }
      }
    }
  },
  "space": { "md": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } } }
}
```

Даёт три свойства сразу:
1. документ **валиден** (сторонние тулы `$extensions` игнорируют) — прогнано через S4: **VALID**;
2. round-trip **ThemeOn → DTCG → ThemeOn** остаётся **без потерь** (импорт вычитывает мост);
3. потеря видима в `warnings`, а не молча.

---

## 4. Развилка «zero-dep vs hex» (D2/D12) — **решение: zero-dep конвертер в `core`**

Требование: `hex` — 6-значный sRGB-fallback (S2 §4.1) для OKLCH (канонический авторинг ThemeOn). `@themeon/core` — zero-dep по D2/D12; `colorjs.io` живёт в `@themeon/colors`.

**Эмпирическая проверка (скретчпад, 2026-07-14).** Написан конвертер OKLCH→sRGB→hex (матрицы OKLab Ottosson + sRGB transfer из CSS Color 4) и сличён с `colorjs.io@0.7.0` по сетке L∈[0,1]×C∈[0,0.37]×H∈[0,360):

| Класс | n | Совпадение с colorjs.io |
|---|---|---|
| **in-gamut sRGB** (реальные токены) | **20 828** | **100.00 % байт-в-байт**, worst Δканала = **0** |
| out-of-gamut, наивный clip | 47 104 | exact 11.1 %, mean\|Δ\| = 34.8/255 |
| out-of-gamut, **+ CSS Color 4 gamut mapping** (бисекция chroma + local clip + ΔE-OK < 0.02) | 47 104 | exact 17.3 %, **mean\|Δ\| = 4.4/255**, worst 167 |

**Вывод.** Для нормального (in-gamut) авторинга zero-dep конвертер **точен идеально**. Расхождение возникает только для заведомо out-of-gamut OKLCH — и это лишь *fallback*-поле, у которого структурная форма рядом и точна.

**Рекомендация:** реализовать в `packages/core/src/dtcg/color.ts` (**~55 LOC**: 25 — конверсия, ~30 — gamut mapping по CSS Color 4 §13.2). Цена: +55 LOC, 0 зависимостей, D2/D12 сохранены.

Отвергнутые ветки:
- **Зависимость `colorjs.io` в core** — ломает D2/D12 (zero-dep — заявленное свойство пакета: `package.json.description` «Zero runtime dependencies»), +~200 KB на рантайм-пакет ради опционального fallback-поля. **Нет.**
- **Вынести DTCG-мост в отдельный `@themeon/dtcg`** — оправдано, только если мост дорастёт до полного color-инжиниринга (структурные `shadow`/`gradient`, конверсия colorSpace). Сегодня цена (новый пакет, новый экспорт, миграция `index.ts`) выше 55 LOC. **Отложить**; при принятии #26+#27 «структурно» — пересмотреть (тогда мосту понадобится реальная колор-математика и `@themeon/colors` как зависимость → отдельный пакет становится честнее).

---

## 5. Проверка канона сторонним валидатором (`@terrazzo/parser@2.4.0`)

Все целевые формы прогнаны; результат:

| Каноническая форма | Вердикт |
|---|---|
| `color`: `{colorSpace:'oklch',components:[0.72,0.11,221.19],hex:'#44b4d5'}` | **VALID** |
| `color`: `{colorSpace:'hsl',components:[210,40,50],hex:'#4d7fb3'}` | **VALID** |
| экранированное имя `space["1-5"]` + `$extensions.com.themeon.path=["space","1.5"]` + алиас `{space.1-5}` | **VALID** (алиас резолвится; для сравнения `{space.1.5}` → `Could not resolve alias`) |
| корневой `$extensions` (мост непредставимого) + валидные токены | **VALID** |
| `cubicBezier: [0, 0, 0.58, 1]` (из `ease-out`) | **VALID** |
| `typography` со всеми 5 полями | **VALID** |
| импорт: `{"$type":"color","brand":{"primary":{"$value":{…}}}}` (корневой `$type`) | **VALID**, токен `brand.primary` распознан → подтверждает #8 |

Оговорка о валидаторе: `@terrazzo/parser` — **не** эталон спеки, а её реализация. Одно расхождение зафиксировано: его `core/valid-dimension` допускает `em`, тогда как S1 §8.2.1 — только `px`/`rem`. Там, где линт мягче спеки, **вердикт даётся по спеке** (случай `1.2em` в §2).

---

## 6. Публичный контракт и цена SemVer

**Форма возврата (рекомендация):**

```ts
export interface DTCGExport {
  files: Record<string, DTCGDocument>
  /** Потери и деградации: непредставимые значения, экранированные имена, пропущенные токены. */
  warnings: string[]          // ← НОВОЕ (#24), симметрично FromDTCGResult.warnings
}
export function toDTCG(def: ThemeDefinition, opts?: ToDTCGOptions): DTCGExport

export interface FromDTCGOptions {
  /** Какие файлы — база, какие — темы. Без опции работает автодетект (§7). */
  base?: string | string[]
  themes?: Record<string, string | string[]>
  /** 'warn' (деф.) | 'error' — пустой результат/непонятый вход. */
  onEmpty?: 'warn' | 'error'
}
export function fromDTCG(
  files: DTCGDocument | Record<string, DTCGDocument>,
  opts?: FromDTCGOptions,
): FromDTCGResult
```

**Цена SemVer — НУЛЕВАЯ. Проверено:** `@themeon/core@0.0.0`, в npm-реестре **не опубликован** (`npm view @themeon/core` → E404), git-тегов релиза нет. Пакет не выпущен → публичный контракт можно менять свободно, **сейчас — единственное дешёвое окно**.
Формально даже после релиза обе правки **аддитивны** (новое поле в возвращаемом объекте, новый опциональный параметр) → **minor**, не major; ломающим было бы только изменение формы `files` или семантики существующих полей. Но откладывать не стоит: канон меняет **содержимое** эмита (структурные цвета вместо строк, экранированные имена, пропуск непредставимого) — а это ломающее изменение **данных**, и после релиза оно станет major.

---

## 7. Канон импорта (`fromDTCG`)

1. **Корневой `$type`** (#8): `walkDTCG` стартует с `inheritedType = doc.$type`. Плюс — не угадывать тип по значению (§5.2.2 MUST NOT): токен без резолвимого `$type` → warning, а не тихий проброс примитива в `defineTheme`.
2. **Произвольные имена файлов** (#9). Имена не нормативны → семантику «база/тема» брать в таком порядке:
   - **(а) resolver-документ, если он есть в бандле.** Это единственный *нормативный* способ композиции (S3): файл, у которого корневой `version === '2025.10'` и есть `sets`/`modifiers` (детект — как `isLikelyResolver` в S4, независимо от имени файла). `sets[*].sources` → база; `modifiers[*].contexts[ctx]` → тема с именем `ctx`. **Это должен быть основной путь.**
   - **(б) явные опции** `opts.base` / `opts.themes` — детерминированный ручной контракт.
   - **(в) автодетект-эвристика** (без resolver и без опций): документ, **все** пути которого — подмножество путей другого документа, и который не вводит новых путей → патч-тема (имя = basename без расширений); документ с наибольшим числом уникальных путей → база. Ровно один документ → база.
   - **(г) `$themes.json` / `$metadata.json` Tokens Studio** (S5) — не DTCG-токены; **распознавать и пропускать явно** (иначе они попадают в базу как мусорные группы).
3. **Warning vs Error.** Нынешнее «тихая пустая тема» (#9) недопустимо. Правило:
   - **ERROR** (`ThemeonError`): вход не дал **ни одного** токена (пустая `sys`) — при `onEmpty: 'error'`; по умолчанию — **громкий warning + пустая `sys`**, но с явным диагнозом («0 tokens parsed from N files: none matched base/theme detection»);
   - **ERROR**: коллизия имён при экранировании (#11); `$value` одновременно с дочерними ключами (§6.1: «Tools MUST report this as an error»); `resolutionOrder`/`$ref` на несуществующий указатель (S3 §4.1.6);
   - **WARNING**: пропущенный токен (нерезолвимый `$type`, неподдержанный композит), `$root`/`$extends` (вне скоупа v1), нерезолвнутый алиас, отброшенные поля `typography`, встреченный modifier с 1 контекстом.

---

## 8. Развилки для владельца

- **Q1 (#26, `text` → `typography`).** Спека требует все 5 полей. Варианты: **(A)** расширить `TextStyleValue` до `{size, lineHeight?, family?, weight?, tracking?}` (ссылки на `font.*`/`fontWeight.*`/`tracking.*` — S4 подтвердил: алиасы **внутри** композита валидны) и эмитить полноценный `typography`, добирая недостающее из sys-дефолтов; **(B)** не эмитить `typography` вовсе — класть `text.<name>` как `dimension` (font-size) + `$extensions`-мост для lineHeight; **(C)** группа с `$root` (§6.2) — токен-родитель `dimension` + дочерний `lineHeight: number`. **Рекомендация: (A)** — единственный вариант, дающий настоящий `typography` для Figma/Style Dictionary; цена — расширение модели `text` (аддитивно, поля опциональны).
- **Q2 (#27, `shadow`/`gradient`).** Структурный эмит (реальный парсинг CSS-строки — дорого, и это уже color/geometry-инжиниринг) **vs** пропуск + `$extensions`-мост (дёшево, честно, документ валиден). **Рекомендация: мост в P8, структурно — отдельной фазой** (тогда же пересмотреть вынос моста в `@themeon/dtcg`).
- **Q3 (объём P8).** #26/#27/#28 — сверх исходных 6 Major + 2 Minor. Без них эмит **всё равно останется невалидным** для тем, где есть `text`/`shadow`/`ease` (а они есть в дефолтном пресете). Формально — расширение скоупа; фактически — цель «валидный DTCG» без них не достигается. **Рекомендация: включить #28 (дёшево, таблица) и мост для #26/#27; полный `typography` — по решению Q1.**
- **Q4 (`em` в `dimension`).** Спека — только `px`/`rem`; Terrazzo допускает `em`. `em` в теме — не редкость. Пропускать (строго по спеке) или конвертировать `em`→`rem` (**неверно** вне корневого контекста)? **Рекомендация: пропуск + `$extensions`-мост + warning** (строго по спеке; тихая конверсия исказит значение).

---

## 9. Обязательные тесты (P8)

**`to-dtcg.test.ts`**
1. `dimension`: `16px`/`1.5rem` → `{value,unit}`; `100%`/`1.2em`/`calc(…)`/`clamp(…)` → **токен отсутствует** в документе, есть warning, есть запись в корневом `$extensions.com.themeon.unrepresentable`.
2. `color`: `oklch()` → `{colorSpace:'oklch',components,hex}` — **`hex` присутствует**; `hsl()`/`hwb()`/`lab()` → структурная форма с корректным `colorSpace`; `rebeccapurple`/`color-mix(…)` → пропуск + warning + мост.
3. `hex`-fallback: табличный тест из 8+ реперных OKLCH (in-gamut) с ожидаемыми hex, **сверенными с `colorjs.io`** (эталон зафиксирован в фикстуре; `colorjs.io` — devDependency теста, не рантайма).
4. Имена: `space['1.5']` → ключ `1-5`, `$extensions.com.themeon.path === ['space','1.5']`; алиас на него — `{space.1-5}`; **ни одного `.`** в ключах документа (свойство-тест: обход всех ключей всех файлов).
5. Коллизия `space['1.5']` + `space['1-5']` → `ThemeonError('DTCG_NAME_COLLISION')`.
6. `cubicBezier`: `ease-out` → `[0,0,0.58,1]`; `steps(4)` → пропуск + warning.
7. Resolver: `themes: {light}` → **≥2 контекстов** (синтетический `default`), ключ не конфликтует с темой `light`; `themes: {}` → resolver не эмитится.
8. `warnings` — непустой ровно там, где была деградация; пустой на «чистой» теме.

**`from-dtcg.test.ts`**
9. Корневой `$type` (`{"$type":"color","brand":{…}}`) → тема **не пустая**, тип `color`.
10. Чужой бандл `{global.json, dark.json}` → токены импортированы; **пустой результат невозможен молча** (warning/ошибка по `onEmpty`).
11. Бандл с `*.resolver.json` (произвольное имя) → база/темы разобраны по resolver'у, не по именам файлов.
12. `$themes.json`/`$metadata.json` (Tokens Studio) → распознаны и пропущены, в `sys` не попадают.
13. Токен без резолвимого `$type` → warning (тип **не** угадывается по значению — §5.2.2 MUST NOT).

**Round-trip / conformance**
14. **`toDTCG` → `@terrazzo/parser` (devDependency) → 0 ошибок** для дефолтного пресета и для пилотных тем (dterema/vintera). Это единственный тест, дающий вердикт «валидно» прогоном, а не мнением.
15. `theme → toDTCG → fromDTCG → resolveTheme` даёт **тот же набор CSS-переменных**, что `theme → resolveTheme` (лоссless-инвариант через `$extensions`-мост).
16. `fromDTCG(TokensStudioBundle) → toDTCG` → снова валидно по S4.

---

## 10. Остаточные риски

1. **`@terrazzo/parser` ≠ спека.** Его линты местами мягче (`em` в `dimension`) и он не проверяет §5.1.1 (точку в имени пропускает — ломается уже на резолве алиаса). Тест #14 фиксирует «не хуже, чем Terrazzo», а строгий конформанс держится тестами #1–#13 по цитатам спеки.
2. **`hex` для out-of-gamut OKLCH** расходится с `colorjs.io` (mean 4.4/255). Приемлемо для fallback-поля; если владелец хочет байт-в-байт — единственный путь — зависимость от `colorjs.io` (ломает D2/D12).
3. **`resolutionOrder` / inline-множества** Resolver Module разобраны нами лишь в объёме нашего эмита; импорт чужих resolver'ов со сложным `resolutionOrder` (несколько modifier'ов, orthogonal-контексты) в скоуп P8 не входит → нужен явный warning «resolver features beyond sets+1 modifier are ignored».
4. **Спека 2025.10 — Draft.** §6.4 (`$extends`), §7.3 (property-level `$ref`) помечены как активно обсуждаемые (Issue-блоки в тексте). Наш скоуп v1 их не поддерживает — это зафиксировано warning'ами и остаётся верным решением.
