---
phase: 11-bug-fix-pack-post-walkthrough
verified: 2026-04-20T00:00:00Z
status: gaps_found
score: 7/8 must-haves verified
gaps:
  - truth: "Margin for all brands shows ~68% (not 7000%)"
    status: failed
    reason: "SQL HARD GATE rejected the kopeck hypothesis. directExpenses/revenue ratios are 22-49% in tenge. The 7000% margin root cause is NOT a unit mismatch; a separate mechanism inflates the displayed margin. No code fix was implemented (task 3 was correctly gated and skipped). BUG-11-1 remains open."
    artifacts:
      - path: "apps/finance-service/src/dashboard/dashboard.service.ts"
        issue: "financialResult computed as revenue - directExpenses at lines 292, 311. No EXPENSE_UNIT_DIVISOR applied (correctly per REJECTED gate). Unknown separate cause for 7000% display value."
      - path: ".planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md"
        issue: "DECISION: REJECTED. Kopeck hypothesis disproved. Root cause TBD."
    missing:
      - "Separate investigation to identify the actual cause of 7000% margin display (possibly HQ Cost Allocation inflating financialResult, or a mobile-layer computation stacking the value)"
      - "Follow-up in Phase 11.1 or dedicated debug session comparing raw DB values against what mobile renders via API response inspection"
human_verification:
  - test: "Open Dashboard on Android emulator with OWNER role (OTP 111111 on +77074408018). Confirm badge codes on brand tiles."
    expected: "5 tiles visible (BNA, DNA, JD, SB, KEX). No 'Цех' tile. Each brand shows correct code in badge."
    why_human: "Requires running emulator + live API + real iiko data. Visual badge rendering cannot be grep-verified."
  - test: "On the same Dashboard screen, read the margin % shown on each brand tile."
    expected: "Each brand margin is approximately 60-70%, NOT 7000%. This will confirm or deny whether BUG-11-1 is actually fixed in practice or still manifesting."
    why_human: "The HARD GATE REJECTED the code fix but the actual visual result on a live device is the ground truth. Must verify that the margin is correct or still broken."
  - test: "Check the 'Точек' (restaurant count) KPI badge on the main Dashboard screen."
    expected: "Shows 13 or fewer (actual count of RESTAURANT-type active restaurants, not 84)."
    why_human: "Requires live DB data and running mobile app."
  - test: "Check the sync time label on Dashboard (e.g., 'Синхронизация: HH:MM'). Compare to current Almaty clock."
    expected: "Displayed time matches current Asia/Almaty time (UTC+5) within 10 minutes, regardless of emulator TZ setting."
    why_human: "Requires running emulator at a known wall-clock time. Cannot be verified by code inspection alone."
  - test: "Navigate to Аналитика tab as OWNER. Count visible report sections."
    expected: "4 sections visible: ДДС — Движение денег, Затраты компании, Цех, Тренды."
    why_human: "DDS section presence requires OWNER role JWT + live API. Role + UI rendering is visual."
  - test: "Check plan label on a brand tile (e.g., BNA). Expected BNA revenue 29.28M vs plan 30.74M (stub: revenue * 1.05)."
    expected: "Shows 'Ниже плана · -4.7%' in red (below threshold). NOT 'Выше плана · 0.0%'."
    why_human: "Plan delta calculation correctness requires visual confirmation with real revenue data from live API."
  - test: "After provisioning ONEC_BASE_URL/ONEC_USER/ONEC_PASSWORD in .env, trigger 1C sync and check Reports/Затраты компании."
    expected: "Company expenses section shows real data (not 'Нет данных'). SyncLog table has SUCCESS rows with source='ONE_C'."
    why_human: "BUG-11-8 code fix is complete but 1C credentials are missing from .env. Runtime verification requires operator to provision credentials and wait for cron cycle."
---

# Phase 11: Post-Walkthrough Bug-Fix Pack — Verification Report

**Phase Goal:** Починить 8 багов найденных live-walkthrough'ом Dashboard на эмуляторе 2026-04-20. Блокеры демо — неверная маржа (7000%), неправильные бейджы брендов, Kitchen в списке ресторанов.

