# HANDOFF — 2026-07-15 — after P9

**Next:** `/task:plan-exec 2026.07.12-BASE P9.1` — фаза P9 (документация v0.1) задизайнена
полностью (5 items, полный DoD), первый item готов к исполнению без доп. контекста.

| Параметр | Значение |
|:--|:--|
| Model | sonnet |
| Thinking | medium — механическое исполнение по детерминированному ТЗ, дизайн-решений не требует |
| Context | continue (/clear) — ручной item |
| Суть | Поднять VitePress-скелет (`docs/.vitepress/config.ts` с полной IA на всю фазу, `docs/index.md`-заглушка, GH Pages CI) — фундамент, на котором P9.2–P9.5 только добавляют `.md`-файлы |

```
/task:plan-exec 2026.07.12-BASE P9.1
```

**Done:**

- **Фаза P9 задизайнена** (`/task:plan-design 2026.07.12-BASE P9`, opus/high, 2026-07-15):
  документационный VitePress-сайт v0.1 — index-лендинг, Introduction (why/install/quick-start/
  changelog), Basic Usage (9 страниц по пакету), Best Practices (2 гайдлайна из реального канона
  P8), Recipes (миграция `docs/laravel.md` + anti-FOUC), GH Pages CI. Референс-паттерн —
  `~/projects/packages/azguard/docs/` (тот же движок/владелец), точечно улучшен (актуальные
  версии GH Actions — RAG:✅ Perplexity 2026-07-15, `sitemap`/`lastUpdated`, явный
  `ignoreDeadLinks: false`), не скопирован слепо.
- 5 items (P9.1–P9.5), все 16 полей, строго последовательная зависимость (IA фиксируется в
  P9.1, контент добавляется P9.2–P9.4, P9.5 — сквозная сборка+аудит+тег). **Инвариант фазы**:
  ни один code-example не изобретён — источник (файл:строки существующего README/src) называется
  в Completion Notes каждого item'а (доковый аналог P8-класса дефекта «зелёный тест на моке»).
- 4 owner-решения зафиксированы: **P-D74** (полная фаза в мастер-плане, не лёгкий backlog как
  P7), **P-D75** (EN-only на v0.1, i18n отложен), **P-D76** (GH Pages CI сразу, не отложен до
  полировки контента), **P-D77** (версионирование сайта — независимые git-теги `docs-vX.Y.Z`,
  НЕ связаны с версиями пакетов Changesets).
- `plan.md` v0.7.0 → **v0.8.0**; Meta Status/Last Updated, §3 Routing (design-строка P9 +
  execution-строка P9.1–P9.5, БЕЗ обязательного adversarial-review — не security/прод-класс),
  §4 Status Board (P9 добавлена, 0/5 ⬜ Not started), §5 P-D74..P-D77, §6 Update Log —
  синхронизированы. `phases/P9.md` создан целиком (Phase Context + 5 items + Phase Handoff).
- **Отдельно в этой же сессии**: `## Audit P8` (`phases/P8.md`) дописан ранее (opus/xhigh,
  вердикт `ATTENTION`, реопен не потребовался) + реконсиляция F1/F2 в поля items P8.3/P8.8/
  P8.11/P8.15 (коммит `aae04ad`, `plan.md` Status/Update Log уже отражают это).
- plan-lint: `16 ERROR / 79 WARN (на рабочем дереве, HEAD `f4ed29a`→готовится коммит) —
  новых от `phases/P9.md`: 0 ERROR, 0 WARN` (все 16 ERROR — pre-existing вне P9, см. Open risks;
  +1 WARN общий — длина одной из новых строк Update Log плана, тот же habitual-паттерн, что и
  остальные ~78 записей >300 символов, не блокер).

**Remaining:**

1. **P9 — 0/5 ⬜.** Исполнять строго последовательно P9.1 → P9.2 → P9.3 → P9.4 → P9.5 (каждый
   зависит от структуры/файлов предыдущего). Routing: sonnet/medium, `Exec = plan-exec`, БЕЗ
   обязательного adversarial-review (см. §3 Routing execution-таблицу — страховка встроена в
   Validation каждого item'а, не в отдельный review-item).
2. **P7 — спящий backlog** (0/6 ⬜, не изменилось). Действий нет до срабатывания триггера
   конкретного item'а — см. `phases/P7.md` Phase Handoff. P9 и P7 не конфликтуют (независимые
   ветки работы), P9 просто ближе к реальному триггеру прямо сейчас.
3. Pending Work из P8 (перенос, не блокеры): остаточные APCA-запасы части пар дефолт-темы;
   двойной инстанс `@themeon/core` в графе `@themeon/vite`; `$theme`-типизация без рантайм-
   гарантии без плагина; DTCG-имена тем с `.`/`{`/`}` не экранируются; `dtcgValueToRaw` не
   warn'ит на нестандартном `$type`; `GENERATED_BANNER_RE` — локальная копия в CLI.
4. Pending Work из P5/P6/P8 аудитов (F1–F3 P5, F1/F2 P6, F1–F3 P8) — точечный follow-up, не
   блокирует.

**Заблокировано:** нет.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT).
- P9: `phases/P9.md` (`## Phase Context` — scope/инвариант; 5 items P9.1–P9.5 с полным DoD;
  `## Phase Handoff` — порядок исполнения, известное про инкрементальный публичный деплой).
- Референс вне плана (не редактируется): `~/projects/packages/azguard/docs/.vitepress/
  config.ts` + `~/projects/packages/azguard/.github/workflows/docs.yml`.
- Решения: `plan.md` §5 **P-D74..P-D77**.

**Git-факты (коммиты этой сессии):**

| Коммит | Суть |
|:--|:--|
| `aae04ad` | docs(plan): реконсиляция P8 по Audit P8 (F1/F2 в поля items) |
| — (не закоммичено) | Этот handoff + `phases/P9.md` + правки `plan.md` — коммитит следующий шаг (`plan-exec P9.1`, per-item bookkeeping-коммит унесёт и bootstrap фазы P9, как исторически делали P0.1/P1.1 первые item'ы своих фаз) |

**Расхождения план↔факты:** нет — `phases/P9.md` создан этой сессией, ничего не исполнено
(0/5 ⬜, статусы согласованы с Phase Status/Status Board).

**Open risks:**

- plan-lint остаточные `16 ERROR` — ВСЕ pre-existing вне P9 (P3.8 пустые поля, P4/P5
  Escalation-формат, Status Board P1–P5 инфляция счётчиков) — не блокируют, чинятся своими
  фазами; 0 новых от P9-дизайна.
- GH Pages CI (P9.1) деплоит на каждый push в `main`, трогающий `docs/**` — с P9.1 до P9.5 сайт
  будет виден публично с неполной навигацией (sidebar 404 до появления контента). Осознанно
  принято владельцем (P-D76) — не заводить как находку при аудите фазы.

**Workarounds / Deferred / Open questions:** без изменений от предыдущего handoff (Q3/Q6 —
Decision pending на мёрже веток `themeon-migration/P5`; Q4 — Exploration генерализации, частично
поглощён P8; P7 items — trigger-gated, ждут реального потребителя, P-D73). P9 новых открытых
вопросов не породила — все спорные места (i18n-тайминг, деплой-тайминг, версионирование)
разрешены владельцем сразу и осели в P-D74..P-D77, `open-questions.md` не тронут.
