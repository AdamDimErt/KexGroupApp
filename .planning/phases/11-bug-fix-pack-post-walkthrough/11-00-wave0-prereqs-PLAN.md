---
phase: 11-bug-fix-pack-post-walkthrough
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - apps/mobile-dashboard/package.json
  - apps/mobile-dashboard/src/utils/brand.test.ts
  - apps/aggregator-worker/src/onec/onec-sync.service.spec.ts
  - packages/database/migrations/20260420000000_add_brand_type/migration.sql
  - packages/database/schema.prisma
  - .env.example
autonomous: true
requirements: [BUG-11-2, BUG-11-3, BUG-11-4, BUG-11-6, BUG-11-8]
must_haves:
  truths:
    - "date-fns and date-fns-tz installed in apps/mobile-dashboard"
    - "brand.test.ts file exists with test stubs for BUG-11-2, BUG-11-4, BUG-11-6"
    - "Migration SQL file exists for Brand.type enum"
    - "schema.prisma has BrandType enum and Brand.type field"
    - ".env.example has ONEC_BASE_URL, ONEC_USER, ONEC_PASSWORD documented"
    - "onec-sync.service.spec.ts has describe block skeleton for per-record try/catch"
  artifacts:
    - path: "apps/mobile-dashboard/package.json"
      provides: "date-fns + date-fns-tz runtime dependencies"
      contains: "date-fns-tz"
    - path: "apps/mobile-dashboard/src/utils/brand.test.ts"
      provides: "Jest test file for brand utilities"
      min_lines: 20
    - path: "packages/database/migrations/20260420000000_add_brand_type/migration.sql"
      provides: "DDL for BrandType enum + Brand.type column + backfill"
      contains: "CREATE TYPE"
    - path: "packages/database/schema.prisma"
      provides: "Prisma model with BrandType enum and Brand.type field"
      contains: "enum BrandType"
    - path: ".env.example"
      provides: "Documented 1C env vars (ONEC_BASE_URL/USER/PASSWORD)"
      contains: "ONEC_BASE_URL"
  key_links:
    - from: "apps/mobile-dashboard/src/utils/brand.ts"
      to: "apps/mobile-dashboard/src/utils/brand.test.ts"
      via: "import from ./brand"
      pattern: "from\\s+['\\\"]\\./brand['\\\"]"
    - from: "packages/database/schema.prisma"
      to: "packages/database/migrations/20260420000000_add_brand_type/migration.sql"
      via: "schema matches migration"
      pattern: "enum BrandType"
---

<objective>
Wave 0 prerequisites for Phase 11 bug-fix pack. Creates skeletons, installs dependencies, and writes migration SQL BEFORE any implementation begins in Wave 1-3.

Purpose: Downstream tasks (Wave 1 finance-service, Wave 2 mobile utils, Wave 3 worker) reference these artifacts. Without them, later waves cannot compile, cannot test, cannot migrate DB.

Output: Installed dependencies + test file stubs + migration SQL + env.example documentation + Prisma schema update. No production code changes yet.
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
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-VALIDATION.md
@apps/mobile-dashboard/package.json
@packages/database/schema.prisma
@packages/database/migrations/20260408120000_notification_preference/migration.sql

<interfaces>
<!-- Key interfaces existing code already provides (Wave 0 extends these) -->

Existing in apps/mobile-dashboard/src/utils/brand.ts:
```typescript
export type BrandCode = 'BNA' | 'DNA';
export type Cuisine = 'Burger' | 'Doner';
export function resolveBrand(brandNameOrSlug: string): { code: BrandCode; cuisine: Cuisine };
export function mapLegacyStatus(status: 'green'|'yellow'|'red'|null|undefined): 'above'|'onplan'|'below';
export function computeMarginPct(revenue: number, financialResult: number): number | null;
export function computePlanAttainment(revenue: number, plannedRevenue: number): number;
export function formatPeriodLabel(from?: string, to?: string): string;
```

