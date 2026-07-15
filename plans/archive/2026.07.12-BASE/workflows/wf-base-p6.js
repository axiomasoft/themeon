export const meta = {
  name: 'wf-base-p6',
  description: 'BASE P6: risk-adaptive per-item implement → adversarial-verify (только security-items) → fix → close-gate',
  phases: [
    { title: 'Preflight', detail: 'P6 детализирован? рабочее дерево packages/ чисто?' },
    { title: 'Implement', detail: 'sonnet/medium — код+коммит, статус 🟡' },
    { title: 'Verify', detail: 'opus/xhigh, multi-lens adversarial — ТОЛЬКО security-items; P6.4 — дешёвый self-check' },
    { title: 'Fix', detail: 'sonnet/medium — только если verify нашёл ≥MED' },
    { title: 'Close', detail: 'sonnet/low — авто-close P6.4 и (если ownerSignoff:false) чистых security-items' },
    { title: 'Report', detail: 'сводка + команды owner /task:plan-close' },
  ],
}

// ───────────────────────────────────────────────────────────────────────────
// НАЗНАЧЕНИЕ. Исполняет фазу P6 плана 2026.07.12-BASE (Laravel-канал + multi-tenant
// serializeThemePatch), которая УЖЕ детализирована (Definition of Detailed, phases/P6.md).
// Research/Design стадий здесь НЕТ (в отличие от themeon-phase-dev.js) — фаза спроектирована.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ СКРИПТ (не themeon-phase-dev.js):
//   themeon-phase-dev.js ревьюит КАЖДЫЙ item на opus/xhigh — для P6.4 (доки+тест, ноль
//   security-поверхности) это перерасход. И он авто-закрывает security-items, что прямо
//   противоречит P-D51/P-D69 (владелец отклонил автопрогон P8: конвейерный review
//   зарезинил security-блокеры зелёными). Этот скрипт:
//     (1) COST-ADAPTIVE REVIEW — дорогой adversarial-verify только на security-items,
//         с числом линз по риску (P6.1/P6.5 → 3, P6.2/P6.3 → 2); P6.4 → дешёвый self-check.
//     (2) MULTI-LENS ADVERSARIAL (не один rubber-stamp) — линзы независимы, refute-рамка,
//         по умолчанию RED при сомнении — конструктивный ответ на провал P-D51.
//     (3) OWNER-IN-LOOP — ownerSignoff (default TRUE, чтит P-D69): security-item после
//         ЧИСТОГО verdict остаётся 🟡, владелец закрывает /task:plan-close сам. Код при этом
//         закоммичен (downstream строится на нём) — 🟡 это только bookkeeping-гейт.
//   ⚠️ Запуск этого скрипта РЕВИЗУЕТ P-D69 («workflow не заводится»). Осознанное решение
//      владельца → зафиксировать новой строкой P-D73 в plan.md §5 при первом прогоне.
//
// ИНВАРИАНТ РЕПО: один git-репозиторий пакета → item'ы исполняются СТРОГО ПОСЛЕДОВАТЕЛЬНО
// (конкурентные мутации невозможны). Параллелится ТОЛЬКО read-only verify-фан-аут линз.
//
// ЗАПУСК (новая сессия): Workflow({scriptPath: '.../workflows/wf-base-p6.js'})
//   args (опц.): { ownerSignoff?: boolean=true, onlyItems?: ['P6.1',...], planDir?: string }
// ───────────────────────────────────────────────────────────────────────────

const REPO = '/home/vostrikov/projects/packages/themeon'
const LINT = '/home/vostrikov/projects/packages/swissknifeman/packages/task/scripts/plan-lint.py'

const A = (typeof args === 'string' && args.trim()) ? JSON.parse(args) : (args || {})
// default TRUE — чтит P-D69: security-item останавливается на 🟡 для ручного close владельцем.
const OWNER_SIGNOFF = A.ownerSignoff !== false
const ONLY = Array.isArray(A.onlyItems) ? new Set(A.onlyItems.map((s) => String(s).toUpperCase())) : null
const PLAN_DIR = A.planDir || `${REPO}/plans/2026.07.12-BASE`
const MAX_FIX_ROUNDS = 2

