---
phase: 07-mobile-screens
plan: "04"
subsystem: mobile-dashboard
tags: [react-native, offline-cache, reports, role-gating, async-storage]
dependency_graph:
  requires: ["07-01"]
  provides: ["ReportsScreen with 4 real endpoints", "useCachedQuery hook", "OfflineBanner component"]
  affects: ["apps/mobile-dashboard/src/screens/ReportsScreen.tsx"]
tech_stack:
  added: []
  patterns: ["AsyncStorage offline cache", "role-based section visibility", "inline bar chart"]
key_files:
  created:
    - apps/mobile-dashboard/src/hooks/useOfflineCache.ts
    - apps/mobile-dashboard/src/components/OfflineBanner.tsx
  modified:
    - apps/mobile-dashboard/src/hooks/useReports.ts
    - apps/mobile-dashboard/src/screens/ReportsScreen.tsx
    - apps/mobile-dashboard/src/screens/ReportsScreen.styles.ts
decisions:
  - "useCachedQuery wraps fetcher with AsyncStorage persistence; stale threshold = 1 hour (3600000ms)"
  - "OPS_DIRECTOR sees only Kitchen and Trends sections; DDS and Company hidden via canSeeDds/canSeeCompany role checks"
  - "Math.min(...cachedAtValues.filter(Boolean)) pattern replaced with type guard filter to avoid Infinity on empty array"
  - "Each report section fetches independently via its own hook — network failures in one section do not block others"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-07T12:23:58Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 7 Plan 04: ReportsScreen with Real API + Offline Cache Summary

**One-liner:** ReportsScreen rewritten with 4 real report endpoints (DDS/company/kitchen/trends), AsyncStorage offline cache via useCachedQuery, and role-gated section visibility.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create offline cache hook + offline banner | de6d9cb | useOfflineCache.ts, OfflineBanner.tsx |
| 2 | Rewrite ReportsScreen + useReports with real API endpoints | 3d61f51 | useReports.ts, ReportsScreen.tsx, ReportsScreen.styles.ts |

## What Was Built

### useOfflineCache.ts
`useCachedQuery<T>(cacheKey, fetcher, deps)` — generic hook that:
- Calls `fetcher()` and caches the result in AsyncStorage under `hv_cache_{cacheKey}`
- On network failure, loads from AsyncStorage cache and sets `isOffline: true`
- Sets `isStale: true` when cached data is older than 1 hour (3600000ms)
- Returns `{ data, isLoading, error, isStale, isOffline, cachedAt, refetch }`

### OfflineBanner.tsx
Banner component that renders only when `isOffline || isStale`:
- Red background (`#7F1D1D`) with "Нет соединения, данные от HH:MM" when offline
- Amber background (`#78350F`) with "Данные устарели (от HH:MM)" when stale

### useReports.ts (rewritten)
4 individual hooks replacing the single mock `useReports()`:
- `useReportDds()` → `dashboardApi.getReportDds()`
- `useReportCompanyExpenses()` → `dashboardApi.getReportCompanyExpenses()`
- `useReportKitchen()` → `dashboardApi.getReportKitchen()`
- `useReportTrends()` → `dashboardApi.getReportTrends()`

All hooks read period from `useDashboardStore`, compute date ranges via `getPeriodDates`, and use `useCachedQuery` for offline-first fetching.

### ReportsScreen.tsx (rewritten)
- 4 report sections in cards
- DDS and Company sections conditionally rendered for OWNER/FINANCE_DIRECTOR only
- OPS_DIRECTOR sees only Kitchen and Trends sections
- `OfflineBanner` shown when any section offline/stale, with earliest cached timestamp
- `RefreshControl` triggers `refetch()` on all 4 hooks
- Trends section: inline bar chart showing last 14 data points with day labels

### ReportsScreen.styles.ts (rewritten)
New styles: `reportCard`, `reportTitle`, `reportTotal`, `reportRow`, `reportLabel`, `reportValue`, `reportBadge`, `reportError`, `trendChart`, `trendBar`, `trendBarFill`, `trendBarLabel`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Math.min(...) with empty array producing Infinity**
- **Found during:** Task 2
- **Issue:** `Math.min(...[null, null].filter(Boolean))` produces `Infinity` when all cached values are null
- **Fix:** Used typed type guard filter `filter((v): v is number => v !== null)` + conditional `earliestCache = values.length > 0 ? Math.min(...values) : null`
- **Files modified:** apps/mobile-dashboard/src/screens/ReportsScreen.tsx
- **Commit:** 3d61f51

## Verification

- `npx tsc --noEmit` exits with code 0 (confirmed)
- ReportsScreen uses 4 separate report hooks calling real API endpoints
- OPS_DIRECTOR sees only Kitchen and Trends (DDS and Company gated by `canSeeDds`/`canSeeCompany`)
- OfflineBanner appears when any report section is offline or stale
- useCachedQuery persists to AsyncStorage, loads from cache on network failure

## Self-Check: PASSED
