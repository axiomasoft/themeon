export const meta = {
  name: 'themeon-phase-dev',
  description: 'THEMEON: одна фаза Pn целиком — research+design детализация → per-item implement/review/fix/close',
  phases: [
    { title: 'Status' },
    { title: 'Research', detail: 'perplexity-web RAG fanout, только если фаза ещё не детализирована' },
    { title: 'Design', detail: 'модель по фазе (P-D17) — Definition of Detailed' },
    { title: 'Implement', detail: 'модель по plan.md §3 Routing' },
    { title: 'Review', detail: 'opus/xhigh, adversarial per коммиту item\'а' },
    { title: 'Fix', detail: 'sonnet/medium, только если review нашёл MED+' },
    { title: 'Close', detail: 'sonnet/low, реконсиляция по git-фактам' },
    { title: 'Wrap-up', detail: 'закрытие фазы, handoff.md, Update Log' },
  ],
}

// Инвариант: этот скрипт исполняет РОВНО одну фазу за вызов (args.phase), последовательно
// по item'ам — репозиторий один, мутации конкурентно идти не могут. P0 (уже сделана вручную)
// и P5 (пилоты трогают прод-репо dterema/vintera) сюда не входят: P5 исполняется отдельным
// скриптом `themeon-p5-pilots.js` с preflight/ветка/parity-гейтом.

const PLAN_ID = 'THEMEON'
// Плановые файлы синхронизированы в двух местах (Vault + копия в репо пакета) — путь
// параметризован, дефолт указывает на Vault (источник по plan.md §2 Execution Rules).
// Если синхронизация разъедется — передать args.planDir с актуальным путём.
const DEFAULT_PLAN_DIR = '/home/vostrikov/Vaults/Brain/05-Projects/03-Packages/ThemeOn/plans/2026.07.12-BASE'
const MIRROR_PLAN_DIR = '/home/vostrikov/projects/packages/themeon/plans/2026.07.12-BASE'
const REPO = '/home/vostrikov/projects/packages/themeon'

// Execution-стадия (implement per item) — plan.md §3 «Execution-стадия по item'ам».
const ROUTING = {
  P1: { model: 'opus', effort: 'high', why: 'публичный API-контракт (модель токенов, naming engine) — дорогая ошибка' },
  P2: { model: 'sonnet', effort: 'medium', why: 'дефолт' },
  P3: { model: 'sonnet', effort: 'medium', why: 'дефолт' },
  P4: { model: 'sonnet', effort: 'medium', why: 'дефолт' },
  P6: { model: 'sonnet', effort: 'medium', why: 'дефолт' },
  P7: { model: 'sonnet', effort: 'medium', why: 'дефолт, backlog' },
}
// Design-стадия (research+Definition of Detailed) — plan.md §3 «Design-стадия по фазам»,
// P-D17 (2026-07-12): по риску фазы.
// P-D32 (2026-07-13): fable удалена насовсем (не «временно недоступна», как предполагала
// отменённая P-D27) — высокорисковые дизайн-стадии роутятся на opus/xhigh, средние на
// opus/high. Модели fable в роутинге больше нет и не появится; откатывать нечего.
// P1/P2 в таблице оставлены как исторический факт (их дизайн делала fable, фазы закрыты) —
// на повторный прогон они уйдут на opus/xhigh по риску, как и P6.
const DESIGN_ROUTING = {
  P1: { model: 'opus', effort: 'xhigh', why: 'публичный API-контракт core (исторически спроектирована fable; фаза закрыта)' },
  P2: { model: 'opus', effort: 'xhigh', why: 'цветовая математика (OKLCH/APCA) + фундамент @layer для всех фаз — тонкая ошибка дорого расползается (исторически fable; фаза закрыта)' },
  P3: { model: 'opus', effort: 'high', why: 'протоптанные паттерны (антиФOUC/HMR, референс UnoCSS) — риск ниже P1/P2' },
  P4: { model: 'opus', effort: 'high', why: 'преимущественно маппинг конфигов/генерация — механическая фаза' },
  P6: { model: 'opus', effort: 'xhigh', why: 'multi-tenant patch API: final-audit H3 (2026-07-12) уже нашёл дизайн-дыру класса stored-XSS в скелете этой фазы — подтверждённый прецедент дороговизны экономии на дизайне' },
  P7: { model: 'sonnet', effort: 'high', why: 'backlog, низший приоритет' },
}
const EXCLUDED = {
  P0: 'уже исполнена вручную (P0.1/P0.2 закрыты 2026-07-07)',
  P5: 'пилоты трогают прод-репо dterema/vintera — свой скрипт `themeon-p5-pilots.js` (preflight на чистое дерево → миграция в ветке themeon-migration/P5 → parity-гейт по CSS-переменным → обязательный review; без push/merge)',
}

