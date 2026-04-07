---
phase: 07-mobile-screens
plan: 01
subsystem: mobile-dashboard
tags: [types, api, navigation, hooks, testing, role-gate]
dependency_graph:
  requires: []
  provides: [MOB-TYPES, MOB-API, MOB-NAV, MOB-04, MOB-05]
  affects: [apps/mobile-dashboard/src/types/index.ts, apps/mobile-dashboard/src/services/api.ts, apps/mobile-dashboard/src/hooks/useApi.ts, apps/mobile-dashboard/App.tsx]
tech_stack:
  added: [expo-haptics ~15.0.8, "@react-native-async-storage/async-storage 2.2.0", ts-jest (jest config)]
  patterns: [useApiQuery hook pattern, URLSearchParams API construction, placeholder screen pattern]
key_files:
  created:
    - apps/mobile-dashboard/src/hooks/__tests__/useOperations.test.ts
  modified:
    - apps/mobile-dashboard/src/types/index.ts
    - apps/mobile-dashboard/src/services/api.ts
    - apps/mobile-dashboard/src/hooks/useApi.ts
    - apps/mobile-dashboard/App.tsx
    - apps/mobile-dashboard/src/screens/PointDetailScreen.tsx
    - apps/mobile-dashboard/package.json
decisions:
  - "Inline placeholder ArticleDetailScreen and OperationsScreen components in App.tsx allow tsc to pass and Wave 2 plans to replace with real imports"
  - "ts-jest inline tsconfig ({ strict: true }) used instead of file path reference since rootDir=src makes relative paths unstable"
  - "Optional onNavigateArticle prop added to PointDetailScreen.Props to allow navigation wiring without breaking existing call sites"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-07T12:10:33Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 5
---

# Phase 7 Plan 1: Mobile Infrastructure — Types, API Methods, Navigation, Role-Gate

**One-liner:** Extended Screen type to 9 values, added 5 new API methods + 7 DTOs, wired Level 3/4 navigation in App.tsx, and validated role-gate access via 8 passing unit tests.

## Summary

Established the complete infrastructure layer for Phase 7 drill-down screens. All Wave 2-4 plans can now build screens without modifying types, API methods, or navigation plumbing.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install packages + add types + API methods | 1539565 | types/index.ts, services/api.ts, package.json |
| 2 | Add useOperations hook + extend App.tsx navigation | 2784305 | hooks/useApi.ts, App.tsx, PointDetailScreen.tsx |
| 3 | Create role-gate unit test | f979ee1 | hooks/__tests__/useOperations.test.ts |

## What Was Built

### New Types (types/index.ts)
- Screen type extended: added `'article-detail'` and `'operations'` (9 values total)
- `OperationDto` — Level 4 expense operation with source, allocationCoefficient
- `OperationsListDto` — paginated operations list with total/page
- `ReportDdsItemDto`, `ReportDdsDto` — DDS expense group report
- `ReportCompanyExpenseItemDto`, `ReportCompanyExpensesDto` — HQ expense report
- `ReportKitchenItemDto`, `ReportKitchenDto` — kitchen purchases/shipments/income
- `ReportTrendsPointDto`, `ReportTrendsDto` — revenue + expense trend data

### New API Methods (services/api.ts)
- `getOperations(articleId, restaurantId, page, periodType, dateFrom?, dateTo?)` — Level 4 paginated operations
- `getReportDds(periodType, dateFrom?, dateTo?)` — cross-restaurant DDS report
- `getReportCompanyExpenses(periodType, dateFrom?, dateTo?)` — company-wide expense report
- `getReportKitchen(periodType, dateFrom?, dateTo?)` — kitchen activity report
- `getReportTrends(periodType, dateFrom?, dateTo?)` — revenue/expense trend report

### Hooks (hooks/useApi.ts)
- `getPeriodDates` exported (was private)
- `useOperations(articleId, restaurantId, page)` — follows same pattern as useArticleDetail

### Navigation (App.tsx)
- State: `articleGroupId`, `articleId`, `currentRestaurantId`
- Handlers: `handleArticleGroupSelect`, `handleOperationSelect`
- `handlePointSelect` now also sets `currentRestaurantId`
- `point-details` case updated with `onNavigateArticle` prop
- New cases: `article-detail`, `operations`
- Inline placeholder components for ArticleDetailScreen and OperationsScreen

### Tests
- `src/hooks/__tests__/useOperations.test.ts` — 8 tests, all passing
- Validates OWNER-only access to Level 4 (operations)
- Validates OWNER + FINANCE_DIRECTOR access to Level 3 (article detail)
- OPERATIONS_DIRECTOR and ADMIN blocked from both levels

## Verification

- `npx tsc --noEmit` — PASSED (0 errors)
- All 8 role-gate tests — PASSED
- expo-haptics and @react-native-async-storage/async-storage in package.json — VERIFIED
- Screen type has 9 values — VERIFIED
- dashboardApi has 9 methods — VERIFIED

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical prop] Added optional onNavigateArticle to PointDetailScreen.Props**
- **Found during:** Task 2
- **Issue:** App.tsx passed `onNavigateArticle` prop to PointDetailScreen but the component's Props interface didn't declare it, causing tsc error TS2322
- **Fix:** Added `onNavigateArticle?: (groupId: string) => void` as optional prop to PointDetailScreen interface
- **Files modified:** apps/mobile-dashboard/src/screens/PointDetailScreen.tsx
- **Commit:** 2784305

**2. [Rule 3 - Blocking issue] Added jest config with ts-jest to make TypeScript tests runnable**
- **Found during:** Task 3
- **Issue:** Mobile dashboard had no jest configuration; running `npx jest` failed with babel `import type` parse error
- **Fix:** Added `jest` config block to package.json using ts-jest with inline tsconfig, added `test` script
- **Files modified:** apps/mobile-dashboard/package.json
- **Commit:** f979ee1

## Self-Check: PASSED

All files verified on disk. All 3 task commits verified in git history.
