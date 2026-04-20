---
created: 2026-04-20T00:46:00Z
title: "Выше плана · 0.0%" показывается для всех брендов вместо реального delta
area: mobile
priority: high
files:
  - apps/mobile-dashboard/src/utils/brand.ts:46 (computePlanAttainment)
  - apps/mobile-dashboard/src/components/RestaurantCard.tsx (label rendering)
  - apps/mobile-dashboard/src/hooks/useDashboard.ts (вызов)
---

## Problem

Под каждым брендом на Dashboard написано **«Выше плана · 0.0%»**, даже когда выручка *ниже* плана:

| Бренд | Выручка | План | Факт delta | Отображается |
|---|---|---|---|---|
| BNA | 29.28M | 30.74M | **−4.7%** (below) | Выше плана · 0.0% |
| DNA | 42.83M | 44.97M | −4.8% | Выше плана · 0.0% |
| JD | 2.01M | 2.11M | −4.7% | Выше плана · 0.0% |

Все 6 брендов показывают `0.0%` — баг маскирует то, что **ни один бренд не выполнил план**.

## Root Cause

`brand.ts:46`:
```ts
export function computePlanAttainment(revenue: number, plannedRevenue: number): number {
  if (!plannedRevenue || plannedRevenue <= 0) return 100;
  return Math.min(150, (revenue / plannedRevenue) * 100); // cap at 150%
}
```

Функция возвращает **% выполнения плана** (например, 95.3%), а UI ожидает **delta к плану** (например, −4.7%). В `RestaurantCard` вероятно идёт `attainmentPct - 100` → `95.3 - 100 = -4.7`, но с округлением/форматированием превращается в `0.0%`.

Также текст «Выше плана» хардкод — должен быть:
- `Ниже плана · −4.7%` (actual < plan)
- `По плану · 0.0%` (−0.5% ≤ delta ≤ +0.5%)
- `Выше плана · +3.2%` (actual > plan)

## Solution

**1. Разделить две функции:**
```ts
/** Процент выполнения (95.3%) */
export function computePlanAttainment(revenue: number, plannedRevenue: number): number | null {
  if (!plannedRevenue || plannedRevenue <= 0) return null;
  return Math.min(150, (revenue / plannedRevenue) * 100);
}

/** Delta в процентах (-4.7, +3.2) для UI label */
export function computePlanDelta(revenue: number, plannedRevenue: number): number | null {
  const att = computePlanAttainment(revenue, plannedRevenue);
  return att === null ? null : att - 100;
}

/** Текстовая метка статуса */
export function formatPlanLabel(deltaPct: number | null): { text: string; status: 'above' | 'onplan' | 'below' } {
  if (deltaPct === null) return { text: 'Нет плана', status: 'onplan' };
  if (deltaPct > 0.5)  return { text: `Выше плана · +${deltaPct.toFixed(1)}%`, status: 'above' };
  if (deltaPct < -0.5) return { text: `Ниже плана · ${deltaPct.toFixed(1)}%`, status: 'below' };
  return { text: `По плану · ${deltaPct.toFixed(1)}%`, status: 'onplan' };
}
```

**2. Обновить `useDashboard.ts` чтобы hook возвращал готовый label + status.**

**3. В `RestaurantCard` покрасить по status:**
- `above` → `colors.status.positive` (зелёный)
- `below` → `colors.status.danger` (красный)
- `onplan` → `colors.text.secondary` (серый)

## Acceptance

- BNA (29.28M/30.74M) показывает `Ниже плана · −4.7%` красным
- Jest тесты:
  - `computePlanDelta(29_280_000, 30_740_000)` → `-4.75`
  - `formatPlanLabel(-4.75).status` → `'below'`
  - `formatPlanLabel(null).text` → `'Нет плана'`

## Связано с

- `todos/pending/2026-04-17-*.md` — ни один не пересекается
- После фикса план-stub (когда подтянем реальные планы из finance-service) — `plannedRevenue = revenue * 1.05` в `useDashboard.ts` надо убрать
