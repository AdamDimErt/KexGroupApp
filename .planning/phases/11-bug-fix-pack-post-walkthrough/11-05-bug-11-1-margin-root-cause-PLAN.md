---
phase: 11-bug-fix-pack-post-walkthrough
plan: "05"
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: false
requirements: [BUG-11-1]
gap_closure: true

must_haves:
  truths:
    - "Dashboard summary API JSON sample persisted at 11-05-API-SAMPLE.md showing raw brands[].revenue and brands[].financialResult for every active brand"
    - "Hypothesis triage scratchpad (11-05-TRIAGE.md) contains a single DECISION line naming which hypothesis (H3/H4/H1/H2/H5) matches the data"
    - "Exactly ONE targeted code fix is applied — not a speculative divide-by-100 and not a blind revert"
    - "New unit test in brand.test.ts asserts that for real-data inputs, computeMarginPct returns a value in 40..85 range for BNA"
    - "Emulator walkthrough screenshot (or transcribed values) shows ~60–80% margin on every brand tile, not 6500–7100%"
  artifacts:
    - path: ".planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md"
      provides: "Raw dashboard summary JSON response from a running finance-service — the source of truth for triage"
      contains: "brands[].revenue, brands[].financialResult, totalRevenue, financialResult (top-level)"
    - path: ".planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md"
      provides: "Hypothesis ranking with numeric evidence and final DECISION line naming the chosen hypothesis"
      contains: "DECISION: H"
    - path: "apps/mobile-dashboard/src/utils/brand.test.ts"
      provides: "Regression test covering real-data margin ratio"
      contains: "computeMarginPct"
    - path: ".planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md"
      provides: "Post-execution record — which file was patched, why, and live screen values"
      contains: "DECISION, Before, After"
  key_links:
    - from: "apps/mobile-dashboard/src/hooks/useDashboard.ts"
      to: "apps/mobile-dashboard/src/utils/brand.ts:computeMarginPct"
      via: "computeMarginPct(brand.revenue, brand.financialResult) call at line 75"
      pattern: "computeMarginPct\\(brand\\.revenue,\\s*brand\\.financialResult\\)"
    - from: "apps/finance-service/src/dashboard/dashboard.service.ts"
      to: "DashboardSummaryDto.brands[].financialResult"
      via: "financialResult: brandRevenue - brandExpenses at line 292"
      pattern: "financialResult:\\s*brandRevenue\\s*-\\s*brandExpenses"
    - from: "mobile UI (brand tile)"
      to: "computed marginPct"
      via: "useDashboard returns marginPct → RestaurantCard renders in tile"
      pattern: "marginPct"
---

<objective>
Identify the EXACT root cause of the 7000% margin bug on Dashboard (BUG-11-1) using an empirical, data-first investigation, then apply ONE targeted code fix and verify it end-to-end on the Android emulator.

**Context (WHY this is a gap-closure, not regular plan):**

Phase 11 plan 11-01 Task 1 ran a HARD GATE SQL query to verify the kopeck hypothesis. Raw data showed `directExpenses / revenue` ratios of 22–49% across 10,326 FinancialSnapshot rows — these are normal tenge expense ratios, NOT kopecks. The hypothesis was REJECTED; Task 3 (EXPENSE_UNIT_DIVISOR) was correctly skipped.

Yet as of live walkthrough 2026-04-20 03:22, the Dashboard still shows:
- BNA: revenue ₸29.28M, Маржа **7048%**
- DNA: revenue ₸42.83M, Маржа **6831%**
- JD: revenue ₸2.01M, Маржа **6990%**
- SB: revenue ₸20.54M, Маржа **6822%**
- KEX: revenue ₸0.288M, Маржа **6533%**

The margins cluster at 6500–7050% — exactly ~100× the expected ~65–70%. **The 100× factor must be injected somewhere between the DB query and the mobile render.** SQL verified DB storage is correct, `computeMarginPct` formula is mathematically correct, so the bug lives in one of:
- DTO serialization layer (double-multiplication)
- A hidden allocation accumulator that blows up `financialResult`
- Field name mismatch between DTO and hook consumer (hook reads wrong field)
- A pre-multiplication in the service layer that inflates `financialResult` by 100

**This plan is investigation-heavy, fix-light.** No speculative patches. Hard-gate each task on concrete evidence.

Purpose:
- Close BUG-11-1 (only remaining gap per 11-VERIFICATION.md)
- Produce a data-grounded decision artifact so future regressions can be triaged the same way
- Apply one surgical fix and prove it on-device

Output:
- `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md` — raw JSON from the live dashboard API
- `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md` — hypothesis analysis with DECISION line
- One patched file (determined by Task 2 triage — could be `useDashboard.ts`, `dashboard.service.ts`, or a DTO file)
- New test case in `apps/mobile-dashboard/src/utils/brand.test.ts` using real values
- `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md`
</objective>

<execution_context>
@D:/kexgroupapp/.claude/get-shit-done/workflows/execute-plan.md
@D:/kexgroupapp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-VERIFICATION.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SUMMARY.md