// Порядок исполнения = порядок фазы. security — нужен ли adversarial-verify (иначе self-check).
// lenses — число независимых линз verify (по риску). deps — item'ы, чей БЛОК каскадит пропуск.
const ITEMS = [
  { id: 'P6.1', security: true, deps: [], why: 'ядро безопасности: per-type value-грамматика + serializeThemePatch (H3 И1, stored-XSS)' },
  { id: 'P6.2', security: true, deps: ['P6.1'], why: 'JSON-схема из грамматики — drift = дыра обхода валидации' },
  { id: 'P6.3', security: true, deps: ['P6.1'], why: 'fail-closed APCA-гейт (H3 И2)' },
  { id: 'P6.4', security: false, deps: [], why: 'Laravel-доки + интеграционный тест — ноль tenant-ввода, низкий риск' },
  { id: 'P6.5', security: true, deps: ['P6.1', 'P6.2', 'P6.3'], why: 'сквозной multi-tenant — доказательство блокировки XSS в реальном Chromium' },
]

// Конкретные security-линзы per item (из Code Guidance item'а + R-16 §2 модели угроз).
// Каждая — независимый adversarial-опровергатель; по умолчанию RED при правдоподобном сомнении.
const LENSES = {
  'P6.1': [
    { key: 'injection-bypass', ask: 'ПОСТРОЙ значение, которое ПРОХОДИТ грамматику patch-grammar.ts, но даёт опасный CSS/HTML при инъекции в <style>: unicode-escape (\\3c), обратный слэш-континуация, url(), </style>, одиночная }, вложенный @import, /* комментарий. Позитивный allowlist ПОЛОН? Есть ли тип из ALLOWED_TENANT_TYPES, где reject метасимволов НЕ идёт ПЕРЕД parseColor/парсингом? RED, если хоть один вектор правдоподобно проходит.' },
    { key: 'fail-loud-completeness', ask: 'КАЖДЫЙ тип из ALLOWED_TENANT_TYPES имеет валидатор? Исключённые shadow/gradient/cubicBezier РЕАЛЬНО бросают UNSUPPORTED_TENANT_TYPE (не silent-skip → tenant думает, что применилось)? UNKNOWN_PATH и UNSAFE_PATH(__proto__) ловятся? parseColor-reuse корректен (var()/color-mix → null → reject)?' },
    { key: 'determinism-reuse', ask: 'Вывод детерминирован (порядок деклараций = base.tokens, НЕ порядок ключей патча)? serializeThemeCss (build-канал) НЕ тронут (заморожен)? applyThemePatch и serializeThemePatch дают согласованные vars/css из ОДНОГО прохода валидации (P6.3 берёт .vars, не ревалидирует)?' },
  ],
  'P6.2': [
    { key: 'schema-validator-drift', ask: 'Anti-drift тест РЕАЛЬНО сравнивает RegExp(schema.pattern).test(v) с вердиктом validateTenantValue на матрице значений (вкл. ≥5 вектор-атак), или это тавтология/слабая проверка, пропускающая drift? pattern-строки берутся из patch-grammar.ts (единый источник), НЕ хардкожены второй раз? Drift = сервер пропустит то, что ядро бросит (или наоборот) — RED.' },
    { key: 'schema-tightness', ask: 'additionalProperties:false на КАЖДОМ уровне (tenant не добавит произвольную группу/ключ)? Типы shadow/gradient/cubicBezier ОТСУТСТВУЮТ в properties? Схема per-база (только реальные пути — UNKNOWN_PATH ловится ещё на сервере)? Валидный draft 2020-12?' },
  ],
  'P6.3': [
    { key: 'fail-closed', ask: 'Гейт возвращает exit≠0 на ВСЕХ трёх путях: (а) throw валидации значения (applyThemePatch), (б) throw парсинга цвета в APCA, (в) pass===false? Есть ли try/catch, глотающий throw в warning/skip (fail-OPEN — недоступная тема публикуется)? Порог — класс error, не warning? RED на любом fail-open пути.' },
    { key: 'apca-false-pass', ask: 'Тёмная тема + полупрозрачный цвет: |Lc| считается против РЕАЛЬНОГО фона (reuse flattenAlpha), не безусловного белого (регрессия Major #15)? Тест это ПРОГОНЯЕТ? Патч без цветов → корректный pass (нечего проверять), не ложный fail и не ложный pass?' },
  ],
  'P6.5': [
    { key: 'real-xss-blocked', ask: 'XSS-кейс использует РЕАЛЬНЫЙ Chromium (НЕ jsdom) и проверяет window.__xss === undefined ПОСЛЕ попытки инъекции вредоносного патча — не ТОЛЬКО что сервер бросил (двойная страховка)? Вектор из R-16 §2 модели угроз (</style>, }, url()) ловит регрессию грамматики P6.1? RED, если реальный парсер мог бы исполнить <script>.' },
    { key: 'defense-in-depth-order', ask: 'Сквозной флоу в КАНОНИЧЕСКОМ порядке schema(P6.2)→APCA(P6.3)→serialize(P6.1)→inject, КАЖДЫЙ рубеж fail-closed (отказ любого → страница НЕ публикуется/дефолт-тема)? Инъекция в <style nonce>, НЕ в атрибут и НЕ без nonce (serializeThemePatch отдаёт декларации, стенд оборачивает)?' },
    { key: 'no-false-green', ask: 'Три кейса (легальный/вредоносный/низкоконтрастный) независимы и проверяют то, что заявляют? Легальный — computed-стиль = tenant-цвет И отсутствие FOUC (первый paint темизирован)? Стенд самодостаточен (mock-store, чужой репо не трогает, P-D71)?' },
  ],
}

