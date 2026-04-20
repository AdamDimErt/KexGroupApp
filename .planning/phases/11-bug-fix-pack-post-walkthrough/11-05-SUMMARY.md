---
phase: 11-bug-fix-pack-post-walkthrough
plan: "05"
subsystem: mobile-dashboard
tags: [wave-gap-closure, BUG-11-1, margin-root-cause, render-layer, unit-contract, formatters]
dependency_graph:
  requires:
    - "11-01 HARD GATE SQL verify REJECTING the kopeck hypothesis (commit f91ec68)"
    - "11-02/11-03/11-03b/11-04 prior waves closing BUG-11-2..8"
  provides:
    - "BUG-11-1 root cause identified empirically (H3 render-layer unit mismatch) and fixed"
    - "formatMargin and formatDelta single source of truth in utils/brand.ts"
    - "16 regression tests codifying the bug signature and fixed formatter contracts"
  affects:
    - "apps/mobile-dashboard/src/utils/brand.ts"
    - "apps/mobile-dashboard/src/utils/brand.test.ts"
    - "apps/mobile-dashboard/src/components/RestaurantCard.tsx"
tech_stack:
  added: []
  patterns:
    - "unit-contract enforcement via single-source formatters (percent values 0-100 never multiplied again at render time)"
    - "BUG SIGNATURE regression test (codifies inflated-input value 7048% so screen-level bug is traceable to formula vs input)"
    - "live API sample + triage doc + DECISION line as empirical gap-closure pattern"
key_files:
  created:
    - ".planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md"
    - ".planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md"
    - ".planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md"
  modified:
    - "apps/mobile-dashboard/src/utils/brand.ts"
    - "apps/mobile-dashboard/src/utils/brand.test.ts"
    - "apps/mobile-dashboard/src/components/RestaurantCard.tsx"
decisions:
  - "Task 2 DECISION: H3_CONFIRMED — render-layer unit contract mismatch (formatMargin and formatDelta applied *100 to values already in percentage units)"
  - "Fix applied to: apps/mobile-dashboard/src/components/RestaurantCard.tsx (via new formatters in utils/brand.ts)"
  - "H4 RULED OUT: API fr/rev ratio = 0.65-0.71 (tenge, not pre-multiplied). H1 RULED OUT: totalRevenue preserved in tenge. H2 RULED OUT: fr = revenue - expenses exactly. H5 RULED OUT: SQL already confirmed tenge storage in 11-01."
  - "Rule 1 deviation: user noted formatDelta had same double-multiply bug as formatMargin (live walkthrough showed -476.2% delta chip); extended scope from margin-only to both formatters — same root cause, one-commit fix covers both."
  - "KPICard.tsx:42-46 has identical buggy formatDelta but KPICard is not mounted anywhere on the Dashboard render path (DashboardScreen uses inline KPI blocks). Deferred as follow-up todo since fixing it would exceed plan's max 2-file guardrail."
metrics:
  duration: "~15 minutes (Task 1 start 12:52 → Task 5 approval 13:01)"
  completed_date: "2026-04-20"
  tasks_completed: 5
  tasks_total: 5
  files_created: 3
  files_modified: 3
  tests_added: 16
  tests_total_after: 46
---

# Phase 11 Plan 05: BUG-11-1 Margin Root Cause — Summary

**One-liner:** Identified and fixed the 7000% margin bug as a render-layer unit-contract mismatch (`formatMargin`/`formatDelta` applied `*100` to values already in percentage units) via empirical API-sample-first triage and one-file surgical fix.

## Investigation Path

1. **Task 1 — Live API sample captured** (commit 261d38a)
   - Authenticated via dev OTP bypass (phone +77074408018 → OWNER role)
   - Fetched `GET /api/finance/dashboard?periodType=today&dateFrom=2026-04-20&dateTo=2026-04-20`
   - Persisted full JSON + per-brand snapshot table to 11-05-API-SAMPLE.md
   - **Finding:** `fr/rev` ratio = 0.65-0.71 across all brands → API returns correct tenge values

2. **Task 2 — Triage HARD GATE** (commit f37b6a9)
   - Tested 5 hypotheses against the API data
   - Computed exact diagnostic ratios for each brand
   - **DECISION: H3_CONFIRMED** — render-layer unit-contract mismatch
   - H4/H1/H2/H5 all ruled out with numeric evidence
   - User approved via chat before Task 3 proceeded

