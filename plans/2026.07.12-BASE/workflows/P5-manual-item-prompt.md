# P5 — ручной поштучный запуск (шаблон)

Почему это существует: фоновый `themeon-p5-pilots.js` дважды спотыкался на инфраструктурных
мелочах (transient 403 при перезагрузке IDE, баг STATUS-стадии) — план и прод-репо оба раза
остались целы, но пользователь решил вести оставшиеся item'ы P5 вручную: одна НОВАЯ Claude Code
сессия (чистый контекст) на один item, в конце сессии — готовый промпт для следующего item.

Инварианты те же, что в автоскрипте (`workflows/themeon-p5-pilots.js`), решения P-D34..P-D43
(`plan.md` §5) в силе. Baseline на пилота снимается ОДИН раз (первым его item'ом: P5.1 для dterema
уже снят; P5.5 снимет его для vintera) — остальные item'ы пилота его переиспользуют.

Порядок (D17): P5.3 → P5.4 → P5.5 → P5.6 → P5.7 → P5.8 → P5.9 → P5.10 (закрытие фазы).

---

## Шаблон промпта (вставлять в НОВУЮ сессию)

```
Роль — исполнение item'а {ITEM_ID} фазы P5 плана THEMEON (пилотная миграция dterema/vintera на
ThemeOn), с ОБЯЗАТЕЛЬНЫМ read-only adversarial-review после реализации — прод-риск, ошибка ломает
живой сайт. Работаешь в этой же CLI-сессии, без фоновых Workflow.

Порядок чтения СТРОГО:
1. /home/vostrikov/projects/packages/themeon/plans/2026.07.12-BASE/plan.md — §1 Context, §2
   Execution Rules, §5 Decision Log (особо P-D34..P-D43 — механика P5, parity-семантика, известные
   баги автоскрипта уже починены), §4 Status Board.
2. /home/vostrikov/projects/packages/themeon/plans/2026.07.12-BASE/handoff.md
3. /home/vostrikov/projects/packages/themeon/plans/2026.07.12-BASE/phases/P5.md — Phase Context
   целиком + item {ITEM_ID} целиком (Status/Intent/Scope/Implementation Rules/Code Guidance/
   Validation/expectedVarDiff).
4. Required Reads item'а, в указанном порядке.

Прод-репо пилотов: dterema `/home/vostrikov/projects/dterema/app`, vintera
`/home/vostrikov/projects/vintera/vintera`. Если item трогает прод-репо (см. поле "Pilot repo" в
P5.md) — ЖЁСТКИЕ инварианты, нарушение = escalation, не импровизация:
  - INV1: работай ТОЛЬКО в ветке `themeon-migration/P5` (уже создана предыдущими item'ами; если
    для этого пилота ещё нет — создай от текущего HEAD). НЕ push, НЕ merge, НЕ rebase на основную.
  - INV2: НИКАКИХ `git stash`/`git reset`/`git checkout -f`/`git clean` в прод-репо.
  - INV3 (parity, если item меняет base-vars.css): гейт падает iff (removed ∪ changed переменных)
    ⊄ expectedVarDiff item'а (P-D35/P-D38) — added-переменные (канон-namespace рядом с легаси) НЕ
    блокируют сами по себе, логируй, не роняй. Baseline пилота — переиспользуй уже снятый (Baseline
    Completion Notes P5.1 для dterema / P5.5 для vintera), не переснимай заново, если он уже есть.
  - dterema (пользователь подтвердил 2026-07-13): ранняя разработка, НЕ держимся за текущую
    реализацию — можно вести к каноничной форме пакета, а не к байт-в-байт сохранению легаси, пока
    не теряются реальные данные/значения без причины. vintera — эталон регрессий (D17), строгий
    гейт как задумано, без послаблений.

Исполняй СТРОГО Scope Included; Implementation Rules и Code Guidance — жёсткие рамки, не
рекомендации. «Улучшить бы заодно» — в Pending Work, не делай (но если идея тянет на генерализацию
пакета для будущих пользователей, а не только этого пилота — вынеси её отдельным абзацем в конце
своего финального сообщения, не молчи о ней). Комментарии/тест-описания на русском. План разошёлся с
реальным кодом (файла нет, сигнатура другая) — НЕ импровизируй: останавливайся и опиши расхождение,
ничего не коммить.

Прогони Validation-команды item'а, почини красное в рамках Scope. Если item прод — прогони
parity-гейт (команда из Baseline Completion Notes) ДО коммита финального статуса. Закоммить (`git
add` конкретных путей, НЕ `-A`; сообщение на русском, тело — почему; НЕ push) в
{PILOT_REPO_OR_THEMEON}.

Затем ОБЯЗАТЕЛЬНО подними отдельного read-only adversarial-ревьюера через Agent tool
(subagent_type: general-purpose, model: opus, максимальный effort) на СВОЙ коммит — контекст:
item {ITEM_ID}, Scope/Code Guidance из P5.md. Фокус ровно на том, что parity по переменным не
ловит: визуальная регрессия при совпавших переменных, FOUC, SSR-рассинхрон, мёртвая копия старого
пайплайна, порядок каскада (@layer/<link>-размещение, P-D40). Severity LOW/MED/HIGH/CRITICAL, при
сомнении — выше. Если находки MED+ — почини сам, отдельным коммитом, перепрогони Validation (и
parity, если прод) заново.

В конце: обнови `phases/P5.md` (Status item'а — 🟢 Done / 🟠 Done with deviations + Known
Deviations / 🔴 Blocked с причиной; Completion Notes — только факты; Status Board §4 plan.md).
Перезапиши `handoff.md`. Синхронизируй копию плана в
`/home/vostrikov/Vaults/Brain/05-Projects/03-Packages/ThemeOn/plans/2026.07.12-BASE/` (rsync -a
--delete поверх, только плановые файлы).

Финал ответа — ОБЯЗАТЕЛЬНО: короткий статус (что сделано, вердикт review, что дальше) и ГОТОВЫЙ
К ВСТАВКЕ промпт для следующего item'а (возьми шаблон и следующий {ITEM_ID} из
`plans/2026.07.12-BASE/workflows/P5-manual-item-prompt.md`; если это был P5.10 — вместо промпта
следующего item'а выдай сводку закрытия фазы P5: терминальны ли все items, состояние обеих
migration-веток, чек-лист перед ручным merge, команды merge на каждый пилот).
```

## Подстановки по item'ам

| Текущий {ITEM_ID} | {PILOT_REPO_OR_THEMEON} | Следующий |
|:--|:--|:--|
| P5.3 | `~/projects/dterema/app`, ветка `themeon-migration/P5` | P5.4 |
| P5.4 | `~/projects/dterema/app`, ветка `themeon-migration/P5` | P5.5 |
| P5.5 | `~/projects/vintera/vintera` (создать ветку) | P5.6 |
| P5.6 | `~/projects/vintera/vintera`, ветка `themeon-migration/P5` | P5.7 |
| P5.7 | `~/projects/vintera/vintera`, ветка `themeon-migration/P5` | P5.8 |
| P5.8 | `~/projects/vintera/vintera`, ветка `themeon-migration/P5` | P5.9 |
| P5.9 | `~/projects/vintera/vintera`, ветка `themeon-migration/P5` | P5.10 |
| P5.10 | оба пилота, обе ветки `themeon-migration/P5` | — (закрытие фазы P5) |
