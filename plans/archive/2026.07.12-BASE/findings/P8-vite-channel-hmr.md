# P8 — `@themeon/vite`: рабочий канал подключения и живой HMR (эмпирика)

**Дата:** 2026-07-14 · **Статус:** доказано экспериментом на настоящей трубе Vite (не мок)
**Скоуп:** Blocker #1 (канал подключения) и Major #18 (мёртвый HMR) из
`90_audit/AUDIT_2026-07-14_research-conformance.md`. `packages/**` не менялся.

> Все утверждения ниже — «проверено, вот как». Каждая строка матрицы воспроизводится
> скриптами из скретчпада (см. «Метод»). Ложный вывод R-13 §4.3/§4.4 (`css-update` «корректнее
> для чистого CSS-virtual», `@import 'virtual:themeon.css'` в CSS-энтри) **опровергнут прямым
> наблюдением** и в этом документе не используется.

## 1. Пины окружения (зафиксировано фактически)

| Что | Значение | Источник |
|:--|:--|:--|
| Vite (основной прогон) | **8.1.4** | `pnpm-workspace.yaml` → `catalog.vite: 8.1.4`; `node_modules/.pnpm/vite@8.1.4_…` |
| Vite (кросс-проверка нижней границы peer-range) | **7.3.6** | `node_modules/.pnpm/vite@7.3.6_…` |
| peerDependencies плагина | `vite: ^7 \|\| ^8` | `packages/vite/package.json` |
| Node | **v24.12.0** | `node -v` (engines репо: `>=22.18.0`) |
| pnpm | 11.10.0 | `package.json` → `packageManager` |
| Браузер для проверки эффекта | Chrome headless (`/usr/bin/google-chrome`), CDP через нативный `WebSocket` Node 24, без зависимостей | — |

**Результаты на Vite 7.3.6 и 8.1.4 идентичны** во всех проверенных сценариях (провал CSS-`@import`,
молчаливый no-op `css-update`, работающий канонический путь). Различий по мажорам нет.

## 2. Метод (как доказывалось)

Скретчпад: `/tmp/claude-1000/-home-vostrikov-projects-packages-themeon/434caa2c-…/scratchpad/`

- `fx/` — минимальный реальный проект (index.html + JS-энтри + CSS-энтри + `theme.config.mjs`/`.ts`).
- `exp1-build.mjs`, `exp4-build-variants.mjs` — настоящий `vite build` (`build()` из `vite`), матрица
  «энтри × вариант плагина», проверка **содержимого выходного CSS** (`--color-neutral-0` в бандле).
- `exp2-dev.mjs` — настоящий `createServer()` + **живой headless-Chrome по CDP**: навигация,
  правка файла темы на диске, затем замер `getComputedStyle(document.documentElement)
  .getPropertyValue('--color-neutral-0')` — т.е. **эффект в браузере**, а не факт отправки сообщения.
  Плюс детект full-reload (маркер `window.__mark` теряется при перезагрузке) и лог консоли клиента Vite.
- `exp3-payload.mjs` — снятие **сырых payload'ов с HMR-сокета** (клиент на `ws://…`, сабпротокол
  `vite-hmr`) и dev-исходника виртуального модуля.
- `exp5-configdep.mjs` — **настоящий CLI `vite`** (`vite/bin/vite.js`) с настоящим `vite.config.mjs`
  (сценарий README один-в-один) + Chrome.
- `variants.mjs` — варианты плагина. `asis` — байт-в-байт копия горячего пути
  `packages/vite/src/index.ts` (продовый плагин из `packages/vite/dist` использовался там, где
  вариант не требовался); остальные — кандидаты фикса. Продовый код не правился.

Юнит-тесты `packages/vite/src/index.test.ts` мокают `environment.hot.send` и ассертят **факт
отправки** сообщения — поэтому все три дефекта ниже прошли мимо них.

## 3. Матрица «сценарий × канал × результат»

Тема: один токен `--color-neutral-0: oklch(0.99 0 0)`; правка меняет его на `oklch(0.11 0 0)`.
«HMR» = значение переменной в браузере изменилось **без перезагрузки страницы**.

