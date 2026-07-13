# THEMEON — 00_MASTER_PLAN: дизайн универсального пакета дизайн-системы

| Поле | Значение |
|:--|:--|
| Дата дизайна | 2026-07-07 |
| Authoring Model | fable (task:design) |
| Статус | Draft — ждёт утверждения пользователем |
| Research-база | `20_research/R-01..R-07` (RAG-проверено 2026-07-07) |
| Executable-план | `plan.md` (эта папка) |
| Vault-канон | `05-Projects/03-Packages/ThemeOn/ThemeOn.md` |

---

## 1. Суть

**ThemeOn** — персональная универсальная дизайн-система как **инструмент, а не UI-kit**:
типизированное TS-описание токенов → CSS-переменные (build-time + runtime) → адаптеры к
UI-библиотекам (Naive UI первым) + структурный CSS-каркас (reset, layout-примитивы,
utilities) — портируемо на Vue/Nuxt, Laravel+Vite и plain HTML/CSS.

Один пакет темизирует: лендинги, dterema/vintera-класс сайты, FlexCRM/FlexCMS/FlexStore
(включая multi-tenant white-label), любые будущие проекты.

## 2. Проблема (доказана код-аудитом, R-01/R-02)

Минимум **3 проекта** (dterema, vintera, octoclick) разделяют один и тот же самодельный
паттерн темизации **ручным copy-paste** — файл-в-файл идентичные `config/theme/*.ts`,
`theme-css-vars.ts`, codegen-скрипты, Nuxt-модуль-watcher, Naive-адаптер. Следствия:

- **Дрейф копий:** vintera регрессировал в хардкод (10 файлов hex вопреки собственному skill-запрету); dterema дисциплинирован — копии расходятся по качеству.
- **Унаследованные баги:** `kebab()` не обрабатывает цифры → `--size2xl` генерится, а стили ссылаются на `--size-2-xl` → заголовки h1–h4 в обоих проектах живут на fallback-значениях, токены отключены и никто не заметил.
- **Мутация багов:** watcher-список `SOURCE_REL` в vintera указывает на несуществующий файл (HMR мёртв), в dterema покрывает 2 файла из 11.
- **Дубли внутри проекта:** генератор CSS-vars скопирован в runtime- и codegen-модуль; breakpoints существуют в 3 несвязанных копиях (в vintera — с **разными шкалами**); две параллельные color-mode системы (своя + @bg-dev/nuxt-naiveui).
- **Нет контроля:** неиспользуемые токены, непокрытые утилиты, нет линтера соответствия `var(--x)` ↔ сгенерированные переменные.

Rule of Three выполнен. Экстракция в пакет обоснована.

## 3. Ниша (валидирована RAG, R-07)

Прямого конкурента **нет**. Решённые чужими слои — берём готовое: формат DTCG 2025.10
(стабилен), пайплайны (Style Dictionary v5 / Terrazzo 2.x — совместимость, не встраивание),
multi-tenant паттерн (индустриальный консенсус). Ближайший prior art — TokiForge
(framework-agnostic токен-рантайм), но он **останавливается на фреймворк-биндингах**.

**Открытая ниша ThemeOn** = адаптерный слой «один семантический источник → нативные
theme-API нескольких UI-библиотек одновременно» + layout-примитивы, портируемые
Vue/Nuxt/Blade. Это ровно та связка, которую проекты пользователя уже копипастят.

## 4. Архитектура

### 4.1 Слои (концентрические, зависимость только внутрь)

```
L0  @themeon/core     токен-движок: модель, резолвер, naming, сериализаторы. Zero deps.
L1  @themeon/css      CSS-фундамент: @layer каркас, reset, composition-примитивы, utilities
    @themeon/colors   палитра-генератор: seed → 12-step OKLCH шкала (culori) + APCA-чек
L2  @themeon/vue      useTheme/плагин/runtime-applier;  @themeon/nuxt  модуль;  @themeon/vite  плагин+codegen
L3  @themeon/naive    адаптер Naive UI;   @themeon/tailwind  мост @theme inline;
    (later: @themeon/bootstrap, @themeon/vuetify)
L4  themeon (CLI)     init / build / check (линтеры);  registry пресетов;  Laravel-канал
```

Правило: ядро никогда не знает об адаптерах и фреймворках. UI-библиотека — всегда
**потребитель** токенов, никогда не источник (у Naive UI нет CSS-var входа — R-05).

