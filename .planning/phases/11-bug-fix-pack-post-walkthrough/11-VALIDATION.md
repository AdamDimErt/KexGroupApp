---
phase: 11
slug: bug-fix-pack-post-walkthrough
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
revised: 2026-04-20 (per checker feedback — added 11-03b split + 11-01 HARD GATE checkpoint)
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `11-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest (strict mode) |
| **Config file** | `apps/mobile-dashboard/package.json` jest section (rootDir: src, testRegex: `.*\.test\.ts$`) + same for finance-service, auth-service, aggregator-worker |
| **Quick run command** | `cd apps/{affected-app} && npm test` |
| **Full suite command** | `cd apps/mobile-dashboard && npm test && cd ../finance-service && npm test && cd ../auth-service && npm test && cd ../aggregator-worker && npm test` |
| **Estimated runtime** | ~60 seconds (all 4 apps combined) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/{affected-app} && npm test` (~10-20 sec)
- **After every plan wave:** Run full suite across all 4 apps (~60 sec)
- **Before `/gsd:verify-work`:** Full suite must be green + manual emulator walkthrough
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Bug ID | Test Type | Automated Command | File Exists | Status |
|---------|------|------|--------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | BUG-11-1 | SQL HARD GATE | `test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md && grep -qE "DECISION:\s+(CONFIRMED\|REJECTED\|INCONCLUSIVE\|NO DATA\|DB UNAVAILABLE)" 11-01-SQL-VERIFY.md` | N/A (runtime verify, scratchpad written) | ⬜ pending |
| 11-01-02 | 01 | 1 | BUG-11-3, BUG-11-5 | unit | `cd apps/finance-service && npm test -- --testPathPattern=dashboard` | ✅ existing | ⬜ pending |
| 11-01-03 | 01 | 1 | BUG-11-1 (GATED by 11-01-01 CONFIRMED) | unit | `cd apps/finance-service && npm test -- --testPathPattern=dashboard` (margin in [60,80]) | ✅ existing | ⬜ pending |
| 11-02-06b | 02 | 2 | BUG-11-6 (mobile) | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` (covers `formatSyncTime` with date-fns-tz) | ❌ Wave 0 | ⬜ pending |
| 11-02-01 | 02 | 2 | BUG-11-6 | install | `cd apps/mobile-dashboard && npm install date-fns date-fns-tz` + `npm ls date-fns-tz` | ❌ Wave 0 | ⬜ pending |
| 11-02-02 | 02 | 2 | BUG-11-2 | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` | ❌ Wave 0 | ⬜ pending |
| 11-02-03 | 02 | 2 | BUG-11-2 | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=colors` | ❌ Wave 0 | ⬜ pending |
| 11-02-04 | 02 | 2 | BUG-11-4 | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` | ❌ Wave 0 | ⬜ pending |
| 11-02-05 | 02 | 2 | BUG-11-4 | tsc | `cd apps/mobile-dashboard && npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 11-02-06 | 02 | 2 | BUG-11-6 | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` | ❌ Wave 0 | ⬜ pending |
| 11-03-01 | 03 | 2 | BUG-11-7 (mobile half) | tsc + manual | `cd apps/mobile-dashboard && npx tsc --noEmit && grep -q 'useReportDds' apps/mobile-dashboard/src/screens/ReportsScreen.tsx` + emulator visual check (4 sections for OWNER) | ✅ existing + manual | ⬜ pending |
| 11-03b-01 | 03b | 2 | BUG-11-7 (auth half) | unit | `cd apps/auth-service && npm test -- --testPathPattern=auth` (confirms dev bypass returns OWNER role) | ✅ existing | ⬜ pending |
| 11-04-01 | 04 | 3 | BUG-11-8 | env check (human checkpoint) | manual `approved` / `missing-credentials` reply | N/A (manual) | ⬜ pending |
| 11-04-02 | 04 | 3 | BUG-11-8 | unit | `cd apps/aggregator-worker && npm test -- --testPathPattern=onec` | ❌ Wave 0 | ⬜ pending |
| 11-04-03 | 04 | 3 | BUG-11-3 (worker half) | unit | `cd apps/aggregator-worker && npm test -- --testPathPattern=iiko-sync` | ✅ existing | ⬜ pending |
| 11-04-04 | 04 | 3 | BUG-11-8 | runtime (human checkpoint) | manual trigger: `curl POST localhost:3004/internal/sync/onec` then check `SyncLog` rows | N/A runtime | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Changes in this revision:**
- `11-01-01` repurposed: now a HARD GATE checkpoint producing `11-01-SQL-VERIFY.md` with DECISION line. Gates 11-01-03 (BUG-11-1 divisor).
- `11-01-02` merged the old 11-01-03/04/05 rows (all same test command: `testPathPattern=dashboard`) — BUG-11-3 + BUG-11-5 fixed in one task.
- `11-01-03` was previously 11-01-02; now explicitly gated by CONFIRMED decision from 11-01-01.
- Removed stale `11-01-06` / `11-02-07` (BUG-11-6 backend + BUG-11-7 mobile-in-plan-02 — no longer mapped that way).
- Added `11-03b-01` (new plan — auth-agent owns the dev-bypass OWNER role fix; carved out of 11-03 for module boundary).
- `11-03-01` now narrowly covers mobile DDS restore only (auth-service work moved to 11-03b).
- Renamed worker-plan task IDs `11-03-*` → `11-04-*` to match actual plan filenames (11-04-worker-onec-PLAN.md).

