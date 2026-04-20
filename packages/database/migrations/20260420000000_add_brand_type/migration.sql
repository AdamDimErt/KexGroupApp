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
