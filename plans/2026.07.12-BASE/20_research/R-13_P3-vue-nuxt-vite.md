# R-13 — P3 углубление: `@themeon/vue` + `@themeon/nuxt` + `@themeon/vite` (точечные API/edge-cases)

> RAG-research для детализации фазы P3 (2026-07-12). Углубляет R-04/R-06, НЕ заменяет их.
> **Отклонение метода (как в R-12):** perplexity-web MCP в сессии не подключён (ToolSearch
> находит только `WebSearch`/`WebFetch`/Figma, не `search_advanced`/`search_deep`) —
> использованы WebSearch/WebFetch + npm registry как ground truth версий (паттерн P-D10).
> Все факты с URL.

## 0. Скоуп фазы P3 (из plan.md §4 + phases/P3.md)

- **`@themeon/vue`** — `useTheme()` (persist, prefers-color-scheme, N тем), Vue-плагин + runtime-applier поверх `@themeon/core` `applyTheme`.
- **`@themeon/nuxt`** — Nuxt-модуль: `css.push` токенов, анти-FOUC head-скрипт, auto-imports composables, dev-watcher по хэшу директории токенов (D13, Nuxt ≥4).
- **`@themeon/vite`** — плагин `virtual:themeon.css` + HMR для Laravel/plain (паттерн UnoCSS).

## 1. Пины версий (ground truth registry.npmjs.org, 2026-07-12)

| Пакет | latest | Дата релиза | Лицензия | Роль в P3 |
|:--|:--|:--|:--|:--|
| `vue` | **3.5.39** | 2026-06-25 | MIT | peer `@themeon/vue` (диапазон `^3.5`) |
| `@vueuse/core` | **14.3.0** | 2026-05-01 | MIT | референс `useColorMode` (**НЕ обязательная dep** — можно свой ~80 LOC, §2) |
| `nuxt` | **4.4.8** | 2026-06-08 | MIT | peer `@themeon/nuxt` (`compatibility.nuxt: '>=4.0.0'`, D13) |
| `@nuxt/kit` | **4.4.8** | 2026-06-08 | MIT | dependency Nuxt-модуля (§3) |
| `@nuxt/module-builder` | **1.0.2** | 2025-07-25 | MIT | build-тул Nuxt-модуля (devDep; альтернатива — общий tsdown, §3) |
| `vite` | **8.1.4** | **2026-07-09** | MIT | peer `@themeon/vite` (`^8`; hook `hotUpdate`, §4) |
| `unplugin` | 3.3.0 | 2026-06-29 | MIT | опционально: unified-плагин, если vite-плагин захотят портировать (не обязательство P3) |

Источник: registry API `https://registry.npmjs.org/<pkg>` (dist-tags + time), 2026-07-12.
**Vite 8.1.4** свежий (релиз 2 дня назад) — новый major относительно того, что мог помнить план;
hook `hotUpdate` — актуальный API (§4). Vue 3.5.x — стабилен, реактивность `ref`/`computed`
без сюрпризов.

## 2. `@themeon/vue` — `useTheme()`: VueUse `useColorMode` как референс формы, не как dep

### 2.1 Полный API `useColorMode` (VueUse 14.3.0) — https://vueuse.org/core/usecolormode/

```ts
interface UseColorModeOptions<T extends string = BasicColorMode> {
  selector?: string | MaybeElementRef   // default: 'html'
  attribute?: string                     // default: 'class' ← нам нужно 'data-theme' (D6!)
  initialValue?: MaybeRefOrGetter<T | BasicColorSchema>  // default: 'auto'
  modes?: Partial<Record<T | BasicColorSchema, string>>  // расширение сверх light/dark → N тем
  onChanged?: (mode, defaultHandler) => void  // перехват записи атрибута (кастомная логика)
  storageRef?: Ref<T | BasicColorSchema>
  storageKey?: string | null             // default: 'vueuse-color-scheme'; null = не персистить
  storage?: StorageLike                  // default: localStorage
  emitAuto?: boolean                     // default: undefined; true = 'auto' попадает в state
  disableTransition?: boolean            // default: true (глушит CSS transitions на миг смены)
}

type UseColorModeReturn<T extends string = BasicColorMode> =
  Ref<T | BasicColorSchema> & {
    store: Ref<T | BasicColorSchema>       // персистнутый выбор пользователя ('auto'|тема)
    system: ComputedRef<BasicColorMode>    // системное 'dark'|'light' (usePreferredDark)
    state: ComputedRef<T | BasicColorMode> // резолвнутая активная тема
  }
```

