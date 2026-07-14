# HANDOFF — 2026-07-14 — after P8.5

**Next:** Исполнить **P8.6 — `@themeon/colors`: APCA-подложка + SSOT пар и порогов** (шестой item
фазы, второй из двух colors-items — идёт сразу после P8.5, до css/naive/cli, т.к. они потребляют
её контракт). ТЗ детерминировано `findings/P8-colors-scale-apca.md` §3.4 (аудит-находка #15:
альфа-композитинг на безусловный белый вместо фактической подложки). После коммита — ОБЯЗАТЕЛЬНЫЙ
adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | `packages/colors/src/contrast.ts`: `ContrastOptions.base`/`ContrastPair.base`, `ALPHA_NEEDS_BASE` fail-closed на полупрозрачный bg без подложки; потребители `gen-tokens.mjs`/`checks/contrast.ts` — по одной строке `base: v('--color-bg-page')` |

```
/task:plan-exec 2026.07.12-BASE P8.6
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.6** целиком.
2. `plans/2026.07.12-BASE/findings/P8-colors-scale-apca.md` §3.4 (уже читан в этой сессии для
   P8.5 — но именно §3.4 в P8.5 НЕ применялся, Scope Excluded явно откладывал его на P8.6).
3. `plans/2026.07.12-BASE/plan.md` — §3 Routing (строка P8.1–P8.14), §5 Decision Log, §4 Status Board.
4. `packages/colors/src/contrast.ts` (текущий код — `flattenAlpha` с безусловной белой подложкой).

**Done:** (эта сессия)

- **P8.5 закрыт 🟢 Done.** `@themeon/colors`: `scale.ts` переписан по findings §3.1-3.3 (Major
  #12/#13/#14 аудита) — фиксированный lightness-ramp `RAMP` (медианы 31 опубликованной шкалы
  Radix Colors 3.0.0) для шагов 1-8/11/12 вместо `LIGHTNESS_T`-интерполяции; `enforceFloor` —
  бинпоиск-ГАРД floor'ов Lc 60/90 (дословно из доки Radix) по ПОЛНОМУ lightness-домену, заменил
  `solveLightnessForContrast`, который целился в неверную точную цель 68 по узкому домену
  `(0, L10)` (корень коллапса шагов 11/12); chroma-cap `1.0` от ПОСТ-gamut `C9` вместо `1.2` от
  сырого seed'а (шаг 9 больше не обгоняется соседями по chroma); валидация
  `L(seed) ∈ [SEED_L_MIN=0.50, SEED_L_MAX=0.93]` — `throw ColorsError('SEED_OUT_OF_BAND')` по
  умолчанию, `seedPolicy:'clamp'` + `onSeedAdjusted` опционально. Новые коды ошибок
  `SEED_OUT_OF_BAND`/`CONTRAST_UNREACHABLE` в `packages/colors/src/errors.ts`.
- `packages/colors/src/scale.test.ts`: 11 новых тест-инвариантов на `describe.each(ALL_SEEDS ×
  APPEARANCES)` (I1-I8, I10-I11) + I9 (seed-band error/clamp policy на `OUT_OF_BAND_SEEDS`).
  `packages/colors/README.md`: описаны гарантии floor'ов и полоса seed'а.
- **Red-before-fix доказан**: старый `scale.ts` временно восстановлен (`git stash`), новый
  `scale.test.ts` прогнан против него — **90/384 падений**; откат к фиксу — 411/411 зелёных.
- Валидация (все зелёные): `pnpm build && pnpm lint && pnpm typecheck && pnpm test` (1139 unit,
  монорепо целиком; регенерация `packages/css/dist/tokens.css` — APCA-гейт прошёл, 10 пар).
- **Adversarial-review (opus/xhigh) по коммиту `48f63bd`**: 0 Blocker/Major, 3 Minor. 1 устранена
  коммитом `22488ea` (`throw ColorsError('CONTRAST_UNREACHABLE')`, если шаг 11 не отделился от
  шага 10 за `STEP11_SEPARATION_ATTEMPTS` попыток — раньше цикл молча выходил, нарушая инвариант
  фазы №4 fail-loud; недостижимо конструктивно для seed'ов внутри полосы, throw — страховка).
  2 не потребовали кода — см. Known Deviations `phases/P8.md` P8.5: (1) тест-инвариант I2 смягчён
  0.010→0.009 (единственный случай — gamut-apex артефакт на `oklch(0.55 0.15 75)` light, НЕ
  коллапс-баг); (2) `errors.ts` изменён хоть и не входил в `Files` item'а (необходимое следствие
  новых кодов ошибок, признано корректным).

**Remaining:**

1. **P8.6–P8.14** — 9 items, порядок: P8.6 (colors, alpha-подложка) → P8.7 (css) → P8.8/P8.9
   (naive) → P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI) → P8.14 (research + финальная сверка).
   Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh).
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца
   2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (4 яруса: `src/fast`, `src/browser`, `src/e2e`); `pnpm
  test:int`/`test:int:slow` не идут в `pnpm test` (отдельные команды).
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `6204886`), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.
- `packages/colors/dist/tokens.css` (через `packages/css` build) — дефолт-тема пакета изменилась
  на 20/24 color-переменных (findings §4); это ОЖИДАЕМО и уже отражено в текущем `pnpm build`,
  публичный changeset — вне скоупа P8 (P8.14/релизный процесс).

**Open risks:**

- Прочие риски фазы (Naive dark APCA, `textMuted` запас над floor'ом — теперь измерено:
  63.1 Lc против floor 60, зафиксировано как ожидаемое в P8.5 Completion Notes) — без изменений
  дальше, см. `phases/P8.md`.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.
- P8.5 Known Deviations (см. Done выше) — I2-порог, `errors.ts` вне `Files`, слабый I11 — не
  регрессии, не закрыты дополнительным кодом (adversarial-review признал минорными).

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation, подтверждено ещё раз в P8.4) — специфика этой среды исполнения,
  пересмотреть при переносе в CI.
- **deferred:** `dispose()` у `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на
  английский (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient` (в P8 —
  `$extensions`-мост); `@themeon/vite`: двойной инстанс core; `experimental.bundledDev` (Vite
  8.1.x, открытый апстрим-баг); CJS-тем поддержка/документация (P8.4 review finding); e2e
  granular-vs-restart различение (P8.4 review finding); changeset на breaking change дефолт-темы
  `@themeon/css` (P8.5, эффект 20/24 переменных — см. Sources of truth выше).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