---

## Wave 0 Requirements

Wave 0 tasks MUST complete before Wave 1-3 tasks that depend on them.

- [ ] `apps/mobile-dashboard/src/utils/brand.test.ts` — new test file, covers BUG-11-2 (BRAND_MAP resolution for all 6 brands), BUG-11-4 (`computePlanDelta`, `formatPlanLabel`), BUG-11-6 (`formatSyncTime` timezone-safe)
- [ ] `packages/database/migrations/20260420000000_add_brand_type/migration.sql` — new migration file, creates `BrandType` enum + adds `type BrandType @default('RESTAURANT')` to `finance.Brand` + backfill UPDATE for existing `Цех|Kitchen` rows → `type='KITCHEN'`
- [ ] `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` — add describe block for `syncExpenses` with per-record try/catch (tests: bad record throws → skip logs warning → good records continue)
- [ ] Install dependencies: `cd apps/mobile-dashboard && npm install date-fns@^3 date-fns-tz@^3` — BUG-11-6 prerequisite, use v3 API (`toZonedTime`, not legacy `utcToZonedTime`)
- [ ] `.env.example` — add `ONEC_BASE_URL=`, `ONEC_USER=`, `ONEC_PASSWORD=` as required (no default values)

---

## Manual-Only Verifications

| Behavior | Bug | Why Manual | Test Instructions |
|----------|-----|------------|-------------------|
| Dashboard shows ≤ 13 brand tiles, no "Цех", 5 different badge codes (BNA/DNA/JD/SB/KEX) | BUG-11-2, BUG-11-3, BUG-11-5 | Visual integration — requires running emulator + live API + real data | 1) Start services, 2) `adb exec-out screencap -p > before.png` 3) Apply fixes 4) Relaunch mobile `adb shell input keyevent 82` → Reload 5) `screencap -p > after.png` 6) Verify visually |
| Маржа for each brand ≈ 68% (not 7000%) | BUG-11-1 | Requires live data check after DTO normalization + SQL-verified divisor | Same as above; numeric value on each RestaurantCard should match `(revenue - expenses) / revenue × 100`; confirm 11-01-SQL-VERIFY.md DECISION is CONFIRMED |
| Sync time shows current Almaty time HH:MM (not +1h shift) | BUG-11-6 | Requires live sync + real clock | Check Dashboard lastSyncAt label matches `adb shell date '+%H:%M'` ± 10 min |
| ReportsScreen shows 4 sections for OWNER (DDS + Company + Kitchen + Trends) | BUG-11-7 (mobile half — 11-03) | Role-based UI, requires OWNER-role login | Log in with dev bypass OTP `111111` on `+77074408018`, navigate to Аналитика tab, count section headers |
| Dev bypass returns OWNER JWT | BUG-11-7 (auth half — 11-03b) | Role stored in JWT payload, verify via React DevTools or decoded token | After login with `+77074408018` + code `111111`, inspect auth state → `role === 'OWNER'` |
| Plan label shows "Ниже плана · -4.7%" (red) for BNA | BUG-11-4 | Color + text rendering | Visual check on each RestaurantCard |
| Reports секция "Затраты компании" has data (not "Нет данных") | BUG-11-8 | Requires 1C sync running + credentials | Wait 1 hour after env fix for cron; check `SyncLog` table `WHERE source='ONE_C' AND status='SUCCESS'` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies or explicit human checkpoint
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`brand.test.ts`, migration SQL, onec spec, date-fns deps, .env.example)
- [ ] No watch-mode flags in test commands
- [ ] Feedback latency < 60s per task, < 90s per wave
- [ ] Task IDs in per-task map align with actual plan filenames (11-01, 11-02, 11-03, 11-03b, 11-04)
- [ ] Module boundaries respected: 11-03 touches only mobile; 11-03b touches only auth-service
- [ ] `nyquist_compliant: true` set in frontmatter (after sign-off)

**Approval:** pending (revision 1 applied)