**Verified:** 2026-04-20
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Margin for all brands ~68% (not 7000%) | FAILED | SQL HARD GATE rejected kopeck hypothesis (11-01-SQL-VERIFY.md: DECISION REJECTED). directExpenses/revenue = 22-49% in tenge. Task 3 correctly skipped. Root cause of 7000% display unresolved. |
| 2 | 5 brand tiles with correct badge codes (BNA/DNA/JD/SB/KEX), Kitchen hidden | VERIFIED | BRAND_MAP (9 entries, 6 codes) in brand.ts:16-26. BrandType filter type:'RESTAURANT' in dashboard.service.ts:203. Commits fa7048e (BRAND_MAP) + f91ec68 (RESTAURANT filter). |
| 3 | Restaurant count ≤ 13 (not 84) | VERIFIED | restaurant.groupBy with isActive:true filter in dashboard.service.ts:222-231. countMap.get(brand.id)??0 at line 294. Commit f91ec68. |
| 4 | Sync time shows Asia/Almaty HH:MM (not UTC offset) | VERIFIED | formatSyncTime using date-fns-tz toZonedTime+format with ALMATY_TZ constant in brand.ts:147-151. DashboardScreen.tsx imports and calls formatSyncTime (lines 12, 193). Commit 61314f7. |
| 5 | ReportsScreen shows DDS section for OWNER | VERIFIED | useReportDds imported (ReportsScreen.tsx:12). canSeeDds gate at line 36. DDS card rendered at lines 86-123. Commit 7f9ddb8. Dev bypass returns OWNER role via isDevBypassActive override in auth.service.ts:161-166. Commit 1a4d368. |
| 6 | Plan label shows "Ниже плана · -4.7%" for below-plan brands (not "Выше плана · 0.0%") | VERIFIED | computePlanDelta (brand.ts:110-116) returns signed delta. formatPlanLabel (brand.ts:122-135) with ±0.5% threshold. useDashboard computes planDelta from revenue+plannedRevenue instead of changePercent. Commit a2c53c0. |
| 7 | 1C sync resilience: bad record skipped, others continue | VERIFIED (code-complete, ops-blocked) | Per-record try/catch added to all 4 OneCyncService methods (lines 91, 217, 330, 478 in onec-sync.service.ts). Commit fc850fd. BLOCKED: ONEC_BASE_URL/ONEC_USER/ONEC_PASSWORD absent from .env — sync dormant. |
| 8 | Brand.type populated correctly on iiko org sync | VERIFIED | determineBrandType private method in iiko-sync.service.ts:1428. Called at line 182 before brand.upsert. Regex /цех|kitchen|fabrika/i matches migration SQL backfill. Commit a30b77d. |

