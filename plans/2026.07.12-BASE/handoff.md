# HANDOFF — 2026-07-15 — after P5.11

**Next:** **P5.10 (оба пилота)** — ПОСЛЕДНИЙ item фазы P5: снять `aliases: legacy-v0` в обоих
пилотах (`themeon build` без `--aliases`), `themeon check --coverage` (ноль dead-ref), визуал
light+dark, canon-parity (канон-значения не поехали), обязательный adversarial-review (opus/xhigh)
на КАЖДОГО пилота, закрыть item и фазу P5.

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (Routing `plan.md` §3: P5 (пилоты) — sonnet/medium, + ОБЯЗАТЕЛЬНЫЙ adversarial-review opus/xhigh + parity-гейт по CSS-переменным; ВРУЧНУЮ) |
| Context | **continue (/clear) — ручной item** |
| Суть | Оба пилота: снять `--aliases legacy-v0` из `gen:styles`, заменить оставшиеся `var(--<легаси>)`-ссылки на канон (карта — `legacy-v0.ts`), `themeon check --coverage` до нуля, canon-parity (флаттен-значения канон-имён без изменений vs Baseline-с-алиасами), визуал, adversarial-review на каждый пилот. ТЗ — `phases/P5.md` P5.10 целиком (включая `expectedVarDiff`). Гейт входа: P5.9 И P5.11 закрыты (оба закрыты). |

```
/task:plan-exec 2026.07.12-BASE P5.10
```

**Cold-start reads (по порядку):**

1. `plans/2026.07.12-BASE/phases/P5.md` — item **P5.10** целиком (Scope/Files/Inputs/Implementation
   Rules/Code Guidance/Validation/`expectedVarDiff`).
2. `plans/2026.07.12-BASE/phases/P5.md` — P5.9 Completion Notes (эталон прогона на vintera: yalc/
   parity/матрица/review).
3. `plans/2026.07.12-BASE/phases/P5.md` — P5.11 Completion Notes (эталон на dterema, эта сессия).
4. `packages/core/src/aliases/legacy-v0.ts` — полная карта легаси→канон.
5. Код: живые dterema (`~/projects/dterema/app`, ветка `themeon-migration/P5`, HEAD `c0bb850`) и
   vintera (`~/projects/vintera/vintera`, ветка `themeon-migration/P5`, HEAD `64c629d`).

