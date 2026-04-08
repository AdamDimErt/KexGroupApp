---
phase: 08-push-notifications
plan: "03"
subsystem: ui
tags: [react-native, expo-notifications, fcm, push-notifications, zustand]

# Dependency graph
requires:
  - phase: 08-push-notifications
    provides: Plan 08-01 notification preferences API (GET/PUT /notifications/preferences), NotificationPreference model

provides:
  - Native FCM token registration (getDevicePushTokenAsync) wired in App.tsx
  - Foreground notification handler (setNotificationHandler) at module level
  - useNotificationPrefs hook with optimistic toggle and error revert
  - ProfileScreen with SYNC_FAILURE, LOW_REVENUE, LARGE_EXPENSE Switch toggles
  - Navigation from DashboardScreen header settings icon to ProfileScreen

affects: [mobile-dashboard, App.tsx navigation, push-notifications pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level setNotificationHandler — called once at import time, before any hook invocations"
    - "Opt-out preference model — no row in prefs array means type is enabled (isEnabled defaults true)"
    - "Optimistic toggle with error revert — setPrefs immediately, revert if updateNotificationPref throws"

key-files:
  created:
    - apps/mobile-dashboard/src/hooks/useNotificationPrefs.ts
    - apps/mobile-dashboard/src/screens/ProfileScreen.tsx
  modified:
    - apps/mobile-dashboard/src/hooks/usePushNotifications.ts
    - apps/mobile-dashboard/src/services/notifications.ts
    - apps/mobile-dashboard/src/screens/DashboardScreen.tsx
    - apps/mobile-dashboard/src/types/index.ts
    - apps/mobile-dashboard/App.tsx

key-decisions:
  - "setNotificationHandler must be called at module level (outside hook body) — if called inside useEffect it re-registers on every render, causing duplicate handlers"
  - "getDevicePushTokenAsync returns { type: 'fcm'|'ios', data: string } — tokenData.data is the raw FCM/APNS token for direct FCM HTTP v1 API, not wrapped in ExponentPushToken[]"
  - "NotificationBehavior requires shouldShowBanner + shouldShowList in addition to shouldShowAlert (Expo SDK 54 type constraint)"
  - "onNavigateProfile added as optional prop to DashboardScreen — settings icon only renders when prop is provided, backward compatible"

patterns-established:
  - "Profile/settings navigation pattern: optional prop on DashboardScreen, profile case in renderScreen + goBack switches in App.tsx"

requirements-completed:
  - PUSH-04
  - PUSH-05

# Metrics
duration: 15min
completed: "2026-04-08"
---

# Phase 08 Plan 03: Push Notifications Mobile Client Summary

**Native FCM token registration with getDevicePushTokenAsync, foreground notification handler, and ProfileScreen with 3 notification preference toggles wired via DashboardScreen settings icon**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T19:30:00Z
- **Completed:** 2026-04-08T19:45:00Z
- **Tasks:** 2 auto + 1 checkpoint (auto-approved)
- **Files modified:** 7

## Accomplishments
- Fixed push token type from Expo proxy (getExpoPushTokenAsync) to native FCM (getDevicePushTokenAsync) — tokenData.data is now raw FCM/APNS token string
- Wired usePushNotifications in App.tsx: called with accessToken when appState === 'app', null otherwise
- Added foreground notification handler at module level with shouldShowAlert/shouldShowBanner/shouldShowList/shouldPlaySound
- Created useNotificationPrefs hook with optimistic toggle and error revert pattern
- Created ProfileScreen with ActivityIndicator loading state and 3 Switch rows for SYNC_FAILURE, LOW_REVENUE, LARGE_EXPENSE
- Navigation wired: DashboardScreen settings icon → ProfileScreen → back to dashboard

## Task Commits

1. **Task 1: Fix push token type + wire in App.tsx + foreground handler** - `9d473e1` (feat)
2. **Task 2: Create useNotificationPrefs + ProfileScreen + wire navigation** - `0aca2bb` (feat)
3. **Task 3: Verify pipeline** — Auto-approved checkpoint (--auto mode)

## Files Created/Modified
- `apps/mobile-dashboard/src/hooks/usePushNotifications.ts` — Fixed to use getDevicePushTokenAsync + static imports + module-level setNotificationHandler
- `apps/mobile-dashboard/src/hooks/useNotificationPrefs.ts` — New hook: fetch prefs, optimistic toggle, error revert
- `apps/mobile-dashboard/src/screens/ProfileScreen.tsx` — New screen: 3 notification type toggles with Switch components
- `apps/mobile-dashboard/src/services/notifications.ts` — Added fetchNotificationPrefs, updateNotificationPref, NotificationPref interface
- `apps/mobile-dashboard/src/screens/DashboardScreen.tsx` — Added onNavigateProfile optional prop, settings icon button in header
- `apps/mobile-dashboard/src/types/index.ts` — Added 'profile' to Screen union type
- `apps/mobile-dashboard/App.tsx` — Import usePushNotifications + ProfileScreen, wire hook call, renderScreen/goBack cases

## Decisions Made
- `setNotificationHandler` placed at module level (outside hook body) — prevents duplicate handler registration on re-renders
- `getDevicePushTokenAsync` returns `NotificationDevicePushToken` where `.data` is raw string — changed extraction from `.data` (same field name, different wrapper type)
- `NotificationBehavior` in Expo SDK 54 requires `shouldShowBanner` and `shouldShowList` in addition to `shouldShowAlert` — added both as `true`
- `onNavigateProfile` made optional so existing App.tsx call sites that omit it still compile

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added shouldShowBanner + shouldShowList to NotificationBehavior**
- **Found during:** Task 1 (fix push token type)
- **Issue:** TypeScript error TS2322 — NotificationBehavior type in Expo SDK 54 requires shouldShowBanner and shouldShowList fields not mentioned in plan
- **Fix:** Added `shouldShowBanner: true, shouldShowList: true` to the handler return object
- **Files modified:** apps/mobile-dashboard/src/hooks/usePushNotifications.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 9d473e1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type error bug fix)
**Impact on plan:** Necessary for TypeScript correctness in Expo SDK 54. No scope creep.

## Issues Encountered
None — TypeScript error was caught immediately and fixed inline.

## User Setup Required
None — no external service configuration required beyond existing FCM setup from Phase 08-01.

## Next Phase Readiness
- Complete push notifications pipeline: role dispatch (08-01) + AlertService (08-02) + mobile client (08-03) all done
- ProfileScreen accessible from DashboardScreen header via settings icon
- Push token registers on app launch using native FCM token
- Foreground notifications display immediately
- Users can toggle SYNC_FAILURE, LOW_REVENUE, LARGE_EXPENSE notification preferences

---
*Phase: 08-push-notifications*
*Completed: 2026-04-08*
