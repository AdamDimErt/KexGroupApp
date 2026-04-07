---
phase: 05-api-gateway
plan: 02
subsystem: testing
tags: [nestjs, e2e, supertest, roles-guard, jwt, finance-proxy]

# Dependency graph
requires:
  - phase: 05-api-gateway
    plan: 01
    provides: "finance proxy routes with role decorators (FinanceProxyController, JwtAuthGuard, RolesGuard)"
provides:
  - "E2E test suite for finance proxy with 6 passing test cases proving role enforcement"
affects: [05-api-gateway, mobile-agent]

# Tech tracking
tech-stack:
  added: []
  patterns: ["overrideGuard(JwtAuthGuard) + real RolesGuard pattern for E2E role enforcement testing", "buildApp() helper per test to isolate guard overrides", "setGlobalPrefix('api') replication in test bootstrap to match production"]

key-files:
  created:
    - apps/api-gateway/test/finance-proxy.e2e-spec.ts

key-decisions:
  - "Set setGlobalPrefix('api') explicitly in test buildApp() since main.ts sets it — E2E tests would hit /finance/... without this and get 404s"
  - "Override JwtAuthGuard only, let real RolesGuard execute — proves actual role enforcement rather than mocking it away"
  - "Set JWT_SECRET env var in beforeAll() to avoid AppModule initialization failure during tests"

patterns-established:
  - "E2E role guard pattern: overrideGuard(JwtAuthGuard).useValue(makeAuthGuard(role)) + real RolesGuard for true role enforcement testing"
  - "buildApp() per test: rebuild NestJS app with different guard override per test case"

requirements-completed: [GATEWAY-E2E]

# Metrics
duration: 15min
completed: 2026-04-07
---

# Phase 05 Plan 02: Finance Proxy E2E Test Suite Summary

**E2E role enforcement tests for finance proxy: 6 cases proving OWNER/FD/OD access control via real RolesGuard with mocked JwtAuthGuard injection**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-07T00:00:00Z
- **Completed:** 2026-04-07T00:15:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `finance-proxy.e2e-spec.ts` with 6 test cases, all passing
- Proven that OWNER-only routes correctly reject FINANCE_DIRECTOR and OPERATIONS_DIRECTOR with 403
- Proven that all-roles routes (kitchen) correctly accept OPERATIONS_DIRECTOR with 200
- Real RolesGuard runs unmodified — no mocking of authorization logic itself
- TypeScript compiles cleanly, unit suite (21 tests) unaffected

## Task Commits

1. **Task 1: Create finance-proxy.e2e-spec.ts with 5+1 test cases** - `0056f3c` (test)

## Files Created/Modified
- `apps/api-gateway/test/finance-proxy.e2e-spec.ts` - 6-case E2E suite covering role enforcement on all new finance proxy routes

## Decisions Made
- **Global prefix replication:** `main.ts` sets `app.setGlobalPrefix('api')` but `app.init()` in tests does NOT inherit this from bootstrap. Added explicit `testApp.setGlobalPrefix('api')` in `buildApp()` so routes resolve at `/api/finance/...` matching production. Without this, all tests would 404.
- **JWT_SECRET in beforeAll:** `AppModule` initializes `JwtModule` which throws if `JWT_SECRET` env var is missing. Set `process.env.JWT_SECRET = 'test-secret-for-e2e'` in `beforeAll()` to prevent initialization failure.
- **One app per test case:** `buildApp()` creates and returns a new `INestApplication` per test, allowing different guard overrides per scenario. `afterEach` closes it. Slightly slower but correct isolation.
- **6 test cases instead of 5:** Added the non-existent route 404 test (listed as bonus in plan) since it's trivial and closes the test matrix.

## Deviations from Plan

None — plan executed exactly as written, including the optional bonus test case (#6).

## Issues Encountered

- **`--testPathPattern` flag deprecated:** `npm run test:e2e -- --testPathPattern=finance-proxy` failed because Jest replaced the flag with `--testPathPatterns`. Used `npx jest --config ./test/jest-e2e.json --testPathPatterns=finance-proxy` directly for verification. The `npm run test:e2e` script itself (without the flag) works fine.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- API gateway Phase 5 complete: all routes secured, role enforcement proven by E2E tests
- Finance service proxy is production-ready for mobile dashboard integration
- Mobile agent can rely on documented role matrix: OWNER=all, FD=no-level4, OPS=reports-kitchen/trends only

---
*Phase: 05-api-gateway*
*Completed: 2026-04-07*
