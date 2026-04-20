---
phase: 11-bug-fix-pack-post-walkthrough
plan: "02"
subsystem: mobile-dashboard
tags: [bug-fix, brand-map, plan-delta, tz-formatting, brand-colors]
dependency_graph:
  requires: ["11-00"]
  provides: [BUG-11-2-fix, BUG-11-4-fix, BUG-11-6-fix]
  affects: [mobile-dashboard]
tech_stack:
  added: []
  patterns:
    - BRAND_MAP dictionary pattern for O(1) iiko brand name → code resolution
    - computePlanDelta = computePlanAttainment - 100 (signed delta reusing single source of truth)
    - date-fns-tz v3 toZonedTime + format with timeZone — TZ-independent time formatting
    - planLabel prop bundles text + status so RestaurantCard stays pure (no re-derivation)
key_files:
  created:
    - apps/mobile-dashboard/src/__mocks__/@sentry/react-native.ts
  modified:
    - apps/mobile-dashboard/src/utils/brand.ts
    - apps/mobile-dashboard/src/theme/colors.ts
    - apps/mobile-dashboard/src/hooks/useDashboard.ts
    - apps/mobile-dashboard/src/hooks/useBrandDetail.ts
    - apps/mobile-dashboard/src/hooks/useRestaurantList.ts
    - apps/mobile-dashboard/src/components/RestaurantCard.tsx
    - apps/mobile-dashboard/src/screens/DashboardScreen.tsx
    - apps/mobile-dashboard/package.json
decisions:
  - "BRAND_MAP uses exact iiko display names as keys (including Cyrillic variants КексБрэндс + KEX-BRANDS + Kexbrands) — iiko may return any variant"
  - "computePlanDelta reuses computePlanAttainment to avoid math duplication — single source of truth for the ratio"
  - "Sentry import in brand.ts wrapped in try/catch so Jest tests (no DSN) never crash on captureMessage"
  - "Jest @sentry/react-native mock stub via moduleNameMapper — ESM parse error in Node/Jest avoided without removing dependency"
  - "planLabel object (text + status) computed in hook, passed as prop to RestaurantCard — keeps component pure (SSOT)"
  - "BrandCode type expanded from 'BNA'|'DNA' to 6 codes in all 3 hooks and RestaurantCard — Rule 1 auto-fix for type errors"
metrics:
  duration: "~45 min"
  completed_date: "2026-04-20"
  tasks_completed: 4
  tasks_total: 4
  files_modified: 8
  files_created: 1
---

# Phase 11 Plan 02: Mobile Utils Bug Fix Summary

**One-liner:** BRAND_MAP (6 codes), computePlanDelta/formatPlanLabel wiring, 4 brand color tokens, TZ-safe formatSyncTime replacing toLocaleTimeString.

## What Was Built

Fixed 3 bugs in the mobile-dashboard utility + component layer. All 22 brand.test.ts stubs from Wave 0 (plan 11-00) are now GREEN.

### BUG-11-2: BRAND_MAP + 6 brand color tokens

**brand.ts:** Replaced 2-brand keyword-only `resolveBrand` with BRAND_MAP dictionary. 9 entries covering all iiko brand name variants (including Cyrillic `КексБрэндс`, Latin `KEX-BRANDS`, mixed `Kexbrands`). Resolution order: exact match → substring → keyword fallback → Sentry warn + BNA default.

**colors.ts:** Extended `const brand` from 2 (`bna`, `dna`) to 6 entries, adding `jd` (orange-400), `sb` (teal-400), `kex` (yellow-400), `kitchen` (slate-400). Same tokens added to `lightColors.brand`. All WCAG AA contrast on `#020617` dark background.

**RestaurantCard.tsx:** Brand badge color lookup changed from hardcoded `colors.brand.bna` to dynamic `colors.brand[brand.toLowerCase()] ?? colors.brand.bna`.

### BUG-11-4: computePlanDelta + formatPlanLabel wiring

