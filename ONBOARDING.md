# Добро пожаловать в KEX GROUP

## Как мы используем Claude

На основе активности Adamdim за последние 30 дней:

Распределение по типам задач:
  Планирование/Дизайн    █████████░░░░░░░░░░░  44%
  Разработка фич         ███████░░░░░░░░░░░░░  33%
  Улучшение качества     ██░░░░░░░░░░░░░░░░░░  11%
  Исправление багов      █░░░░░░░░░░░░░░░░░░░  6%
  Документация           █░░░░░░░░░░░░░░░░░░░  6%

Топ скиллов и команд:
  /gsd:plan-phase     ████████████████████  5x/месяц
  /gsd:discuss-phase  ████████████████░░░░  4x/месяц
  /gsd:execute-phase  ████████████░░░░░░░░  3x/месяц
  /gsd:progress       ████████░░░░░░░░░░░░  2x/месяц
  /model              ████████░░░░░░░░░░░░  2x/месяц
  /gsd:verify-work    ████░░░░░░░░░░░░░░░░  1x/месяц
  /project-start      ████░░░░░░░░░░░░░░░░  1x/месяц

Топ MCP серверов:
  Claude_Preview   ████████████████████  253 вызовов
  Figma            ███████████░░░░░░░░░  133 вызовов
  Claude_in_Chrome ████████░░░░░░░░░░░░  101 вызовов

## Чеклист для настройки

### Репозитории
- [ ] kexgroupapp — https://github.com/adamdimert/kexgroupapp (Turborepo монорепо: auth-service, api-gateway, finance-service, aggregator-worker, mobile-dashboard)

### MCP серверы для подключения
- [ ] Claude_Preview — Dev-сервер и браузерный preview для end-to-end проверки UI. Встроен в Claude Code — включается в настройках MCP.
- [ ] Figma — Получение дизайн-контекста, переменных и скриншотов из файла KEX GROUP. Попроси Adamdim дать доступ к воркспейсу и подключи Figma MCP.
- [ ] Claude_in_Chrome — Автоматизация браузера для тестирования мобильного дашборда. Установи расширение Chrome и войди под аккаунтом Anthropic.

### Скиллы, которые надо знать
- [ ] /gsd:plan-phase — Создание детального PLAN.md для фазы после обсуждения. Рабочая лошадка — Adamdim запускает ~5x/месяц.
- [ ] /gsd:discuss-phase — Начало фазы с адаптивным опросом для сбора контекста перед планированием.
- [ ] /gsd:execute-phase — Запуск всех планов фазы с волновой параллелизацией после утверждения плана.
- [ ] /gsd:progress — Быстрая проверка "где мы?" по всему проекту; подсказывает следующее действие.
- [ ] /gsd:verify-work — Разговорный UAT для проверки что фичи реально работают по спеке.
- [ ] /project-start и /project-stop — Поднимают/останавливают весь стек когда берёшься за работу.
- [ ] /model — Переключение модели Claude в середине сессии (Adamdim переключается между Opus 4.7 и Sonnet 4.6 в зависимости от тяжести задачи).

## Советы команды

_TODO_

## Начало работы

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y. Reply in Russian.

Open with a warm welcome — include the team name from the title. Then: "Твой
тиммейт использует Claude Code для [список всех типов работ]. Давай настроим тебя."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
