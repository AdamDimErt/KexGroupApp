---
phase: 08-push-notifications
plan: 02
subsystem: aggregator-worker
tags: [alerts, monitoring, sync-health, revenue-threshold, large-expense, redis, http-dispatch]
dependency_graph:
  requires: [08-01]
  provides: [alert-service, scheduler-wiring]
  affects: [aggregator-worker, api-gateway]
tech_stack:
  added: []
  patterns: [fire-and-forget-http, redis-dedup-cooldown, method-scope-dateFrom]
key_files:
  created:
    - apps/aggregator-worker/src/alert/alert.service.ts
    - apps/aggregator-worker/src/alert/alert.module.ts
    - apps/aggregator-worker/src/alert/alert.service.spec.ts
  modified:
    - apps/aggregator-worker/src/app.module.ts
    - apps/aggregator-worker/src/scheduler/scheduler.module.ts
    - apps/aggregator-worker/src/scheduler/scheduler.service.ts
    - apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts
decisions:
  - "SyncLog.system is DataSource enum (IIKO|ONE_C), not a free string — checkSyncHealth uses 'IIKO'|'ONE_C' literal union type"
  - "dateFrom moved to method scope (before try) in syncRevenue/syncExpenses/syncOneCExpenses so alert checks can reference it"
  - "Redis mock declared at module scope (before jest.mock) so all tests share the same mock instance"
  - "Pre-existing iiko-sync.service.spec.ts SchedulerService test updated to provide AlertService mock (Rule 1 auto-fix)"
metrics:
  duration_seconds: 359
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 4
---

# Phase 8 Plan 2: AlertService — Sync Health, Revenue & Expense Monitoring

AlertService in aggregator-worker monitors sync health (IIKO/ONE_C), revenue thresholds (< 70% of 30-day average), and large expenses (> LARGE_EXPENSE_THRESHOLD_KZT), dispatching alerts to api-gateway via fire-and-forget HTTP POST with Redis-based 4-hour dedup cooldown.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AlertService with threshold checks and HTTP dispatch | 0345e44 | alert.service.ts, alert.module.ts, alert.service.spec.ts, app.module.ts |
| 2 | Wire AlertService into SchedulerService cron jobs | 1502cb6 | scheduler.module.ts, scheduler.service.ts, iiko-sync.service.spec.ts |

## What Was Built

**AlertService** (`apps/aggregator-worker/src/alert/alert.service.ts`):
- `checkSyncHealth(system: 'IIKO' | 'ONE_C')` — queries SyncLog for last SUCCESS; fires SYNC_FAILURE if > 1 hour ago
- `checkRevenueThresholds()` — iterates active restaurants; fires LOW_REVENUE if today's revenue < 70% of 30-day average (skips if avg=0)
- `checkLargeExpenses(since: Date)` — queries Expense records > LARGE_EXPENSE_THRESHOLD_KZT (default 500000 KZT); fires LARGE_EXPENSE per expense
- `shouldFireAlert(key: string)` — Redis GET/SET with 4-hour PX TTL for dedup; returns false if key exists
- `fireAlert()` (private) — HTTP POST to `{API_GATEWAY_URL}/internal/notifications/trigger` with `x-internal-secret` header, wrapped in try/catch (never throws)

**AlertModule** — imports HttpModule, provides+exports AlertService.

**Scheduler wiring**:
- `syncRevenue` — calls `checkSyncHealth('IIKO')` + `checkRevenueThresholds()` after sync
- `syncExpenses` — calls `checkSyncHealth('IIKO')` + `checkLargeExpenses(dateFrom)` after sync
- `syncOneCExpenses` — calls `checkSyncHealth('ONE_C')` + `checkLargeExpenses(dateFrom)` after sync
- All alert calls in separate try/catch — alert failures never block sync execution

## Test Results

10 unit tests in `alert.service.spec.ts` — all passing:
1. checkSyncHealth fires SYNC_FAILURE when > 1 hour ago
2. checkSyncHealth does NOT fire when < 1 hour ago
3. checkRevenueThresholds fires LOW_REVENUE when today < 70% avg
4. checkRevenueThresholds does NOT fire when above 70%
5. checkRevenueThresholds does NOT fire when avg=0 (no history)
6. checkLargeExpenses fires LARGE_EXPENSE for expenses > threshold
7. checkLargeExpenses does NOT fire for empty result
8. shouldFireAlert returns false when Redis key exists
9. shouldFireAlert returns true and sets Redis key when no cooldown
10. fireAlert catches HTTP errors without throwing

Total: 38/38 tests pass, tsc clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing AlertService dependency in iiko-sync.service.spec.ts**
- **Found during:** Task 2 — running full test suite
- **Issue:** Existing scheduler test instantiated SchedulerService without providing AlertService, causing NestJS DI resolution failure
- **Fix:** Added `{ provide: AlertService, useValue: mockAlertService }` to the test module providers; imported AlertService in the spec file
- **Files modified:** `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts`
- **Commit:** 1502cb6

**2. [Rule 1 - Bug] Adapted SyncLog.system type from free string to DataSource enum**
- **Found during:** Task 1 — reading Prisma schema
- **Issue:** Plan used `checkSyncHealth('iiko_revenue')` free strings, but `SyncLog.system` is typed as `DataSource` enum (`IIKO` | `ONE_C`)
- **Fix:** Changed method signature to `checkSyncHealth(system: 'IIKO' | 'ONE_C')` and updated scheduler call sites to `'IIKO'` and `'ONE_C'`
- **Files modified:** `alert.service.ts`, `scheduler.service.ts`
- **Commit:** 0345e44

## Self-Check: PASSED

- alert.service.ts: FOUND
- alert.module.ts: FOUND
- alert.service.spec.ts: FOUND
- Commit 0345e44: FOUND
- Commit 1502cb6: FOUND
