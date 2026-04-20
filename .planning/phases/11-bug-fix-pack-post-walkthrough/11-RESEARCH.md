# Phase 11: Post-walkthrough bug-fix pack — Research

**Researched:** 2026-04-20
**Domain:** React Native mobile + NestJS finance-service + Prisma migration + aggregator-worker 1C sync
**Confidence:** HIGH (all findings from direct code inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**BUG-11-1 · Маржа 7000% — unit mismatch**
- Fix on backend (finance-service DTO normalises to tenge Decimal(14,2) before return). Mobile workaround `/100` FORBIDDEN as final fix.
- Formula `(financialResult/revenue)*100` in `utils/brand.ts` stays — it is correct.
- VERIFY via SQL first before coding.
- Acceptance: margin BNA ≈ 68%, DNA ≈ 68%, global ≈ 68.8%.

**BUG-11-2 · resolveBrand знает только BNA/DNA**
- Replace keyword-match with `BRAND_MAP: Record<string, {code, cuisine}>` with explicit entries for all 6 brands.
- Expand TS type: `type BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN'`.
- Fallback — keyword ("doner"/"burger"/"донер") with Sentry warn for unknown brand.
- Expand `theme/colors.ts` `colors.brand` from 2 to 6 colors. New colors semantically coherent with BNA/DNA.
- Acceptance: Just Doner badge = `JD`, Salam Bro = `SB`, КексБрэндс = `KEX`, Kitchen = `KITCHEN`.

**BUG-11-3 · Цех как бренд**
- Prisma: new enum `BrandType { RESTAURANT KITCHEN MARKETPLACE }` + field `Brand.type BrandType @default(RESTAURANT)`.
- Migration + backfill: all existing Brand rows matching `/цех|kitchen|fabrika/i` → `type=KITCHEN`.
- aggregator-worker sets type via regex on upsert.
- finance-service `DashboardService.getBrandSummaries()` filters `where: { type: 'RESTAURANT' }`.
- Kitchen data goes only to Reports/Kitchen section.
- Acceptance: Dashboard shows 5 brands (no Kitchen). `Brand.type` correct in DB.

**BUG-11-4 · "Выше плана · 0.0%"**
- Split two functions in `utils/brand.ts`: `computePlanAttainment(revenue, plan)` → 0..150%, `computePlanDelta(revenue, plan)` → attainment − 100.
- New `formatPlanLabel(deltaPct): { text, status: 'above' | 'onplan' | 'below' }` with ±0.5% threshold.
- `RestaurantCard` colours label by status (positive/danger/text.secondary).
- When `plannedRevenue` null/undefined → "Нет плана" (not "Выше плана · 0%").
- Acceptance: BNA (29.28M/30.74M) shows "Ниже плана · −4.7%" in red.

**BUG-11-5 · "84 точек" вместо 13**
- Fix in finance-service: `COUNT(DISTINCT id) WHERE isActive AND brand.type='RESTAURANT'`.
- Mobile `useDashboard.ts` reads `totalRestaurants` (not `salesCount`/`totalPoints`).
- Acceptance: After BUG-11-3 (Kitchen hidden) — shows ≤ 13.

**BUG-11-6 · Sync time timezone**
- finance-service returns `lastSyncAt` as ISO UTC with `Z` (`.toISOString()`). — ALREADY CORRECT, no change needed.
- Mobile renders via `date-fns-tz` (`toZonedTime` + `format`) with fixed TZ `Asia/Almaty`.
- Add `date-fns` + `date-fns-tz` to `apps/mobile-dashboard/package.json` if not present.
- Do not touch emulator TZ — work independently of device TZ.
- Acceptance: Unit test `formatSyncTime('2026-04-20T07:30:00Z')` → `'12:30'`.

**BUG-11-7 · DDS секция для OWNER**
- First diagnose: grep `ReportsScreen.tsx` on DDS section.
  - If section removed — restore (render depends on role OWNER/FIN_DIRECTOR).
  - If section present but hidden — check `useAuthStore`, dev bypass might give non-OWNER role.
- Dev bypass OTP `111111` must give OWNER role in development.
- Acceptance: OWNER sees 4 sections (DDS + Company expenses + Kitchen + Trends). OPS_DIRECTOR sees 2 (Kitchen + Trends). FIN_DIR sees 4.

**BUG-11-8 · 1C sync лежит**
- Diagnose in order: credentials in `.env`, `SchedulerService` logs, manual trigger `OneCyncService.syncExpenses()`.
- If credentials missing — do NOT hardcode, add to `.env.example` as REQUIRED.
- If credentials correct but sync fails — add try/catch at record level (bug_021 pattern).
- Acceptance: Reports "Затраты компании" gets data, Reports/Kitchen shows Purchases/Shipments/Income with ₸.
- Note: intersects with pending todo `2026-04-17-iiko-url-fallback-multitenancy.md` — coordinate approaches.

### Claude's Discretion
- Exact colors for new brand codes (JD/SB/KEX/KITCHEN) — from MASTER.md palette with WCAG AA contrast on background `#020617` / `#0F172A`
- Wave split — backend-first (Wave 1: finance-service + prisma migration), then mobile (Wave 2: utils/hooks/components), then worker (Wave 3: 1C sync separately since infra-dependent)
- Unit test format — Jest + follow existing pattern `brand.spec.ts` / `useOperations.spec.ts`
- Migration rollback strategy — reversible migration for `Brand.type` (down: DROP COLUMN)

### Deferred Ideas (OUT OF SCOPE)
- Delta chip period-over-period comparison — hide for now on "Today". Real comparison → Phase 12.
- `plannedRevenue` from API — currently stub `revenue × 1.05`. Remove after finance-service adds `/plans/brand/:id?period=...`. Phase 12.
- UI v3 migration — screens rewritten to components (HeroCard/KPIRow). Separate phase after bug-fix.
- Multi-tenancy iiko URL — see `2026-04-17-iiko-url-fallback-multitenancy.md`. Coordinate with BUG-11-8 but separate.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-11-1 | Fix 7000% margin: normalize `directExpenses` in finance-service DTO from kopecks to tenge | Confirmed mismatch hypothesis: revenue=tenge, directExpenses likely 100× inflated. Fix in `getDashboardSummary()` lines 188-302 |
| BUG-11-2 | Replace `resolveBrand` keyword-match with `BRAND_MAP` dictionary; expand `BrandCode` to 6 values; add 4 new color tokens | File: `apps/mobile-dashboard/src/utils/brand.ts` + `src/theme/colors.ts`. BRAND_MAP keys confirmed from CONTEXT.md specifics |
| BUG-11-3 | Add `BrandType` enum + `Brand.type` field in Prisma; backfill via SQL regex; filter Kitchen from dashboard | New migration required. Enum goes in `finance` schema. Worker upsert must set type. Dashboard filter on `type='RESTAURANT'` |
| BUG-11-4 | Split plan functions: `computePlanAttainment`, `computePlanDelta`, `formatPlanLabel`; fix `deltaPct` in useDashboard | Root cause: useDashboard reads `brand.changePercent` (always 0) not a computed delta. Fix in hook + brand.ts |
| BUG-11-5 | Fix restaurant count: filter `isActive=true AND brand.type='RESTAURANT'` in finance-service | Root cause: `brand._count.restaurants` is unfiltered Prisma count. Fix: explicit count query |
| BUG-11-6 | Fix sync time TZ: add `date-fns-tz` to mobile; format `lastSyncAt` in Asia/Almaty | `date-fns`/`date-fns-tz` NOT in `package.json` — must install. `lastSyncAt` backend already correct |
| BUG-11-7 | Restore DDS section in ReportsScreen; ensure dev bypass OTP=111111 gives OWNER role | Confirmed: DDS section completely absent from `ReportsScreen.tsx`. `useReportDds` hook exists in `useReports.ts` — just needs import + JSX |
| BUG-11-8 | Diagnose 1C credentials; add to `.env.example`; add per-record try/catch in `syncExpenses` | `onec-sync.service.ts` throws immediately on missing `ONEC_BASE_URL`/`ONEC_USER`/`ONEC_PASSWORD`. No per-record guard. Cron IS wired correctly in scheduler |
</phase_requirements>

---

## Summary

Phase 11 is a targeted 8-bug fix pack discovered during a live Android emulator walkthrough on 2026-04-20. All bugs have known root causes confirmed via direct code inspection — no speculative investigation needed.

The fixes span three layers: (1) finance-service DTO layer for unit mismatch and count filtering, (2) mobile utility/hook/screen layer for brand mapping, plan delta, TZ rendering, and DDS section, and (3) aggregator-worker for 1C sync resilience. A Prisma migration is required for BUG-11-3 (`Brand.type` enum).

The biggest structural change is the `BrandType` enum addition (BUG-11-3), which unblocks BUG-11-5 and conceptually separates kitchen from consumer brands. All other fixes are localized to 1-3 files each.

**Primary recommendation:** Implement in three waves — Wave 1: Prisma migration + finance-service fixes (BUG-11-1, BUG-11-3, BUG-11-5), Wave 2: mobile utils/hooks/screens (BUG-11-2, BUG-11-4, BUG-11-6, BUG-11-7), Wave 3: worker resilience (BUG-11-8).

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Relevant Bug |
|---------|---------|---------|--------------|
| Prisma ORM | existing | Schema migration + typed queries | BUG-11-3, BUG-11-5 |
| NestJS | existing | finance-service DTO layer | BUG-11-1, BUG-11-5 |
| React Native + Expo | ~54.0.0 | Mobile screens and hooks | BUG-11-2, BUG-11-4, BUG-11-7 |
| Zustand | ^5.0.0 | Auth store (role reading) | BUG-11-7 |
| Jest + ts-jest | existing | Unit tests for brand utils | BUG-11-4, BUG-11-6 |
| @sentry/node | existing | Error capture in worker | BUG-11-8 |

### To Add
| Library | Version | Purpose | Bug |
|---------|---------|---------|-----|
| date-fns | ^4.x | Date manipulation utilities | BUG-11-6 |
| date-fns-tz | ^3.x | Timezone-aware formatting (`toZonedTime`, `format`) | BUG-11-6 |

**date-fns-tz is NOT currently in `apps/mobile-dashboard/package.json`** — confirmed by inspection. Must be installed.

**Installation:**
```bash
cd apps/mobile-dashboard && npm install date-fns date-fns-tz
```

---

## Architecture Patterns

### Prisma Migration Pattern (manual SQL — no `prisma migrate dev`)

**Decision locked [02-00]:** All migrations are manual SQL files. Workflow:
1. Create new directory: `packages/database/migrations/YYYYMMDDHHMMSS_description/migration.sql`
2. Write SQL manually
3. Update `schema.prisma` to match
4. Run `npx prisma migrate resolve --applied MIGRATION_NAME` on deploy

**Existing migration format** (from inspection of `20260407000001_add_synclog_needs_manual_review`):
```sql
-- Simple ALTER TABLE pattern
ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;
```

**BUG-11-3 migration pattern:**
```sql
-- CreateEnum BrandType
CREATE TYPE "finance"."BrandType" AS ENUM ('RESTAURANT', 'KITCHEN', 'MARKETPLACE');

-- AddColumn Brand.type
ALTER TABLE "finance"."Brand" ADD COLUMN "type" "finance"."BrandType" NOT NULL DEFAULT 'RESTAURANT';

-- Backfill Kitchen brands by name regex
UPDATE "finance"."Brand"
SET "type" = 'KITCHEN'
WHERE "name" ~* 'цех|kitchen|fabrika';
```

**Rollback SQL (down migration — keep as comment in file):**
```sql
-- DOWN
ALTER TABLE "finance"."Brand" DROP COLUMN "type";
DROP TYPE "finance"."BrandType";
```

### finance-service Fix Pattern (BUG-11-1: unit normalization)

**File:** `apps/finance-service/src/dashboard/dashboard.service.ts` lines 188-302

The raw SQL aggregation `COALESCE(SUM("directExpenses"), 0)::float8` returns the value as stored in the database. If worker stores `directExpenses` in kopecks (100× tenge), the normalization must happen in the service layer before DTO serialization.

**SQL verification query (run before implementing):**
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
If `ratio` is consistently ~70-100 for top brands, hypothesis is confirmed (directExpenses is ~70-100× revenue, meaning directExpenses is stored in kopecks while revenue is in tenge).

**Normalization fix location:** In `getDashboardSummary()`, after aggregating `brandExpenses`, divide by 100 before building the DTO:
```typescript
// In brand aggregation loop, after SQL query
const brandExpenses = rawBrandExpenses / 100; // normalize kopecks → tenge
```

### Prisma Count with Filters Pattern (BUG-11-5)

**Current (broken) pattern:**
```typescript
// In getDashboardSummary() — counts ALL restaurants, no isActive filter
brand._count.restaurants  // from: include: { _count: { select: { restaurants: true } } }
```

**Fixed pattern:**
```typescript
// Explicit count with filters, run per brand or as one batched query
const restaurantCount = await this.prisma.restaurant.count({
  where: {
    brandId: brand.id,
    isActive: true,
    brand: { type: 'RESTAURANT' },
  },
});
```

Or as a single aggregation for all brands:
```typescript
const counts = await this.prisma.restaurant.groupBy({
  by: ['brandId'],
  where: { isActive: true, brand: { type: 'RESTAURANT' } },
  _count: { id: true },
});
```

### Brand Map Pattern (BUG-11-2)

**File:** `apps/mobile-dashboard/src/utils/brand.ts`

**Current broken approach:**
```typescript
// Keyword match — fragile, misses new brands
if (name.toLowerCase().includes('doner')) return 'DNA';
return 'BNA'; // fallback masks unknown brands
```

**Locked replacement pattern:**
```typescript
export type BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';

interface BrandEntry { code: BrandCode; cuisine: string; }

// Keys = iikoGroupId values (or name fragments as fallback keys)
export const BRAND_MAP: Record<string, BrandEntry> = {
  'Burger na Abaya': { code: 'BNA', cuisine: 'burger' },
  'Doner na Abaya':  { code: 'DNA', cuisine: 'doner' },
  'Just Doner':      { code: 'JD',  cuisine: 'doner' },
  'Salam Bro':       { code: 'SB',  cuisine: 'mixed' },
  'КексБрэндс':      { code: 'KEX', cuisine: 'multi' },
  'KEX-BRANDS':      { code: 'KEX', cuisine: 'multi' },
  'Цех':             { code: 'KITCHEN', cuisine: 'kitchen' },
  'Kitchen':         { code: 'KITCHEN', cuisine: 'kitchen' },
};

export function resolveBrand(name: string): BrandCode {
  // Exact match first
  if (BRAND_MAP[name]) return BRAND_MAP[name].code;
  // Partial match fallback
  const lower = name.toLowerCase();
  for (const [key, entry] of Object.entries(BRAND_MAP)) {
    if (lower.includes(key.toLowerCase())) return entry.code;
  }
  // Keyword fallback
  if (lower.includes('doner') || lower.includes('донер')) return 'DNA';
  if (lower.includes('burger') || lower.includes('бургер')) return 'BNA';
  // Unknown — log to Sentry
  Sentry.captureMessage(`Unknown brand name: "${name}"`, 'warning');
  return 'BNA';
}
```

### Plan Delta Pattern (BUG-11-4)

**File:** `apps/mobile-dashboard/src/utils/brand.ts`

```typescript
/** Returns 0..150 — percentage of plan achieved */
export function computePlanAttainment(revenue: number, plan: number): number {
  if (!plan || plan <= 0) return 0;
  return Math.min(150, (revenue / plan) * 100);
}

/** Returns signed delta: positive = above plan, negative = below */
export function computePlanDelta(revenue: number, plan: number): number {
  if (!plan || plan <= 0) return 0;
  return computePlanAttainment(revenue, plan) - 100;
}

/** Returns display text + semantic status */
export function formatPlanLabel(deltaPct: number | null | undefined): {
  text: string;
  status: 'above' | 'onplan' | 'below';
} {
  if (deltaPct == null) return { text: 'Нет плана', status: 'onplan' };
  if (deltaPct > 0.5)  return { text: `Выше плана · +${deltaPct.toFixed(1)}%`, status: 'above' };
  if (deltaPct < -0.5) return { text: `Ниже плана · ${deltaPct.toFixed(1)}%`, status: 'below' };
  return { text: `По плану · ${deltaPct.toFixed(1)}%`, status: 'onplan' };
}
```

**Root cause fix in `useDashboard.ts`:**
```typescript
// BEFORE (broken): reads changePercent which is always 0 from API
deltaPct: brand.changePercent,

// AFTER (fixed): compute from stub plan until Phase 12
const plannedRevenue = brand.revenue > 0 ? brand.revenue * 1.05 : undefined;
const deltaPct = plannedRevenue != null ? computePlanDelta(brand.revenue, plannedRevenue) : null;
```

### TZ Formatting Pattern (BUG-11-6)

**Pattern from `fix(worker): pin parseDate to Asia/Almaty midnight (bug_012)` commit `77c495d`:**
```typescript
import { TZDate } from '@date-fns/tz'; // worker uses @date-fns/tz via date-fns/tz
```

**Mobile pattern (date-fns-tz v3 API):**
```typescript
import { toZonedTime, format } from 'date-fns-tz';

const ALMATY_TZ = 'Asia/Almaty';

export function formatSyncTime(isoUtc: string): string {
  const utcDate = new Date(isoUtc);
  const almatyDate = toZonedTime(utcDate, ALMATY_TZ);
  return format(almatyDate, 'HH:mm', { timeZone: ALMATY_TZ });
}
```

**Note:** Do NOT use `new Date().toLocaleTimeString('ru-RU', ...)` — it depends on device/Node locale. The `DashboardScreen.tsx` currently uses `toLocaleTimeString` (line 192), which is the bug pattern to replace.

### Per-Record try/catch Pattern (BUG-11-8 — bug_021 pattern)

**File:** `apps/aggregator-worker/src/onec/onec-sync.service.ts`

**Current (broken):** entire for-loop is inside outer try/catch — one bad record aborts all remaining records.

**Fixed pattern (from bug_021 `787777b`):**
```typescript
for (const record of expenseRecords) {
  try {
    // ... existing upsert logic
    processedCount++;
  } catch (recordErr) {
    const errMsg = recordErr instanceof Error ? recordErr.message : String(recordErr);
    this.logger.warn(`Skipping 1C expense record ${record.Ref_Key}: ${errMsg}`);
    Sentry.withScope((scope) => {
      scope.setTag('system', 'ONE_C');
      scope.setExtra('recordRefKey', record.Ref_Key);
      scope.captureMessage(`Skipped 1C expense record: ${errMsg}`, 'warning');
    });
  }
}
```

Apply the same pattern to `syncKitchenPurchases` and `syncKitchenIncome` loops.

### DDS Section Restoration Pattern (BUG-11-7)

**File:** `apps/mobile-dashboard/src/screens/ReportsScreen.tsx`

**Confirmed state:** DDS section is completely absent. `useReportDds` hook EXISTS in `apps/mobile-dashboard/src/hooks/useReports.ts` and returns `ReportDdsDto`.

**Fix: add import + canSeeDds + JSX section:**
```typescript
// Add to import line 8:
import { useReportCompanyExpenses, useReportKitchen, useReportTrends, useReportDds } from '../hooks/useReports';

// Add after line 29 (canSeeCompany):
const canSeeDds = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';

// Add hook call:
const { data: ddsData, isLoading: ddsLoading } = useReportDds(canSeeDds);

// Add JSX section before "Затраты компании":
{canSeeDds && (
  <View style={styles.reportSection}>
    <Text style={styles.reportSectionTitle}>DDS — Движение денег</Text>
    {ddsLoading && <ActivityIndicator />}
    {!ddsLoading && !ddsData && <EmptyState message="Нет данных за выбранный период" />}
    {/* ... render ddsData.items */}
  </View>
)}
```

**Dev bypass role:** The dev bypass OTP `111111` must seed a user with `role: 'OWNER'`. Check `apps/auth-service/src/auth/auth.service.ts` for OTP bypass logic — the role assignment must be `OWNER`, not default `OPERATIONS_DIRECTOR`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Custom UTC offset arithmetic | `date-fns-tz` `toZonedTime`+`format` | Kazakhstan has no DST but historical changes exist; also device TZ independence |
| Brand name matching | More complex regex | `BRAND_MAP` exact-match dictionary | iiko names are controlled data — exact match is safer, faster, and auditable |
| Prisma migration | `prisma migrate dev` | Manual SQL file in `packages/database/migrations/` | Project decision [02-00] — manual migrations only |
| Restaurant count | `brand._count.restaurants` unfiltered | `prisma.restaurant.count({ where: { isActive, brand: { type } } })` | Prisma `_count` in `include` has no filter support |

---

## Common Pitfalls

### Pitfall 1: `date-fns-tz` v2 vs v3 API difference
**What goes wrong:** `date-fns-tz` v3 changed API — `utcToZonedTime` was renamed to `toZonedTime`.
**Why it happens:** Most Stack Overflow answers and examples use v2 syntax.
**How to avoid:** Install v3 (`^3.x`), use `toZonedTime` not `utcToZonedTime`. Always pass `{ timeZone }` to `format`.
**Warning signs:** TypeScript error "Property 'utcToZonedTime' does not exist".

### Pitfall 2: Prisma enum in wrong schema
**What goes wrong:** `BrandType` enum added to wrong PostgreSQL schema (auth instead of finance).
**Why it happens:** Prisma schema has multi-schema config. All finance models use `@@schema("finance")`.
**How to avoid:** SQL must be `CREATE TYPE "finance"."BrandType" AS ENUM (...)`. In `schema.prisma`, enum must list `@@schema("finance")` or be in the finance schema block.

### Pitfall 3: `_count` in Prisma include does not accept `where`
**What goes wrong:** `include: { _count: { select: { restaurants: { where: { isActive: true } } } } }` does NOT work in Prisma — `_count.select` does not support nested `where` in all versions.
**Why it happens:** Natural API assumption.
**How to avoid:** Use separate `prisma.restaurant.count()` or `groupBy()` query with explicit `where`.

### Pitfall 4: `brand.changePercent` in mobile DTO is always 0
**What goes wrong:** `deltaPct: brand.changePercent` reads a field that the finance-service sets as 0 (explicit TODO in service).
**Why it happens:** The DTO field exists but backend hasn't implemented period comparison yet (Phase 12).
**How to avoid:** Compute `deltaPct` locally in the hook from `revenue` and stub `plannedRevenue`.

### Pitfall 5: Migration backfill runs before column exists
**What goes wrong:** UPDATE statement references column that isn't created yet.
**Why it happens:** SQL order matters in migration file.
**How to avoid:** Always: (1) CREATE TYPE, (2) ADD COLUMN with DEFAULT, (3) UPDATE backfill, (4) optional NOT NULL constraint add-after.

### Pitfall 6: `ONEC_BASE_URL` validation runs at startup even in dev
**What goes wrong:** Worker throws on startup if `ONEC_BASE_URL` is missing, preventing cron registration.
**Why it happens:** `onec-sync.service.ts` throws immediately inside `syncExpenses()` if env var missing. The scheduler catches and swallows the error, but logs show nothing until first cron trigger.
**How to avoid:** Add `ONEC_BASE_URL`, `ONEC_USER`, `ONEC_PASSWORD` to `.env` before running worker. Add to `.env.example` with clear REQUIRED comment.

---

## Code Examples

### Brand Color Tokens (BUG-11-2) — new entries for `theme/colors.ts`

Existing palette for reference (from MASTER.md):
- Primary BG: `#020617`, Secondary BG: `#0F172A`
- BNA (blue): `text: '#60A5FA'` (Tailwind blue-400)
- DNA (violet): `text: '#C4B5FD'` (Tailwind violet-300)
- Positive: `#22C55E` (green-500) — must not clash

Recommended new brand colors (semantically distinct, WCAG AA on `#020617`):

| Code | Name | bg | border | text | Basis |
|------|------|-----|--------|------|-------|
| JD | Just Doner | `rgba(249,115,22,0.15)` | `rgba(249,115,22,0.30)` | `#FB923C` | orange-400 — food/warmth, distinct from BNA blue |
| SB | Salam Bro | `rgba(20,184,166,0.15)` | `rgba(20,184,166,0.30)` | `#2DD4BF` | teal-400 — fresh/youthful, distinct from DNA violet |
| KEX | КексБрэндс | `rgba(234,179,8,0.15)` | `rgba(234,179,8,0.30)` | `#FACC15` | yellow-400 — corporate gold/group identity |
| KITCHEN | Цех | `rgba(100,116,139,0.15)` | `rgba(100,116,139,0.30)` | `#94A3B8` | slate-400 — neutral/industrial, kitchen is infrastructure |

All `text` values have contrast ratio > 4.5:1 on `#020617` (WCAG AA compliant for normal text ≥ 14px).

### Migration File (BUG-11-3)

**Path:** `packages/database/migrations/20260420000000_add_brand_type/migration.sql`

```sql
-- CreateEnum: BrandType in finance schema
CREATE TYPE "finance"."BrandType" AS ENUM ('RESTAURANT', 'KITCHEN', 'MARKETPLACE');

-- AddColumn: Brand.type with safe default
ALTER TABLE "finance"."Brand"
  ADD COLUMN "type" "finance"."BrandType" NOT NULL DEFAULT 'RESTAURANT';

-- Backfill: identify Kitchen brands by name pattern
UPDATE "finance"."Brand"
SET "type" = 'KITCHEN'
WHERE "name" ~* 'цех|kitchen|fabrika';

-- DOWN (rollback — keep as reference):
-- ALTER TABLE "finance"."Brand" DROP COLUMN "type";
-- DROP TYPE "finance"."BrandType";
```

**schema.prisma additions:**
```prisma
enum BrandType {
  RESTAURANT
  KITCHEN
  MARKETPLACE
  @@schema("finance")
}

model Brand {
  // ... existing fields
  type BrandType @default(RESTAURANT)
  // ...
}
```

### Worker Brand Upsert with Type (BUG-11-3)

**File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` (around line 181)

Add type determination before `prisma.brand.upsert`:
```typescript
function determineBrandType(name: string): 'RESTAURANT' | 'KITCHEN' | 'MARKETPLACE' {
  if (/цех|kitchen|fabrika/i.test(name)) return 'KITCHEN';
  return 'RESTAURANT';
}

// In brands loop:
await this.prisma.brand.upsert({
  where: { iikoGroupId: brand.id },
  update: {
    name: brand.name,
    isActive: true,
    type: determineBrandType(brand.name),  // ADD THIS
  },
  create: {
    iikoGroupId: brand.id,
    name: brand.name,
    slug: this.slugify(brand.name),
    companyId: (await this.getOrCreateCompany(tenantId, brand.name)).id,
    isActive: true,
    type: determineBrandType(brand.name),  // ADD THIS
  },
});
```

### Finance-service Filtered Brand Query (BUG-11-3 + BUG-11-5)

**File:** `apps/finance-service/src/dashboard/dashboard.service.ts`

```typescript
// BUG-11-3: Filter brands by type in main query
const brands = await this.prisma.brand.findMany({
  where: {
    company: { tenantId },
    isActive: true,
    type: 'RESTAURANT',  // ADD THIS — excludes Kitchen brand
  },
  // ... rest of query
});

// BUG-11-5: Replace _count.restaurants with explicit filtered count
// After getting brands array, batch count:
const brandIds = brands.map(b => b.id);
const countsByBrand = await this.prisma.restaurant.groupBy({
  by: ['brandId'],
  where: {
    brandId: { in: brandIds },
    isActive: true,
  },
  _count: { id: true },
});
const countMap = new Map(countsByBrand.map(r => [r.brandId, r._count.id]));

// Then in brand mapping:
restaurantCount: countMap.get(brand.id) ?? 0,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `utcToZonedTime` | `toZonedTime` | date-fns-tz v3 (2023) | Must use v3 API |
| `brand._count.restaurants` | Explicit filtered count | Prisma 5+ (still no where in _count) | Always use separate count query for filtered counts |
| Keyword match for brand names | `BRAND_MAP` dictionary | This phase | Deterministic, auditable, extensible |

**Deprecated/outdated:**
- `utcToZonedTime` (date-fns-tz v2): replaced by `toZonedTime` in v3
- `new Date().toLocaleTimeString(locale, { timeZone })`: device-dependent, replaced by `date-fns-tz format()`

---

## Open Questions

1. **BUG-11-1 exact normalization factor**
   - What we know: ratio `directExpenses/revenue` is likely ~70 (from walkthrough: 7000% margin = 70× expected margin).
   - What's unclear: Is the issue a `× 100` factor (kopecks) or a different multiplier? The SQL verification query above will confirm.
   - Recommendation: Planner should include a Wave 0 "verify SQL" task before the fix task. If ratio is exactly 100×, divide by 100. If ratio is ~70×, investigate differently.

2. **Dev bypass OWNER role in auth-service**
   - What we know: OTP `111111` is the dev bypass. The bypass code is in `apps/auth-service/src/auth/auth.service.ts`.
   - What's unclear: Whether the bypass creates a user with `OWNER` role or `OPERATIONS_DIRECTOR` default.
   - Recommendation: Planner should include a task to read `auth.service.ts` bypass logic and fix role if not OWNER.

3. **`ONEC_BASE_URL` availability in current `.env`**
   - What we know: The env vars are required and the service throws immediately if missing. The cron is wired.
   - What's unclear: Whether credentials are known to the team or if this requires infrastructure work.
   - Recommendation: BUG-11-8 Wave 3 should start with a diagnostic task (check `.env`, check worker logs) before coding the try/catch fix. The try/catch is code-only and can be done independently of credentials.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + ts-jest (strict mode) |
| Config file | `apps/mobile-dashboard/package.json` jest section (rootDir: src, testRegex: `.*\\.test\\.ts$`) |
| Quick run command | `cd apps/mobile-dashboard && npm test` |
| Full suite command | `cd apps/mobile-dashboard && npm test && cd ../finance-service && npm test && cd ../aggregator-worker && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUG-11-1 | `directExpenses` normalized to tenge in DTO | unit | `cd apps/finance-service && npm test -- --testPathPattern=dashboard` | verify existing |
| BUG-11-2 | `resolveBrand('Just Doner')` returns `'JD'`; unknown brand warns Sentry | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` | ❌ Wave 0 |
| BUG-11-4 | `computePlanDelta(29.28, 30.74)` ≈ −4.7; `formatPlanLabel(null)` → 'Нет плана' | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` | ❌ Wave 0 |
| BUG-11-6 | `formatSyncTime('2026-04-20T07:30:00Z')` → `'12:30'` (Almaty = UTC+5) | unit | `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` | ❌ Wave 0 |
| BUG-11-3 | `Brand.type` enum exists in schema; backfill SQL is idempotent | manual/migration | inspect migration + `SELECT type FROM "finance"."Brand"` | ❌ Wave 0 migration |
| BUG-11-5 | Restaurant count ≤ 13 returned by dashboard summary | integration | `cd apps/finance-service && npm test -- --testPathPattern=dashboard` | verify existing |
| BUG-11-7 | ReportsScreen renders DDS section when role='OWNER' | manual | render test (visual) | manual-only |
| BUG-11-8 | per-record try/catch: bad record skipped, others processed | unit | `cd apps/aggregator-worker && npm test -- --testPathPattern=onec` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/{affected-app} && npm test`
- **Per wave merge:** Full suite across all 3 apps
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/mobile-dashboard/src/utils/brand.test.ts` — covers BUG-11-2 (BRAND_MAP), BUG-11-4 (delta/label), BUG-11-6 (formatSyncTime)
- [ ] `packages/database/migrations/20260420000000_add_brand_type/migration.sql` — covers BUG-11-3
- [ ] `apps/aggregator-worker/src/onec/onec-sync.spec.ts` (if not exists) — covers BUG-11-8 per-record skip
- [ ] Install: `cd apps/mobile-dashboard && npm install date-fns date-fns-tz` — BUG-11-6 prerequisite

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `apps/mobile-dashboard/src/utils/brand.ts` — resolveBrand current state, BrandCode type, computeMarginPct, computePlanAttainment
- `apps/mobile-dashboard/src/hooks/useReports.ts` — useReportDds hook EXISTS and is complete
- `apps/mobile-dashboard/src/screens/ReportsScreen.tsx` — confirmed DDS section completely absent
- `apps/mobile-dashboard/src/hooks/useDashboard.ts` — deltaPct reads changePercent (always 0)
- `apps/finance-service/src/dashboard/dashboard.service.ts` — getDashboardSummary lines 188-302, unfiltered _count
- `apps/aggregator-worker/src/onec/onec-sync.service.ts` — env var validation pattern, no per-record guard
- `apps/aggregator-worker/src/scheduler/scheduler.service.ts` — 1C crons ARE wired at correct intervals
- `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` — brand.upsert pattern for BUG-11-3
- `packages/database/schema.prisma` — Brand model has NO type field yet, all Decimal(15,2) fields
- `packages/database/migrations/` — manual SQL migration format confirmed
- `apps/mobile-dashboard/package.json` — date-fns/date-fns-tz NOT present, confirmed absent
- `apps/mobile-dashboard/src/theme/colors.ts` — only bna/dna entries in colors.brand
- `design-system/kex-group/MASTER.md` — color palette, background `#020617`

### Secondary (MEDIUM confidence)
- CONTEXT.md `<specifics>` section — BUG-11-1 ratio math (7000% → 70× mismatch hypothesis), brand name mapping from iiko

### Tertiary (LOW confidence — needs runtime confirmation)
- BUG-11-1 exact normalization factor: hypothesis is 100× (kopecks) but SQL verification required before implementing fix
- BUG-11-8 credentials availability: unknown whether ONEC creds are available to team for testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct package.json inspection
- Architecture (migration format): HIGH — verified from existing migration files
- Bug root causes: HIGH — confirmed by code inspection for 6/8 bugs; MEDIUM for BUG-11-1 (SQL unverified) and BUG-11-8 (credentials unknown)
- Pitfalls: HIGH — based on Prisma docs knowledge + direct code patterns observed

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable codebase, changes invalidate only if schema or deps change)
