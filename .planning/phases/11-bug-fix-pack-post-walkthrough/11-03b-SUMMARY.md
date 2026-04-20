---
phase: 11-bug-fix-pack-post-walkthrough
plan: 03b
subsystem: auth-service
tags: [bug-fix, auth, dev-bypass, jwt, role, owner]
dependency_graph:
  requires: [11-00]
  provides: [BUG-11-7-auth-half]
  affects: [mobile-dashboard/useAuthStore, api-gateway/jwt-guard]
tech_stack:
  added: []
  patterns: [dev-env-guard, role-override-safety-net]
key_files:
  created: []
  modified:
    - apps/auth-service/src/auth/auth.service.ts
    - apps/auth-service/src/auth/auth.service.spec.ts
decisions:
  - "Scenario B applied: user fetched from DB; role overridden inline before issueTokens() — no DB write, no migration needed"
  - "Env var aligned: service now reads DEV_BYPASS_CODE (matching .env.example), not DEV_OTP_BYPASS_CODE"
  - "isDevBypassActive() extracted as private helper to keep verifyOtp() readable and guard reusable"
metrics:
  duration: ~10min
  completed: 2026-04-20
  tasks_completed: 1
  files_changed: 2
---

# Phase 11 Plan 03b: Dev OTP Bypass Returns OWNER Role Summary

**One-liner:** Dev bypass (`DEV_BYPASS_CODE=111111` + `DEV_BYPASS_PHONES`) now overrides user role to OWNER in non-production, making all OWNER-gated UI (Dashboard KPIs, DDS Reports section) visible during dev walkthroughs.

## What Was Done

### Scenario Applied: B

The bypass path in `generateOtp()` stores the bypass code in Redis, then `verifyOtp()` calls `findOrCreateUser(phone)`. That function creates new users with `role: 'OPERATIONS_DIRECTOR'` — meaning dev bypass phones that had never logged in before (or existed as OPERATIONS_DIRECTOR in DB) would receive a non-OWNER JWT.

Fix applied: after the Redis OTP check passes, `isDevBypassActive()` is called. When true, `user.role` is overridden to `'OWNER'` on the in-memory object before `issueTokens()` signs the JWT. No DB write, no migration needed.

### Secondary Fix (Rule 1 — Bug)

The service read env var `DEV_OTP_BYPASS_CODE` but `.env.example` documents `DEV_BYPASS_CODE`. This mismatch meant the bypass code would always fall back to the hardcoded default `'111111'` rather than the configured value. Fixed: service now reads `DEV_BYPASS_CODE` consistently.

### Changes

**`apps/auth-service/src/auth/auth.service.ts`:**
- Fixed `devOtpBypassCode` getter: `DEV_OTP_BYPASS_CODE` → `DEV_BYPASS_CODE`
- Added `isDevBypassActive(phone, code): boolean` — checks `NODE_ENV !== 'production'` AND `bypassPhones.includes(phone)` AND `code === devOtpBypassCode`
- In `verifyOtp()`: added OWNER role override block after OTP match, guarded by `isDevBypassActive()` with logger.warn for traceability

**`apps/auth-service/src/auth/auth.service.spec.ts`:**
- Fixed mock config: `DEV_OTP_BYPASS_CODE` → `DEV_BYPASS_CODE`, added `NODE_ENV: 'development'`
- Added `describe('BUG-11-7: dev bypass role', ...)` block with 3 tests:
  1. Returns OWNER role when bypass code used with listed phone in development
  2. Does NOT engage bypass in production even for listed phone
  3. Does NOT engage bypass for phone NOT in DEV_BYPASS_PHONES

## Test Results

```
Tests:  38 passed, 38 total (was 35 before this plan — 3 new BUG-11-7 tests added)
TypeScript: npx tsc --noEmit exits 0
```

## Migration SQL

Not required. Scenario B with in-memory override — no schema or data changes needed.

The `.env.example` already documented `DEV_BYPASS_PHONES` and `DEV_BYPASS_CODE` (added in Wave 0 / plan 11-00). No further documentation changes needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mismatched env var name `DEV_OTP_BYPASS_CODE` vs `.env.example` `DEV_BYPASS_CODE`**
- **Found during:** Task 1, reading the service getter vs `.env.example`
- **Issue:** Service read `DEV_OTP_BYPASS_CODE`; `.env.example` defines `DEV_BYPASS_CODE`. The bypass code always fell back to hardcoded `'111111'` even if a different value was configured.
- **Fix:** Changed getter to read `DEV_BYPASS_CODE`. Updated spec mock accordingly.
- **Files modified:** `apps/auth-service/src/auth/auth.service.ts`, `apps/auth-service/src/auth/auth.service.spec.ts`
- **Commit:** 1a4d368

No other deviations.

## Cross-references

- **BUG-11-7 mobile half:** `11-03-SUMMARY.md` — restores DDS JSX section in `ReportsScreen.tsx` for OWNER role. Together these two plans fully close BUG-11-7.
- **Commit:** `1a4d368 fix(11-03b): dev OTP bypass returns OWNER role in JWT (BUG-11-7)`

## Self-Check: PASSED

- `apps/auth-service/src/auth/auth.service.ts` — exists, contains `isDevBypassActive`, contains `OWNER`
- `apps/auth-service/src/auth/auth.service.spec.ts` — exists, contains `BUG-11-7`
- Commit `1a4d368` — verified via `git log`
- `npm test` — 38 tests passed
- `npx tsc --noEmit` — exits 0
- Module boundary — zero files outside `apps/auth-service/` modified by this plan
