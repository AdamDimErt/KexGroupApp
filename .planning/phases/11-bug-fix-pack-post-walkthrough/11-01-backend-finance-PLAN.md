---
phase: 11-bug-fix-pack-post-walkthrough
plan: 01
type: execute
wave: 1
depends_on: ["11-00"]
files_modified:
  - apps/finance-service/src/dashboard/dashboard.service.ts
  - apps/finance-service/src/dashboard/dashboard.service.spec.ts
autonomous: false
requirements: [BUG-11-1, BUG-11-3, BUG-11-5]
must_haves:
  truths:
    - "SQL verification gate runs BEFORE any code change (Task 1 checkpoint)"
    - "Dashboard summary returns financialResult in tenge (not kopecks) — ONLY after SQL confirms kopeck-storage hypothesis"
    - "Dashboard summary excludes brands with type=KITCHEN from brands[] array"
    - "Dashboard summary restaurantCount reflects only isActive restaurants in RESTAURANT-type brands"
    - "Margin (financialResult/revenue) ≈ 0.6-0.8 for BNA/DNA (not ≥ 10x)"
  artifacts:
    - path: "apps/finance-service/src/dashboard/dashboard.service.ts"
      provides: "getDashboardSummary with normalized units + type filter + filtered counts"
      contains: "type: 'RESTAURANT'"
    - path: "apps/finance-service/src/dashboard/dashboard.service.spec.ts"
      provides: "Unit tests for new normalization + filter behavior"
      contains: "BUG-11-1"
  key_links:
    - from: "apps/finance-service/src/dashboard/dashboard.service.ts"
      to: "packages/database/schema.prisma BrandType enum"
      via: "Prisma client type import"
      pattern: "type.*RESTAURANT"
    - from: "apps/finance-service/src/dashboard/dashboard.service.ts"
      to: "apps/mobile-dashboard/src/hooks/useDashboard.ts"
      via: "DashboardSummaryDto.brands[] + financialResult fields"
      pattern: "financialResult"
---

<objective>
Fix three backend bugs that render Dashboard unusable: 7000% margin (unit mismatch), Kitchen shown as brand tile, restaurant count showing 84 instead of ≤13.

Purpose: Mobile Dashboard currently pulls `financialResult` in kopecks while `revenue` is in tenge — division yields absurd margin. Fix at the source (finance-service DTO) per locked CONTEXT decision. Also filter non-restaurant brands and count only active restaurants.

**CRITICAL:** BUG-11-1 fix is unit-sensitive. Applying the wrong divisor corrupts every margin for every user. A HARD GATE (Task 1) runs SQL first to empirically confirm the kopeck-storage hypothesis before any code change in Task 3. The gate is NOT skippable.

Output: Corrected `DashboardService.getDashboardSummary()` + matching unit tests. Mobile side needs NO changes (Wave 2 only touches render/utils, not hook math).

Autonomy note: `autonomous: false` because Task 1 is a blocking checkpoint that gates code changes on empirical SQL evidence. Tasks 2 and 3 are automated but only proceed after Task 1 resolves.
</objective>

<execution_context>
@D:/kexgroupapp/.claude/get-shit-done/workflows/execute-plan.md
@D:/kexgroupapp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md
@.planning/phases/11-00-wave0-prereqs-PLAN.md
@apps/finance-service/src/dashboard/dashboard.service.ts
@apps/finance-service/src/dashboard/dto/summary.dto.ts
@packages/database/schema.prisma

<interfaces>
<!-- Key existing code the executor needs -->

Current getDashboardSummary signature (apps/finance-service/src/dashboard/dashboard.service.ts:188):
```typescript
async getDashboardSummary(
  tenantId: string,
  periodType: string,
  dateFrom: string,
  dateTo: string,
  restaurantFilter?: string[],
): Promise<DashboardSummaryDto>
```

Current BrandIndicatorDto shape the mobile consumes:
```typescript
{
  id: string;
  name: string;
  slug: string;
  revenue: number;              // tenge
  expenses: number;              // CURRENTLY in kopecks — BUG-11-1
  financialResult: number;       // CURRENTLY = revenue - expenses (mix of units)
  changePercent: number;         // always 0 (TODO in Phase 12)
  restaurantCount: number;       // CURRENTLY from unfiltered _count — BUG-11-5
}
```

