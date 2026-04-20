---
phase: 11-bug-fix-pack-post-walkthrough
plan: "01"
subsystem: finance-service
tags: [wave1, backend, dashboard, brand-filter, restaurant-count, sql-verify]
dependency_graph:
  requires:
    - "BrandType enum in schema.prisma (Wave 0 plan 00)"
    - "Wave 0 migration SQL for Brand.type column"
  provides:
    - "getDashboardSummary filters KITCHEN brands (type=RESTAURANT)"
    - "restaurantCount uses groupBy not _count include"
    - "Wave 0 DB migration applied to live DB"
  affects:
    - "apps/finance-service (dashboard.service.ts)"
    - "apps/mobile-dashboard (dashboard screen will no longer show Цех tile)"
tech_stack:
  added: []
  patterns:
    - "Prisma groupBy for filtered counts (vs _count include which lacks where support)"
    - "BrandType enum filter in Prisma where clause"
    - "SQL HARD GATE verification before unit-divisor change"
key_files:
  created:
    - ".planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md"
  modified:
    - "apps/finance-service/src/dashboard/dashboard.service.ts"
    - "apps/finance-service/src/dashboard/dashboard.service.spec.ts"
decisions:
  - "BUG-11-1 kopeck hypothesis REJECTED — directExpenses/revenue ratio 22-49% is tenge not kopecks; EXPENSE_UNIT_DIVISOR not added"
  - "BUG-11-3 fix: type:RESTAURANT filter added to both brand.findMany and restaurant.findMany where clause"
  - "BUG-11-5 fix: restaurant.groupBy replaces brand._count.restaurants per Pitfall 3 (Prisma _count has no where filter)"
  - "Wave 0 migration applied manually to live DB: BrandType enum + Brand.type column; Цех brand set to KITCHEN"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-20"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 11 Plan 01: Backend Finance Wave 1 Summary

**One-liner:** SQL verification rejected kopeck hypothesis; BUG-11-3 + BUG-11-5 fixed by adding `type:'RESTAURANT'` brand filters and replacing unfiltered `_count` with `restaurant.groupBy`.

## What Was Done

### Task 1: HARD GATE — SQL Verification (commit 4a02b54)

Ran SQL query against live DB (`finance.FinancialSnapshot`): `directExpenses / revenue` ratios range from 22% to 49.7% across 10,326 rows. No 70x ratio indicating kopeck storage was found. Values are economically normal tenge amounts (e.g. revenue 221,052 KZT, expenses 60,799 KZT = 27.5% ratio).

**DECISION: REJECTED.** The kopeck-storage hypothesis is false. Task 3 (EXPENSE_UNIT_DIVISOR = 100) was not implemented.

The 7000% margin bug reported in BUG-11-1 is likely caused by a different mechanism outside plan 11-01 scope.

Also applied the Wave 0 DB migration as part of this plan:
```sql
CREATE TYPE "finance"."BrandType" AS ENUM ('RESTAURANT', 'KITCHEN', 'MARKETPLACE');
ALTER TABLE "finance"."Brand" ADD COLUMN "type" "finance"."BrandType" NOT NULL DEFAULT 'RESTAURANT';
UPDATE "finance"."Brand" SET "type" = 'KITCHEN' WHERE "name" ~* 'цех|kitchen|fabrika';
```
Result: 1 brand updated — "Цех" is now typed as KITCHEN. 5 consumer brands remain RESTAURANT.

### Task 2: BUG-11-3 + BUG-11-5 — Brand Type Filter + Filtered RestaurantCount (commit f91ec68)

**BUG-11-3 fix in `getDashboardSummary()`:**

1. `brand.findMany` — added `type: 'RESTAURANT'` to `where` clause:
   ```typescript
   where: { company: { tenantId }, isActive: true, type: 'RESTAURANT' }
   ```
2. `restaurant.findMany` — added `brand.type: 'RESTAURANT'` to `where.brand`:
   ```typescript
   where: { brand: { company: { tenantId }, type: 'RESTAURANT' }, isActive: true, ... }
   ```
3. Removed `include: { _count: { select: { restaurants: true } } }` (no longer needed).

**BUG-11-5 fix — explicit groupBy query (Pitfall 3 workaround):**

```typescript
const restaurantCountRows = await this.prisma.restaurant.groupBy({
  by: ['brandId'],
  where: { brandId: { in: brandIds }, isActive: true },
  _count: { id: true },
});
const countMap = new Map(restaurantCountRows.map((row) => [row.brandId, row._count.id]));
```
Line `restaurantCount: brand._count.restaurants` replaced with `restaurantCount: countMap.get(brand.id) ?? 0`.

**Spec updates:**
- Added `groupBy: jest.fn()` to `restaurant` mock object
- Updated 2 existing `getDashboardSummary - lastSyncAt` tests to mock `restaurant.groupBy`
- Added 3 new test cases:
  - `BUG-11-3`: verifies `brand.findMany` called with `type: 'RESTAURANT'`
  - `BUG-11-3`: verifies `restaurant.findMany` called with `brand.type: 'RESTAURANT'`
  - `BUG-11-5`: verifies `restaurant.groupBy` called with correct where/by/_count; `restaurantCount` equals 3

### Task 3: BUG-11-1 EXPENSE_UNIT_DIVISOR

**Skipped** — Task 1 HARD GATE returned REJECTED. No code changes made.

## Commits

| Task | Commit  | Description |
|------|---------|-------------|
| 1    | 4a02b54 | chore(11-01): HARD GATE SQL verification — kopeck hypothesis REJECTED |
| 2    | f91ec68 | fix(11-01): filter kitchen brands from dashboard + fix restaurantCount (BUG-11-3 + BUG-11-5) |
| 3    | skipped | Task 3 not executed (HARD GATE REJECTED) |

## Test Results

```
Test Suites: 3 passed, 3 total
Tests:       1 todo, 53 passed, 54 total
```

All existing tests pass; 3 new tests added and passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing `restaurant.groupBy` in Prisma mock**
- **Found during:** Task 2 implementation
- **Issue:** `mockPrismaService.restaurant` had no `groupBy` method; new service code calls `this.prisma.restaurant.groupBy()` causing runtime error in existing `getDashboardSummary - lastSyncAt` tests
- **Fix:** Added `groupBy: jest.fn()` to restaurant mock; mocked return in both existing lastSyncAt tests
- **Files modified:** `apps/finance-service/src/dashboard/dashboard.service.spec.ts`
- **Commit:** f91ec68

### Task 3 Skipped

Task 3 (BUG-11-1 EXPENSE_UNIT_DIVISOR) was explicitly gated on Task 1 CONFIRMED outcome. Since Task 1 returned REJECTED, Task 3 was not implemented. This is expected plan behavior, not a deviation.

## Notes for Downstream

- **BUG-11-1 margin bug:** Root cause is NOT kopeck storage. Separate investigation needed — possibly HQ expense allocation inflating total or UI computation error.
- **DB migration applied:** `finance.BrandType` enum exists, `finance.Brand.type` column exists with correct values. No further migration needed for Wave 1/2/3 to use `type` filters.
- **Prisma client:** Was already regenerated in Wave 0 (commit 95d1124). `BrandType` is in the Prisma client types.

## Self-Check: PASSED
