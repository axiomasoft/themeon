<!-- maind:healthcheck hash=managed (managed by maind — не редактировать вручную) -->
## ⚠ ПРИОРИТЕТ №1 — связь с mAInd (общая память + граф)

Перед началом работы убедись, что проект подключён к хабу **mAInd**. Это критично:
без связи изменения этой сессии **не попадут** в общую память и граф.

1. Проверь связь: `maind health --cwd`
2. Если статус `partial` / `standalone` — почини: `maind health --cwd --fix`
3. Приступай к задаче только при статусе `connected`.

Память **общая** (демон mAInd); scope этого проекта — `project:themeon`.
<!-- /maind:healthcheck -->

<!-- swissknifeman:hub:start -->
# Swissknifeman: хаб скиллов

Подключение: `skiller connect . --hub --yes` (Claude marketplace + Codex `.agents/plugins`).
Полный индекс: `skiller status` или `scripts/generate-hub.sh --target . --full-index --dry-run` из репозитория swissknifeman.
<!-- swissknifeman:hub:end -->
