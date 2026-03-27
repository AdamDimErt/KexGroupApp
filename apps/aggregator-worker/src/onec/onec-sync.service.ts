import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OneCyncService {
  private readonly logger = new Logger(OneCyncService.name);
  private readonly httpTimeout = 30000;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async syncExpenses(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const baseUrl = process.env.ONEC_BASE_URL;
      if (!baseUrl) {
        throw new Error('ONEC_BASE_URL is not set');
      }

      const username = process.env.ONEC_USER;
      const password = process.env.ONEC_PASSWORD;
      if (!username || !password) {
        throw new Error('ONEC_USER or ONEC_PASSWORD is not set');
      }

      const auth = Buffer.from(`${username}:${password}`).toString('base64');

      // OData query for expenses
      const dateFromStr = dateFrom.toISOString().split('T')[0];
      const dateToStr = dateTo.toISOString().split('T')[0];

      const filter = `Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'`;
      const url = `${baseUrl}/odata/standard.odata/Document_CashExpense?$filter=${encodeURIComponent(filter)}&$select=Ref_Key,Number,Date,Amount,Description,Author`;

      const response = await this.makeRequest('GET', url, auth);

      const expenseRecords = response.value || [];
      let processedCount = 0;

      for (const record of expenseRecords) {
        const amount = parseFloat(record.Amount) || 0;
        const expenseDate = new Date(record.Date);
        const description = record.Description || 'Unknown';
        const syncId = `onec:expense:${record.Ref_Key}`;

        // Get or create article for HQ expenses
        let article = await this.prisma.ddsArticle.findFirst({
          where: { code: 'hq_overhead' },
        });

        if (!article) {
          const group = await this.prisma.ddsArticleGroup.upsert({
            where: { tenantId_code: { tenantId, code: 'hq' } },
            update: {},
            create: { tenantId, code: 'hq', name: 'HQ & Overhead' },
          });

          article = await this.prisma.ddsArticle.create({
            data: {
              groupId: group.id,
              code: 'hq_overhead',
              name: 'HQ Overhead',
              source: 'ONE_C',
              allocationType: 'DISTRIBUTED',
            },
          });
        }

        // Expenses without restaurantId = distributed (allocated by coefficient)
        await this.prisma.expense.upsert({
          where: { syncId },
          update: { amount },
          create: {
            syncId,
            articleId: article.id,
            restaurantId: null, // No direct restaurant = distribution needed
            date: expenseDate,
            amount,
            comment: description,
            source: 'ONE_C',
          },
        });

        processedCount++;
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'ONE_C', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced ${processedCount} 1C expense records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'ONE_C', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync 1C expenses: ${errorMessage}`);
      throw error;
    }
  }

  async syncKitchenPurchases(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const baseUrl = process.env.ONEC_BASE_URL;
      if (!baseUrl) {
        throw new Error('ONEC_BASE_URL is not set');
      }

      const username = process.env.ONEC_USER;
      const password = process.env.ONEC_PASSWORD;
      if (!username || !password) {
        throw new Error('ONEC_USER or ONEC_PASSWORD is not set');
      }

      const auth = Buffer.from(`${username}:${password}`).toString('base64');

      const dateFromStr = dateFrom.toISOString().split('T')[0];
      const dateToStr = dateTo.toISOString().split('T')[0];

      const filter = `Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'`;
      const url = `${baseUrl}/odata/standard.odata/Document_PurchaseOrder?$filter=${encodeURIComponent(filter)}&$select=Ref_Key,Date,Items/Product,Items/Quantity,Items/Amount,Counterparty`;

      const response = await this.makeRequest('GET', url, auth);

      const purchaseRecords = response.value || [];
      let processedCount = 0;

      for (const record of purchaseRecords) {
        const purchaseDate = new Date(record.Date);
        const supplier = record.Counterparty || 'Unknown';

        // Expand items if available
        const items = record.Items || [];

        for (const item of items) {
          const productName = item.Product || 'Unknown';
          const quantity = parseFloat(item.Quantity) || 0;
          const amount = parseFloat(item.Amount) || 0;
          const syncId = `onec:purchase:${record.Ref_Key}:${item.Ref_Key || productName}`;

          await this.prisma.kitchenPurchase.upsert({
            where: { syncId },
            update: {
              amount,
              quantity,
            },
            create: {
              syncId,
              tenantId,
              date: purchaseDate,
              productName,
              supplierName: supplier,
              quantity,
              amount,
            },
          });

          processedCount++;
        }
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'ONE_C', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced ${processedCount} kitchen purchase records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'ONE_C', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync kitchen purchases: ${errorMessage}`);
      throw error;
    }
  }

  async syncKitchenIncome(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = process.env.TENANT_ID || 'default';

    try {
      const baseUrl = process.env.ONEC_BASE_URL;
      if (!baseUrl) {
        throw new Error('ONEC_BASE_URL is not set');
      }

      const username = process.env.ONEC_USER;
      const password = process.env.ONEC_PASSWORD;
      if (!username || !password) {
        throw new Error('ONEC_USER or ONEC_PASSWORD is not set');
      }

      const auth = Buffer.from(`${username}:${password}`).toString('base64');

      const dateFromStr = dateFrom.toISOString().split('T')[0];
      const dateToStr = dateTo.toISOString().split('T')[0];

      const filter = `Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'`;
      const url = `${baseUrl}/odata/standard.odata/Document_SalesInvoice?$filter=${encodeURIComponent(filter)}&$select=Ref_Key,Date,DocumentAmount,Description`;

      const response = await this.makeRequest('GET', url, auth);

      const incomeRecords = response.value || [];
      let processedCount = 0;

      for (const record of incomeRecords) {
        const incomeDate = new Date(record.Date);
        const amount = parseFloat(record.DocumentAmount) || 0;
        const description = record.Description || 'Kitchen income';
        const syncId = `onec:income:${record.Ref_Key}`;

        await this.prisma.kitchenIncome.upsert({
          where: { syncId },
          update: { amount },
          create: {
            syncId,
            tenantId,
            date: incomeDate,
            amount,
            description,
          },
        });

        processedCount++;
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'ONE_C', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced ${processedCount} kitchen income records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'ONE_C', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync kitchen income: ${errorMessage}`);
      throw error;
    }
  }

  private async makeRequest(method: string, url: string, auth: string): Promise<any> {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            timeout: this.httpTimeout,
          })
        );

        return response.data;
      } catch (error) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `${method} request failed (attempt ${attempt + 1}): ${error instanceof Error ? error.message : String(error)}`
        );

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          throw error;
        }
      }
    }
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
