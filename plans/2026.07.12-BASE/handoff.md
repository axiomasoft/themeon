# HANDOFF — 2026-07-14 — after P8.9

**Next:** Исполнить **P8.10 — `@themeon/vue`: client-гейтинг и типизация `$theme`**
(десятый item фазы). ТЗ детерминировано `findings/P8-nuxt-vue-runtime.md` §3 (канон гейтинга,
VueUse-эталон, воспроизведение), §4 (канон аугментации типов) + `phases/P8.md` P8.10 целиком.
После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | `packages/vue/src/state.ts`: единый `isClient` (`window` И `document`) + отдельная проверка наличия функции `matchMedia` (в jsdom `window` есть, `matchMedia` нет); стаб `{matches:false}`; `applyOne` терпит `null`-таргет; `initialized=true` — ТОЛЬКО после успешного прохода (сейчас выставляется ДО броска — бросающий seam травит флаг навсегда). Новый `packages/vue/src/global-extensions.ts` (`.ts`, не `.d.ts`, обязателен `export {}`) — аугментация `ComponentCustomProperties.$theme`, эталон — Pinia; реэкспорт из `index.ts`. Тесты: jsdom БЕЗ шима `matchMedia` (init должен работать без него); SSR-окружение (no-op, не throw); идемпотентность после broken seam; `vue-tsc --noEmit` на минимальном потребителе, собранном из `dist`. Rule 1 (`plan.md` P-D49) неприкосновенна: `preference`/`theme`/`system`-контракт не трогать. |