Ключевое для нас (D6 = `data-theme`, N тем, тема = патч sys):
- **`attribute: 'data-theme'`** — ровно наша модель (не `class`); `modes` мапит имя темы →
  значение атрибута. Реализация пишет `documentElement.setAttribute('data-theme', …)`.
- **`initialValue: 'auto'`** + `system` (через `usePreferredDark` → `matchMedia('(prefers-color-scheme: dark)')`).
- **`disableTransition: true`** — известный приём против «протекания» `transition` при смене темы
  (инжектит `* { transition: none !important }` на один кадр). Оставить дефолтом.
- **`emitAuto`** — если хотим кнопку-триптих light/dark/auto (не только бинар), `state` держит
  резолв, `store` держит 'auto'.

### 2.2 Решение для дизайна P3 (кандидат D#)

VueUse `useColorMode` **умеет ровно нашу семантику** (`attribute:'data-theme'`, `modes` для N
тем, `system`/`store`/`state`, persist). Развилка:
- **(а) свой `useTheme()` ~80 LOC** (zero-dep поверх `@themeon/core.applyTheme` +
  `matchMedia` + `localStorage`) — согласовано с духом L0 «zero deps», полный контроль над
  var-патчем через готовый `applyTheme` из ядра; VueUse форма — только референс.
- **(б) `@vueuse/core` как peer/optional dep** — меньше кода, но тянет 14.x в дерево и делает
  applier из `attribute`-строки, а НЕ через наш `applyTheme` (двойной источник записи в DOM).
- **Рекомендация research'а — (а)**: наш applier уже есть (`applyTheme`, P1.6), VueUse
  пишет только атрибут и не знает про var-патчи sys-слоя; свой composable дешевле, чем мост.
  VueUse остаётся **референсом формы return-типа** (`{ mode, system, store, toggle, set }`).

### 2.3 SSR / hydration (критично — Nuxt в §3 и plain-Vue SSR)

- **Флаг проблемы:** VueUse-доки прямо предупреждают — при `preference==='system'` использование
  цвета в шаблоне при SSR даёт flash, т.к. системное предпочтение **не известно серверу**
  (детектится только на клиенте). https://vueuse.org/core/usecolormode/
- **Правило дизайна (D6-следствие, зафиксировать в спеке):** SSR-разметка НЕ должна зависеть от
  темы (или рендерится с детерминированной базой). Тема применяется **атрибутом `data-theme` на
  `<html>` до paint** (анти-FOUC-скрипт §3.3), CSS-переменные делают остальное — DOM-структура
  идентична на сервере и клиенте → нет hydration mismatch. Это и есть контраргумент против того,
  чтобы `useTheme()` менял разметку; он меняет только атрибут + var-патч.
- `matchMedia`/`localStorage` в composable гейтить `import.meta.client` / `onMounted` (на сервере
  их нет). Референс проблемы: https://github.com/nuxt-modules/color-mode/issues/209 (SSR text mismatch).

### 2.4 Vue-плагин — стандартная форма (низкий риск, без глубокого RAG)

