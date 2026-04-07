---
phase: 04-finance-service
plan: 02
subsystem: finance-service
tags: [dashboard, level4, operations, lastSyncAt, pagination]
dependency_graph:
  requires: []
  provides: [getArticleOperations, lastSyncAt-from-SyncLog]
  affects: [apps/finance-service/src/dashboard]
tech_stack:
  added: []
  patterns: [prisma-aggregate-max, prisma-findMany-include-relation, offset-limit-pagination]
key_files:
  created:
    - apps/finance-service/src/dashboard/dto/operations.dto.ts
  modified:
    - apps/finance-service/src/dashboard/dashboard.service.ts
    - apps/finance-service/src/dashboard/dashboard.controller.ts
    - apps/finance-service/src/dashboard/dashboard.service.spec.ts
decisions:
  - "OperationsQueryDto uses `declare restaurantId` to override optional field from base class DashboardQueryDto, avoiding TS2612 error"
  - "getDashboardSummary now queries syncLog.aggregate for real lastSyncAt instead of hardcoded null"
  - "getArticleOperations route registered BEFORE article/:groupId to prevent NestJS route collision"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-07T08:15:03Z"
  tasks_completed: 2
  files_changed: 4
  tests_before: 8
  tests_after: 30
---

# Phase 4 Plan 2: lastSyncAt Fix + Level 4 Operations Endpoint Summary

**One-liner:** Real lastSyncAt from SyncLog MAX(createdAt) and paginated expense operations endpoint with allocationCoefficient join for Level 4 drill-down.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create operations.dto.ts + fix lastSyncAt + add getArticleOperations | 73e7914 | Done |
| 2 | Add controller endpoint + extend tests | 7eaca77 | Done |

## What Was Built

### operations.dto.ts (new file)
Three classes: `OperationsQueryDto` (extends DashboardQueryDto, adds required restaurantId + optional limit/offset), `OperationItemDto` (id, date, amount, comment, source, allocationCoefficient, restaurantName), `ArticleOperationsDto` (items, total, period).

### getDashboardSummary fix
Replaced `lastSyncAt: null` hardcode with a real `prisma.syncLog.aggregate({ _max: { createdAt: true }, where: { tenantId, status: 'SUCCESS' } })` query. `lastSyncStatus` is now `'success'` when a sync exists, `null` otherwise.

### getArticleOperations method
New method in DashboardService with signature `(articleId, restaurantId, dateFrom, dateTo, limit=50, offset=0)`. Runs two queries: `expense.count` for total pagination count, `expense.findMany` with `include: { restaurant, costAllocations }` for data. Maps results to `OperationItemDto` shape including `allocationCoefficient` from the most recent `costAllocations` entry (ordered by `createdAt desc`, take 1).

### Controller route (BEFORE article/:groupId)
`GET /dashboard/article/:articleId/operations` registered in dashboard.controller.ts BEFORE the `article/:groupId` route to prevent NestJS route collision. Validates `restaurantId` presence and delegates to `dashboardService.getArticleOperations`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript TS2612 on OperationsQueryDto.restaurantId**
- **Found during:** Task 1
- **Issue:** `DashboardQueryDto` already declares optional `restaurantId`. Re-declaring it in `OperationsQueryDto` causes TS2612 "will overwrite base property".
- **Fix:** Used `declare restaurantId: string` instead of plain `restaurantId: string` to properly override the base class field type without initializer conflict.
- **Files modified:** `apps/finance-service/src/dashboard/dto/operations.dto.ts`
- **Commit:** 73e7914

**2. [Rule 1 - Bug] Test mocks used wrong Prisma method for getDashboardSummary**
- **Found during:** Task 2
- **Issue:** Plan template mocked `financialSnapshot.aggregate` but `getDashboardSummary` uses `financialSnapshot.groupBy`. Tests would have failed.
- **Fix:** Used `financialSnapshot.groupBy.mockResolvedValue([])` in the lastSyncAt tests.
- **Files modified:** `apps/finance-service/src/dashboard/dashboard.service.spec.ts`
- **Commit:** 7eaca77

## Test Results

```
Test Suites: 3 passed, 3 total
Tests:       30 passed, 30 total
```

- Dashboard service: 13 tests (9 original + 2 lastSyncAt + 2 getArticleOperations pattern tests + 1 pagination test = 13 total in spec)
- Full suite: 30 tests passing

## Self-Check: PASSED

Files verified:
- apps/finance-service/src/dashboard/dto/operations.dto.ts — created
- apps/finance-service/src/dashboard/dashboard.service.ts — getArticleOperations + syncLog.aggregate present
- apps/finance-service/src/dashboard/dashboard.controller.ts — article/:articleId/operations before article/:groupId
- apps/finance-service/src/dashboard/dashboard.service.spec.ts — syncLog mock + 5 new tests
