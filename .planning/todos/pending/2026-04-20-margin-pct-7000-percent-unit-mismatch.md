---
created: 2026-04-20T00:40:00Z
title: Маржа показывает 6500-7050% вместо реальных ~68% — unit mismatch в financialResult
area: finance-service + mobile
priority: critical
files:
  - apps/mobile-dashboard/src/utils/brand.ts:37
  - apps/mobile-dashboard/src/hooks/useDashboard.ts:72
  - apps/finance-service/src/dashboard/dto/*.dto.ts
---

## Problem

На Dashboard все 6 брендов показывают абсурдную маржу:

| Бренд | Выручка | План | Маржа |
|---|---|---|---|
| Burger na Abaya | ₸29.28M | ₸30.74M | **7048%** |
| Doner na Abaya | ₸42.83M | ₸44.97M | **6831%** |
| Just Doner | ₸2.01M | ₸2.11M | **6990%** |
| Salam Bro | ₸20.54M | ₸21.57M | **6822%** |
| КексБрэндс | ₸288K | ₸302K | **6533%** |
| Цех | ₸4.39M | ₸4.60M | **6780%** |

Формула в `brand.ts:37` корректная:
```ts
export function computeMarginPct(revenue: number, financialResult: number): number | null {
  if (!revenue || revenue <= 0) return null;
  return (financialResult / revenue) * 100;
}
```

Ожидаемая маржа по суммам = `(99.3M - 30.9M) / 99.3M × 100 = 68.8%`. Показанное значение ~70 × ожидаемое — **financialResult возвращается в 100× раз больше** (вероятно, в **копейках/тиынах**, тогда как `revenue` в **тенге**).

## Root Cause (гипотеза)

В Prisma схеме `Expense.amount` и `FinancialSnapshot.revenue` могут храниться в разных единицах (int → kopecks vs Decimal → tenge). finance-service `DashboardService.getSummary()` считает `financialResult = revenue - expenses` и **не нормализует единицы**.

## Solution

**Шаг 1: подтвердить гипотезу (5 мин)**
```sql
SELECT brand_id, revenue, financial_result
FROM "FinancialSnapshot" fs
JOIN "Expense" e ON e.date = fs.date
WHERE fs.date = '2026-04-20'
LIMIT 5;
```
Сравнить порядок: если `financial_result / revenue ≈ 70`, единицы расходятся.

**Шаг 2: исправить на бэке (правильное место)**
- В `apps/finance-service/src/dashboard/dashboard.service.ts` при сборе `brandSummary` привести `expenses` к тенге до вычитания:
  ```ts
  const expensesTenge = expenses / 100; // если в копейках
  const financialResult = revenue - expensesTenge;
  ```
- Либо в Prisma schema зафиксировать `@db.Money` / `Decimal(12,2)` на обоих полях и пересинхронить.

**Шаг 3: temporary mobile workaround (если бэк быстро не исправить)**
```ts
// useDashboard.ts
marginPct: computeMarginPct(brand.revenue, brand.financialResult / 100),
```
⚠️ Только как временный hotfix. Документировать и удалить после фикса бэка.

## Acceptance

- Маржа на Dashboard для BNA ≈ 68%, DNA ≈ 68%, KEX-sum маржа ≈ 68.8%
- Баланс KPI = Выручка − Расходы (99.3 − 30.9 = 68.4M) — **сейчас 68.5M корректно** на уровне KPI, т.е. KPI-уровень **не** страдает от mismatch, только per-brand
- Jest тест: `expect(computeMarginPct(29_280_000, 2_010_000)).toBe(6.87)`

## Impact

Блокирующий баг для демо — директор не поверит дашборду, где маржа 7000%.
