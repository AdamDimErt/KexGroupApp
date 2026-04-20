---
created: 2026-04-20T00:56:00Z
title: Оранжевый delta-чип "0.0%" на каждом бренде — period-over-period не реализован
area: mobile + finance-service
priority: medium
files:
  - apps/mobile-dashboard/src/components/RestaurantCard.tsx (delta chip)
  - apps/mobile-dashboard/src/hooks/useDashboard.ts (changePercent mapping)
  - apps/finance-service/src/dashboard/dashboard.service.ts (previousPeriodRevenue)
---

## Problem

У каждой карточки бренда (BNA, DNA, JD, SB, KEX, Цех) в правом верхнем углу стоит оранжевый чип **«0.0%»**. Это поле `changePercent` — процент изменения выручки period-over-period.

Сейчас:
- Все 6 брендов: `0.0%`
- Цвет оранжевый → визуально трактуется как warning
- Period = «Сегодня»

`useDashboard.ts` mapping:
```ts
const changePercent = brand.changePercent ?? 0;
```

finance-service скорее всего не считает `changePercent` (возвращает `null`/`undefined`/`0`) — мобильный рендерит `0`.

## Solution

**Вариант A (быстрый): скрыть чип на "Сегодня"**
```tsx
{period !== 'today' && <DeltaChip pct={changePercent} />}
```
Показывать delta только если есть осмысленное сравнение (Вчера, Неделя и т.д.).

**Вариант B (правильный): реализовать comparison в finance-service**
```ts
// dashboard.service.ts
async getSummary(period: PeriodDto) {
  const current = await this.getRevenueForPeriod(period);
  const prev    = await this.getRevenueForPeriod(period.previousPeriod());
  const changePercent = prev.revenue > 0
    ? ((current.revenue - prev.revenue) / prev.revenue) * 100
    : null; // нет базы для сравнения
  return { ...current, changePercent };
}
```
Для каждого бренда также.

**Вариант C (компромисс):**
- Если `changePercent === null` → скрыть чип
- Если в пределах ±0.5% → `0%` серым
- Остальное → оранжевый (down) / зелёный (up) с знаком

## Acceptance

- На «Сегодня» delta-чип не показывается (нет corresponding prev period в пределах «Сегодня»)
- На «Вчера» / «Неделя» / «Месяц» чип показывает реальный %
- При `changePercent === 0` (точное совпадение) — серый «0.0%»
- Цвет: green up / red down / gray neutral

## Impact (почему medium, не high)

Визуально не блокирует, данные внизу (Выручка, План, Маржа) более критичны. Но `0.0%` на каждой карточке выглядит как баг и подрывает доверие.