### 4.2 Модель токенов (3 слоя, канон R-03)

```
ref  (primitive)   палитры-шкалы 50–900, размерные шкалы. Бренд-нейтральные имена.
                   Продуктовый код их НЕ потребляет напрямую.
sys  (semantic)    роли: color.bg.page, color.action.primary, space.*, radius.*, text.*.
                   ЕДИНСТВЕННЫЙ слой, который мутируют темы (dark) и тенанты (бренд).
comp (component)   btn.bg, badge.color... Ссылаются на sys. Живут локально в селекторе
                   компонента (--btn-bg), НЕ в :root.
```

Авторинг — **TS-first** (см. Обсуждение §6.1): `defineTheme()` с typed-ссылками
(`palette.forest[600]` — реальная TS-ссылка, ошибка на компиляции, не строковый путь).
DTCG 2025.10 — interchange: `toDTCG()` / `fromDTCG()` для совместимости с Tokens
Studio/Terrazzo/Style Dictionary. Типизация: `as const` + branded types +
`AutoComplete<T>` (расширяемость без потери подсказок) — DIY ~50 LOC, либы нет (R-07).

Расширяемость: базовая схема well-known групп (color/space/radius/typography/z/motion/
breakpoints/shadow/gradient) + типизированное расширение per-project (`defineTheme<MyExt>`).

### 4.3 Naming engine (фикс класса багов R-01 §2-3)

- Канонические имена CSS-переменных — **Tailwind-v4-совместимые namespaces**: `--color-*`,
  `--spacing-*`, `--radius-*`, `--text-*`, `--font-*`, `--shadow-*`, `--ease-*`,
  `--breakpoint-*` → мост в Tailwind становится тривиальным `@theme inline`.
- Детерминированный transform имени: обработка цифр специфицирована и покрыта тестами
  (`size2xl` → `--text-2xl`, никогда `--size2xl`); один транформер на build и runtime.
- Префикс пакета — опция (`prefix: ''` по умолчанию; для встраивания в чужие страницы — `to-`).
- Легаси-мост: опция `aliases` генерит старые имена dterema/vintera (`--primary`,
  `--bg-base`) как дубли на время миграции → снос после пилота.

### 4.4 Транспорт: CSS custom properties — единственный контракт

Всё, что ниже L0, общается только через CSS vars (несущая причина — runtime-природа:
смена темы/тенанта без ребилда, R-06). Два синхронных выхода из одного резолвера:

1. **Build-time:** `themeon build` / Vite-плагин → `tokens.css` (`:root {}` +
   `[data-theme="dark"] {}` + `@custom-media`) — в `<head>` до JS (анти-FOUC).
2. **Runtime:** applier `applyTheme(el, patch)` — `style.setProperty` поверх статики
   (переключение темы, tenant-патчи).

Один модуль-генератор — класс багов «две копии kebab()» устранён конструктивно.

### 4.5 Темы и dark mode (R-04)

- Поверхность состояния — атрибут **`data-theme`** на `<html>` (не class), N тем, не
  только light/dark. Тема = именованный патч sys-слоя поверх базы.
- `color-scheme` синхронизируется с активной темой; `light-dark()` — внутренняя
  оптимизация определений, не механизм состояния; `prefers-color-scheme` — дефолтный
  входной сигнал при первом визите.
- Анти-FOUC инлайн-скрипт поставляет пакет (один, генерируемый — не два рукописных дубля
  как в vintera); Nuxt-модуль вставляет его сам.
- Одна color-mode система: встроенную в @bg-dev/nuxt-naiveui — отключать/не использовать.
- Цвет авторится в **OKLCH**; `@property` для анимируемых токенов (плавная смена темы).

### 4.6 CSS-фундамент (@themeon/css)

Каркас каскада — cascade layers; потребительский CSS вне layers выигрывает всегда,
`!important` не нужен:

```css
@layer themeon.tokens, themeon.reset, themeon.base,
       themeon.composition, themeon.components, themeon.utilities;
```

- `reset` — современный минимальный reset (+ scrollbar, focus-visible из dterema core).
- `base` — типографика тегов (h1–h6, p, a) на токенах.
- `composition` — layout-примитивы (своих нет ни у кого в npm — авторим, R-06 §Every
  Layout): `container`, `stack`, `cluster`, `sidebar`, `center`, `cover`, `switcher`,
  `grid`. Классы + параметры через локальные custom properties (`--stack-gap`).
