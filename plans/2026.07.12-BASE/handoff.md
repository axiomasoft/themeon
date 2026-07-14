# HANDOFF — 2026-07-14 — after P8.11

**Next:** Исполнить **P8.12 — `@themeon/core`: DTCG-импорт чужих бандлов**
(двенадцатый item фазы). ТЗ детерминировано `findings/P8-dtcg-2025-10-canon.md` §7 (канон
импорта: корневой `$type`, порядок распознавания base/тема — resolver-документ → явные опции
→ автодетект-эвристика → Tokens Studio `$themes.json`/`$metadata.json`), §1 (нормативные
цитаты по наследованию `$type` §5.2.2/§6.1, именам файлов §4.2), §9 (тесты #9–#13, #16) +
`phases/P8.md` P8.12 целиком. После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | `packages/core/src/dtcg/from-dtcg.ts`: `walkDTGC` стартует с `inheritedType = doc.$type` (корень документа — группа, §6.1, тип наследуется вниз §5.2.2) — сейчас любой `$`-ключ на корне отбрасывается, поэтому самый частый экспорт Tokens Studio (`{"$type":"color", "brand":{…}}`) импортируется ПУСТЫМ (Major #8, findings §2). Контракт `fromDTCG(files, opts?)`: `opts.base`/`opts.themes` — явный ручной контракт; без опций — автодетект по порядку findings §7.2: (а) resolver-документ в бандле (`version==='2025.10'` + `sets`/`modifiers`, детект `isLikelyResolver`-подобной эвристикой) — ОСНОВНОЙ путь; (б) явные опции; (в) эвристика «подмножество путей» (документ, чьи пути ⊆ путей другого и не вводит новых — патч-тема; наибольшее число уникальных путей — база; один документ — база); (г) `$themes.json`/`$metadata.json` Tokens Studio — распознать и ПРОПУСТИТЬ явно (не мусор в базу). Warning vs Error по findings §7.3: пустой результат импорта по умолчанию — громкий warning с диагнозом («0 tokens parsed from N files: …»), `opts.onEmpty:'error'` — `ThemeonError`; коллизия имён при экранировании (P8.11 механизм) — всегда ERROR; нерезолвимый `$type`/токен без типа — WARNING (не угадывать по значению, §5.2.2 MUST NOT). Round-trip с `toDTCG` (P8.11) — обязательный тест. |

```
/task:plan-exec 2026.07.12-BASE P8.12
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.12** целиком.
2. `plans/2026.07.12-BASE/findings/P8-dtcg-2025-10-canon.md` §1, §7, §9 (нормативные цитаты,
   канон импорта, тесты).
3. `packages/core/src/dtcg/from-dtcg.ts` (текущий код).
4. `90_audit/AUDIT_2026-07-14_research-conformance.md` §«### 8», §«### 9».
5. `packages/core/src/dtcg/to-dtcg.ts` (P8.11, свежий канон эмита — импорт обязан
   round-trip'ить его выход, включая `$extensions["com.themeon"]` мост и экранированные имена).
6. `packages/core/src/api.test.ts` (freeze — обновляется в этом же item'е, если добавляются
   рантайм-экспорты).
7. `plans/2026.07.12-BASE/plan.md` — §3 Routing, §5 Decision Log (P-D53 — свободная ломка
   контракта; P-D60 — DTCG-мост канон P8.11).

**Done:** (эта сессия)

- **P8.11 закрыт 🟢 Done.** `@themeon/core` DTCG-эмит по спеке 2025.10:
  `packages/core/src/dtcg/color.ts` — парсеры `hsl()`/`hwb()`/`lab()`/`lch()`/`oklab()`/
  `color(<space> …)`/148 именованных CSS-цветов (все 14 colorSpace спеки, без конверсии);
  zero-dep `oklchToHex` (матрицы Ottosson + CSS Color 4 §13.2 gamut-mapping, бисекция по
  ΔEOK<0.02) — сверен живым `colorjs.io@0.7.0`: 8 in-gamut сэмплов 100% байт-в-байт.
  `packages/core/src/dtcg/to-dtcg.ts` — переписан: `toDTCGDimension` (только px/rem),
  `toDTCGCubicBezier` (таблица именованных кривых), `emitText` (`text` → примитивы
  `fontSize`/`lineHeight`, НЕ `typography` — модель не даёт 5 полей §9.8), `shadow`/`gradient`
  всегда мост (P-D60), `escapeDTCGSegment`/`toDTCGPath` (экранирование `.`/`{`/`}`/ведущего `$`,
  коллизия → `ThemeonError('DTCG_NAME_COLLISION')`), `pickResolverDefaultKey` (синтетический
  base-only контекст вместо жёсткого `light`). `toDTCG` возвращает `{ files, warnings }`;
  непредставимое — `$extensions["com.themeon"].unrepresentable`, никогда тихий passthrough.
  Тесты: `color.test.ts`/`to-dtcg.test.ts` переписаны (conformance через
  `@terrazzo/parser@2.4.0`, включая негативный контроль); `from-dtcg.test.ts` — 1 round-trip
  тест обновлён под новую форму `text`. Новые devDeps `packages/core`: `@terrazzo/parser@2.4.0`,
  `colorjs.io@0.7.0` (devDependency, core остаётся zero-dep в рантайме). Коммит `c95d5b9`.
- Валидация (все зелёные, до ревью): `pnpm build && pnpm test` — 1187 тестов; `pnpm
  typecheck && pnpm lint` — чисто; прогон `@terrazzo/parser@2.4.0` на выходе разнородной
  темы (color/dimension/text/duration/cubicBezier/breakpoint + 2 темы + resolver) — 0 ошибок.
- **Adversarial-review (opus) по коммиту `c95d5b9`**: 1 HIGH + 2 low/nit. HIGH устранён
  коммитом `9cf7605`: тема с именем `base` писала в тот же `base.tokens.json`, молча затирая
  ВЕСЬ sys-слой патчем темы (fail-loud правило 4 нарушалось без единого warning'а) — теперь
  `ThemeonError('DTCG_NAME_COLLISION')` до записи файлов, регресс-тест добавлен. 2 low/nit —
  в Known Deviations `phases/P8.md` P8.11 (не MED+, не спека-нарушение, не устранены).
  Финальная валидация (все зелёные): `pnpm build && pnpm test` — 1188 тестов; `pnpm
  typecheck && pnpm lint` — чисто.

**Remaining:**

1. **P8.12–P8.14** — 3 items, порядок: P8.12 (DTCG импорт) → P8.13 (CLI: SSOT-потребление +
   исключения скана) → P8.14 (research + финальная сверка фазы).
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
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `9cf7605`), дерево
  чистое. `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.
- `@themeon/core` DTCG-мост (P8.11): `toDTCG(theme) → { files, warnings }` — публичный контракт
  ломается свободно (P-D53), но КАЖДОЕ изменение — в `api.test.ts` в том же item'е (в P8.11 не
  потребовалось: рантайм-экспорты не менялись, только типы). `packages/core/src/dtcg/to-dtcg.ts`
  несёт `escapeDTCGSegment`/`toDTCGPath`/`pickResolverDefaultKey` — P8.12 (импорт) обязан их
  ЧИТАТЬ (не переизобретать): экранированные имена восстанавливаются через
  `$extensions["com.themeon"].path`, непредставимые значения — через
  `$extensions["com.themeon"].unrepresentable`. Тема с именем `base` теперь `ThemeonError`
  (P8.11 review-фикс `9cf7605`) — не регрессировать при добавлении опций импорта.
  `packages/core/src/errors.ts` несёт новый код `DTCG_NAME_COLLISION` (P8.11, публичный тип-only
  экспорт `ThemeonErrorCode`).
- `@themeon/colors` экспортирует `STEP10_DELTA` (P8.9, публичный, `scale.ts`).
- `packages/core/src/errors.ts` несёт `ThemeonErrorCode` с `'BAD_COLOR'` (P8.8) и
  `'DTCG_NAME_COLLISION'` (P8.11) — публичные тип-only экспорты.
- Changesets (`@themeon/naive`+`@themeon/core` P8.8; naive-деривация P8.9; DTCG-мост P8.11) ещё
  не зарелижены (репо не в npm, P-D53) — P8.11 не заводила отдельный changeset (та же логика).

**Open risks:**

- Тонкий APCA-запас (0.9–1.7 Lc) против `--color-bg-subtle` у пар `focusRing`/`link` в дефолт-теме
  (P8.7 review finding) — сдвиг нейтральной/акцентной шкалы `@themeon/colors` может увести их в FAIL;
  гейт fail-closed поймает на сборке, не сформирован как отдельный item.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.
- P8.9 остаточный риск §3.5 (findings): в dark лестница `base→hover→pressed` идёт вверх по L ⇒
  контраст белых чернил падает 75.6→69.0→62.0 — порог `text` (60) держится, `body` (75) нет.
  Неизбежно при Radix-направлении и белых чернилах, не баг реализации.
- P8.10: `$theme` в `ComponentCustomProperties` — глобальная аугментация; потребитель, импортирующий
  `@themeon/vue`, но НЕ ставящий плагин, получит `$theme` типизированным (компилируется), но
  `undefined` в рантайме (неустранимо структурно, тот же паттерн у `$pinia`/`$router`, принят как
  остаточный риск).
- P8.11: имена тем с `.`/`{`/`}` не экранируются для имени файла/resolver-ключа контекста (review
  low finding, не спека-нарушение — контекст-ключ не token/group name) — P8.12 должен ЧИТАТЬ такие
  имена файлов корректно (basename-парсинг `high.contrast.tokens.json` неоднозначен), но не обязан
  чинить экранирование на стороне эмита (вне скоупа P8.12, эмит уже закрыт).

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation) — специфика этой среды исполнения, пересмотреть при переносе в CI.
- **deferred:** дубль таблицы пар в CLI `checks/contrast.ts` (→ P8.13); `dispose()` у
  `UseThemeReturn` (P3.8, повторно deferred в P8.10 Scope Excluded); перевод русских JSDoc
  публичных типов на английский (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient`
  (backlog, P7); `@themeon/vite`: двойной инстанс core; `experimental.bundledDev` (Vite 8.1.x,
  открытый апстрим-баг); CJS-тем поддержка/документация (P8.4 review finding); e2e
  granular-vs-restart различение (P8.4 review finding); тонкий APCA-запас против `bg-subtle`
  (P8.7 review finding, см. Open risks); «жёлтая полоса» APCA для warning-заливок (P8.8, findings
  §4.2 — Q владельцу); экранирование имён тем с `.`/резолвер-ключей (P8.11 review low finding,
  см. Open risks); `escapeDTCGSegment` не разделяет по `_` в отличие от naming-движка (P8.11
  review nit — не спека-нарушение, JSDoc-неточность).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