Existing in packages/database/schema.prisma (Brand model — no `type` field yet):
```prisma
model Brand {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  slug        String   @unique
  iikoGroupId String?  @unique
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  company     Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  restaurants Restaurant[]
  @@schema("finance")
}
```

Existing migration format (from 20260408120000_notification_preference/migration.sql):
```sql
CREATE TABLE "auth"."NotificationPreference" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  ...
);
```
Note: manual SQL files, no `prisma migrate dev` — project decision [02-00].
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install date-fns and date-fns-tz in mobile-dashboard</name>
  <files>apps/mobile-dashboard/package.json</files>
  <read_first>
    - apps/mobile-dashboard/package.json (confirm date-fns and date-fns-tz are ABSENT in dependencies)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "To Add" table (lines 124-135)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-6 · Sync time timezone"
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Pitfall 1: date-fns-tz v2 vs v3 API difference"
  </read_first>
  <action>
    Install exact versions to avoid v2/v3 API breakage. Use WORKSPACE-root npm install so monorepo lock is respected:

    ```bash
    cd apps/mobile-dashboard && npm install date-fns@^3 date-fns-tz@^3
    ```

    Purpose: BUG-11-6 mobile fix needs `toZonedTime` (v3 API) not `utcToZonedTime` (v2). Install v3 to match RESEARCH.md recommendation.

    After install, verify package.json lists both under `dependencies` (NOT devDependencies — runtime use in src/utils/brand.ts).

    Do NOT touch `package-lock.json` manually — let `npm install` regenerate.

    Do NOT install in repo root — must be in `apps/mobile-dashboard`.
  </action>
  <verify>
    <automated>cd apps/mobile-dashboard && node -e "const p=require('./package.json');if(!p.dependencies['date-fns']||!p.dependencies['date-fns-tz'])process.exit(1)"</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/package.json` contains `"date-fns":` key under `"dependencies"`
    - `apps/mobile-dashboard/package.json` contains `"date-fns-tz":` key under `"dependencies"`
    - version strings start with `"^3` (both)
    - `cd apps/mobile-dashboard && npm ls date-fns-tz` exits with code 0
  </acceptance_criteria>
  <done>Both libraries present in dependencies; v3 range; mobile app still type-checks.</done>
</task>

