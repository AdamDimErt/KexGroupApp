---
phase: 03-aggregator-worker-iiko-1
plan: 01
subsystem: api
tags: [iiko, nomenclature, dds, prisma, nestjs, cron, xml]

# Dependency graph
requires:
  - phase: 02-auth-service
    provides: Prisma schema with DdsArticleGroup model (tenantId_code unique key)
provides:
  - syncNomenclature() in IikoSyncService — fetches iiko nomenclature groups, upserts DdsArticleGroup
  - Daily 03:00 Asia/Almaty cron job in SchedulerService calling syncNomenclature
  - 4 unit tests covering upsert success, SyncLog SUCCESS, SyncLog ERROR, scheduler wiring
affects:
  - finance-service (DdsArticleGroup populated for expense drill-down hierarchy)
  - 03-aggregator-worker-iiko-1 subsequent plans

# Tech tracking
tech-stack:
  added: []
  patterns:
    - syncNomenclature follows existing sync method pattern (getTenantId, makeRequest, normalizeArray, logSync)
    - XML parser spy pattern for controlling xmlParser.parse output in unit tests
    - Flexible XML root key handling (checks multiple candidate keys for MEDIUM-confidence API responses)

key-files:
  created: []
  modified:
    - apps/aggregator-worker/src/iiko/iiko-sync.service.ts
    - apps/aggregator-worker/src/scheduler/scheduler.service.ts
    - apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts

key-decisions:
  - "iiko Server API endpoint GET /v2/entities/products/group/list?includeDeleted=false used for nomenclature groups (MEDIUM confidence — exact field names logged via logger.debug for first-run observability)"
  - "Flexible XML root key parsing: checks groupDtoList, groups, corporateItemDtoList to handle API variations gracefully"
  - "DdsArticle upsert for individual articles NOT done here — handled by existing syncExpenses() flow to avoid duplication"
  - "xmlParser.parse spied directly in tests (not mocked via makeRequest) to produce predictable array structure for normalizeArray"

patterns-established:
  - "XML root key flexibility: when API response field names are MEDIUM confidence, check multiple candidate root keys"
  - "logger.debug for parsed XML keys enables first-run diagnostics without code changes"

requirements-completed: [AGG-01, AGG-08]

# Metrics
duration: 20min
completed: 2026-04-07
---

# Phase 03 Plan 01: Nomenclature Groups Sync Summary

**syncNomenclature() in IikoSyncService upserts DdsArticleGroup from iiko Server API with daily 03:00 cron and 4 passing unit tests**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-07T06:00:00Z
- **Completed:** 2026-04-07T06:20:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `syncNomenclature()` to IikoSyncService following exact same pattern as `syncOrganizations()` — no date params, full group list sync
- Added `@Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })` cron in SchedulerService alongside existing organizations cron
- 4 unit tests: upsert correctness, SUCCESS SyncLog, ERROR SyncLog + rethrow, scheduler-to-service wiring — all pass

## Task Commits

1. **Task 1: Add syncNomenclature() to IikoSyncService** - `281b4eb` (feat)
2. **Task 2: Add syncNomenclature cron job and unit tests** - `d0947a4` (feat)

## Files Created/Modified
- `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` - Added syncNomenclature() method (57 lines)
- `apps/aggregator-worker/src/scheduler/scheduler.service.ts` - Added @Cron syncNomenclature method (daily 03:00 Asia/Almaty)
- `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts` - Added describe(syncNomenclature) with 3 tests + describe(SchedulerService syncNomenclature) with 1 test

## Decisions Made
- Used `GET /v2/entities/products/group/list?includeDeleted=false` as the iiko Server API endpoint (MEDIUM confidence per CONTEXT.md). Added `logger.debug` to log parsed XML root keys for first-run observability in case structure differs.
- Checks three possible XML root keys (`groupDtoList`, `groups`, `corporateItemDtoList`) to handle real API response gracefully regardless of which key the server uses.
- DdsArticle upsert intentionally omitted — handled by existing `syncExpenses()` flow per plan spec.
- In tests, spied on `xmlParser.parse` directly (rather than mocking makeRequest to return raw XML) to control the parsed structure precisely and avoid fast-xml-parser's single-item vs array ambiguity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] XML mock structure — normalizeArray receives object not array**
- **Found during:** Task 2 (unit tests)
- **Issue:** Initial test mock returned `{ groupDtoList: { group: [...] } }` — normalizeArray wraps the inner object in `[...]`, giving one element with no `id` field
- **Fix:** Changed mock to return `{ groupDtoList: [...] }` (flat array at root key level) and used `jest.spyOn(xmlParser, 'parse')` directly to control the structure precisely
- **Files modified:** apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts
- **Verification:** All 4 syncNomenclature tests pass, 18/18 total tests pass
- **Committed in:** d0947a4 (Task 2 commit)

**2. [Rule 3 - Blocking] Dynamic import incompatible with Jest**
- **Found during:** Task 2 (SchedulerService wiring test)
- **Issue:** Plan suggested `const { SchedulerService } = await import(...)` inside test — this triggers "dynamic import callback invoked without --experimental-vm-modules" in Jest
- **Fix:** Used static import at top of spec file (`import { SchedulerService } from '../scheduler/scheduler.service'`) instead
- **Files modified:** apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts
- **Verification:** SchedulerService wiring test passes
- **Committed in:** d0947a4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug in test mock, 1 blocking import issue)
**Impact on plan:** Both auto-fixes required for tests to pass. No scope creep.

## Issues Encountered
- fast-xml-parser wraps a single XML element as object, multiple as array — normalizeArray handles this correctly in production code but test mocks must match the exact structure that normalizeArray receives (flat array at the root key, not nested under another key).

## User Setup Required
None - no external service configuration required. Nomenclature sync will activate when iiko Server API credentials are configured in .env.

## Next Phase Readiness
- DdsArticleGroup table will be populated on first cron run (daily 03:00)
- Expense records can reference group hierarchy once DdsArticle records are linked to groups
- Ready for subsequent aggregator-worker plans (syncRevenue, syncExpenses, etc.)

---
*Phase: 03-aggregator-worker-iiko-1*
*Completed: 2026-04-07*

## Self-Check: PASSED

- FOUND: apps/aggregator-worker/src/iiko/iiko-sync.service.ts
- FOUND: apps/aggregator-worker/src/scheduler/scheduler.service.ts
- FOUND: apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts
- FOUND: .planning/phases/03-aggregator-worker-iiko-1/03-01-SUMMARY.md
- FOUND: commit 281b4eb (feat: add syncNomenclature() to IikoSyncService)
- FOUND: commit d0947a4 (feat: add syncNomenclature cron job and unit tests)