**brand.ts:** Added `computePlanDelta(revenue, plannedRevenue): number` — returns `computePlanAttainment - 100` (signed; negative when below plan). Added `formatPlanLabel(deltaPct)` — returns `{ text, status }` with ±0.5% threshold for `above`/`onplan`/`below`.

**useDashboard.ts:** `deltaPct` was always 0 (used `brand.changePercent` from DTO). Now computes `computePlanDelta(brand.revenue, plannedRevenue)`. Added `planLabel: formatPlanLabel(...)` field to `DashboardRestaurantItem`.

**RestaurantCard.tsx:** Accepts `planLabel?: { text: string; status: 'above'|'onplan'|'below' }` prop. Footer renders `planLabel.text` colored by `planLabelColor` (`colors.status.positive` / `colors.status.danger` / `colors.text.secondary`) when prop is provided; falls back to legacy `statusLabel` render otherwise.

**DashboardScreen.tsx:** Passes `planLabel={r.planLabel}` to every RestaurantCard in the brands list.

### BUG-11-6: TZ-safe sync time render

**brand.ts:** Added `formatSyncTime(isoUtc: string): string` — converts ISO UTC string to `HH:mm` in `Asia/Almaty` (UTC+5, no DST) using `date-fns-tz v3` `toZonedTime` + `format(..., { timeZone })`. Independent of `process.env.TZ`.

**DashboardScreen.tsx:** Replaced `new Date(lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })` with `formatSyncTime(lastSyncAt)`. Added `import { formatSyncTime } from '../utils/brand'`.

## Tasks Completed

| # | Task | Commit | Key files |
|---|------|--------|-----------|
| 1 | Implement BRAND_MAP, computePlanDelta, formatPlanLabel, formatSyncTime | fa7048e | brand.ts, package.json, __mocks__/@sentry/react-native.ts |
| 2 | Add 4 brand color tokens (jd, sb, kex, kitchen) | 69ee601 | colors.ts |
| 3 | Wire planLabel into useDashboard + RestaurantCard + DashboardScreen | a2c53c0 | useDashboard.ts, RestaurantCard.tsx, DashboardScreen.tsx |
| 4 | Replace toLocaleTimeString with formatSyncTime | 61314f7 | DashboardScreen.tsx |

## Verification Results

- `npx tsc --noEmit`: 0 errors
- `npx jest brand.test.ts`: 22/22 tests pass (BUG-11-2: 8 tests, BUG-11-4: 9 tests, BUG-11-6: 4 tests, type: 1 test)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type-widened BrandCode + Cuisine in 3 hooks**
- **Found during:** Task 1 (tsc run after brand.ts expansion)
- **Issue:** `useBrandDetail.ts`, `useRestaurantList.ts`, `useDashboard.ts` still had `brand: 'BNA' | 'DNA'` narrow types. TypeScript raised errors when brand.ts exported `BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN'`.
- **Fix:** Updated all 3 hooks' interfaces to include all 6 brand codes and all 5 cuisine types.
- **Files modified:** useDashboard.ts (interface DashboardRestaurantItem), useBrandDetail.ts (interface EnrichedRestaurant), useRestaurantList.ts (interface RestaurantListItem)
- **Commit:** fa7048e

**2. [Rule 3 - Blocking] Jest @sentry/react-native ESM parse error**
- **Found during:** Task 1 (first jest run)
- **Issue:** `@sentry/react-native` uses ES modules syntax; Node/Jest couldn't parse it: `SyntaxError: Unexpected token 'export'`
- **Fix:** Created `src/__mocks__/@sentry/react-native.ts` stub + added `moduleNameMapper` to Jest config in `package.json`
- **Files modified:** apps/mobile-dashboard/package.json (moduleNameMapper), apps/mobile-dashboard/src/__mocks__/@sentry/react-native.ts (created)
- **Commit:** fa7048e

## Self-Check: PASSED
