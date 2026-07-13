export const meta = {
  name: 'themeon-final-audit',
  description: 'THEMEON: комплексный финальный аудит всего плана/пакета через opus — verdict GREEN/ATTENTION/RED',
  phases: [
    { title: 'Recon', detail: 'sonnet/low — сырые git/plan факты, без оценок' },
    { title: 'Audit', detail: '4 независимые opus-линзы (fanout); adversarial-линзы — xhigh' },
    { title: 'Verify', detail: 'opus/xhigh — опровержение CRITICAL/HIGH находок' },
    { title: 'Synthesis', detail: 'opus/high — итоговый отчёт + verdict' },
  ],
}

// Запускать один раз, после того как нужные фазы (P0-P4, P6, P7 — НЕ P5 пилоты, у них свой
// review внутри `themeon-p5-pilots.js` per plan.md §3) терминальны. Recon сообщит, если что-то
// ещё открыто — аудит всё равно можно прогнать по частичному прогрессу, просто это будет
// видно в отчёте.
//
// P-D32 (2026-07-13): fable удалена насовсем (отменяет P-D27 «временно недоступна, вернуть
// когда появится») — Audit-линзы и Synthesis роутятся на opus. Откатывать нечего.

const PLAN_ID = 'THEMEON'
// Плановые файлы синхронизированы в двух местах (Vault + копия в репо пакета) — путь
// параметризован, дефолт указывает на Vault (источник по plan.md §2 Execution Rules).
// Если синхронизация разъедется — передать args.planDir с актуальным путём.
const DEFAULT_PLAN_DIR = '/home/vostrikov/Vaults/Brain/05-Projects/03-Packages/ThemeOn/plans/2026.07.12-BASE'
const MIRROR_PLAN_DIR = '/home/vostrikov/projects/packages/themeon/plans/2026.07.12-BASE'
const REPO = '/home/vostrikov/projects/packages/themeon'
const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args
const PLAN_DIR = (parsedArgs && parsedArgs.planDir) || DEFAULT_PLAN_DIR

// ---------------------------------------------------------------------------
phase('Recon')
const RECON_SCHEMA = {
  type: 'object',
  required: ['phaseStatuses', 'decisionLog', 'openIssues'],
  properties: {
    phaseStatuses: {
      type: 'array',
      items: {
        type: 'object',
        properties: { phase: { type: 'string' }, status: { type: 'string' }, items: { type: 'string' } },
      },
    },
    decisionLog: { type: 'array', items: { type: 'string' } },
    openIssues: { type: 'array', items: { type: 'string' } },
    commits: { type: 'array', items: { type: 'string' } },
  },
}
const recon = await agent(
  `Собери сырые факты для финального аудита плана ${PLAN_ID} — БЕЗ оценок и выводов, только факты. Прочитай ` +
  `${PLAN_DIR}/plan.md §4 (Phase Index & Status Board) и §5 (Decision Log). Для каждой фазы с файлом ` +
  `${PLAN_DIR}/phases/P<n>.md — вытащи Known Deviations и item'ы с Escalation Needed=yes (если есть). В ${REPO}: ` +
  `\`git log --oneline\` — список коммитов (сообщения+sha, без диффов). Верни phaseStatuses (phase/status/` +
  `"🟢/всего"), decisionLog (список строк D#/P-D#), openIssues (все найденные Known Deviations/эскалации), ` +
  `commits (сырой список сообщений коммитов).`,
  { label: 'recon', phase: 'Recon', model: 'sonnet', effort: 'low', schema: RECON_SCHEMA }
)
log(`Recon: ${recon.phaseStatuses.length} фаз в Status Board, ${recon.openIssues.length} открытых issues, ${recon.commits.length} коммитов`)

