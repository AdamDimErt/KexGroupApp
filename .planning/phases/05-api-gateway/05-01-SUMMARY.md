---
phase: 05-api-gateway
plan: 01
subsystem: api
tags: [nestjs, proxy, jwt, roles, typescript, jest, tdd]

# Dependency graph
requires:
  - phase: 04-finance-service
    provides: "5 finance-service dashboard endpoints (operations + 4 reports) that this plan exposes"
  - phase: 02-auth-service
    provides: "JwtPayload interface, UserRole enum, JwtAuthGuard/RolesGuard guards"
provides:
  - "GET /finance/article/:id/operations proxy route (OWNER only)"
  - "GET /finance/reports/dds proxy route (OWNER, FINANCE_DIRECTOR)"
  - "GET /finance/reports/company-expenses proxy route (OWNER, FINANCE_DIRECTOR)"
  - "GET /finance/reports/kitchen proxy route (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)"
  - "GET /finance/reports/trends proxy route (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)"
  - "Unit test suite for FinanceProxyController (9 tests)"
  - "E2E jest config with @dashboard/shared-types moduleNameMapper"
affects: [mobile-dashboard, 05-api-gateway]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NestJS controller guard override in tests (.overrideGuard().useValue()) for unit isolation"
    - "Route order safety: specific routes (article/:id/operations) declared before generic (:id)"
    - "All 4 headers forwarded by proxy routes: authorization, x-tenant-id, x-user-role, x-user-restaurant-ids"

key-files:
  created:
    - apps/api-gateway/src/finance/finance-proxy.controller.spec.ts
  modified:
    - apps/api-gateway/src/finance/finance-proxy.controller.ts
    - apps/api-gateway/test/jest-e2e.json

key-decisions:
  - "Used .overrideGuard() in test module to avoid JwtService dependency injection — guards tested separately"
  - "getArticleOperations declared before getArticleDetail to prevent NestJS treating 'operations' as :id param"
  - "jest-e2e.json path uses 3 levels up from test/ dir: <rootDir>/../../../packages/shared-types/src/index.ts"

patterns-established:
  - "FinanceProxyController pattern: extract user from req.user, forward 4 headers, use buildQueryString helper"
  - "Unit test guard override: .overrideGuard(JwtAuthGuard).useValue({canActivate: () => true})"

requirements-completed: [GATEWAY-ROUTES]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 5 Plan 01: API Gateway Routes Summary

**5 missing finance proxy routes added to FinanceProxyController with role-based access control, forwarding all 4 context headers to finance-service**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-07T09:36:53Z
- **Completed:** 2026-04-07T09:40:01Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- Fixed jest-e2e.json to resolve `@dashboard/shared-types` via moduleNameMapper (enables E2E test suite to compile)
- Added 5 new proxy routes to FinanceProxyController: article operations + 4 cross-restaurant report endpoints
- Created 9 unit tests via TDD (RED then GREEN) verifying route paths and @Roles metadata

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix jest-e2e.json moduleNameMapper** - `afe91ab` (chore)
2. **Task 2: Add 5 proxy routes + unit tests** - `c1865ce` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `apps/api-gateway/src/finance/finance-proxy.controller.ts` - Added 5 new route methods (9 total), getArticleOperations placed before getArticleDetail
- `apps/api-gateway/src/finance/finance-proxy.controller.spec.ts` - New file: 9 unit tests covering proxy.forward paths and @Roles metadata
- `apps/api-gateway/test/jest-e2e.json` - Added moduleNameMapper for @dashboard/shared-types

## Decisions Made
- Used `.overrideGuard()` pattern in test module to isolate controller tests from JwtService dependency — guards have their own spec files
- Maintained critical route declaration order (article/:id/operations before article/:id) to prevent NestJS param collision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added guard override in unit test module**
- **Found during:** Task 2 (GREEN phase — tests still failed after implementing routes)
- **Issue:** Plan's test template did not account for class-level `@UseGuards(JwtAuthGuard, RolesGuard)` — NestJS test module tried to instantiate `JwtAuthGuard` which requires `JwtService`, causing all 9 tests to fail with dependency injection error
- **Fix:** Added `.overrideGuard(JwtAuthGuard).useValue(mockJwtAuthGuard).overrideGuard(RolesGuard).useValue(mockRolesGuard)` to the test module builder — standard NestJS testing pattern
- **Files modified:** apps/api-gateway/src/finance/finance-proxy.controller.spec.ts
- **Verification:** All 9 tests pass, full suite 21/21 green
- **Committed in:** c1865ce (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical test infrastructure)
**Impact on plan:** Fix was necessary for tests to compile. No scope creep — standard NestJS test pattern.

## Issues Encountered
- Jest 30 renamed `--testPathPattern` flag to `--testPathPatterns` — used `npx jest` directly instead of `npm test` for targeted runs during development. Full suite via `npm test` (which uses jest without the flag) works fine.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API Gateway is now complete for Phase 5 Plan 01: all 9 finance proxy routes active
- Mobile dashboard can now call all 5 new endpoints through the gateway
- E2E tests can compile with @dashboard/shared-types correctly resolved

---
*Phase: 05-api-gateway*
*Completed: 2026-04-07*