**Score:** 7/8 truths verified (1 failed: BUG-11-1 root cause unresolved)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/mobile-dashboard/src/utils/brand.ts` | BRAND_MAP, computePlanDelta, formatPlanLabel, formatSyncTime | VERIFIED | All 4 exports present and substantive. BRAND_MAP has 9 entries. Functions are non-stub. |
| `apps/mobile-dashboard/src/theme/colors.ts` | 6 brand color tokens (bna, dna, jd, sb, kex, kitchen) | VERIFIED | brand object has all 6 entries at lines 116-147 in darkColors + lightColors (lines 332-338). WCAG AA comments present. |
| `apps/mobile-dashboard/src/screens/ReportsScreen.tsx` | DDS section gated to OWNER/FIN_DIR | VERIFIED | useReportDds imported (line 12), canSeeDds defined (line 36), DDS card at lines 86-123. |
| `apps/mobile-dashboard/src/screens/DashboardScreen.tsx` | formatSyncTime wired | VERIFIED | import at line 12, used at line 193 replacing toLocaleTimeString. |
| `apps/finance-service/src/dashboard/dashboard.service.ts` | type:'RESTAURANT' filter + groupBy restaurantCount | VERIFIED | type:'RESTAURANT' at lines 203 and 212. restaurant.groupBy at line 222. countMap.get at line 294. |
| `apps/auth-service/src/auth/auth.service.ts` | isDevBypassActive + OWNER override in verifyOtp | VERIFIED | isDevBypassActive at lines 41-44. OWNER override block at lines 161-166. DEV_BYPASS_CODE env var name fixed. |
| `apps/aggregator-worker/src/onec/onec-sync.service.ts` | Per-record try/catch in all 4 sync methods | VERIFIED | Inner catch blocks at lines 91, 136, 217, 249, 330, 349, 478, 499. bug_021 pattern with Sentry.withScope. |
| `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` | determineBrandType + Brand.type in upsert | VERIFIED | determineBrandType at line 1428. brandType passed to upsert at line 182. |
| `packages/database/schema.prisma` | BrandType enum + Brand.type field | VERIFIED | BrandType enum at lines 31-37 with @@schema("finance"). Brand.type BrandType @default(RESTAURANT) at line 187. |
| `packages/database/migrations/20260420000000_add_brand_type/migration.sql` | Migration SQL file | VERIFIED | File exists. Contains CREATE TYPE, ADD COLUMN with DEFAULT, UPDATE backfill with regex. Applied to live DB per plan 11-01. |
| `.env.example` | ONEC_BASE_URL, ONEC_USER, ONEC_PASSWORD documented | VERIFIED | Added in commit 956c453 (plan 11-00 Task 4). Canonical vars replace deprecated ONEC_REST_* aliases. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DashboardScreen.tsx` | `brand.ts:formatSyncTime` | import + call at line 193 | WIRED | Replaces `toLocaleTimeString` call |
| `ReportsScreen.tsx` | `useReports.ts:useReportDds` | import line 12 + hook call line 39 | WIRED | canSeeDds gate wired into activeSections + refetchAll |
| `useDashboard.ts` | `brand.ts:computePlanDelta + formatPlanLabel` | imported, computed per brand | WIRED | planLabel object passed to DashboardRestaurantItem |
| `RestaurantCard.tsx` | `colors.brand[code]` | dynamic lookup `colors.brand[brand.toLowerCase()]` | WIRED | Falls back to colors.brand.bna for unknown codes |
| `dashboard.service.ts` | `Brand.type filter` | `where: { type: 'RESTAURANT' }` | WIRED | Applied in both brand.findMany and restaurant.findMany |
| `dashboard.service.ts` | `restaurant.groupBy` | replaces `_count.restaurants` | WIRED | countMap built from groupBy result at lines 222-294 |
| `auth.service.ts` | `isDevBypassActive → OWNER override` | called inside verifyOtp after OTP match | WIRED | Only in non-production when phone+code match |
| `onec-sync.service.ts` | per-record catch | inner try/catch wrapping upsert in 4 methods | WIRED | All 4 methods: syncExpenses, syncKitchenPurchases, syncKitchenIncome, syncKitchenShipmentsByRestaurant |
| `iiko-sync.service.ts` | `determineBrandType → brand.upsert` | called at line 182, result in update+create | WIRED | Both update and create payloads include type field |
| `onec-sync.service.ts` | live 1C endpoint | `ONEC_BASE_URL` env var at line 63 | NOT_WIRED (ops blocked) | Credentials missing from .env; sync throws on first call but is caught by outer try/catch |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| BUG-11-1 | 11-01 | Fix 7000% margin unit mismatch | BLOCKED | HARD GATE REJECTED — kopeck hypothesis false; Task 3 skipped. Root cause requires separate investigation. |
| BUG-11-2 | 11-00, 11-02 | BRAND_MAP + 6 BrandCode values + 4 new brand color tokens | SATISFIED | BRAND_MAP in brand.ts:16-26; BrandCode type in brand.ts:8; 6 tokens in colors.ts:116-147. Tests: 22/22 green. |
| BUG-11-3 | 11-00, 11-01, 11-04 | BrandType enum + Brand.type field + KITCHEN filter in dashboard + worker upsert | SATISFIED | schema.prisma BrandType enum; migration SQL applied to live DB; type:'RESTAURANT' in dashboard.service.ts; determineBrandType in iiko-sync.service.ts. |
| BUG-11-4 | 11-00, 11-02 | computePlanDelta + formatPlanLabel + correct wiring in useDashboard | SATISFIED | computePlanDelta in brand.ts:110; formatPlanLabel in brand.ts:122; planLabel wired via useDashboard → RestaurantCard. 9 tests green. |
| BUG-11-5 | 11-01 | restaurant.groupBy filtered count replaces unfiltered _count | SATISFIED | restaurant.groupBy with isActive:true in dashboard.service.ts:222; 3 new tests green. |
| BUG-11-6 | 11-00, 11-02 | date-fns-tz formatSyncTime TZ-safe; DashboardScreen wired | SATISFIED | formatSyncTime in brand.ts:147; DashboardScreen.tsx line 193; 4 timezone tests green. |
| BUG-11-7 | 11-03, 11-03b | DDS section restored in ReportsScreen; dev bypass returns OWNER role | SATISFIED | DDS JSX in ReportsScreen.tsx:86-123; OWNER override in auth.service.ts:161-166; 3 new auth tests green. |
| BUG-11-8 | 11-00, 11-04 | per-record try/catch in OneCyncService; ONEC vars in .env.example | SATISFIED (code-complete) / BLOCKED (runtime) | try/catch in 4 methods; .env.example updated; 3 new spec tests green. ONEC credentials NOT in .env — sync dormant. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/aggregator-worker/src/onec/onec-sync.service.ts` | 63-72 | ONEC_BASE_URL check throws early — outer catch swallows it silently | Info | 1C sync will never run without credentials; already known and documented in plan 11-04. Not a code defect, an ops gap. |
| `apps/mobile-dashboard/src/screens/ReportsScreen.tsx` | 213 | `new Date(selected.date).toLocaleDateString('ru-RU', ...)` in Trends chart tooltip | Warning | Device-locale-dependent date formatting (same category as the BUG-11-6 issue already fixed for sync time). Not a blocker; out of scope for this phase per CONTEXT.md. |
| `.planning/ROADMAP.md` | 619-631 | Plans 11-02 through 11-04 and BUG items 11-2/4/6/7/8 still marked with `[ ]` (unchecked) | Info | ROADMAP.md checkbox state is stale — all 6 plans are complete per SUMMARY.md files and git commits. Does not affect code correctness. |

---

### Human Verification Required

#### 1. Margin percentage on Dashboard brand tiles

**Test:** Open Dashboard on Android emulator as OWNER (phone +77074408018, OTP 111111). Check the margin % displayed on each brand tile.

**Expected:** Each brand shows approximately 60-70% margin. No brand shows 7000%.

**Why human:** BUG-11-1 has NO code fix — the HARD GATE rejected the kopeck hypothesis. The actual display value from live data is the only way to know if the bug manifests differently than originally observed, or if a different prior commit fixed it incidentally.

#### 2. Brand badge codes on Dashboard tiles

**Test:** On the same Dashboard screen, read the badge codes on brand tiles.

**Expected:** 5 tiles visible with codes BNA, DNA, JD, SB, KEX. No Цех tile.

**Why human:** Requires live API returning iiko brand names → BRAND_MAP resolution is code-verified but the display result depends on real iiko data flowing through the stack.

#### 3. Restaurant count KPI

**Test:** Check the "Точек" badge on the main Dashboard screen header area.

**Expected:** Shows 13 or fewer (actual active RESTAURANT-type restaurants in DB).

**Why human:** Requires live DB with real data.

#### 4. Sync time in Asia/Almaty

**Test:** Note the current Almaty time. Check the "Синхронизация: HH:MM" label on Dashboard.

**Expected:** Displayed time matches current Almaty time ±10 min, regardless of emulator TZ setting.

**Why human:** Timezone independence is unit-tested, but the live render path with a real lastSyncAt value from the server needs visual confirmation.

#### 5. ReportsScreen 4 sections for OWNER

**Test:** Log in as OWNER, navigate to Аналитика tab. Count visible section headers.

**Expected:** 4 sections: ДДС — Движение денег, Затраты компании, Цех, Тренды.

**Why human:** Role gating + JSX conditional rendering needs to be confirmed with live OWNER JWT and real API data.

#### 6. Plan label coloring on brand tiles

**Test:** On Dashboard, find a brand tile (e.g., BNA with revenue ~29.28M vs plan ~30.74M stub).

**Expected:** Shows "Ниже плана · -4.7%" in red, NOT "Выше плана · 0.0%".

**Why human:** The formula and coloring are unit-tested, but the end-to-end path through the API DTO → hook → component with real revenue values needs visual confirmation.

#### 7. 1C sync activation (ops action required)

**Test:** Operator provisions ONEC_BASE_URL, ONEC_USER, ONEC_PASSWORD in `.env`. Restart aggregator-worker. Wait for hourly cron or trigger manually. Check Reports/Затраты компании and SyncLog table.

**Expected:** Company Expenses section shows real data. SyncLog has rows with source='ONE_C' and status='SUCCESS'.

**Why human:** Code fix complete, but runtime cannot be verified without credentials. This is an operator action, not a code gap.

---

### Gaps Summary

**1 code gap — BUG-11-1 (7000% margin):**

The HARD GATE behaved correctly: SQL verification proved that `directExpenses` is stored in tenge (ratios 22-49%), not kopecks (which would produce ~70x inflation). The kopeck-divisor fix was correctly not implemented. However, the 7000% margin is still an unsolved problem — the root cause lies elsewhere. Candidate hypotheses include: (a) the mobile hook receiving financialResult from a different field that contains an already-wrong value; (b) Cost Allocation Engine distributing HQ expenses and the total allocated expense exceeding revenue; (c) a different DTO field being used for the calculation in the mobile layer. This requires a fresh investigation in Phase 11.1 or a dedicated debug session comparing: API response JSON vs what useDashboard maps to computeMarginPct arguments.

**1 ops gap — BUG-11-8 (1C sync dormant):**

The code fix is complete and tested (per-record try/catch in all 4 sync methods). The .env.example now documents the canonical variable names. However, `ONEC_BASE_URL`, `ONEC_USER`, and `ONEC_PASSWORD` are absent from the actual `.env` file. The 1C sync will remain dormant (returning ₸0 data for company expenses and kitchen sections) until an operator provisions these credentials. This is not a code defect — it is an operations/infrastructure gap.

---

_Verified: 2026-04-20_
_Verifier: Claude (gsd-verifier)_
