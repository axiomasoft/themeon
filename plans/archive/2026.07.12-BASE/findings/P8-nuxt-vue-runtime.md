# P8 — Канон рантайм-фиксов `@themeon/nuxt` / `@themeon/vue`

**Дата верификации:** 2026-07-14 · **Повод:** аудит `90_audit/AUDIT_2026-07-14_research-conformance.md`
находки **#19, #20 (nuxt, Major)**, **#17 (vue, Major)**, **#27 (vue, Minor)** ·
**Потребители:** items фазы P8.

**Пины окружения прогонов:** `nuxt@4.4.8`, `@nuxt/kit@4.4.8`, `@nuxt/cli@3.36.1`, `vite@7.3.6`
(dev-сервер Nuxt), `jiti@2.7.0`, `mlly@1.8.2`, `c12@3.3.4`, `vue@3.5.39`, `vitest@4.1.10`,
`jsdom@27.0.0`, `vue-tsc@3.1.4`, `typescript@5.9.2` (потребитель) / `6.0.3` (сборка пакета),
Node `v24.12.0`.

**Дисциплина доказательств.** Ни один вердикт ниже не выведен из чтения кода: каждый —
живой `nuxt dev` на playground-копии, прогон vitest, или `vue-tsc` на СОБРАННОМ `dist`.
Скретчпад прогонов: `/tmp/claude-1000/-home-vostrikov-projects-packages-themeon/434caa2c-…/scratchpad`
(`pg/` — playground с темой в подкаталоге, `pg2/` — тема в rootDir, `vuetest/` — vitest+jsdom,
`vuepkg/` — пересобранный `@themeon/vue`, `consumer/` — потребитель под `vue-tsc`).

---

## 0. [BLOCKER, НОВОЕ] `themeon.theme` не работал НИКОГДА: `importModule` + `interopDefault` не умеет frozen-объект

Находка получена на ПЕРВОМ живом прогоне: аудит был прав, что «ветка `if (options.theme)` не
исполнялась ни разу» — и как только её исполняешь, `nuxt dev` падает **на старте**, ещё до всякого
watcher'а. Это блокер приоритетнее #19/#20: чинить HMR темы, которая не грузится вообще, бессмысленно.

**Прогон.** `apps/playground`-копия, `themeon: { theme: './theme/theme.config.ts' }`, `nuxt dev`:

```
ERROR  [themeon] module: файл темы "./theme/theme.config.ts" должен экспортировать тему
       (default export либо именованный "theme"/"defaultTheme")
   at loadTheme (packages/nuxt/dist/module.mjs:113:17)
   at async setup (packages/nuxt/dist/module.mjs:119:7)
```

Сообщение ЛЖЁТ: `export default defineTheme({...})` в файле есть. Механизм (изолирован пробой
`probe1.mjs`):

```
RAW namespace keys: [ 'default' ] | has default: true | frozen default: true
importModule result: typeof object | keys: [ 'sys', 'themes', 'schemes' ]
  m.default = UNDEFINED  <-- BUG
```

Цепочка (ground truth в `node_modules`):
1. `@nuxt/kit@4.4.8/dist/index.mjs:452-454` — `importModule` = нативный `import()` + `interopDefault` из `mlly`.
2. `mlly@1.8.2/dist/index.mjs:2565-2592` — `interopDefault` РАЗВОРАЧИВАЕТ namespace в сам `default`,
   а исходные ключи (включая `default` как self-ref) навешивает через `Object.defineProperty(defaultValue, …)`
   **внутри `try { … } catch {}`**.
3. `packages/core/src/define.ts:230` — `defineTheme` возвращает `Object.freeze({ sys, themes, schemes })`
   (+ `freezeDeep`). `defineProperty` на замороженном объекте бросает → `catch {}` глотает →
   у результата **нет** `default`.
4. `module.ts:105` — `themeModule.default ?? themeModule.theme ?? themeModule.defaultTheme` → `undefined` → throw.

**Канон:** не полагаться на `interopDefault` вообще. Загрузчик обязан отдавать СЫРОЙ namespace
(см. §1 — `jiti.import()` его и отдаёт). Если бы мы оставались на `importModule` — обязателен
`{ interopDefault: false }`; но §1 показывает, что `importModule` непригоден по другой причине.

> Регресс-инвариант для теста: тема — ЗАМОРОЖЕННЫЙ объект. Любой загрузчик, проверенный на
> незамороженном фикстур-объекте, пройдёт тест и упадёт в проде.

---

## 1. #19 [Major] Dev-watcher регенерирует байт-в-байт тот же CSS — канон загрузчика: `jiti` с выключенными кэшами

### Доказательство дефекта (живой `nuxt dev`)

