---
status: testing
phase: 11-bug-fix-pack-post-walkthrough
source:
  - 11-00-SUMMARY.md
  - 11-01-SUMMARY.md
  - 11-02-SUMMARY.md
  - 11-03-SUMMARY.md
  - 11-03b-SUMMARY.md
  - 11-04-SUMMARY.md
  - 11-05-SUMMARY.md
started: 2026-04-20T08:10:00Z
updated: 2026-04-20T08:58:00Z
---

## Current Test

number: 2
name: Dashboard brand tiles — 5 brands with correct badges
expected: |
  Dashboard shows 5 brand cards: Burger na Abaya (BNA blue), Doner na Abaya
  (DNA orange), Just Doner (JD pink), Salam Bro (SB green), КексБрэндс (KEX orange).
  NO "Цех" tile visible in the brand list.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill finance-service + auth-service + api-gateway. Clear any stuck processes.
  Start all 3 from scratch. Each boots without errors (logs show "Nest application
  successfully started"). finance-service responds 200 on /dashboard/summary.
  DB migration `20260420000000_add_brand_type` already applied.
result: pass
evidence: |
  Killed 3 stale node processes (PIDs 69028/52916/49208). Restarted via npm run start:dev
  from apps/*.service. Logs confirm "Nest application successfully started" at 14:51:49.
  All 3 ports UP (gateway:404, auth:404, finance:200).
  Full auth chain: POST /api/auth/send-otp → 200 dev bypass writes '111111' to Redis;
  POST /api/auth/verify-otp with code 111111 → 200 returns JWT with role=OWNER (decoded).
  GET /api/finance/dashboard returns 5 brands (BNA/DNA/JD/SB/KEX), Цех filtered out.
  Ratios financialResult/revenue = 0.65-0.71 in tenge (confirming BUG-11-1 fix).
  Totals: revenue 94.95M, expenses 29.45M, result 65.50M (overall margin 69.0%).
  DB migration 20260420000000_add_brand_type applied — type='RESTAURANT' filter working.

### 2. Dashboard brand tiles — 5 brands with correct badges
expected: |
  Dashboard shows 5 brand cards: Burger na Abaya (BNA blue), Doner na Abaya
  (DNA orange), Just Doner (JD pink), Salam Bro (SB green), КексБрэндс (KEX orange).
  NO "Цех" tile visible in the brand list.
result: [pending]

### 3. Brand margin is in 40-85% range (not 7000%)
expected: |
  Each brand tile shows "Маржа XX%" where XX is 40-85. Specifically:
  BNA ≈ 70%, DNA ≈ 68%, JD ≈ 70%, SB ≈ 68%, KEX ≈ 65%. None show > 100%.
result: [pending]

### 4. Delta chip shows small signed percentages
expected: |
  The orange/red chip in the top-right corner of each brand tile shows a signed
  percentage like "+5.0%" or "-4.8%" — NOT a triple-digit value like "-476.2%".
result: [pending]

### 5. Plan label shows "Ниже плана · -X%" in red for below-plan brands
expected: |
  Under each brand card's progress bar, right side shows "Ниже плана · -4.8%"
  in red when revenue < plan. NOT "Выше плана · 0.0%" when actually below.
result: [pending]

### 6. Sync time label in Asia/Almaty format
expected: |
  Dashboard under the KPI row shows "Синхронизация: HH:MM" in 24-hour format.
  The time matches current Almaty wall-clock time ± a few minutes
  (regardless of emulator's device timezone).
result: [pending]

### 7. Restaurant count ≤ 13 (active RESTAURANT-type)
expected: |
  Header of brands list shows "N точек" where N is the count of active
  RESTAURANT-type restaurants. Expected 13 or fewer (actual DB data may yield
  a different number but should not be 84 from the pre-fix bug).
result: [pending]

### 8. Reports — 4 sections visible for OWNER
expected: |
  Tap Аналитика (bottom nav). 4 section cards visible in order:
  ДДС — Движение денег, Затраты компании, Цех, Тренды.
  DDS section was missing before; now present for OWNER role.
result: [pending]

### 9. Dev OTP bypass returns OWNER role
expected: |
  Logging out and re-logging in with phone "+77074408018" + OTP "111111"
  produces a JWT with role=OWNER. Evidence: after login, Dashboard KPI
  "Баланс" is visible (OPS_DIRECTOR cannot see Баланс); Reports shows
  all 4 sections including DDS.
result: [pending]

### 10. 1C sync resilience (code-ready, ops-blocked)
expected: |
  ONEC_BASE_URL/USER/PASSWORD are absent from .env → Reports ДДС + Затраты
  компании show "Нет данных за выбранный период" (not a crash). Worker logs
  show outer-catch swallow of credential error. Code fix is verified via
  unit tests (per-record try/catch in onec-sync spec). Runtime sync activation
  pending operator action (provision credentials).
result: [pending]

## Summary

total: 10
passed: 1
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