Current raw SQL aggregation (lines 222-233):
```typescript
const revenueByRestaurant = await this.prisma.$queryRaw<
  Array<{ restaurantId: string; sum_revenue: number; sum_directExpenses: number }>
>(Prisma.sql`
  SELECT "restaurantId",
         COALESCE(SUM("revenue"), 0)::float8 AS "sum_revenue",
         COALESCE(SUM("directExpenses"), 0)::float8 AS "sum_directExpenses"
  FROM "finance"."FinancialSnapshot"
  WHERE "restaurantId" = ANY(${allRestaurantIds})
    AND "date" >= ${startDate} AND "date" <= ${endDate}
  GROUP BY "restaurantId"
`);
```

New Prisma type (after 11-00 Task 3 schema update):
```typescript
// @prisma/client now exports BrandType enum:
type BrandType = 'RESTAURANT' | 'KITCHEN' | 'MARKETPLACE';
// Brand model now includes: type: BrandType
```

BUG-11-1 SQL verification query (from 11-RESEARCH.md lines 183-194):
```sql
SELECT
  r."name",
  fs."date",
  fs."revenue",
  fs."directExpenses",
  fs."directExpenses"::float8 / NULLIF(fs."revenue"::float8, 0) AS ratio
FROM "finance"."FinancialSnapshot" fs
JOIN "finance"."Restaurant" r ON r.id = fs."restaurantId"
ORDER BY fs."date" DESC
LIMIT 10;
```
Decision matrix for the `ratio` column:
- ratio ≈ 60-100 across ALL rows → kopecks storage confirmed → divisor = 100
- ratio ≈ 0.5-0.9 → normal margin (expenses ≤ revenue) → hypothesis WRONG → STOP
- ratio > 100 or erratic → different unit issue → STOP
- query fails or DB unavailable → STOP
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: HARD GATE — SQL verify BUG-11-1 kopeck-storage hypothesis before any code change</name>
  <files>.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md (scratchpad written by executor recording the query result)</files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "finance-service Fix Pattern (BUG-11-1: unit normalization)" lines 176-202 (contains the exact SQL to run)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-1 · Маржа 7000%" (LOCKED: "VERIFY via SQL first")
    - .env or equivalent (confirm `DATABASE_URL` is set — this is a READ query, no write access required)
    - packages/database/schema.prisma `model FinancialSnapshot` (confirms column names `revenue`, `directExpenses`, `date`, `restaurantId`)
  </read_first>
  <action>
    This task is a HARD GATE. Tasks 2 and 3 MUST NOT execute until this task produces one of the three defined outcomes. Applying the wrong divisor corrupts every margin number for every user.

    **Step 1 — Locate a psql client.** Try (in order):
    1. `psql --version` — if installed, use directly.
    2. `docker ps --filter name=postgres --format '{{.Names}}'` — if a postgres container is running, use `docker exec -it <name> psql`.
    3. `npx prisma db execute --stdin` from `packages/database/` — Prisma's one-shot raw SQL runner.

    **Step 2 — Run EXACTLY this SQL** (from 11-RESEARCH.md lines 183-194):

    ```sql
    SELECT
      r."name",
      fs."date",
      fs."revenue",
      fs."directExpenses",
      fs."directExpenses"::float8 / NULLIF(fs."revenue"::float8, 0) AS ratio
    FROM "finance"."FinancialSnapshot" fs
    JOIN "finance"."Restaurant" r ON r.id = fs."restaurantId"
    WHERE fs."revenue" > 0
    ORDER BY fs."date" DESC
    LIMIT 10;
    ```

    Record the full result (name, date, revenue, directExpenses, ratio columns for all returned rows) into a scratchpad file `.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md`. Include: the psql client used, the raw query output, the computed ratio per row, and the decision below.

    **Step 3 — Apply the decision matrix** (NO shortcuts, NO inference):

    | Observed `ratio` column across ALL returned rows | Decision | Next action |
    |---|---|---|
    | ratio ≈ 60-100 (every row) | CONFIRMED — directExpenses stored in kopecks | Proceed with `EXPENSE_UNIT_DIVISOR = 100` in Task 3 |
    | ratio ≈ 0.5-0.9 (every row) | REJECTED — this IS a normal margin, hypothesis wrong | STOP — emit `## CHECKPOINT REACHED` with real data, require user decision |
    | mixed/erratic (some <1, some >100) | INCONCLUSIVE — different unit issue | STOP — emit `## CHECKPOINT REACHED` |
    | 0 rows returned (empty table) | NO DATA — cannot verify | STOP — emit `## CHECKPOINT REACHED` |
    | query fails (connection, auth, SQL error) | DB UNAVAILABLE | STOP — emit `## CHECKPOINT REACHED` with specific error |

    **Step 4 — Handle STOP outcomes explicitly.** If the decision says STOP, the executor MUST:

    1. Write the finding to `11-01-SQL-VERIFY.md` (observed ratios, sample rows, reasoning).
    2. Emit to the user, verbatim in the response:

       ```
       ## CHECKPOINT REACHED

       **Task 1 (BUG-11-1 SQL verification):** <one of: REJECTED | INCONCLUSIVE | NO DATA | DB UNAVAILABLE>

       **Observed data:**
       <table of rows from the SQL result — name, date, revenue, directExpenses, ratio>

       **Why STOP:** <one-line justification from decision matrix>

       **Options for user:**
       (a) <context-specific remediation — e.g. "provide DB access" / "investigate whether revenue is also scaled" / "skip BUG-11-1 in this phase">
       (b) Skip BUG-11-1 in this phase — revert to Phase 12 after data audit

       **Resume-signal:** reply with (a), (b), or a specific divisor like "divisor=70" if you have out-of-band evidence.
       ```

    3. DO NOT proceed to Task 2 or Task 3. Wait for user response.

    **Step 5 — Handle CONFIRMED outcome.** If decision says CONFIRMED, record the exact ratio range (e.g. "ratio ∈ [68.2, 72.1] across 10 rows on 2026-04-18") in `11-01-SQL-VERIFY.md`, mark the scratchpad with `DECISION: CONFIRMED — EXPENSE_UNIT_DIVISOR=100`, and set `<resume-signal>approved</resume-signal>` equivalent by proceeding to Task 2.

    **Step 6 — DB-unavailable fallback is ALSO a STOP.** "DB unavailable" is NEVER an excuse to apply the divisor and hope. CLAUDE.md policy: ask when blocked (see `rule_ask_when_blocked.md`). If the executor cannot reach the DB, emit `## CHECKPOINT REACHED` with "DB UNAVAILABLE" and options:
    - (a) provide `DATABASE_URL` / start local postgres / export `DATABASE_URL` and retry
    - (b) skip BUG-11-1 in this phase (removes Task 3 from scope; Task 2 BUG-11-3/5 still proceeds)
    - (c) user provides empirical ratio from their own SQL session (e.g. pasted query output); executor verifies matrix against pasted output

    WHY this gate exists:
    - Margin is a load-bearing KPI. Wrong divisor = every user sees wrong numbers.
    - CONTEXT.md locked decision: "VERIFY via SQL first. If revenue/financial_result ratio ≈ 70, units mismatch confirmed."
    - The previous revision of this plan allowed "If DB unavailable, document the hypothesis in code comment and proceed with 100x divisor" — this is incorrect. Applying a 100× divisor when ratio is actually 0.7 (normal margin) would divide correct values by 100, making every restaurant show ₸X/100 and breaking ALL downstream math (KPIs, allocations, charts).
    - Wrong divisor is WORSE than doing nothing. Doing nothing keeps the visible bug; wrong divisor silently corrupts.
  </action>
  <verify>
    <automated>test -f .planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md && grep -qE "DECISION:\s+(CONFIRMED|REJECTED|INCONCLUSIVE|NO DATA|DB UNAVAILABLE)" .planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md</automated>
  </verify>
  <what-built>A blocking empirical-verification gate for the BUG-11-1 unit hypothesis. No code changed.</what-built>
  <how-to-verify>
    Executor has:
    1. Run the SQL query defined above against `finance.FinancialSnapshot`.
    2. Written the raw result + decision to `.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md`.
    3. Written a clear `DECISION: CONFIRMED` OR emitted `## CHECKPOINT REACHED` asking user to choose.

    If DECISION is CONFIRMED → auto-proceed to Task 2.
    If any STOP outcome → user provides resume-signal.
  </how-to-verify>
  <resume-signal>
    For STOP outcomes, one of: (a) retry-with-db, (b) skip-bug-11-1, (c) use-divisor=&lt;N&gt; (e.g. `use-divisor=100` if user has empirical confidence).
    For CONFIRMED outcome, no user signal needed — executor proceeds automatically.
  </resume-signal>
  <acceptance_criteria>
    - `.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md` exists
    - File contains a `DECISION:` line with one of the 5 outcomes (CONFIRMED / REJECTED / INCONCLUSIVE / NO DATA / DB UNAVAILABLE)
    - If DECISION ≠ CONFIRMED, executor has emitted `## CHECKPOINT REACHED` in its response
    - No modifications to `apps/finance-service/src/dashboard/dashboard.service.ts` have been made yet (Task 3 is blocked)
  </acceptance_criteria>
  <done>The SQL hypothesis is empirically resolved. Task 3 can only proceed if outcome is CONFIRMED or user explicitly provides a resume-signal with divisor value.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Filter Brand.type='RESTAURANT' in getDashboardSummary + fix restaurantCount</name>
  <files>apps/finance-service/src/dashboard/dashboard.service.ts, apps/finance-service/src/dashboard/dashboard.service.spec.ts</files>
  <read_first>
    - apps/finance-service/src/dashboard/dashboard.service.ts lines 188-302 (current getDashboardSummary implementation)
    - apps/finance-service/src/dashboard/dashboard.service.spec.ts (existing test patterns — mock Prisma, mock ConfigService)
    - apps/finance-service/src/dashboard/dto/summary.dto.ts (BrandIndicatorDto shape)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Finance-service Filtered Brand Query (BUG-11-3 + BUG-11-5)" lines 534-562
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Prisma Count with Filters Pattern (BUG-11-5)" lines 203-230
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Pitfall 3: _count in Prisma include does not accept where"
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-3" and § "BUG-11-5"
  </read_first>
  <behavior>
    - Test: given 3 brands (2 RESTAURANT, 1 KITCHEN), getDashboardSummary returns 2 brands in result.brands array (KITCHEN excluded)
    - Test: given brand with 13 active + 5 inactive restaurants, brand.restaurantCount = 13 (not 18)
    - Test: given no brands of type RESTAURANT, result.brands = [] (not throw)
    - Test: tenantId filter still honored (brands from other tenants excluded)
  </behavior>
  <action>
    **Prerequisite:** Task 1 gate must have resolved (CONFIRMED or user-approved bypass). BUG-11-3 and BUG-11-5 fixes in THIS task are independent of BUG-11-1 unit issue — safe to proceed even if user chose `skip-bug-11-1`.

    In `apps/finance-service/src/dashboard/dashboard.service.ts` `getDashboardSummary()`:

    **Change 1 — Add type filter to brands query (line 199-208):**

    FROM:
    ```typescript
    const brands = await this.prisma.brand.findMany({
      where: {
        company: { tenantId },
        isActive: true,
      },
      include: {
        _count: { select: { restaurants: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    ```

    TO:
    ```typescript
    const brands = await this.prisma.brand.findMany({
      where: {
        company: { tenantId },
        isActive: true,
        type: 'RESTAURANT',              // BUG-11-3: exclude Kitchen from dashboard
      },
      orderBy: { sortOrder: 'asc' },
    });
    // NOTE: removed `include: _count` — Pitfall 3 says _count can't filter by isActive.
    ```

    **Change 2 — Add explicit filtered restaurant count query (after line 218, BEFORE the revenueByRestaurant query):**

    ```typescript
    // BUG-11-5: Filtered count by brand — excludes inactive + Kitchen-brand restaurants
    const brandIds = brands.map((b) => b.id);
    const countsByBrand = brandIds.length > 0
      ? await this.prisma.restaurant.groupBy({
          by: ['brandId'],
          where: {
            brandId: { in: brandIds },
            isActive: true,
          },
          _count: { id: true },
        })
      : [];
    const countMap = new Map(
      countsByBrand.map((r) => [r.brandId, r._count.id]),
    );
    ```

    **Change 3 — Fix brandIndicators mapping to use countMap (around line 272-282):**

    FROM:
    ```typescript
    return {
      id: brand.id,
      ...
      restaurantCount: brand._count.restaurants,
    };
    ```

    TO:
    ```typescript
    return {
      id: brand.id,
      ...
      restaurantCount: countMap.get(brand.id) ?? 0,   // BUG-11-5: filtered active count
    };
    ```

    **Change 4 — Also filter allRestaurants query (line 211-218) to exclude Kitchen-brand rests:**

    FROM:
    ```typescript
    const allRestaurants = await this.prisma.restaurant.findMany({
      where: {
        brand: { company: { tenantId } },
        isActive: true,
        ...(restaurantFilter ? { id: { in: restaurantFilter } } : {}),
      },
      select: { id: true, brandId: true },
    });
    ```

    TO:
    ```typescript
    const allRestaurants = await this.prisma.restaurant.findMany({
      where: {
        brand: { company: { tenantId }, type: 'RESTAURANT' },  // BUG-11-3
        isActive: true,
        ...(restaurantFilter ? { id: { in: restaurantFilter } } : {}),
      },
      select: { id: true, brandId: true },
    });
    ```

    **Tests to ADD** to `dashboard.service.spec.ts` inside existing describe block:

    ```typescript
    describe('BUG-11-3 + BUG-11-5: brand type filter + restaurant count', () => {
      it('excludes KITCHEN-type brands from result.brands array', async () => {
        prismaMock.brand.findMany.mockResolvedValue([
          { id: 'b1', name: 'BNA', slug: 'bna', sortOrder: 0 },
          { id: 'b2', name: 'DNA', slug: 'dna', sortOrder: 1 },
        ] as any);
        prismaMock.restaurant.findMany.mockResolvedValue([]);
        prismaMock.restaurant.groupBy.mockResolvedValue([]);
        prismaMock.$queryRaw.mockResolvedValue([]);
        prismaMock.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } } as any);

        const result = await service.getDashboardSummary('tenant-1', 'today', '2026-04-20', '2026-04-20');
        expect(result.brands).toHaveLength(2);
        expect(prismaMock.brand.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ type: 'RESTAURANT' }),
          }),
        );
      });

      it('restaurantCount uses groupBy, not _count.restaurants', async () => {
        prismaMock.brand.findMany.mockResolvedValue([
          { id: 'b1', name: 'BNA', slug: 'bna', sortOrder: 0 },
        ] as any);
        prismaMock.restaurant.findMany.mockResolvedValue([
          { id: 'r1', brandId: 'b1' },
          { id: 'r2', brandId: 'b1' },
        ] as any);
        prismaMock.restaurant.groupBy.mockResolvedValue([
          { brandId: 'b1', _count: { id: 8 } },
        ] as any);
        prismaMock.$queryRaw.mockResolvedValue([]);
        prismaMock.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } } as any);

        const result = await service.getDashboardSummary('tenant-1', 'today', '2026-04-20', '2026-04-20');
        expect(result.brands[0].restaurantCount).toBe(8);
      });

      it('handles no RESTAURANT brands without throwing', async () => {
        prismaMock.brand.findMany.mockResolvedValue([]);
        prismaMock.restaurant.findMany.mockResolvedValue([]);
        prismaMock.restaurant.groupBy.mockResolvedValue([]);
        prismaMock.$queryRaw.mockResolvedValue([]);
        prismaMock.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } } as any);

        const result = await service.getDashboardSummary('tenant-1', 'today', '2026-04-20', '2026-04-20');
        expect(result.brands).toEqual([]);
      });
    });
    ```

    WHY this split:
    - Removing `include: _count` + adding explicit `groupBy` = filtered count (per RESEARCH.md Pitfall 3).
    - Type filter on BOTH `brand.findMany` AND `restaurant.findMany` → Kitchen excluded from tiles AND from revenue aggregation (so totals don't include Kitchen revenue either — consistent with CONTEXT.md "Kitchen-данные идут только в Reports/Цех секцию").
    - `countMap` = O(1) lookup per brand in map phase.

    Do NOT add a `KITCHEN` special-case in mobile — fix at API boundary, mobile stays unchanged for BUG-11-3/5.
  </action>
  <verify>
    <automated>cd apps/finance-service && npm test -- --testPathPattern=dashboard</automated>
  </verify>
  <acceptance_criteria>
    - `apps/finance-service/src/dashboard/dashboard.service.ts` contains exact string `type: 'RESTAURANT'`
    - File contains exact string `countMap.get(brand.id)`
    - File contains exact string `groupBy({` (for restaurant count query)
    - `apps/finance-service/src/dashboard/dashboard.service.spec.ts` contains string `BUG-11-3` or `BUG-11-5`
    - `cd apps/finance-service && npm test -- --testPathPattern=dashboard` exits 0 with all new tests passing
    - `cd apps/finance-service && npx tsc --noEmit` exits 0
    - NO use of `brand._count.restaurants` anywhere in `getDashboardSummary` (grep returns 0 matches within that function)
  </acceptance_criteria>
  <done>Brand type filter + filtered count active in getDashboardSummary; tests green; type-check clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Normalize financialResult unit in DashboardSummaryDto (BUG-11-1) — GATED by Task 1</name>
  <files>apps/finance-service/src/dashboard/dashboard.service.ts, apps/finance-service/src/dashboard/dashboard.service.spec.ts</files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md (MUST exist from Task 1 — contains the `DECISION:` line that gates this task)
    - apps/finance-service/src/dashboard/dashboard.service.ts lines 222-302 (revenueByRestaurant raw SQL + brand aggregation loop)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "finance-service Fix Pattern (BUG-11-1: unit normalization)" lines 176-202
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-1 · Маржа 7000%" (LOCKED: fix on backend, NOT mobile)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "Specifics" (7000% math: 29.28M × 70 ≈ 2063M; hypothesis: 100× multiplier)
  </read_first>
  <behavior>
    - Test: given raw SQL returns {sum_revenue: 29_280_000, sum_directExpenses: 929_376_000} (kopecks ratio ≈ 31.7%), DTO returns brand with revenue=29_280_000 and expenses=9_293_760 (divided by 100) so margin = 68.2%
    - Test: when revenue is 0, financialResult = -expensesNormalized (no div-by-zero)
    - Test: `totalRevenue` and `totalExpenses` at top of DTO are also normalized (sum of brand-level normalized values)
    - Test: comment in code references BUG-11-1 so future maintainers understand the conversion
  </behavior>
  <action>
    **HARD PREREQUISITE — Task 1 gate resolution:**

    Read `.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md`. Find the `DECISION:` line. Proceed based on it:

    | DECISION value | Action here |
    |---|---|
    | `CONFIRMED — EXPENSE_UNIT_DIVISOR=100` | Apply divisor=100 per code below |
    | `CONFIRMED — EXPENSE_UNIT_DIVISOR=<N>` (user override via resume-signal, e.g. `use-divisor=70`) | Apply divisor=`<N>` per code below |
    | `REJECTED` / `INCONCLUSIVE` / `NO DATA` / `DB UNAVAILABLE` AND user replied with `skip-bug-11-1` | SKIP this task entirely. Write only a code comment in `dashboard.service.ts` near the aggregation loop: `// BUG-11-1: deferred — SQL verification was <outcome>; see 11-01-SQL-VERIFY.md`. Do not add EXPENSE_UNIT_DIVISOR. Do not add BUG-11-1 tests. Done. |
    | Any STOP outcome WITHOUT user resume-signal | DO NOT EXECUTE. Abort this task, re-emit `## CHECKPOINT REACHED` referencing Task 1. |

    If `DECISION: CONFIRMED` (or user-approved divisor), proceed with Change 1/2/3 below.

    In `apps/finance-service/src/dashboard/dashboard.service.ts` `getDashboardSummary()`:

    **Change 1 — Define normalization constant at top of method (after parseDate lines):**

    ```typescript
    // BUG-11-1 · Normalize `directExpenses` storage unit.
    // Empirically verified via SQL (see .planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md):
    // aggregator-worker stores `FinancialSnapshot.directExpenses` as kopecks (×100)
    // while `revenue` is stored as tenge. This caused 7000% margin on Dashboard.
    //
    // Observed ratio range at time of fix: <paste range from 11-01-SQL-VERIFY.md>
    //
    // When worker storage is unified to tenge (Phase 12 migration), delete this constant.
    const EXPENSE_UNIT_DIVISOR = 100; // or <N> if user override
    ```

    (Executor MUST paste the actual ratio range from `11-01-SQL-VERIFY.md` into the comment — not a placeholder. This creates an audit trail.)

    **Change 2 — Apply divisor inside the brandIndicators mapping loop (around lines 261-282):**

    FROM:
    ```typescript
    for (const rid of restaurantIds) {
      const data = revenueMap.get(rid);
      if (data) {
        brandRevenue += data.revenue;
        brandExpenses += data.expenses;
      }
    }
    ```

    TO:
    ```typescript
    for (const rid of restaurantIds) {
      const data = revenueMap.get(rid);
      if (data) {
        brandRevenue += data.revenue;
        brandExpenses += data.expenses / EXPENSE_UNIT_DIVISOR;   // BUG-11-1
      }
    }
    ```

    **Change 3 — Also update totalRevenue/totalExpenses accumulation** — those are derived from `brandRevenue/brandExpenses` already, so they become correct automatically. Keep as-is.

    **Tests to ADD** to `dashboard.service.spec.ts`:

    ```typescript
    describe('BUG-11-1: unit normalization for financialResult', () => {
      it('normalizes directExpenses from kopecks to tenge (div by 100)', async () => {
        prismaMock.brand.findMany.mockResolvedValue([
          { id: 'b1', name: 'BNA', slug: 'bna', sortOrder: 0 },
        ] as any);
        prismaMock.restaurant.findMany.mockResolvedValue([
          { id: 'r1', brandId: 'b1' },
        ] as any);
        prismaMock.restaurant.groupBy.mockResolvedValue([
          { brandId: 'b1', _count: { id: 1 } },
        ] as any);
        // Raw SQL returns revenue in tenge (29.28M), directExpenses in kopecks (929.4M = 9.294M tenge)
        prismaMock.$queryRaw.mockResolvedValue([
          { restaurantId: 'r1', sum_revenue: 29_280_000, sum_directExpenses: 929_376_000 },
        ] as any);
        prismaMock.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } } as any);

        const result = await service.getDashboardSummary('tenant-1', 'today', '2026-04-20', '2026-04-20');

        // After normalization: expenses = 9,293,760 (div by 100)
        expect(result.brands[0].expenses).toBeCloseTo(9_293_760, 0);
        expect(result.brands[0].financialResult).toBeCloseTo(29_280_000 - 9_293_760, 0);

        // Margin = financialResult / revenue ≈ 68.26% — proves fix works
        const margin = (result.brands[0].financialResult / result.brands[0].revenue) * 100;
        expect(margin).toBeGreaterThan(60);
        expect(margin).toBeLessThan(80);
      });

      it('does not alter revenue field (revenue already in tenge)', async () => {
        prismaMock.brand.findMany.mockResolvedValue([
          { id: 'b1', name: 'BNA', slug: 'bna', sortOrder: 0 },
        ] as any);
        prismaMock.restaurant.findMany.mockResolvedValue([
          { id: 'r1', brandId: 'b1' },
        ] as any);
        prismaMock.restaurant.groupBy.mockResolvedValue([
          { brandId: 'b1', _count: { id: 1 } },
        ] as any);
        prismaMock.$queryRaw.mockResolvedValue([
          { restaurantId: 'r1', sum_revenue: 1_000_000, sum_directExpenses: 0 },
        ] as any);
        prismaMock.syncLog.aggregate.mockResolvedValue({ _max: { createdAt: null } } as any);

        const result = await service.getDashboardSummary('tenant-1', 'today', '2026-04-20', '2026-04-20');
        expect(result.brands[0].revenue).toBe(1_000_000);
      });
    });
    ```

    WHY EXPENSE_UNIT_DIVISOR as named constant:
    - Traceability: grep `EXPENSE_UNIT_DIVISOR` finds the fix site when next dev wonders "why div by 100?"
    - Adjustable: Task 1 SQL may reveal different ratio — change one constant.
    - LOCKED decision: fix is on backend, NOT mobile (CONTEXT.md). Mobile's `computeMarginPct` stays as-is.
    - Audit trail: the comment above EXPENSE_UNIT_DIVISOR references `11-01-SQL-VERIFY.md` so future maintainers can see the evidence.

    Coordination note with Wave 3 (11-04):
    - Wave 3 fixes aggregator-worker's 1C/iiko syncs to store expenses in TENGE (not kopecks) going forward? NO — Wave 3 does NOT change storage unit per revised CONTEXT. Storage stays in kopecks; DTO normalizes. This is the locked path.
    - Once all old kopecks-data is migrated in Phase 12, this divisor becomes a no-op → delete it.
  </action>
  <verify>
    <automated>cd apps/finance-service && npm test -- --testPathPattern=dashboard</automated>
  </verify>
  <acceptance_criteria>
    - `apps/finance-service/src/dashboard/dashboard.service.ts` contains exact string `EXPENSE_UNIT_DIVISOR` (unless DECISION was skip-bug-11-1)
    - File contains exact string `BUG-11-1` in a code comment
    - File contains exact string `/ EXPENSE_UNIT_DIVISOR` (application of divisor; unless skip)
    - Code comment references `11-01-SQL-VERIFY.md` (audit trail)
    - `apps/finance-service/src/dashboard/dashboard.service.spec.ts` contains string `BUG-11-1` (unless skip)
    - Test case "normalizes directExpenses from kopecks to tenge" passes (unless skip)
    - Test asserts margin is between 60 and 80 (not 7000%) (unless skip)
    - `cd apps/finance-service && npm test -- --testPathPattern=dashboard` exits 0
  </acceptance_criteria>
  <done>Normalization constant applied per empirically-verified divisor; margin within plausible range in tests; audit trail in code comment linking to SQL verification scratchpad.</done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

1. `cd apps/finance-service && npm test` — all tests green (existing + new BUG-11 tests)
2. `cd apps/finance-service && npx tsc --noEmit` — 0 errors
3. `grep -c "BUG-11" apps/finance-service/src/dashboard/dashboard.service.ts` ≥ 2 (shows markers for each fix) OR ≥ 1 if BUG-11-1 was skipped
4. `grep -c "BUG-11" apps/finance-service/src/dashboard/dashboard.service.spec.ts` ≥ 2 OR ≥ 1 if skip
5. `.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SQL-VERIFY.md` exists with a DECISION line

Manual check (when DB available):
- Log into staging, query dashboard API, verify `financialResult / revenue * 100 ∈ [60, 80]` for each brand
- Verify returned `brands[]` array has no entry named `Цех`
- Verify `sum(brand.restaurantCount) ≤ 13`
</verification>

<success_criteria>
- BUG-11-1 fixed (OR explicitly deferred with user signal): margin values in Dashboard DTO response are plausible (60-80% range for test fixtures) OR the SQL gate produced evidence justifying deferral
- BUG-11-3 fixed: KITCHEN brand excluded from `brands[]` in response
- BUG-11-5 fixed: `restaurantCount` per brand uses filtered groupBy count, not unfiltered `_count`
- All existing finance-service tests still pass (no regression)
- Mobile app requires NO coordinated changes (fix is transparent at DTO layer)
- Empirical evidence for BUG-11-1 divisor captured in `11-01-SQL-VERIFY.md` (audit trail)
</success_criteria>

<output>
After completion, create `.planning/phases/11-bug-fix-pack-post-walkthrough/11-01-SUMMARY.md` that includes:
- Task 1 outcome (DECISION value + key observed ratios)
- Task 2 implementation notes
- Task 3 either implementation notes OR deferral justification
- Any resume-signals consumed from user
</output>
