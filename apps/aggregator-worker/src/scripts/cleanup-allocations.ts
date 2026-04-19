/**
 * Standalone cleanup script: deduplicate pre-existing CostAllocation rows
 * that were created with full-timestamp periodStart/periodEnd (bug_021).
 *
 * Run ONCE manually after deploying the fix:
 *   npx tsx src/scripts/cleanup-allocations.ts
 *
 * Safe to run multiple times (idempotent).
 * Does NOT modify schema or touch any other table.
 */

import { PrismaClient } from '@prisma/client';
import { startOfBusinessDay, endOfBusinessDay } from '../utils/date';

const prisma = new PrismaClient();

async function main() {
  console.log('CostAllocation deduplication — starting');

  // Load every row. The table should be small (expenses × restaurants × days).
  const all = await prisma.costAllocation.findMany({
    orderBy: [{ periodStart: 'asc' }, { createdAt: 'asc' }],
  });

  console.log(`Total rows found: ${all.length}`);

  // Group rows by (restaurantId, expenseId, almatyDay).
  // Rows that already sit on day boundaries will land in the same bucket as
  // the dirty rows for the same logical day.
  type BucketKey = string;
  const buckets = new Map<BucketKey, typeof all>();

  for (const row of all) {
    const dayStart = startOfBusinessDay(row.periodStart);
    const key: BucketKey = `${row.restaurantId}||${row.expenseId}||${dayStart.toISOString()}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  let deletedTotal = 0;
  let updatedTotal = 0;

  for (const [, rows] of buckets) {
    if (rows.length === 0) continue;

    // The canonical boundaries for this bucket
    const dayStart = startOfBusinessDay(rows[0].periodStart);
    const dayEnd = endOfBusinessDay(rows[0].periodStart);

    // Sort descending by createdAt so the newest (most accurate) row is first
    rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const [keeper, ...duplicates] = rows;

    // Normalise the keeper's period boundaries if they are not already clean
    const keeperNeedsUpdate =
      keeper.periodStart.getTime() !== dayStart.getTime() ||
      keeper.periodEnd.getTime() !== dayEnd.getTime();

    if (keeperNeedsUpdate) {
      await prisma.costAllocation.update({
        where: { id: keeper.id },
        data: { periodStart: dayStart, periodEnd: dayEnd },
      });
      updatedTotal++;
    }

    if (duplicates.length > 0) {
      await prisma.costAllocation.deleteMany({
        where: { id: { in: duplicates.map((r) => r.id) } },
      });
      deletedTotal += duplicates.length;
    }
  }

  console.log(`Done. Rows updated: ${updatedTotal}, rows deleted: ${deletedTotal}`);
  console.log(`Remaining rows: ${all.length - deletedTotal}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
