---
phase: 6
slug: mobile-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (`npx tsc --noEmit`) — no Jest in mobile-dashboard |
| **Config file** | `apps/mobile-dashboard/tsconfig.json` |
| **Quick run command** | `cd apps/mobile-dashboard && npx tsc --noEmit` |
| **Full suite command** | `cd apps/mobile-dashboard && npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/mobile-dashboard && npx tsc --noEmit`
- **After every plan wave:** Run full tsc check
- **Before `/gsd:verify-work`:** tsc must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 6-01-01 | 01 | 1 | MOB-MIN-OS + MOB-SENTRY (install) | config check | `node -e "const a=require('./app.json'); console.assert(a.expo.ios.minimumOsVersion==='15.1'); console.assert(a.expo.android.minSdkVersion===26);"` | ⬜ pending |
| 6-01-02 | 01 | 1 | MOB-OTP-TIMER | tsc | `cd apps/mobile-dashboard && npx tsc --noEmit` | ⬜ pending |
| 6-01-03 | 01 | 1 | MOB-INACTIVITY + MOB-SENTRY | tsc | `cd apps/mobile-dashboard && npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry event appears in dashboard | MOB-SENTRY | Requires Sentry project + DSN | Add test `throw new Error('test')` in dev, check Sentry dashboard |
| Biometric prompt appears after OTP login | (already done) | Requires physical device | Login with OTP → accept biometric setup prompt |
| Inactivity logout fires after 10 min background | MOB-INACTIVITY | Requires device/simulator + timer | Background app 10+ min → foreground → verify logout |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify command
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