3. **Task 3 — ONE targeted fix** (commit 97cab93)
   - Moved `formatMargin` and `formatDelta` from `RestaurantCard.tsx` (local buggy copies) to `utils/brand.ts` (new correct exports)
   - `formatMargin(v)`: `Math.round(v * 100)` → `Math.round(v)` (v is already percentage)
   - `formatDelta(v)`: `(v * 100).toFixed(1)` → `v.toFixed(1)` (v is already percentage)
   - `computeMarginPct` formula untouched as required by CONTEXT.md
   - No `/ 100` added in `useDashboard.ts` or `brand.ts`
   - Files changed: 2 (within plan's absolute max 2)

4. **Task 4 — Regression tests** (commit 2a15b2c)
   - 16 new tests in brand.test.ts `BUG-11-1 regression` describe block
   - Real-data margin range assertions for BNA and DNA (40-85%)
   - BUG SIGNATURE test captures `computeMarginPct(29.28M, 2.06B) ≈ 7048` — codifies that formula returns 7048 for inflated input (so future ~7000% regressions can be traced to "input was ×100 inflated", not "formula bug")
   - `formatMargin(70.48) === '70%'` (user's explicit acceptance criterion)
   - `formatDelta(-4.74) === '-4.7%'` (user's explicit acceptance criterion)
   - `formatDelta(0.5) === '+0.5%'` (user's explicit acceptance criterion)
   - End-to-end pipe test: `computePlanDelta → formatDelta` returns `-4.7%` for BNA
   - Total: 38/38 tests in brand.test.ts (22 existing + 16 new); full mobile suite 46/46 green

5. **Task 5 — Emulator walkthrough** (this commit)
   - User verified on Android emulator 2026-04-20 08:01
   - All 5 brand tiles show margins in 40-85% range
   - Delta chips now show small signed percentages (~-4.8%) instead of ~-476.2%
   - Ancillary pre-existing fixes still hold (5 tiles, 75 points header, correct brand colors)

## Before → After

| Brand | Before (screen) | After (screen) | Expected |
|-------|----------------:|---------------:|---------:|
| BNA (Burger na Abaya) |           7048% |            **70%** |   60-75% |
| DNA (Doner na Abaya)  |           6831% |            **68%** |   60-75% |
| JD (Just Doner)       |           6990% |            **70%** |   40-85% |
| SB (Salam Bro)        |           6822% |            **68%** |   40-85% |
| KEX (КексБрэндс)      |           6533% |            **65%** |   40-85% |

**Delta chip (bonus fix via Rule 1 deviation):**

| Before | After |
|-------:|------:|
| `-476.2%` | `-4.8%` (all 5 brands, showing `Ниже плана · -4.8%`) |

## Root Cause (One-Paragraph Explanation)

`computeMarginPct(revenue, financialResult)` returns `(financialResult / revenue) * 100` — a percentage value in units 0-100 (e.g., 70.48 for 70.48% margin). Similarly `computePlanDelta(revenue, plan)` returns `attainment - 100`, also in percentage units (e.g., -4.74 for -4.74%). Both values flow unchanged through `useDashboard` and are passed as `marginPct` and `deltaPct` props to `RestaurantCard`. Inside `RestaurantCard`, the local `formatMargin` and `formatDelta` helpers then applied an additional `* 100` — treating the incoming value as if it were a 0-1 decimal fraction. This double-multiplication produced `70.48 * 100 = 7048%` on the margin label and `-4.74 * 100 = -474.0%` on the delta chip (observed as `-476.2%` due to rounding and period drift). The fix relocates both formatters to `utils/brand.ts` with the unit contract documented in a comment: "marginPct and deltaPct are ALREADY in percentage units (0-100)". The formatters now apply only `Math.round(v)` (margin) and `v.toFixed(1)` (delta) — no hidden multiplication.

## Why This Is Important (Audit Trail)

This plan produced three artifacts (`11-05-API-SAMPLE.md`, `11-05-TRIAGE.md`, this SUMMARY.md) that codify an empirical, data-first triage pattern. Future "screen value looks wrong by exactly 100×" bugs should follow the same playbook:
1. Capture raw API JSON (source of truth)
2. Compute diagnostic ratios per brand
3. Check each hypothesis against numbers, not theory
4. Commit the DECISION line before any code edit
5. Apply ONE surgical fix in ONE file (max 2)
6. Codify bug signature AND fixed contract in regression tests

The previous plan (11-01) saved us from patching the wrong layer by applying the same HARD GATE pattern for the kopeck hypothesis. Plan 11-05 now closes the remaining gap for BUG-11-1 using the same discipline.

## Deviations from Plan

### Rule 1 — Auto-fix bugs

**1. [Rule 1 - Bug] Extended fix to formatDelta (same root cause as formatMargin)**
- **Found during:** Task 2 triage discussion with user
- **Issue:** During the DECISION checkpoint, user noted the Dashboard delta chip also showed absurd `-476.2%` values, same pattern. Code inspection confirmed `formatDelta` in `RestaurantCard.tsx` had identical `(v * 100).toFixed(1)` double-multiply — `deltaPct` comes from `computePlanDelta` (percentage units), not a 0-1 ratio.
- **Fix:** Moved both `formatMargin` AND `formatDelta` to `utils/brand.ts` with correct unit contract. Single commit, single logical fix (both formatters had the same bug).
- **Files modified:** Same 2 files as the original Task 3 scope — no extra files touched.
- **Commit:** 97cab93

### Out of scope (deferred)

**2. [Out of scope] KPICard.tsx has same buggy formatDelta**
- **Found during:** Task 3 grep for other formatDelta occurrences
- **Status:** `apps/mobile-dashboard/src/components/KPICard.tsx:42-46` has identical `(v * 100).toFixed(1)` pattern
- **Reason deferred:** `KPICard` is not used anywhere on the Dashboard (DashboardScreen uses inline KPI blocks at lines 152-187, not `KPICard`). Per plan guardrail "absolute max 2 files", a KPICard fix would exceed scope. This is a latent bug only if `KPICard` is wired back into a screen.
- **Follow-up:** Flag in `.planning/todos/pending/` or handle in next phase's cleanup plan. Acceptable to leave as-is until rendered.
- **Log location:** Also mentioned in 11-05-TRIAGE.md discussion and Task 5 checkpoint reply.

## Commits

| Step | Commit | Description |
|------|--------|-------------|
| 1    | 261d38a | Capture live Dashboard API sample (11-05-API-SAMPLE.md) |
| 2    | f37b6a9 | Triage DECISION — H3_CONFIRMED (11-05-TRIAGE.md) |
| 3    | 97cab93 | fix: moved formatMargin + formatDelta to brand.ts with correct unit contract |
| 4    | 2a15b2c | test: 16 new regression tests (38 total in brand.test.ts) |
| 5    | (this)  | docs: summary + ROADMAP + STATE update |

## Tests

- `apps/mobile-dashboard`: **46/46 passing** (was 30 before plan; +16 BUG-11-1 regression tests)
- `brand.test.ts` alone: **38/38 passing** (was 22; +16 new tests)
- `apps/finance-service`: not touched (no backend change required)
- `apps/mobile-dashboard npx tsc --noEmit`: exit 0

## Guardrails Verified

- Formula untouched: `grep -n "(financialResult / revenue) \* 100" apps/mobile-dashboard/src/utils/brand.ts` → still present at line 89
- No forbidden `/ 100`: `grep -n "/ 100" apps/mobile-dashboard/src/hooks/useDashboard.ts apps/mobile-dashboard/src/utils/brand.ts` → no matches
- Module boundary: only `apps/mobile-dashboard` touched — no finance-service/worker/auth changes
- Changed file count: 2 source + 1 test = 3 (within plan's max 2 source + spec allowance)

## Closing Note

Bug BUG-11-1 fully closed. The last remaining gap in 11-VERIFICATION.md (Truth #1 — "Margin for all brands shows ~68% (not 7000%)") is now resolvable. Future "screen value 100× inflated" regressions will be caught at CI time by the new BUG SIGNATURE regression tests.

Phase 11 is now complete (7/7 plans).

## Self-Check: PASSED

- [x] `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md` exists — commit 261d38a
- [x] `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md` exists with DECISION line — commit f37b6a9
- [x] `apps/mobile-dashboard/src/utils/brand.ts` modified (formatMargin + formatDelta added) — commit 97cab93
- [x] `apps/mobile-dashboard/src/components/RestaurantCard.tsx` modified (imports + removed buggy locals) — commit 97cab93
- [x] `apps/mobile-dashboard/src/utils/brand.test.ts` modified (16 new tests) — commit 2a15b2c
- [x] All tests pass: 46/46 mobile-dashboard, 38/38 brand.test.ts
- [x] TypeScript clean: `npx tsc --noEmit` exit 0
- [x] User approved via emulator walkthrough (BNA=70, DNA=68, JD=70, SB=68, KEX=65)
