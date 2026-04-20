---
phase: 11-bug-fix-pack-post-walkthrough
plan: "03"
subsystem: ui
tags: [react-native, expo, zustand, role-gating, reports, dds]

# Dependency graph
requires:
  - phase: 07-mobile-screens
    provides: ReportsScreen with 4 report sections (DDS/Company/Kitchen/Trends); useReportDds hook
  - phase: 11-00
    provides: wave prerequisites and research confirming useReportDds exists but JSX removed

provides:
  - ReportsScreen DDS section restored for OWNER/FINANCE_DIRECTOR/ADMIN roles
  - canSeeDds role gate implemented (matches canSeeCompany pattern)
  - Group-level + per-restaurant drill-down within DDS card

affects: [11-03b-auth-dev-bypass, emulator-walkthrough-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role gate pattern: canSeeDds = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN'"
    - "DDS card uses ReportDdsDto.groups[].{ groupName, totalAmount, restaurants[] } for two-level display"
    - "activeSections array includes dds when canSeeDds, ensuring offline/stale state propagation"

key-files:
  created: []
  modified:
    - apps/mobile-dashboard/src/screens/ReportsScreen.tsx

key-decisions:
  - "DDS section placed before Company Expenses per ROADMAP section ordering (DDS → Company → Kitchen → Trends)"
  - "Used existing ddsGroupRow/ddsRestaurantRow styles already present in ReportsScreen.styles.ts"
  - "canSeeDds and canSeeCompany use identical role set — consistent with api-gateway @Roles decorator"

patterns-established:
  - "Role-gated report section: canSeeX → hook(canSeeX) → include in activeSections → refetch in refetchAll → conditional JSX"

requirements-completed: [BUG-11-7]

# Metrics
duration: 15min
completed: 2026-04-20
---

# Phase 11 Plan 03: Mobile Screens (DDS Section Restore) Summary

**DDS section restored in ReportsScreen using existing useReportDds hook and ReportDdsDto.groups shape, gated to OWNER/FINANCE_DIRECTOR/ADMIN roles with group-level + per-restaurant breakdown display**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-20T00:00:00Z
- **Completed:** 2026-04-20T00:00:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Imported `useReportDds` from `hooks/useReports` and wired it to `canSeeDds` role gate
- DDS card renders before Company Expenses section with two-level drill-down: expense group → per-restaurant rows
- All 30 existing tests pass; `npx tsc --noEmit` exits 0
- `apps/auth-service/` untouched — module boundary respected per CLAUDE.md

## Task Commits

1. **Task 1: Add DDS section to ReportsScreen.tsx for OWNER/FINANCE_DIRECTOR/ADMIN** - `7f9ddb8` (feat)

## Files Created/Modified
- `apps/mobile-dashboard/src/screens/ReportsScreen.tsx` - Added useReportDds import, canSeeDds gate, dds hook call, DDS card JSX before Company Expenses

## Decisions Made
- Used `ReportDdsDto.groups[]` shape (confirmed from `src/types/index.ts`) — each group has `groupName`, `totalAmount`, and nested `restaurants[{ restaurantId, restaurantName, amount }]`
- Reused pre-existing `styles.ddsGroupRow` and `styles.ddsRestaurantRow` from `ReportsScreen.styles.ts` (already defined, waiting for JSX to use them)
- Placed DDS section first (before Company Expenses) per ROADMAP section ordering

## Deviations from Plan

None - plan executed exactly as written. DTO field names matched the `groups[]` variant described in plan task action (Step 6). No adaptation was needed beyond using the confirmed shape from `types/index.ts`.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Mobile half of BUG-11-7 is complete. Full BUG-11-7 closure requires plan `11-03b` (auth-agent) to ensure dev OTP bypass assigns OWNER role.
- ReportsScreen now has 4 sections for OWNER/FIN_DIR: DDS / Затраты компании / Цех / Тренды
- OPS_DIRECTOR still sees only 2 sections (Цех + Тренды) — role gating correct.

---
*Phase: 11-bug-fix-pack-post-walkthrough*
*Completed: 2026-04-20*