`app.use(ThemeonPlugin, options)` → `install(app, options)`: `app.provide(themeKey, api)` +
опц. `app.config.globalProperties.$theme`. `useTheme()` = `inject(themeKey)`. Форма плагина —
канон Vue 3.5 (https://vuejs.org/guide/reusability/plugins). Не требует RAG-углубления.

## 3. `@themeon/nuxt` — модуль на `@nuxt/kit` 4.4.8

### 3.1 Утилиты `@nuxt/kit` (Nuxt 4) — https://nuxt.com/docs/4.x/api/kit/*

- `defineNuxtModule({ meta, defaults, setup })` — мержит defaults с опциями, ставит хуки, зовёт
  `setup`. Object-syntax + `compatibility.nuxt: '>=4.0.0'` (D13).
  https://nuxt.com/docs/4.x/guide/modules/recipes-basics
- **CSS-инжект токенов** (§4.6/§4.8): `nuxt.options.css.push('@themeon/css/tokens.css')` +
  `.push('@themeon/css/index.css')` в `setup` (порядок — до потребительского). Прямой массив,
  не отдельная kit-утилита.
- `addPlugin` / `addPluginTemplate` — рантайм-плагин модуля (регистрирует `useTheme`
  bootstrap на клиенте). https://nuxt.com/docs/4.x/api/kit/plugins
- `addImports({ name, from })` / `addImportsDir(dir)` — auto-import `useTheme` (composable
  доступен без явного импорта). https://nuxt.com/docs/4.x/guide/modules/recipes-basics
- `runtimeDir` + `addPlugin(resolve(runtimeDir, 'plugin'))` — рантайм-код модуля живёт в
  `runtime/` (не в build-time setup). https://nuxt.com/docs/4.x/guide/modules/module-anatomy

### 3.2 Templates API — codegen сгенерированного `themeon.css` в virtual FS

https://nuxt.com/docs/4.x/api/kit/templates

```ts
function addTemplate(t: NuxtTemplate | string): ResolvedNuxtTemplate
// NuxtTemplate: { filename?, src?, dst?, getContents?: (data)=>string|Promise, options?, write? }
//   write:false (деф.) → только virtual FS (buildDir/.nuxt); write:true → на диск.

function addTypeTemplate(t, ctx?: { nuxt?: boolean; nitro?: boolean }): ResolvedNuxtTemplate
function addServerTemplate(t: NuxtServerTemplate)  // virtual-файл внутри Nitro-сборки
async function updateTemplates(opts?: { filter?: (t: ResolvedNuxtTemplate)=>boolean }): void
```

Паттерн генерации CSS токенов модулем: `addTemplate({ filename: 'themeon.css', getContents: () =>
serializeThemeCss(resolveTheme(userConfig)), write: true })` → путь в `nuxt.options.css`.
`write:true` нужен, чтобы `css.push` увидел файл на диске (virtual FS для CSS-массива не всегда
достаточен — CSS резолвится Vite'ом как реальный путь; проверить при исполнении).

### 3.3 Анти-FOUC head-скрипт — ДВА рабочих маршрута (выбрать в дизайне)

Задача: до paint выставить `data-theme` из `localStorage`||`prefers-color-scheme`, без flash и
без hydration-mismatch. Скрипт у нас **статический** (не зависит от per-request данных) — это
упрощает выбор относительно color-mode (тот динамичен ради forced-режимов).

**Маршрут A (рекомендуемый для статического скрипта): `app.head.script` в setup.**
`nuxt.options.app.head.script.push({ innerHTML: <IIFE>, tagPosition: 'head', tagPriority: 'critical' })`.
- `tagPosition`: `'head' | 'bodyOpen' | 'bodyClose'`; `tagPriority`: `number | 'critical' |
  'high' | 'low' | before:/after:key` (меньше = раньше; спец-теги: charset −2, title −1,
  прочие 10). Нам нужен `'critical'`/низкое число, чтобы скрипт шёл ДО стилей/контента.
  https://unhead.unjs.io/docs/head/api/composables/use-head
- Плюс: чистый build-time, один statement, SSR рендерит инлайн в `<head>`, клиент его же
  парсит → без mismatch (скрипт мутирует `documentElement` до Vue-гидрации).

**Маршрут B (как делает @nuxtjs/color-mode — для динамики/forced-режимов): Nitro `render:html`.**
Из источника `src/module.ts` (https://raw.githubusercontent.com/nuxt-modules/color-mode/main/src/module.ts):
```ts
nuxt.hook('nitro:config', (config) => {
  config.virtual['#color-mode-options'] = `export const script = ${JSON.stringify(options.script)}`
  config.plugins.push(resolve(runtimeDir, 'nitro-plugin'))  // nitro-plugin слушает 'render:html'
})
```
nitro-plugin через хук `render:html` вставляет скрипт в `head`/`bodyPrepend` на каждый ответ
(нужно только когда скрипт зависит от запроса — cookie/subdomain-тема; для P3 v1 избыточно,
но ЭТО ровно точка стыковки с P6 multi-tenant `serializeThemePatch` инжектом до paint).
Референсы: https://nuxt.com/docs/4.x/api/kit/head · discussion nuxt#32458 (render:html для SSR-скрипта).

**Вывод для P3:** Маршрут A (статический `app.head.script`, `tagPriority:'critical'`).
Маршрут B — задокументировать как расширение под P6 (per-tenant инжект), не строить в P3.
Скрипт: минифицированный IIFE, читает `localStorage[storageKey]`, иначе `matchMedia`, ставит
`data-theme` + `color-scheme`; параметры (`storageKey`, дефолт-тема, список тем) — плейсхолдеры,
подставляются в setup из опций модуля (паттерн color-mode `<%= options.x %>`-replace).

### 3.4 Dev-watcher по директории токенов (D13 — фикс класса `SOURCE_REL`-бага)

- **`builder:watch`** — хук на изменение файла. **В Nuxt 4 путь АБСОЛЮТНЫЙ** (в Nuxt 3 был
  относительный к srcDir) — критично для watch файлов **вне** `app/`/srcDir (директория токенов
  проекта). Для обратной совместимости — `relative()`+`resolve()` из `node:path`.
  https://nuxt.com/docs/4.x/guide/modules/recipes-advanced · https://nuxt.com/docs/getting-started/upgrade
- **Регистрация путей на watch вне srcDir**: `nuxt.options.watch.push(absPathОrRegex)` (Nuxt 4
  поддерживает абсолютные пути и пути вне srcDir). https://nuxt.com/docs/4.x/api/nuxt-config (watch)
- **Паттерн D13 (хэш директории, НЕ ручной список файлов):**
  ```ts
  nuxt.hook('builder:watch', async (event, path) => {          // path — АБСОЛЮТНЫЙ (Nuxt 4)
    if (!isUnderTokensDir(path)) return
    const nextHash = hashDir(tokensDir)                          // хэш всей директории токенов
    if (nextHash === lastHash) return
    lastHash = nextHash
    await updateTemplates({ filter: t => t.filename === 'themeon.css' })  // регенерит только наш CSS
  })
  ```
  `updateTemplates({ filter })` перегенерирует конкретный template → Vite подхватывает HMR CSS.
  Это конструктивно устраняет `SOURCE_REL`-баг: watch по директории+хэшу, а не по хардкод-списку
  из R-01/R-02. https://nuxt.com/docs/4.x/api/kit/templates (updateTemplates + builder:watch)

### 3.5 Build Nuxt-модуля

`@nuxt/module-builder@1.0.2` — канон-тул сборки модулей (генерит правильный `exports`/типы
модуля). Альтернатива — общий монорепный tsdown (D12), но module-builder даёт корректный
`module.json`/типы `ModuleOptions` из коробки. Решить в дизайне (склон — module-builder ради
типовой корректности Nuxt-специфики, ценой второго build-тула).

## 4. `@themeon/vite` — плагин `virtual:themeon.css` + HMR (Vite 8.1.4)

### 4.1 Virtual module — канон resolveId/load

```ts
const V_ID = 'virtual:themeon.css'
const RESOLVED = '\0' + V_ID          // \0-префикс: другие плагины НЕ трогают
export default function themeon(opts): Plugin {
  return {
    name: 'themeon',
    resolveId(id) { if (id === V_ID) return RESOLVED },
    load(id)      { if (id === RESOLVED) return serializeThemeCss(resolveTheme(opts)) },
    // ...HMR ниже
  }
}
```
Паттерн подтверждён UnoCSS (§4.3) и Vite-доками (https://vite.dev/guide/api-plugin — virtual modules,
convention `\0`).

### 4.2 HMR — hook `hotUpdate` (Vite 8), НЕ устаревший `handleHotUpdate`

https://vite.dev/changes/hotupdate-hook — `handleHotUpdate` **deprecated** (снимут в будущем major),
замена — `hotUpdate` (Environment-API-aware, ловит create/update/delete).

```ts
interface HotUpdateOptions {
  type: 'create' | 'update' | 'delete'
  file: string
  timestamp: number
  modules: Array<EnvironmentModuleNode>   // ТОЛЬКО текущее окружение (не микс client+ssr)
  read: () => string | Promise<string>
  server: ViteDevServer
}
```
Отличия от `handleHotUpdate`: вызывается **на каждое окружение** (client/ssr раздельно),
модули — только текущего окружения, `type` различает create/update/delete. Доступ:
`this.environment.moduleGraph.invalidateModule()` + `this.environment.hot.send()` (вместо
старых `server.moduleGraph` / `server.ws`).

**Паттерн для нас** — на изменение файла токенов проекта инвалидируем virtual-модуль и шлём CSS-update:
```ts
hotUpdate({ file, server }) {
  if (!isTokensFile(file)) return
  const mod = this.environment.moduleGraph.getModuleById(RESOLVED)  // '\0virtual:themeon.css'
  if (mod) {
    this.environment.moduleGraph.invalidateModule(mod)
    this.environment.hot.send({ type: 'update', updates: [{
      type: 'css-update', path: mod.url, acceptedPath: mod.url, timestamp: Date.now()
    }]})
    return []   // мы сами обработали — Vite не делает своё
  }
}
```
Совместимость: `handleHotUpdate` ещё работает в Vite 8 (deprecated, не удалён) — если нужен
диапазон `vite: ^7 || ^8`, писать `hotUpdate` с fallback, но peer `^8` проще (§1).

> ⚠️ **ОПРОВЕРГНУТО (2026-07-14, P8)**: паттерн выше (ручной `hot.send({type:'css-update',…})`
> на `mod.url` виртуального модуля) — no-op в реальном Vite. `css-update` подменяет ТОЛЬКО
> `<link>`-теги в DOM; виртуальный CSS-модуль подключается через JS-импорт (`import
> 'virtual:themeon.css'`), а не `<link>`, поэтому `css-update` для него не применяется никогда.
> Дополнительно: `mod.url` виртуального модуля — сырой `\0virtual:themeon.css` (внутренний
> Rollup-префикс), не браузерный `/@id/...`-путь, так что и «правильный» `js-update` был бы
> адресован в никуда. Канон HMR — `findings/P8-vite-channel-hmr.md` (Vite 8.1.4 + кросс-проверка
> 7.3.6, живой Chromium по CDP); решение — **P-D55** (supersedes P-D26).

### 4.3 Эталон — UnoCSS `virtual:uno.css` (проверенный паттерн, R-06 §4)

Из источника `packages-integrations/vite/src/modes/global/dev.ts`
(https://raw.githubusercontent.com/unocss/unocss/main/…/global/dev.ts):
- **invalidate:** `server.moduleGraph.getModuleById(id)` → `invalidateModule(mod)`, затем через
  debounce-таймер `sendUpdate(ids)`.
- **sendUpdate:** `server.ws.send({ type:'update', updates:[{ acceptedPath: mod.url, path: mod.url,
  timestamp, type:'js-update' }] })` (UnoCSS шлёт `js-update`, т.к. CSS импортится как JS-модуль;
  для чистого `.css`-virtual корректнее `css-update`).
- **debounce** (~10мс) на батч изменений — стоит воспроизвести (частые сохранения токенов).
- Клиент: `import.meta.hot.accept` + `invalidate` (Vite HMR API https://vite.dev/guide/api-hmr).

> ⚠️ **ОПРОВЕРГНУТО (2026-07-14, P8)**: этот пункт верно ЦИТИРУЕТ факт («UnoCSS шлёт
> `js-update`, т.к. CSS импортится как JS-модуль»), но делает из него ОБРАТНЫЙ вывод —
> «для чистого `.css`-virtual корректнее `css-update`» (см. §4.2 выше). ThemeOn virtual-модуль
> тоже импортируется как JS (`import 'virtual:themeon.css'`), а не через `<link>`, значит по
> ТОЙ ЖЕ логике донора нужен `js-update`, не `css-update` — R-13 сама привела правильную
> предпосылку и свернула не туда. Канон — `findings/P8-vite-channel-hmr.md`; решение — **P-D55**.

### 4.4 Laravel / plain-Vite рецепт (§4.8)

- Плагин в `vite.config.js`; в `resources/css/app.css` — `@import "virtual:themeon.css";` **или**
  `@import "@themeon/css/tokens.css";` (build-time статикой). laravel-vite-plugin просто отдаёт
  Vite-конвейер; наш плагин — обычный Vite-плагин, ставится рядом. Прецедент рецепта — R-06
  (BlatUI, laravel-vite-plugin). Виртуальный маршрут даёт HMR токенов в dev; статический
  `@themeon/css/tokens.css` — для тех, кто не хочет плагин (fallback, работает и без Vite-плагина).

> ⚠️ **ОПРОВЕРГНУТО (2026-07-14, P8)**: `@import "virtual:themeon.css";` внутри CSS **не
> работает** и не может работать — CSS `@import` резолвится PostCSS/`postcss-import` по
> файловой системе, а не через плагинный `resolveId`/`load` конвейер Vite; virtual-модули
> резолвятся только для JS-графа (`import`/`import()`). Это Blocker #1 аудита — единственный
> документированный способ подключения `@themeon/vite` был нерабочим. Канон подключения —
> `import 'virtual:themeon.css'` из JS-энтри; CSS-only остаётся только через статический
> `@themeon/css/tokens.css` (без HMR темы). Канон — `findings/P8-vite-channel-hmr.md`;
> решение — **P-D55** (supersedes P-D26).

## 5. Edge-cases и подводные камни (сводка для дизайна)

1. **Vite 8 свежий (2026-07-09)** — `hotUpdate` актуален, `handleHotUpdate` deprecated. Peer `^8`.
2. **SSR flash при `auto`** — известная дыра VueUse; закрывается анти-FOUC head-скриптом (§3.3)
   + правилом «SSR-разметка не зависит от темы» (только `data-theme`+var, не DOM-структура).
3. **`data-theme` (не class)** — `useColorMode({attribute:'data-theme'})` умеет; наш свой
   `useTheme` пишет тем же атрибутом + зовёт `applyTheme` ядра (единый источник записи).
4. **Nuxt 4 `builder:watch` — абсолютные пути** (ломано относительно Nuxt 3); watch вне srcDir
   поддержан, регистрировать через `nuxt.options.watch`. D13 хэш-директории, не список файлов.
5. **`addTemplate` write:true** для CSS в `css.push` (virtual FS может не резолвиться Vite-массивом
   CSS — VERIFY при исполнении).
6. **Один источник записи в DOM** — не смешивать VueUse-applier (пишет только атрибут) и наш
   `applyTheme` (пишет var-патч): либо свой composable целиком, либо VueUse только для `system`-сигнала.
7. **`disableTransition:true`** — воспроизвести приём (глушить transition на кадр смены темы), даже
   в своём composable, иначе смена темы «протекает» анимацией по всем свойствам.
8. **module-builder vs tsdown** — второй build-тул ради Nuxt-типовой корректности; решить D#.

## 6. Сводка выводов для дизайна P3 (opus/high, P-D17)

1. **Версии-peer:** `vue: ^3.5`, `nuxt: >=4.0.0` (kit 4.4.8), `vite: ^8` (hotUpdate). Все MIT.
2. **`@themeon/vue`:** свой `useTheme()` ~80 LOC (zero-dep, поверх `applyTheme` ядра) — VueUse
   `useColorMode` только референс формы (`attribute:'data-theme'`, `modes`, `system`/`store`/`state`,
   `disableTransition`, `emitAuto`); клиент-гейтинг `matchMedia`/`localStorage`; Vue-плагин
   `install`+`provide/inject` (стандарт, без RAG).
3. **`@themeon/nuxt`:** `defineNuxtModule` object-syntax + `compatibility.nuxt:'>=4.0.0'`;
   `css.push` токенов; анти-FOUC — **`app.head.script` `tagPriority:'critical'`** (маршрут A,
   статический скрипт), маршрут B (nitro `render:html`) — задел под P6; `addImports` для
   `useTheme`; dev-watcher — `builder:watch`(абс.путь Nuxt 4)+хэш директории+`updateTemplates`
   (D13); CSS через `addTemplate({write:true, getContents})`.
4. **`@themeon/vite`:** virtual `\0virtual:themeon.css` (resolveId/load); HMR через **`hotUpdate`**
   (Environment API: `this.environment.moduleGraph.invalidateModule` + `this.environment.hot.send
   ({type:'update',updates:[{type:'css-update',…}]})`); эталон — UnoCSS dev.ts (invalidate+debounce+
   sendUpdate); Laravel-рецепт — `@import "virtual:themeon.css"` (HMR) или статик `tokens.css` (fallback).

> ⚠️ **ОПРОВЕРГНУТО (2026-07-14, P8)**: весь пункт 4 воспроизводит опровергнутые §4.2/§4.3/§4.4
> выше — `css-update` для virtual-модуля no-op, CSS-`@import` виртуального модуля невозможен.
> Канон — `import 'virtual:themeon.css'` из JS-энтри, HMR — `hotUpdate` возвращающий `[mod]`
> (без ручного `hot.send`). Канон — `findings/P8-vite-channel-hmr.md`; решение — **P-D55**
> (supersedes P-D26).
5. **Инварианты:** единый источник записи DOM (`applyTheme`); SSR-разметка не зависит от темы;
   `data-theme` атрибут; N тем; persist localStorage + `prefers-color-scheme` дефолт.

## 7. Провенанс (ключевые URL)

- VueUse useColorMode: https://vueuse.org/core/usecolormode/
- Nuxt Kit templates: https://nuxt.com/docs/4.x/api/kit/templates ·
  plugins: https://nuxt.com/docs/4.x/api/kit/plugins ·
  recipes-basics: https://nuxt.com/docs/4.x/guide/modules/recipes-basics ·
  recipes-advanced (builder:watch): https://nuxt.com/docs/4.x/guide/modules/recipes-advanced ·
  upgrade (абс.пути watch): https://nuxt.com/docs/getting-started/upgrade
- Nuxt head (script/tagPriority): https://nuxt.com/docs/4.x/api/kit/head ·
  https://unhead.unjs.io/docs/head/api/composables/use-head
- @nuxtjs/color-mode source (nitro render:html маршрут):
  https://raw.githubusercontent.com/nuxt-modules/color-mode/main/src/module.ts ·
  https://deepwiki.com/nuxt-modules/color-mode
- Vite hotUpdate hook: https://vite.dev/changes/hotupdate-hook ·
  plugin API (virtual modules): https://vite.dev/guide/api-plugin ·
  HMR API: https://vite.dev/guide/api-hmr
- UnoCSS vite dev source (HMR invalidate/sendUpdate): 
  https://raw.githubusercontent.com/unocss/unocss/main/packages-integrations/vite/src/modes/global/dev.ts ·
  https://unocss.dev/integrations/vite
- registry ground truth: https://registry.npmjs.org/{vue,@vueuse/core,nuxt,@nuxt/kit,vite,@nuxt/module-builder}