// ---------------------------------------------------------------------------
const LENS_SCHEMA = {
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

// effort per линзе: adversarial-линзы (охота за расхождением план↔код и за дырами
// безопасности) дороже ошибаются молчанием, чем токенами — им xhigh; обзорные — high.
const LENSES = [
  {
    key: 'architecture',
    effort: 'high',
    prompt:
      `ЛИНЗА: архитектура и соответствие решениям D1–D17. Прочитай ${PLAN_DIR}/00_MASTER_PLAN.md §5 (D1–D17) ` +
      `и код в ${REPO}. Для каждого решения — фактически реализовано так, как решено, или дрейф без нового D#? ` +
      `Особый фокус: exports-map/sideEffects (D7 stub-канон из P0), pnpm catalog (D5), oxlint вместо eslint (D6), ` +
      `Node engines >=22.18.0 (D8), модель токенов/резолвер ссылок/naming engine (P1, публичный API-контракт).`,
  },
  {
    key: 'phase-facts',
    effort: 'xhigh',
    prompt:
      `ЛИНЗА: adversarial-аудит закрытых фаз по git-фактам (профиль plan-audit). Recon-факты: ` +
      `${JSON.stringify(recon)}. Для каждой фазы со статусом 🟢/🟠 в ${PLAN_DIR}/plan.md §4 — сверь с ${REPO} ` +
      `git-историей: правки реально существуют и делают заявленное (no-op detection — статус закрыт, а ` +
      `содержательного диффа нет)? committed vs working-tree (\`git -C ${REPO} status --short\`)? диффы вне ` +
      `заявленных Files item'ов соответствующей фазы (scope drift)? Validation-команды из phases/P<n>.md ` +
      `воспроизводимы — прогони сам и сверь с заявленным.`,
  },
  {
    key: 'oss-readiness',
    effort: 'high',
    prompt:
      `ЛИНЗА: OSS/DX-готовность пакета ${REPO} (публичный MIT, npm-имя themeon/@themeon). Проверь: README ` +
      `(quickstart есть и рабочий), LICENSE, package.json exports-map корректен под ESM-only + sideEffects, ` +
      `publint/attw проходят если доступны офлайн (\`pnpm dlx publint\`, \`pnpm dlx @arethetypeswrong/cli\` — ` +
      `best-effort, отсутствие сети не блокер, но пометь), SemVer-готовность версии, CI конфиг (lint+test+` +
      `build), нет захардкоженных секретов или приватных локальных путей в закоммиченном коде.`,
  },
  {
    key: 'security-integrity',
    effort: 'xhigh',
    prompt:
      `ЛИНЗА: безопасность и целостность данных. Особый фокус: multi-tenant patch API ` +
      `(\`serializeThemePatch\`, P6, если уже реализован) — валидация входа темы тенанта, APCA-гейт публикации ` +
      `не обходится тихим фоллбеком; резолвер ссылок токенов — циклы = явная ошибка, не тихий дефолт; Nuxt/Vite ` +
      `runtime applier и CSS custom properties — нет пути для XSS/инъекции через непроверенный пользовательский ` +
      `ввод темы.`,
  },
]

phase('Audit')
const lensResults = (
  await parallel(
    LENSES.map(l => () =>
      agent(
        `Роль — комплексный финальный аудит THEMEON, principal-режим, read-only — файлы НЕ меняй, код не чини. ` +
        `${l.prompt} Severity ∈ {LOW,MED,HIGH,CRITICAL}, каждая находка — file:line/фаза + конкретный ` +
        `failure_scenario. При сомнении — severity выше, сам не отбрасывай.`,
        { label: `audit:${l.key}`, phase: 'Audit', model: 'opus', effort: l.effort, schema: LENS_SCHEMA }
      ).then(r => r && { lens: l.key, ...r })
    )
  )
).filter(Boolean)

const allFindings = lensResults.flatMap(r => r.findings.map(f => ({ ...f, lens: r.lens })))
const critical = allFindings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')
log(`Audit: ${allFindings.length} находок всего (${critical.length} HIGH/CRITICAL) по ${lensResults.length} линзам`)

// ---------------------------------------------------------------------------
phase('Verify')
const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted'],
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
}
const verified = critical.length
  ? await parallel(
      critical.map(f => () =>
        agent(
          `Попробуй ОПРОВЕРГНУТЬ находку финального аудита THEMEON: ${JSON.stringify(f)}. Проверь сам по коду/` +
          `git в ${REPO} и/или по документам в ${PLAN_DIR}. При малейшей неуверенности — refuted=false ` +
          `(default в пользу находки, не в пользу отчёта).`,
          { label: `verify:${f.lens}`, phase: 'Verify', model: 'opus', effort: 'xhigh', schema: VERDICT_SCHEMA }
        ).then(v => v && { finding: f, verdict: v })
      )
    )
  : []
