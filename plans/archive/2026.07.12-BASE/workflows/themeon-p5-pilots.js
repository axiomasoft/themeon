export const meta = {
  name: 'themeon-p5-pilots',
  description: 'THEMEON P5: пилотная миграция dterema → vintera на ThemeOn, в изолированной ветке, с parity-гейтом (diff CSS-переменных обязан быть пустым)',
  phases: [
    { title: 'Preflight', detail: 'sonnet/low — прод-репо чисты и пригодны к ветке; иначе стоп' },
    { title: 'Research', detail: 'opus/high + perplexity-web, только если фаза ещё не детализирована' },
    { title: 'Design', detail: 'opus/xhigh (P-D32) — Definition of Detailed для P5' },
    { title: 'Baseline', detail: 'sonnet/low — снимок CSS-переменных ДО миграции (эталон parity)' },
    { title: 'Implement', detail: 'sonnet/medium — миграция item\'а в ветке пилота, коммит без push' },
    { title: 'Parity', detail: 'sonnet/low — diff переменных ПОСЛЕ vs baseline; непустой без явного разрешения = стоп' },
    { title: 'Review', detail: 'opus/xhigh, adversarial (обязателен per plan.md §3 Routing)' },
    { title: 'Fix', detail: 'sonnet/medium, только если review нашёл MED+' },
    { title: 'Close', detail: 'sonnet/low — реконсиляция по git-фактам' },
    { title: 'Wrap-up', detail: 'закрытие фазы, handoff.md, Update Log, инструкция по ручному merge' },
  ],
}

// P5 — единственная фаза, которая мутирует ЧУЖИЕ прод-репозитории (dterema/vintera), а не
// сам пакет. Поэтому она вынесена из themeon-phase-dev.js в отдельный скрипт с тремя
// защитами, которых нет в обычном phase-dev:
//
//   1. Preflight — прод-репо обязан быть с чистым working tree. Скрипт НИКОГДА не делает
//      `git stash`/`git checkout -f`/`git reset` в чужом репо: незакоммиченная работа
//      пользователя дороже автопрогона. Грязно → стоп с инструкцией, что сделать руками.
//   2. Ветка `themeon-migration/P5` — вся миграция коммитится ТОЛЬКО туда, от текущего HEAD
//      пилота. Никогда не push, никогда не merge — это решение человека.
//   3. Parity-гейт — обязателен по plan.md §2 Execution Rules и 00_MASTER_PLAN.md §D5/D17:
//      при `aliases: 'legacy-v0'` множество генерируемых CSS-переменных ДО и ПОСЛЕ миграции
//      обязано совпадать. Непустой diff = регрессия прод-стилей, фаза стопается.
//      Исключения — только те, что item явно объявил в Scope Included (например починка
//      битых `--size-2-xl`): их item обязан перечислить в поле expectedVarDiff.
//
// Запуск: Workflow tool, scriptPath на этот файл, args не обязательны.
//   {phase: "P5"}                       — как есть
//   {onlyItems: ["P5.1", "P5.2"]}       — прогнать подмножество item'ов
//   {planDir: "..."}                    — если Vault/зеркало разъехались
//
// P-D32 (2026-07-13): fable удалена насовсем — design-стадия высокого риска роутится на
// opus/xhigh. Строка P-D27 («fable временно недоступна, вернуть когда появится») — устарела.

const PLAN_ID = 'THEMEON'
const DEFAULT_PLAN_DIR = '/home/vostrikov/Vaults/Brain/05-Projects/03-Packages/ThemeOn/plans/2026.07.12-BASE'
const MIRROR_PLAN_DIR = '/home/vostrikov/projects/packages/themeon/plans/2026.07.12-BASE'
const REPO = '/home/vostrikov/projects/packages/themeon'

// Пилоты — прод-фронтенды (D17: dterema эталон → vintera ловит регрессии). Пути выверены
// 2026-07-13: контейнерная папка ~/projects/<name>/ содержит несколько проектов, git-репо
// фронтенда лежит на уровень глубже.
const PILOTS = [
  {
    key: 'dterema',
    repo: '/home/vostrikov/projects/dterema/app',
    why: 'эталон: дисциплинированный донор паттерна (R-01), diff переменных обязан быть строго пустым',
  },
  {
    key: 'vintera',
    repo: '/home/vostrikov/projects/vintera/vintera',
    why: 'ловим регрессии: хардкод hex в 10 файлах, breakpoints ×3 с разными шкалами, мёртвый HMR-watcher (R-02)',
  },
]
const MIGRATION_BRANCH = 'themeon-migration/P5'

const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args
const PHASE = ((parsedArgs && parsedArgs.phase) || 'P5').trim().toUpperCase()
if (PHASE !== 'P5') {
  throw new Error(`Этот скрипт исполняет только P5 (пилоты). Для остальных фаз — themeon-phase-dev.js. Получено: ${PHASE}`)
}
const PLAN_DIR = (parsedArgs && parsedArgs.planDir) || DEFAULT_PLAN_DIR
const ONLY_ITEMS = (parsedArgs && parsedArgs.onlyItems) || null