// ─── Схемы структурированного выхода ───────────────────────────────────────
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
const VERIFY_SCHEMA = {
  type: 'object',
  required: ['lens', 'verdict', 'findings'],
  properties: {
    lens: { type: 'string' },
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
const SELFCHECK_SCHEMA = {
  type: 'object',
  required: ['pass', 'issues'],
  properties: {
    pass: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}
const CLOSE_SCHEMA = {
  type: 'object',
  required: ['reconciledStatus'],
  properties: { reconciledStatus: { type: 'string' }, notes: { type: 'string' } },
}
const PREFLIGHT_SCHEMA = {
  type: 'object',
  required: ['p6Detailed', 'packagesDirty', 'ready'],
  properties: {
    p6Detailed: { type: 'boolean' },
    packagesDirty: { type: 'boolean' },
    ready: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

// ─── Промпт-фрагменты (единый стиль дома: строгий порядок чтения, дисциплина Scope) ──
const READ_ORDER = (id) =>
  `Порядок чтения СТРОГО: 1) ${PLAN_DIR}/plan.md (Context/Execution Rules/§3 Routing/§4 Status Board/§7 Contracts) ` +
  `2) ${PLAN_DIR}/handoff.md 3) ${PLAN_DIR}/phases/P6.md — Phase Context (инварианты H3 И1/И2, границы пакетов, pre-mortem) ` +
  `+ item ${id} целиком 4) ${PLAN_DIR}/20_research/R-16_P6-multitenant-laravel.md (по ссылкам item'а) 5) файлы из Required Reads ` +
  `item'а в указанном порядке. Повторное чтение прочитанного и «почитаю по репо на всякий» — запрещено.`

const IMPL_PROMPT = (item) =>
  `Роль — /task:plan-exec 2026.07.12-BASE ${item.id} (Sonnet/medium по plan.md §3 Routing: ${item.why}). ${READ_ORDER(item.id)}\n\n` +
  `Репозиторий пакета (отдельная git-история) — ${REPO}. Исполняй СТРОГО Scope Included; Implementation Rules и Code Guidance — ` +
  `жёсткие рамки, не рекомендации. «Улучшить бы заодно» → Pending Work item'а, не делай. Код: комментарии/тест-описания — русский ` +
  `(general:writing-style); публичные README/JSDoc — английский (OSS). ` +
  (item.security
    ? `⚠ SECURITY-item (H3): позитивная allowlist-грамматика (что РАЗРЕШЕНО), НЕ блоклист; тест-вектора атак пишутся ПЕРВЫМИ (red), ` +
      `реализация под них; НЕ подгонять регэксп под конкретный вектор. `
    : ``) +
  `План разошёлся с кодом (файла нет, сигнатура другая, якорь не находится) — НЕ импровизируй, НЕ чини план на ходу: верни ` +
  `escalation=true с причиной, ничего не коммить. Иначе: прогони КАЖДУЮ команду из Validation item'а, почини красное в рамках Scope. ` +
  `Закоммить в ${REPO} (git add КОНКРЕТНЫХ путей, НЕ -A; сообщение на русском, тело — почему; НЕ push). В ${PLAN_DIR}/phases/P6.md ` +
  `выстави статус item'а «🟡 In progress» (НЕ 🟢 — терминальный статус ставит close-гейт) и заполни Completion Notes ТОЛЬКО фактами ` +
  `(изменённые файлы, добавленные тесты, прогнанные команды и их вывод — без оценок). Верни status, escalation, filesChanged, ` +
  `commitSha (git -C ${REPO} rev-parse --short HEAD).`

const VERIFY_PROMPT = (item, lens) =>
  `Роль — /task:review (read-only, ADVERSARIAL, линза «${lens.key}»). Ревьюишь ${REPO}: ТОЛЬКО коммит(ы) item'а ${item.id} ` +
  `(git -C ${REPO} log --oneline -5, возьми коммит(ы) этого item'а — сообщение упоминает ${item.id} или его суть; git show по ним), ` +
  `НЕ весь репозиторий. Контекст: item ${item.id} фазы P6, Scope/Code Guidance/Validation — ${PLAN_DIR}/phases/P6.md; модель угроз — ` +
  `${PLAN_DIR}/20_research/R-16_P6-multitenant-laravel.md §2.\n\n` +
  `ЗАДАЧА ЛИНЗЫ (опровергни, не подтверди): ${lens.ask}\n\n` +
  `Правила: default RED при правдоподобном сомнении — молчание дороже токенов на security-поверхности; severity ∈ {LOW,MED,HIGH,` +
  `CRITICAL}, при сомнении ВЫШЕ, сам не отбрасывай; каждый finding несёт КОНКРЕТНЫЙ failure_scenario (вход→плохой выход/сбой), не ` +
  `общие слова. Файлы НЕ меняй. verdict=GREEN только если по ТВОЕЙ линзе дыр нет.`

const FIX_PROMPT = (item, findings) =>
  `Роль — /task:fix (token-frugal, один проход, без fan-out). В ${REPO} почини находки adversarial-verify item'а ${item.id} фазы P6: ` +
  `${JSON.stringify(findings)}. Selective-input — читай только затронутые срезы, не файлы целиком. Минимальное изменение под находку, ` +
  `без абстракций «на вырост»; НЕ ослабляй тест/грамматику, чтобы находка «исчезла» — чини причину (для injection-находок: расширь ` +
  `позитивную грамматику/reject, не добавляй точечный костыль). Перепрогони Validation-команды item'а (${PLAN_DIR}/phases/P6.md). ` +
  `Закоммить ОТДЕЛЬНЫМ коммитом (не amend), сообщение на русском с указанием, какую находку чинит. НЕ push. Обнови Completion Notes.`

const CLOSE_PROMPT = (item) =>
  `Роль — /task:plan-close 2026.07.12-BASE ${item.id} (Sonnet/low — механическая сверка, правки статусов ТОЛЬКО по фактам). НЕ доверяй ` +
  `Completion Notes на слово — сверь с git-фактами в ${REPO} (git log --oneline, git diff по Files item'а). Прогони Validation-команды ` +
  `item'а сам. Файлы item'а не закоммичены (видны в git -C ${REPO} status --short) → статус НЕ 🟢: оставь 🟡 или 🔴 с причиной. ` +
  `Подтверждено → 🟢 Done (или 🟠 Done with deviations + заполненные Known Deviations). Синхронизируй Phase Status в ` +
  `${PLAN_DIR}/phases/P6.md ↔ Status Board §4 в ${PLAN_DIR}/plan.md. НЕ закрывай фазу целиком и НЕ трогай handoff.md (это делает ` +
  `Report-стадия). Верни reconciledStatus.`

// ═══════════════════════════════════════════════════════════════════════════
phase('Preflight')
const pre = await agent(
  `Preflight фазы P6 (2026.07.12-BASE). Проверь два условия и верни строго по схеме:\n` +
  `(1) p6Detailed — открой ${PLAN_DIR}/phases/P6.md: у КАЖДОГО из P6.1..P6.5 поля Code Guidance и Validation заполнены содержательно ` +
  `(не «—»)? (Definition of Detailed, plan.md §2а.4.)\n` +
  `(2) packagesDirty — git -C ${REPO} status --short по путям packages/ и tests/ НЕ пуст? (Незакоммиченная работа в пакетах смешается ` +
  `с item-коммитами — это стоп.) Изменения ТОЛЬКО в plans/** dirty НЕ считаются.\n` +
  `ready = p6Detailed && !packagesDirty. Если !ready — в reason напиши, что чинить (детализировать фазу / закоммитить-или-стешить ` +
  `работу в packages). Ничего не меняй и не коммить — только диагностика.`,
  { label: 'preflight', phase: 'Preflight', model: 'sonnet', effort: 'low', schema: PREFLIGHT_SCHEMA }
)
log(`Preflight: p6Detailed=${pre.p6Detailed} packagesDirty=${pre.packagesDirty} ready=${pre.ready}`)
log(`Напоминание протокола: по handoff.md перед P6-execution предписан гейт /task:plan-audit 2026.07.12-BASE P5 (не блокирует этот скрипт).`)
if (OWNER_SIGNOFF) log(`ownerSignoff=TRUE (чтит P-D69): security-items остановятся на 🟡 — закрой их /task:plan-close сам после сводки.`)
else log(`ownerSignoff=FALSE: чистые security-items авто-закроются. ⚠ Ревизует P-D69/P-D51 — убедись, что это осознанно.`)
if (!pre.ready) {
  return { stoppedAt: 'preflight', reason: pre.reason, preflight: pre }
}

// ═══════════════════════════════════════════════════════════════════════════
const blocked = new Set()
const results = []

for (const item of ITEMS) {
  if (ONLY && !ONLY.has(item.id)) {
    log(`${item.id}: пропущен (не в onlyItems)`)
    continue
  }
  const deadDep = item.deps.find((d) => blocked.has(d))
  if (deadDep) {
    log(`${item.id}: ПРОПУЩЕН — зависимость ${deadDep} заблокирована (downstream не строим на сломанном)`)
    results.push({ item: item.id, status: '⛔ Skipped', reason: `dep ${deadDep} blocked`, security: item.security })
    blocked.add(item.id) // каскад: его собственный downstream тоже пропустится
    continue
  }

  // ── Implement (sequential — общий репо) ──
  phase('Implement')
  const impl = await agent(IMPL_PROMPT(item), {
    label: `impl:${item.id}`,
    phase: 'Implement',
    model: 'sonnet',
    effort: 'medium',
    schema: IMPLEMENT_SCHEMA,
  })
  if (impl.escalation) {
    log(`ESCALATION ${item.id}: ${impl.escalationReason} — item заблокирован, downstream пропустится`)
    blocked.add(item.id)
    results.push({ item: item.id, status: '🔴 Blocked', stage: 'implement', reason: impl.escalationReason, security: item.security })
    continue
  }

  // ── P6.4 (non-security): дешёвый self-check, НЕ opus-review (cost-lever) ──
  if (!item.security) {
    phase('Verify')
    let sc = await agent(
      `Роль — self-check item'а ${item.id} (Sonnet/medium, НЕ adversarial-fanout — не-security item, экономим ревью-бюджет). В ${REPO} ` +
      `сверь коммит ${item.id} с Validation item'а (${PLAN_DIR}/phases/P6.md): (1) интеграционный тест РЕАЛЬНО гоняет vite build (не мок ` +
      `границы — класс P8 Blocker #1); (2) сторож-антипод присутствует (virtual:themeon.css в CSS роняет сборку); (3) докстраница явно ` +
      `разводит каналы A/B/C (R-16 §1). pass=false с issues, если что-то из этого не выполнено. Файлы НЕ меняй.`,
      { label: `selfcheck:${item.id}`, phase: 'Verify', model: 'sonnet', effort: 'medium', schema: SELFCHECK_SCHEMA }
    )
    if (!sc.pass) {
      phase('Fix')
      await agent(FIX_PROMPT(item, sc.issues), { label: `fix:${item.id}`, phase: 'Fix', model: 'sonnet', effort: 'medium' })
    }
    phase('Close')
    const close = await agent(CLOSE_PROMPT(item), { label: `close:${item.id}`, phase: 'Close', model: 'sonnet', effort: 'low', schema: CLOSE_SCHEMA })
    log(`${item.id}: ${close.reconciledStatus} (self-check ${sc.pass ? 'pass' : 'fix-then-close'}, авто-close — не-security)`)
    results.push({ item: item.id, status: close.reconciledStatus, security: false, autoClosed: true })
    continue
  }

  // ── SECURITY item: multi-lens adversarial verify + fix-loop ──
  const lenses = LENSES[item.id]
  let round = 0
  let blockingFindings = []
  let lastVerdicts = []
  while (true) {
    phase('Verify')
    const lensResults = (
      await parallel(
        lenses.map((lens) => () =>
          agent(VERIFY_PROMPT(item, lens), {
            label: `verify:${item.id}:${lens.key}`,
            phase: 'Verify',
            model: 'opus',
            effort: 'xhigh',
            schema: VERIFY_SCHEMA,
          })
        )
      )
    ).filter(Boolean)
    lastVerdicts = lensResults.map((r) => `${r.lens}:${r.verdict}`)
    blockingFindings = lensResults.flatMap((r) => (r.findings || []).filter((f) => f.severity !== 'LOW'))
    log(`${item.id} verify раунд ${round}: [${lastVerdicts.join(', ')}] — ${blockingFindings.length} находок ≥MED`)
    if (blockingFindings.length === 0) break // unanimous-clean по ≥MED
    if (round >= MAX_FIX_ROUNDS) break // исчерпали раунды — останется заблокированным
    phase('Fix')
    await agent(FIX_PROMPT(item, blockingFindings), { label: `fix:${item.id}:r${round}`, phase: 'Fix', model: 'sonnet', effort: 'medium' })
    round++
  }

  if (blockingFindings.length > 0) {
    log(`${item.id}: adversarial-verify НЕ сошёлся за ${MAX_FIX_ROUNDS} раунда — БЛОКИРОВАН, downstream пропустится`)
    blocked.add(item.id)
    results.push({ item: item.id, status: '🔴 Blocked', security: true, verdicts: lastVerdicts, findings: blockingFindings })
    continue
  }

  // Verdict чистый.
  if (OWNER_SIGNOFF) {
    // Чтит P-D69: оставляем 🟡, владелец закрывает сам после сводки. Код закоммичен → downstream строится.
    log(`${item.id}: verify ЧИСТ [${lastVerdicts.join(', ')}] — оставлен 🟡 для owner /task:plan-close (ownerSignoff)`)
    results.push({ item: item.id, status: '🟡 verify-clean (ждёт owner close)', security: true, verdicts: lastVerdicts, closeCandidate: true })
  } else {
    phase('Close')
    const close = await agent(CLOSE_PROMPT(item), { label: `close:${item.id}`, phase: 'Close', model: 'sonnet', effort: 'low', schema: CLOSE_SCHEMA })
    log(`${item.id}: ${close.reconciledStatus} (verify чист, авто-close — ownerSignoff=false)`)
    results.push({ item: item.id, status: close.reconciledStatus, security: true, verdicts: lastVerdicts, autoClosed: true })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
phase('Report')
const closeCandidates = results.filter((r) => r.closeCandidate).map((r) => r.item)
const blockedItems = results.filter((r) => /Blocked|Skipped/.test(r.status)).map((r) => r.item)
const report = await agent(
  `Роль — сводка прогона wf-base-p6 (Sonnet/low). НЕ закрывай фазу P6 и НЕ трогай статусы — только собери отчёт и перезапиши ` +
  `${PLAN_DIR}/handoff.md.\n\nФакты прогона: ${JSON.stringify(results)}\nownerSignoff=${OWNER_SIGNOFF}.\n\n` +
  `Сделай:\n` +
  `1) Прочитай ${PLAN_DIR}/phases/P6.md Phase Status и ${PLAN_DIR}/plan.md §4 — сверь с фактами прогона, расхождения перечисли (не правь).\n` +
  `2) git -C ${REPO} log --oneline -12 — привяжи коммиты к item'ам.\n` +
  `3) Перезапиши ${PLAN_DIR}/handoff.md целиком (схема HANDOFF): Next — для КАЖДОГО close-candidate ${JSON.stringify(closeCandidates)} ` +
  `готовая команда \`/task:plan-close 2026.07.12-BASE <item>\` (владелец глазами сверяет diff+verdict и закрывает — гейт P-D69). ` +
  `Заблокированные/пропущенные ${JSON.stringify(blockedItems)} — с причиной и что разблокирует. Если ВСЕ 5 терминальны/close-candidate ` +
  `и нет блоков — добавь строку про закрытие фазы /task:plan-close 2026.07.12-BASE P6 после ручных close'ов.\n` +
  `4) Прогони plan-lint (python3 "${LINT}" plans/2026.07.12-BASE; нет скрипта — пропусти), красное по P6-файлам почини.\n` +
  `5) Верни короткий текст: что закоммичено, что ждёт owner-close, что заблокировано, следующий шаг.`,
  { label: 'report', phase: 'Report', model: 'sonnet', effort: 'low' }
)
log(report)

return {
  phase: 'P6',
  ownerSignoff: OWNER_SIGNOFF,
  items: results,
  closeCandidates,
  blocked: blockedItems,
  report,
}