```
/task:plan-exec 2026.07.12-BASE P8.10
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.10** целиком.
2. `plans/2026.07.12-BASE/findings/P8-nuxt-vue-runtime.md` §3 (канон гейтинга, воспроизведение бага
   на jsdom без шима), §4 (канон аугментации, проверка на СОБРАННОМ `dist/index.d.ts`), §5 (тесты
   T4–T6).
3. `packages/vue/src/state.ts` (текущий код — три незащищённых глобала).
4. `90_audit/AUDIT_2026-07-14_research-conformance.md` §«### 17», §«### 27».
5. `packages/vue/src/parity.test.ts` (P3.8 инвариант — обязан остаться зелёным после правки).
6. `plans/2026.07.12-BASE/plan.md` — §3 Routing, §5 Decision Log (P-D49 — что именно нельзя трогать).

**Done:** (эта сессия)

- **P8.9 закрыт 🟢 Done.** `@themeon/naive`: `deriveInteractionStates` переписан под канон §3.3
  (findings/P8-naive-color-canon.md) — приоритет явной роли темы (`<base>-hover/-pressed/-suppl`)
  над деривацией; без неё `hover = base + Δ(appearance)`, `pressed` = экстраполяция вектора
  `base→hover` (OKLCH L/C линейно, H кратчайшей дугой, k=2) при явном hover, иначе `base + 2·Δ`;
  `suppl = base` (identity). `STEP10_DELTA` — новый публичный экспорт `@themeon/colors`
  (`{light:-0.03, dark:+0.041}`, читается из `RAMP` шкалы, не дублируется вторым числом);
  `@themeon/naive` получил `@themeon/colors` в deps. `common-map.ts`: `DERIVABLE_BASES` теперь
  несёт явные `hoverVar`/`pressedVar`/`supplVar` на роль (раньше только `-hover` читался явно из
  темы, `-pressed`/`-suppl` теряли Rule 4 полностью). Суперседит P-D29 (фиксированные ±0.06/+0.10
  дельты).
  Тесты T8/T9/T10 (findings §6) через настоящий naive-ui/seemly + unit-тесты в `color.test.ts`.
  Коммит `746eed3` (реализация).
- Валидация (все зелёные, до ревью): `pnpm build && pnpm test && pnpm test:int` — 1163 unit,
  38 int-fast; `pnpm typecheck && pnpm lint` — чисто.
- **Adversarial-review (opus/xhigh) по коммиту `746eed3`**: 2 находки, обе устранены коммитом
  `3ec1a26`.
  1. `extrapolateHue` проверял ахроматику через `Number.isNaN(h)`, но colorjs.io 0.7.0 в
     рантайме отдаёт для chroma≈0 `oklch.h === null` (НЕ `NaN`) — guard не срабатывал, `null`
     коэрсился в `0`, экстраполяция ахроматичный-base→хроматичный-explicit-hover уезжала в
     случайный hue вместо направления hover. Устранено (`isAchromatic` проверяет
     `null`/`undefined`/`NaN`); red-before-fix подтверждён `git stash` (~107° ошибка на старом
     guard'е вместо <10° после фикса).
  2. Плановые числа ΔL≥0.03/0.04 (`findings/P8-naive-color-canon.md` §3.4) цитируют
     `STEP10_DELTA` ДО коррекции P8.5 (было ±0.045, стало `-0.03`/`+0.041`) — для пути «чистая
     деривация» (без явного theme-hover, напр. статусные роли) на реальном дефолт-seed'е
     gamut-mapping даёт light ΔL≈0.0274, ниже буквального 0.03. Добавлен интеграционный T8b
     (статусные роли, честный порог 0.02 light / 0.03 dark) — задокументировано как Known
     Deviation в `phases/P8.md` P8.9, не замаскировано клэмпом/второй hardcode-дельтой.
  Финальная валидация (все зелёные): `pnpm build && pnpm test && pnpm test:int && pnpm typecheck
  && pnpm lint` — 1164 unit-теста (46 файлов), 39 int-fast тестов (12 файлов).

**Remaining:**

1. **P8.10–P8.14** — 5 items, порядок: P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI: SSOT-
   потребление + исключения скана) → P8.14 (research + финальная сверка).
   Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh).
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца
   2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает). `findings/P8-naive-color-canon.md` §3.4 несёт стале
  ΔL-числа (до коррекции P8.5) — известная неточность документа, правка НЕ входит в P8.9 (Scope
  Excluded), войдёт в P8.14 (правка research-артефактов).
- Тест-стенд P8.1 — `tests/integration/` (4 яруса: `src/fast`, `src/browser`, `src/e2e`); `pnpm
  test:int`/`test:int:slow` не идут в `pnpm test` (отдельные команды). `tests/integration/
  package.json` теперь несёт `@themeon/colors`, `seemly`, `colorjs.io` (P8.8/P8.9) как devDeps.
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `3ec1a26`), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.
- `@themeon/colors` экспортирует `STEP10_DELTA` (P8.9, публичный, `scale.ts`) — единственная
  внешняя константа шкалы, которую потребляют адаптеры для деривации; второй хардкод той же
  дельты где-либо в репо = регрессия P-D14 (naming/математика применяется один раз).
- `@themeon/naive/src/color.ts` — `deriveInteractionStates(DeriveInput)` (P8.9, новая сигнатура,
  суперседит P-D29); `ink-map.ts` (P8.8) её не касается.
- `packages/core/src/errors.ts` несёт `ThemeonErrorCode` с `'BAD_COLOR'` (P8.8) — публичный
  тип-only экспорт.
- Changeset `naive-literal-lookup-fail-loud-ink.md` (`@themeon/naive`+`@themeon/core`, minor,
  P8.8) ещё не зарелижен (репо не в npm, P-D53) — P8.9 не заводила отдельный changeset (репо не
  в npm, тот же режим свободной ломки контракта).

**Open risks:**

- Тонкий APCA-запас (0.9–1.7 Lc) против `--color-bg-subtle` у пар `focusRing`/`link` в дефолт-теме
  (P8.7 review finding) — сдвиг нейтральной/акцентной шкалы `@themeon/colors` может увести их в FAIL;
  гейт fail-closed поймает на сборке, не сформирован как отдельный item.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.
- P8.9 остаточный риск §3.5 (findings): в dark лестница `base→hover→pressed` идёт вверх по L ⇒
  контраст белых чернил падает 75.6→69.0→62.0 — порог `text` (60) держится, `body` (75) нет.
  Неизбежно при Radix-направлении и белых чернилах, не баг реализации.
- P8.9 Known Deviation (новое): для пути «чистая деривация» (без явного theme-hover, статусные
  роли на дефолт-seed'е) реальная ΔL(hover,pressed) в light ≈0.0274 — ниже буквального 0.03 из
  findings §3.4/старого текста плана (числа предшествуют коррекции P8.5 `STEP10_DELTA`). Путь
  «явный hover → экстраполяция» (покрывает дефолт-тему `@themeon/css`, т.к. там `action.
  primaryHover` задан явно) держит ≥0.03 в обеих темах. Не редеривация константы (P8.5 закрыта,
  Scope Excluded) — честно задокументированный остаточный разрыв.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation) — специфика этой среды исполнения, пересмотреть при переносе в CI.
- **deferred:** дубль таблицы пар в CLI `checks/contrast.ts` (→ P8.13); `dispose()` у
  `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на английский (репо-широкий долг);
  структурный DTCG-эмит `shadow`/`gradient` (в P8 — `$extensions`-мост); `@themeon/vite`: двойной
  инстанс core; `experimental.bundledDev` (Vite 8.1.x, открытый апстрим-баг); CJS-тем поддержка/
  документация (P8.4 review finding); e2e granular-vs-restart различение (P8.4 review finding);
  тонкий APCA-запас против `bg-subtle` (P8.7 review finding, см. Open risks); «жёлтая полоса»
  APCA для warning-заливок (P8.8, findings §4.2 — не решается тихой подгонкой, Q владельцу);
  стале ΔL-числа в `findings/P8-naive-color-canon.md` §3.4 (P8.9 — правка входит в P8.14).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
