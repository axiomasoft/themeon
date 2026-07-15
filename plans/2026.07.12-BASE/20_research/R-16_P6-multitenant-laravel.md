# R-16 — P6: multi-tenant `serializeThemePatch`, Laravel-канал, CSS-инъекция

**Дата:** 2026-07-15 · **Стадия:** design P6 (opus/xhigh) · **Метод:** RAG (perplexity-web),
сверено с repo-фактами (`packages/core`, `packages/colors`, `packages/css`, `packages/vite`).
Углубление R-07 §5 (multi-tenant) под конкретику фазы P6. Вход дизайна `phases/P6.md`.

Три несущих внешних факта фазы. Каждый вердикт несёт RAG-маркер.

---

## §1. Laravel + Vite: `@import "@themeon/css/tokens.css"` в `resources/css/app.css`

**Вопрос:** резолвит ли Vite (через laravel-vite-plugin) bare-спецификатор пакета в CSS
`@import`, и работает ли это на билде, а не только в dev?

**Вердикт: ДА — рецепт master §4.8 валиден для СТАТИК-канала дефолт-темы.**
`RAG:✅ 2026-07-15 perplexity → laravel.com/docs/13.x/vite + Vite CSS docs.`

- Vite обрабатывает CSS `@import` через `postcss-import`; импортированный CSS инлайнится и
  бандлится в прод-сборку (не dev-only трюк). laravel-vite-plugin ничего в CSS-резолве не
  меняет — он лишь указывает Vite на entry (`resources/css/app.css` и/или `resources/js/app.js`)
  и отдаёт версионированные ассеты через `@vite(...)`.
- **Критический нюанс:** bare-спецификатор резолвится, ТОЛЬКО если пакет открывает подпуть через
  `exports`-метаданные. `@themeon/css` **открывает** `"./tokens.css": "./dist/tokens.css"`
  (repo-факт: `packages/css/package.json` exports) → резолв проходит. Если бы подпуть был скрыт —
  `@import` упал бы, хотя файл физически есть. **Это load-bearing:** интеграционный тест P6.4
  обязан гонять реальный `vite build`, а не мокать резолв (класс дефекта P8 Blocker #1 — мок
  границы прятал именно резолв-провал).

**Различение двух Laravel-каналов (master §4.8 их СМЕШИВАЕТ — дизайн P6 обязан развести):**

| Канал | Что | Как подключается | Статус |
|:--|:--|:--|:--|
| **A. Статик дефолт-тема** | `@themeon/css/tokens.css` — РЕАЛЬНЫЙ пре-собранный файл пакета | `@import "@themeon/css/tokens.css"` в `app.css` (постcss-import) **работает** | новый рецепт P6.4 |
| **B. Кастом-тема** | `virtual:themeon.css` — виртуальный модуль плагина `@themeon/vite` из TS-токенов | ТОЛЬКО JS-import `import 'virtual:themeon.css'` — CSS `@import` **никогда не работает** | уже задокументирован (P3/P8, `packages/vite/README.md`) — P6.4 КРОСС-ЛИНКует, не переписывает |
| **C. Pure Blade, без JS-entry** | тот же виртуальный модуль | опция `cssImport` плагина `@themeon/vite` | уже в vite README «CSS-only projects» |

Предупреждение vite README «do not use CSS `@import`» относится ИСКЛЮЧИТЕЛЬНО к каналу B
(`virtual:themeon.css`), НЕ к каналу A (`@themeon/css/tokens.css` — статик-файл). Дизайн P6.4
обязан это явно проговорить, иначе рецепт A читается как противоречащий существующей доке.

- Анти-FOUC в Laravel: `transformIndexHtml` НЕ срабатывает на Blade-шаблонах (нет `index.html`) —
  инлайнить `themeInitScript()` из `@themeon/vue/anti-fouc` руками в Blade-layout (repo-факт:
  vite README §Laravel уже это описывает).

---

## §2. CSS-инъекция / stored-XSS при серверной инъекции tenant-значений в `<style>`

**Вопрос:** какие последовательности опасны при инъекции tenant-контролируемых значений в
инлайн-`<style>` в `<head>`, и какова каноническая защита? (H3 final-audit — подтверждённая
дизайн-дыра класса stored-XSS ровно здесь.)

**Вердикт: структурный контроль + per-type allowlist-грамматика (positive validation) +
контекст-кодирование. HTML-кодирование ВНУТРИ `<style>` недостаточно.**
`RAG:✅ 2026-07-15 perplexity → OWASP WSTG 4.11.5 (Testing for CSS Injection) + OWASP A05:2025
Injection + XSS Prevention Cheat Sheet.`

**Модель угроз (классы, каждый обязан быть закрыт грамматикой):**
1. `</style>` — выход в HTML-контекст → произвольная разметка/JS (stored XSS). Внутри `<style>`
   `&lt;` декодируется ДО CSS-парсера — HTML-энкодинг не спасает; закрывается запретом `<`/`>`.
2. `}` / `;` / `{` — терминация свойства/правила → дописать новые свойства/селекторы.
3. `url(...)` — эксфильтрация данных на удалённый endpoint (CSS Exfil); **не строить `url()` из
   tenant-ввода вообще**.
