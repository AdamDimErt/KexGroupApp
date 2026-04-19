import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { businessDaysInRange } from '../utils/date';

@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runAllocation(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      // Split the input window into discrete Almaty calendar days so that
      // periodStart/periodEnd in the upsert key are always day boundaries.
      // This makes the composite unique key (restaurantId, expenseId,
      // periodStart, periodEnd) deterministic across every hourly cron run
      // that covers the same calendar day — upsert goes to the update path
      // instead of creating a new row each hour.
      const days = businessDaysInRange(dateFrom, dateTo);
      let totalAllocationCount = 0;

      for (const { dayStart, dayEnd } of days) {
        const count = await this.runAllocationForDay(dayStart, dayEnd);
        totalAllocationCount += count;
      }

      const durationMs = Date.now() - startTime;
      await this.logAllocation(
        tenantId,
        'SUCCESS',
        totalAllocationCount,
        durationMs,
      );
      this.logger.log(
        `Cost allocation completed: ${totalAllocationCount} records upserted across ${days.length} day(s)`,
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logAllocation(
        tenantId,
        'ERROR',
        undefined,
        durationMs,
        errorMessage,
      );
      this.logger.error(`Cost allocation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Allocate expenses for a single Almaty calendar day.
   * periodStart and periodEnd are already truncated to day boundaries,
   * so repeated calls for the same day hit the upsert update-path.
   */
  private async runAllocationForDay(
    dayStart: Date,
    dayEnd: Date,
  ): Promise<number> {
    // Get all unallocated expenses (restaurantId = null, allocationType = DISTRIBUTED)
    const unallocatedExpenses = await this.prisma.expense.findMany({
      where: {
        restaurantId: null,
        article: {
          allocationType: 'DISTRIBUTED',
        },
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        article: true,
      },
    });

    if (unallocatedExpenses.length === 0) {
      this.logger.debug(
        `No unallocated expenses for day ${dayStart.toISOString()} – ${dayEnd.toISOString()}`,
      );
      return 0;
    }

    // Get all restaurants and their total revenue for the day
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: {
        snapshots: {
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        },
      },
    });

    // Calculate total revenue across all restaurants for this day
    let totalRevenue = 0;
    const restaurantRevenue = new Map<string, number>();

    for (const restaurant of restaurants) {
      let revenue = 0;
      for (const snapshot of restaurant.snapshots) {
        revenue += Number(snapshot.revenue);
      }
      restaurantRevenue.set(restaurant.id, revenue);
      totalRevenue += revenue;
    }

    if (totalRevenue === 0) {
      this.logger.warn(
        `Total revenue is 0 for day ${dayStart.toISOString()}, skipping allocation`,
      );
      return 0;
    }

    let allocationCount = 0;

    for (const expense of unallocatedExpenses) {
      for (const restaurant of restaurants) {
        const restRevenue = restaurantRevenue.get(restaurant.id) || 0;

        // coefficient = restaurant_revenue / total_revenue (Decimal precision 10,6)
        const coefficient =
          restRevenue === 0 ? 0 : restRevenue / totalRevenue;
        // Round coefficient to 6 decimal places (matches Decimal(10,6))
        const coefficientDecimal = new Prisma.Decimal(coefficient.toFixed(6));

        // allocated_amount = original_amount × coefficient (Decimal precision 15,2)
        const originalAmount = new Prisma.Decimal(expense.amount.toString());
        const allocatedAmount = new Prisma.Decimal(
          (Number(originalAmount) * coefficient).toFixed(2),
        );

        // Upsert by the deterministic day-boundary key.
        // All hourly cron runs on the same Almaty calendar day produce the
        // same (periodStart, periodEnd) pair, so this always hits update.
        await this.prisma.costAllocation.upsert({
          where: {
            restaurantId_expenseId_periodStart_periodEnd: {
              restaurantId: restaurant.id,
              expenseId: expense.id,
              periodStart: dayStart,
              periodEnd: dayEnd,
            },
          },
          update: {
            coefficient: coefficientDecimal,
            allocatedAmount,
          },
          create: {
            restaurantId: restaurant.id,
            expenseId: expense.id,
            periodStart: dayStart,
            periodEnd: dayEnd,
            coefficient: coefficientDecimal,
            originalAmount: expense.amount,
            allocatedAmount,
          },
        });

        allocationCount++;
      }
    }

    return allocationCount;
  }

  private async logAllocation(
    tenantId: string,
    status: 'SUCCESS' | 'ERROR',
    recordsCount?: number,
    durationMs?: number,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.syncLog.create({
        data: {
          tenantId,
          system: 'IIKO', // Use IIKO as default system for allocation logs
          status,
          recordsCount,
          durationMs,
          errorMessage,
          businessDate: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log allocation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
