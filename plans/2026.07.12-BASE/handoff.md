# HANDOFF — 2026-07-14 — after P5.9 (доисполнение, ESCALATED)

**Next:** **ESCALATION-REQUIRED: P5.9 — конфликт правил (живая матрица тем строка 5 vs P-D49)**.
Требуется **plan-design** сессия, НЕ `plan-exec` — item P5.9 остаётся `🔴 Blocked` до ре-дизайна.

| Параметр | Значение |
|:--|:--|
| Model | **opus** |
| Thinking | **xhigh** (Routing `plan.md` §3 «P5 (пилоты) — opus/xhigh») |
| Context | **NEW SESSION — шаг-не-item** |
| Суть | Разрешить конфликт: акцептанс строки 5 живой матрицы тем P5.9 («после `init()` в хранилище — `'dark'`, не `''`») написан 2026-07-13, ДО закрытого 2026-07-14 решения **P-D49** (`init()` НЕ пишет в хранилище — персист только через явный `set()`). Актуализировать текст строки 5 Code Guidance/Validation `phases/P5.md` P5.9 под P-D49 (тема экрана обязана самоисцеляться — подтверждено живьём; персист-намерение НЕ переписывается — это осознанный контракт), решить, нужен ли новый D#, снять эскалацию, вернуть Status в `🟡 In progress`. |

```
/task:plan-design 2026.07.12-BASE P5.9
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P5.md` — item **P5.9** целиком, включая ДВА blockquote
   (ESCALATION 2026-07-13 разрешена + **ESCALATION 2026-07-14** — новая, эта сессия) и
   Completion Notes «Доисполнение 2026-07-14».
2. `plans/2026.07.12-BASE/plan.md` §5 Decision Log — **P-D49** (полный текст решения + RAG-источник).
3. `plans/2026.07.12-BASE/phases/P3.md` — item **P3.8** (где P-D49 принято) — контекст решения.

**Done (эта сессия — доисполнение P5.9 поверх закрытой фазы P8):**

- ThemeOn-монорепо: `pnpm build` (11 пакетов, свежий `dist` с фиксами P3.7/P3.8) на `9fe80c0`.
  `npx yalc publish` `@themeon/vue` + `@themeon/nuxt`.
- vintera (`themeon-migration/P5`): `npx yalc update` → фикс подтверждён в установленной копии
  (`grep trim()`) ДО живых прогонов → `yarn install` зелёный → коммит **`c8d5bee`**
  `chore(deps): P5.9 обновление yalc-копий @themeon/{vue,nuxt} после фикса P3.7` (17 файлов,
  только `.yalc/**` + `yalc.lock`, `package.json`/`yarn.lock` без изменений).
- **Гейты на `c8d5bee`:** parity `themeon-parity.mjs` (пересоздан в scratchpad, Code Guidance P5.1)
  → exit 0 (`base-vars.css` байт-в-байт не изменился с P5.8, `git diff --stat 6e84299 HEAD` пуст);
  `yarn typecheck` exit 0; `yarn lint` exit 0; `yarn test` **37/37**; `yarn lint:css`
  **0 errors / 122 warnings** (та же база P5.7/P5.8).
- **Живая матрица тем (Playwright/Chromium, `nuxt dev`):** первый прогон дал ложный негатив
  (стале Vite dep-optimize кэш держал допатчевую сборку `@themeon/vue` — `node_modules/.cache/vite`
  не инвалидировался авто-обновлением yalc-зависимости); `rm -rf node_modules/.cache .nuxt` + рестарт
  → повторный прогон: **5/6 строк полностью зелёные** (data-theme/`--color-bg-base`/body-фон верны
  во ВСЕХ строках 1–5, регресс-строки 1 и 5 включительно — тема на экране корректна на OS=dark без
  персиста и с отравленным `''`-персистом). Строка 5 частично красная только по хранилищу
  (`localStorage['theme']` остаётся `''`, акцептанс ждал самозапись `'dark'`) — см. ESCALATION.
- SSR-head/каскад-порядок (P-D40) подтверждён живьём (`<link base-vars.css>` первым перед
  app/Tailwind CSS); анти-FOUC инициализатор один.
- Обязательный adversarial-review (opus/xhigh) **НЕ проводился** — начинать его до снятия
  эскалации не имеет смысла: акцептанс, по которому ревьюер сверял бы строку 5, сам под вопросом.
- Полные детали, таблица матрицы, точные команды — `phases/P5.md` P5.9 Completion Notes
  «Доисполнение 2026-07-14».

**Remaining:**

1. **P5.9** — снять эскалацию (plan-design), затем доисполнить: обязательный adversarial-review
   (opus/xhigh) по коммиту `c8d5bee`, живая проверка строки 6 (тумблер UI, не прогонялась этой
   сессией — не относится к блокеру), закрытие item'а.
2. **P5.11 / P5.10** — по-прежнему за P5.9 в очереди.
3. **P6 / P7** — без изменений, скелет/backlog.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- vintera: `~/projects/vintera/vintera`, ветка `themeon-migration/P5`, `HEAD` = `c8d5bee`
  (родитель `4666633` = первая волна P5.9). Working tree несёт ПОСТОРОННИЙ дифф (файлы
  `.agents/skills/**`, `.swissknifeman/config.json`, `skills-lock.json`, untracked
  `.claude/analyst/`) — НЕ трогать, не мой Scope, не коммитить/не стэшить.
  Живой `nuxt dev` этой сессии остановлен (порт 3002, PID'ы убиты) — не оставлен висеть.
- dterema: не тронут этой сессией (P5.11 — отдельный item).
- Пакеты ThemeOn: `~/projects/packages/themeon/packages/*` — `HEAD` `9fe80c0`, дерево чистое
  (правок пакетов эта сессия не делала — P5 запрещает патчить пакеты из пилота).
- Scratchpad этой сессии (не переживёт сессию): `themeon-parity.mjs`, `p5.9-theme-matrix.mjs`,
  `p5.9-debug2.mjs` — код скриптов задокументирован в Completion Notes P5.9, воспроизводим с нуля
  по Code Guidance P5.1/P5.9 при следующей сессии.

**Open risks:**

- Ровно тот же класс «стале Vite dep-cache после yalc update» повторится при доисполнении P5.11
  (dterema) — Code Guidance P5.11 стоит предупредить `rm -rf node_modules/.cache .nuxt` ПЕРЕД живой
  матрицей, иначе тот же ложный негатив.
- Открытый Q3 `open-questions.md` (`@bg-dev/nuxt-naiveui`, владелец до merge веток) и
  P5.7/P5.8 собственные Escalation Needed (визуал-сайнофф) — не относятся к этой эскалации,
  остаются в очереди перед мёржем веток.
- Прочие Open risks фазы P8 (APCA-запас, двойной инстанс core в vite, dark-лестница контраста и
  т.д.) — без изменений, см. предыдущий handoff/`phases/P8.md` Phase Handoff.

**Workarounds / Deferred / Open questions:**

- **workarounds:** без изменений (см. предыдущий handoff — `spawnNuxtDev`, `GENERATED_BANNER_RE`).
- **deferred:** без изменений + добавить в Code Guidance P5.11 предупреждение о Vite dep-cache
  (см. Open risks выше) — сделать при plan-design P5.9, заодно с актуализацией строки 5.
- **open_questions:** Q3 (владелец `@bg-dev/nuxt-naiveui` до мёржа веток) остаётся открытым;
  Q4 — без изменений (частично поглощена P8).