const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args
if (!parsedArgs || typeof parsedArgs.phase !== 'string') {
  throw new Error('Нужен args.phase, например {phase: "P1"} (опционально args.planDir для переопределения пути)')
}
const PHASE = parsedArgs.phase.trim().toUpperCase()
const PLAN_DIR = parsedArgs.planDir || DEFAULT_PLAN_DIR
if (EXCLUDED[PHASE]) {
  throw new Error(`${PHASE} исключена из автоматизированного workflow: ${EXCLUDED[PHASE]}`)
}
if (!ROUTING[PHASE] || !DESIGN_ROUTING[PHASE]) {
  throw new Error(`Неизвестная/неподдержанная фаза ${PHASE}. Разрешены: ${Object.keys(ROUTING).join(', ')}`)
}
const DESIGN_ROUTE = DESIGN_ROUTING[PHASE]
log(`THEMEON ${PHASE} — design route: ${DESIGN_ROUTE.model}/${DESIGN_ROUTE.effort} (${DESIGN_ROUTE.why})`)
const ROUTE = ROUTING[PHASE]
log(`THEMEON ${PHASE} — implement route: ${ROUTE.model}/${ROUTE.effort} (${ROUTE.why})`)

// ---------------------------------------------------------------------------
phase('Status')
const STATUS_SCHEMA = {
  type: 'object',
  required: ['alreadyDetailed', 'items'],
  properties: {
    alreadyDetailed: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'status'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
}
const status = await agent(
  `Прочитай ${PLAN_DIR}/plan.md §4 (Phase Index & Status Board) и ${PLAN_DIR}/phases/${PHASE}.md (если ` +
  `существует). alreadyDetailed=true только если ${PHASE}.md существует И у КАЖДОГО его item'а поля ` +
  `Code Guidance и Validation заполнены содержательно (не «—») — это Definition of Detailed из ` +
  `${PLAN_DIR}/plan.md §2а.4. items — список item'ов фазы ${PHASE}: id (Pn.m), title, status (одна из 6 ` +
  `канонических строк: ⬜ Not started / 🟡 In progress / 🟢 Done / 🟠 Done with deviations / 🔴 Blocked / ` +
  `⛔ Skipped by decision). Файла фазы ещё нет — верни items: [].`,
  { label: 'status', schema: STATUS_SCHEMA, model: 'sonnet', effort: 'low' }
)

let items = status.items

// ---------------------------------------------------------------------------
if (!status.alreadyDetailed) {
  phase('Research')
  const researchNote = await agent(
    `Design Program THEMEON (${PLAN_DIR}/plan.md §2а): углублённый RAG-research через perplexity-web ` +
    `ОБЯЗАТЕЛЕН перед детализацией фазы ${PHASE}. Прочитай ${PLAN_DIR}/plan.md §1 (Context) и §4 (краткий ` +
    `скоуп фазы ${PHASE}), ${PLAN_DIR}/00_MASTER_PLAN.md §5 (решения D1–D17 — не пересматривать молча). ` +
    `${PLAN_DIR}/20_research/R-01..R-07 НЕ переделывай — только углубляй точечными вопросами фазы (конкретные ` +
    `API затрагиваемых библиотек, edge-cases, свежие релизы — с версией и датой). Ищи через perplexity-web ` +
    `(search_advanced / search_deep). Запиши результат с URL-источниками в новый файл ` +
    `${PLAN_DIR}/20_research/R-1x_${PHASE}-<slug>.md (номер — следующий свободный после R-10). Верни краткое ` +
    `summary (что нашёл, ключевые ссылки и выводы) — уйдёт агенту детализации.`,
    { label: `research:${PHASE}`, phase: 'Research', model: DESIGN_ROUTE.model, effort: DESIGN_ROUTE.effort }
  )

  phase('Design')
  const DESIGN_SCHEMA = {
    type: 'object',
    required: ['items', 'escalation'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title'],
          properties: { id: { type: 'string' }, title: { type: 'string' } },
        },
      },
      escalation: { type: 'boolean' },
      notes: { type: 'string' },
    },
  }
  const design = await agent(
    `Роль — /task:plan-design ${PLAN_ID} ${PHASE} (модель по plan.md §3 «Design-стадия по фазам», P-D17: ` +
    `${DESIGN_ROUTE.model}/${DESIGN_ROUTE.effort} — ${DESIGN_ROUTE.why}). Research этого прогона: ${researchNote}\n\n` +
    `Прочитай целиком: ${PLAN_DIR}/plan.md, ${PLAN_DIR}/handoff.md, ${PLAN_DIR}/00_MASTER_PLAN.md §5 (D1–D17), ` +
    `${PLAN_DIR}/phases/${PHASE}.md (если скелет уже есть). Доразверни/создай ${PLAN_DIR}/phases/${PHASE}.md ` +
    `до Definition of Detailed (plan.md §2а.4): полная файловая структура затрагиваемых пакетов, сигнатуры ` +
    `публичного API целиком (TS-интерфейсы), схемы/алгоритмы словами + примеры вход→выход, референсы ` +
    `(URL + конкретный файл/строки донора dterema/vintera/octoclick, если паттерн заимствуется), критерии ` +
    `приёмки и шаги верификации per item, явные не-цели фазы. Формат item'а СТРОГО по plan-protocol: заголовок ` +
    `"### Pn.m — Title", поля "**Поле:** значение" в порядке Status/Intent/Why/Scope Included/Scope Excluded/` +
    `Inputs/Files/Required Reads/Implementation Rules/Code Guidance/Validation/Deliverables/Completion Notes/` +
    `Pending Work/Known Deviations/Escalation Needed; пустое поле — символ «—». Каждый item обязан быть исполним ` +
    `sonnet'ом без доп. контекста (Code Guidance обязателен: стиль решения, запреты, обязательные тесты). ` +
    `Обнови Status Board (${PLAN_DIR}/plan.md §4) для фазы ${PHASE}. Спорные архитектурные решения фиксируй сам ` +
    `новой строкой P-D<следующий> в ${PLAN_DIR}/plan.md §5 Decision Log — НЕ выноси вопросом пользователю. ` +
    `Перезапиши ${PLAN_DIR}/handoff.md целиком по схеме HANDOFF (plan-protocol). Прогони plan-lint, если доступен ` +
    `(\`python3 "$CLAUDE_PLUGIN_ROOT/scripts/plan-lint.py" plans/${PLAN_ID}\`; нет переменной/скрипта — пропусти). ` +
    `Если сама архитектура фазы неочевидна настолько, что решение обязан принять человек (не рутинный ` +
    `trade-off) — верни escalation=true с причиной в notes и НИЧЕГО не пиши в phases/${PHASE}.md. Иначе верни ` +
    `items: список ${PHASE}.m (id, title) в порядке исполнения.`,
    { label: `design:${PHASE}`, phase: 'Design', model: DESIGN_ROUTE.model, effort: DESIGN_ROUTE.effort, schema: DESIGN_SCHEMA }
  )

  if (design.escalation) {
    log(`ESCALATION при детализации ${PHASE}: ${design.notes}`)
    return { phase: PHASE, stoppedAt: 'design', reason: design.notes }
  }
  items = design.items.map(i => ({ id: i.id, title: i.title, status: '⬜ Not started' }))
}