Два локальных модуля в одном приложении, оба пишут свой шаблон через `addTemplate`+`updateTemplates`:
`baseline` = сегодняшний код модуля (с обойдённым блокером §0), `fixed` = кандидат-фикс.
Правим (1) сам файл темы, (2) файл, который тема ИМПОРТИРУЕТ (`palette.ts`):

```
[baseline] hashDir(.../theme) = 0.1ms          ← событие поймано, хэш изменился, updateTemplates вызван
[fixed]    reload+serialize = 6.8ms; changed=true
```

Результат на диске:

| | `--color-text` (правка entry) | `--color-bg-page` (правка импорта) | md5 |
|---|---|---|---|
| `baseline-tokens.css` | `oklch(0.2 0 0)` — **СТАРОЕ** | `oklch(0.5 0.2 30)` — **СТАРОЕ** | `0d6d08e7…` (не изменился со старта) |
| `fixed-tokens.css` | `oklch(0.42 0 0)` ✅ | `oklch(0.77 0.1 90)` ✅ | `88eef109…` |

`updateTemplates` отработал, `getContents` вызван, файл перезаписан — **байт-в-байт тем же
содержимым**. Комментарий `module.ts:98-102` («fresh `importModule` → fresh jiti instance») —
ложь: `importModule` это `import()`, Node кэширует ESM-модули по URL навсегда.

**Дополнительно (важно для оценки серьёзности):** dev-сервер Nuxt перезапускается **в том же
процессе** (`@nuxt/cli/dist/dev-*.mjs:591` `#load(reload)`), поэтому ESM-кэш переживает
«Restarting Nuxt…». В логе видно, что baseline остался протухшим ДАЖЕ ПОСЛЕ рестарта — лечится
только `Ctrl+C` + повторный `nuxt dev`.

### Матрица загрузчиков (`probe2.mjs`, тема импортирует `./palette.ts`, правим импорт)

| загрузчик | round 1 | round 2 (после правки импорта) | вердикт |
|---|---|---|---|
| `importModule(p)` — **текущий код** | `[]` (нет темы, §0) | `[]` | **не работает вообще** |
| `importModule(p, { interopDefault: false })` | `oklch(1 0 0)` | `oklch(1 0 0)` — **STALE** | блокер закрыт, #19 остаётся |
| нативный `import(url + '?v=' + n)` | `oklch(1 0 0)` | `oklch(1 0 0)` — **STALE** | бустит ТОЛЬКО entry, не граф |
| `createJiti(url, { moduleCache: false, fsCache: false })` | `oklch(1 0 0)` | `oklch(0.5 0.2 30)` ✅ | **КАНОН** |

Отдельно: если тема пишет обычный TS-импорт **без расширения** (`from './palette'` — как пишут все),
нативный `import()` вообще не резолвит его (`ERR_MODULE_NOT_FOUND`: Node-ESM требует полный
специфер). То есть `?v=`-cache-busting отпадает дважды: не бустит граф И не грузит нормальный TS.

**RAG (2026-07-14).**
- Node ESM: «Modules are loaded multiple times if the `import` specifier … has a different query or
  fragment»; API инвалидации ESM-кэша НЕТ → каждый `?v=` — новая вечная запись в кэше
  (unbounded leak в долгоживущем dev-процессе). https://nodejs.org/api/esm.html
