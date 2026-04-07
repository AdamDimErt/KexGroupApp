---
phase: 06-mobile-foundation
plan: "01"
subsystem: mobile-dashboard
tags: [sentry, otp, inactivity-logout, min-os, react-native, expo]
dependency_graph:
  requires: []
  provides:
    - Sentry crash monitoring for mobile (production-only)
    - OTP resend timer (60s countdown)
    - Inactivity auto-logout (10 min background threshold)
    - Min OS enforcement (iOS 15.1, Android API 26)
  affects:
    - apps/mobile-dashboard/App.tsx
    - apps/mobile-dashboard/src/hooks/useLogin.ts
    - apps/mobile-dashboard/src/screens/LoginScreen.tsx
tech_stack:
  added:
    - "@sentry/react-native ~7.2.0 (via expo install)"
  patterns:
    - AppState.addEventListener for background/inactive/active lifecycle
    - useCallback-stabilized logout ref to prevent stale closure in useEffect
    - setInterval-based countdown with functional state updater (prev => prev - 1)
    - Sentry.wrap() on default export for automatic error boundary
key_files:
  created:
    - apps/mobile-dashboard/src/hooks/useInactivityLogout.ts
  modified:
    - apps/mobile-dashboard/app.json
    - apps/mobile-dashboard/package.json
    - apps/mobile-dashboard/src/hooks/useLogin.ts
    - apps/mobile-dashboard/src/screens/LoginScreen.tsx
    - apps/mobile-dashboard/src/screens/LoginScreen.styles.ts
    - apps/mobile-dashboard/App.tsx
decisions:
  - "iOS minimum floor set to 15.1 (React Native 0.81 constraint — cannot go lower even if TZ said 14.0)"
  - "Sentry enabled only in production (EXPO_PUBLIC_APP_ENV === 'production') — no noise in dev/staging"
  - "INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000 (10 minutes) — matches JWT 15m TTL, provides safe buffer"
  - "inactive AppState treated same as background — iOS notification center open produces inactive state briefly, never triggers logout due to 10-min threshold"
  - "handleResend calls handlePhoneSubmit which internally calls startResendTimer — no double-start issue"
  - "@sentry/react-native ~7.2.0 pinned by expo install for Expo SDK 54 compatibility"
metrics:
  duration_minutes: 4
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 6
  completed_date: "2026-04-07"
---

# Phase 6 Plan 1: Mobile Foundation Completion Summary

**One-liner:** Sentry crash monitoring, OTP 60s resend timer, AppState-based 10-min inactivity auto-logout, and min OS enforcement (iOS 15.1 / Android API 26) added to mobile-dashboard.

## What Was Implemented

### 1. Min OS Enforcement + Sentry Plugin (app.json + package.json)
- `ios.minimumOsVersion: "15.1"` — React Native 0.81 floor, cannot go lower
- `android.minSdkVersion: 26` — Android 8.0 / Oreo per TZ specification
- `@sentry/react-native/expo` plugin registered in `plugins` array with placeholder project/org values
- `@sentry/react-native ~7.2.0` installed via `npx expo install` (Expo SDK 54 compatible)

### 2. OTP Resend Timer (useLogin.ts + LoginScreen.tsx + styles)
- `resendTimer` state starts at 60 after OTP send, counts down to 0 via `setInterval`
- `startResendTimer()` called in `handlePhoneSubmit` after successful OTP send
- `goBackToPhone()` clears interval and resets timer to 0
- Cleanup `useEffect` removes interval on component unmount
- `handleResend()` resets code fields + error, then calls `handlePhoneSubmit`
- `LoginScreen.tsx`: countdown text shown when `resendTimer > 0`, resend button when 0
- `LoginScreen.styles.ts`: `resendTimer` (textMuted) and `resendLink` (accent) style entries

### 3. Sentry Init + App Wrap (App.tsx)
- `import * as Sentry from '@sentry/react-native'` at top of file
- `Sentry.init()` called at module level before component, using `EXPO_PUBLIC_SENTRY_DSN` env var
- `enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production'` — no-op in dev/staging
- Default export changed to `export default Sentry.wrap(App)`

### 4. Inactivity Auto-Logout Hook (useInactivityLogout.ts)
- New hook: `useInactivityLogout(isAuthenticated: boolean, onLogout: () => Promise<void>)`
- Tracks `backgroundTimestamp` via `useRef` when app goes to background/inactive
- On return to active: calculates elapsed time, calls `onLogout()` if > 10 minutes
- `stableLogout = useCallback(onLogout, [onLogout])` prevents stale closure
- Wired in App.tsx: `useInactivityLogout(appState === 'app', handleLogout)`

## Verification Result

```
npx tsc --noEmit (zero errors, zero warnings)
```

All 3 tasks passed TypeScript compile check with no errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] expo install added duplicate @sentry/react-native plugin string**
- **Found during:** Task 1
- **Issue:** `npx expo install @sentry/react-native` auto-appended `"@sentry/react-native"` as a plain string to the plugins array, creating a duplicate alongside the already-present `["@sentry/react-native/expo", {...}]` array entry
- **Fix:** Rewrote app.json to remove the duplicate string entry, keeping only the correctly configured array entry
- **Files modified:** apps/mobile-dashboard/app.json

None - all other changes executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: apps/mobile-dashboard/src/hooks/useInactivityLogout.ts
- FOUND: apps/mobile-dashboard/app.json (minimumOsVersion=15.1, minSdkVersion=26, sentryPlugin=true)
- FOUND: apps/mobile-dashboard/package.json (@sentry/react-native ~7.2.0)

Commits verified:
- c689a36: feat(06-01): add min OS versions + Sentry plugin to app.json
- dc110e8: feat(06-01): OTP resend timer — 60s countdown + resend button
- da72fee: feat(06-01): Sentry init + inactivity auto-logout hook