const pending = items.filter(i => !/🟢|🟠|⛔/.test(i.status))
if (pending.length === 0) {
  log(`${PHASE}: все items уже терминальны — сразу Wrap-up`)
}

// ---------------------------------------------------------------------------
const IMPLEMENT_SCHEMA = {
  type: 'object',
  required: ['status', 'escalation'],
  properties: {
    status: { type: 'string' },
    escalation: { type: 'boolean' },
    escalationReason: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    commitSha: { type: 'string' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object',
  required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['GREEN', 'ATTENTION', 'RED'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'summary', 'failure_scenario'],
        properties: {
          severity: { type: 'string', enum: ['LOW', 'MED', 'HIGH', 'CRITICAL'] },
          file: { type: 'string' },
          summary: { type: 'string' },
          failure_scenario: { type: 'string' },
        },
      },
    },
  },
}
const CLOSE_SCHEMA = {
  type: 'object',
  required: ['reconciledStatus'],
  properties: { reconciledStatus: { type: 'string' }, notes: { type: 'string' } },
}

const results = []
for (const item of pending) {
  phase('Implement')
  const impl = await agent(
    `Роль — /task:plan-exec ${PLAN_ID} ${item.id} (дефолт Sonnet/medium — здесь запинено ` +
    `${ROUTE.model}/${ROUTE.effort} по ${PLAN_DIR}/plan.md §3 Routing: ${ROUTE.why}). Порядок чтения СТРОГО: ` +
    `1) ${PLAN_DIR}/plan.md (Context/Execution Rules/Routing/Status Board) 2) ${PLAN_DIR}/handoff.md ` +
    `3) ${PLAN_DIR}/phases/${PHASE}.md — Phase Context + item ${item.id} целиком 4) файлы из Required Reads ` +
    `item'а, в указанном порядке. Повторное чтение уже прочитанного и «почитаю ещё по репо на всякий случай» — ` +
    `запрещено. Репозиторий пакета (отдельная git-история от vault) — ${REPO}. Исполняй СТРОГО Scope Included; ` +
    `Implementation Rules и Code Guidance — жёсткие рамки, не рекомендации. «Улучшить бы заодно» — запиши в ` +
    `Pending Work item'а, не делай. Код: комментарии/тест-описания на русском (general:writing-style), ` +
    `публичные README/JSDoc — английский (OSS). План разошёлся с реальным кодом (файла нет, сигнатура другая, ` +
    `якорь не находится) — НЕ импровизируй, НЕ чини план на ходу: верни escalation=true с причиной, ничего не ` +
    `коммить. Иначе: прогони каждую команду из Validation item'а, почини красное в рамках Scope. Закоммить в ` +
    `${REPO} (\`git add\` конкретных путей, НЕ -A; сообщение на русском, тело — почему по general:git-commit-` +
    `rules; НЕ push). В ${PLAN_DIR}/phases/${PHASE}.md обнови статус item'а на 🟢 Done (или 🟠 Done with ` +
    `deviations + заполненные Known Deviations) и Completion Notes (только факты: изменённые файлы, добавленные ` +
    `тесты, прогнанные команды и их вывод — без оценок). Верни status, escalation, filesChanged, commitSha ` +
    `(\`git -C ${REPO} rev-parse --short HEAD\`).`,
    { label: `impl:${item.id}`, phase: 'Implement', model: ROUTE.model, effort: ROUTE.effort, schema: IMPLEMENT_SCHEMA }
  )

  if (impl.escalation) {
    log(`ESCALATION ${item.id}: ${impl.escalationReason} — фаза ${PHASE} остановлена, дальше не идём`)
    results.push({ item: item.id, stage: 'implement', escalation: true, reason: impl.escalationReason })
    break
  }

  phase('Review')
  const review = await agent(
    `Роль — /task:review (read-only, adversarial). Ревьюишь ${REPO}: коммит ${impl.commitSha || 'HEAD'} — ` +
    `\`git -C ${REPO} show ${impl.commitSha || 'HEAD'}\`, только этот коммит, не весь репозиторий. Контекст: ` +
    `item ${item.id} фазы ${PHASE} плана ${PLAN_ID}, Scope/Code Guidance — ${PLAN_DIR}/phases/${PHASE}.md. ` +
    `Глубину масштабируй под риск (blast-radius: concurrency/transactions/data-integrity/public API/SemVer — ` +
    `adversarial: сперва failure-modes, затем для каждого конкретный сценарий сбоя). Severity ∈ {LOW,MED,HIGH,` +
    `CRITICAL}, при сомнении — выше, сам не отбрасывай. Файлы НЕ меняй.`,
    { label: `review:${item.id}`, phase: 'Review', model: 'opus', effort: 'xhigh', schema: REVIEW_SCHEMA }
  )

  const blocking = review.findings.filter(f => f.severity !== 'LOW')
  if (blocking.length > 0) {
    phase('Fix')
    await agent(
      `Роль — /task:fix (token-frugal, один проход, без fan-out). В ${REPO} почини находки код-ревью item'а ` +
      `${item.id} фазы ${PHASE}: ${JSON.stringify(blocking)}. Selective-input — читай только затронутые срезы, ` +
      `не файлы целиком. Минимальное изменение под находку, без абстракций «на вырост». Перепрогони Validation-` +
      `команды item'а (${PLAN_DIR}/phases/${PHASE}.md). Закоммить ОТДЕЛЬНЫМ коммитом (не amend), сообщение на ` +
      `русском с указанием, какую находку чинит. НЕ push.`,
      { label: `fix:${item.id}`, phase: 'Fix', model: 'sonnet', effort: 'medium' }
    )
  }

  phase('Close')
  const close = await agent(
    `Роль — /task:plan-close ${PLAN_ID} ${item.id} (Sonnet/low — механическая сверка, правки статусов ТОЛЬКО ` +
    `по фактам). НЕ доверяй Completion Notes на слово — сверь заявленное с git-фактами в ${REPO} (\`git log ` +
    `--oneline\`, \`git diff\` по Files item'а). Прогони Validation-команды сам. Файлы item'а не закоммичены ` +
    `(есть в \`git -C ${REPO} status --short\`) → статус НЕ 🟢: верни/оставь 🟡 In progress или 🔴 Blocked с ` +
    `причиной. Подтверждено → 🟢 Done (или 🟠 Done with deviations + Known Deviations). Синхронизируй Phase ` +
    `Status в ${PLAN_DIR}/phases/${PHASE}.md и Status Board (§4) в ${PLAN_DIR}/plan.md. Перезапиши ` +
    `${PLAN_DIR}/handoff.md целиком (Next: следующий item фазы или Wrap-up, если это был последний). Верни ` +
    `reconciledStatus.`,
    { label: `close:${item.id}`, phase: 'Close', model: 'sonnet', effort: 'low', schema: CLOSE_SCHEMA }
  )

  log(`${item.id}: ${close.reconciledStatus} (review ${review.verdict}, ${blocking.length} находок почищено)`)
  results.push({
    item: item.id,
    status: close.reconciledStatus,
    reviewVerdict: review.verdict,
    findings: review.findings.length,
  })
}

