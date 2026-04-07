# Phase 6: Mobile Foundation — Research

**Researched:** 2026-04-07
**Domain:** React Native / Expo — Sentry, OTP resend timer, biometrics, inactivity auto-logout, OS enforcement
**Confidence:** HIGH

---

## Summary

Phase 6 completes the remaining ~40% of the mobile foundation. Four of the five features are either already partially built or straightforward to add. The biometric layer (`expo-local-authentication`) is **already installed and fully implemented** in `src/services/biometric.ts` — the service handles hardware detection, enrollment check, type detection (Face ID / fingerprint / iris), and the authenticate call with all error cases. `app.json` already has the `expo-local-authentication` plugin registered and `NSFaceIDUsageDescription` set.

The OTP screen (`LoginScreen.tsx` / `useLogin.ts`) **does not have a resend button** — the code step renders a static "Подтвердить" button and a "← Изменить номер" link, with no resend path. A 60-second countdown must be added to `useLogin.ts` and rendered in `LoginScreen.tsx`.

Sentry is **not installed** — `package.json` lists no `@sentry/react-native`. The app uses `App.tsx` as a plain functional component (no navigation wrapper), which dictates a specific Sentry wrapping pattern.

Auto-logout on inactivity is **not implemented**. The `AppState` API from React Native core is the right tool — no external library needed. The pattern is: record timestamp when app goes to background, compare on foreground return, trigger `handleLogout` if elapsed > threshold.

Min OS enforcement is a config-only task: set `ios.minimumOsVersion` to `"14.0"` and `android.minSdkVersion` to `26` in `app.json`.

**Primary recommendation:** Implement in this order: (1) Sentry init, (2) OTP resend timer in useLogin, (3) AppState inactivity hook, (4) OS enforcement in app.json. Biometrics are done — skip.

---

## Current State Inventory

| Feature | Status | Location |
|---------|--------|----------|
| Sentry | NOT installed | — |
| OTP resend button | MISSING | `useLogin.ts`, `LoginScreen.tsx` |
| Biometrics (expo-local-authentication) | COMPLETE | `src/services/biometric.ts`, `App.tsx` |
| AppState auto-logout | NOT implemented | — |
| Min OS enforcement | NOT set | `app.json` |

### Already installed packages relevant to this phase
From `package.json`:
- `expo-local-authentication: ^55.0.11` — biometrics (latest verified: 55.0.12)
- `expo-secure-store: ~15.0.8` — token storage
- `expo-notifications: ~0.31.0` — FCM already wired
- No `@sentry/react-native` entry present

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/react-native` | `^8.7.0` | Error tracking, performance, crash reporting | Official Sentry SDK; Expo plugin ships built-in; current latest is 8.7.0 |
| `expo-local-authentication` | `~55.0.0` | Face ID / Touch ID / fingerprint | Already installed; Expo-official, no native modules needed in managed workflow |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AppState` (React Native core) | built-in | Background/foreground detection | Inactivity timer — no extra install |
| `useRef` + `setInterval` | built-in | 60s OTP resend countdown | Simple countdown, no external dep |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom AppState hook | `react-native-user-inactivity` | Library adds ~30KB, unnecessary; AppState alone covers background detection perfectly for this use case |
| AppState background timer | `react-native-background-timer` | Not needed — we only need to measure elapsed time, not schedule a background task |

**Installation (only Sentry is missing):**
```bash
cd apps/mobile-dashboard
npx expo install @sentry/react-native
```

**Version verification:** `npm view @sentry/react-native version` → `8.7.0` (verified 2026-04-07)

---

## Architecture Patterns

### Pattern 1: Sentry Init — Expo Managed Workflow

**What:** Initialize Sentry at app entry, wrap root component, add plugin to `app.json`.

**What NOT to do:** Do not use `@sentry/wizard` in this project — it rewrites files. Manual setup is required.

**Step 1 — app.json plugins array** (add after `expo-local-authentication`):
```jsonc
// Source: https://docs.sentry.io/platforms/react-native/manual-setup/expo/
"plugins": [
  "expo-font",
  "expo-secure-store",
  "expo-local-authentication",
  [
    "@sentry/react-native/expo",
    {
      "url": "https://sentry.io/",
      "project": "___SENTRY_PROJECT___",
      "organization": "___SENTRY_ORG___"
    }
  ]
]
```

