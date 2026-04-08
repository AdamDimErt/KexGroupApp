import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly redis: Redis;
  readonly COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  // ─── Check sync health ─────────────────────────────────────────────────────
  async checkSyncHealth(system: 'IIKO' | 'ONE_C'): Promise<void> {
    try {
      const lastSuccess = await this.prisma.syncLog.findFirst({
        where: { system, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      });
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (!lastSuccess || lastSuccess.createdAt < oneHourAgo) {
        const key = `alert:SYNC_FAILURE:${system}`;
        if (await this.shouldFireAlert(key)) {
          await this.fireAlert('SYNC_FAILURE', {
            system,
            error: `No successful ${system} sync in over 1 hour`,
          });
        }
      }
    } catch (e) {
      this.logger.warn(`checkSyncHealth failed: ${e}`);
    }
  }

  // ─── Check revenue thresholds ──────────────────────────────────────────────
  async checkRevenueThresholds(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const restaurant of restaurants) {
        const todaySnapshot = await this.prisma.financialSnapshot.findFirst({
          where: { restaurantId: restaurant.id, date: today },
        });
        if (!todaySnapshot) continue;

        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const { _avg } = await this.prisma.financialSnapshot.aggregate({
          where: {
            restaurantId: restaurant.id,
            date: { gte: thirtyDaysAgo, lt: today },
          },
          _avg: { revenue: true },
        });
        const avg = Number(_avg.revenue ?? 0);
        if (avg === 0) continue; // not enough history

        const threshold = avg * 0.7;
        const todayRevenue = Number(todaySnapshot.revenue);
        if (todayRevenue < threshold) {
          const key = `alert:LOW_REVENUE:${restaurant.id}`;
          if (await this.shouldFireAlert(key)) {
            await this.fireAlert('LOW_REVENUE', {
              restaurantName: restaurant.name,
              amount: todayRevenue,
              threshold,
            });
          }
        }
      }
    } catch (e) {
      this.logger.warn(`checkRevenueThresholds failed: ${e}`);
    }
  }

  // ─── Check large expenses ──────────────────────────────────────────────────
  async checkLargeExpenses(since: Date): Promise<void> {
    try {
      const thresholdKzt = Number(
        this.config.get<string>('LARGE_EXPENSE_THRESHOLD_KZT') ?? '500000',
      );

      const largeExpenses = await this.prisma.expense.findMany({
        where: {
          createdAt: { gte: since },
          amount: { gt: thresholdKzt },
        },
        include: {
          restaurant: { select: { name: true } },
          article: { select: { name: true } },
        },
      });

      for (const exp of largeExpenses) {
        const key = `alert:LARGE_EXPENSE:${exp.id}`;
        if (await this.shouldFireAlert(key)) {
          await this.fireAlert('LARGE_EXPENSE', {
            restaurantName: exp.restaurant?.name ?? 'Unknown',
            articleName: exp.article?.name ?? 'Unknown',
            amount: Number(exp.amount),
          });
        }
      }
    } catch (e) {
      this.logger.warn(`checkLargeExpenses failed: ${e}`);
    }
  }

  // ─── Deduplication via Redis TTL ───────────────────────────────────────────
  async shouldFireAlert(key: string): Promise<boolean> {
    const existing = await this.redis.get(key);
    if (existing) return false;
    await this.redis.set(key, '1', 'PX', this.COOLDOWN_MS);
    return true;
  }

  // ─── Fire alert to api-gateway ─────────────────────────────────────────────
  private async fireAlert(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const gatewayUrl =
      this.config.get<string>('API_GATEWAY_URL') ?? 'http://localhost:3000';
    const secret = this.config.get<string>('INTERNAL_API_SECRET') ?? '';
    const url = `${gatewayUrl}/internal/notifications/trigger`;

    try {
      await firstValueFrom(
        this.httpService.post(url, { type, payload }, {
          headers: { 'x-internal-secret': secret },
          timeout: 5000,
        }),
      );
      this.logger.log(`Alert dispatched: ${type}`);
    } catch (e) {
      // Fire-and-forget: log but NEVER block sync
      this.logger.warn(`Alert dispatch failed for ${type}: ${e}`);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
