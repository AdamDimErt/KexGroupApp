---
phase: 11-bug-fix-pack-post-walkthrough
plan: "00"
subsystem: prereqs
tags: [wave0, deps, migration, test-stubs, env-docs]
dependency_graph:
  requires: []
  provides:
    - "date-fns@^3 + date-fns-tz@^3 in apps/mobile-dashboard"
    - "brand.test.ts RED stubs for BUG-11-2, BUG-11-4, BUG-11-6"
    - "BrandType enum in schema.prisma + migration SQL"
    - "ONEC_BASE_URL/USER/PASSWORD documented in .env.example"
    - "onec-sync.service.spec.ts BUG-11-8 describe scaffold"
  affects:
    - "apps/mobile-dashboard (Wave 2 can now import date-fns-tz + run brand.test.ts)"
    - "packages/database (Wave 1 finance-service + Wave 3 worker have BrandType in Prisma client)"
    - "apps/aggregator-worker (Wave 3 fills RED stubs with real assertions)"
tech_stack:
  added:
    - "date-fns@^3.6.0 (runtime dep in mobile-dashboard)"
    - "date-fns-tz@^3.2.0 (runtime dep in mobile-dashboard)"
  patterns:
    - "Manual SQL migration (no prisma migrate dev) per decision 02-00"
    - "RED test stubs with expect(true).toBe(false) for Wave 2/3 to turn GREEN"
key_files:
  created:
    - "apps/mobile-dashboard/src/utils/brand.test.ts"
    - "packages/database/migrations/20260420000000_add_brand_type/migration.sql"
  modified:
    - "apps/mobile-dashboard/package.json"
    - "packages/database/schema.prisma"
    - ".env.example"
    - "apps/aggregator-worker/src/onec/onec-sync.service.spec.ts"
decisions:
  - "date-fns v3 API (toZonedTime not utcToZonedTime) — avoids v2/v3 breakage per Pitfall 1 in RESEARCH.md"
  - "BrandType enum in finance schema (not auth) per Pitfall 2 in RESEARCH.md"
  - "Migration order: CREATE TYPE → ADD COLUMN with DEFAULT → UPDATE backfill (Pitfall 5 order)"
  - "Legacy ONEC_REST_* vars kept in .env.example as DEPRECATED for back-compat"
  - "expect(true).toBe(false) RED sentinel — forces Wave 3 to write real assertions before tests pass"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-04-20"
  tasks_completed: 5
  tasks_total: 5
  files_created: 3
  files_modified: 4
---

# Phase 11 Plan 00: Wave 0 Prerequisites Summary

**One-liner:** Wave 0 scaffolding — date-fns v3 installed, RED test stubs for 3 mobile bugs, BrandType Prisma migration, ONEC env var documentation, and per-record try/catch test skeleton.

## What Was Done

Wave 0 created all prerequisite artifacts that downstream waves depend on. No production code was changed — only dependencies, stubs, schema-level artifacts, and documentation.

### Task 1: Install date-fns@^3 + date-fns-tz@^3 (commit a3aa523)

Installed both libraries to `apps/mobile-dashboard/package.json` under `dependencies` (not devDependencies — runtime use in src/utils/brand.ts). Versions: `date-fns@3.6.0`, `date-fns-tz@3.2.0`. v3 API uses `toZonedTime` (not deprecated `utcToZonedTime`).

### Task 2: brand.test.ts RED stubs (commit 177b268)

Created `apps/mobile-dashboard/src/utils/brand.test.ts` with 4 describe blocks:
- **BUG-11-2:** 8 tests for resolveBrand BRAND_MAP (all 6 brands: BNA/DNA/JD/SB/KEX/KITCHEN + keyword fallbacks)
- **BUG-11-4:** 9 tests for computePlanDelta + formatPlanLabel (BNA real values 29.28M/30.74M ≈ −4.7%, threshold ±0.5%)
- **BUG-11-6:** 4 tests for formatSyncTime Asia/Almaty UTC+5 (process.env.TZ independence test)
- **BUG-11-2:** BrandCode type accepts all 6 codes

Tests import `computePlanDelta`, `formatPlanLabel`, `formatSyncTime` which do not yet exist in brand.ts — TypeScript compile fails intentionally until Wave 2 adds them.

### Task 3: BrandType Prisma migration + schema (commit 95d1124)

Created `packages/database/migrations/20260420000000_add_brand_type/migration.sql`:
```sql
CREATE TYPE "finance"."BrandType" AS ENUM ('RESTAURANT', 'KITCHEN', 'MARKETPLACE');
ALTER TABLE "finance"."Brand" ADD COLUMN "type" "finance"."BrandType" NOT NULL DEFAULT 'RESTAURANT';
UPDATE "finance"."Brand" SET "type" = 'KITCHEN' WHERE "name" ~* 'цех|kitchen|fabrika';
```

Updated `packages/database/schema.prisma`: added `enum BrandType { ... @@schema("finance") }` and `type BrandType @default(RESTAURANT)` to Brand model. Ran `prisma generate` — `BrandType` now in `.prisma/client` type definitions. `prisma validate` passes cleanly.

### Task 4: .env.example ONEC canonical vars (commit 956c453)

Replaced 1C section with canonical var names `ONEC_BASE_URL`, `ONEC_USER`, `ONEC_PASSWORD` (marked REQUIRED) that `onec-sync.service.ts` actually reads. Kept legacy `ONEC_REST_URL/USER/PASS` as DEPRECATED back-compat aliases. Root cause of BUG-11-8 was that operators configured the wrong names because the old docs listed incorrect variable names.

### Task 5: onec-sync BUG-11-8 describe scaffold (commit 9acae77)

Appended `describe('BUG-11-8 · per-record try/catch in syncExpenses', ...)` to existing `onec-sync.service.spec.ts`. Added 3 RED stubs with `expect(true).toBe(false)` covering: skip-bad-record scenario, warn+Sentry.withScope per skipped record, and Sentry scope tag verification. Mirrors bug_021 pattern (commit 787777b). Existing 5 tests preserved (file grew from 213 to 250 lines).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a3aa523 | chore(11-00): install date-fns@^3 and date-fns-tz@^3 in mobile-dashboard |
| 2 | 177b268 | test(11-00): add failing test stubs for BUG-11-2, BUG-11-4, BUG-11-6 in brand.test.ts |
| 3 | 95d1124 | chore(11-00): add BrandType enum to Prisma schema + migration SQL (BUG-11-3) |
| 4 | 956c453 | chore(11-00): document canonical ONEC env vars in .env.example (BUG-11-8) |
| 5 | 9acae77 | test(11-00): scaffold BUG-11-8 per-record try/catch describe block in onec-sync.spec.ts |

## Deviations from Plan

None — plan executed exactly as written. All 5 tasks completed in order. Schema validate passed on first attempt.

## Notes for Downstream Waves

- **Wave 1 (finance-service):** `BrandType` available in Prisma client — can use `type: 'RESTAURANT'` filter in `getBrandSummaries()` immediately
- **Wave 2 (mobile utils):** `brand.test.ts` is waiting — run `npm test` after implementing `computePlanDelta`, `formatPlanLabel`, `formatSyncTime` to turn RED → GREEN
- **Wave 3 (worker):** `onec-sync.service.spec.ts` has 3 RED stubs — replace `expect(true).toBe(false)` with real mock assertions after adding per-record try/catch to `syncExpenses()`
- **DB migration:** `migration.sql` must be applied manually when DB is available (`npx prisma migrate resolve --applied 20260420000000_add_brand_type`)

## Self-Check: PASSED