**Step 2 — App.tsx init** (before the component, at module top level):
```typescript
// Source: https://docs.sentry.io/platforms/react-native/
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,      // lower to 0.2 in production
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  enabled: process.env.EXPO_PUBLIC_APP_ENV !== 'development', // disable in dev
});
```

**Step 3 — Wrap default export:**
```typescript
// Sentry.wrap adds automatic JS error boundary + breadcrumbs
export default Sentry.wrap(App);
```

**Note:** `process.env.EXPO_PUBLIC_SENTRY_DSN` must be added to `.env`. Variables prefixed `EXPO_PUBLIC_` are inlined by Metro at build time (Expo SDK 49+).

**Note on Sentry 8.x:** Version 8 updated native SDKs (Cocoa v9, Android Gradle v6). In managed Expo workflow, EAS Build handles the native layer — no manual Podfile changes needed. For local development with Expo Go, only JS-level errors are captured (native crash reporting requires a development build).

### Pattern 2: OTP Resend Timer (60-second countdown)

**What:** After OTP is sent, display a 60-second countdown. When it reaches 0, show "Отправить снова" button. On click, call `handlePhoneSubmit` again and reset timer.

**Location:** Add state and effect to `useLogin.ts`, render in `LoginScreen.tsx`.

**Hook additions to `useLogin.ts`:**
```typescript
// Add to existing state
const [resendTimer, setResendTimer] = useState(0);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

// Call this when OTP is sent successfully (inside handlePhoneSubmit after setStep('code'))
const startResendTimer = () => {
  setResendTimer(60);
  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = setInterval(() => {
    setResendTimer(prev => {
      if (prev <= 1) {
        clearInterval(timerRef.current!);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};

// Cleanup on unmount
useEffect(() => {
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, []);

// Modified goBackToPhone — also clear timer
const goBackToPhone = () => {
  if (timerRef.current) clearInterval(timerRef.current);
  setResendTimer(0);
  // ... existing reset logic
};
```

**LoginScreen.tsx render (code step block):**
```tsx
{resendTimer > 0 ? (
  <Text style={styles.resendTimer}>
    Повторная отправка через {resendTimer} сек.
  </Text>
) : (
  <TouchableOpacity onPress={handleResend} disabled={loading}>
    <Text style={styles.resendLink}>Отправить снова</Text>
  </TouchableOpacity>
)}
```

`handleResend` in `useLogin.ts` resets code state, calls `handlePhoneSubmit`, restarts timer.

### Pattern 3: AppState Inactivity Auto-Logout

**What:** When app goes to background, record timestamp. When app returns to foreground, compare elapsed time. If elapsed > threshold, call logout.

**Implementation as a custom hook `useInactivityLogout.ts`:**
```typescript
// Source: https://reactnative.dev/docs/appstate
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function useInactivityLogout(
  isAuthenticated: boolean,
  onLogout: () => Promise<void>,
) {
  const backgroundTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          backgroundTimestamp.current = Date.now();
        } else if (nextState === 'active') {
          if (backgroundTimestamp.current !== null) {
            const elapsed = Date.now() - backgroundTimestamp.current;
            backgroundTimestamp.current = null;
            if (elapsed > INACTIVITY_TIMEOUT_MS) {
              void onLogout();
            }
          }
        }
      },
    );

    return () => subscription.remove();
  }, [isAuthenticated, onLogout]);
}
```

**Usage in App.tsx:**
```typescript
// In the App() component, after appState reaches 'app'
useInactivityLogout(appState === 'app', handleLogout);
```

**Key details:**
- `inactive` state: iOS-only, occurs briefly when notification center slides in. Treat same as background to avoid false logout.
- `backgroundTimestamp` stored in `useRef` — survives re-renders, not persisted across cold starts (cold start always goes through bootstrap anyway).
- Threshold of 10 minutes is a reasonable default for a financial dashboard. The CLAUDE.md does not specify a timeout value — use 10 min as default, make it a named constant.