// ---------------------------------------------------------------------------
phase('Preflight')
const PREFLIGHT_SCHEMA = {
  type: 'object',
  required: ['pilots', 'safeToProceed'],
  properties: {
    safeToProceed: { type: 'boolean' },
    blockReason: { type: 'string' },
    pilots: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'clean', 'currentBranch'],
        properties: {
          key: { type: 'string' },
          clean: { type: 'boolean' },
          currentBranch: { type: 'string' },
          headSha: { type: 'string' },
          dirtyFiles: { type: 'integer' },
          migrationBranchExists: { type: 'boolean' },
        },
      },
    },
  },
}
const preflight = await agent(
  `Preflight перед пилотной миграцией THEMEON P5 — только ФАКТЫ, ничего не меняй, ничего не чини.\n\n` +
  `Для каждого прод-репозитория пилота:\n` +
  PILOTS.map(p => `  - ${p.key}: ${p.repo}`).join('\n') + '\n\n' +
  `Собери: currentBranch (\`git -C <repo> branch --show-current\`), headSha (\`rev-parse --short HEAD\`), ` +
  `clean (\`git -C <repo> status --short\` пуст) и dirtyFiles (число строк в нём), migrationBranchExists ` +
  `(\`git -C <repo> branch --list ${MIGRATION_BRANCH}\` непуст).\n\n` +
  `safeToProceed=true ТОЛЬКО если working tree ЧИСТ у ВСЕХ пилотов. Грязный tree — жёсткий блокер: ` +
  `в чужом прод-репо незакоммиченная работа пользователя, и мы НЕ имеем права её stash'ить, ресетить ` +
  `или коммитить. safeToProceed=false + blockReason с перечислением грязных репо и числом файлов.\n\n` +
  `Также убедись, что сам пакет ${REPO} собран и его CLI работает (\`git -C ${REPO} log --oneline -1\`, ` +
  `наличие packages/cli). Пакет не готов — тоже safeToProceed=false.`,
  { label: 'preflight', phase: 'Preflight', model: 'sonnet', effort: 'low', schema: PREFLIGHT_SCHEMA }
)

if (!preflight.safeToProceed) {
  log(`P5 ОСТАНОВЛЕНА на preflight: ${preflight.blockReason}`)
  return {
    phase: PHASE,
    stoppedAt: 'preflight',
    reason: preflight.blockReason,
    pilots: preflight.pilots,
    next: `Закоммить/убрать локальные правки в прод-репо пилотов, затем перезапустить workflow. ` +
      `Скрипт намеренно НЕ трогает грязное дерево сам.`,
  }
}
log(`Preflight OK: ${preflight.pilots.map(p => `${p.key}@${p.currentBranch} (${p.headSha})`).join(', ')}`)

// ---------------------------------------------------------------------------
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
          pilot: { type: 'string' },
        },
      },
    },
  },
}
const status = await agent(
  `Прочитай ${PLAN_DIR}/plan.md §4 (Phase Index & Status Board) и ${PLAN_DIR}/phases/P5.md. ` +
  `alreadyDetailed=true если у КАЖДОГО item'а P5, который встречается в файле СЕЙЧАС, поля Code Guidance и ` +
  `Validation заполнены содержательно (не «—») — Definition of Detailed из ${PLAN_DIR}/plan.md §2а.4. Не ` +
  `предполагай заранее, каким будет вердикт — файл мог быть уже детализирован и частично исполнен в прошлых ` +
  `прогонах; решай строго по текущему содержимому. items — список item'ов: id (P5.m), title, status — ` +
  `СКОПИРУЙ ДОСЛОВНО строку из поля "**Status:**" файла, ВКЛЮЧАЯ эмодзи (напр. "🟠 Done with deviations", ` +
  `НЕ просто "Done with deviations") — от этого зависит, какие item'ы автопрогон сочтёт уже завершёнными и ` +
  `не тронет повторно, pilot (dterema | vintera | both | none — какой прод-репо трогает item, если понятно ` +
  `из названия; иначе "none").`,
  { label: 'status', phase: 'Preflight', schema: STATUS_SCHEMA, model: 'sonnet', effort: 'low' }
)

let items = status.items