- `components` — стилевые каркасы без JS (btn, badge, card, gradient-утилиты — обобщение
  dterema `ui/*`): паттерн локальных переменных-модификаторов
  (`:where(.btn) { --btn-bg: ... }`) — уже проверен в проектах.
- `utilities` — минимальный набор (visually-hidden, text-*, гэпы).
- Дистрибуция: отдельные entry `./tokens.css`, `./reset.css`, `./composition.css`, ...,
  `sideEffects: ["**/*.css"]` — обязательно (класс багов tree-shake, R-06).
- Native CSS (nesting + vars), **без Sass** в пакете.

### 4.7 Контракт адаптера UI-библиотеки (R-05)

```ts
interface ThemeAdapter<TNative> {
  toNative(theme: ResolvedTheme): TNative        // JS-объект в формате библиотеки
  cssBridge?(theme: ResolvedTheme): string       // CSS vars для зон вне библиотеки
}
```

- **@themeon/naive** (первый): реактивный мост `ResolvedTheme → GlobalThemeOverrides`
  (common + per-component карта, обобщение `naiveCommonFromThemeTokens` + «тёмный хром»
  vintera/octoclick), breakpoint-aware мёрж (обобщение `mergeNaiveDesktopOverride`).
  Отдаётся напрямую в `NConfigProvider` — без хрупкого fallthrough-хака через
  `<NaiveConfig>` @bg-dev (R-01 §6).
- **@themeon/tailwind**: генерация `@theme inline`-файла из sys-слоя (паттерн уже
  опробован вручную в vintera).
- AntDV-урок (на будущее): токены резолвить в hex ДО подачи в seed-algorithm.
- Bootstrap/Element Plus — статические маппинг-таблицы, могут быть build-time-only.
- Референс глубины токенной архитектуры — PrimeVue v4 `@primeuix/themes`.

### 4.8 Фреймворк-слой

- **@themeon/vue**: `useTheme()` (mode/isDark/set/toggle, persist localStorage +
  prefers-color-scheme), runtime-applier, Vue-плагин.
- **@themeon/nuxt**: `defineNuxtModule().with()` (Nuxt ≥ 4): `nuxt.options.css.push`
  токенов, анти-FOUC в head, auto-imports composables, dev-watcher **на всю директорию
  токенов** (хэш конфига, не ручной список файлов — фикс класса `SOURCE_REL`-бага).
- **@themeon/vite**: плагин для не-Nuxt (Laravel Vite, plain Vue): virtual module
  `virtual:themeon.css` + HMR (паттерн UnoCSS, R-06 §4).
- **Laravel v1 — npm-канал**: `@import "@themeon/css/tokens.css"` в `resources/css/app.css`
  через laravel-vite-plugin (документированный рецепт, прецедент BlatUI). Composer-пакет
  Blade-компонентов — отложен до реального консьюмера (FlexCMS); Blade-сторона ссылается
  только на имена CSS-var контрактов.

### 4.9 Multi-tenant / white-label (для Flex*, R-07 §5)

- Тема тенанта = schema-валидируемый JSON-патч **только sys-слоя** (диапазоны значений,
  никакого произвольного CSS) — хранится в JSONB.
- `@themeon/core` даёт `serializeThemePatch(patch) → css` — сервер инжектит в `<head>`
  до paint (subdomain → тема); при сотнях тенантов — прекомпилированные hashed CSS.
- Guardrail: APCA/WCAG контраст-чек при публикации темы (из @themeon/colors).
- Registry пресетов (идея shadcn `registry-item.json`): тема × набор адаптеров =
  версионируемый устанавливаемый юнит — стадия 2.

### 4.10 Качество как фича (CLI `themeon check`)

Линтеры, выведенные напрямую из найденных багов:
1. **token-coverage**: скан CSS/Vue на `var(--*)` ↔ множество генерируемых переменных →
   ловит класс `--size-2-xl` (мёртвые ссылки) и неиспользуемые токены.
2. **contrast**: APCA-проверка семантических пар (text-on-bg) для каждой темы.
3. **hardcode**: детект сырых hex/px в стилях потребителя (замена skill-запрету, который
   vintera нарушал молча) — как stylelint-совместимое правило.

## 5. Решения (D1–D17)

