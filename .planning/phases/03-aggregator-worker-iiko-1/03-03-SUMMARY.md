---
phase: 03-aggregator-worker-iiko-1
plan: "03"
subsystem: aggregator-worker
tags: [dead-letter, sync-log, prisma, iiko, onec, unit-tests]
dependency_graph:
  requires: ["03-02"]
  provides: ["needsManualReview on SyncLog", "dead letter pattern in logSync()"]
  affects: ["packages/database", "apps/aggregator-worker"]
tech_stack:
  added: []
  patterns: ["dead letter queue pattern", "inner try/catch isolation"]
key_files:
  created:
    - packages/database/migrations/20260407000001_add_synclog_needs_manual_review/migration.sql
  modified:
    - packages/database/schema.prisma
    - apps/aggregator-worker/src/iiko/iiko-sync.service.ts
    - apps/aggregator-worker/src/onec/onec-sync.service.ts
    - apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts
decisions:
  - "Dead letter check wrapped in inner try/catch so DB failures never break logSync() caller"
  - "Trigger condition: exactly 3 recent logs all ERROR (not >=3) — strict 3-window check"
  - "Migration is manual SQL only (no prisma migrate dev) — no live DB available"
metrics:
  duration_seconds: 137
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 03 Plan 03: Dead Letter Pattern for SyncLog Summary

**One-liner:** SyncLog extended with needsManualReview field; logSync() in both IikoSyncService and OneCyncService marks 3 consecutive ERRORs for manual review via inner-try/catch-protected dead letter check.

## What Was Built

### Task 1: needsManualReview schema field + migration (commit: bcd0a15)

Added `needsManualReview Boolean @default(false)` to the `SyncLog` model in `packages/database/schema.prisma`. The field is placed after `createdAt` before the tenant relation.

Created migration SQL at `packages/database/migrations/20260407000001_add_synclog_needs_manual_review/migration.sql`:
```sql
ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;
```

Regenerated Prisma client (`npx prisma generate`) so the new field is available in TypeScript types for both services.

### Task 2: Dead letter logic + unit tests (commit: c19fed1)

Updated `logSync()` in **IikoSyncService** and **OneCyncService** with identical dead letter logic placed inside the existing outer try block, after `syncLog.create()`, wrapped in an inner try/catch:

```typescript
if (status === 'ERROR') {
  try {
    const recent = await this.prisma.syncLog.findMany({
      where: { tenantId, system },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, status: true },
    });
    if (recent.length === 3 && recent.every((log) => log.status === 'ERROR')) {
      await this.prisma.syncLog.updateMany({
        where: { id: { in: recent.map((l) => l.id) } },
        data: { needsManualReview: true },
      });
      this.logger.warn(`Dead letter: 3 consecutive ERRORs for system=${system} — marked needsManualReview=true`);
    }
  } catch (dlError) {
    this.logger.error(`Dead letter check failed: ...`);
  }
}
```

Updated the PrismaService mock in `iiko-sync.service.spec.ts` to add `findMany` and `updateMany` to the `syncLog` mock object.

Added `describe('dead letter pattern', ...)` with 3 unit tests:
1. 3 consecutive ERRORs → `updateMany` called with `needsManualReview: true`
2. 2 ERRORs + 1 SUCCESS → `updateMany` NOT called
3. Dead letter `findMany` throws → `syncRevenue` still rejects with original error (dead letter failure isolated)

## Test Results

All 23 tests pass:
- 3 new dead letter tests
- 20 pre-existing tests (allocation, app controller, iiko sync, sentry, scheduler, nomenclature)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `packages/database/schema.prisma` has `needsManualReview Boolean @default(false)` in SyncLog
- [x] `packages/database/migrations/20260407000001_add_synclog_needs_manual_review/migration.sql` exists
- [x] `iiko-sync.service.ts` has 3 occurrences of `needsManualReview`
- [x] `onec-sync.service.ts` has 3 occurrences of `needsManualReview`
- [x] Both services have `catch (dlError)` for inner isolation
- [x] Spec has `describe('dead letter pattern', ...)` block
- [x] All 23 tests pass
