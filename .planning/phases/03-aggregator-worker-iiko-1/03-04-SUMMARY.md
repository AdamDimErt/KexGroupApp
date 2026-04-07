---
phase: 03-aggregator-worker-iiko-1
plan: "04"
subsystem: aggregator-worker
tags: [1c, onec, kitchen-shipments, expense, sync, cron, unit-tests]
dependency_graph:
  requires: ["03-03"]
  provides: ["syncKitchenShipmentsByRestaurant", "onec-sync.service.spec.ts"]
  affects: ["finance-service expense queries", "cost allocation (direct expenses bypass allocation)"]
tech_stack:
  added: []
  patterns: ["OData Document_RealizationOfGoodsAndServices", "restaurant matching by oneCId then name", "direct restaurantId binding bypassing cost allocation"]
key_files:
  created:
    - apps/aggregator-worker/src/onec/onec-sync.service.spec.ts
  modified:
    - apps/aggregator-worker/src/onec/onec-sync.service.ts
    - apps/aggregator-worker/src/scheduler/scheduler.service.ts
decisions:
  - "Skip unmatched counterparty with logger.warn + skippedCount, never throw — partial sync is better than total failure"
  - "Restaurant matching: oneCId equality (primary) then case-insensitive name match (fallback)"
  - "DdsArticle code=kitchen_shipment with allocationType=DIRECT — kitchen shipments are direct costs, not distributed"
  - "Cron slot :25 confirmed free — runs after kitchen income (:15) and before cost allocation (:45)"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-07T06:37:00Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 03 Plan 04: 1C Kitchen Shipments by Restaurant Sync Summary

1C kitchen shipments sync via Document_RealizationOfGoodsAndServices with direct restaurant binding — Expense records carry restaurantId (not null) so cost allocation engine skips them.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add syncKitchenShipmentsByRestaurant() + cron :25 | e120593 | onec-sync.service.ts, scheduler.service.ts |
| 2 | Create onec-sync.service.spec.ts (5 tests) | a158589 | onec-sync.service.spec.ts |

## What Was Built

### syncKitchenShipmentsByRestaurant() in OneCyncService

Fetches 1C `Document_RealizationOfGoodsAndServices` documents via OData, matches each document's `Counterparty` field to a restaurant record (by `oneCId` priority, then case-insensitive name fallback), and upserts an `Expense` with:
- `restaurantId: restaurant.id` (direct binding — not null, bypasses cost allocation)
- `source: 'ONE_C'`
- `syncId: 'onec:kitchenshipment:{Ref_Key}'` (deduplication key)
- `articleId` from a get-or-create `DdsArticle` with `code='kitchen_shipment'`, `allocationType='DIRECT'`

Unmatched counterparties are logged as warnings and skipped (`skippedCount++`). A `SyncLog` entry is written on both success and error paths. Sentry captures exceptions via the static top-level import (Plan 03-02).

### Cron Job in SchedulerService

`@Cron('25 * * * *')` — every hour at minute :25 (confirmed free slot, sits between kitchen income at :15 and cost allocation at :45). Passes a 24-hour rolling window (`dateFrom = now - 1 day`, `dateTo = now`).

### Unit Tests (onec-sync.service.spec.ts)

5 tests covering:
1. Service instantiation
2. Matched counterparty creates `Expense` with correct `restaurantId`, `source`, `articleId`
3. Unmatched counterparty: `expense.upsert` not called, `SyncLog` recorded as SUCCESS with `recordsCount: 0`
4. Missing `DdsArticle`: creates group and article with correct `code`, `source`, `allocationType`
5. API failure: `SyncLog` receives `status: 'ERROR'`, exception rethrown

All 28 tests in the suite pass.

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Skip unmatched counterparty with warn, never throw** — a shipment document with no matching restaurant should not fail the entire sync run. Logged clearly for operator review.

2. **Restaurant matching by oneCId first, then name** — oneCId is the stable unique identifier; name matching is case-insensitive fallback for restaurants not yet linked to 1C records.

3. **allocationType=DIRECT on kitchen_shipment DdsArticle** — kitchen shipments go to specific restaurants with known restaurantId, so the cost allocation engine must not re-distribute them.

4. **Cron at :25** — confirmed free slot in scheduler; positioned between existing 1C cron jobs (:05 expenses, :10 purchases, :15 income) and cost allocation (:45).

## Self-Check

- [x] `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` exists
- [x] `syncKitchenShipmentsByRestaurant` in `onec-sync.service.ts` — commit e120593
- [x] `@Cron('25 * * * *')` in `scheduler.service.ts` — commit e120593
- [x] 5 onec-sync tests pass, 28 total pass — commit a158589