# Source files that will inform triage (executor must read before Task 2)
@apps/mobile-dashboard/src/utils/brand.ts
@apps/mobile-dashboard/src/hooks/useDashboard.ts
@apps/mobile-dashboard/src/hooks/useBrandDetail.ts
@apps/finance-service/src/dashboard/dashboard.service.ts
@apps/finance-service/src/dashboard/dto/summary.dto.ts
@CLAUDE.md

<interfaces>
<!-- Key contracts the executor MUST use. Do NOT re-derive from codebase. -->

From apps/finance-service/src/dashboard/dto/summary.dto.ts (lines 10–34):
```typescript
export class BrandIndicatorDto {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  expenses: number;
  financialResult: number;  // = revenue - expenses (computed in service)
  changePercent: number;    // always 0 — TODO per Phase 12
  restaurantCount: number;
}

export class DashboardSummaryDto {
  tenantId: string;
  period: { type: string; from: string; to: string };
  totalRevenue: number;
  totalExpenses: number;
  financialResult: number;  // top-level = totalRevenue - totalExpenses
  brands: BrandIndicatorDto[];
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | null;
}
```

From apps/mobile-dashboard/src/utils/brand.ts (lines 81–90):
```typescript
/** Margin percentage: financialResult / revenue × 100. Returns null if revenue <= 0. */
export function computeMarginPct(revenue: number, financialResult: number): number | null {
  if (!revenue || revenue <= 0) return null;
  return (financialResult / revenue) * 100;
}
```

From apps/mobile-dashboard/src/hooks/useDashboard.ts (line 75):
```typescript
marginPct: computeMarginPct(brand.revenue, brand.financialResult),
```

From apps/finance-service/src/dashboard/dashboard.service.ts (line 292):
```typescript
financialResult: brandRevenue - brandExpenses,
```

**Observed screen values (2026-04-20 03:22):**
- BNA: revenue 29.28M tenge, marginPct = 7048 (should be ~60–70)
- Expected for BNA: if financialResult = revenue × 0.704 ≈ 20.6M, then marginPct ≈ 70. Instead we see 7048.
- Ratio of observed/expected ≈ 100 exactly. Root cause injects a ×100 somewhere.
</interfaces>

<hypotheses>
<!-- Executor MUST test these in the recommended order. Evidence lives in 11-05-API-SAMPLE.md + 11-05-TRIAGE.md. -->

**H3 — Field name mismatch (CHEAPEST)**
Mobile hook reads `brand.financialResult` but API returns a differently-named field, or reads the right field but it IS already a percentage (not absolute tenge). If API returns e.g. `netMarginPct: 70.48` and hook ALSO re-multiplies by `/ revenue × 100`, result = ~100× inflation.
- Evidence: field-presence in API JSON + DTO declaration cross-check.

**H4 — Pre-multiplied value (SECOND CHEAPEST)**
DTO pre-multiplies `financialResult` by some factor (e.g., ×100 to make it "centi-tenge" for decimal rounding). Then `computeMarginPct(revenue, revenue × 0.70 × 100) = (0.70 × 100) = 70.48 × 100 = 7048`. This reproduces the exact observed pattern.
- Evidence: compare `financialResult / revenue` in API JSON against screen `marginPct / 100`.

**H1 — Decimal.toNumber() inflation**
Prisma `Decimal(15,2)` converted via `toNumber()` or `toString()` returning cents-as-int. Raw SQL `::float8` cast (used in dashboard.service.ts line 242) may interact with client-side Decimal conversion.
- Evidence: check if `totalRevenue` in API matches on-screen revenue (29.28M). If yes, H1 is localized to financialResult path only.

**H2 — Cost Allocation double-count**
`financialResult = revenue - directExpenses` in service line 292 SHOULD produce tenge. But if SOMEWHERE an `allocatedExpense` is subtracted as a negative integer (which becomes addition), financialResult could inflate. Less likely given the observed 100× pattern (H4 fits cleaner).
- Evidence: check CostAllocation table per brand sum, cross-ref vs displayed value.

**H5 — Revenue unit differs from financialResult unit**
Revenue in tenge, financialResult stored/returned in (revenue × something) units. Similar to H4 but sourced upstream from the aggregator-worker instead of the service. Least likely because SQL VERIFY showed directExpenses is tenge.
- Evidence: compare `brands[0].expenses` to `brands[0].financialResult + brands[0].expenses` — if it equals revenue, H5 excluded.

**Evaluation rule:** Whichever hypothesis produces an exact 100× ratio wins. Record the ratio in 11-05-TRIAGE.md as numeric evidence.
</hypotheses>

</context>

<tasks>

