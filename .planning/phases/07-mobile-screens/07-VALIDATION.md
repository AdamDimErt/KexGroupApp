---
phase: 7
slug: mobile-screens
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-07
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (via Expo) |
| **Config file** | apps/mobile-dashboard/package.json (jest config) |
| **Quick run command** | `cd apps/mobile-dashboard && npm test -- --passWithNoTests` |
| **Full suite command** | `cd apps/mobile-dashboard && npm test` |
| **Type check command** | `cd apps/mobile-dashboard && npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/mobile-dashboard && npx tsc --noEmit`
- **After every plan wave:** Run `cd apps/mobile-dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + tsc clean
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 07-01-01 | 01 | 1 | Types | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-01-02 | 01 | 1 | API methods | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-01-03 | 01 | 1 | Navigation | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-02-01 | 02 | 2 | Level 3 screen | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-02-02 | 02 | 2 | Level 4 screen | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-03-01 | 03 | 3 | Dashboard KPI | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-03-02 | 03 | 3 | Period switcher | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-03-03 | 03 | 3 | PointDetail drilldown | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-04-01 | 04 | 4 | Reports screens | type-check | `npx tsc --noEmit` | ⬜ pending |
| 07-04-02 | 04 | 4 | Offline cache | type-check | `npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `expo-haptics` — `npx expo install expo-haptics`
- [ ] Install `@react-native-async-storage/async-storage` — `npx expo install @react-native-async-storage/async-storage`

*Both packages must be installed before Wave 1 tasks execute.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Period switcher renders | Level 1 UX | React Native UI | Launch app, check Dashboard top bar |
| Drill-down Level 3 opens | Navigation | Runtime nav state | Tap expense group row in PointDetail |
| Drill-down Level 4 opens | Navigation (Owner only) | Role-gated | Login as OWNER, tap article row |
| Offline banner shows | Offline UX | Network simulation | Turn off WiFi, open app |
| Haptic on navigation | Haptics | Device sensor | Feel device vibration on drill-down |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (tsc --noEmit)
- [x] Sampling continuity: every task has type check
- [x] Wave 0 covers missing package installs
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-07