| # | Сценарий (энтри) | Канал | `vite build` | `vite dev`: CSS применился | HMR правки токенов | Доказано |
|:--|:--|:--|:--|:--|:--|:--|
| 1 | JS-энтри | `import 'virtual:themeon.css'` | ✅ CSS в бандле (`assets/app-*.css`, `@layer themeon.tokens` + токены) | ✅ `<style data-vite-dev-id="\0virtual:themeon.css">`, `<link>` — нет | ❌ **нет** (шипованный плагин) | `exp1-build.mjs js`; `exp2-dev.mjs asis js` |
| 2 | CSS-энтри (rollup input) | `@import 'virtual:themeon.css'` | ❌ **падает** | — | — | `exp1-build.mjs css` |
| 3 | CSS импортится из JS (рецепт README «Plain») | `@import 'virtual:themeon.css'` внутри `style.css` | ❌ **падает** | ❌ Internal server error, стилей нет | — | `exp4 cssviajs shipped`; `exp2-dev.mjs asis css` |
| 4 | JS-энтри | `import` + `hotUpdate → return [mod]` (**фикс**) | ✅ | ✅ | ✅ **да**, `[vite] hot updated: /@id/__x00__virtual:themeon.css`, без reload | `exp2-dev.mjs canonical js` (Vite 8.1.4 и 7.3.6) |
| 5 | CSS-энтри | `@import` + `enforce:'pre'` инлайн CSS | ✅ | ✅ | ✅ | `exp4 cssentry preInline`; `exp2-dev.mjs preInline css` |
| 6 | CSS-энтри c **двумя** `@import` (шейп README) | то же (инлайн) | ⚠️ **build «ок», но второй `@import` МОЛЧА выброшен** | — | — | `exp4 both preInline` (см. §5) |
| 7 | CSS-энтри c двумя `@import` | `@import 'virtual:…'` + rewrite спецификатора на **реальный файл** | ✅ оба `@import` живы | ✅ | ✅ | `exp4 both rewriteToFile`; `exp2-dev.mjs rewriteToFile both` |
| 8 | CSS-энтри c двумя `@import` | `resolve.alias` virtual-id → **реальный файл** | ✅ оба `@import` живы | ✅ | ✅ | `exp4 both aliasToFile`; `exp2-dev.mjs aliasToFile both` |
| 9 | CSS-энтри | `@import './.themeon/theme.css'` (реальный файл, «--out») | ✅ (в т.ч. с холодного старта) | ✅ | ✅ **из коробки** (вотчер Vite) | `exp4 real emitFile`; `exp2-dev.mjs emitFile real` |

### Точный текст ошибки для сценариев 2/3 (Blocker #1 воспроизведён)

```
Unable to resolve `@import "virtual:themeon.css"` from /…/fx/src
[plugin vite:css] /…/fx/src/style.css:undefined:NaN
Error: [postcss] ENOENT: no such file or directory, open 'virtual:themeon.css'
    at async Object.load (…/vite/dist/node/chunks/node.js:22545:17)
    at async loadImportContent (…/vite/dist/node/chunks/postcss-import.js:392:19)
```
В dev — то же самое как `Pre-transform error` + `Internal server error`, страница остаётся без стилей.
Причина (ground truth в репо): `vite:css` даёт postcss-import собственный резолвер
(`atImportResolvers.css` → fs) и `load: (id) => fs.readFile(id)`. Хуки `resolveId`/`load`
пользовательских плагинов в этой ветке **не вызываются вообще**.

## 4. Три независимых дефекта (а не два)

Аудит нашёл два; эмпирика вскрыла **третий** и уточнила механику второго.