### Pattern 4: Min OS Enforcement in app.json

**What:** Declare minimum platform versions in `app.json`. Expo uses these to configure Info.plist (iOS) and build.gradle (Android).

```jsonc
// Source: https://docs.expo.dev/versions/latest/config/app/
{
  "expo": {
    "ios": {
      "minimumOsVersion": "14.0",          // ADD THIS
      "supportsTablet": true,
      "infoPlist": {
        "NSFaceIDUsageDescription": "Используется для быстрого входа в приложение"
      }
    },
    "android": {
      "minSdkVersion": 26,                 // ADD THIS — Android 8.0
      // ... existing config
    }
  }
}
```

**Android API 26 = Android 8.0 (Oreo).** The project spec says "Android 8.0+".

**iOS 14 note:** Expo SDK 54 officially supports iOS 16+ by default, but `minimumOsVersion: "14.0"` can be set for wider device support. Expo documentation states the minimum supported iOS is tied to React Native 0.81 requirements. For managed workflow, Expo EAS Build will respect this value. **Confirm with EAS Build output that this does not cause a build error** — if React Native 0.81 requires iOS 15.1 at minimum, the floor cannot be iOS 14 regardless of what `app.json` says.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error capture + symbolication | Custom try/catch + logging | `@sentry/react-native` | Source map upload, breadcrumbs, stack trace symbolication, JS/native crash correlation |
| Biometric auth | Direct `LocalAuthentication` calls in components | `src/services/biometric.ts` (already built) | Already abstracts hardware check, enrollment check, error normalization |
| Background timer | `setInterval` with `BackgroundFetch` | AppState + `Date.now()` elapsed check | Background JS execution is unreliable on iOS; timestamp diff on resume is reliable |

**Key insight:** The biometric service is already production-quality. Do not reimport `expo-local-authentication` directly in components — always go through `src/services/biometric.ts`.

---

## Common Pitfalls

### Pitfall 1: Sentry DSN hardcoded in source
**What goes wrong:** DSN committed to git, visible in bundle.
**Why it happens:** Dev copies from Sentry dashboard directly into code.
**How to avoid:** Use `EXPO_PUBLIC_SENTRY_DSN` in `.env`. Metro inlines `EXPO_PUBLIC_*` vars at build time — safe for client bundles. Never use `SENTRY_DSN` (non-public prefix) in client code.
**Warning signs:** Grep for `https://...@*.sentry.io` outside of `.env` files.

### Pitfall 2: Sentry.wrap breaks Fast Refresh
**What goes wrong:** `Sentry.wrap(App)` on the default export sometimes causes HMR/Fast Refresh to disconnect in Expo Go.
**Why it happens:** Sentry wraps component reference; HMR replaces module, loses reference.
**How to avoid:** This is a known dev-only issue. `enabled: false` in development (see init config above) sidesteps most of it. If HMR breaks, restart Metro.

### Pitfall 3: AppState 'inactive' on iOS causes false logout
**What goes wrong:** User receives notification, pulls down notification center, app enters `inactive`, then user returns — gets logged out.
**Why it happens:** iOS emits `inactive` → `active` cycle for notification center interactions. If `backgroundTimestamp` is set on `inactive`, the elapsed time may be > threshold if the threshold is too short.
**How to avoid:** Set threshold >= 5 minutes. The 10-minute constant avoids this entirely for normal usage. The `inactive` → `active` transition without intervening `background` state is < 1 second.

### Pitfall 4: OTP resend timer not reset on navigation back
**What goes wrong:** User taps "← Изменить номер", goes back to phone step, then re-enters phone. Timer from previous attempt still running; resend button never appears.
**Why it happens:** `goBackToPhone` resets code state but not the interval.
**How to avoid:** Always call `clearInterval(timerRef.current)` and `setResendTimer(0)` in `goBackToPhone`.

### Pitfall 5: Face ID on iOS Expo Go
**What goes wrong:** `authenticateAsync` with Face ID fails silently or shows wrong UI in Expo Go.
**Why it happens:** Expo Go does not support Face ID — requires a development build or production build.
**How to avoid:** Already handled in biometric.ts: `Platform.OS === 'web'` guard. For Face ID testing, use `expo run:ios` (development build) or EAS Build.