4. `@import` и прочие at-rules — подтяжка внешних стилей / обход CSP.
5. `expression()` / `behavior:` — легаси-IE, но в консервативной модели остаются.
6. Attribute-selector exfil (`input[value^=X]`), keyframe-таймеры — закрываются тем же запретом
   структурных символов в значениях.
7. `/* */` — комментарии (маскировка).

**Каноническая защита (OWASP positive validation):**
- **Структурный контроль:** сервер владеет ВСЕМ `<style>`-блоком; tenant заполняет ТОЛЬКО слоты
  значений в `:root { --token: {{value}}; }`. Tenant НИКОГДА не контролирует селекторы, имена
  свойств, скобки, `;`, at-rules. Это конструктивно убирает классы 1,2,4.
- **Per-type allowlist-грамматика** на каждое значение (не блоклист — **allowlist**):
  color → hex/rgb/rgba/oklch/hsl/hwb/lab/lch/named-allowlist; dimension → `N<unit>` с
  ограниченным диапазоном/точностью; enum → закрытое множество (`light|dark`). Всё, что не
  матчится грамматикой — reject (или safe-default), не escape.
- **Запрет метасимволов в значениях:** `{ } ; : @ < > ( ) url` кавычки `\` перевод строки `/*`.
  При allowlist-грамматике они просто не матчатся.
- **Кодирование остатка:** для свободного текста (напр. font-family) — CSS-escape `\`/кавычек/
  control-chars; но проще reject всего, что вне `[\w \-]` + одинарные кавычки, comma-separated.

**Проекция на repo-примитивы (переиспользуется, не изобретается):**
- `packages/core/src/serialize.ts::assertSafeCssToken` — уже reject `{`/`}` (+`*/` по errors.ts),
  документированно «на пути к tenant P6». P6.1 расширяет до полного набора метасимволов + значений.
- `packages/core/src/dtcg/color.ts::parseColor` — zero-dep positive-валидатор цвета (14 нотаций;
  `var()`/`color-mix()`/мусор → `null` → reject). Defense-in-depth: reject метасимволов ДО parseColor.
- `packages/cli/src/checks/hardcode.ts` — образцы грамматик (`HEX_RE`, `PX_RE`, `COLOR_FN_RE`).
- **Сужение поверхности (дизайн-решение P6, D-лог):** tenant-патч v1 допускает ТОЛЬКО
  {color, dimension(space/radius/tracking/leading), number(z/fontWeight), duration, fontFamily,
  text}. Типы {shadow, gradient, cubicBezier} — свободно-форменные CSS-строки (высший риск) —
  **запрещены** в tenant-патче v1 (остаются operator-controlled). Схема их исключает,
  `applyThemePatch` их бросает (`UNSUPPORTED_TENANT_TYPE`).

---

## §3. APCA-гейт публикации (fail-closed) — переиспользование `@themeon/colors`

**Вердикт: механика гейта УЖЕ ЕСТЬ в `@themeon/colors`, fail-closed по построению — P6.3 её
композирует, нового цвет-кода не пишет.** `RAG:— (repo-grounded: packages/colors/src/contrast.ts).`

- `checkThemeContrast(lookup)` — прогоняет `SEMANTIC_CONTRAST_PAIRS` по плоскому словарю
  `varName→value` одной темы; `pass = ВСЕ пары прошли`; непарсибельная пара **бросает**
  (fail-closed), не skip; `flattenAlpha` fail-closed на альфе без base (Major #15 P8 уже
  исправлен — тёмные темы больше не композитятся на безусловный белый).
- **Гейт публикации P6.3 = композиция, не новый пакет-экспорт** (сохраняет zero-dep core +
  независимость colors): `core.applyThemePatch(base,patch)` → валидированный `{vars}` →
  `{...base.vars, ...patchVars}` → `colors.checkThemeContrast(lookup)`; `!pass` → БЛОКИРУЕТ
  публикацию. Зависит от обоих пакетов → живёт в **CLI** (`themeon check --tenant`), fail-closed
  для CI; Node-консьюмер композирует те же два публичных вызова сам (демонстрирует пример P6.5).

**Fail-closed семантика (H3 требование):** гейт БЛОКИРУЕТ при (а) любом throw валидации значения,
(б) любом throw парсинга цвета в APCA, (в) `pass===false`. Нет пути «ошибка → пропустить».

---

## Источники

- Laravel Vite: <https://laravel.com/docs/13.x/vite> · Vite CSS `@import` (postcss-import).
- OWASP WSTG 4.11.5 Testing for CSS Injection:
  <https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/05-Testing_for_CSS_Injection>
- OWASP A05:2025 Injection · XSS Prevention Cheat Sheet (context-aware output encoding).
- Repo: `packages/css/package.json` (exports `./tokens.css`), `packages/vite/README.md`
  (каналы B/C), `packages/core/src/{serialize.ts,dtcg/color.ts}`,
  `packages/colors/src/contrast.ts`, `packages/cli/src/checks/hardcode.ts`.