| D# | Решение | Почему |
|:--|:--|:--|
| D1 | Имя npm-скоуп `@themeon/*`, CLI `themeon`; репо `~/projects/packages/themeon`; MIT | канон vault (OSS); воронка экосистемы как FlexCMS. [UNVERIFIED: доступность имени на npm — проверить в P0] |
| D2 | Авторинг TS-first (`defineTheme`, typed refs); DTCG 2025.10 — interchange (`to/fromDTCG`); собственный микро-резолвер в ядре | §6.1; SD/Terrazzo не умеют TS-source с typed-ссылками; адаптерам нужны JS-объекты; DTCG-мост сохраняет совместимость с чужими пайплайнами |
| D3 | 3 слоя токенов: ref → sys → comp; темы/тенанты мутируют только sys | канон Spectrum/Polaris/PrimeVue (R-03, R-05); comp-слой локален в селекторах |
| D4 | CSS custom properties — единственный транспорт-контракт; один naming-движок на build и runtime | runtime-смена темы без ребилда (R-06); конструктивное устранение дублей kebab() |
| D5 | Canonical naming — Tailwind-v4 namespaces (`--color-*`, `--spacing-*`); префикс — опция (деф. пусто); легаси-алиасы для миграции dterema/vintera | §6.3; мост в Tailwind = тривиальный `@theme inline`; безболезненный пилот |
| D6 | Темы: атрибут `data-theme`, N тем, тема = патч sys-слоя; `color-scheme` sync; `light-dark()` — только внутренняя оптимизация; анти-FOUC скрипт генерирует пакет | best practice 2026 (R-04 §5); одна color-mode система вместо двух |
| D7 | Цвет: OKLCH-авторинг; `@themeon/colors`: seed → 12-step шкала (форма Radix) на culori + APCA-валидация | R-04 §6; перцептивная равномерность; контраст-guardrail для тенантов |
| D8 | Каскад: `@layer themeon.*` (tokens/reset/base/composition/components/utilities); CSS потребителя вне layers всегда сильнее | R-04 §вердикт-5; ноль `!important` |
| D9 | Layout-примитивы авторим сами (container/stack/cluster/sidebar/center/cover/switcher/grid) в `@layer composition`; параметры через локальные custom properties | официального npm-пакета Every Layout/CUBE не существует (R-06 §5) |
| D10 | Контракт адаптера: `toNative()` + `cssBridge()`; ядро не зависит от адаптеров; Naive UI — первый адаптер, отдаётся в `NConfigProvider` напрямую | R-05 §вердикт; Naive без CSS-var входа — нужен JS-мост; отказ от fallthrough-хака |
| D11 | Orphan-риск Naive UI (автор ушёл, host не заинтересован, релизы поквартально) — принят и изолирован в отдельный пакет | R-05 §1; при смерти Naive меняется один адаптер, не система |
| D12 | Монорепо pnpm + tsdown, ESM-only, exports-maps per entry, `sideEffects: ["**/*.css"]`; pure-CSS пакет без бандлера | консенсус 2026 (R-06); Rolldown/Vite 8 стек |
| D13 | Nuxt-модуль: object-syntax `defineNuxtModule`, `compatibility.nuxt >= 4`, dev-watcher по хэшу директории токенов (не ручной список) | R-06 §2; конструктивный фикс `SOURCE_REL`-бага |
| D14 | Breakpoints: один источник в токенах → CSS vars + `@custom-media` + JS-экспорт (для vueuse) + значения адаптерам | три несвязанных копии с разными шкалами в vintera (R-02 §3) |
| D15 | Multi-tenant: тема-патч sys-слоя как JSONB-schema; `serializeThemePatch()` в ядре; инжект до paint; APCA-чек при публикации | индустриальный консенсус (R-07 §5); прямая потребность FlexCRM/CMS/Store |
| D16 | Без Sass в пакете — native CSS (nesting+vars+@layer); потребители вольны оставить Sass у себя | «браузер — теперь препроцессор» (R-06 §6); vintera/dterema Sass уже используют только как синтаксис |
| D17 | Пилот-порядок: dterema (дисциплинированный, эталон) → vintera (ловим регрессии) → octoclick опц.; Flex* — после стабилизации API | валидация экстракции на родных носителях паттерна до интеграции в CoreX |

## 6. Обсуждение (спорное — с рецензией и рекомендацией)

### 6.1 TS-first vs DTCG-JSON-first авторинг — **рекомендовано TS-first (принято в D2)**
- **TS-first (+)**: typed-ссылки между слоями (ошибка на компиляции), функции при
  авторинге (генерация шкал), нулевой разрыв с текущими проектами (уже TS), автокомплит.
  **(–)**: не «чистый стандарт» на входе; дизайнерский пайплайн (Figma) требует импорта.
