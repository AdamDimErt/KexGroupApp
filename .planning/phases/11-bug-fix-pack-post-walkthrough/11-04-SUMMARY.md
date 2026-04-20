---
phase: 11-bug-fix-pack-post-walkthrough
plan: "04"
subsystem: aggregator-worker
tags: [wave3, backend, worker, 1c-sync, iiko-sync, sentry, per-record-resilience, brand-type]
dependency_graph:
  requires:
    - "BUG-11-8 RED stubs in onec-sync.service.spec.ts (Wave 0 plan 00, commit 9acae77)"
    - "BrandType enum in schema.prisma (Wave 0 plan 00, commit 95d1124)"
    - "type:RESTAURANT finance filter live (Wave 1 plan 01, commit f91ec68)"
  provides:
    - "syncExpenses: inner try/catch per record; one bad OData row does not abort whole sync"
    - "syncKitchenPurchases: same per-record resilience"
    - "syncKitchenIncome: same per-record resilience"
    - "syncKitchenShipmentsByRestaurant: same per-record resilience"
    - "determineBrandType(/цех|kitchen|fabrika/i) private method on IikoSyncService"
    - "Brand.type populated on every iiko brand.upsert (update + create paths)"
  affects:
    - "apps/aggregator-worker/src/onec/onec-sync.service.ts"
    - "apps/aggregator-worker/src/onec/onec-sync.service.spec.ts"
    - "apps/aggregator-worker/src/iiko/iiko-sync.service.ts"
    - "apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts"
tech_stack:
  added: []
  patterns:
    - "bug_021 per-record try/catch: inner catch logs warn + Sentry.withScope(captureMessage('warning')) without rethrowing"
    - "Sentry scope: setTag('system','ONE_C') + setExtra('recordRefKey',key) + captureMessage(msg,'warning')"
    - "BrandType regex /цех|kitchen|fabrika/i matching migration SQL backfill regex"
key_files:
  created: []
  modified:
    - "apps/aggregator-worker/src/onec/onec-sync.service.ts"
    - "apps/aggregator-worker/src/onec/onec-sync.service.spec.ts"
    - "apps/aggregator-worker/src/iiko/iiko-sync.service.ts"
    - "apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts"
decisions:
  - "BUG-11-8: 4 methods get inner try/catch (syncExpenses, syncKitchenPurchases, syncKitchenIncome, syncKitchenShipmentsByRestaurant) — syncKitchenShipmentsByRestaurant added via Rule 3 deviation (same vulnerability found during Part D review)"
  - "BUG-11-3 worker: determineBrandType placed near slugify (private utility area) — regex string literals used instead of imported enum to avoid Prisma client circular dep risk"
  - "Credential status: missing-credentials — ONEC_BASE_URL, ONEC_USER, ONEC_PASSWORD absent from .env; 1C integration dormant until credentials are provided by operator"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-20"
  tasks_completed: 2
  tasks_total: 4
  files_created: 0
  files_modified: 4
---

# Phase 11 Plan 04: Worker 1C Resilience + Brand Type Summary

**One-liner:** Per-record try/catch added to all 4 OneCyncService sync methods (bug_021 pattern) so one bad OData record never aborts a full sync; `determineBrandType` regex method added to IikoSyncService so Brand.type is populated correctly on every org sync.

## What Was Done

### Task 1: Credential Check (Checkpoint — advisory)

Automated check for `ONEC_BASE_URL`, `ONEC_USER`, `ONEC_PASSWORD` in `.env` returned: **missing-credentials** — all three vars were absent or unset. Per the plan spec ("code still proceeds regardless of signal"), Tasks 2 and 3 were executed immediately. The 1C integration will remain dormant (returning ₸0 data) until the operator provisions real credentials.

### Task 2: BUG-11-8 — Per-record try/catch in OneCyncService (commit fc850fd)

Added inner `try { ... } catch (recordErr)` blocks inside the for-loops of all 4 sync methods, following the `bug_021` pattern from commit `787777b`.

**syncExpenses** — wrapper around the full loop body (findFirst article + expense.upsert + processedCount++):
```typescript
} catch (recordErr) {
  const errMsg = recordErr instanceof Error ? recordErr.message : String(recordErr);
  this.logger.warn(`Skipping 1C expense record ${record.Ref_Key}: ${errMsg}`);
  Sentry.withScope((scope) => {
    scope.setTag('system', 'ONE_C');
    scope.setTag('method', 'syncExpenses');
    scope.setExtra('recordRefKey', record.Ref_Key);
    scope.setExtra('recordDate', record.Date);
    scope.captureMessage(`Skipped 1C expense record: ${errMsg}`, 'warning');
  });
}
```

**syncKitchenPurchases**, **syncKitchenIncome**, **syncKitchenShipmentsByRestaurant** — identical pattern with method-specific tags and warn messages.

OUTER try/catch preserved unchanged — handles structural failures (auth, network).

**Spec updates** — Replaced 3 RED stubs from Wave 0 with real test implementations:
- `setupExpenseMocks` helper: mocks HTTP response + ddsArticle.findFirst + expense.upsert (throws for badKeys)
- Test 1: 3 records [good-1, bad-1, good-2] → resolves without throwing, upsert called 3 times, syncLog SUCCESS
- Test 2: 1 bad record → logger.warn contains 'bad-1', Sentry.withScope called, captureMessage called with 'warning' severity
- Test 3: 1 bad record with Ref_Key='bad-key-42' → scope.setTag('system','ONE_C') + scope.setExtra('recordRefKey','bad-key-42')

Updated Sentry mock at top of spec to expose `mockScope` object with `setExtra` and `captureMessage` (was missing those, causing the RED stubs to be unresolvable).