<task type="auto">
  <name>Task 1: Capture live Dashboard API response (source of truth)</name>
  <files>
    .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md
  </files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § BUG-11-1
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § BUG-11-1
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-VERIFICATION.md (gap details for BUG-11-1)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md (the REJECTED decision)
    - apps/mobile-dashboard/src/services/api.ts (lines 141–146 — endpoint path)
    - apps/finance-service/src/dashboard/dashboard.controller.ts (endpoint signature)
    - .env.example (DEV_BYPASS_PHONES, DEV_BYPASS_CODE)
  </read_first>
  <action>
    **Goal:** Obtain the raw JSON returned by `GET /api/finance/dashboard?periodType=today&dateFrom=...&dateTo=...` for today, so that every downstream hypothesis can be tested against ACTUAL bytes (not inferred behavior).

    Steps:

    1. **Verify services running.** Check that api-gateway (port 3000) and finance-service (port 3002) and auth-service (port 3001) are reachable:
       ```bash
       curl -s http://localhost:3000/api/health || echo "GATEWAY DOWN"
       curl -s http://localhost:3001/health || echo "AUTH DOWN"
       curl -s http://localhost:3002/health || echo "FINANCE DOWN"
       ```
       If any is DOWN — STOP and report back; do NOT invent data. The user must start services before this task can proceed.

    2. **Authenticate via dev OTP bypass.** Send OTP and verify (the dev bypass code is in `.env` — read it and the phone from `DEV_BYPASS_PHONES` + `DEV_BYPASS_CODE`):
       ```bash
       # Send OTP
       curl -s -X POST http://localhost:3000/api/auth/send-otp \
         -H 'Content-Type: application/json' \
         -d '{"phone":"+77074408018"}'

       # Verify OTP (bypass code typically 111111 in dev)
       TOKEN_JSON=$(curl -s -X POST http://localhost:3000/api/auth/verify-otp \
         -H 'Content-Type: application/json' \
         -d '{"phone":"+77074408018","code":"111111"}')
       echo "$TOKEN_JSON"
       ACCESS_TOKEN=$(echo "$TOKEN_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).accessToken))")
       echo "Token length: ${#ACCESS_TOKEN}"
       ```
       Expected: token length > 100 chars. If auth fails — STOP, document the auth error in 11-05-API-SAMPLE.md § Blockers, and escalate. Do NOT proceed with fabricated data.

    3. **Fetch dashboard summary.** Use today's date (Asia/Almaty):
       ```bash
       TODAY=$(TZ=Asia/Almaty date +%Y-%m-%d)
       RESPONSE=$(curl -s "http://localhost:3000/api/finance/dashboard?periodType=today&dateFrom=$TODAY&dateTo=$TODAY" \
         -H "Authorization: Bearer $ACCESS_TOKEN")
       echo "$RESPONSE" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s),null,2)))"
       ```

    4. **Persist to 11-05-API-SAMPLE.md.** Write a structured doc:
       ```markdown
       # 11-05 API SAMPLE — Dashboard Summary Raw JSON

       **Captured:** YYYY-MM-DD HH:mm Asia/Almaty
       **Endpoint:** GET /api/finance/dashboard?periodType=today&dateFrom=...&dateTo=...
       **Auth:** Dev OTP bypass (phone +77074408018, code 111111, role OWNER)

       ## Response status
       HTTP 200 OK

       ## Raw JSON
       ```json
       (pasted formatted JSON here)
       ```

       ## Extracted per-brand snapshot

       | Brand name | brands[].revenue | brands[].expenses | brands[].financialResult | ratio (fr/rev) | expected marginPct | observed marginPct on screen |
       |------------|-----------------:|-----------------:|-------------------------:|---------------:|-------------------:|-----------------------------:|
       | ...        |              ... |              ... |                      ... |            ... |                ... |                          ... |

       ## Top-level values
       - `totalRevenue`: ...
       - `totalExpenses`: ...
       - `financialResult`: ...

       ## Observations
       - (Executor: note here whether `financialResult` = `revenue - expenses` arithmetically, or whether it is off by an obvious factor)
       - (Note field names present vs BrandIndicatorDto declaration — any unexpected extra fields?)

       ## Blockers (if any)
       - (Only fill in if services are down or auth fails)
       ```

       The "observed marginPct on screen" column can be filled from 11-VERIFICATION.md human_verification entries (BNA ~7048, DNA ~6831, etc.) as a reference — no emulator run needed at THIS task.

    5. Commit this artifact:
       ```bash
       node "D:/kexgroupapp/.claude/get-shit-done/bin/gsd-tools.cjs" commit "chore(11-05): capture live dashboard API sample for BUG-11-1 triage" --files .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md
       ```
  </action>
  <verify>
    <automated>
      test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md \
        && grep -q "Raw JSON" .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md \
        && grep -q "brands\[\]\.financialResult" .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md \
        && echo OK
    </automated>
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md` exists
    - File contains a fenced ```json block with a top-level object having `brands` array
    - File has a per-brand table with at least 4 rows (one per active RESTAURANT-type brand present in DB)
    - If services were unreachable: file contains § Blockers with exact curl output and the task is marked failed — do NOT proceed to Task 2
  </acceptance_criteria>
  <done>Source-of-truth JSON is persisted and committed. No guessing in downstream tasks.</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 2: Hypothesis triage — HARD GATE DECISION</name>
  <files>
    .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md
  </files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md (output of Task 1 — REQUIRED)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md <specifics> (BUG-11-1 numeric hypothesis)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § Pitfalls 4 (changePercent always 0)
    - apps/finance-service/src/dashboard/dashboard.service.ts (lines 236–296 — revenue aggregation + financialResult computation)
    - apps/finance-service/src/dashboard/dto/summary.dto.ts (BrandIndicatorDto declaration)
    - apps/mobile-dashboard/src/hooks/useDashboard.ts (line 62–92 — brand mapping + computeMarginPct call)
    - apps/mobile-dashboard/src/utils/brand.ts (lines 81–90 — computeMarginPct formula)
    - apps/mobile-dashboard/src/types/index.ts (BrandIndicatorDto type on mobile side)
  </read_first>
  <action>
    **Goal:** With empirical JSON in hand (from Task 1), test each hypothesis against the data and record ONE DECISION. No code edits in this task. This is a HARD GATE checkpoint — Task 3 will NOT run until a DECISION line is committed here.

    Procedure:

    1. **Compute the diagnostic ratios** for each brand in the API JSON and tabulate in 11-05-TRIAGE.md:
       | Brand | rev_api | fr_api | fr/rev | fr/(rev×100) | expected_margin (screen/100) | matches hypothesis |
       |-------|--------:|-------:|-------:|-------------:|-----------------------------:|--------------------|

       - If `fr/rev` ≈ 0.65–0.75 (tenge) → API returns CORRECT value. Bug is in mobile layer (probably H3 or computeMarginPct is being called twice).
       - If `fr/rev` ≈ 65–75 (pre-multiplied by 100) → API returns INFLATED value. Bug is in service/DTO layer (H4 or H1).
       - If `fr/rev` is neither — investigate H2 (allocation double-count) or H5.

    2. **H3 check (field name):**
       - Open `apps/mobile-dashboard/src/types/index.ts` and confirm the mobile `BrandIndicatorDto` declares `financialResult: number`.
       - In the API JSON, confirm `brands[0].financialResult` exists as a numeric field (not `financial_result`, not `netResult`, not `profit`). Extract the JSON block from 11-05-API-SAMPLE.md to a temp file and inspect the keys (e.g., `jq 'keys' temp.json` or `node -e "console.log(Object.keys(require('./temp.json').brands[0]))"`).
       - If the field name matches exactly AND the value is tenge-magnitude — H3 RULED OUT.
       - If mismatch — H3 CONFIRMED.

    3. **H4 check (pre-multiplied):**
       - Take `brands[0].revenue` × 0.7 (rough expected margin) — does the resulting number ≈ `brands[0].financialResult / 100`?
       - Formally: if `abs((rev - exp) - fr) < 0.01 × rev`, then fr is the direct subtraction (tenge). Otherwise if `abs((rev - exp) × 100 - fr) < 0.01 × rev × 100`, then fr is pre-multiplied.

    4. **H1 check (Decimal.toNumber):**
       - Check if `totalRevenue` in API equals the screen value 99.3M. If YES (tenge preserved for revenue) but financialResult is off — narrow to financialResult path specifically.

    5. **H2 check (allocation):**
       - Inspect `expenses` vs `directExpenses`. If `expenses` in API = directExpenses, allocation not subtracted → expected behavior. If expenses >> directExpenses in DB → allocation IS folded in → not the cause of inflation (would reduce, not inflate).

    6. **Write DECISION.** Append to 11-05-TRIAGE.md at the end:
       ```
       DECISION: H<N>_CONFIRMED
       FIX_TARGET: <absolute_file_path>
       FIX_DESCRIPTION: <1-2 sentences describing the patch>
       ```
       Valid decision values:
       - `H3_CONFIRMED` (field rename / type mismatch) → FIX_TARGET = mobile hook or mobile types
       - `H4_CONFIRMED` (pre-multiplied in service) → FIX_TARGET = dashboard.service.ts or a DTO transformer
       - `H1_CONFIRMED` (Decimal conversion) → FIX_TARGET = dashboard.service.ts (toNumber helper)
       - `H2_CONFIRMED` (allocation double-count) → FIX_TARGET = dashboard.service.ts allocation integration
       - `H5_CONFIRMED` (worker stores inflated value) → STOP — escalate: this is out of scope (worker change would need its own plan)
       - `NONE_MATCH` → STOP — escalate to user with full evidence

    7. **Present to user for confirmation.** Output the decision and wait for approval. If the user disagrees, do NOT proceed to Task 3 with a different hypothesis silently — update the DECISION line first.

    Commit the triage doc:
    ```bash
    node "D:/kexgroupapp/.claude/get-shit-done/bin/gsd-tools.cjs" commit "chore(11-05): BUG-11-1 triage DECISION" --files .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md
    ```

    **Decision question for user:** Which hypothesis (H1/H2/H3/H4/H5) is CONFIRMED as the root cause of the 7000% margin, based on the numeric evidence in 11-05-API-SAMPLE.md?

    **Resume signal:** Reply with `DECISION: H<N>_CONFIRMED` (one of H1/H2/H3/H4/H5) OR `DECISION: NONE_MATCH`. On H5_CONFIRMED or NONE_MATCH, the plan pauses and escalates.
  </action>
  <verify>
    <automated>
      test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md \
        && grep -cE "^DECISION: (H[1-5]_CONFIRMED|NONE_MATCH)$" .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md | grep -q "^1$" \
        && echo OK
    </automated>
  </verify>
  <context>
    This gate exists because the previous plan (11-01) applied a HARD GATE correctly and saved us from implementing a wrong fix. We repeat the pattern: no code changes until a DECISION line names one hypothesis with numeric backing.
  </context>
  <options>
    <option id="h3">
      <name>H3_CONFIRMED — field name / type mismatch on mobile</name>
      <pros>Cheapest fix. Localized to one file. Low regression risk.</pros>
      <cons>If wrong, the bug recurs as soon as DTO changes.</cons>
    </option>
    <option id="h4">
      <name>H4_CONFIRMED — value pre-multiplied in service/DTO</name>
      <pros>Exact match for the observed ×100 pattern. Backend fix per CONTEXT.md locked decision.</pros>
      <cons>Requires retest of all downstream consumers of financialResult (RestaurantDetailDto, revenue-aggregated, etc.).</cons>
    </option>
    <option id="h1">
      <name>H1_CONFIRMED — Decimal conversion bug</name>
      <pros>Explains a precise 100× if Decimal.toNumber returns cents-as-int.</pros>
      <cons>Would also inflate revenue. If revenue is correct on screen, unlikely.</cons>
    </option>
    <option id="h2">
      <name>H2_CONFIRMED — cost allocation double-count</name>
      <pros>Architecturally plausible.</pros>
      <cons>Would usually DECREASE financialResult (more expenses = less profit), not inflate it.</cons>
    </option>
    <option id="h5">
      <name>H5_CONFIRMED — worker stores inflated value (OUT OF SCOPE)</name>
      <pros>Full root-cause.</pros>
      <cons>Requires worker changes — needs separate plan. Escalate.</cons>
    </option>
    <option id="none">
      <name>NONE_MATCH — escalate to user</name>
      <pros>Prevents blind fix.</pros>
      <cons>Blocks the phase.</cons>
    </option>
  </options>
  <resume-signal>
    Reply with: `DECISION: H<N>_CONFIRMED` (one of H1/H2/H3/H4/H5) OR `DECISION: NONE_MATCH`.
    On `H5_CONFIRMED` or `NONE_MATCH`, the plan pauses and escalates.
  </resume-signal>
  <acceptance_criteria>
    - File `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md` exists
    - File ends with a single line matching regex `^DECISION: (H1|H2|H3|H4|H5)_CONFIRMED$` or `^DECISION: NONE_MATCH$`
    - File has numeric ratio table with at least one row per brand from the API sample
    - Grep verification: `grep -E "^DECISION:" 11-05-TRIAGE.md | wc -l` returns exactly 1
  </acceptance_criteria>
  <done>
    One hypothesis is named as CONFIRMED with numeric evidence. The fix target file is identified. User has approved the decision OR the plan has correctly escalated.
  </done>