- `jiti@2.7.0` README (https://github.com/unjs/jiti#options): `moduleCache` (default `true`) —
  *«Disabling allows editing code and importing the same module multiple times»*; `fsCache` (default `true`).
  jiti держит СВОЙ CJS-подобный cache-store, а не ESM-кэш Node → отключение не течёт в неинвалидируемый кэш.
- `@nuxt/kit` уже зависит от `jiti@^2.7.0` напрямую (`kit/package.json:29`) и сам грузит модули через
  jiti (`loadNuxtModuleInstance` → `getSharedJiti`). Добавление `jiti` в deps `@themeon/nuxt` — не новая ось зависимостей (в catalog: `jiti: 2.7.0`).
- Nuxt module recipes (watcher + `updateTemplates`): https://nuxt.com/docs/4.x/guide/modules/recipes-advanced,
  https://nuxt.com/docs/4.x/api/kit/templates

### Эталонный код (diff-уровень, `packages/nuxt/src/module.ts`)

```diff
-import { addImports, addPlugin, addTemplate, createResolver, defineNuxtModule, importModule,
-         resolvePath, updateTemplates } from '@nuxt/kit'
+import { addImports, addPlugin, addTemplate, createResolver, defineNuxtModule,
+         resolvePath, updateTemplates } from '@nuxt/kit'
+import { createJiti } from 'jiti'
+import { pathToFileURL } from 'node:url'

     if (options.theme) {
       const themePath = await resolvePath(options.theme)

-      const loadTheme = async (): Promise<ThemeDefinition> => {
-        const themeModule = await importModule<ThemeModuleExports>(themePath)
+      // `importModule` (@nuxt/kit) НЕПРИГОДЕН на обоих концах:
+      //  1) это нативный `import()` — Node кэширует ESM по URL навсегда, файл темы больше
+      //     никогда не перечитывается (D13 dev-watcher переписывал бы CSS байт-в-байт);
+      //  2) он прогоняет результат через mlly `interopDefault`, который навешивает `default`
+      //     через `Object.defineProperty` в try/catch — а `defineTheme` возвращает ЗАМОРОЖЕННЫЙ
+      //     объект, поэтому `default` теряется и тема «не экспортирована».
+      // jiti (он же загрузчик самого Nuxt: `loadNuxtModuleInstance` → `getSharedJiti`) держит
+      // собственный cache-store: `moduleCache:false` даёт настоящую ре-эвалуацию ВСЕГО графа
+      // импортов темы, без утечки в неинвалидируемый ESM-кэш Node (см. finding P8, §1).
+      // `alias` — как у kit: иначе `~/tokens/colors` из темы не резолвится.
+      const jiti = createJiti(pathToFileURL(themePath).href, {
+        moduleCache: false,
+        fsCache: false,
+        alias: nuxt.options.alias,
+      })
+
+      const loadTheme = async (): Promise<ThemeDefinition> => {
+        const themeModule = await jiti.import<ThemeModuleExports>(themePath)
         const loaded = themeModule.default ?? themeModule.theme ?? themeModule.defaultTheme
```

Замеры стоимости перезагрузки: `createJiti` заново на каждый вызов — 11 мс/вызов; переиспользуемый
инстанс — **3.1 мс/вызов** (`probe3.mjs`, 10 итераций). В живом `nuxt dev` полный
`loadTheme()+resolveTheme()+serializeThemeCss()` = **5–7 мс**. Инстанс `jiti` создаётся ОДИН раз
на `setup()` (кэши выключены, поэтому свежесть не страдает).

`alias: nuxt.options.alias` — проверено (`probe4.mjs`): без него тема с `import { X } from '~/theme/palette.ts'`
падает `Cannot find module '~/theme/palette.ts'`; с ним — грузится.

---

## 2. #20 [Major] `hashDir` без ignore-списка + `tokensDir = dirname(theme)` = rootDir → sha256 всего проекта на каждое сохранение

### Замеры (`bench-hashdir.mjs`, точная копия `hashDir`, тёплый FS-кэш)

| директория | файлов | прочитано | синхронный `hashDir` |
|---|---|---|---|
| `apps/playground` (rootDir, pnpm-symlink'и в стор) | 3 868 | 202 MB | **181 ms** |
| корень монорепо `themeon/` | 188 927 | 3 955 MB | **3 599 ms** |

### Живой прогон (`pg2`, тема в rootDir — ровно тот layout, что скаффолдит `themeon init`)

```
[rootbad] tokensDir === rootDir ? true
[rootbad] initial hashDir(rootDir) = 302ms
[rootbad] EVENT …/theme.config.ts -> hashDir(rootDir) BLOCKED event loop 293ms
[rootbad] EVENT …/app.vue        -> hashDir(rootDir) BLOCKED event loop 336ms   ← НЕ файл темы!
```

Оба следствия из аудита воспроизведены: (1) фильтр `abs.startsWith(tokensDir)` при `tokensDir===rootDir`
пропускает **любое** событие, включая правку `app.vue`; (2) синхронный sha256 **блокирует event loop
dev-сервера** ~300 мс на КАЖДОЕ сохранение (на монорепо-корне — 3.6 с).

Дефолт-layout не экзотика, а норма: `packages/cli/src/templates.ts` кладёт `theme.config.ts` в
корень проекта, README `@themeon/vite` показывает `./theme.config.ts`.

### Семантика `nuxt.options.watch` (ground truth, `nuxt@4.4.8/dist/index.mjs`)

Аудит и RAG-докстраница (https://nuxt.com/docs/4.x/api/nuxt-config#watch) говорят «watch = рестарт
dev-сервера». **Уточнение по коду (важно для дизайна):**

```js
// nuxt/dist/index.mjs:7400-7412
nuxt.hooks.hook("builder:watch", (event, relativePath) => {
  const path = resolve(nuxt.options.srcDir, relativePath)
  ...
  for (const pattern of nuxt.options.watch) {
    if (typeof pattern === "string") {
      if (pattern === path || layerRelativePaths.has(pattern)) return nuxt.callHook("restart")
```

Сравнение **строгое по строке пути**. Отсюда два режима, оба подтверждены в живых прогонах:
- `watch.push(<файл>)` → изменение файла даёт `pattern === path` → **полный рестарт Nuxt**
  (в логе `ℹ Restarting Nuxt...`; так вёл себя `fixed`/`rootfix`).
- `watch.push(<директория>)` → `pattern !== path` никогда → рестарта НЕТ, но путь попадает в
  `resolvePathsToWatch` → события `builder:watch` для файлов внутри приходят → granular CSS-HMR
  через `updateTemplates` (так вёл себя `baseline`; рестарта в логе нет).

И ещё, там же: `resolvePathsToWatch` (`index.mjs:8807-8822`) при добавлении широкого пути
**вытесняет** более узкие (`if (w.startsWith(path)) pathsToWatch.delete(w)`) — т.е. `watch.push(rootDir)`
буквально заменяет узкие `app/`/`server/`-подписки подпиской на весь корень. Второе следствие
аудита подтверждено по коду.

Сам Nuxt везде исключает: `ignored: [isIgnored, /[\\/]node_modules[\\/]/]` (`index.mjs:8634, 8667`),
`ignoredDirs = new Set([...nuxt.options.modulesDir, nuxt.options.buildDir])`. `isIgnored`/`createIsIgnored`/
`resolveIgnorePatterns` **экспортируются из `@nuxt/kit`** (проверено в `kit/dist/index.d.mts`) —
дефолтный `ignore` включает `node_modules`, `buildDir`, `.git`, `.output`, `.cache`, `**/*.d.ts`, `**/*.{spec,test}.*`.

### Канон

**`hash-dir.ts` УДАЛИТЬ.** Хэш директории — неверный инструмент: он отвечает на вопрос «изменилось ли
что-то во ВХОДЕ», ценой O(проект), тогда как единственный нужный вопрос — «изменился ли ВЫХОД».
Дедуп по СГЕНЕРИРОВАННОМУ CSS точен, стоит 5–7 мс и не зависит от размера дерева:

```diff
-      let lastHash = hashDir(tokensDir)
-      nuxt.hook('builder:watch', async (_event, path) => {
-        const abs = resolveAbs(nuxt.options.rootDir, path)
-        if (!abs.startsWith(tokensDir)) return
-        const nextHash = hashDir(tokensDir)
-        if (nextHash === lastHash) return
-        lastHash = nextHash
-        await updateTemplates({ filter: (t) => t.filename === 'themeon-tokens.css' })
-      })
+      nuxt.hook('builder:watch', async (_event, path) => {
+        const abs = resolveAbs(nuxt.options.srcDir, path)
+        if (!isWatched(abs)) return
+        // Дедуп по ВЫХОДУ, а не по хэшу входной директории: единственный вопрос, на который
+        // watcher обязан ответить — «изменился ли CSS». Стоит один reload темы (5-7 мс) вместо
+        // синхронного sha256 всего дерева (181 мс на playground, 3.6 с на монорепо — P8 §2),
+        // и не требует ignore-списка, чтобы не съесть node_modules/.git/.output.
+        const next = await buildCss()
+        if (next === cachedCss) return
+        cachedCss = next
+        await updateTemplates({ filter: (t) => t.filename === 'themeon-tokens.css' })
+      })
```

где

```ts
let cachedCss: string | undefined
const buildCss = async (): Promise<string> => serializeThemeCss(resolveTheme(await loadTheme()))

const template = addTemplate({
  filename: 'themeon-tokens.css',
  write: true,
  getContents: async () => (cachedCss ??= await buildCss()),   // watcher уже посчитал — не считаем дважды
})
```

**Область наблюдения — НИКОГДА не rootDir.** Правило (в порядке приоритета):

```ts
const themeDir = dirname(themePath)
const explicit = options.tokensDir ? await resolvePath(options.tokensDir) : undefined
const watchDir = explicit ?? (themeDir === nuxt.options.rootDir || themeDir === nuxt.options.srcDir
  ? undefined            // тема лежит в корне — директорию НЕ трогаем
  : themeDir)

if (explicit && (explicit === nuxt.options.rootDir || nuxt.options.buildDir.startsWith(explicit + sep))) {
  throw new Error(
    `[themeon] tokensDir не может быть корнем проекта (${explicit}): dev-watcher подписался бы на ` +
      `весь rootDir и вытеснил бы узкие подписки Nuxt. Положите токены в отдельную директорию.`,
  )
}

if (watchDir) {
  // директория => granular CSS-HMR без рестарта (nuxt.options.watch сравнивает пути строго)
  nuxt.options.watch.push(watchDir)
  isWatched = (abs) => abs === withTrailingSep(watchDir) || abs.startsWith(withTrailingSep(watchDir))
} else {
  // тема в корне => подписываемся на САМ ФАЙЛ; Nuxt делает полный рестарт dev-сервера
  // (документированная семантика `watch`), setup() исполняется заново, jiti читает свежий файл.
  // builder:watch-ветка здесь не нужна.
  nuxt.options.watch.push(themePath)
  logger.info(
    `[themeon] тема лежит в корне проекта — правка перезапускает dev-сервер. Для CSS-HMR ` +
      `перенесите тему в свою директорию (например \`theme/\`) или задайте \`themeon.tokensDir\`.`,
  )
}
```

Оба маршрута проверены живьём: `pg` (тема в `theme/`) → CSS-HMR без рестарта, `.nuxt/fixed-tokens.css`
обновился; `pg2` (тема в rootDir) → `ℹ Restarting Nuxt...`, `.nuxt/rootfix.css` обновился
(`--color-text: oklch(0.61 0 0)`), **без единого обхода дерева**.

**Побочный дефект (закрыть заодно):** `abs.startsWith(tokensDir)` без разделителя — префиксная
ошибка: `/app/theme-old/x.ts` матчит `tokensDir=/app/theme`. Сравнивать по `tokensDir + sep`.
Также `resolveAbs(nuxt.options.rootDir, path)` → канон Nuxt — `resolve(nuxt.options.srcDir, path)`
(так делают все внутренние хендлеры, `index.mjs:7401`); при `srcDir='app/'` (дефолт Nuxt 4) это
не одно и то же.

**Отвергнутые варианты.**
- *Оставить `hashDir` + добавить ignore-список (`createIsIgnored` + node_modules/.git/buildDir).*
  Лечит стоимость лишь частично (обход дерева остаётся синхронным и O(проект) по исходникам), не
  лечит вытеснение узких подписок `watch.push(rootDir)` и не нужен вовсе при дедупе по выходу.
- *Строить граф импортов темы и watch'ить его.* jiti не отдаёт граф; парсить импорты руками —
  overkill. Директория токенов покрывает реальный кейс (тема + соседние файлы токенов) полностью:
  jiti перечитывает ВЕСЬ граф, поэтому достаточно поймать событие по любому файлу директории.
- *`c12 watchConfig()`.* Официальный «канон unjs» для конфигов, но тянет peer-зависимость `chokidar`
  и ЗАВОДИТ ВТОРОЙ watcher рядом с nuxt'овым — при том что `builder:watch` уже даёт нам события.

---

## 3. #17 [Major] Vue: `matchMedia`/`document` не гейтятся, `initialized` выставлен ДО броска

### Почему не поймали тесты

Весь `packages/vue/src/*.test.ts` идёт в `environment: node` и **всегда** подаёт seam'ы
(`target`/`storage`/`media`). Дефолтные ветки `getTarget`/`getMedia` не исполнялись ни разу.
Тест-долг (см. §5) — обязательная часть фикса, иначе регресс вернётся.

### Доказательство (vitest 4.1.10 + jsdom 27, БЕЗ шима — `vuetest/repro.test.ts`, `ssr.test.ts`)

Прогон: **15/15 passed**. Что зафиксировано на ТЕКУЩЕМ коде:

| проверка | результат |
|---|---|
| jsdom имеет `document`, но `window.matchMedia === undefined` | ✅ (jsdom по сей день не реализует `matchMedia`) |
| `createThemeState().init()` в jsdom | **бросает** `TypeError: matchMedia is not a function` |
| после броска потребитель добавляет канонический шим и зовёт `init()` ПОВТОРНО | **молчаливый no-op**: `theme` остался `light`, `data-theme` в DOM **не выставлен НИКОГДА** |
| `app.use(themeonPlugin)` + `onMounted(() => init())` — дословный сниппет из JSDoc `use-theme.ts:32-33` | компонент падает на mount |
| node-env (SSR): `init()` | `ReferenceError: matchMedia is not defined` |
| node-env (SSR): `set('dark')` | `ReferenceError: document is not defined` |

Второй эффект — тот самый «хуже» из аудита: `initialized = true` (state.ts:180) стоит РАНЬШЕ
первого обращения к `matchMedia` (state.ts:196), поэтому пакет становится **необратимо мёртвым**
в этом экземпляре состояния.

### Канон гейта (RAG 2026-07-14: VueUse 14.3.0)

`@vueuse/core` `useMediaQuery` (https://github.com/vueuse/vueuse/blob/main/packages/core/useMediaQuery/index.ts):

```ts
// packages/shared/utils/is.ts
export const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'
// packages/core/_configurable.ts
export const defaultWindow = /* #__PURE__ */ isClient ? window : undefined
// useMediaQuery
const isSupported = useSupported(() => window && 'matchMedia' in window && typeof window.matchMedia === 'function')
const matches = shallowRef(false)          // значение на сервере — false, не undefined
watchEffect(() => { if (!isSupported.value) return; mediaQuery.value = window!.matchMedia(toValue(query)) })
```

Т.е. канон = **один `isClient` (`window` И `document`) + отдельная проверка наличия ФУНКЦИИ
`matchMedia`** (jsdom: `window` есть, `document` есть, `matchMedia` нет — проверки только на `window`
НЕДОСТАТОЧНО), + честное значение по умолчанию `matches === false` на сервере.

### Эталонный код (diff-уровень, `packages/vue/src/state.ts`) — прогнан, 15/15 green

```diff
+/**
+ * Один гейт на весь модуль — канон VueUse (`isClient` = `typeof window !== 'undefined' &&
+ * typeof document !== 'undefined'`, packages/shared/utils/is.ts).
+ */
+const isClient = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined'
+
 export function createThemeState(options: UseThemeOptions = {}): UseThemeReturn {
-  const getTarget = options.target ?? (() => document.documentElement)
+  const getTarget = options.target ?? (() => (isClient() ? document.documentElement : null))
   ...
-  const getMedia = options.media ?? ((query: string) => matchMedia(query))
+  // Симметрично `getStorage`: НЕТ окружения — НЕТ броска. jsdom имеет `document`, но НЕ имеет
+  // `matchMedia`, поэтому гейт обязан проверять наличие ФУНКЦИИ, а не только `window`.
+  const getMedia =
+    options.media ??
+    ((query: string) =>
+      isClient() && typeof window.matchMedia === 'function'
+        ? window.matchMedia(query)
+        : { matches: false })

   function applyOne(name: string): void {
     const el = getTarget()
+    // Нет DOM (SSR/node-тест) — тихий no-op: состояние уже обновлено в `apply()`, писать некуда.
+    if (!el) return
     el.setAttribute(attribute, name)

   function init(): void {
     if (initialized) return
-    initialized = true
-
     let stored: string | null = null
     ...
     apply(storedIsUsable ? (stored as string) : defaultPreference)
+
+    // Флаг ТОЛЬКО после успешного прохода: брось что-нибудь выше (сломанный seam, экзотический
+    // SecurityError) — и повторный `init()` обязан отработать, а не молча выйти по `if (initialized)`.
+    initialized = true
   }
```

Плюс расширение типа seam'а (`packages/vue/src/types.ts:45`):

```diff
-  target?: () => ElementLike & { setAttribute(n: string, v: string): void }
+  target?: () => (ElementLike & { setAttribute(n: string, v: string): void }) | null
```

(Тип `media` менять НЕ надо: он уже `{ matches: boolean; addEventListener?: … }` — стаб
`{ matches: false }` в него ложится.)

### Что фикс НЕ ломает (проверено тем же прогоном)

- **P-D49 (`preference`/`theme`/`system`)**: при шиме `matchMedia` → `preference==='system'`
  резолвится в `dark`, `data-theme="dark"`; **живое следование за ОС** — событие `change` от
  MediaQueryList перекрашивает страницу в `light`. ✅
- **Явный выбор перебивает системную ветку**, персистится НАМЕРЕНИЕ (`'light'`, затем `'system'`). ✅
- **Идемпотентность**: второй `init()` — no-op, не сбрасывает выбранную тему. ✅
- **Флаг не «отравляется»**: бросающий seam → `init()` бросил, но повторный вызов ИНИЦИАЛИЗИРУЕТ
  (на baseline здесь молчаливый no-op). ✅
- **SSR**: `init()`/`set()` — тихий no-op, `system` остаётся `'light'` (SSR-нейтральность,
  инвариант фазы №2); `renderToString` компонента, зовущего `init()` в `setup`, отдаёт `<div>light</div>`. ✅

**Отвергнутые варианты.**
- *`import.meta.client`.* Это Nuxt/Vite-специфичный флаг; `@themeon/vue` — фреймворко-нейтральный
  пакет, публикуемый как обычный ESM (`tsdown`, без vite-define) — в plain-SPA/Node он не определён.
  Канон библиотеки — `typeof window`/`typeof document` (ровно так делает VueUse).
- *Обернуть `init()` целиком в `try/catch`.* Прячет реальные ошибки (Rule 5 «fail loud») и не решает
  проблему флага.
- *Гейт на уровне вызывающих (`onMounted`/`if (import.meta.client)`).* Так уже сделано в
  `nuxt/src/runtime/plugin.ts:23` — и всё равно ломается: jsdom-тест потребителя ЯВЛЯЕТСЯ клиентом
  (`import.meta.client === true`), но `matchMedia` там нет. Гейт обязан быть в seam'е.

---

## 4. #27 [Minor] `ComponentCustomProperties` — канон аугментации для библиотеки

### Доказательство (реальный `vue-tsc@3.1.4` на СОБРАННОМ `dist`)

Потребитель (`consumer/`, `moduleResolution: bundler`, `strict`), `src/App.vue`:

```vue
<template>
  <button @click="$theme.toggle()">{{ $theme.theme }}</button>
</template>
```

| `@themeon/vue` | `vue-tsc --noEmit` |
|---|---|
| текущий `packages/vue/dist` | `src/App.vue(6,19): error TS2339: Property '$theme' does not exist on type 'ComponentPublicInstance<…>'` (×2) |
| пересобранный с `src/global-extensions.ts` | **exit 0** |

`grep "ComponentCustomProperties" packages/vue/dist/index.d.ts` на текущей сборке → **0**.

### Канон (RAG 2026-07-14)

Vue docs, «Augmenting Global Properties» + «Type Augmentation Placement»
(https://vuejs.org/guide/typescript/options-api#augmenting-global-properties):

> «For library / plugin authors, this file should be specified in the `types` property in `package.json`.»
> «…the file needs to contain at least one top-level `import` or `export`, **even if it is just
> `export {}`. If the augmentation is placed outside of a module, it will overwrite the original
> types rather than augmenting them!**»

Эталон в живой библиотеке — **Pinia 3.0.4**, `packages/pinia/src/globalExtensions.ts`:
отдельный `.ts`-файл (НЕ `.d.ts`), `declare module 'vue' { interface ComponentCustomProperties { $pinia: Pinia } }`
+ `export {}`, реэкспортируемый из `src/index.ts` (`export * from './globalExtensions'`) — и он
физически присутствует в опубликованном `dist/pinia.d.ts`. Тот же паттерн у `vue-router` (`$router`/`$route`).

### Эталонный код

Новый файл `packages/vue/src/global-extensions.ts`:

```ts
/**
 * Аугментация `ComponentCustomProperties` для `$theme`, который `themeonPlugin` кладёт в
 * `app.config.globalProperties` (P3.2). Без неё `vue-tsc`/`nuxi typecheck` у потребителя падает
 * «Property '$theme' does not exist on type 'ComponentCustomProperties…'» — публично объявленная
 * фича непригодна в любом типизированном проекте.
 *
 * ФАЙЛ ОБЯЗАН БЫТЬ TS-МОДУЛЕМ (`export {}` ниже): аугментация вне модуля не дополняет, а
 * ПЕРЕЗАПИСЫВАЕТ типы `vue` (Vue docs, «Type Augmentation Placement»). Реэкспорт из `src/index.ts`
 * обязателен — иначе `declare module 'vue'` не попадёт в собранный `dist/index.d.ts`
 * (канон Pinia: `src/globalExtensions.ts` + `export * from './globalExtensions'`).
 */
import type { UseThemeReturn } from './types'

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Per-app theme state provided by `themeonPlugin` (`app.use(themeonPlugin)`). */
    $theme: UseThemeReturn
  }
}

export {}
```

`packages/vue/src/index.ts`:

```diff
+export * from './global-extensions'
 export { SYSTEM_PREFERENCE } from './defaults'
```

Проверено: `tsdown` (0.22.3, `dts: true`) переносит блок в `dist/index.d.ts` (строки 86-91 сборки).
Настройки `tsdown.config.ts` менять НЕ нужно.

### Протечка

- В `dist/anti-fouc.d.ts` аугментации **нет** (`grep` → 0): pure-подпуть `@themeon/vue/anti-fouc`
  остаётся чистым, потребитель анти-FOUC-генератора типов `vue` не получает. ✅
- Для потребителя, который импортирует `@themeon/vue`, но плагин НЕ ставит, `$theme` будет
  ЧИСЛИТЬСЯ в типах (компилируется, exit 0 — проверено), но в рантайме будет `undefined`.
  Это неустранимо: `ComponentCustomProperties` глобален по определению; ровно так же ведут себя
  `$pinia` и `$router`. **Остаточный риск, принимается** (альтернатива — не класть `$theme`
  в `globalProperties` вовсе; но это отменяет фичу, объявленную R-13 §2.4 и ТЗ P3.2).

---

## 5. Обязательные интеграционные тесты (через НАСТОЯЩУЮ трубу)

Ни один из них не проходит на текущем коде — это и есть регресс-гейт фазы.

**T1. Живой `nuxt dev` с заданной темой (E2E, `apps/playground`).** Playground ОБЯЗАН задавать
`themeon.theme` — иначе, как показал аудит и §0, ветка codegen не исполняется вообще и любой её
дефект невидим. Сценарий: `nuxt dev` → дождаться ready → изменить цвет в `theme.config.ts` → дождаться
события → сравнить `.nuxt/themeon-tokens.css` ДО/ПОСЛЕ. Тест обязан падать, если md5 не изменился
(именно так сегодня и есть). Отдельный кейс: правка ФАЙЛА, КОТОРЫЙ ТЕМА ИМПОРТИРУЕТ (`palette.ts`) —
проверяет ре-эвалуацию графа, а не только entry (`?v=`-фикс здесь бы прошёл entry и провалил граф).

**T2. Тема — ЗАМОРОЖЕННЫЙ объект.** Юнит на `loadTheme`: фикстура = `defineTheme(...)` (а не
литерал), проверка, что `loadTheme()` возвращает тему. На литерале-фикстуре сегодняшний
`importModule` прошёл бы, а на реальной `defineTheme` — падает (§0).

**T3. Watch-scope не может быть rootDir.** Юнит на резолв `tokensDir`: `theme: './theme.config.ts'`
(тема в корне) ⇒ `nuxt.options.watch` НЕ содержит `rootDir`; `tokensDir: '.'` ⇒ модуль бросает.
Плюс: нигде в модуле не осталось синхронного обхода дерева (после удаления `hash-dir.ts` его
тест `hash-dir.test.ts` удаляется вместе с ним).

**T4. vitest + jsdom БЕЗ matchMedia-шима** (новый vitest-проект/`environment: 'jsdom'` в
`packages/vue`; сегодня весь suite — `environment: node` + seam'ы, поэтому дефолтные ветки
никогда не исполняются):
- `init()` НЕ бросает, выставляет `data-theme` (фолбэк `light`);
- `app.use(themeonPlugin)` + `onMounted(init)` монтируется чисто;
- с шимом: `preference==='system'` → `dark`; событие `change` от MQL перекрашивает (P-D49 живой);
- второй `init()` — no-op; бросающий seam НЕ отравляет `initialized` (повтор инициализирует).

**T5. SSR/node-env**: `init()` и `set()` — тихий no-op, `system==='light'`; `renderToString`
компонента, зовущего `init()`, не падает.

**T6. Typecheck реального потребителя на СОБРАННОМ `dist`** (CI-гейт): минимальный проект,
`<button @click="$theme.toggle()">{{ $theme.theme }}</button>`, `vue-tsc --noEmit` ⇒ exit 0.
Проверять именно `dist/*.d.ts`, а не `src` — аугментация обязана ПЕРЕЖИТЬ сборку tsdown.
Дополнительно: `grep -c ComponentCustomProperties dist/anti-fouc.d.ts` ⇒ 0 (pure-подпуть не течёт).

---

## 6. Остаточные риски

1. **Тема в rootDir теряет granular CSS-HMR** (получает полный рестарт dev-сервера). Это цена отказа
   от `watch.push(rootDir)`, и она неустранима в рамках API Nuxt (см. §2: строгое сравнение путей).
   Следствие для DX: `themeon init` (`packages/cli/src/templates.ts`) и README `@themeon/vite`/`@themeon/nuxt`
   стоит перевести на `theme/theme.config.ts` — тогда дефолтный путь пользователя даёт HMR. **Заводить
   отдельным item'ом P8** (трогает CLI, за пределами nuxt/vue).
2. **`jiti` в `dependencies` `@themeon/nuxt`.** Не новая ось (прямая зависимость `@nuxt/kit`, в catalog),
   но формально +1 dep у пакета. Альтернатив, переживших прогон, нет.
3. **`moduleCache: false` в prod-сборке.** Загрузчик темы вызывается и на `nuxt build` (один раз) —
   кэши там не нужны, но и не вредят (разница 3 мс). Отдельного prod-загрузчика заводить не надо.
4. **`$theme` числится в типах у потребителя, не поставившего плагин** (§4). Принято, как у Pinia.
5. **`nuxi typecheck` Nuxt-потребителя** на аугментацию **не проверялся** (проверен plain-Vue +
   `vue-tsc`). Аугментация доезжает через `import ... from '@themeon/vue'` в `.nuxt/imports.d.ts`,
   но это надо подтвердить прогоном — добавить в T6 nuxt-вариант.
6. **#18 (vite: `css-update` для virtual-модуля — no-op)** — соседняя находка того же аудита, в этот
   findings НЕ входит; фикс `@themeon/nuxt` от неё не зависит (там реальный файл в `.nuxt/`, а не
   virtual-модуль, и Vite подхватывает его штатным CSS-HMR — подтверждено живым прогоном §1).
