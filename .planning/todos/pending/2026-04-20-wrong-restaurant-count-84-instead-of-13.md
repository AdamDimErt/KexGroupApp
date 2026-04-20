---
created: 2026-04-20T00:48:00Z
title: На Dashboard пишет "84 точек" вместо реальных 13 ресторанов KEX
area: mobile + finance-service
priority: high
files:
  - apps/mobile-dashboard/src/hooks/useDashboard.ts
  - apps/mobile-dashboard/src/screens/DashboardScreen.tsx
  - apps/finance-service/src/dashboard/dashboard.service.ts
---

## Problem

В секции «Бренды» на Dashboard правый верхний угол показывает **«84 точек»**. Согласно TZ KEX GROUP имеет:
- TOO «Burger na Abaya» — 8 точек
- TOO «A Doner» — 5 точек
- **Итого: 13 физических точек**

84 ≈ 13 × 6.5. Вероятно агрегация идёт не по уникальным `Restaurant.id`, а по чему-то другому (количество операций, смен, или дублирование через брендовый join).

## Hypothesis

Finance-service `DashboardService.getSummary()` вероятно делает:
```ts
const totalPoints = brands.reduce((sum, b) => sum + b.restaurantCount, 0);
```
где `brand.restaurantCount` — не COUNT DISTINCT, а COUNT(*) после JOIN с FinancialSnapshot (за каждый день/смену) — это даёт инфляцию.

Либо это `salesCount` (количество чеков) ошибочно показывается как количество точек.

## Solution

**Шаг 1: проверить API (5 мин)**
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/dashboard/summary | jq '.totalRestaurants, .restaurantCount, .pointsCount'
```

Посмотреть что возвращает finance-service и что мобильный hook читает в `Бренды: 84 точек`.

**Шаг 2: fix на бэке (если API вернёт 84)**
В `dashboard.service.ts`:
```ts
const totalRestaurants = await this.prisma.restaurant.count({
  where: { isActive: true, tenantId, brand: { type: 'RESTAURANT' } }
});
```

**Шаг 3: fix на мобиле (если API вернёт 13, но mobile показывает 84)**
В `useDashboard.ts` найти поле, которое пишется в `точек` — возможно используется `totalSales` или `salesCount` вместо `restaurantCount`.

## Acceptance

- Dashboard показывает «13 точек» (или «13 ресторанов»)
- После фикса Kitchen (см. связанный todo) — «12 точек» (без Kitchen)
- После подключения iiko structure sync — число обновляется автоматически

## Возможно связано с

Цех показывается как бренд — если KITCHEN брэнд даёт N точек, то `84 = 13 + kitchen_shifts_count`. Проверить.
