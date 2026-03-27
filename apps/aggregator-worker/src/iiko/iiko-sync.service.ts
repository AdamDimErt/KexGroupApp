import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { IikoAuthService } from './iiko-auth.service';
import { firstValueFrom } from 'rxjs';
// Decimal type is handled by Prisma internally, use type coercion

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
}

@Injectable()
export class IikoSyncService {
  private readonly logger = new Logger(IikoSyncService.name);
  private readonly baseUrl = 'https://api-ru.iiko.services/api/1';
  private readonly httpTimeout = 30000;
  private readonly maxFailures = 3;
  private readonly circuitBreakerResetMs = 15 * 60 * 1000; // 15 minutes

  private circuitBreakerStates = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly iikoAuth: IikoAuthService,
  ) {}

  async syncOrganizations(): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const token = await this.iikoAuth.getAccessToken();
      const response = await this.makeRequest('GET', '/organizations', undefined, token);

      const organizations = response.organizations || [];
      const groups = response.groups || [];

      // Process brands (grupos/groups)
      for (const group of groups) {
        await this.prisma.brand.upsert({
          where: { iikoGroupId: group.id },
          update: {
            name: group.name,
            isActive: group.isActive ?? true,
          },
          create: {
            iikoGroupId: group.id,
            name: group.name,
            slug: this.slugify(group.name),
            companyId: (await this.getOrCreateCompany(tenantId, group.name)).id,
            isActive: group.isActive ?? true,
          },
        });
      }

      // Process restaurants (organizations)
      for (const org of organizations) {
        const groupId = org.group?.id;
        if (!groupId) {
          this.logger.warn(`Organization ${org.id} has no group, skipping`);
          continue;
        }

        const brand = await this.prisma.brand.findUnique({
          where: { iikoGroupId: groupId },
        });

        if (!brand) {
          this.logger.warn(`Brand not found for group ${groupId}, skipping org ${org.id}`);
          continue;
        }

        await this.prisma.restaurant.upsert({
          where: { iikoId: org.id },
          update: {
            name: org.name,
            isActive: org.isActive ?? true,
          },
          create: {
            iikoId: org.id,
            brandId: brand.id,
            name: org.name,
            isActive: org.isActive ?? true,
          },
        });
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', groups.length + organizations.length, durationMs);
      this.logger.log(`✓ Synced ${organizations.length} restaurants and ${groups.length} brands`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync organizations: ${errorMessage}`);
      throw error;
    }
  }

  async syncRevenue(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const token = await this.iikoAuth.getAccessToken();

      // Get all active restaurants
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: { brand: { include: { company: true } } },
      });

      if (restaurants.length === 0) {
        this.logger.log('No restaurants found, skipping revenue sync');
        return;
      }

      const organizationIds = restaurants.map(r => r.iikoId).filter(Boolean);

      if (organizationIds.length === 0) {
        this.logger.log('No iikoIds found, skipping revenue sync');
        return;
      }

      const payload = {
        organizationIds,
        reportType: 'SALES',
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
        rowGroupFields: ['paymentType', 'restaurantId'],
        aggregateFields: ['revenue', 'salesCount'],
      };

      const response = await this.makeRequest('POST', '/reports/olap', payload, token);

      // Process revenue rows
      const rows = response.data?.rows || [];
      let processedCount = 0;

      for (const row of rows) {
        const restaurantId = row.rowLabels?.[1]; // restaurantId is second label
        const paymentType = row.rowLabels?.[0]; // paymentType is first label
        const amount = row.aggregates?.[0] || 0; // revenue

        if (!restaurantId) continue;

        const restaurant = restaurants.find(r => r.iikoId === restaurantId);
        if (!restaurant) continue;

        // Update daily snapshot with payment type breakdown
        const date = new Date(dateFrom);
        const fieldMap: Record<string, string> = {
          cash: 'revenueCash',
          KASPI: 'revenueKaspi',
          HALYK: 'revenueHalyk',
          YANDEX: 'revenueYandex',
        };

        const updateData: Record<string, any> = {
          revenue: { increment: amount },
        };

        if (fieldMap[paymentType]) {
          updateData[fieldMap[paymentType]] = { increment: amount };
        }

        await this.prisma.financialSnapshot.upsert({
          where: {
            restaurantId_date: {
              restaurantId: restaurant.id,
              date,
            },
          },
          update: updateData,
          create: {
            restaurantId: restaurant.id,
            date,
            revenue: amount,
            ...(fieldMap[paymentType] && { [fieldMap[paymentType]]: amount }),
          },
        });

        processedCount++;
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced revenue for ${processedCount} records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync revenue: ${errorMessage}`);
      throw error;
    }
  }

  async syncExpenses(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const token = await this.iikoAuth.getAccessToken();

      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: { brand: { include: { company: true } } },
      });

      const restaurantIds = restaurants.map(r => r.iikoId).filter(Boolean);
      if (restaurantIds.length === 0) {
        this.logger.log('No restaurants found, skipping expense sync');
        return;
      }

      const organizations = [...new Set(restaurants.map(r => r.brand.companyId))];

      const payload = {
        organizationIds: organizations,
        restaurantIds,
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
        groupBy: ['restaurantId', 'articleId', 'date'],
      };

      const response = await this.makeRequest('POST', '/reports/expenses', payload, token);

      const expenses = response.data || [];
      let processedCount = 0;

      for (const expense of expenses) {
        const restaurantIikoId = expense.restaurantId;
        const articleCode = expense.articleId;
        const amount = expense.amount;
        const expenseDate = new Date(expense.date);

        if (!restaurantIikoId || !articleCode) continue;

        const restaurant = restaurants.find(r => r.iikoId === restaurantIikoId);
        if (!restaurant) continue;

        // Get or create article
        let article = await this.prisma.ddsArticle.findFirst({
          where: { code: articleCode },
        });

        if (!article) {
          // Create default group and article
          const group = await this.prisma.ddsArticleGroup.upsert({
            where: { tenantId_code: { tenantId, code: 'default' } },
            update: {},
            create: { tenantId, code: 'default', name: 'Default' },
          });

          article = await this.prisma.ddsArticle.create({
            data: {
              groupId: group.id,
              code: articleCode,
              name: articleCode,
              source: 'IIKO',
              allocationType: 'DIRECT',
            },
          });
        }

        const syncId = `iiko:expense:${restaurantIikoId}:${articleCode}:${expenseDate.toISOString()}`;

        await this.prisma.expense.upsert({
          where: { syncId },
          update: { amount },
          create: {
            syncId,
            articleId: article.id,
            restaurantId: restaurant.id,
            date: expenseDate,
            amount,
            source: 'IIKO',
          },
        });

        processedCount++;

        // Update snapshot direct expenses
        await this.prisma.financialSnapshot.update({
          where: {
            restaurantId_date: {
              restaurantId: restaurant.id,
              date: expenseDate,
            },
          },
          data: {
            directExpenses: {
              increment: amount,
            },
          },
        });
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced ${processedCount} expense records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync expenses: ${errorMessage}`);
      throw error;
    }
  }

  async syncCashDiscrepancies(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const token = await this.iikoAuth.getAccessToken();

      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: { brand: { include: { company: true } } },
      });

      const organizationIds = [...new Set(restaurants.map(r => r.brand.companyId))];

      if (organizationIds.length === 0) {
        this.logger.log('No organizations found, skipping cash discrepancies sync');
        return;
      }

      const payload = {
        organizationIds,
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
        includeClosedShifts: true,
      };

      const response = await this.makeRequest('POST', '/reports/cash_discrepancies', payload, token);

      const discrepancies = response.data || [];
      let processedCount = 0;

      for (const disc of discrepancies) {
        const restaurantIikoId = disc.restaurantId;
        const discDate = new Date(disc.date);
        const discrepancy = disc.discrepancy || 0;
        const expectedAmount = disc.expectedAmount || 0;
        const actualAmount = expectedAmount + discrepancy;

        if (!restaurantIikoId) continue;

        const restaurant = restaurants.find(r => r.iikoId === restaurantIikoId);
        if (!restaurant) continue;

        const syncId = `iiko:cash:${restaurantIikoId}:${discDate.toISOString()}`;

        await this.prisma.cashDiscrepancy.upsert({
          where: { syncId },
          update: {
            difference: discrepancy,
            actual: actualAmount,
          },
          create: {
            syncId,
            restaurantId: restaurant.id,
            date: discDate,
            expected: expectedAmount,
            actual: actualAmount,
            difference: discrepancy,
          },
        });

        processedCount++;
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced ${processedCount} cash discrepancy records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync cash discrepancies: ${errorMessage}`);
      throw error;
    }
  }

  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    token?: string,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let response;

        if (method === 'GET') {
          response = await firstValueFrom(
            this.httpService.get(url, { headers, timeout: this.httpTimeout })
          );
        } else {
          response = await firstValueFrom(
            this.httpService.post(url, data, { headers, timeout: this.httpTimeout })
          );
        }

        return response.data;
      } catch (error) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `${method} ${endpoint} failed (attempt ${attempt + 1}): ${error instanceof Error ? error.message : String(error)}`
        );

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          throw error;
        }
      }
    }
  }

  private async getOrCreateCompany(tenantId: string, name: string) {
    return this.prisma.company.upsert({
      where: { id: `company:${tenantId}:${name}` },
      update: {},
      create: {
        tenantId,
        name,
      },
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async logSync(
    tenantId: string,
    system: 'IIKO' | 'ONE_C',
    status: 'SUCCESS' | 'ERROR',
    recordsCount?: number,
    durationMs?: number,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.syncLog.create({
        data: {
          tenantId,
          system,
          status,
          recordsCount,
          durationMs,
          errorMessage,
          businessDate: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log sync: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