// ---------------------------------------------------------------------------
phase('Wrap-up')
const wrap = await agent(
  `Роль — /task:plan-close ${PLAN_ID} ${PHASE} (закрытие фазы целиком). Все items фазы терминальны ` +
  `(🟢/🟠/⛔)? Прочитай ${PLAN_DIR}/phases/${PHASE}.md Phase Status и ${PLAN_DIR}/plan.md §4 Status Board. Есть ` +
  `нетерминальные (эскалация остановила прогон раньше) — перечисли их и НЕ закрывай фазу частично. Иначе: ` +
  `\`git -C ${REPO} status --short\` — файлы вне объединения Files всех item'ов фазы — предупреди списком, не ` +
  `закрывай молча. Сведи таблицы: Phase Status ↔ Status Board §4 (Items 🟢/всего, статус фазы). Заполни Phase ` +
  `Handoff в ${PHASE}.md (что сдали, известные отклонения — агрегат Known Deviations, что дальше). Перезапиши ` +
  `${PLAN_DIR}/handoff.md (Next: первый item следующей фазы, или «план ждёт следующего /workflow:themeon-phase-` +
  `dev»). Допиши строку в ${PLAN_DIR}/plan.md §6 Update Log. Если фаза закрыта и это последняя нетерминальная ` +
  `фаза плана — обнови plans/ACTIVE.md и §0 Status плана. Прогони plan-lint, если доступен. Верни короткий ` +
  `отчёт: закрыта ли фаза, что дальше (готовая команда следующего вызова).`,
  { label: `wrapup:${PHASE}`, phase: 'Wrap-up', model: 'sonnet', effort: 'low' }
)

log(wrap)

// ---------------------------------------------------------------------------
const OTHER_DIR = PLAN_DIR === DEFAULT_PLAN_DIR ? MIRROR_PLAN_DIR : DEFAULT_PLAN_DIR
phase('Wrap-up')
await agent(
  `Плановые файлы держатся синхронизированными в двух местах: ${PLAN_DIR} (только что писали сюда) и ` +
  `${OTHER_DIR} (зеркало). Сверь через diff -rq, и если есть расхождения — зеркалируй ${PLAN_DIR} поверх ` +
  `${OTHER_DIR} (rsync -a --delete, только файлы плана, не трогай ничего вне этих директорий). Ничего не ` +
  `коммить в git — это просто held-in-sync копия. Если ${OTHER_DIR} не существует — создай её как копию. ` +
  `Верни коротко: были расхождения или нет.`,
  { label: 'sync-plan-dirs', phase: 'Wrap-up', model: 'sonnet', effort: 'low' }
)

return { phase: PHASE, route: ROUTE, items: results, wrapup: wrap }