<task type="auto">
  <name>Task 2: Create brand.test.ts with failing test stubs for BUG-11-2, BUG-11-4, BUG-11-6</name>
  <files>apps/mobile-dashboard/src/utils/brand.test.ts</files>
  <read_first>
    - apps/mobile-dashboard/src/utils/brand.ts (read current exports — BrandCode, resolveBrand, computePlanAttainment signatures)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Phase Requirements" table (BUG-11-2, BUG-11-4, BUG-11-6 rows)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Brand Map Pattern (BUG-11-2)" lines 232-276
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Plan Delta Pattern (BUG-11-4)" lines 278-315
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "TZ Formatting Pattern (BUG-11-6)" lines 317-338
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "Specifics" (acceptance values for BNA/DNA/JD/SB/KEX/KITCHEN)
    - apps/mobile-dashboard/package.json § "jest" block (rootDir: src, testRegex: `.*\\.test\\.ts$`)
  </read_first>
  <action>
    Write EXACTLY this content to `apps/mobile-dashboard/src/utils/brand.test.ts`. Tests will FAIL (RED) until Wave 2 adds the functions. That's expected — Wave 0 is scaffold only.

    ```typescript
    import {
      resolveBrand,
      computePlanAttainment,
      computePlanDelta,
      formatPlanLabel,
      formatSyncTime,
      type BrandCode,
    } from './brand';

    describe('BUG-11-2: resolveBrand with BRAND_MAP', () => {
      it('returns BNA for Burger na Abaya', () => {
        expect(resolveBrand('Burger na Abaya').code).toBe('BNA');
      });
      it('returns DNA for Doner na Abaya', () => {
        expect(resolveBrand('Doner na Abaya').code).toBe('DNA');
      });
      it('returns JD for Just Doner', () => {
        expect(resolveBrand('Just Doner').code).toBe('JD');
      });
      it('returns SB for Salam Bro', () => {
        expect(resolveBrand('Salam Bro').code).toBe('SB');
      });
      it('returns KEX for КексБрэндс', () => {
        expect(resolveBrand('КексБрэндс').code).toBe('KEX');
      });
      it('returns KITCHEN for Цех', () => {
        expect(resolveBrand('Цех').code).toBe('KITCHEN');
      });
      it('falls back to keyword match for "burger something"', () => {
        expect(resolveBrand('Burger New Location').code).toBe('BNA');
      });
      it('falls back to keyword match for Russian "донер"', () => {
        expect(resolveBrand('Донер Point').code).toBe('DNA');
      });
    });

    describe('BUG-11-4: computePlanAttainment / computePlanDelta / formatPlanLabel', () => {
      it('computePlanAttainment returns 100 when revenue equals plan', () => {
        expect(computePlanAttainment(100, 100)).toBe(100);
      });
      it('computePlanAttainment caps at 150%', () => {
        expect(computePlanAttainment(300, 100)).toBe(150);
      });
      it('computePlanAttainment returns 0 when plan is 0', () => {
        expect(computePlanAttainment(100, 0)).toBe(0);
      });
      it('computePlanDelta returns attainment minus 100', () => {
        expect(computePlanDelta(95, 100)).toBeCloseTo(-5, 2);
      });
      it('computePlanDelta for BNA case (29.28M / 30.74M) ≈ -4.75%', () => {
        const delta = computePlanDelta(29_280_000, 30_740_000);
        expect(delta).toBeGreaterThan(-5);
        expect(delta).toBeLessThan(-4);
      });
      it('formatPlanLabel null → "Нет плана"', () => {
        expect(formatPlanLabel(null).text).toBe('Нет плана');
        expect(formatPlanLabel(null).status).toBe('onplan');
      });
      it('formatPlanLabel -4.7 → "Ниже плана" with below status', () => {
        const r = formatPlanLabel(-4.7);
        expect(r.status).toBe('below');
        expect(r.text).toContain('Ниже плана');
      });
      it('formatPlanLabel 0.3 → "По плану" (within ±0.5% threshold)', () => {
        expect(formatPlanLabel(0.3).status).toBe('onplan');
      });
      it('formatPlanLabel 5.2 → "Выше плана" with above status', () => {
        const r = formatPlanLabel(5.2);
        expect(r.status).toBe('above');
        expect(r.text).toContain('Выше плана');
      });
    });

    describe('BUG-11-6: formatSyncTime (Asia/Almaty, UTC+5)', () => {
      it('formats 07:30 UTC as "12:30" in Almaty', () => {
        expect(formatSyncTime('2026-04-20T07:30:00Z')).toBe('12:30');
      });
      it('formats midnight UTC as "05:00" in Almaty', () => {
        expect(formatSyncTime('2026-04-20T00:00:00Z')).toBe('05:00');
      });
      it('formats 19:00 UTC as "00:00" next day in Almaty (same HH:mm)', () => {
        expect(formatSyncTime('2026-04-20T19:00:00Z')).toBe('00:00');
      });
      it('is independent of process.env.TZ', () => {
        const prev = process.env.TZ;
        process.env.TZ = 'UTC';
        expect(formatSyncTime('2026-04-20T07:30:00Z')).toBe('12:30');
        process.env.TZ = 'America/New_York';
        expect(formatSyncTime('2026-04-20T07:30:00Z')).toBe('12:30');
        if (prev !== undefined) process.env.TZ = prev;
        else delete process.env.TZ;
      });
    });

    describe('BUG-11-2: BrandCode type', () => {
      it('accepts all 6 valid brand codes', () => {
        const codes: BrandCode[] = ['BNA', 'DNA', 'JD', 'SB', 'KEX', 'KITCHEN'];
        expect(codes).toHaveLength(6);
      });
    });
    ```

    WHY this content:
    - Imports `computePlanDelta`, `formatPlanLabel`, `formatSyncTime` that don't exist yet — forces Wave 2 to add them.
    - Imports `BrandCode` type with all 6 codes — forces Wave 2 to expand type.
    - Tests are concrete acceptance values from CONTEXT.md (e.g. 29.28M/30.74M for BNA), not abstract.
    - TZ test explicitly nulls `process.env.TZ` per RESEARCH.md Pitfall 1.

    Do NOT implement the functions — that's Wave 2's job.
  </action>
  <verify>
    <automated>test -f apps/mobile-dashboard/src/utils/brand.test.ts && grep -q "formatSyncTime" apps/mobile-dashboard/src/utils/brand.test.ts && grep -q "BUG-11-6" apps/mobile-dashboard/src/utils/brand.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/utils/brand.test.ts` exists
    - File contains string `formatSyncTime` (proves BUG-11-6 test added)
    - File contains string `computePlanDelta` (proves BUG-11-4 test added)
    - File contains string `'Just Doner'` and `'КексБрэндс'` (proves BUG-11-2 all-6-brands tests added)
    - File has at least 3 `describe` blocks (BUG-11-2, BUG-11-4, BUG-11-6)
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits non-zero (expected — Wave 2 adds missing exports)
  </acceptance_criteria>
  <done>Test file committed with intentionally-failing stubs for Wave 2 to GREEN.</done>
</task>

<task type="auto">
  <name>Task 3: Create Prisma migration SQL for BrandType enum + update schema.prisma</name>
  <files>packages/database/migrations/20260420000000_add_brand_type/migration.sql, packages/database/schema.prisma</files>
  <read_first>
    - packages/database/schema.prisma lines 1-190 (verify current Brand model has NO `type` field; confirm `@@schema("finance")` pattern)
    - packages/database/migrations/20260408120000_notification_preference/migration.sql (format reference — simple SQL, no wrapping transaction)
    - packages/database/migrations/20260407000001_add_synclog_needs_manual_review/migration.sql (second format reference)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Migration File (BUG-11-3)" lines 464-500
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Pitfall 2: Prisma enum in wrong schema"
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Pitfall 5: Migration backfill runs before column exists"
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-3 · Цех как бренд"
  </read_first>
  <action>
    Step 1: Create directory `packages/database/migrations/20260420000000_add_brand_type/`.

    Step 2: Write EXACTLY this SQL to `packages/database/migrations/20260420000000_add_brand_type/migration.sql`:

    ```sql
    -- Phase 11 · BUG-11-3: Separate Kitchen brands from consumer brands via type enum
    -- References: .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md

    -- Step 1: Create BrandType enum in finance schema (NOT auth — per Pitfall 2)
    CREATE TYPE "finance"."BrandType" AS ENUM ('RESTAURANT', 'KITCHEN', 'MARKETPLACE');

    -- Step 2: Add type column with safe default (runs BEFORE backfill — Pitfall 5)
    ALTER TABLE "finance"."Brand"
      ADD COLUMN "type" "finance"."BrandType" NOT NULL DEFAULT 'RESTAURANT';

    -- Step 3: Backfill: identify Kitchen brands by Russian/English name pattern
    UPDATE "finance"."Brand"
    SET "type" = 'KITCHEN'
    WHERE "name" ~* 'цех|kitchen|fabrika';

    -- DOWN (reference only — not auto-executed):
    -- ALTER TABLE "finance"."Brand" DROP COLUMN "type";
    -- DROP TYPE "finance"."BrandType";
    ```

    Step 3: Update `packages/database/schema.prisma` to match. Find the `enum DataSource` block (around line 24-29) and immediately AFTER it, BEFORE `enum AllocationType`, insert:

    ```prisma
    enum BrandType {
      RESTAURANT   // Consumer-facing restaurant brand (BNA, DNA, JD, SB)
      KITCHEN      // Production kitchen (Цех) — excluded from Dashboard
      MARKETPLACE  // Third-party platform (future)

      @@schema("finance")
    }
    ```

    Step 4: Find the `model Brand {` block (line 172). Add `type BrandType @default(RESTAURANT)` immediately after the `isActive` field, BEFORE `sortOrder`:

    ```prisma
    model Brand {
      id          String   @id @default(uuid())
      companyId   String
      name        String
      slug        String   @unique
      iikoGroupId String?  @unique
      isActive    Boolean  @default(true)
      type        BrandType @default(RESTAURANT)   // BUG-11-3
      sortOrder   Int      @default(0)
      ...
    }
    ```

    Step 5: Regenerate Prisma client:

    ```bash
    cd packages/database && npx prisma generate
    ```

    DO NOT run `prisma migrate dev` — per project decision [02-00], migrations are manual SQL only. The SQL file sits in place; it will be applied manually later when DB is available.

    WHY this approach:
    - Schema file change (no DB run) means `@prisma/client` type definitions will include `type: BrandType` — so Wave 1 finance-service and Wave 3 worker can reference `type` at type-check level.
    - Backfill regex matches `цех|kitchen|fabrika` per CONTEXT.md locked decision.
    - Enum in `finance` schema (NOT `auth`) per Pitfall 2.
  </action>
  <verify>
    <automated>test -f packages/database/migrations/20260420000000_add_brand_type/migration.sql && grep -q "BrandType" packages/database/schema.prisma && grep -q "CREATE TYPE" packages/database/migrations/20260420000000_add_brand_type/migration.sql && cd packages/database && npx prisma validate</automated>
  </verify>
  <acceptance_criteria>
    - `packages/database/migrations/20260420000000_add_brand_type/migration.sql` exists
    - Migration SQL contains exact string `CREATE TYPE "finance"."BrandType" AS ENUM ('RESTAURANT', 'KITCHEN', 'MARKETPLACE')`
    - Migration SQL contains exact string `ALTER TABLE "finance"."Brand" ADD COLUMN "type"`
    - Migration SQL contains exact string `WHERE "name" ~* 'цех|kitchen|fabrika'`
    - `packages/database/schema.prisma` contains line `enum BrandType {`
    - `packages/database/schema.prisma` contains line `type        BrandType @default(RESTAURANT)` inside `model Brand`
    - `cd packages/database && npx prisma validate` exits 0
    - Generated Prisma client exposes `BrandType` enum (verify: `cd packages/database && grep -q "BrandType" node_modules/@prisma/client/index.d.ts 2>/dev/null || true`)
  </acceptance_criteria>
  <done>Migration SQL written and schema.prisma updated. Prisma generate successful. DB not yet migrated (manual apply later).</done>
</task>

<task type="auto">
  <name>Task 4: Document ONEC_BASE_URL/USER/PASSWORD env vars in .env.example</name>
  <files>.env.example</files>
  <read_first>
    - .env.example (read current 1C section — lines 40-49; note it has `ONEC_REST_URL`/`ONEC_REST_USER`/`ONEC_REST_PASS` NOT `ONEC_BASE_URL`/`ONEC_USER`/`ONEC_PASSWORD`)
    - apps/aggregator-worker/src/onec/onec-sync.service.ts lines 63-71 (confirm actual env var names used: `ONEC_BASE_URL`, `ONEC_USER`, `ONEC_PASSWORD`)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Pitfall 6: ONEC_BASE_URL validation runs at startup even in dev"
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-8 · 1C sync лежит"
    - CLAUDE.md § "NEVER edit" list — note `.env.example` is NOT in that list (only `.env` and `.env.*` are forbidden; the example file is checked-in and safe to edit)
  </read_first>
  <action>
    CRITICAL: The `.env.example` file uses `ONEC_REST_URL/USER/PASS` but the actual code reads `ONEC_BASE_URL/USER/PASSWORD`. This is a latent bug — team never configured 1C because docs lied about the var name. Document the REAL names.

    Find the 1C section in `.env.example` (lines 40-49):

    ```
    # ═══════════════════════════════════════════════════
    # 1C
    # ═══════════════════════════════════════════════════
    ONEC_REST_URL=https://your-server/odata/standard.odata
    ONEC_REST_USER=CHANGE_ME
    ONEC_REST_PASS=CHANGE_ME
    ONEC_SYNC_INTERVAL_MINUTES=15
    ONEC_REQUEST_TIMEOUT_MS=60000
    ONEC_MAX_RETRIES=3
    ```

    REPLACE the whole 1C block with:

    ```
    # ═══════════════════════════════════════════════════
    # 1C OData (REQUIRED — aggregator-worker throws on startup if missing)
    # ═══════════════════════════════════════════════════
    # Canonical vars read by apps/aggregator-worker/src/onec/onec-sync.service.ts:
    ONEC_BASE_URL=https://your-1c-server           # REQUIRED — base URL, NO trailing /odata (service appends path)
    ONEC_USER=CHANGE_ME                            # REQUIRED — 1C OData HTTP basic auth username
    ONEC_PASSWORD=CHANGE_ME                        # REQUIRED — 1C OData HTTP basic auth password
    # Legacy aliases (DEPRECATED — kept for back-compat, prefer canonical names above):
    ONEC_REST_URL=https://your-server/odata/standard.odata
    ONEC_REST_USER=CHANGE_ME
    ONEC_REST_PASS=CHANGE_ME
    # Sync tuning:
    ONEC_SYNC_INTERVAL_MINUTES=15
    ONEC_REQUEST_TIMEOUT_MS=60000
    ONEC_MAX_RETRIES=3
    ```

    WHY:
    - BUG-11-8 root cause is that env vars are undocumented — operators didn't know to set `ONEC_BASE_URL`.
    - Do NOT hardcode credentials per CONTEXT.md locked decision.
    - Keep legacy `ONEC_REST_*` documented so existing installations don't break — just mark deprecated.
    - Comment `REQUIRED` so future ops can't miss it.

    Do NOT touch `.env` itself — only `.env.example` (CLAUDE.md forbids .env edits).
  </action>
  <verify>
    <automated>grep -q "ONEC_BASE_URL=" .env.example && grep -q "ONEC_USER=" .env.example && grep -q "ONEC_PASSWORD=" .env.example && grep -q "REQUIRED" .env.example</automated>
  </verify>
  <acceptance_criteria>
    - `.env.example` contains line starting with `ONEC_BASE_URL=`
    - `.env.example` contains line starting with `ONEC_USER=`
    - `.env.example` contains line starting with `ONEC_PASSWORD=`
    - `.env.example` contains comment string `REQUIRED`
    - `.env.example` keeps legacy `ONEC_REST_URL` / `ONEC_REST_USER` / `ONEC_REST_PASS` for back-compat
    - `.env` file NOT modified (check `git status` shows only `.env.example` changed in this task's scope)
  </acceptance_criteria>
  <done>Operators/CI can read `.env.example` and know exactly which env vars aggregator-worker needs for 1C sync.</done>
</task>

<task type="auto">
  <name>Task 5: Scaffold describe block for onec-sync per-record try/catch tests</name>
  <files>apps/aggregator-worker/src/onec/onec-sync.service.spec.ts</files>
  <read_first>
    - apps/aggregator-worker/src/onec/onec-sync.service.spec.ts (read existing tests — see what's already tested to avoid dup)
    - apps/aggregator-worker/src/onec/onec-sync.service.ts lines 58-170 (syncExpenses method — see current for-loop structure where per-record try/catch will be added)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Per-Record try/catch Pattern (BUG-11-8 — bug_021 pattern)" lines 340-363
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-VALIDATION.md Wave 0 § (item: `onec-sync.service.spec.ts` per-record try/catch)
    - Reference commit `787777b` (bug_021 — the pattern this fix mirrors; see git log)
  </read_first>
  <action>
    Append (do NOT replace) to `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` a new describe block with failing stubs. Wave 3 will implement the code to make them GREEN.

    Add at the END of the existing file (before the final `});` that closes the top-level describe if any):

    ```typescript
    describe('BUG-11-8 · per-record try/catch in syncExpenses', () => {
      beforeEach(() => {
        process.env.ONEC_BASE_URL = 'https://test-1c';
        process.env.ONEC_USER = 'test';
        process.env.ONEC_PASSWORD = 'test';
        process.env.TENANT_ID = 'tenant-1';
      });

      it('skips one bad record and continues processing remaining good records', async () => {
        // GIVEN: 3 expense records (middle one will fail upsert)
        const records = [
          { Ref_Key: 'good-1', Amount: '100.00', Date: '2026-04-20', Description: 'Rent' },
          { Ref_Key: 'bad-1',  Amount: 'NaN',    Date: 'invalid',    Description: 'Broken' },
          { Ref_Key: 'good-2', Amount: '200.00', Date: '2026-04-20', Description: 'IT' },
        ];

        // Mock HTTP + Prisma so 'bad-1' throws in upsert
        // ... (implementation in Wave 3 will need mock setup)

        // WHEN syncExpenses called
        // THEN: service does not throw, processes good-1 and good-2, warns on bad-1

        expect(true).toBe(false); // RED — Wave 3 replaces with real assertion
      });

      it('logs warning + Sentry.captureMessage for each skipped record (not throw)', async () => {
        // GIVEN: 1 bad record
        // WHEN syncExpenses called
        // THEN: logger.warn called with Ref_Key; Sentry.withScope called with tag system=ONE_C
        expect(true).toBe(false); // RED
      });

      it('tagged with system=ONE_C and recordRefKey in Sentry scope', async () => {
        // Verify Sentry scope metadata matches bug_021 pattern
        expect(true).toBe(false); // RED
      });
    });
    ```

    WHY:
    - Stubs with `expect(true).toBe(false)` force Wave 3 to replace them with real assertions (RED-GREEN discipline).
    - Describe block title references BUG-11-8 for traceability.
    - beforeEach sets env vars so the service's env check passes — tests focus on per-record logic, not env validation.

    Do NOT mock internals yet — Wave 3 owns that. Wave 0 only commits the test skeleton.
  </action>
  <verify>
    <automated>test -f apps/aggregator-worker/src/onec/onec-sync.service.spec.ts && grep -q "BUG-11-8" apps/aggregator-worker/src/onec/onec-sync.service.spec.ts && grep -q "per-record try/catch" apps/aggregator-worker/src/onec/onec-sync.service.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` contains string `BUG-11-8`
    - File contains string `per-record try/catch`
    - File contains at least 3 `it(` calls within the new describe block
    - File contains string `'bad-1'` (proves the skeleton skip scenario is represented)
    - File contains string `Sentry.withScope` reference OR comment about Sentry
    - Existing test cases in file are NOT removed (verify line count GROWS compared to pre-edit)
  </acceptance_criteria>
  <done>Describe skeleton committed; Wave 3 knows exactly which assertions to implement.</done>
