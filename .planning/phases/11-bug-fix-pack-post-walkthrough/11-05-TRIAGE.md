# 11-05 TRIAGE — BUG-11-1 Hypothesis Analysis

**Date:** 2026-04-20
**Source:** 11-05-API-SAMPLE.md (live dashboard API response)

## Diagnostic Ratio Table

| Brand           | rev_api (tenge)  | fr_api (tenge) | fr/rev  | fr/(rev×100) | screen_margin | screen/expected |
|-----------------|----------------:|----------------:|--------:|-------------:|-------------:|----------------:|
| Burger na Abaya |  29,275,133.01  |  20,633,794.04 | 0.7048  |  0.007048    |     7048%    |      ~100×      |
| Doner na Abaya  |  42,832,748.93  |  29,260,215.23 | 0.6831  |  0.006831    |     6831%    |      ~100×      |
| Just Doner      |   2,008,778.55  |   1,404,052.44 | 0.6990  |  0.006990    |     6990%    |      ~100×      |
| Salam Bro       |  20,542,632.52  |  14,013,908.51 | 0.6822  |  0.006822    |     6822%    |      ~100×      |
| КексБрэндс      |     287,601.82  |     187,897.34 | 0.6533  |  0.006533    |     6533%    |      ~100×      |

**Key finding:** `fr/rev` ≈ 0.65–0.71 (tenge, expected range). The API returns CORRECT values.
The ×100 inflation happens AFTER the API response, inside the mobile render layer.

## Hypothesis Evaluation

### H3 — Field name mismatch
**Status: PARTIALLY — render-layer unit contract mismatch**

Mobile hook (useDashboard.ts line 75):
```typescript
marginPct: computeMarginPct(brand.revenue, brand.financialResult)
```

`computeMarginPct` returns `(financialResult / revenue) * 100` = **70.48** (correct percentage).

`RestaurantCard.tsx` line 49-52:
```typescript
function formatMargin(v: number | null): string {
  if (v === null) return '—';
  return `${Math.round(v * 100)}%`;  // BUG: treats marginPct as a 0-1 ratio
}
```

`formatMargin(70.48)` = `Math.round(70.48 * 100)%` = **7048%** — exact match to screen.

The formatter was written expecting a 0-1 decimal fraction (like deltaPct uses), but `marginPct` is a 0-100 percentage. This is the unit-contract mismatch.

### H4 — Pre-multiplied value in service/DTO
**Status: RULED OUT**

`fr/rev` = 0.7048, not 70.48. The API returns tenge values. `financialResult = revenue - expenses` arithmetically verified. No pre-multiplication in service.

### H1 — Decimal.toNumber() inflation
**Status: RULED OUT**

`totalRevenue` = 94,946,894.83 in API — matches screen display of ₸94.9M. Decimal conversion is correct for both revenue and financialResult.

### H2 — Cost Allocation double-count
**Status: RULED OUT**

`fr = revenue - expenses` holds exactly per API data. No allocation accumulated — `getDashboardSummary` uses only `FinancialSnapshot.directExpenses`. financialResult is not inflated; it is the correct tenge difference.

### H5 — Worker stores inflated value
**Status: RULED OUT**

SQL verify (plan 11-01) confirmed `directExpenses/revenue` ratios = 22–49% (normal tenge range). Worker stores correct tenge values.

## Root Cause Summary

```
computeMarginPct(29,275,133, 20,633,794) = 70.48   [correct, percentage]
formatMargin(70.48) = Math.round(70.48 * 100)% = 7048%  [BUG: *100 applied twice]
```

The fix is in `RestaurantCard.tsx` `formatMargin` function:
- **BEFORE:** `return \`${Math.round(v * 100)}%\``
- **AFTER:** `return \`${Math.round(v)}%\``

This is a RENDER LAYER bug, not a data layer bug. It is a variant of H3 (unit-contract mismatch between `marginPct` as a percentage and `formatMargin` interpreting it as a 0-1 ratio).

The fix touches exactly ONE file in the mobile-dashboard module.
No division-by-100 added to computeMarginPct or useDashboard.ts (CONTEXT.md BUG-11-1 LOCKED constraint respected).

DECISION: H3_CONFIRMED
FIX_TARGET: apps/mobile-dashboard/src/components/RestaurantCard.tsx
FIX_DESCRIPTION: Change formatMargin(v) from `Math.round(v * 100)` to `Math.round(v)` — marginPct is already a percentage (0-100), not a 0-1 fraction. The extra *100 produced 7000% display.