**D1 (Blocker, = аудит #1).** `@import 'virtual:…'` в CSS не работает **ни в build, ни в dev**.
Все три рецепта `packages/vite/README.md` (Quickstart, Laravel, Plain) показывают только его.

**D2 (Major, = аудит #18, но механика ДВОЙНАЯ).** `hotUpdate` шлёт `css-update` — клиент Vite
обрабатывает `css-update` **только** подменой `<link rel=stylesheet>` (`client.mjs:967-971`:
`const el = …querySelectorAll("link")…; if (!el) return;`), а CSS из JS-графа живёт в
`<style data-vite-dev-id>` → молчаливый no-op. **Плюс вторая, не замеченная аудитом ошибка:**
`mod.url` виртуального модуля — это **сырой `\0virtual:themeon.css`**, а не `/@id/__x00__…`
(снято с живого графа, `exp3-payload.mjs`):

```
mod.id  = "\0virtual:themeon.css"
mod.url = "\0virtual:themeon.css"    ← аудит предполагал "/@id/__x00__virtual:themeon.css"
```
Payload, который реально уходит в сокет:
```jsonc
// шипованный плагин (asis) — не матчится клиентом ДВАЖДЫ: и тип, и path
{"type":"update","updates":[{"type":"css-update","path":"\0virtual:themeon.css", …}]}
// сам Vite, когда hotUpdate возвращает [mod] — эталон:
{"type":"update","updates":[{"type":"js-update","timestamp":…,
  "path":"/@id/__x00__virtual:themeon.css","acceptedPath":"/@id/__x00__virtual:themeon.css",
  "explicitImportRequired":false,"isWithinCircularImport":false}]}
```
Проверено: ручной `js-update` с `path: mod.url` **тоже не работает** (`exp2-dev.mjs jsupdate js`
→ `hmrUpdatedStyle=false`, тишина в консоли) — путь не совпадает с ключом `hotModulesMap`.
Работает только нормализованный путь (`jsupdateNormalized`) или, канонически, `return [mod]`.
Именно поэтому паттерн UnoCSS (`hot.send` с `mod.url`) у них работает, а скопированный сюда — нет:
у UnoCSS виртуальные id **не `\0`-префиксные** (`/__uno.css`), у ThemeOn — `\0`-префиксный.

**D3 (Blocker, НОВЫЙ — аудит не заметил).** `tokensFiles` из README — **относительный** путь
(`tokensFiles: ['./theme.config.ts']`), а `hotUpdate({file})` получает **абсолютный**.
`normalizePath('./theme.config.ts')` → `'theme.config.ts'` (проверено) → `tokensFiles.has(file)`
**никогда** не истинно → `hotUpdate` — no-op при любом типе апдейта. Проверено: даже с
исправленным HMR-механизмом относительный `tokensFiles` даёт `hmrUpdatedStyle=false`
(`RELATIVE_TOKENS=1 node exp2-dev.mjs returnModules js`). Т.е. **README не заработал бы даже после
фикса D2**. Лечится резолвом `tokensFiles` от `config.root` в `configResolved`.

**D4 (контекст, важен для README).** В рецепте README тема **статически импортируется в
`vite.config`** (`import { theme } from './theme.config'`) → файл темы становится
**config-dependency** Vite. Проверено настоящим CLI (`exp5-configdep.mjs vite.config.static.mjs`):
```
[vite] theme.config.mjs changed, restarting server...
[vite] server restarted.
клиент: "[vite] server connection lost. Polling for restart..." → frameNavigated (full reload)
RESULT: styleUpdated=true pageReloaded=true
```
То есть у пользователя, следующего README, тема **всё же обновится — но перезагрузкой страницы с
рестартом дев-сервера**, а не HMR. Обещание README «edit the file, styles update live» ложно.
Если же тему грузить фабрикой в рантайме (не config-dep) — шипованный плагин не делает **ничего**
(`exp5-configdep.mjs vite.config.factory-asis.mjs` → `styleUpdated=false, pageReloaded=false`).
**Для настоящего HMR файл темы не должен быть config-dependency.**

### Что на самом деле делает `return []`
Проверено: **ничего не подавляет** в этом сценарии. Файл темы не входит в граф модулей, поэтому
дефолтный путь Vite для него и так пуст: вариант вообще **без** хука `hotUpdate` (`nohook`) даёт
ровно тот же результат — ни апдейта, ни full-reload (`exp2-dev.mjs nohook js`). Формально
(`hmr.ts`: `if (!options.modules.length) { … return }`) `[]` отменяет дефолтную обработку и
обязывает слать апдейт руками; но full-reload'а, который «спасал бы» ситуацию, здесь не было и без него.
Также проверено: `invalidateModule()` **не обязателен**, если возвращать `[mod]` — Vite
инвалидирует сам (`returnModulesNoInvalidate` → HMR работает).

## 5. Отвергнутые варианты

| Вариант | Вердикт | Почему (проверено) |
|:--|:--|:--|
| `@import 'virtual:themeon.css'` как есть | ❌ **невозможно** | postcss-import резолвит по ФС; плагинные хуки не участвуют. Официально поддерживаемого способа нет (см. RAG: ответ мейнтейнера Tailwind, закрытый unocss#3853) |
| `enforce:'pre'` + **инлайн** CSS в CSS-энтри | ❌ **опасно** | Работает, но **молча выбрасывает последующие `@import`**: на шейпе README (`@import 'virtual:themeon.css'` + `@import '@themeon/css/index.css'`) postcss ругается `@import must precede all other statements` и **выкидывает второй импорт**, а build при этом **зелёный**. `other-marker` отсутствует в бандле (`exp4 both preInline`). Тихая потеря пользовательского CSS — неприемлемо |
| Ручной `hot.send({type:'js-update', path: mod.url})` (паттерн UnoCSS «в лоб») | ❌ | `mod.url` = `\0virtual:themeon.css`, не совпадает с ключом клиента → молчаливый no-op (проверено) |
| Ручной `js-update` с захардкоженным `/@id/__x00__…` | ⚠️ работает, но | дублирует внутреннюю нормализацию Vite (`wrapId`), хрупко к смене формата dev-URL. Годится только как fallback |
| `this.emitFile({type:'asset'})` ради реального файла | ❌ | build-only, в dev на диск ничего не кладёт (RAG) |

## 6. ВЕРДИКТ

### 6.1 Канонический канал подключения — `import` из JS, а не `@import` из CSS

**Единственный надёжный публичный контракт: `import 'virtual:themeon.css'` из JS/TS-энтри.**
Ровно так это документирует Vite (virtual modules) и ровно так — и только так — UnoCSS.

Что писать в README (три сценария):

- **Vite + JS-энтри (Quickstart):**
  ```ts
  // src/main.ts
  import 'virtual:themeon.css'
  import '@themeon/css/index.css'
  ```
  (доказано: build → CSS в бандле; dev → `<style data-vite-dev-id>`; HMR — см. 6.2)

- **Laravel + Vite:** импорт кладётся в **`resources/js/app.js`**, а не в `resources/css/app.css`:
  ```js
  // resources/js/app.js
  import 'virtual:themeon.css'
  ```
  Работает в обоих режимах Laravel (проверено по исходнику `Illuminate\Foundation\Vite`):
  в hot-режиме `@vite` отдаёт `<script type="module">` на JS-энтри → CSS инжектится клиентом Vite
  как `<style>`; в build-режиме Laravel эмитит `<link rel=stylesheet>` для CSS-чанков JS-энтри
  (`foreach ($chunk['css'] ?? [] as $css)`). `resources/css/app.css` при этом остаётся как есть —
  трогать его не нужно. **Строку `@import 'virtual:themeon.css';` из рецепта убрать полностью.**

- **Plain / vanilla:** то же самое — `import 'virtual:themeon.css'` в энтри-скрипте.
  Текущий рецепт (`import './style.css'`, где внутри `@import 'virtual:…'`) **падает** — убрать.

**Если CSS-first-подключение всё же нужно как продуктовая фича** (у части аудитории энтри — CSS,
напр. Laravel-проекты без JS-энтри), единственная надёжная форма — **реальный файл на диске**
(см. 6.3), а не virtual-модуль.

### 6.2 Каноническая форма HMR

**Тип апдейта: `js-update`** (не `css-update`). **Не отправлять его руками — вернуть модуль из
`hotUpdate` и дать Vite сформировать payload самому.** Это единственная форма, устойчивая к
`\0`-нормализации dev-URL, и она проверена в браузере на Vite 7.3.6 и 8.1.4.

Диф-уровень к `packages/vite/src/index.ts`:

```diff
 export function themeon(options: ThemeonViteOptions): Plugin {
   const V_ID = options.virtualId ?? 'virtual:themeon.css'
   const RESOLVED = `\0${V_ID}`
-  const tokensFiles = new Set((options.tokensFiles ?? []).map((f) => normalizePath(f)))
+  // D3: hotUpdate({file}) даёт АБСОЛЮТНЫЙ путь; относительные пути из README иначе не матчатся
+  let tokensFiles = new Set<string>()

   return {
     name: 'themeon',
+
+    configResolved(config) {
+      tokensFiles = new Set(
+        (options.tokensFiles ?? []).map((f) => normalizePath(path.resolve(config.root, f))),
+      )
+    },

     resolveId(id) { … },   // без изменений
     load(id) { … },        // без изменений

     hotUpdate({ file }) {
       if (!tokensFiles.has(normalizePath(file))) return undefined
       const mod = this.environment.moduleGraph.getModuleById(RESOLVED)
       if (!mod) return undefined
-      this.environment.moduleGraph.invalidateModule(mod)
-      this.environment.hot.send({
-        type: 'update',
-        updates: [
-          { type: 'css-update', path: mod.url, acceptedPath: mod.url, timestamp: Date.now() },
-        ],
-      })
-      return []
+      this.environment.moduleGraph.invalidateModule(mod)  // не обязателен, но безвреден и явен
+      // Vite сам пошлёт js-update с нормализованным path (/@id/__x00__…) и прогонит его
+      // через self-accepting CSS-обёртку → __vite__updateStyle → <style data-vite-dev-id>
+      return [mod]
     },
   }
 }
```

Почему это работает (dev-исходник виртуального модуля, снят с живого сервера):
```js
import.meta.hot = __vite__createHotContext("/@id/__x00__virtual:themeon.css");
const __vite__id = "\0virtual:themeon.css"
const __vite__css = "…"
__vite__updateStyle(__vite__id, __vite__css)
import.meta.hot.accept()          // ← модуль self-accepting: js-update по нему = перерисовка <style>
```

**Дополнительно (обязательно для рабочего HMR, D4):** тема не должна быть config-dependency.
README должен показывать фабрику, читающую файл темы в рантайме. Для `.ts`-темы проверено
рабочее решение на `jiti` (уже в каталоге репо, используется в `@themeon/cli`):

```ts
// vite.config.ts
import { createJiti } from 'jiti'
const jiti = () => createJiti(import.meta.url, { moduleCache: false, fsCache: false })

themeon({
  theme: async () => (await jiti().import('./theme.config.ts', {})).theme,
  tokensFiles: ['./theme.config.ts'],   // после фикса D3 относительный путь ОК
})
```
Проверено: два последовательных `jiti.import` с `moduleCache:false, fsCache:false` дают **свежий
CSS** после правки `.ts` на диске (native `import()` этого не даёт — ESM-кэш, ср. аудит #19).

> Рекомендация к рассмотрению в фазе ремедиации (механика проверена, API — решение фазы):
> ввести опцию `themeFile?: string` — плагин сам грузит файл через jiti с отключённым кэшем и сам
> кладёт его в `tokensFiles`. Это устраняет D3 и D4 **по построению** и убирает из README самый
> хрупкий кусок (ручную фабрику).

### 6.3 Опция «плагин пишет реальный файл» (`--out`-подобная)

**Да, даёт рабочий CSS-`@import` И рабочий HMR — из коробки.** Проверено (сценарии 7/8/9):
плагин пишет CSS в `<root>/.themeon/theme.css` на `buildStart` и переписывает его в `hotUpdate`
при изменении токенов; дальше **всё делает сам Vite** — его вотчер видит изменение реального файла,
находит CSS-модуль-импортёр в графе (postcss-import регистрирует зависимость) и шлёт
`hot updated: /src/style.css`. Плагину не нужно ни `hot.send`, ни знание про типы апдейтов.

Три формы (все проверены, build + dev + HMR, включая шейп README с двумя `@import`):
1. пользователь пишет `@import './.themeon/theme.css'` (честный путь);
2. `resolve.alias: { 'virtual:themeon.css': '<abs>/.themeon/theme.css' }` — **документированный
   синтаксис `@import 'virtual:themeon.css'` сохраняется** (alias участвует в CSS-резолве, т.к.
   `createIdResolver` включает `@rollup/plugin-alias`), 5 строк в `config()`-хуке;
3. `enforce:'pre'` transform, переписывающий спецификатор на путь к файлу (эквивалент (2), дороже).

**Цена:** артефакт в дереве проекта (нужен `.gitignore`), запись на диск на каждый save, файл должен
существовать до первого CSS-резолва (проверено: `buildStart` успевает — холодный build с нуля
зелёный), HMR на «шаг длиннее» (write → watcher → update). **Надёжность — высокая**, механика
целиком штатная (обычный файл в графе Vite), в отличие от virtual-модуля, где мы сами воспроизводим
внутренности HMR-протокола.

**Итоговая рекомендация:** канон — virtual-модуль + `import` из JS (6.1/6.2). Эмит реального файла —
**не замена, а дополнительная опция** для CSS-first-проектов (Laravel без JS-энтри) и для отдачи
темы отдельным `<link>`; вводить её осознанно, с `alias`-формой (2), чтобы публичный синтаксис
`@import 'virtual:themeon.css'` из README остался валидным.

## 7. Обязательные интеграционные тесты (настоящая труба)

Юнит-тесты на моках `environment.hot.send` **не ловят ни один из D1–D3** — их надо дополнить
(не заменить) тестами через реальные `build()` / `createServer()`. Все перечисленные **падают на
текущем коде и зеленеют после фикса** (проверено вручную соответствующими вариантами).

Фикстура: `packages/vite/test/fixtures/basic/` (index.html + `src/main.ts` + `theme.config.ts`).

| # | Тест | Труба | Красный ДО фикса | Зелёный ПОСЛЕ |
|:--|:--|:--|:--|:--|
| T1 | `import 'virtual:themeon.css'` из JS-энтри → в выходном CSS есть `@layer themeon.tokens` и `--color-*` | `await build({…})`, читать `dist/assets/*.css` | — (уже зелёный; регрессионный якорь канала) | ✅ |
| T2 | HMR: `createServer()` + `transformRequest('/@id/__x00__virtual:themeon.css')`, подписка на HMR-сокет (`new WebSocket(url, 'vite-hmr')`), правка `theme.config.ts` → **приходит `{type:'update', updates:[{type:'js-update', path:'/@id/__x00__virtual:themeon.css'}]}`** | реальный dev-сервер + ws | ❌ приходит `css-update` с `path:'\0virtual:themeon.css'` | ✅ |
| T3 | HMR-эффект: повторный `transformRequest` виртуального модуля **после** правки отдаёт CSS с новым значением токена (модуль инвалидирован, `load` вызван заново) | реальный dev-сервер | ❌/⚠️ (зависит от D3: hook не срабатывает вовсе) | ✅ |
| T4 | **D3-регрессия:** `tokensFiles: ['./theme.config.ts']` (относительный путь!) — hotUpdate срабатывает | реальный dev-сервер | ❌ no-op | ✅ |
| T5 | `tokensFiles` не содержит изменённый файл → **никаких** сообщений в сокет | реальный dev-сервер | ✅ | ✅ |
| T6 | (если принята опция реального файла) `@import 'virtual:themeon.css'` в CSS-энтри **вместе с** вторым `@import` → build зелёный, в бандле есть **и токены, и содержимое второго импорта** | `build()` | ❌ ENOENT | ✅ |
| T7 | Анти-регресс на «тихую потерю»: в выходном CSS присутствует маркер из второго `@import` (защита от инлайн-варианта, который его выбрасывает) | `build()` | — | ✅ |

Опционально (дороже, но именно оно ловит класс «сообщение ушло, эффект не наступил»): E2E с
headless-браузером — навигация, правка токенов, проверка `getComputedStyle(...).getPropertyValue`
без перезагрузки. Референс-харнесс уже написан: `exp2-dev.mjs` + `cdp.mjs` (CDP на нативном
`WebSocket` Node 24, ноль зависимостей) — переносится в `packages/vite/test/` как есть.

## 8. RAG (все обращения — 2026-07-14)

| Факт | Источник | Тип |
|:--|:--|:--|
| Конвенция virtual-модулей: публичный `virtual:`, внутренний `\0`; в dev кодируется как `/@id/__x00__{id}`; потребительский контракт в доке — **только JS-`import`** | https://vite.dev/guide/api-plugin.html | офиц. дока |
| `vite:css` даёт postcss-import собственный `resolve()` (→ `path.resolve`, ФС) и `load()` (`fs.readFile`) — плагинные `resolveId`/`load` не участвуют | https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/css.ts | исходник |
| `atImportResolvers` строится через `createIdResolver` — мини-контейнер из `@rollup/plugin-alias` + `oxcResolvePlugin`, без пользовательских плагинов (⇒ **alias из CSS работает**, virtual-id — нет) | https://github.com/vitejs/vite/blob/main/packages/vite/src/node/idResolver.ts | исходник |
| «Virtual-модули в CSS не резолвятся»: ответ мейнтейнера Tailwind («we don't consult the Vite module resolution when resolving imports») | https://github.com/tailwindlabs/tailwindcss/discussions/15167 | обсуждение |
| UnoCSS: `virtual:uno.css` официально подключается **только** JS-импортом; запрос на CSS/URL-форму закрыт, альтернатива — генерить физический CSS | https://unocss.dev/integrations/vite · https://github.com/unocss/unocss/issues/3853 | дока + issue |
| Клиент Vite: `css-update` — «only sent when a css file referenced with `<link>` is updated»; при отсутствии `<link>` — `if (!el) return` | https://github.com/vitejs/vite/blob/main/packages/vite/src/client/client.ts (ground truth в репо: `vite@8.1.4/dist/client/client.mjs:967-971`) | исходник |
| Тип узла графа: `this.type = isDirectCSSRequest(url) ? 'css' : 'js'` ⇒ CSS из JS-графа = `js` ⇒ `js-update` | https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/moduleGraph.ts | исходник |
| CSS-модуль в dev — self-accepting JS-обёртка (`__vite__updateStyle` + `import.meta.hot.accept()`), обновляет `<style data-vite-dev-id>` | https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/css.ts | исходник |
| `hotUpdate`: возврат `undefined` — дефолтная обработка; массив — сузить/заменить набор модулей; `[]` → `if (!options.modules.length) return` (Vite не пошлёт ничего сам) | https://vite.dev/changes/hotupdate-hook · https://vite.dev/guide/api-environment-plugins.html · `vite/src/node/server/hmr.ts` | дока + исходник |
| UnoCSS шлёт `js-update` (`sendUpdate()`), а не `css-update`; `invalidateModule` лишь помечает модуль грязным | https://github.com/unocss/unocss/blob/main/packages-integrations/vite/src/modes/global/dev.ts | исходник |
| Laravel: в hot-режиме тег выбирается по расширению (`isCssPath` → `<link>`, иначе `<script type=module>`); в build-режиме для CSS-чанков JS-энтри эмитятся `<link rel=stylesheet>` (`foreach ($chunk['css'] ?? …)`) | https://raw.githubusercontent.com/laravel/framework/12.x/src/Illuminate/Foundation/Vite.php | исходник |
| `this.emitFile({type:'asset'})` — build-only, в dev на диск не пишет | https://vite.dev/guide/api-plugin.html (rollup hooks) | дока |
| ⚠️ Открытый баг Vite 8.1.x: `experimental.bundledDev: true` ломает резолв virtual-модулей (в репорте назван UnoCSS) | https://github.com/vitejs/vite/issues/22864 | issue (открыт 2026-07-06) |

## 9. Остаточные риски

1. **`injectFouc` в Laravel** — `transformIndexHtml` в классическом Laravel не вызывается (Blade, не
   `index.html`). README это оговаривает, но опция всё равно выглядит рабочей в конфиге. Отдельный
   вопрос фазы (не входит в D1–D3).
2. **`experimental.bundledDev`** (Vite 8.1.x) ломает virtual-модули — открытый апстрим-баг. Если
   пользователь включит его, канон 6.1/6.2 сломается **не по нашей вине**; стоит упомянуть в README
   или прикрыть тестом.
3. **Двойной инстанс `@themeon/core`** — наткнулся случайно на фикстуре: если core попадает в граф
   дважды (напр. плагин собран так, что core заинлайнен), `resolveTheme` тихо отдаёт **пустой CSS**
   (только `color-scheme`), без единой ошибки. Для монорепо/линковки это реальный риск тихой
   деградации; стоит проверить отдельно (вне скоупа P8-канала).
4. **Порядок каскада при опции реального файла**: `@import` реального файла и `@layer`-порядок
   проверены только на минимальной теме; при интеграции с `@themeon/css/index.css` порядок слоёв
   надо проверить на пилоте.
5. Debounce не проверялся: один save = один `hotUpdate`. При «шумных» вотчерах (IDE, autosave)
   возможен всплеск апдейтов — UnoCSS дебонсит (10 мс).
