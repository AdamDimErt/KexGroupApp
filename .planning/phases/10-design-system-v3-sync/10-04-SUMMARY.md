# Phase 10-04: Wave 4 — Hook Migration & Type-Safe RestaurantCard Props

**Date:** 2026-04-19
**Agent:** mobile-agent
**Status:** COMPLETE

## Result

`npx tsc --noEmit` exits with code 0 (zero errors).
`npm test` passes 8/8 tests.

## What Was Done

### New File

- `src/utils/brand.ts` — pure utility module with five functions:
  - `resolveBrand(nameOrSlug)` — keyword-matches "doner"/"донер" → DNA/Doner, fallback BNA/Burger
  - `mapLegacyStatus(status)` — maps green→above, red→below, yellow/null→onplan
  - `computeMarginPct(revenue, financialResult)` — returns null when revenue ≤ 0
  - `computePlanAttainment(revenue, plannedRevenue)` — capped at 150%, returns 100 when no plan data
  - `formatPeriodLabel(from?, to?)` — "1–19 апр 2026" format, handles same-month and cross-month ranges

### Hooks Updated

- `src/hooks/useDashboard.ts`
  - `DashboardRestaurantItem` interface extended with all RestaurantCard v2 required props
  - Mapping uses `resolveBrand`, `mapLegacyStatus`, `computeMarginPct`, `computePlanAttainment`, `formatPeriodLabel`
  - Legacy fields `type`, `dev`, `planPct` retained as optional for backward-compat
  - Unused `maxRevenue` calculation removed

- `src/hooks/useBrandDetail.ts`
  - `EnrichedRestaurant` interface extended with all RestaurantCard v2 required props
  - `revenue.total` unwrapping kept via existing pattern
  - Brand code/cuisine derived from `brandData.name` (same brand applies to all its restaurants)
  - Period label derived from `brandData.period` (present in `BrandDetailDto`)

- `src/hooks/useRestaurantList.ts`
  - `RestaurantListItem` interface extended with all RestaurantCard v2 required props
  - `mapRestaurant` helper updated — uses all brand utils, drops old hardcoded `planPct: 65` logic
  - Legacy fields `type`, `dev`, `planPct` retained as optional

### Screens Updated

- `src/screens/DashboardScreen.tsx` — removed `(r as any).*` casts and inline status ternary adapter, removed `// TODO: Wave 4` comment
- `src/screens/BrandDetailScreen.tsx` — same cleanup
- `src/screens/PointsScreen.tsx` — same cleanup

## STUB Fields (require Phase 11 — finance-service API extension)

| Field | Current stub | Phase 11 target |
|---|---|---|
| `plannedRevenue` (all levels) | `revenue * 1.05` (+5% of actual) | Real plan target from finance-service API |
| `transactions` (brand level) | `null` | Aggregate from restaurants or expose in `BrandIndicatorDto` |
| `transactions` (restaurant list) | `null` | Add `salesCount` to `RestaurantIndicatorDto` (currently only in `RestaurantDetailDto`) |
| `periodLabel` (restaurant list) | Current date only (no from/to available in list context) | Pass period through `useRestaurantList` params |

## Known Limitations

1. `periodLabel` in `useRestaurantList` always shows today's date because `RestaurantIndicatorDto` does not carry period boundaries — the period comes from `BrandDetailDto` but is not threaded through the map function. Phase 11 should pass `period` from the parent brand into `mapRestaurant`.

2. `brand`/`cuisine` on restaurant items in `useRestaurantList` is derived from `brandName` string — this is robust as long as brand names contain "burger" or "doner". New brand names should be tested against `resolveBrand`.

3. `computePlanAttainment` caps at 150% by design to avoid extreme bar overflow in the UI.

## Verification

- `npx tsc --noEmit` — exit 0, zero errors
- `npm test` — 8/8 passed (useOperations role-gate tests)

## Files Changed

1. `src/utils/brand.ts` — NEW
2. `src/hooks/useDashboard.ts` — updated
3. `src/hooks/useBrandDetail.ts` — updated
4. `src/hooks/useRestaurantList.ts` — updated
5. `src/screens/DashboardScreen.tsx` — updated
6. `src/screens/BrandDetailScreen.tsx` — updated
7. `src/screens/PointsScreen.tsx` — updated

## Ready for git commit: YES
