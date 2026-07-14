# HANDOFF — 2026-07-14 — after P8.4

**Next:** Исполнить **P8.5 — `@themeon/colors`: шкала — фиксированный ramp, chroma-cap, валидация
seed'а** (пятый item фазы P8, первый из двух colors-items — colors идёт ПЕРЕД css/naive/cli, т.к.
они потребляют её числа). ТЗ детерминировано `findings/P8-colors-*.md`. После коммита —
ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | Зафиксировать ramp-шкалу colors (не плавающий алгоритм), chroma-cap на выходе из gamut, валидацию seed'а (fail-loud на невалидный OKLCH) |

```
/task:plan-exec 2026.07.12-BASE P8.5
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.5** целиком.
2. Findings-файл(ы) P8.5 (см. `phases/P8.md` P8.5 Required Reads — не читаны в этой сессии).
3. `plans/2026.07.12-BASE/plan.md` — §3 Routing (строка P8.1–P8.14), §5 Decision Log, §4 Status Board.
4. `packages/colors/src/scale.ts` (текущий код).

**Done:** (эта сессия)

- **P8.4 закрыт 🟢 Done.** `@themeon/nuxt`: `loadTheme` переведён с `importModule` (`@nuxt/kit`) на
  `createJiti(url, { moduleCache:false, fsCache:false, alias, interopDefault:false })` —
  `packages/nuxt/src/internal/theme-loader.ts` (новый). Blocker §0 (`themeon.theme` не грузился
  НИКОГДА — mlly `interopDefault` терял `default` замороженного `defineTheme` через
  `Object.defineProperty` в глотающем `try/catch`) устранён; обе формы экспорта
  (`export default`/`export const theme`/`defaultTheme`) поддержаны и покрыты тестами.
  `interopDefault: false` — сверх буквального эталона findings: живой прогон вне vitest показал,
  что дефолтный `interopDefault:true` синтезирует `mod.default` как self-reference на весь
  namespace при отсутствии реального default export, что тихо ломало fail-loud инвариант фазы
  (Rule 4) — закрыто регресс-тестом.
- `packages/nuxt/src/internal/watch-target.ts` (новый): `resolveWatchTarget` (directory/file режим,
  никогда не rootDir/srcDir, throw при tokensDir=rootDir/srcDir или содержащем buildDir) +
  `isWithinWatchTarget` (сиблинг-directory guard, добавлен по находке ревью).
- `packages/nuxt/src/module.ts`: дедуп регенерации по СГЕНЕРИРОВАННОМУ CSS (`cachedCss`), не по
  хэшу директории. `packages/nuxt/src/internal/hash-dir.ts`+`hash-dir.test.ts` удалены (Major #20).
- `packages/nuxt/package.json`: `jiti` (catalog `2.7.0`) в `dependencies`.
- `packages/nuxt/README.md`/`types.ts`: убраны упоминания hashDir/D13, описан rootDir-caveat
  (полный рестарт вместо CSS-HMR).
- `apps/playground/theme/theme.config.ts` (новый) + `nuxt.config.ts`/`package.json`: playground
  впервые реально исполняет ветку codegen (`themeon.theme`), которая до этого item'а не
  исполнялась НИ РАЗУ ни на одном живом `nuxt dev`. Тема дублирует `base.color`-дерево
  `packages/css/src/theme/default.ts` литералами (другой accent-seed) — НЕ импорт из
  `@themeon/css` (не публичный экспорт пакета, вне Scope P8.4).
- Тесты: `theme-loader.test.ts` (6, T2), `watch-target.test.ts` (18, T3, включая
  `isWithinWatchTarget`), `tests/integration/src/e2e/nuxt-theme-hmr.test.ts` (T1: живой `nuxt dev`
  на `export default`, правка entry И правка ИМПОРТИРУЕМОГО файла → CSS меняется).
- **Red-before-fix доказан**: старый `module.ts`+`hash-dir.ts` временно восстановлены (`git show
  HEAD:...`), пересборка, `nuxt-theme-hmr.test.ts` падал на старте (Blocker §0) — откат к фиксу
  вернул зелёный.
- Ручной смок: реальный `pnpm dev` на `apps/playground`, правка accent-seed темы →
  `.nuxt/themeon-tokens.css` обновился в пределах ~1с, `page reload` в логе dev-сервера, БЕЗ
  ручного рестарта.
- Валидация (все зелёные): `pnpm build && pnpm lint && pnpm typecheck && pnpm test` (903 unit) `&&
  pnpm --filter tests-integration exec vitest run --project int-e2e` (2/2).
- **Adversarial-review (opus/xhigh) по коммиту `8481e9e`**: 5 находок (0 Blocker/Critical,
  2 Low-Medium, 3 Low). 2 устранены коммитом `d81d8a3` (`resolveWatchTarget` отклоняет
  `tokensDir===srcDir`, не только rootDir; сиблинг-directory вынесена в тестируемый
  `isWithinWatchTarget`). 3 в Known Deviations `phases/P8.md` P8.4: (1) e2e-тест доказывает
  обновление CSS, но не различает granular-HMR от полного рестарта — ревьюер независимо
  подтвердил ПО КОДУ Nuxt, что рантайм корректен, это пробел покрытия, не баг; (2) CJS-темы
  (`module.exports=`) недокументированно неподдерживаемы (падают fail-loud корректно); (3)
  до-существующая гонка двух `builder:watch`-событий подряд — не регрессия этого item'а.

**Remaining:**

1. **P8.5–P8.14** — 10 items, порядок: P8.5/P8.6 (colors) → P8.7 (css) → P8.8/P8.9 (naive) →
   P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI) → P8.14 (research + финальная сверка). Каждый —
   `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh) по коммиту.
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца 2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (4 яруса: `src/fast`, `src/browser`, `src/e2e`); `pnpm
  test:int`/`test:int:slow` не идут в `pnpm test` (отдельные команды).
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `d81d8a3`), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.

**Open risks:**

- Прочие риски фазы (Naive dark APCA, `textMuted` запас над floor'ом) — без изменений, см.
  `phases/P8.md`.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.
- P8.4 Known Deviations (см. Done выше) — e2e-покрытие granular-vs-restart, CJS-темы, watch-race
  класс — не регрессии, но не закрыты кодом.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation, подтверждено ещё раз в P8.4: процесс не пишет в stdout/stderr в этой
  среде) — специфика этой среды исполнения, пересмотреть при переносе в CI.
- **deferred:** `dispose()` у `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на
  английский (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient` (в P8 — `$extensions`-
  мост); `@themeon/vite`: двойной инстанс core; `experimental.bundledDev` (Vite 8.1.x, открытый
  апстрим-баг); CJS-тем поддержка/документация (P8.4 review finding); e2e granular-vs-restart
  различение (P8.4 review finding, потребовало бы server-route маркера в фикстуре).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
