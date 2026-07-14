# HANDOFF — 2026-07-14 — after P8.14

**Next:** Фаза **P8 (ремедиация аудита) терминальна (14/14, 🟠 Done with deviations)**. Следующий шаг
по плановому порядку остатка (`plan.md` §0 Meta) — **P5.9 (доисполнение)**: пилоты dterema/vintera
были заблокированы решением владельца 2026-07-14 до закрытия ВСЕЙ фазы P8, блокировка снята этим
закрытием. `phases/P5.md` P5.9 уже задизайнирован (Definition of Detailed, R-15) — читать его целиком
перед стартом; исполняется ВРУЧНУЮ (как P5, не `themeon-p5-pilots.js` — см. `plan.md` §3
Execution-стадия, строка «P5.9 (доисполнение), P5.11»).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | Доисполнить P5.9 (пилот dterema/vintera) — миграция на пакет с закрытой фазой P8, ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh) + parity-гейт по CSS-переменным после item'а. |

```
/task:plan-exec 2026.07.12-BASE P5.9
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P5.md` — Phase Context + item **P5.9** целиком (что именно
   осталось доисполнить — item был начат/приостановлен до блокировки P8).
2. `plans/2026.07.12-BASE/plan.md` — §2 Execution Rules (пилоты трогают прод-репо, diff-гейт),
   §3 Routing (P5.9 — sonnet/medium + обязательный review + parity).
3. `~/projects/dterema/app` и `~/projects/vintera/vintera` — состояние веток
   `themeon-migration/P5` (если уже созданы предыдущей попыткой P5.9).

**Done:** (эта сессия — P8.14, закрывает фазу P8 целиком)

