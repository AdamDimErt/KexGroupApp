# Подключение Design Division к проекту KEX GROUP

## Шаг 1 — Клонируй репозиторий

```bash
cd D:\
git clone https://github.com/msitarzewski/agency-agents.git
```

## Шаг 2 — Скопируй нужных агентов

### Для Claude Code (если используешь):
```bash
# Создай папку агентов (если нет)
mkdir -p ~/.claude/agents

# Скопируй Design Division агентов
cp D:\agency-agents\design\design-ui-designer.md ~/.claude/agents/
cp D:\agency-agents\design\design-ux-architect.md ~/.claude/agents/
cp D:\agency-agents\design\design-ux-researcher.md ~/.claude/agents/
cp D:\agency-agents\design\design-brand-guardian.md ~/.claude/agents/
```

### Для Cursor (если используешь):
```bash
# Из папки проекта
cd D:\kexgroupapp

# Конвертируй агентов в формат Cursor
cd D:\agency-agents
./scripts/convert.sh --tool cursor

# Установи в проект
./scripts/install.sh --tool cursor
```

Или вручную:
```bash
mkdir -p D:\kexgroupapp\.cursor\rules
# Скопируй файлы из D:\agency-agents\integrations\cursor\rules\
```

### Для GitHub Copilot:
```bash
mkdir -p ~/.github/agents
cp D:\agency-agents\design\design-ui-designer.md ~/.github/agents/
cp D:\agency-agents\design\design-ux-architect.md ~/.github/agents/
```

## Шаг 3 — Активируй агента

### В Claude Code:
```
Используй агента UI Designer для создания дизайн-системы мобильного дашборда.
Проект: управленческий дашборд для сети ресторанов KEX GROUP.
Стек: React Native, iOS + Android.
ТЗ находится в /mnt/project/ТЗ_Дашборд_ФИНАЛ_подписание__3_.docx
```

### В Cursor:
Агенты автоматически подхватятся из .cursor/rules/
Обращайся: `@ui-designer создай компонент KPI-карточки для дашборда`

## Шаг 4 — Какого агента для чего использовать

| Задача | Агент | Команда |
|---|---|---|
| Дизайн-система (цвета, типографика, компоненты) | UI Designer | `Use the UI Designer agent` |
| Структура навигации, wireframes, UX-flow | UX Architect | `Use the UX Architect agent` |
| Пользовательские сценарии, анализ ЦА | UX Researcher | `Use the UX Researcher agent` |
| Брендинг, фирменный стиль KEX GROUP | Brand Guardian | `Use the Brand Guardian agent` |
| Микроанимации, приятные детали | Whimsy Injector | `Use the Whimsy Injector agent` |

## Шаг 5 — Комбинируй агентов для полного дизайн-процесса

Пример workflow для KEX GROUP Dashboard:

```
1. Активируй UX Researcher → проанализируй ТЗ, определи user flows
2. Активируй UX Architect → построй информационную архитектуру и wireframes
3. Активируй UI Designer → создай дизайн-систему и визуальный дизайн
4. Активируй Whimsy Injector → добавь микроанимации и приятные детали
```