**Суть закрытого item'а (одним абзацем):** P5.11 (dterema) закрыта 🟠 Done with deviations —
подтянул в ветку `themeon-migration/P5` yalc-копии `@themeon/{vue,nuxt}`, несущие фикс P3.7
(`asThemeName`-классификатор: пустая/пробельная строка не считается именем темы, чинит
Nuxt-runtimeConfig-коерс `default: ''` → правильно резолвится в `'system'`, а не в невалидное имя,
убивавшее `prefers-color-scheme`-фолбэк). Item-коммит **`c0bb850`** — дифф строго dep-only
(`.yalc/@themeon/{vue,nuxt}/**` + `yalc.lock`, 17 файлов), `app/**` и `nuxt.config.ts` не тронуты.
Живая матрица тем (Playwright/Chromium, 6 строк, редакция P-D64/P-D65) — все зелёные по обеим
колонкам, включая новую строку 6 (живое следование за ОС без reload). Parity/typecheck/test —
зелёные; `yarn lint` красный (4 pre-existing `@typescript-eslint/no-explicit-any` в
`app/types/api.d.ts`, внесены посторонним коммитом `6d7d274` ДО начала item'а, вне `Files`
item'а — не чинится в рамках Scope) — единственная причина статуса 🟠 вместо 🟢. Обязательный
adversarial-review (opus, read-only, по `c0bb850`) — независимо воспроизвёл все 8 пунктов предмета
ревью, **0 Blocker / 0 Major / 0 Minor / 2 Informational**.

**Done:** (эта сессия — `/task:plan-exec 2026.07.12-BASE P5.11`)

- **P5.11 закрыт 🟠 Done with deviations.** dterema (`themeon-migration/P5`, вход `HEAD` `821b561`):
  ThemeOn-монорепо `packages/vue`/`packages/nuxt` dist уже нёс свежую сборку P3.7 — `npx yalc publish`
  в обоих → dterema `npx yalc update @themeon/vue @themeon/nuxt` → фикс подтверждён в установленной
  копии (`grep asThemeName`) ДО живых прогонов → `yarn install` (без resolutions-конфликтов,
  `package.json`/`yarn.lock` без диффа) → `git add -f package.json yarn.lock .yalc yalc.lock` →
  коммит **`c0bb850`**. Между вход-HEAD и item-коммитом на ветке легли 4 посторонних коммита
  владельца (`1ab6aeb`, `ec7bb31`, `6d7d274`, `81f8573`) — не трогали ThemeOn-related пути, не
  тронуты этой сессией.
- Parity-baseline `baseline-dterema.json` был утерян между сессиями (scratchpad не пережил сессию) —
  пересоздан методом P5.1 (снимок текущего `base-vars.css`, который этой сессией не менялся). Гейт
  → **exit 0**.
- Гейты: `yarn typecheck` → exit 0; `yarn test` → exit 0 (0 test files, штатно для dterema);
  `yarn lint` → **exit 1**, 4 pre-existing ошибки вне Scope (Known Deviations).
- Живая матрица тем (Playwright 1.58.2/Chromium, `nuxt dev` порт 3000, `rm -rf node_modules/.cache
  .nuxt` до старта, `networkidle`+settle-методология) — **6/6 зелёные** по обеим колонкам. SSR-head:
  анти-FOUC → `<link base-vars.css>` → app-CSS, один анти-FOUC-инициализатор (P-D40 подтверждён).
- Обязательный adversarial-review (opus, read-only, `c0bb850`) — **0 Blocker/Major/Minor**, 2
  Informational (0 test files в dterema; `.yalc`-пакеты `version:"0.0.0"`, штатно).
- Bookkeeping: `phases/P5.md` (Status P5.11 🟠, Phase Status таблица, Completion Notes, Pending
  Work, Known Deviations); `plan.md` (§4 Status Board P5 9/11→10/11, Meta Status/Last Updated,
  §6 Update Log).

**Remaining:**

1. **P5.10** (СЛЕДУЮЩИЙ, ПОСЛЕДНИЙ item фазы P5) — оба пилота: снятие легаси-алиасов, coverage,
   визуал, canon-parity, adversarial-review ×2. Гейт входа выполнен (P5.9 И P5.11 закрыты).
2. **`/task:plan-close 2026.07.12-BASE P8`** — формальное перезакрытие фазы P8 (снятие маркера
   УСТАРЕЛ в Phase Handoff), не блокирует P5.10 — можно сделать в любой момент до архивации плана.
3. **P6 / P7** — без изменений, скелет/backlog.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Пакеты ThemeOn: `~/projects/packages/themeon/packages/*`, `HEAD` `f9d5279` (дерево не менялось
  этой сессией — только `npx yalc publish` тех же исходников `packages/vue`/`packages/nuxt`).
- dterema: `~/projects/dterema/app`, ветка `themeon-migration/P5`, **`HEAD` = `c0bb850`**. Working
  tree чист. 4 посторонних коммита владельца между `821b561` и `c0bb850` — не трогать, не относятся
  к ThemeOn.
- vintera: `~/projects/vintera/vintera`, ветка `themeon-migration/P5`, `HEAD` `64c629d` (не тронут
  этой сессией). Working tree несёт посторонний дифф (`.agents/skills/**` и т.п.) — не трогать.

**Open risks:**

- **`app/types/api.d.ts` (dterema) несёт 4 `@typescript-eslint/no-explicit-any` ошибки** (коммит
  `6d7d274`, вне ThemeOn-плана) — `yarn lint` красный на этой ветке до отдельного фикса владельцем;
  P5.10 столкнётся с тем же красным `yarn lint`, если его Validation тоже требует exit 0 — учитывать
  при закрытии.
- **`baseline-dterema.json`/`baseline-vintera-*.json` живут в scratchpad, не в git** — каждая новая
  сессия на пилотах теряет их и обязана пересоздавать методом P5.1 (снимок текущего файла без
  `--against`, если файл не менялся сессией; иначе — снимок ДО правок).
- P8.15 pre-mortem (P-D67, наследуется): Tailwind 5 сменит набор дефолт-слоёв → statement устареет.
- Стале Vite dep-cache — чистить `node_modules/.cache .nuxt` ДО `nuxt dev` на обоих пилотах (тот же
  класс ложного негатива, что был в P5.9/P5.11); при живой матрице использовать `networkidle`+settle
  (500–700мс), не `waitUntil:'load'` без задержки — иначе ложный негатив по строке 6 (гидратация не
  успевает).

**Workarounds / Deferred / Open questions:**

- **Q6** — легаси-персист донора: чистить `localStorage['theme']` на мёрже? Владельцу, до merge
  веток (P-D66). P5.10 не блокирует.
- **Q3** — судьба `@bg-dev/nuxt-naiveui` (владельцу, до merge).
- P5.7/P5.8 — собственные merge-time эскалации (визуал-сайнофф сдвига порогов + мёртвая полоса
  `Catalog.vue` 993–1023px). Перед мёржем веток, не перед закрытием P5.10.
