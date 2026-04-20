---
created: 2026-04-20T00:50:00Z
title: "Синхронизация: 13:30" при реальном времени 12:31 — lastSyncAt в UTC, не в Asia/Almaty
area: mobile + finance-service
priority: high
files:
  - apps/mobile-dashboard/src/screens/DashboardScreen.tsx (рендер lastSyncAt)
  - apps/mobile-dashboard/src/utils/calculations.ts (если есть formatTime)
  - apps/finance-service/src/dashboard/dashboard.service.ts (getSummary возвращает lastSyncAt)
---

## Problem

На Dashboard под KPI-блоком красный индикатор: **«Синхронизация: 13:30»** — при этом на устройстве/эмуляторе время **12:31**. Показывается время **из будущего на ~1 час**.

Причина: `lastSyncAt` приходит из БД (UTC timestamp), мобильный рендерит через `new Date(iso).toLocaleTimeString()` без явного timezone → получаем локальный timezone эмулятора (который может быть UTC в Docker/CI) или прибавляет UTC offset.

**Проверка:** Asia/Almaty = UTC+5. Если БД пишет 07:30 UTC (что соответствует 12:30 Almaty), а мобильный интерпретирует как `07:30 + 6h эмулятор` → получаем 13:30. Подгоняется.

## Related rule in CLAUDE.md

По миротворцу bug_012: `apps/aggregator-worker/.../parseDate` уже pin'нуто на Asia/Almaty midnight (commit 77c495d). **Bекторфикс нужно применить на finance-service и mobile рендер**.

## Solution

**Шаг 1: проверить что пишет БД (2 мин)**
```sql
SELECT MAX("createdAt") FROM "SyncLog" WHERE status = 'SUCCESS';
SHOW timezone;
```
`createdAt` должен быть в UTC (стандарт Postgres).

**Шаг 2: finance-service возвращает ISO string с UTC Z**
```ts
// dashboard.service.ts
lastSyncAt: syncLog?.createdAt.toISOString(),  // '2026-04-20T07:30:00.000Z'
```

**Шаг 3: мобильный форматирует в Asia/Almaty**
```ts
// DashboardScreen.tsx или в утилите
import { format, toZonedTime } from 'date-fns-tz';

const ALMATY_TZ = 'Asia/Almaty';
const syncLocal = toZonedTime(new Date(lastSyncAtIso), ALMATY_TZ);
const label = format(syncLocal, 'HH:mm', { timeZone: ALMATY_TZ });
// → "12:30"
```

`date-fns-tz` уже есть в зависимостях? Если нет, добавить:
```bash
cd apps/mobile-dashboard && npm i date-fns date-fns-tz
```

**Шаг 4: проверить что эмулятор в правильном timezone**
```bash
adb shell getprop persist.sys.timezone
# Если показывает не Asia/Almaty:
adb shell su 0 setprop persist.sys.timezone Asia/Almaty
```

## Acceptance

- Dashboard показывает «Синхронизация: 12:30» в 12:31 реального времени Almaty
- Unit test: `formatSyncTime('2026-04-20T07:30:00Z')` → `'12:30'` (fixed TZ в тесте)
- Работает независимо от timezone устройства (всегда Asia/Almaty)

## Связано с

- Commit 77c495d `fix(worker): pin parseDate to Asia/Almaty midnight (bug_012)` — та же логика, но на worker. Сейчас нужен векторфикс на mobile + finance DTO.