### Pitfall 6: Android minSdkVersion conflict with dependencies
**What goes wrong:** Setting `minSdkVersion: 26` causes build failure if another dependency requires `minSdkVersion >= 26` but some other dependency requires lower.
**Why it happens:** `expo-notifications` (expo-firebase-core) has historically required API 21+, which is fine. No known dep requires API > 26 in this stack.
**How to avoid:** This is safe — no package in current `package.json` requires Android API > 26. The conflict direction would only be if minSdkVersion were set lower than a dep requirement.

---

## Code Examples

### Sentry init — complete App.tsx top section
```typescript
// Source: https://docs.sentry.io/platforms/react-native/manual-setup/expo/
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production',
  // Attach user context after login:
  // Sentry.setUser({ id: user.id, username: user.name });
});

// ... rest of imports ...

export default Sentry.wrap(App);   // wraps the default export, not the function itself
```

### Capture error manually (for API errors)
```typescript
import * as Sentry from '@sentry/react-native';

// In catch blocks where context is useful:
Sentry.captureException(error, {
  tags: { screen: 'LoginScreen', action: 'verify-otp' },
  user: { id: userId },
});
```

### useInactivityLogout hook (complete)
```typescript
// src/hooks/useInactivityLogout.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function useInactivityLogout(
  isAuthenticated: boolean,
  onLogout: () => Promise<void>,
): void {
  const backgroundTimestamp = useRef<number | null>(null);
  const stableLogout = useCallback(onLogout, [onLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now();
      } else if (nextState === 'active') {
        const ts = backgroundTimestamp.current;
        backgroundTimestamp.current = null;
        if (ts !== null && Date.now() - ts > INACTIVITY_TIMEOUT_MS) {
          void stableLogout();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isAuthenticated, stableLogout]);
}
```

### OTP resend — additions to useLogin.ts (diff view)
```typescript
// NEW state additions
const [resendTimer, setResendTimer] = useState(0);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

// NEW function — call inside handlePhoneSubmit after setStep('code')
const startResendTimer = useCallback(() => {
  if (timerRef.current) clearInterval(timerRef.current);
  setResendTimer(60);
  timerRef.current = setInterval(() => {
    setResendTimer(prev => {
      if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
      return prev - 1;
    });
  }, 1000);
}, []);

// NEW cleanup
useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

// MODIFIED goBackToPhone — add these two lines before existing resets
if (timerRef.current) clearInterval(timerRef.current);
setResendTimer(0);

// EXPORT: add resendTimer and handleResend to return object
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `sentry-expo` (Expo SDK < 48) | `@sentry/react-native` with Expo plugin | `sentry-expo` is deprecated; direct `@sentry/react-native` is the replacement |
| `AppState.currentState` polling | `AppState.addEventListener` subscription | `addEventListener` is the current API; `currentState` is still valid for initial read |
| `LocalAuthentication.authenticateAsync` with `disableDeviceFallback: true` | `disableDeviceFallback: false` (allow PIN fallback) | Biometric.ts already uses `false` — correct for Kazakhstan market (users may not have biometric enrolled but have PIN) |

**Deprecated/outdated:**
- `sentry-expo` package: fully deprecated, replaced by `@sentry/react-native` with built-in Expo plugin (HIGH confidence — official Sentry docs)
- `AppState.remove()` subscription removal: replaced by `subscription.remove()` returned from `addEventListener` (RN 0.65+, already current)

---

## Open Questions

1. **iOS minimumOsVersion: "14.0" vs "15.1"**
   - What we know: Expo SDK 54 changelog references iOS 16+ as target. React Native 0.81 release notes state minimum iOS is 15.1.
   - What's unclear: Whether `minimumOsVersion: "14.0"` causes an EAS Build error or a silent mismatch.
   - Recommendation: Set to `"15.1"` to match React Native 0.81's actual minimum. If the business requirement is truly iOS 14+, that would require downgrading Expo SDK, which is not feasible. **Flag for product owner: recommend iOS 15.1 as actual minimum.**

2. **Sentry DSN environment — .env entry**
   - What we know: `EXPO_PUBLIC_SENTRY_DSN` must be in `.env`. This file is gitignored.
   - What's unclear: Whether a Sentry project for this app exists already.
   - Recommendation: Create `.env` entry with placeholder; document in README that Sentry DSN must be filled before EAS Build.

3. **Inactivity timeout value**
   - What we know: CLAUDE.md and REQUIREMENTS.md do not specify a timeout duration.
   - What's unclear: Business requirement for auto-logout window.
   - Recommendation: Use 10 minutes as default constant. Expose as a named constant `INACTIVITY_TIMEOUT_MS` in the hook so it can be changed without touching logic.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (via Expo's default test setup) |
| Config file | None detected in `apps/mobile-dashboard/` — no `jest.config.*` or `package.json` jest key |
| Quick run command | `cd apps/mobile-dashboard && npm test` |
| Full suite command | `cd apps/mobile-dashboard && npm test -- --coverage` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| `useInactivityLogout` — logs out after threshold | unit | `npm test -- useInactivityLogout` | Mock `AppState.addEventListener`, advance timer |
| `useInactivityLogout` — no logout if under threshold | unit | same | |
| OTP resend timer counts from 60 to 0 | unit | `npm test -- useLogin` | Mock `setInterval` with fake timers |
| OTP resend button hidden while timer > 0 | unit | same | |
| `isBiometricAvailable` returns false when not enrolled | unit | `npm test -- biometric` | Already built; verify test exists |
| Sentry.init called with DSN | unit/smoke | manual | No unit test needed; verify at build time |

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/useInactivityLogout.test.ts` — covers inactivity logic
- [ ] `src/hooks/__tests__/useLogin.test.ts` — covers resend timer logic
- [ ] Jest config (`jest.config.js` or `package.json` jest key) — none found in `apps/mobile-dashboard/`
- [ ] `@testing-library/react-native` — likely not installed (not in package.json devDeps)