- **P8.14 закрыт 🟠 Done with deviations.** Ложные утверждения собственного research размечены
  «ОПРОВЕРГНУТО (2026-07-14, P8)» НА МЕСТЕ (не удалены — провенанс сохранён): `R-11` §1 (Color —
  «строковая форма валидна», Dimension — «legacy-строка `"16px"` валидна», обе против DTCG
  2025.10); `R-13` §4.2 (ручной `hot.send({type:'css-update'})` — no-op), §4.3 (обратный вывод из
  верной посылки про `js-update`), §4.4 (`@import "virtual:themeon.css"` в CSS невозможен в
  принципе), §6.4 (сводка воспроизводит те же три ложных утверждения); `R-14` §1.3 (VERIFY на
  oklch-поддержке seemly снят — она НЕ парсит ни `oklch()`, ни `var()`, корень Blocker #2), §2.1
  («`@theme inline` не создаёт глобальную переменную» — фактически неверно), §2.2 (VERIFY дал
  противоположный вердикт живому прогону). Каждая пометка ссылается на конкретный
  `findings/P8-*.md` и решение (P-D54/P-D55/P-D56/P-D57/P-D60).
  Superseded-цепочки для P-D26/P-D29/P-D31 (+ числовой контракт P2.2) уже были заведены дизайн-стадией
  фазы (`plan.md` §5, P-D54..P-D57 несут явный текст «Supersedes P-Dxx») — сверено, что старые D#
  не редактированы, отдельных новых D# не потребовалось.
  `phases/P4.md` P4.1 Known Deviations дополнен честной записью об аудит-находке #28 (ТЗ требовало
  исключать double-dash companion, код включает, старая отчётность рапортовала обратное — статус
  P4.1 не менялся).
  `open-questions.md` Q4 уже отражала частичное поглощение P8 (заведено дизайн-стадией) — сверено,
  правок не потребовалось.
  **README-грep (Scope Included):** прочесаны все 9 README пакетов построчно против тестов пакета +
  `tests/integration`. Один пробел: блюпринты `@themeon/css` (`.page-shell`/`.site-header`+
  `.site-nav` burger/`.hero`/`.section`/`.site-footer`) были покрыты только контракт-тестом на
  присутствие var-имён, не на поведение. Вместо удаления рецептов (буквальное предписание item'а)
  — новый `tests/integration/src/browser/css-blueprints.test.ts` (6 тестов, реальный Chromium):
  footer прижат к низу `.page-shell`; `@container page (inline-size<48rem)`-порог burger-меню
  (широкий контейнер → nav развёрнута/burger скрыт, узкий → наоборот); `.hero` контент = измеренная
  `60ch`; `.section--subtle` красит фон; `.footer-cols` — auto-fit grid на широком экране.
  Red-before-fix подтверждён вручную (вырезание `@container`-правила из `dist/blueprints.css` роняет
  burger-тест, откат — снова зелёный).
  **Обнаружено сверх Scope, починено в рамках финальной сверки:** 8 из 10 changeset'ов фазы
  (`@themeon/core`/`colors`/`nuxt`/`vite`/`tailwind`/`naive` state-derivation/`vue`/`themeon` CLI),
  созданные предыдущими items P8, никогда не коммитились в git (были untracked) — закоммичены этим
  item'ом.
  Item-коммит `01bd07d` (research-пометки + `phases/P4.md` + 8 changeset'ов + новый тест).
  Финальные гейты на этом коммите: `pnpm build` (11 пакетов) 🟢; `pnpm lint` (oxlint) чисто;
  `pnpm typecheck` 11/11 + `tests/integration` чисто; `pnpm test` 1204 теста/48 файлов 🟢;
  `pnpm test:int` 14 файлов/48 тестов 🟢 (было 13/42, +1 файл/+6 тестов); `pnpm check:pack`
  (publint+attw esm-only, 8 публикуемых пакетов) «All good!». `plan-lint.py --baseline HEAD` (на
  дереве с item-коммитом, до bookkeeping): 16 ERROR/79 WARN — **все baseline** (Status Board
  Items 🟢/всего рассинхрон P1–P5, P3.8/P6.х/P5 skeleton-предупреждения, длина записей Update Log,
  канон имён workflow-скриптов — предсуществуют, вне Scope этого item'а) — новых от диффа item'а: **0**.
  **Known Deviations (material — статус 🟠):** (1) item-коммит несёт дифф вне `Files` item'а —
  новый тест-файл `tests/integration/src/browser/css-blueprints.test.ts`; Implementation Rule 4
  буквально предписывала «рецепт без теста — убрать», выбран путь «дописать тест ДО закрытия»
  (рецепты рабочие, регресс подтверждён вручную) — материальное отклонение, не «дописать позже»
  (тест написан и зелёный в рамках этого же item'а); (2) 8 changeset'ов из ЧУЖИХ предыдущих items
  закоммичены здесь — постфактум-починка чужого упущения, не по существу этого item'а.

**Remaining:**

1. **P5.9 / P5.11 / P5.10** (пилоты dterema/vintera) — разблокированы. Порядок: P5.9 → P5.11 → P5.10.
   Исполняются ВРУЧНУЮ (sonnet/medium + обязательный adversarial-review opus/xhigh + parity-гейт).
2. **P6 / P7** — без изменений, скелет/backlog.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Фаза P8 закрыта целиком — 14/14 items, `phases/P8.md` Phase Handoff несёт полную сводку
  инвариантов/решений/известных ограничений. `findings/P8-*.md` остаются референсом канона
  (naive/tailwind/vite/colors/dtcg/css/nuxt) для будущих фаз, если понадобится сверка.
- `20_research/{R-11,R-13,R-14}*.md` — ложные участки размечены «ОПРОВЕРГНУТО», сам research НЕ
  переписан (провенанс). Новый research НЕ должен цитировать помеченные участки как истину.
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (коммит `01bd07d`), дерево чистое.
  `dist` теперь МОЖНО брать в пилоты P5.9/P5.11/P5.10 — P8 закрыта, все фиксы naive/tailwind/vite/
  colors/DTCG/CLI финальны.
- `.changeset/*` — 10 файлов на публичные изменения фазы P8 (все теперь закоммичены). Репо не в
  npm (P-D53) — не зарелижены, релиз не требуется до публикации пакета.

**Open risks:**

- Тонкий APCA-запас (0.9–1.7 Lc) против `--color-bg-subtle` у пар `focusRing`/`link` в дефолт-теме
  (P8.7 review finding) — сдвиг шкалы `@themeon/colors` может увести их в FAIL; гейт fail-closed
  поймает на сборке.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (P8.2, вне скоупа).
- P8.9 остаточный риск: в dark лестница `base→hover→pressed` идёт вверх по L ⇒ контраст белых
  чернил падает 75.6→69.0→62.0 — порог `text` (60) держится, `body` (75) нет. Неизбежно при
  Radix-направлении и белых чернилах, не баг реализации.
- P8.10: `$theme` типизирован глобально, но `undefined` в рантайме без установленного плагина —
  тот же паттерн, что `$pinia`/`$router`, принят как остаточный риск.
- P8.11/P8.12: имена тем с `.`/`{`/`}` не экранируются для DTCG-имени файла; `dtcgValueToRaw` не
  warn'ит на известном-нестандартном `$type` — оба low, не спека-нарушения.
- P8.13: `GENERATED_BANNER_RE` — локальная копия regex'а в CLI, не централизованный export
  `@themeon/core` — риск рассинхрона при смене текста баннера.
- Пилоты (P5.9/P5.11/P5.10): открытый Q3 `open-questions.md` (`@bg-dev/nuxt-naiveui` — владелец
  до merge веток), P5.7/P5.8 несут собственные Escalation Needed (визуал-сайнофф) — читать
  `phases/P5.md` целиком перед стартом P5.9, не полагаться на этот handoff как на полное ТЗ.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` — порт+HTTP-поллинг вместо парсинга stdout (P8.1, специфика
  среды исполнения); `GENERATED_BANNER_RE` — локальная копия в CLI (P8.13).
- **deferred:** централизация `GENERATED_BANNER`/`GENERATED_BANNER_RE` в `@themeon/core`;
  `dispose()` у `UseThemeReturn` (P3.8/P8.10); перевод русских JSDoc публичных типов на английский
  (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient` (backlog, P7); `@themeon/vite`
  двойной инстанс core; CJS-тем поддержка (P8.4); тонкий APCA-запас `bg-subtle` (P8.7); «жёлтая
  полоса» APCA для warning-заливок (P8.8, Q владельцу); экранирование имён тем с `.` (P8.11);
  `dtcgValueToRaw` не warn на известном-нестандартном `$type` (P8.12).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, владелец до merge веток
  пилотов) остаётся открытым; Q4 — статус «Exploration — частично поглощена P8» (не Resolved,
  остаток — DX-долг `aliases`/`refLayer`, кандидат в отдельную фазу после P5); Q1/Q2/Q5 закрыты.