### Task 3: BUG-11-3 Worker Half — Brand.type in iiko brand upsert (commit a30b77d)

Added `determineBrandType` private method to `IikoSyncService`:
```typescript
private determineBrandType(name: string): 'RESTAURANT' | 'KITCHEN' | 'MARKETPLACE' {
  if (/цех|kitchen|fabrika/i.test(name)) return 'KITCHEN';
  return 'RESTAURANT';
}
```

Regex matches the SQL migration backfill expression (`~* 'цех|kitchen|fabrika'`) exactly, ensuring newly-synced brands get the same classification as backfilled brands.

Modified brand upsert in `syncOrganizations()` to use `type: brandType` in both `update` and `create` payloads:
```typescript
const brandType = this.determineBrandType(brand.name);
await this.prisma.brand.upsert({
  where: { iikoGroupId: brand.id },
  update: { name: brand.name, isActive: true, type: brandType },
  create: { ..., type: brandType },
});
```

**New tests** — 4 tests added in `describe('BUG-11-3 · determineBrandType + brand.upsert type field')`:
- `determineBrandType` unit tests: RESTAURANT for 'BNA Samal', 'Doner na Abaya', 'KEX Coffee'
- KITCHEN for 'Цех', 'цех производства', 'Kitchen', 'Main Kitchen Almaty', 'Fabrika', 'Central Fabrika'
- `syncOrganizations` integration test: given brand name='BNA Samal' → upsert called with `update.type='RESTAURANT'` and `create.type='RESTAURANT'`
- Integration test: given brand name='Цех' → upsert called with `update.type='KITCHEN'` and `create.type='KITCHEN'`

### Task 4: Runtime Verification (Checkpoint — pending operator action)

Runtime verification requires live infrastructure (worker process + live DB + optional 1C credentials). Documents are provided as operator steps:

1. Apply Wave 0 migration if not yet applied: `psql $POSTGRES_URL -f packages/database/migrations/20260420000000_add_brand_type/migration.sql`
2. Restart worker and trigger iiko structure sync: `curl -X POST http://localhost:3004/sync/iiko-structure`
3. Verify Brand table: `SELECT name, type FROM "finance"."Brand" ORDER BY name;` — expect Цех → KITCHEN
4. If ONEC credentials are provisioned: wait for next 1C cron (hourly), check SyncLog for SUCCESS rows

## Commits

| Task | Commit  | Description |
|------|---------|-------------|
| 1    | advisory checkpoint | Credential check — missing-credentials signal recorded |
| 2    | fc850fd | fix(11-04): add per-record try/catch to 1C sync methods (BUG-11-8) |
| 3    | a30b77d | feat(11-04): add determineBrandType to iiko brand upsert (BUG-11-3 worker half) |
| 4    | pending | Runtime verification — requires live infrastructure |

## Test Results

```
Test Suites: 5 passed, 5 total
Tests:       78 passed, 78 total
Time:        3.531 s
```

All pre-existing tests continue to pass. 7 new tests added (3 BUG-11-8 in onec spec, 4 BUG-11-3 in iiko spec).

TypeScript: `npx tsc --noEmit` exits 0 — no type errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] syncKitchenShipmentsByRestaurant also needed per-record try/catch**
- **Found during:** Task 2 Part D review — plan explicitly asked to "check if it has similar loop"
- **Issue:** The method had an unprotected for-loop identical in structure to the other 3 methods. Without the fix it would abort on first bad shipment record, same as BUG-11-8.
- **Fix:** Added inner try/catch with same pattern, method tag = 'syncKitchenShipmentsByRestaurant', warn message = `Skipping 1C kitchen shipment record`
- **Files modified:** `apps/aggregator-worker/src/onec/onec-sync.service.ts`
- **Commit:** fc850fd

**2. [Rule 2 - Missing critical functionality] Sentry mock missing setExtra + captureMessage**
- **Found during:** Task 2 spec implementation
- **Issue:** The Wave 0 spec scaffold (commit 9acae77) added 3 RED stubs but the Sentry mock only exposed `setTag` and `setContext` on scope. The new per-record catch code calls `scope.setExtra()` and `scope.captureMessage()` — these would fail at runtime in tests with "not a function".
- **Fix:** Elevated scope mock to module-level `mockScope` object exposing all 4 methods as jest.fn(); added clearing in `afterEach`; added `import * as Sentry from '@sentry/node'` to enable `expect(Sentry.withScope).toHaveBeenCalled()` assertions.
- **Files modified:** `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts`
- **Commit:** fc850fd

### Credential Status

Task 1 (advisory checkpoint) found `missing-credentials`. Per plan spec: "code still proceeds regardless of signal."

**Impact:** 1C sync methods will not run at cron time until `ONEC_BASE_URL`, `ONEC_USER`, `ONEC_PASSWORD` are set in `.env`. Once credentials are provided, the resilience fix (per-record try/catch) will be active immediately without further code changes.

**Deferred items:**
- Operator must provision ONEC_* credentials to activate 1C data flow
- Task 4 runtime verification remains pending until live infrastructure is available

## Notes for Downstream

- **BUG-11-1 margin bug (7000%):** Root cause not kopeck storage (rejected in plan 11-01). Still unresolved. Separate investigation needed — possibly HQ expense allocation inflating total or UI computation error.
- **Brand.type backfill:** Migration SQL applied in plan 11-01 already set Цех → KITCHEN. The new worker fix ensures any future iiko org sync re-sync will keep type correct, including for brands added after the backfill.
- **Sentry filtering:** All per-record errors are tagged `system=ONE_C` — use Sentry issue search `system:ONE_C level:warning` to monitor skipped records without them polluting error-level alerts.

## Self-Check: PASSED