// ---------------------------------------------------------------------------
if (!status.alreadyDetailed) {
  phase('Research')
  const researchNote = await agent(
    `Design Program THEMEON (${PLAN_DIR}/plan.md §2а.3): углублённый RAG-research через perplexity-web ` +
    `ОБЯЗАТЕЛЕН перед детализацией фазы P5. Прочитай ${PLAN_DIR}/plan.md §1 (Context), §4 (скоуп P5), ` +
    `${PLAN_DIR}/00_MASTER_PLAN.md §5 (D1–D17 — не пересматривать молча, особо D5 легаси-алиасы, D14 ` +
    `breakpoints, D17 пилот-порядок), а также ${PLAN_DIR}/20_research/R-01_dterema-theming.md и ` +
    `R-02_vintera-theming.md (код-аудиты доноров — база, НЕ переделывай).\n\n` +
    `Фаза P5 — не про новый код пакета, а про МИГРАЦИЮ живых Nuxt-проектов на уже готовый ThemeOn. ` +
    `Углубляй точечно ровно то, что нужно для безопасной миграции прод-фронтенда: стратегии ` +
    `incremental CSS-variable migration без визуальных регрессий; как надёжно снимать и сравнивать ` +
    `множество вычисленных CSS custom properties (что реально считается «пустым diff» — порядок, ` +
    `whitespace, вычисленные vs объявленные значения); миграция Sass-проекта на native-CSS-vars-пакет; ` +
    `Tailwind v4 \`@theme inline\` мост поверх существующего ручного tailwind.css (vintera); подводные ` +
    `камни Nuxt 4 при замене локального theme-модуля на внешний пакет (layers, auto-imports, порядок ` +
    `css.push, анти-FOUC). Каждый внешний факт — с URL и датой (plan.md §2: без источника → [UNVERIFIED]).\n\n` +
    `Запиши результат в ${PLAN_DIR}/20_research/R-15_P5-pilots.md. Верни краткое summary (ключевые выводы ` +
    `и ссылки) — уйдёт агенту детализации.`,
    { label: 'research:P5', phase: 'Research', model: 'opus', effort: 'high' }
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
          required: ['id', 'title', 'pilot'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            pilot: { type: 'string', enum: ['dterema', 'vintera', 'both', 'none'] },
            expectedVarDiff: {
              type: 'array',
              description: 'CSS-переменные, чьё изменение этот item ЯВНО санкционирует (напр. починка --size-2-xl). Пусто = diff обязан быть строго пустым.',
              items: { type: 'string' },
            },
          },
        },
      },
      escalation: { type: 'boolean' },
      notes: { type: 'string' },
    },
  }
  const design = await agent(
    `Роль — /task:plan-design ${PLAN_ID} P5 (opus/xhigh по ${PLAN_DIR}/plan.md §3 «Design-стадия по фазам», ` +
    `P-D32: fable удалена, высокорисковые дизайн-стадии → opus/xhigh). P5 — прод-риск: ошибка дизайна тут ` +
    `ломает живые сайты dterema/vintera, поэтому детализация обязана быть исполнима sonnet'ом без единого ` +
    `самостоятельного решения.\n\nResearch этого прогона: ${researchNote}\n\n` +
    `Прочитай целиком: ${PLAN_DIR}/plan.md, ${PLAN_DIR}/handoff.md, ${PLAN_DIR}/00_MASTER_PLAN.md §5 (D1–D17), ` +
    `${PLAN_DIR}/phases/P5.md (скелет), ${PLAN_DIR}/20_research/R-01_dterema-theming.md, R-02_vintera-theming.md. ` +
    `Изучи фактическое состояние пилотов (read-only): ${PILOTS.map(p => p.repo).join(', ')} — что там сейчас ` +
    `лежит в app/config/theme/, utils/, scripts/, modules/, и что именно заменяется пакетом.\n\n` +
    `Разверни ${PLAN_DIR}/phases/P5.md до Definition of Detailed (plan.md §2а.4). Скоуп фазы (plan.md §4 + ` +
    `00_MASTER_PLAN §5 D17):\n` +
    `  — dterema (эталон, aliases: 'legacy-v0'): заменить config/theme + utils + scripts + modules на пакет; ` +
    `зафиксировать ПУСТОЙ diff генерируемых CSS-переменных; починить класс битых ссылок --size-2-xl; свести ` +
    `breakpoints к одному источнику (D14);\n` +
    `  — vintera (ловим регрессии): то же + Tailwind-мост вместо ручного tailwind.css + вычистка хардкода ` +
    `по \`themeon check\`;\n` +
    `  — снятие легаси-алиасов (aliases → выкл) и выпил дублей — отдельным(и) item'ами ПОСЛЕ того, как оба ` +
    `пилота зелёные.\n\n` +
    `ЖЁСТКИЕ инварианты, которые обязаны попасть в Implementation Rules КАЖДОГО item'а, трогающего прод-репо:\n` +
    `  1. Работа только в ветке ${MIGRATION_BRANCH} прод-репо пилота; НИКОГДА не push, не merge, не rebase ` +
    `на основную ветку — это решение человека.\n` +
    `  2. Никаких \`git stash\`/\`reset\`/\`checkout -f\` в прод-репо.\n` +
    `  3. Parity-гейт: множество генерируемых CSS-переменных (имя+значение) ДО и ПОСЛЕ обязано совпадать, ` +
    `кроме явно перечисленных в expectedVarDiff этого item'а. Метод снятия снимка обязан быть ОДИН и ` +
    `детерминированный — опиши точную команду в Validation item'а (и она же уйдёт в Baseline-стадию).\n\n` +
    `Формат item'а СТРОГО по plan-protocol: заголовок "### P5.m — Title", поля "**Поле:** значение" в порядке ` +
    `Status/Intent/Why/Scope Included/Scope Excluded/Inputs/Files/Required Reads/Implementation Rules/` +
    `Code Guidance/Validation/Deliverables/Completion Notes/Pending Work/Known Deviations/Escalation Needed; ` +
    `пустое поле — «—». Явно укажи в каждом item'е, какой пилот-репозиторий он трогает. Число item'ов НЕ ` +
    `обязано быть 4 — скелет P5.1–P5.4 это заглушки, бери столько, сколько нужно по существу.\n\n` +
    `Обнови Status Board (${PLAN_DIR}/plan.md §4) для P5. Спорные архитектурные решения фиксируй сам новой ` +
    `строкой P-D<следующий свободный> в ${PLAN_DIR}/plan.md §5 Decision Log — НЕ выноси вопросом пользователю. ` +
    `Перезапиши ${PLAN_DIR}/handoff.md целиком по схеме HANDOFF. Прогони plan-lint, если доступен ` +
    `(\`python3 "$CLAUDE_PLUGIN_ROOT/scripts/plan-lint.py" plans/${PLAN_ID}\`; нет — пропусти).\n\n` +
    `Если архитектура миграции неочевидна настолько, что решение обязан принять человек (не рутинный ` +
    `trade-off, а именно прод-риск, который нельзя снять инвариантами выше) — верни escalation=true с причиной ` +
    `в notes и НИЧЕГО не пиши в phases/P5.md. Иначе верни items (id, title, pilot, expectedVarDiff) в порядке ` +
    `исполнения — порядок обязан уважать D17 (dterema перед vintera, снятие алиасов последним).`,
    { label: 'design:P5', phase: 'Design', model: 'opus', effort: 'xhigh', schema: DESIGN_SCHEMA }
  )

  if (design.escalation) {
    log(`ESCALATION при детализации P5: ${design.notes}`)
    return { phase: PHASE, stoppedAt: 'design', reason: design.notes }
  }
  items = design.items.map(i => ({
    id: i.id,
    title: i.title,
    status: '⬜ Not started',
    pilot: i.pilot,
    expectedVarDiff: i.expectedVarDiff || [],
  }))
}

