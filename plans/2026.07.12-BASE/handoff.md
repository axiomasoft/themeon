# HANDOFF — 2026-07-14 — after P8.10

**Next:** Исполнить **P8.11 — `@themeon/core`: DTCG-эмит по спеке 2025.10**
(одиннадцатый item фазы). ТЗ детерминировано `findings/P8-dtcg-2025-10-canon.md` §1–§6, §9
(нормативные цитаты, эмпирика, канон, zero-dep конвертер, проверка сторонним валидатором, контракт,
обязательные тесты) + `phases/P8.md` P8.11 целиком. После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review
(opus, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | `packages/core/src/dtcg/color.ts`: парсер `hsl()`/`lab()`/`lch()`/`oklab()`/именованных цветов + zero-dep OKLCH→sRGB→hex конвертер с gamut-mapping (CSS Color 4), БЕЗ `colorjs.io` (D2/D12 core zero-dep). `packages/core/src/dtcg/to-dtcg.ts`: `dimension` только `px`/`rem` (прочее — warning + `$extensions`-мост); `cubicBezier` — массив из 4 чисел (таблица именованных кривых), не строка; `typography` эмитится ТОЛЬКО при всех 5 полях темы, иначе примитивы + мост; `shadow`/`gradient` — `$extensions`-мост (структурный эмит вне скоупа, P7); имена с точкой экранируются (`space["1-5"]`) + мост на оригинальный путь; resolver — убрать жёсткий ключ `light`. Публичный контракт `toDTCG(theme) → { files, warnings }` можно ломать свободно (P-D53), но `api.test.ts` обновить в ЭТОМ ЖЕ item'е. Обязательный тест: round-trip дефолт-темы через `@terrazzo/parser@2.4.0` (devDep) → 0 ошибок валидатора — вердикт «валидно» даёт СТОРОННИЙ инструмент, не наш ассерт. Naming-движок (`space['1.5']` → `--spacing-1-5`) не трогать. |

```
/task:plan-exec 2026.07.12-BASE P8.11
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.11** целиком.
2. `plans/2026.07.12-BASE/findings/P8-dtcg-2025-10-canon.md` §1–§6, §9 (цитаты спеки, эмпирика через
   `@terrazzo/parser`, канон эмита, zero-dep конвертер, тесты).
3. `packages/core/src/dtcg/to-dtcg.ts` + `packages/core/src/dtcg/color.ts` (текущий код).
4. `90_audit/AUDIT_2026-07-14_research-conformance.md` §«### 6»–«### 11», §«### 24», §«### 25».
5. `packages/core/src/api.test.ts` (freeze — обновляется в этом же item'е).
6. `plans/2026.07.12-BASE/plan.md` — §3 Routing, §5 Decision Log (P-D53 — свободная ломка контракта;
   D2/D12 — core zero-dep).

**Done:** (эта сессия)

- **P8.10 закрыт 🟢 Done.** `@themeon/vue`: `state.ts` — единый `isClient()` (`window` И `document`)
  + отдельная проверка наличия ФУНКЦИИ `matchMedia` (Major #17, jsdom её не реализует вовсе);
  `getTarget` возвращает `null` вне клиента, `applyOne` терпит `null`-таргет тихим no-op;
  `initialized = true` перенесён в конец `init()` — ТОЛЬКО после успешного `apply()` (было: до
  первого обращения к `matchMedia`, поэтому бросающий seam травил флаг навсегда). Новый
  `packages/vue/src/global-extensions.ts` (`.ts`, `export {}`) аугментирует
  `ComponentCustomProperties.$theme` (Minor #27, канон Pinia), реэкспорт из `index.ts` — runtime-
  экспортов не добавляет, `api.test.ts` не менялся.
  Тесты (findings §5, T4–T6): `packages/vue/src/state.test.ts` (jsdom БЕЗ matchMedia-шима),
  `packages/vue/src/state.ssr.test.ts` (SSR/node-env), `tests/integration/src/fast/
  vue-typecheck.test.ts` + фикстура `tests/integration/fixtures/vue-consumer/` (реальный
  `vue-tsc@3.1.4` на собранном `dist/index.d.ts` — exit 0; red-before-fix подтверждён откатом
  `index.ts`-реэкспорта, воспроизвёл ровно `TS2339 ×2` из аудита #27). Новые devDeps:
  `jsdom@29.1.1` (`packages/vue`), `vue-tsc@3.1.4` (`tests/integration`). Коммит `b009289`.
- Валидация (все зелёные, до ревью): `pnpm build && pnpm test` — 1172 unit (47 файлов); `pnpm
  test:int` (int-fast+int-browser) — 42 теста (13 файлов); `pnpm typecheck && pnpm lint` — чисто;
  `parity.test.ts` — 361 кейс.
- **Adversarial-review (opus) по коммиту `b009289`**: 1 Minor + 2 Nit. Minor устранён коммитом
  `24cdd40`: перенос флага `initialized` в конец `init()` открыл окно, где повторный `init()` после
  throw В `apply()` (кастомный `target`-seam, `applyTheme`/`clearTheme` ядра на `runtimeVars`) заново
  вызывал `getMedia()` — дефолтный seam отдаёт свежий `MediaQueryList` на каждый вызов, ранняя
  подписка на `change` оставляла бы осиротевший MQL живым слушателем (дублирующие записи
  `system.value` + утечка); подписка на `change` перенесена ПОСЛЕ успешного `apply()`. 2 Nit без
  правок кода (асимметрия гейтов `withoutTransition`/`applyOne`; формулировка Deliverables про
  `api.test.ts`, который на деле не нуждался в правке).
  Финальная валидация (все зелёные): `pnpm build && pnpm test -- vue` (422), `pnpm typecheck` (vue),
  `pnpm test:int` int-fast+int-browser (42), `pnpm lint`.

**Remaining:**

1. **P8.11–P8.14** — 4 items, порядок: P8.11/P8.12 (DTCG эмит/импорт) → P8.13 (CLI: SSOT-потребление
   + исключения скана) → P8.14 (research + финальная сверка фазы).
   Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh).
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца
   2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (4 яруса: `src/fast`, `src/browser`, `src/e2e`); `pnpm
  test:int`/`test:int:slow` не идут в `pnpm test` (отдельные команды). Новый devDep
  `tests/integration/package.json`: `vue-tsc@3.1.4` (P8.10, для T6 CI-гейта typecheck-на-dist).
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `24cdd40`), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.
- `@themeon/vue` — новый публичный подпуть-независимый файл `global-extensions.ts` реэкспортируется
  из `index.ts`; аугментация `ComponentCustomProperties.$theme` присутствует в `dist/index.d.ts`,
  отсутствует в `dist/anti-fouc.d.ts` (pure-подпуть чист) — регрессия сюда = повтор Minor #27.
  `packages/vue/src/state.ts`: подписка на `matchMedia`-`change` ОБЯЗАНА идти ПОСЛЕ успешного
  `apply()` в `init()` (P8.10 review-фикс `24cdd40`) — перенос её раньше воскрешает leak-находку.
- `@themeon/colors` экспортирует `STEP10_DELTA` (P8.9, публичный, `scale.ts`).
- `packages/core/src/errors.ts` несёт `ThemeonErrorCode` с `'BAD_COLOR'` (P8.8) — публичный
  тип-only экспорт.
- Changesets (`@themeon/naive`+`@themeon/core` P8.8; naive-деривация P8.9) ещё не зарелижены (репо
  не в npm, P-D53) — P8.10 не заводила отдельный changeset (та же логика: репо не в npm).

**Open risks:**

- Тонкий APCA-запас (0.9–1.7 Lc) против `--color-bg-subtle` у пар `focusRing`/`link` в дефолт-теме
  (P8.7 review finding) — сдвиг нейтральной/акцентной шкалы `@themeon/colors` может увести их в FAIL;
  гейт fail-closed поймает на сборке, не сформирован как отдельный item.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.
- P8.9 остаточный риск §3.5 (findings): в dark лестница `base→hover→pressed` идёт вверх по L ⇒
  контраст белых чернил падает 75.6→69.0→62.0 — порог `text` (60) держится, `body` (75) нет.
  Неизбежно при Radix-направлении и белых чернилах, не баг реализации.
- P8.9 Known Deviation: для пути «чистая деривация» (без явного theme-hover, статусные роли на
  дефолт-seed'е) реальная ΔL(hover,pressed) в light ≈0.0274 — ниже буквального 0.03 из findings
  §3.4/старого текста плана (числа предшествуют коррекции P8.5 `STEP10_DELTA`). Не редеривация
  константы (P8.5 закрыта, Scope Excluded) — честно задокументированный остаточный разрыв.
- P8.10: `$theme` в `ComponentCustomProperties` — глобальная аугментация; потребитель, импортирующий
  `@themeon/vue`, но НЕ ставящий плагин, получит `$theme` типизированным (компилируется), но
  `undefined` в рантайме (findings §4, «Протечка» — неустранимо структурно, тот же паттерн у
  `$pinia`/`$router`, принято как остаточный риск).

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation) — специфика этой среды исполнения, пересмотреть при переносе в CI.
- **deferred:** дубль таблицы пар в CLI `checks/contrast.ts` (→ P8.13); `dispose()` у
  `UseThemeReturn` (P3.8, повторно deferred в P8.10 Scope Excluded); перевод русских JSDoc
  публичных типов на английский (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient`
  (в P8 — `$extensions`-мост, P8.11 Scope Excluded, структура — P7); `@themeon/vite`: двойной
  инстанс core; `experimental.bundledDev` (Vite 8.1.x, открытый апстрим-баг); CJS-тем поддержка/
  документация (P8.4 review finding); e2e granular-vs-restart различение (P8.4 review finding);
  тонкий APCA-запас против `bg-subtle` (P8.7 review finding, см. Open risks); «жёлтая полоса»
  APCA для warning-заливок (P8.8, findings §4.2 — Q владельцу); стале ΔL-числа в
  `findings/P8-naive-color-canon.md` §3.4 (P8.9 — правка входит в P8.14).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
