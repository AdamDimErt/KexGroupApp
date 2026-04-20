---
created: 2026-04-20T00:44:00Z
title: "Цех" (kitchen production unit) показывается как бренд на Dashboard
area: finance-service + mobile
priority: critical
files:
  - apps/finance-service/src/dashboard/dashboard.service.ts (brand aggregation)
  - apps/mobile-dashboard/src/hooks/useDashboard.ts
  - apps/mobile-dashboard/src/screens/DashboardScreen.tsx
---

## Problem

На главном Dashboard в списке брендов показывается карточка **"Цех" / KITCHEN** с:
- Выручка ₸4.39M
- План ₸4.60M
- Маржа 6780%
- Badge "BNA" (ошибочный, см. связанный todo по resolveBrand)

**Это производственный юнит** (кухня, готовит продукцию для ресторанов), а не ресторанный бренд. Его данные должны:
1. **Скрываться** с Level 1 (главный Dashboard, секция «Бренды»)
2. Показываться **только** в секции `Цех` в Reports/Аналитика (где сейчас всё ₸0 — отдельный баг)

## Root Cause

`iiko /organizations` возвращает все legal entities, включая production kitchen. Finance-service `DashboardService.getBrandSummaries()` не фильтрует по типу (brand vs kitchen).

Prisma `Brand` модель не имеет флага `isProductionKitchen` или `type: BrandType`.

## Solution

**Шаг 1: Prisma schema (5 мин)**
```prisma
enum BrandType {
  RESTAURANT
  KITCHEN
  MARKETPLACE
}

model Brand {
  // ...
  type BrandType @default(RESTAURANT)
}
```
Миграция + backfill для существующих `Цех/KITCHEN` → `type=KITCHEN`.

**Шаг 2: aggregator-worker (10 мин)**
В `iiko-sync.service.ts` при upsert Brand определять тип:
```ts
const type = /цех|kitchen|fabrika/i.test(org.name) ? 'KITCHEN' : 'RESTAURANT';
```

**Шаг 3: finance-service (5 мин)**
`DashboardService.getBrandSummaries()`:
```ts
where: { type: 'RESTAURANT', isActive: true }
```

**Шаг 4: kitchen data flow (отдельно)**
Данные из Kitchen org идут в `KitchenPurchase`, `KitchenShipment`, `KitchenIncome` таблицы — сейчас они `₸0`, потому что aggregator-worker синки не работают. Отдельный todo на kitchen sync fix.

## Acceptance

- На Dashboard показываются ровно 5 брендов: BNA, DNA, JD, SB, KEX (без Цех)
- Reports/Аналитика секция «Цех» получает данные из `KitchenPurchase/Shipment/Income`
- `Brand.type` enum включает RESTAURANT, KITCHEN, MARKETPLACE

## Impact

Сейчас маржа по "бренду" Цех 6780% искажает общий аналитический вид — директор видит непонятный юнит в списке ресторанов.