</task>

</tasks>

<verification>
After all 5 tasks complete:

1. `cd apps/mobile-dashboard && npm ls date-fns date-fns-tz` — both present
2. `test -f apps/mobile-dashboard/src/utils/brand.test.ts` — file exists
3. `test -f packages/database/migrations/20260420000000_add_brand_type/migration.sql` — migration file exists
4. `cd packages/database && npx prisma validate` — schema is valid (0 errors)
5. `grep "ONEC_BASE_URL" .env.example` — env var documented
6. `test -f apps/aggregator-worker/src/onec/onec-sync.service.spec.ts && grep "BUG-11-8" apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` — skeleton exists

Note: `tsc --noEmit` in `apps/mobile-dashboard` will FAIL because `brand.test.ts` imports non-existent exports. This is EXPECTED after Wave 0. Wave 2 fixes it.
</verification>

<success_criteria>
- Wave 0 complete when all 5 tasks committed
- Downstream waves have all prerequisite scaffolding they need
- No production code behavior changes yet (only dependencies, stubs, schema-level artifacts, docs)
- Migration SQL ready for manual apply during staging deploy (not run here)
</success_criteria>

<output>
After completion, create `.planning/phases/11-bug-fix-pack-post-walkthrough/11-00-SUMMARY.md`
</output>
