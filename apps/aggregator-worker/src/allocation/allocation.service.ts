import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runAllocation(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      // Get all unallocated expenses (restaurantId = null, allocationType = DISTRIBUTED)
      const unallocatedExpenses = await this.prisma.expense.findMany({
        where: {
          restaurantId: null,
          article: {
            allocationType: 'DISTRIBUTED',
          },
          date: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        include: {
          article: true,
        },
      });

      if (unallocatedExpenses.length === 0) {
        this.logger.log('No unallocated expenses found for distribution');
        return;
      }

      // Get all restaurants and their total revenue for the period
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: {
          snapshots: {
            where: {
              date: {
                gte: dateFrom,
                lte: dateTo,
              },
            },
          },
        },
      });

      // Calculate total revenue across all restaurants
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
        this.logger.warn('Total revenue is 0, cannot allocate expenses');
        return;
      }

      // Allocate each unallocated expense
      let allocationCount = 0;

      for (const expense of unallocatedExpenses) {
        for (const restaurant of restaurants) {
          const restRevenue = restaurantRevenue.get(restaurant.id) || 0;

          // coefficient = restaurant_revenue / total_revenue
          const coefficient = restRevenue === 0 ? 0 : restRevenue / totalRevenue;

          // allocated_amount = original_amount × coefficient
          const allocatedAmount = Number(expense.amount) * coefficient;

          // Create cost allocation record
          await this.prisma.costAllocation.upsert({
            where: {
              restaurantId_expenseId_periodStart_periodEnd: {
                restaurantId: restaurant.id,
                expenseId: expense.id,
                periodStart: dateFrom,
                periodEnd: dateTo,
              },
            },
            update: {
              coefficient: coefficient.toString(),
              allocatedAmount: allocatedAmount.toString(),
            },
            create: {
              restaurantId: restaurant.id,
              expenseId: expense.id,
              periodStart: dateFrom,
              periodEnd: dateTo,
              coefficient: coefficient.toString(),
              originalAmount: expense.amount,
              allocatedAmount: allocatedAmount.toString(),
            },
          });

          allocationCount++;
        }
      }

      const durationMs = Date.now() - startTime;
      await this.logAllocation(tenantId, 'SUCCESS', allocationCount, durationMs);
      this.logger.log(`✓ Cost allocation completed: ${allocationCount} records created`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logAllocation(tenantId, 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Cost allocation failed: ${errorMessage}`);
      throw error;
    }
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
        `Failed to log allocation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