---

## Sources

### Primary (HIGH confidence)
- `apps/mobile-dashboard/package.json` — installed dependencies, confirmed no `@sentry/react-native`
- `apps/mobile-dashboard/src/services/biometric.ts` — biometric service fully implemented
- `apps/mobile-dashboard/App.tsx` — app entry point, bootstrap, biometric screens
- `apps/mobile-dashboard/src/screens/LoginScreen.tsx` + `useLogin.ts` — OTP screen, no resend button confirmed
- `apps/mobile-dashboard/app.json` — plugins, no Sentry plugin, no minSdkVersion/minimumOsVersion
- https://docs.sentry.io/platforms/react-native/manual-setup/expo/ — Sentry Expo setup
- https://docs.expo.dev/guides/using-sentry/ — Expo Sentry integration guide
- https://docs.expo.dev/versions/v54.0.0/sdk/local-authentication/ — expo-local-authentication API reference
- https://reactnative.dev/docs/appstate — AppState API (React Native core)
- `npm view @sentry/react-native version` → `8.7.0` (verified 2026-04-07)
- `npm view expo-local-authentication version` → `55.0.12` (verified 2026-04-07)

### Secondary (MEDIUM confidence)
- https://expo.dev/changelog/sdk-54 — Expo SDK 54 release notes (iOS minimum version ambiguity noted)
- WebSearch: React Native AppState inactivity timer patterns — multiple community sources consistent

### Tertiary (LOW confidence)
- iOS 14 vs 15.1 minimum: conflicting signals from search results — **flagged as open question**

---

## Metadata

**Confidence breakdown:**
- Sentry integration: HIGH — official docs consulted, version verified
- Biometric status (already done): HIGH — code directly read
- OTP resend timer (missing): HIGH — code directly read, pattern is standard React hooks
- AppState inactivity: HIGH — React Native core API, well-documented
- OS enforcement: MEDIUM — `minimumOsVersion` / `minSdkVersion` values are config-only, but iOS 14 vs 15.1 floor is unclear (open question)
- Test framework detection: LOW — no jest config found, unclear if jest is set up at all

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain, Expo SDK and Sentry release cadence)