</task>

<task type="auto">
  <name>Task 3: Apply ONE targeted code fix (branches on Task 2 decision)</name>
  <files>
    (determined by Task 2 DECISION — one of:
     apps/mobile-dashboard/src/hooks/useDashboard.ts,
     apps/mobile-dashboard/src/types/index.ts,
     apps/finance-service/src/dashboard/dashboard.service.ts,
     apps/finance-service/src/dashboard/dto/summary.dto.ts)
  </files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md (DECISION line — REQUIRED)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md (numeric reference)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md <decisions> BUG-11-1 (LOCKED: fix on backend preferred; mobile /100 FORBIDDEN as final)
    - The FIX_TARGET file named in 11-05-TRIAGE.md
    - apps/finance-service/src/dashboard/dashboard.service.spec.ts (existing test patterns — 54 tests passing)
  </read_first>
  <action>
    **Gate:** Do NOT begin until Task 2 has a DECISION line committed. Re-read 11-05-TRIAGE.md now.

    Read the `DECISION:` line. Apply ONLY the fix that matches it:

    **If DECISION = H3_CONFIRMED (field name mismatch):**
    1. Open the FIX_TARGET (likely `apps/mobile-dashboard/src/hooks/useDashboard.ts` line 75 or mobile types file)
    2. Rename the field read / fix the type so `computeMarginPct` receives the correct numeric argument
    3. Touch EXACTLY one file unless DTO type file must also align (max 2 files)
    4. Do NOT add `/ 100` anywhere — forbidden per CONTEXT.md BUG-11-1 LOCKED decision
    5. Run: `cd apps/mobile-dashboard && npm test`

    **If DECISION = H4_CONFIRMED (pre-multiplied value):**
    1. Open `apps/finance-service/src/dashboard/dashboard.service.ts`
    2. Locate WHERE the `financialResult` gets multiplied by 100 (could be a shared helper, or a misunderstood Decimal conversion). Grep for `* 100`, `Decimal`, `.toNumber()` around lines 180–320.
    3. Remove the accidental multiplication (or add the division that normalizes to tenge). DO NOT apply a blanket `/ 100` — find the EXACT injection point and fix it there.
    4. Add a regression test in `dashboard.service.spec.ts` that asserts: for inputs `brandRevenue=1000000, brandExpenses=300000`, the returned `brands[0].financialResult` equals 700000 (not 70000000).
    5. Run: `cd apps/finance-service && npm test`

    **If DECISION = H1_CONFIRMED (Decimal conversion):**
    1. Locate the `toNumber` helper or the `::float8` cast around `dashboard.service.ts` lines 240–260
    2. If Prisma Decimal is being stringified then parsed in a way that misplaces the decimal point — fix the helper
    3. Add a spec test verifying that a Decimal.toNumber passes through correctly
    4. Run: `cd apps/finance-service && npm test`

    **If DECISION = H2_CONFIRMED (allocation double-count):**
    1. Find where `CostAllocation` is folded into `brandExpenses` — should NOT be adding a negative or double-counting
    2. Patch the aggregation logic
    3. Add integration-ish test with mock allocation rows
    4. Run: `cd apps/finance-service && npm test`

    **Guardrails (apply in all cases):**
    - Do NOT touch `apps/mobile-dashboard/src/utils/brand.ts:computeMarginPct` — formula is correct per CONTEXT.md LOCKED decision.
    - Do NOT touch `apps/aggregator-worker` in this plan — H5 would require escalation per Task 2.
    - Do NOT add config flags or environment switches — the fix must be unconditional and code-level.
    - Changed file count: ideally 1, absolute max 2 (source + spec).
    - Run `npx tsc --noEmit` in the affected app to confirm no type regressions.

    Commit:
    ```bash
    # Example (substitute actual file list from DECISION):
    node "D:/kexgroupapp/.claude/get-shit-done/bin/gsd-tools.cjs" commit "fix(11-05): BUG-11-1 root cause — <hypothesis name> (<file>)" --files <fix-target-file>
    ```
  </action>
  <verify>
    <automated>
      (cd apps/finance-service && npm test -- --testPathPattern=dashboard 2>&1 | tail -20) \
        && (cd apps/mobile-dashboard && npm test 2>&1 | tail -20) \
        && echo OK
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly ONE hypothesis-matching patch applied (see DECISION line)
    - All pre-existing tests pass: `cd apps/finance-service && npm test` green; `cd apps/mobile-dashboard && npm test` green
    - `npx tsc --noEmit` in the affected app exits 0
    - No `/ 100` magic constant added in `apps/mobile-dashboard/src/hooks/useDashboard.ts` or `brand.ts` (forbidden per CONTEXT.md)
    - Grep check: `grep -n "computeMarginPct" apps/mobile-dashboard/src/utils/brand.ts` still shows the original formula (line 89 unchanged)
    - Changed file count ≤ 2 (source + spec test file only)
  </acceptance_criteria>
  <done>
    The single targeted fix is committed, pre-existing tests still pass, and the new/updated spec test proves the fix at the code boundary.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Regression test — real-data margin assertion</name>
  <files>apps/mobile-dashboard/src/utils/brand.test.ts</files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md (real numbers for BNA)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md (which hypothesis was confirmed)
    - apps/mobile-dashboard/src/utils/brand.ts (computeMarginPct signature)
    - apps/mobile-dashboard/src/utils/brand.test.ts (existing test structure — 22 tests per 11-02 SUMMARY)
  </read_first>
  <behavior>
    - **Test 1:** Given revenue = actual BNA revenue from API sample (e.g. 29_280_000) AND financialResult = actual BNA financialResult from API sample (value AFTER Task 3 fix), `computeMarginPct(revenue, financialResult)` returns a value in 40..85 range.
    - **Test 2:** Using the real API sample for any second brand (e.g., DNA), same assertion — margin in 40..85.
    - **Test 3:** Edge case — `computeMarginPct(100, 10000)` (impossible 10000% input) returns 10000 (formula-correct). This guards that the bug was NOT in computeMarginPct itself — keeps the formula's contract.
    - **Negative guard:** Assert that `computeMarginPct(29_280_000, 2_063_000_000)` returns ~7047 (the pre-fix broken value). This codifies the bug signature so regressions are caught.
  </behavior>
  <action>
    1. Open `apps/mobile-dashboard/src/utils/brand.test.ts`.
    2. Add a new `describe('BUG-11-1 regression — real-data margin range', () => { ... })` block.
    3. Implement the 4 tests above, using literal numeric constants pulled from 11-05-API-SAMPLE.md (do NOT compute them dynamically — test must be deterministic).
    4. Add a brief comment at the top of the describe block referencing 11-05-TRIAGE.md DECISION line, so future readers understand WHY this test exists.
    5. Run: `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand`

    Expected new count: existing 22 tests + 4 new = 26 tests green.

    Commit:
    ```bash
    node "D:/kexgroupapp/.claude/get-shit-done/bin/gsd-tools.cjs" commit "test(11-05): BUG-11-1 regression — real-data margin range" --files apps/mobile-dashboard/src/utils/brand.test.ts
    ```
  </action>
  <verify>
    <automated>
      (cd apps/mobile-dashboard && npm test -- --testPathPattern=brand 2>&1 | tail -20 | grep -E "Tests:.*passed" | grep -vE "(failed|failing)") \
        && grep -q "BUG-11-1 regression" apps/mobile-dashboard/src/utils/brand.test.ts \
        && echo OK
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/utils/brand.test.ts` contains a `describe('BUG-11-1 regression — real-data margin range', ...)` block
    - All 4 new tests pass AND all existing 22 tests still pass (final count ≥ 26)
    - Test file references 11-05-TRIAGE.md in a comment
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    The regression test codifies both the bug signature (7047% for inflated input) and the fixed behavior (60–70% for real input). CI will fail if the bug returns.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: Emulator walkthrough — confirm ~68% margin on Dashboard</name>
  <files>
    .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md
  </files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md (DECISION)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md (expected values)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-VERIFICATION.md (human_verification entries 1, 2, 6 — multi-bug walkthrough)
  </read_first>
  <what-built>
    - ONE targeted fix applied (Task 3, hypothesis-matched)
    - Regression test codifying before/after values (Task 4)
    - Raw API sample + triage decision persisted as audit trail (Tasks 1–2)
  </what-built>
  <action>
    **This is a checkpoint:human-verify task. The executor's job here is to:**

    1. **Prepare the verification environment** — ensure services are running, rebuild mobile app if Task 3 changed a DTO, launch the Android emulator.
    2. **Pause execution and ask the user** to perform the on-device verification described in the `<how-to-verify>` block below.
    3. **After user approves** (`approved` or explicit margin values), write `11-05-SUMMARY.md`, update ROADMAP.md, and commit.
    4. **If user reports failure** (any brand margin > 100%), STOP the plan and escalate — the Task 2 hypothesis was wrong.

    **Executor preparation steps (before asking user):**

    ```bash
    # Ensure services up
    curl -s http://localhost:3000/api/health && echo "GW OK"
    curl -s http://localhost:3002/health && echo "FS OK"

    # If Task 3 touched finance-service, restart it so DTO changes land:
    # (user runs manually — this is a reminder to executor)
    # cd apps/finance-service && npm run start:dev

    # Run all tests one last time to prove no regressions:
    cd apps/finance-service && npm test
    cd apps/mobile-dashboard && npm test
    ```

    Present the `<how-to-verify>` steps to the user and wait for their reply.

    **After user approves:**

    Write `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md` using this template (fill in actual values from Task 3 decision, Task 4 test output, and the user's emulator observations):

    ```markdown
    ---
    phase: 11-bug-fix-pack-post-walkthrough
    plan: "05"
    subsystem: <where fix landed: finance-service | mobile-dashboard>
    tags: [wave-gap-closure, BUG-11-1, margin-root-cause]
    dependency_graph:
      requires:
        - "11-01: SQL verify rejecting kopeck hypothesis"
        - "11-02/11-03/11-03b/11-04: prior waves closing BUG-11-2..8"
      provides:
        - "BUG-11-1 root cause identified and fixed"
    decisions:
      - "Task 2 DECISION: H<N>_CONFIRMED (paste actual decision here)"
      - "Fix applied to: <file path>"
    metrics:
      duration: "<measured>"
      completed_date: "<YYYY-MM-DD>"
      tasks_completed: 5
      tasks_total: 5
      files_created: 4
      files_modified: "<1 or 2>"
    ---

    # Phase 11 Plan 05: BUG-11-1 Margin Root Cause — Summary

    ## Investigation Path
    1. API sample captured (11-05-API-SAMPLE.md) — raw JSON from live dashboard endpoint
    2. Triage (11-05-TRIAGE.md) — numeric ratios compared against H1–H5
    3. DECISION: H<N>_CONFIRMED
    4. Fix applied: (one-paragraph description)
    5. Regression test: 4 new assertions in brand.test.ts (BUG-11-1 regression describe block)

    ## Before → After
    | Brand | Before (screen) | After (screen) | Expected |
    |-------|----------------:|---------------:|---------:|
    | BNA   |           7048% |            <X> |   60–75% |
    | DNA   |           6831% |            <X> |   60–75% |
    | JD    |           6990% |            <X> |   40–85% |
    | SB    |           6822% |            <X> |   40–85% |
    | KEX   |           6533% |            <X> |   40–85% |

    ## Tests
    - apps/finance-service: N passed
    - apps/mobile-dashboard: M passed (26+ including 4 new regression tests)

    ## Commits
    | Step | Commit | Description |
    |------|--------|-------------|
    | 1    | <hash> | API sample captured |
    | 2    | <hash> | Triage DECISION |
    | 3    | <hash> | Root-cause fix |
    | 4    | <hash> | Regression test |
    | 5    | <hash> | Summary |

    ## Closing Note
    Bug BUG-11-1 fully closed. The gap in 11-VERIFICATION.md is now resolved. Future regressions will be caught by the new test + codified bug signature.
    ```

    Then update ROADMAP.md Phase 11 section:
    - Change `**Статус: 🔄 In Progress — Wave 1 complete**` to reflect final status
    - Tick the BUG-11-1 line: `[x] **BUG-11-1 CRITICAL** — ...`
    - Add plan 11-05 to the Plans list: `- [x] 11-05-bug-11-1-margin-root-cause-PLAN.md — Gap-closure: root-cause investigation for 7000% margin`
    - Bump **Plans:** count to `7/7 plans complete`

    Commit both:
    ```bash
    node "D:/kexgroupapp/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(11-05): summary — BUG-11-1 closed via <hypothesis>" --files .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md .planning/ROADMAP.md
    ```
  </action>
  <how-to-verify>
    **Prerequisites:**
    1. All 3 services running:
       - auth-service (port 3001)
       - api-gateway (port 3000)
       - finance-service (port 3002) — restarted after Task 3 if DTO changed
    2. Android emulator running with mobile-dashboard app installed
    3. Login as OWNER using dev bypass: phone `+77074408018`, OTP `111111`

    **Verification steps:**
    1. Open the app on the emulator. Land on the Dashboard (Level 1).
    2. **For EACH visible brand tile** (expected: BNA, DNA, JD, SB, KEX — 5 tiles), read the "Маржа" percentage and record it.
    3. **Every tile's margin must be in the range 40–85%.** Specifically:
       - BNA should be approximately 60–75%
       - DNA should be approximately 60–75%
       - JD, SB, KEX can vary more (smaller revenue, more volatile) but still < 90%
    4. **None of the brands may show > 100% margin.** A value > 100 indicates the fix did not land.
    5. Take a screenshot or transcribe the values — the executor will add them to `11-05-SUMMARY.md` § Before → After table.

    **Ancillary checks (should still be green from prior phase plans):**
    6. "Точек" KPI badge shows ≤ 13
    7. 5 brand tiles visible (not 6 — no Цех)
    8. Sync time label is in Asia/Almaty format (HH:mm)

    **Reply format:**
    - On success: reply `approved` or `approved: BNA=68, DNA=67, JD=55, SB=52, KEX=48`
    - On failure: paste the actual observed margin values — if ANY is > 100%, we STOP and regroup on a different hypothesis.
  </how-to-verify>
  <verify>
    <automated>
      test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md \
        && grep -q "DECISION: H" .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md \
        && grep -q "Before → After" .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md \
        && grep -qE "BUG-11-1.*\[x\]|\[x\].*BUG-11-1" .planning/ROADMAP.md \
        && echo OK
    </automated>
  </verify>
  <resume-signal>
    Reply with: `approved` if all 5 brand tiles show margins in 40–85% range on the live emulator.
    OR: Paste the actual observed margin values — if any brand shows > 100%, the plan FAILS and we regroup on a different hypothesis (likely Task 2 decision was wrong).
  </resume-signal>
  <acceptance_criteria>
    - `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md` exists
    - Summary contains a before/after table with actual (not placeholder) numeric values
    - User replies `approved` (or equivalent) after live emulator verification
    - ROADMAP.md updated: BUG-11-1 checkbox ticked, plan 11-05 listed and ticked
    - `.planning/phases/11-bug-fix-pack-post-walkthrough/11-VERIFICATION.md` gap for BUG-11-1 no longer applies (will be re-verified in a follow-up verify-work run)
  </acceptance_criteria>
  <done>
    BUG-11-1 is closed end-to-end: root cause identified empirically, surgical fix applied, codified by regression test, visually verified on-device.
  </done>
</task>

</tasks>

<verification>
**Phase-level checks for BUG-11-1 closure:**

1. Artifact chain present:
   ```bash
   test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-API-SAMPLE.md \
     && test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md \
     && test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md
   ```

2. DECISION line is unambiguous:
   ```bash
   grep -E "^DECISION: (H[1-5]_CONFIRMED|NONE_MATCH)$" .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md | wc -l  # must equal 1
   ```

3. Formula untouched:
   ```bash
   grep -n "(financialResult / revenue) \* 100" apps/mobile-dashboard/src/utils/brand.ts  # must still match
   ```

4. All tests green:
   ```bash
   cd apps/finance-service && npm test
   cd apps/mobile-dashboard && npm test
   ```

5. Regression test exists:
   ```bash
   grep -n "BUG-11-1 regression" apps/mobile-dashboard/src/utils/brand.test.ts
   ```

6. ROADMAP.md synchronized: BUG-11-1 checkbox ticked, plan 11-05 recorded.
</verification>

<success_criteria>
- `must_haves.truths` all verified:
  - [ ] 11-05-API-SAMPLE.md committed with raw JSON
  - [ ] 11-05-TRIAGE.md committed with DECISION line
  - [ ] ONE targeted fix committed (not speculative)
  - [ ] New test in brand.test.ts asserts 40–85% margin range for real BNA values
  - [ ] Emulator walkthrough confirms margins in expected range
- Gap from 11-VERIFICATION.md (BUG-11-1 truth #1: "Margin for all brands shows ~68% (not 7000%)") is resolvable on next `/gsd:verify-work` run
- No regressions in previously-fixed bugs (BUG-11-2..8 verified truths #2–8 remain green)
- No forbidden patterns: `grep -n "/ 100" apps/mobile-dashboard/src/hooks/useDashboard.ts apps/mobile-dashboard/src/utils/brand.ts` returns nothing new
</success_criteria>

<output>
After completion, `.planning/phases/11-bug-fix-pack-post-walkthrough/11-05-SUMMARY.md` exists with the template shown in Task 5. ROADMAP.md Phase 11 section has been updated — BUG-11-1 is ticked `[x]` and plan 11-05 is added to the plans list as complete.

Optionally after approval: re-run `/gsd:verify-work 11` to confirm the gap is now closed at the phase level.
</output>
