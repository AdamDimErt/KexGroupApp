---
created: 2026-04-20T00:54:00Z
title: 1C sync не работает — Затраты компании "Нет данных", Цех все ₸0
area: aggregator-worker
priority: high
files:
  - apps/aggregator-worker/src/one-c/onec-sync.service.ts
  - apps/aggregator-worker/src/scheduler/scheduler.service.ts
  - apps/aggregator-worker/src/iiko/iiko-sync.service.ts (kitchen shipments)
---

## Problem

На экране Reports/Аналитика:
- **Затраты компании:** «Нет данных за выбранный период» (период «Сегодня» = 2026-04-20)
- **Цех:** Закупки ₸0, Отгрузки ₸0, Доход ₸0
- **Тренды:** Ср. расходы/день ₸0

Но:
- iiko revenue sync **работает** (Выручка 99.3M, daily trends показывает колонку за 20 апр)
- iiko expenses sync **частично работает** (KPI «Расходы» показывает 30.9M — это DDS из iiko)

Значит **1C OData sync и iiko kitchen shipments не работают** (или никогда не запускались на этом инстансе).

## Impact

1. **Cost Allocation Engine не работает** — без 1C HQ expenses нет что распределять
2. **Финансовый результат некорректен** — считается только по iiko, без 1C overhead (аренда, ЗП, IT, маркетинг)
3. **Reports.company / Reports.kitchen — пустые** → треть приложения бесполезна для директора

## Investigation plan

**Шаг 1: проверить что SchedulerService вообще запускает 1C крон (5 мин)**
```bash
# в логах worker должны быть строки вида:
# [SchedulerService] syncOneCExpenses started
# [OneCyncService] ... fetched N records
grep -i "OneC\|one-c\|onec" <логи worker>
```

Если нет упоминаний — cron не триггерится (может .env не содержит `ONE_C_*` credentials и SchedulerService early-return'ит).

**Шаг 2: проверить credentials**
```bash
cat .env | grep -E "ONE_C|ONEC"
# ожидается:
# ONE_C_REST_URL=...
# ONE_C_REST_USER=...
# ONE_C_REST_PASSWORD=...
```

**Шаг 3: ручной запуск**
Триггернуть `OneCyncService.syncExpenses()` через worker REPL или HTTP endpoint (если есть), посмотреть логи и Sentry.

**Шаг 4: kitchen shipments из iiko**
`iiko-sync.service.ts` должен иметь метод `syncKitchenShipments()` (из `03-04-SUMMARY.md` он `syncKitchenShipmentsByRestaurant()`). Cron — каждый час. Проверить работает ли.

## Solution (вероятные)

1. Если нет credentials → заполнить `.env` и задокументировать в `.env.example`
2. Если 1C сервер недоступен → настроить VPN / IP whitelist
3. Если парсинг OData ломается на специфических данных → добавить try/catch на record level (bug_021 паттерн)
4. Запустить `SchedulerService.syncOneCExpenses()` **вручную** один раз, чтобы заполнить данные за период

## Acceptance

- После sync на Reports секция «Затраты компании» показывает реальные числа
- Секция «Цех» показывает Закупки/Отгрузки/Доход с ₸
- Cost Allocation Engine запускается (видно в логах)
- Синхронизация регулярная (виден SyncLog с status=SUCCESS в последние 2 часа)

## Связано с

- `.planning/todos/pending/2026-04-17-iiko-url-fallback-multitenancy.md` — тот же паттерн env-hardcode
- bug_021 (commit 787777b) — dedupe CostAllocation после 1C sync
