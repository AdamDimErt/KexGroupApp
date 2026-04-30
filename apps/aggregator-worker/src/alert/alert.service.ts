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

  // Tunables loaded from env (with safe defaults). Keep all magic numbers here.
  readonly cooldownMs: number;
  private readonly lowRevenueRatio: number;
  private readonly largeExpenseThreshold: number;
  private readonly syncFailureMs: number;
  private readonly revenueAvgDays: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    this.cooldownMs =
      Number(this.config.get<string>('ALERT_COOLDOWN_HOURS') ?? '4') *
      60 *
      60 *
      1000;
    this.lowRevenueRatio =
      Number(this.config.get<string>('ALERT_LOW_REVENUE_PERCENT') ?? '70') /
      100;
    this.largeExpenseThreshold = Number(
      this.config.get<string>('ALERT_LARGE_EXPENSE_AMOUNT') ?? '500000',
    );
    this.syncFailureMs =
      Number(this.config.get<string>('ALERT_SYNC_FAILURE_MINUTES') ?? '60') *
      60 *
      1000;
    this.revenueAvgDays = Number(
      this.config.get<string>('ALERT_REVENUE_AVG_DAYS') ?? '30',
    );
  }

  // ─── Check sync health ─────────────────────────────────────────────────────
  async checkSyncHealth(system: 'IIKO' | 'ONE_C'): Promise<void> {
    try {
      const lastSuccess = await this.prisma.syncLog.findFirst({
        where: { system, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      });
      const cutoff = new Date(Date.now() - this.syncFailureMs);
      if (!lastSuccess || lastSuccess.createdAt < cutoff) {
        const key = `alert:SYNC_FAILURE:${system}`;
        if (await this.shouldFireAlert(key)) {
          await this.fireAlert('SYNC_FAILURE', {
            system,
            error: `No successful ${system} sync in over ${this.syncFailureMs / 60000} minutes`,
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

        const windowStart = new Date(today);
        windowStart.setDate(today.getDate() - this.revenueAvgDays);
        const { _avg } = await this.prisma.financialSnapshot.aggregate({
          where: {
            restaurantId: restaurant.id,
            date: { gte: windowStart, lt: today },
          },
          _avg: { revenue: true },
        });
        const avg = Number(_avg.revenue ?? 0);
        if (avg === 0) continue; // not enough history

        const threshold = avg * this.lowRevenueRatio;
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
      const largeExpenses = await this.prisma.expense.findMany({
        where: {
          createdAt: { gte: since },
          amount: { gt: this.largeExpenseThreshold },
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
    await this.redis.set(key, '1', 'PX', this.cooldownMs);
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