const survivingCritical = verified.filter(v => v && !v.verdict.refuted).map(v => v.finding)
const refutedCount = critical.length - survivingCritical.length
if (refutedCount) log(`Verify: ${refutedCount}/${critical.length} HIGH/CRITICAL находок опровергнуто и исключено`)

const finalFindings = [...survivingCritical, ...allFindings.filter(f => f.severity === 'LOW' || f.severity === 'MED')]

// ---------------------------------------------------------------------------
phase('Synthesis')
const SYNTH_SCHEMA = {
  type: 'object',
  required: ['verdict', 'reportPath'],
  properties: {
    verdict: { type: 'string', enum: ['GREEN', 'ATTENTION', 'RED'] },
    reportPath: { type: 'string' },
    summary: { type: 'string' },
  },
}
const synthesis = await agent(
  `Роль — финальный синтез аудита THEMEON (opus, principal-режим). Verified findings по всем линзам ` +
  `(опровергнутые HIGH/CRITICAL уже исключены): ${JSON.stringify(finalFindings)}. Recon-факты: ` +
  `${JSON.stringify(recon)}. Узнай текущую дату (\`date +%F\`). Напиши отчёт в ` +
  `${PLAN_DIR}/90_audit/FINAL_AUDIT_<дата>.md: заголовок, вердикт (GREEN — расхождений нет; ATTENTION — есть ` +
  `MED/LOW; RED — выжила хоть одна HIGH/CRITICAL), таблица находок (severity | линза | summary | ` +
  `failure_scenario | file), краткий разбор по каждому D1–D17 из 00_MASTER_PLAN.md §5 (соблюдено/дрейф), ` +
  `состояние фаз (из recon). В конце — Suggested Command по вердикту: GREEN → план готов к релизу/следующему ` +
  `циклу; ATTENTION → \`/task:plan-exec ${PLAN_ID} <item с находкой>\` на каждую находку; RED → ` +
  `\`/task:plan-design ${PLAN_ID} <фаза>\` на пересборку затронутой фазы. Допиши строку в ${PLAN_DIR}/plan.md ` +
  `§6 Update Log про аудит (кто/дата/вердикт/ссылка на отчёт). Верни verdict, reportPath (абсолютный путь), ` +
  `summary (3–5 строк).`,
  { label: 'synthesis', phase: 'Synthesis', model: 'opus', effort: 'high', schema: SYNTH_SCHEMA }
)

log(`THEMEON FINAL AUDIT: ${synthesis.verdict} — ${synthesis.reportPath}`)

// ---------------------------------------------------------------------------
const OTHER_DIR = PLAN_DIR === DEFAULT_PLAN_DIR ? MIRROR_PLAN_DIR : DEFAULT_PLAN_DIR
await agent(
  `Плановые файлы держатся синхронизированными в двух местах: ${PLAN_DIR} (только что писали сюда — отчёт ` +
  `аудита + Update Log) и ${OTHER_DIR} (зеркало). Сверь через diff -rq, и если есть расхождения — ` +
  `зеркалируй ${PLAN_DIR} поверх ${OTHER_DIR} (rsync -a --delete). Ничего не коммить в git. Если ${OTHER_DIR} ` +
  `не существует — создай её как копию. Верни коротко: были расхождения или нет.`,
  { label: 'sync-plan-dirs', phase: 'Synthesis', model: 'sonnet', effort: 'low' }
)

return { verdict: synthesis.verdict, reportPath: synthesis.reportPath, summary: synthesis.summary, findings: finalFindings.length }