// Терминальность матчим и по эмодзи, и по тексту (fallback) — потеря эмодзи агентом-статусчекером
// не должна читаться как "item не закрыт" и приводить к повторному исполнению прод-мутации.
const TERMINAL_STATUS_RE = /🟢|🟠|⛔|done|cancelled|отменен/i
let pending = items.filter(i => !TERMINAL_STATUS_RE.test(i.status))
if (ONLY_ITEMS) {
  pending = pending.filter(i => ONLY_ITEMS.includes(i.id))
  log(`onlyItems: прогоняем ${pending.map(i => i.id).join(', ') || '(ничего не совпало)'}`)
}
if (pending.length === 0) log('P5: нет незакрытых item\'ов для прогона — сразу Wrap-up')

// ---------------------------------------------------------------------------
const pilotByKey = Object.fromEntries(PILOTS.map(p => [p.key, p]))
const repoFor = item => (pilotByKey[item.pilot] ? pilotByKey[item.pilot].repo : null)

const BASELINE_SCHEMA = {
  type: 'object',
  required: ['snapshotPath', 'varCount', 'command'],
  properties: {
    snapshotPath: { type: 'string' },
    varCount: { type: 'integer' },
    command: { type: 'string' },
    branchReady: { type: 'boolean' },
    notes: { type: 'string' },
  },
}
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
const PARITY_SCHEMA = {
  type: 'object',
  required: ['identical', 'unexpectedDiff'],
  properties: {
    identical: { type: 'boolean' },
    unexpectedDiff: {
      type: 'array',
      description: 'Расхождения переменных, НЕ санкционированные expectedVarDiff item\'а',
      items: {
        type: 'object',
        required: ['varName', 'before', 'after'],
        properties: {
          varName: { type: 'string' },
          before: { type: 'string' },
          after: { type: 'string' },
        },
      },
    },
    sanctionedDiff: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
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

// Baseline снимается ОДИН раз на пилота (первый его item), а не на каждый item: эталон
// parity — состояние прод-темы ДО начала миграции этого проекта, а не до текущего шага.
const baselines = {}
const results = []
let stopped = null

for (const item of pending) {
  const pilotRepo = repoFor(item)
  const isProdItem = Boolean(pilotRepo)

  // ---- Baseline (только для item'ов, трогающих прод-репо) --------------------
  if (isProdItem && !baselines[item.pilot]) {
    phase('Baseline')
    const baseline = await agent(
      `Роль — снятие parity-эталона перед миграцией пилота «${item.pilot}» (${pilotRepo}) на ThemeOn. ` +
      `Это ЕДИНСТВЕННЫЙ источник истины для гейта «diff CSS-переменных обязан быть пустым» ` +
      `(${PLAN_DIR}/plan.md §2 Execution Rules, 00_MASTER_PLAN.md §5 D5/D17).\n\n` +
      `1) Читай ${PLAN_DIR}/phases/P5.md — Phase Context и item ${item.id}: поле Validation задаёт ТОЧНУЮ ` +
      `команду снятия снимка переменных. Используй её, не изобретай свою.\n` +
      `2) В прод-репо ${pilotRepo} (working tree ЧИСТ — проверено на preflight, НЕ делай stash/reset/checkout -f):\n` +
      `   - создай и перейди на ветку \`${MIGRATION_BRANCH}\` от текущего HEAD (\`git -C ${pilotRepo} checkout -b ` +
      `${MIGRATION_BRANCH}\`; ветка уже существует → просто \`checkout\` на неё, ничего не пересоздавая);\n` +
      `   - сними снимок ДО миграции: полное множество генерируемых CSS custom properties (имя → значение), ` +
      `отсортированное детерминированно, по одной переменной на строку.\n` +
      `3) Сохрани снимок в файл в scratchpad-директории этой сессии (НЕ в прод-репо, НЕ в ${REPO} — снимок ` +
      `не должен попасть ни в один коммит). Верни абсолютный snapshotPath, varCount (сколько переменных), ` +
      `command (точная команда, которой снимок снят — её же повторит parity-стадия) и branchReady.\n\n` +
      `Ничего в прод-репо не коммить на этой стадии — только ветка и снимок.`,
      { label: `baseline:${item.pilot}`, phase: 'Baseline', model: 'sonnet', effort: 'low', schema: BASELINE_SCHEMA }
    )
    baselines[item.pilot] = baseline
    log(`Baseline ${item.pilot}: ${baseline.varCount} переменных → ${baseline.snapshotPath} (ветка ${MIGRATION_BRANCH})`)
  }

  const baseline = isProdItem ? baselines[item.pilot] : null

  // ---- Implement ------------------------------------------------------------
  phase('Implement')
  const impl = await agent(
    `Роль — /task:plan-exec ${PLAN_ID} ${item.id} (sonnet/medium по ${PLAN_DIR}/plan.md §3 Routing: P5 = ` +
    `дефолт + ОБЯЗАТЕЛЬНЫЙ /task:review после — прод-риск). Порядок чтения СТРОГО: 1) ${PLAN_DIR}/plan.md ` +
    `(Context/Execution Rules/Routing/Status Board) 2) ${PLAN_DIR}/handoff.md 3) ${PLAN_DIR}/phases/P5.md — ` +
    `Phase Context + item ${item.id} целиком 4) файлы из Required Reads item'а, в указанном порядке. ` +
    `Повторное чтение уже прочитанного и «почитаю ещё по репо на всякий случай» — запрещено.\n\n` +
    (isProdItem
      ? `ЭТОТ ITEM МУТИРУЕТ ПРОД-РЕПОЗИТОРИЙ ПИЛОТА: ${pilotRepo} (${pilotByKey[item.pilot].why}). Жёсткие ` +
        `правила, нарушение любого = escalation, а не импровизация:\n` +
        `  - Работай ТОЛЬКО в ветке \`${MIGRATION_BRANCH}\` (она уже создана Baseline-стадией; убедись ` +
        `\`git -C ${pilotRepo} branch --show-current\`). НЕ push, НЕ merge, НЕ rebase, НЕ трогай основную ветку.\n` +
        `  - НИКАКИХ \`git stash\` / \`git reset\` / \`git checkout -f\` / \`git clean\` в прод-репо.\n` +
        `  - Пакет ThemeOn (${REPO}) подключается к пилоту как локальная зависимость; сам пакет в этой фазе ` +
        `НЕ дорабатываем. Не хватает возможности пакета — это escalation (в пакете фаза уже закрыта), а не ` +
        `«допишу по-быстрому в ${REPO}».\n` +
        `  - Опция \`aliases: 'legacy-v0'\` включена, пока item явно не снимает её по плану — она и есть ` +
        `гарантия пустого parity-diff.\n` +
        `  - Санкционированные этим item'ом изменения переменных: ${JSON.stringify(item.expectedVarDiff || [])} ` +
        `(пусто = diff обязан быть строго пустым, любое расхождение = регрессия).\n\n`
      : `Этот item не трогает прод-репо пилотов (работа в ${REPO} или в плановых файлах).\n\n`) +
    `Исполняй СТРОГО Scope Included; Implementation Rules и Code Guidance — жёсткие рамки, не рекомендации. ` +
    `«Улучшить бы заодно» — запиши в Pending Work item'а, не делай. Код: комментарии/тест-описания на русском ` +
    `(general:writing-style). План разошёлся с реальным кодом (файла нет, сигнатура другая, якорь не находится) — ` +
    `НЕ импровизируй, НЕ чини план на ходу: верни escalation=true с причиной, ничего не коммить.\n\n` +
    `Иначе: прогони каждую команду из Validation item'а, почини красное в рамках Scope. Закоммить ` +
    `(\`git add\` конкретных путей, НЕ -A; сообщение на русском, тело — почему; НЕ push) в ` +
    `${isProdItem ? `ветку ${MIGRATION_BRANCH} репо ${pilotRepo}` : REPO}. В ${PLAN_DIR}/phases/P5.md обнови ` +
    (isProdItem
      ? `статус item'а на 🟡 In progress (Parity-гейт и Review ещё впереди — финальный статус ставит Close-стадия, ` +
        `НЕ эта) и Completion Notes фактами реализации (изменённые файлы, прогнанные команды и вывод).`
      : `статус item'а на 🟢 Done (или 🟠 Done with deviations + Known Deviations) и Completion Notes (только ` +
        `факты: изменённые файлы, тесты, прогнанные команды и вывод — без оценок).`) +
    ` Верни status, escalation, filesChanged, commitSha.`,
    { label: `impl:${item.id}`, phase: 'Implement', model: 'sonnet', effort: 'medium', schema: IMPLEMENT_SCHEMA }
  )

  if (impl.escalation) {
    log(`ESCALATION ${item.id}: ${impl.escalationReason} — P5 остановлена, дальше не идём`)
    results.push({ item: item.id, stage: 'implement', escalation: true, reason: impl.escalationReason })
    stopped = { at: 'implement', item: item.id, reason: impl.escalationReason }
    break
  }

  // ---- Parity-гейт ----------------------------------------------------------
  if (isProdItem) {
    phase('Parity')
    const parity = await agent(
      `Роль — parity-гейт миграции пилота «${item.pilot}» (${pilotRepo}), item ${item.id}. Это гейт прод-` +
      `безопасности из ${PLAN_DIR}/plan.md §2: при \`aliases: 'legacy-v0'\` множество генерируемых ` +
      `CSS-переменных ДО и ПОСЛЕ миграции обязано совпадать.\n\n` +
      `Эталон (снят ДО начала миграции этого пилота): ${baseline.snapshotPath} (${baseline.varCount} переменных).\n` +
      `Команда снятия снимка — ТА ЖЕ, что дала эталон: ${baseline.command}\n\n` +
      `1) Пересними снимок переменных в текущем состоянии ветки ${MIGRATION_BRANCH} ровно этой командой.\n` +
      `2) Сравни с эталоном как МНОЖЕСТВА (имя → значение). Различия в порядке строк и whitespace — не diff.\n` +
      `3) Санкционированные этим item'ом изменения (из плана): ${JSON.stringify(item.expectedVarDiff || [])}. ` +
      `Расхождение по переменной из этого списка — ожидаемо, кладёшь в sanctionedDiff.\n` +
      `4) Гейт по P-D35 (${PLAN_DIR}/plan.md §5): падает iff (removed ∪ changed) ⊄ expectedVarDiff. Переменные, ` +
      `которые ПРОПАЛИ или СМЕНИЛИ значение и не входят в expectedVarDiff — в unexpectedDiff. Переменные, которые ` +
      `ПОЯВИЛИСЬ (canon-namespace рядом с легаси-алиасами, D5) — НЕ считаются unexpectedDiff сами по себе, кладёшь ` +
      `их в notes как добавленные (для трассируемости), но identical этим не роняешь.\n` +
      `5) identical=true если unexpectedDiff пуст (added-имена НЕ входят в unexpectedDiff).\n\n` +
      `Ничего НЕ чини и НЕ коммить — это read-only гейт, твоя работа закончить вердиктом.`,
      { label: `parity:${item.id}`, phase: 'Parity', model: 'sonnet', effort: 'low', schema: PARITY_SCHEMA }
    )

    if (!parity.identical) {
      log(
        `PARITY FAIL ${item.id} (${item.pilot}): ${parity.unexpectedDiff.length} несанкционированных расхождений ` +
        `переменных — P5 ОСТАНОВЛЕНА, прод-стили бы поехали. Коммит остался в ветке ${MIGRATION_BRANCH}, не в main.`
      )
      await agent(
        `В ${PLAN_DIR}/phases/P5.md выстави item'у ${item.id} Status = 🔴 Blocked (parity-гейт упал: removed/changed ` +
        `переменные вне expectedVarDiff — ${JSON.stringify(parity.unexpectedDiff.map(d => d.varName))}). Заполни ` +
        `Completion Notes фактом провала и синхронизируй Status Board (${PLAN_DIR}/plan.md §4). Ничего не коммить в ` +
        `${isProdItem ? pilotRepo : REPO}, только плановые файлы.`,
        { label: `blocked:${item.id}`, phase: 'Parity', model: 'sonnet', effort: 'low' }
      )
      results.push({
        item: item.id,
        stage: 'parity',
        parityFailed: true,
        unexpectedDiff: parity.unexpectedDiff,
        commitSha: impl.commitSha,
      })
      stopped = {
        at: 'parity',
        item: item.id,
        pilot: item.pilot,
        reason: `Непустой diff CSS-переменных: ${parity.unexpectedDiff.map(d => d.varName).join(', ')}`,
        unexpectedDiff: parity.unexpectedDiff,
      }
      break
    }
    log(
      `Parity OK ${item.id} (${item.pilot}): diff пуст` +
      (parity.sanctionedDiff && parity.sanctionedDiff.length
        ? ` (санкционировано планом: ${parity.sanctionedDiff.join(', ')})`
        : '')
    )
  }

  // ---- Review (обязателен по plan.md §3 Routing) ----------------------------
  phase('Review')
  const reviewRepo = isProdItem ? pilotRepo : REPO
  const review = await agent(
    `Роль — /task:review (read-only, adversarial). ОБЯЗАТЕЛЕН для P5 по ${PLAN_DIR}/plan.md §3 Routing ` +
    `(«sonnet/medium + обязательный /task:review после каждого проекта — прод-риск»).\n\n` +
    `Ревьюишь ${reviewRepo}: коммит ${impl.commitSha || 'HEAD'} (\`git -C ${reviewRepo} show ` +
    `${impl.commitSha || 'HEAD'}\`) — только этот коммит, не весь репозиторий. Контекст: item ${item.id} фазы ` +
    `P5 плана ${PLAN_ID}, Scope/Code Guidance — ${PLAN_DIR}/phases/P5.md.\n\n` +
    (isProdItem
      ? `Это ПРОД-фронтенд (${item.pilot}) — blast-radius максимальный: сломанная тема = сломанный живой сайт. ` +
        `Adversarial-фокус ровно на том, что parity-гейт по переменным поймать НЕ может:\n` +
        `  - визуальная регрессия при совпавших переменных (изменился порядок/каскад/специфичность CSS, ` +
        `@layer перебил старые правила, потерялся \`data-theme\`-селектор, уехал порядок css.push);\n` +
        `  - FOUC: анти-FOUC head-скрипт потерян/переехал/срабатывает позже, чем раньше;\n` +
        `  - переключение темы в рантайме и persist (localStorage/cookie) — не сломано ли, не появилось ли ` +
        `две конкурирующие color-mode системы (известный дефект доноров, R-01 §5);\n` +
        `  - Naive UI overrides и breakpoint-мёрж — совпадают ли с прежним поведением;\n` +
        `  - осталась ли в дереве мёртвая копия старого пайплайна (scripts/utils/modules), которая всё ещё ` +
        `исполняется и тихо перебивает пакет;\n` +
        `  - SSR/гидрация: расхождение сервер/клиент по теме.\n`
      : `Глубину масштабируй под риск (blast-radius: публичный API/SemVer — сперва failure-modes, затем ` +
        `для каждого конкретный сценарий сбоя).\n`) +
    `\nSeverity ∈ {LOW,MED,HIGH,CRITICAL}, при сомнении — ВЫШЕ, сам не отбрасывай. Файлы НЕ меняй.`,
    { label: `review:${item.id}`, phase: 'Review', model: 'opus', effort: 'xhigh', schema: REVIEW_SCHEMA }
  )

  const blocking = review.findings.filter(f => f.severity !== 'LOW')
  if (blocking.length > 0) {
    phase('Fix')
    await agent(
      `Роль — /task:fix (token-frugal, один проход, без fan-out). В ${reviewRepo} почини находки код-ревью ` +
      `item'а ${item.id} фазы P5: ${JSON.stringify(blocking)}.\n\n` +
      (isProdItem
        ? `ПРОД-РЕПО: работай только в ветке ${MIGRATION_BRANCH}; НЕ push, никаких stash/reset/checkout -f.\n`
        : '') +
      `Selective-input — читай только затронутые срезы, не файлы целиком. Минимальное изменение под находку, ` +
      `без абстракций «на вырост». Перепрогони Validation-команды item'а (${PLAN_DIR}/phases/P5.md)` +
      (isProdItem ? `, И ЗАНОВО parity-снимок (${baseline.command}) — твой фикс не имеет права сдвинуть ` +
        `переменные относительно эталона ${baseline.snapshotPath}` : '') +
      `. Закоммить ОТДЕЛЬНЫМ коммитом (не amend), сообщение на русском с указанием, какую находку чинит. НЕ push.`,
      { label: `fix:${item.id}`, phase: 'Fix', model: 'sonnet', effort: 'medium' }
    )
  }

  // ---- Close ----------------------------------------------------------------
  phase('Close')
  const close = await agent(
    `Роль — /task:plan-close ${PLAN_ID} ${item.id} (sonnet/low — механическая сверка, правки статусов ТОЛЬКО ` +
    `по фактам). НЕ доверяй Completion Notes на слово — сверь заявленное с git-фактами в ${reviewRepo} ` +
    `(\`git log --oneline\`, \`git diff\` по Files item'а). ` +
    (isProdItem
      ? `Коммиты этого item'а обязаны лежать в ветке ${MIGRATION_BRANCH}, а НЕ в основной ветке пилота — ` +
        `проверь (\`git -C ${reviewRepo} branch --show-current\`, \`git -C ${reviewRepo} log --oneline ` +
        `${MIGRATION_BRANCH} -5\`); если что-то уехало в основную ветку — это 🔴 Blocked с явной причиной, ` +
        `не 🟢. `
      : '') +
    `Прогони Validation-команды сам. Файлы item'а не закоммичены (есть в \`git -C ${reviewRepo} status ` +
    `--short\`) → статус НЕ 🟢: 🟡 In progress или 🔴 Blocked с причиной. Подтверждено → 🟢 Done (или 🟠 Done ` +
    `with deviations + Known Deviations). Синхронизируй Phase Status в ${PLAN_DIR}/phases/P5.md и Status Board ` +
    `(§4) в ${PLAN_DIR}/plan.md. Перезапиши ${PLAN_DIR}/handoff.md целиком (Next: следующий item или Wrap-up). ` +
    `Верни reconciledStatus.`,
    { label: `close:${item.id}`, phase: 'Close', model: 'sonnet', effort: 'low', schema: CLOSE_SCHEMA }
  )

  log(`${item.id} [${item.pilot || 'пакет'}]: ${close.reconciledStatus} (review ${review.verdict}, ${blocking.length} находок починено)`)
  results.push({
    item: item.id,
    pilot: item.pilot,
    status: close.reconciledStatus,
    reviewVerdict: review.verdict,
    findings: review.findings.length,
  })
}

// ---------------------------------------------------------------------------
phase('Wrap-up')
const wrap = await agent(
  `Роль — /task:plan-close ${PLAN_ID} P5 (закрытие фазы целиком).\n\n` +
  (stopped
    ? `ВНИМАНИЕ: прогон остановлен на стадии «${stopped.at}» (item ${stopped.item}): ${stopped.reason}. ` +
      `Фазу НЕ закрывать. Твоя задача — честно зафиксировать, где встали, и что нужно от человека.\n\n`
    : '') +
  `Все items P5 терминальны (🟢/🟠/⛔)? Прочитай ${PLAN_DIR}/phases/P5.md (Phase Status) и ${PLAN_DIR}/plan.md ` +
  `§4 (Status Board). Есть нетерминальные — перечисли и НЕ закрывай фазу частично.\n\n` +
  `Прод-репо пилотов — проверь и опиши фактическое состояние, это главное для человека:\n` +
  PILOTS.map(p =>
    `  - ${p.key} (${p.repo}): \`git -C ${p.repo} branch --show-current\`, \`git -C ${p.repo} log --oneline ` +
    `${MIGRATION_BRANCH} -10\` (коммиты миграции), \`git -C ${p.repo} status --short\` (незакоммиченный ` +
    `остаток — предупреди списком, не коммить молча).`
  ).join('\n') + '\n\n' +
  `Миграция ЛЕЖИТ В ВЕТКАХ \`${MIGRATION_BRANCH}\` и НЕ смержена и НЕ запушена — это намеренно, merge в ` +
  `основную ветку прод-проекта делает человек. В Phase Handoff (P5.md) и handoff.md явно напиши: какие ветки ` +
  `созданы, сколько коммитов, что проверить руками перед merge (визуальная проверка тем light/dark, ` +
  `переключение темы, отсутствие FOUC, сборка проекта) и готовые команды merge на каждый пилот.\n\n` +
  `Сведи таблицы: Phase Status ↔ Status Board §4. Заполни Phase Handoff в P5.md (что сдали, известные ` +
  `отклонения — агрегат Known Deviations, что дальше). Перезапиши ${PLAN_DIR}/handoff.md (Next: P6 или ` +
  `«ждём ручного merge веток пилотов»). Допиши строку в ${PLAN_DIR}/plan.md §6 Update Log. Прогони plan-lint, ` +
  `если доступен. Верни короткий отчёт: закрыта ли фаза, состояние веток пилотов, что дальше.`,
  { label: 'wrapup:P5', phase: 'Wrap-up', model: 'sonnet', effort: 'low' }
)
log(wrap)

// ---------------------------------------------------------------------------
const OTHER_DIR = PLAN_DIR === DEFAULT_PLAN_DIR ? MIRROR_PLAN_DIR : DEFAULT_PLAN_DIR
await agent(
  `Плановые файлы держатся синхронизированными в двух местах: ${PLAN_DIR} (только что писали сюда) и ` +
  `${OTHER_DIR} (зеркало). Сверь через diff -rq, и если есть расхождения — зеркалируй ${PLAN_DIR} поверх ` +
  `${OTHER_DIR} (rsync -a --delete, только файлы плана, ничего вне этих директорий). Ничего не коммить. ` +
  `${OTHER_DIR} не существует — создай как копию. Верни коротко: были расхождения или нет.`,
  { label: 'sync-plan-dirs', phase: 'Wrap-up', model: 'sonnet', effort: 'low' }
)

return {
  phase: PHASE,
  stopped,
  items: results,
  branches: PILOTS.map(p => ({ pilot: p.key, repo: p.repo, branch: MIGRATION_BRANCH })),
  wrapup: wrap,
  note: 'Миграция лежит в ветках пилотов, НЕ смержена и НЕ запушена — merge делает человек.',
}
