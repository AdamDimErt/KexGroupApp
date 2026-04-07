---
phase: 04-finance-service
plan: 01
subsystem: finance-service
tags: [interceptor, rbac, security, nestjs]
dependency_graph:
  requires: []
  provides: [DataAccessInterceptor]
  affects: [finance-service/main.ts, all finance-service endpoints]
tech_stack:
  added: []
  patterns: [NestInterceptor, regex route matching, ForbiddenException]
key_files:
  created:
    - apps/finance-service/src/common/interceptors/data-access.interceptor.ts
    - apps/finance-service/src/common/interceptors/data-access.interceptor.spec.ts
  modified:
    - apps/finance-service/src/main.ts
key_decisions:
  - "Use request.path (not request.route.path) — route.path is undefined during interceptor phase"
  - "ORDER matters in ACCESS_MATRIX — operations pattern before article/:groupId to prevent shadowing"
  - "Regex conversion: :param segments become [^/]+ anchored with ^...$"
  - "Passthrough (no 403) when path not in matrix — unprotected routes are open by design"
metrics:
  duration: "2 minutes"
  completed: "2026-04-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 4 Plan 01: DataAccessInterceptor Summary

**One-liner:** Role-gated route enforcement via NestInterceptor with regex ACCESS_MATRIX — OWNER-only Level 4, role-filtered reports.

---

## What Was Built

`DataAccessInterceptor` — a NestJS `NestInterceptor` that enforces role-based access control for all finance-service endpoints before they execute. Registered globally via `app.useGlobalInterceptors()` in `main.ts`.

---

## Tasks Completed

### Task 1: DataAccessInterceptor + spec (TDD)

**RED phase:** Created 16-test spec covering all 6 matrix entries, UUID param segments, missing role header, and passthrough scenarios. Tests failed on missing module — confirmed RED.

**GREEN phase:** Implemented interceptor:
- `ACCESS_MATRIX` constant — 6 route patterns with allowed role arrays
- `matchPattern(path)` — iterates matrix keys, converts `:param` to `[^/]+` regex, anchors and tests
- `intercept()` — reads `request.path` + `x-user-role` header; throws `ForbiddenException('Access denied for role ${role ?? "unknown"} on path ${path}')` when role not allowed; passthrough when route not in matrix
- Key ordering: `/dashboard/article/:id/operations` before `/dashboard/article/:groupId` to prevent the broader pattern shadowing the OWNER-only restriction

All 16 tests passed.

**Commit:** `b78ad19`

### Task 2: Register interceptor in main.ts

Added `import { DataAccessInterceptor }` and `app.useGlobalInterceptors(new DataAccessInterceptor())` after `useGlobalPipes`. Order in bootstrap: create → enableCors → useGlobalPipes → useGlobalInterceptors → listen.

TypeScript compiled with zero errors. All 25 tests (16 new + 9 existing) passed.

**Commit:** `85d5ef4`

---

## ACCESS_MATRIX (final)

| Pattern | Allowed Roles |
|---|---|
| `/dashboard/article/:id/operations` | OWNER |
| `/dashboard/reports/dds` | OWNER, FINANCE_DIRECTOR |
| `/dashboard/reports/company-expenses` | OWNER, FINANCE_DIRECTOR |
| `/dashboard/reports/kitchen` | OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR |
| `/dashboard/reports/trends` | OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR |
| `/dashboard/article/:groupId` | OWNER, FINANCE_DIRECTOR |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Verification Results

- `npx jest --testPathPatterns=interceptor`: 16/16 passed
- `npx jest --passWithNoTests`: 25/25 passed (all suites)
- `npx tsc --noEmit`: 0 errors

---

## Self-Check

Checking created files and commits exist:

- FOUND: apps/finance-service/src/common/interceptors/data-access.interceptor.ts
- FOUND: apps/finance-service/src/common/interceptors/data-access.interceptor.spec.ts
- FOUND: apps/finance-service/src/main.ts (modified)
- FOUND: commit b78ad19 (Task 1)
- FOUND: commit 85d5ef4 (Task 2)

## Self-Check: PASSED
