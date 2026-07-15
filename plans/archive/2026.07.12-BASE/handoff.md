# HANDOFF — 2026-07-15 — after P7

**Next:** план закрыт

Архивирован целиком. Следующий план выбирает владелец, вне протокола.

**Done:**

- Precondition подтверждён: все фазы плана терминальны (P0 🟠, P1 🟠, P2 🟠, P3 🟠, P4 🟢,
  P5 🟠, P6 🟠, P7 ⛔ — закрыта релокацией в `ROADMAP.md`, `P-D79`, P8 🟠, P9 🟠). `Home` в
  Meta не задан → репо-дом по умолчанию, работа велась в `~/projects/packages/themeon`.
- `brain sync plans ThemeOn` (дважды: после релокации P7 и повторно перед переносом) —
  Brain-зеркало `Vaults/Brain/05-Projects/03-Packages/ThemeOn/` синхронизировано, финальная
  версия плана попала в зеркало до переноса.
- Перенос: `git mv plans/2026.07.12-BASE plans/archive/2026.07.12-BASE` — коммит `23fd67d`
  (`chore(plan): archive 2026.07.12-BASE`), только plan-пути, без другого диффа.
- Миграция `root/` → docs проекта: **пропущена** — каталога `root/` в плане не было
  (структура использовала `00_MASTER_PLAN.md`/`10_decisions/`/`20_research/`/`90_audit/`/
  `findings/`/`open-questions.md`/`workflows/` напрямую в корне плана, не через `root/`);
  по канону архивного режима `root/` — единственный каталог с обязательной Diátaxis-
  миграцией, ничего переносить не требовалось.
- Реестры и ссылки:
  - `plans/ACTIVE.md` → сброшен на канонические 4 строки, `**Active:** —`.
  - `README.md` `**Plan:**` → указывает на `plans/archive/2026.07.12-BASE/plan.md`.
  - `docs/introduction/why-themeon.md` и `docs/index.md` — GitHub-ссылки на
    `20_research/` поправлены на `.../tree/main/plans/archive/2026.07.12-BASE/20_research`
    (были единственными живыми доками вне архива, ссылавшимися на старый путь плана).

**Remaining:** ничего в протоколе — план терминален и архивирован. Вне протокола:

1. `ROADMAP.md` (корень репозитория, живой, вне архива) — 6 идей бывшей фазы P7, каждая
   ждёт своего триггера; следующая правка — отдельная фокусная design-сессия по конкретному
   пункту, не item этого плана.
2. Корневой `README.md` таблица пакетов для `tailwind` устарела (`@theme inline` vs
   `@theme reference`, P9.3 Known Deviations) — открытый пункт вне плана, не блокер.

**Чек-лист миграции:**

| Материал | Судьба |
|:--|:--|
| `root/` (architecture/philosophy/data-model/гайды) | Н/П — каталога не было в плане |
| `00_MASTER_PLAN.md`, `10_decisions/`, `20_research/`, `90_audit/`, `findings/`, `open-questions.md`, `workflows/` | остаются в архиве (`plans/archive/2026.07.12-BASE/`) — исследовательский/бухгалтерский материал плана, не Diátaxis-доки продукта |
| P7 backlog (6 идей) | уже релоцирован ДО архивации — корневой `ROADMAP.md` (коммит `2599cfa`) |
| Ссылки `plans/2026.07.12-BASE/*` в живых доках | поправлены на `plans/archive/2026.07.12-BASE/*` (README.md, docs/introduction/why-themeon.md, docs/index.md) |
| `plans/ACTIVE.md` | сброшен на `—` |

**Sources of truth:**

- Архив плана: `~/projects/packages/themeon/plans/archive/2026.07.12-BASE/` (repo = SSOT).
- Роадмап (живой, вне архива): `~/projects/packages/themeon/ROADMAP.md`.
- Git-факты: коммит релокации P7 `2599cfa`, коммит переноса в архив `23fd67d`, коммит
  миграции реестров/ссылок — следующий в истории после этого handoff'а.

**Open risks (переживают архивацию, атрибутированы, не блокеры):**

- Остаточные `plan-lint` ERROR/WARN вне P7 (P3.8-скелет, P4 Escalation-формат, P1–P5 Status
  Board числа, Update Log >300 симв., 3 workflow-скрипта неканоничного имени) —
  pre-existing на момент архивации, зафиксированы числом в отчёте `plan-close archive`.
- Корневой `README.md` (в его прежнем виде) таблица пакетов для `tailwind` устарела
  (`@theme inline` vs `@theme reference`, P9.3 Known Deviations) — не блокер, открытый пункт
  вне плана.

**Workarounds / Deferred / Open questions:** без изменений, см. `open-questions.md` в этом
архиве (Q3/Q6/Q4) — Q4 (генерализация по находкам пилотов, varMap/roles/aliases) остаётся
отдельным Exploration-вопросом вне ROADMAP.md/этого плана, как и было решено ранее.