- **DTCG-JSON-first (+)**: стандарт, Tokens Studio напрямую. **(–)**: строковые пути
  вместо ссылок, нет функций, чужой DX для соло-разработчика без дизайнера в Figma.
- Решение: TS-first, DTCG — двусторонний мост. Если появится дизайнер с Figma —
  `fromDTCG()` уже есть.

### 6.2 Свой резолвер vs Style Dictionary/Terrazzo в ядре — **рекомендовано свой (принято в D2)**
- SD/Terrazzo сильны для multi-platform (iOS/Android) JSON-пайплайнов; ThemeOn — web-only,
  TS-source, и главная ценность в адаптерах, которым нужен резолвнутый JS-объект.
  Резолвер здесь — ~200 LOC. Тянуть SD ради этого — чужая архитектура в ядре.
- Компенсация: DTCG-экспорт позволяет в любой момент включить SD/Terrazzo рядом
  (например, когда AiFina/AiResto захотят Dart/Flutter-темы — SD-платформа, не наша).

### 6.3 Naming: Tailwind-namespaces vs легаси-имена проектов — **рекомендовано namespaces + алиасы (принято в D5)**
- Ломать `--primary`/`--bg-base` на `--color-primary`/`--color-bg-base` — миграционная
  боль в 2 проектах; НО canonical namespaces дают бесплатный Tailwind-мост и
  однозначность категорий. Опция `aliases: 'legacy-v0'` генерит старые имена дублями —
  миграция становится механической (sed + снос опции).

### 6.4 Naive UI: держать или мигрировать на PrimeVue — **рекомендовано держать Naive**
- Оба живых проекта на Naive; PrimeVue-миграция — отдельный дорогой проект вне scope.
  Orphan-риск закрыт архитектурно (D11): адаптер — сменная деталь. PrimeVue-адаптер —
  кандидат №2 после Vuetify/Bootstrap, его токен-архитектура уже референс для нашей.

### 6.5 Даёт ли пакет Vue-компоненты — **рекомендовано: нет (v1)**
- Канон vault: «утилиты, не UI-kit». Layout-примитивы — CSS-классы (работают в Blade и
  plain HTML); компонентные каркасы — CSS. Vue-обёртки (`<ToStack>`) — сахар, отложить;
  иначе пакет становится компонентной библиотекой и конкурирует с Naive вместо
  темизации её.

### 6.6 Открытый вопрос пользователю (не блокирует P0–P1)
- **Bootstrap-интеграция из канона** (`ThemeOn.md` упоминает Bootstrap): в проектах-донорах
  Bootstrap не найден. Оставлен как адаптер стадии 2 (после Tailwind-моста). Если есть
  живой Bootstrap-проект-потребитель — поднять приоритет.

## 7. Риски

| Риск | Вероятность | Митигция |
|:--|:--|:--|
| Naive UI умирает | средняя | D11: адаптер изолирован; PrimeVue/Vuetify адаптеры — та же архитектура |
| Overengineering соло-пакета (слоёв больше, чем потребителей) | средняя | MVP = core+css+nuxt+naive (ровно то, что уже копипастится); registry/composer — только под реального консьюмера |
| Имя `themeon` занято на npm | низкая | проверка в P0; fallback-скоуп `@theme-on/*` или vendor-скоуп |
| Расхождение с Tailwind-namespaces при их эволюции | низкая | naming-движок — одна таблица соответствий; alias-механизм уже есть |
| Пилот-миграция ломает прод vintera/dterema | средняя | легаси-алиасы (D5) + token-coverage-линтер до/после — diff переменных обязан быть пустым |

## 8. Стадии (детально — plan.md)

P0 скелет монорепо/пины → P1 `@themeon/core` → P2 `@themeon/css` + `colors` →
P3 `vue`/`nuxt`/`vite` → P4 `naive` + `tailwind` + CLI-линтеры → P5 пилот dterema→vintera →
P6 Laravel-канал + multi-tenant для Flex → P7 registry + адаптеры стадии 2 (backlog).

## 9. Провенанс

Внешние факты и версии — в `20_research/R-03..R-07` с URL; код-факты — `R-01/R-02`
с путями до строк. Всё проверено RAG 2026-07-07. Непроверенное помечено [UNVERIFIED]
(одно: доступность npm-имени).
