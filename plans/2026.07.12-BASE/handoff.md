# HANDOFF — 2026-07-15 — after P7

**Next:** `/task:plan-design 2026.07.12-BASE P7.<m>` — ТОЛЬКО при срабатывании триггера
конкретного item'а (см. Phase Handoff `phases/P7.md`: `<m>` = 1..6, чей триггер сработал).
Немедленного действия НЕ требуется: P7 подтверждена как **живой спящий open-ended backlog**
(P-D73), все 6 items ⬜ ждут реального потребителя; план на паузе, но НЕ архивируется. Прямой
`/task:plan-exec` по P7.* запрещён (Routing-гейт §9: `Exec = plan-design`) — сначала ре-дизайн
до полного DoD + свежий RAG на актуальные версии библиотек.

| Параметр | Значение |
|:--|:--|
| Model | opus (design) / sonnet высокого effort допустим (§3 Routing P7 = sonnet/high) |
| Thinking | high — trigger-gated ре-дизайн backlog-item'а до полного DoD |
| Context | NEW SESSION — шаг-не-item |
| Суть | Оживить item P7.`<m>`, чей триггер сработал: полный DoD (файловое дерево, TS-сигнатуры, эталонный код) + свежий RAG на актуальный формат/версию библиотеки (shadcn registry / Bootstrap / Vuetify / PrimeVue / Composer). |

```
/task:plan-design 2026.07.12-BASE P7.<m>
```

**Done:**

- **P7 подтверждена как живой open-ended backlog** (`/task:plan-design 2026.07.12-BASE P7`,
  P-D73, owner-решение). Repo-grounded сверка каждого из 6 items на HEAD показала: ни один не
  «уже сделан» (адаптеры — только `naive`; CLI — `schema/init/build/check`, нет `add`; SFC-обёрток
  примитивов нет; Composer/Blade-пакета нет) и ни один не «больше не вписывается» → по принципу
  владельца ни один НЕ закрывается ⛔/🟢 ради архивации. Все 6 остаются ⬜.
- §3 Routing exec-таблица: `P7.1–P7.6 → Exec = plan-design` (trigger-gated, прямой `plan-exec`
  останавливается гейтом §9). Добавлены явные phase-level Scope Included/Excluded в `phases/P7.md`.
- `plan.md` v0.6.0 → **v0.7.0**; Meta Status/Last Updated, §4 Status Board (P7 аннотирован),
  §5 P-D73, §6 Update Log — синхронизированы. `phases/P7.md` Phase Handoff заполнен (интерим,
  честно: «фаза НЕ закрыта»).

**Remaining:**

1. **P7 — спящий backlog** (0/6 ⬜). Действий нет до срабатывания триггера item'а. Триггеры и
   предусловия — `phases/P7.md` Phase Handoff. Пока хоть один item ⬜ — план 🟡, не архивируется.
2. Pending Work из P8 (перенос, не блокеры): остаточные APCA-запасы части пар дефолт-темы;
   двойной инстанс `@themeon/core` в графе `@themeon/vite`; `$theme`-типизация без рантайм-
   гарантии без плагина; DTCG-имена тем с `.`/`{`/`}` не экранируются; `dtcgValueToRaw` не
   warn'ит на нестандартном `$type`; `GENERATED_BANNER_RE` — локальная копия в CLI.
3. Pending Work из P5/P6 аудитов (F1–F3 P5, F1/F2 P6) — точечный follow-up, не блокирует.

**Заблокировано:** нет.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT).
- P7: `phases/P7.md` (`## Phase Context` — подтверждение P-D73 + Scope; `## Phase Handoff` —
  триггеры/предусловия; 6 items P7.1–P7.6 trigger-gated).
- Решение: `plan.md` §5 **P-D73** (+ P-D47, который оно supplement'ит).

**Git-факты (коммиты этой сессии):**

| Коммит | Суть |
|:--|:--|
| (bookkeeping этой сессии) | docs(plan): P7 подтверждена как живой open-ended backlog (P-D73) |

**Расхождения план↔факты:** нет — сведены этой сессией (repo-grounded сверка 6 items на HEAD).

**Open risks:**

- P7 — единственная нетерминальная фаза; план сознательно НЕ архивируется, пока backlog жив
  (P-D73). Это не риск, а зафиксированное решение владельца — но означает, что `plan-close archive`
  недоступен без явного пересмотра.
- plan-lint остаточные ошибки вне этой фазы (pre-existing дрейф P1–P5 Status Board / P3.8/P4.*/
  P5.7-8 полевых дефектов) — не блокируют, чинятся своими фазами; 0 новых от этой design-сессии.

**Workarounds / Deferred / Open questions:** без изменений от предыдущего handoff (Q3/Q6 —
Decision pending на мёрже веток `themeon-migration/P5`; Q4 — Exploration генерализации, частично
поглощён P8; P7 items — trigger-gated, ждут реального потребителя, P-D73).
