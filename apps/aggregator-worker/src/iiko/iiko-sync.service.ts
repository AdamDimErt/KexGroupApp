import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { IikoAuthService } from './iiko-auth.service';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
// Decimal type is handled by Prisma internally, use type coercion

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
}

interface CorporateItemDto {
  id: string;
  parentId?: string;
  name: string;
  type: 'DEPARTMENT' | 'ORGDEVELOPMENT';
}

interface DayDishValue {
  date: string;
  value?: string | number;
  productName?: string;
  productId?: string;
}

interface PaymentItem {
  name?: string;
  sum?: string | number;
  date?: string;
}

/** Map iiko payment type name to our revenue field */
type PaymentTypeField = 'revenueCash' | 'revenueKaspi' | 'revenueHalyk' | 'revenueYandex' | 'other';

@Injectable()
export class IikoSyncService {
  private readonly logger = new Logger(IikoSyncService.name);
  private readonly baseUrl = process.env.IIKO_SERVER_URL || 'https://kexbrands-co.iiko.it:443/resto/api';
  private readonly httpTimeout = 30000;
  private readonly maxFailures = 3;
  private readonly circuitBreakerResetMs = 15 * 60 * 1000; // 15 minutes
  private readonly xmlParser = new XMLParser();

  private circuitBreakerStates = new Map<string, CircuitBreakerState>();
  private cachedTenantId: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly iikoAuth: IikoAuthService,
  ) {}

  /**
   * Resolve tenant ID from DB (cached after first call).
   * Falls back to TENANT_ID env var if set.
   */
  private async getTenantId(): Promise<string> {
    if (this.cachedTenantId) return this.cachedTenantId;

    // If explicitly set in env, use that
    if (process.env.TENANT_ID && process.env.TENANT_ID !== 'default') {
      this.cachedTenantId = process.env.TENANT_ID;
      return this.cachedTenantId;
    }

    // Otherwise, find the first (and likely only) tenant in DB
    const tenant = await this.prisma.tenant.findFirst();
    if (tenant) {
      this.cachedTenantId = tenant.id;
      this.logger.log(`Resolved tenant from DB: ${tenant.id} (${tenant.name})`);
      return this.cachedTenantId;
    }

    // Last resort fallback
    this.cachedTenantId = 'default';
    this.logger.warn('No tenant found in DB, using "default"');
    return this.cachedTenantId;
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  private parseDate(dateStr: string): Date {
    // Parse dd.MM.yyyy format
    const [day, month, year] = dateStr.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  async syncOrganizations(): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const token = await this.iikoAuth.getAccessToken();
      const xmlData = await this.makeRequest('GET', '/corporation/departments', token);

      // Parse XML response
      const parsed = this.xmlParser.parse(xmlData);
      const items = (parsed.corporateItemDtoes?.corporateItemDto || []).map((item: any) =>
        Array.isArray(item) ? item : [item]
      ).flat() as CorporateItemDto[];

      if (!Array.isArray(items)) {
        this.logger.warn('No items found in corporation response');
        return;
      }

      // Separate brands (ORGDEVELOPMENT) and restaurants (DEPARTMENT)
      const brands = items.filter(item => item.type === 'ORGDEVELOPMENT');
      const restaurants = items.filter(item => item.type === 'DEPARTMENT');

      // Create brand lookup with brand IDs (from real structure)
      const brandIds = {
        'BNA': 'f3864940-8072-4dde-9c03-d1fec8d661c4',
        'DNA': 'f401ea70-f72c-408b-b3a3-935e779c8043',
      };

      // Process brands
      for (const brand of brands) {
        const key = brand.name.substring(0, 3).toUpperCase();
        const brandId = brandIds[key as keyof typeof brandIds];

        await this.prisma.brand.upsert({
          where: { iikoGroupId: brand.id },
          update: {
            name: brand.name,
            isActive: true,
          },
          create: {
            iikoGroupId: brand.id,
            name: brand.name,
            slug: this.slugify(brand.name),
            companyId: (await this.getOrCreateCompany(tenantId, brand.name)).id,
            isActive: true,
          },
        });
      }

      // Build parent ID to brand mapping
      const parentToBrand = new Map<string, string>();
      for (const brand of brands) {
        parentToBrand.set(brand.id, brand.id);
      }

      // Map intermediate parent IDs to brands (from real data)
      const intermediateParentMap: Record<string, string> = {
        '0c6e8c78-ad8c-44a7-9165-b537cba775f2': 'f3864940-8072-4dde-9c03-d1fec8d661c4', // BNA
        'bec562e9-1225-4436-9743-e3ff1e74fc7a': 'f401ea70-f72c-408b-b3a3-935e779c8043', // DNA
      };

      // Process restaurants
      for (const restaurant of restaurants) {
        let brandId = restaurant.parentId ?? '';

        // Check if parentId is an intermediate node
        if (brandId && intermediateParentMap[brandId]) {
          brandId = intermediateParentMap[brandId];
        }

        // Find the brand by ID
        const brand = await this.prisma.brand.findUnique({
          where: { iikoGroupId: brandId },
        });

        if (!brand) {
          this.logger.warn(
            `Brand not found for restaurant ${restaurant.name} (parent: ${restaurant.parentId}, mapped: ${brandId}), skipping`
          );
          continue;
        }

        await this.prisma.restaurant.upsert({
          where: { iikoId: restaurant.id },
          update: {
            name: restaurant.name,
            isActive: true,
          },
          create: {
            iikoId: restaurant.id,
            brandId: brand.id,
            name: restaurant.name,
            isActive: true,
          },
        });
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(
        tenantId,
        'IIKO',
        'SUCCESS',
        brands.length + restaurants.length,
        durationMs
      );
      this.logger.log(
        `✓ Synced ${restaurants.length} restaurants and ${brands.length} brands`
      );
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
    const tenantId = await this.getTenantId();

    try {
      // Get all active restaurants
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: { brand: { include: { company: true } } },
      });

      if (restaurants.length === 0) {
        this.logger.log('No restaurants found, skipping revenue sync');
        return;
      }

      const token = await this.iikoAuth.getAccessToken();

      const restaurantIikoIds = restaurants.map(r => r.iikoId).filter(Boolean);

      if (restaurantIikoIds.length === 0) {
        this.logger.log('No iikoIds found, skipping revenue sync');
        return;
      }

      const dateFromStr = this.formatDate(dateFrom);
      const dateToStr = this.formatDate(dateTo);
      let processedCount = 0;

      // Query revenue for each restaurant
      for (const restaurant of restaurants) {
        try {
          // Step 1: Get total revenue from /reports/sales (daily breakdown)
          const xmlData = await this.makeRequest(
            'GET',
            `/reports/sales?department=${restaurant.iikoId}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`,
            token,
          );

          const parsed = this.xmlParser.parse(xmlData);
          const rawDayValues = parsed.dayDishValues?.dayDishValue;
          const dayValues = this.normalizeArray(rawDayValues) as DayDishValue[];

          if (dayValues.length === 0) continue;

          // Group revenue by date (actual daily values, NOT averaged)
          const revenueByDate = new Map<string, number>();
          for (const dayValue of dayValues) {
            const dateKey = String(dayValue.date || '').trim();
            if (!dateKey) continue;
            const amount = parseFloat(String(dayValue.value || 0));
            revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + amount);
          }

          // Step 2: Get payment type breakdown from /reports/sales/byDepartment
          // iiko Server API returns revenue grouped by payment types
          const paymentByDate = await this.fetchPaymentTypeBreakdown(
            restaurant.iikoId!,
            dateFromStr,
            dateToStr,
            token,
          );

          // Step 3: Upsert FinancialSnapshot for each day with actual values
          for (const [dateStr, dailyRevenue] of revenueByDate.entries()) {
            if (dailyRevenue === 0) continue;

            const snapshotDate = this.parseIikoDate(dateStr);
            if (!snapshotDate) continue;

            // Get payment breakdown for this day (or estimate from total if unavailable)
            const payments = paymentByDate.get(dateStr) || this.estimatePayments(dailyRevenue);

            await this.prisma.financialSnapshot.upsert({
              where: {
                restaurantId_date: {
                  restaurantId: restaurant.id,
                  date: snapshotDate,
                },
              },
              update: {
                revenue: dailyRevenue,
                revenueCash: payments.cash,
                revenueKaspi: payments.kaspi,
                revenueHalyk: payments.halyk,
                revenueYandex: payments.yandex,
              },
              create: {
                restaurantId: restaurant.id,
                date: snapshotDate,
                revenue: dailyRevenue,
                revenueCash: payments.cash,
                revenueKaspi: payments.kaspi,
                revenueHalyk: payments.halyk,
                revenueYandex: payments.yandex,
              },
            });
          }

          processedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to sync revenue for restaurant ${restaurant.name} (${restaurant.iikoId}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced revenue for ${processedCount} restaurants (with payment types)`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync revenue: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Fetch payment type breakdown using iiko Server API v2 OLAP.
   * POST /v2/reports/olap with JSON body — groups revenue by PayTypes + Department + date.
   * Returns Map<dateString, {cash, kaspi, halyk, yandex}>.
   *
   * IMPORTANT: READ-ONLY — this POST only fetches report data, never creates/modifies anything!
   */
  private async fetchPaymentTypeBreakdown(
    departmentId: string,
    dateFrom: string,
    dateTo: string,
    token: string,
  ): Promise<Map<string, { cash: number; kaspi: number; halyk: number; yandex: number }>> {
    const result = new Map<string, { cash: number; kaspi: number; halyk: number; yandex: number }>();

    try {
      // Convert dd.MM.yyyy → yyyy-MM-dd for v2 OLAP filter
      const isoFrom = this.convertToIsoDate(dateFrom);
      const isoTo = this.convertToIsoDate(dateTo);

      // POST /v2/reports/olap — JSON body with PayTypes grouping
      const olapResult = await this.makePostJsonRequest<{
        data: Array<{ PayTypes: string; 'OpenDate.Typed'?: string; DishDiscountSumInt?: number; Department?: string }>;
      }>(
        '/v2/reports/olap',
        {
          reportType: 'SALES',
          buildSummary: 'false',
          groupByRowFields: ['PayTypes', 'OpenDate.Typed', 'Department'],
          aggregateFields: ['DishDiscountSumInt'],
          filters: {
            'OpenDate.Typed': {
              filterType: 'DateRange',
              periodType: 'CUSTOM',
              from: isoFrom,
              to: isoTo,
            },
            'Department': {
              filterType: 'IncludeValues',
              values: [departmentId],
            },
          },
        },
        token,
      );

      if (olapResult?.data && Array.isArray(olapResult.data)) {
        for (const row of olapResult.data) {
          const payTypeName = String(row.PayTypes || '').trim();
          const dateStr = String(row['OpenDate.Typed'] || '').trim();
          const amount = row.DishDiscountSumInt || 0;

          if (!payTypeName || !dateStr || amount === 0) continue;

          // Convert date to dd.MM.yyyy format to match sales report keys
          const dateKey = this.normalizeToDateKey(dateStr);
          if (!dateKey) continue;

          const existing = result.get(dateKey) || { cash: 0, kaspi: 0, halyk: 0, yandex: 0 };
          const field = this.classifyPaymentType(payTypeName);

          if (field === 'revenueCash') existing.cash += amount;
          else if (field === 'revenueKaspi') existing.kaspi += amount;
          else if (field === 'revenueHalyk') existing.halyk += amount;
          else if (field === 'revenueYandex') existing.yandex += amount;
          else existing.cash += amount; // Unknown → cash (conservative)

          result.set(dateKey, existing);
        }

        if (result.size > 0) {
          this.logger.log(`✓ Payment type breakdown from OLAP: ${result.size} days, ${olapResult.data.length} rows`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not fetch payment type breakdown (v2 OLAP): ${
          error instanceof Error ? error.message : String(error)
        }. Will estimate from total revenue.`,
      );
    }

    return result;
  }

  /**
   * Convert dd.MM.yyyy → yyyy-MM-dd for v2 OLAP API filters.
   */
  private convertToIsoDate(ddmmyyyy: string): string {
    const parts = ddmmyyyy.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ddmmyyyy; // Already ISO or unknown format
  }

  /**
   * Normalize various date formats to dd.MM.yyyy key (to match sales report).
   * Handles: "01.04.2026", "2026-04-01", "2026-04-01T00:00:00" etc.
   */
  private normalizeToDateKey(dateStr: string): string | null {
    const trimmed = dateStr.trim();

    // Already dd.MM.yyyy
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
    }

    return null;
  }

  /**
   * Classify iiko payment type name to one of our revenue fields.
   * Handles Russian and English names, various iiko naming conventions.
   */
  private classifyPaymentType(name: string): PaymentTypeField {
    const lower = name.toLowerCase();

    // Cash / Наличные (includes "НАЛИЧНЫЕ*", "Наличные")
    if (lower.includes('наличн') || lower.includes('cash') || lower === 'нал') {
      return 'revenueCash';
    }

    // Kaspi QR / Kaspi Bank / KaspiSmartPos
    if (lower.includes('kaspi') || lower.includes('каспи')) {
      return 'revenueKaspi';
    }

    // Halyk QR / Halyk Bank / HALYK QR / Халык банк Web
    if (lower.includes('halyk') || lower.includes('халык') || lower.includes('homebank')) {
      return 'revenueHalyk';
    }

    // Yandex Eda / Яндекс
    if (lower.includes('яндекс') || lower.includes('yandex') || lower.includes('я.еда')) {
      return 'revenueYandex';
    }

    // QrPay → Kaspi (QrPay is Kaspi QR payment in KEX context)
    if (lower === 'qrpay' || lower.includes('qr pay')) {
      return 'revenueKaspi';
    }

    // Glovo / Wolt → other (delivery aggregators, not a payment type per se)
    if (lower.includes('глово') || lower.includes('glovo') || lower.includes('wolt')) {
      return 'other';
    }

    // Card payments → other
    if (lower.includes('карт') || lower.includes('card') || lower.includes('visa') || lower.includes('mastercard')) {
      return 'other';
    }

    // "(без оплаты)" and other unknown → other
    return 'other';
  }

  /**
   * When payment type breakdown is not available from iiko,
   * estimate by putting all revenue as cash (conservative default).
   * This will be overwritten when real payment data becomes available.
   */
  private estimatePayments(totalRevenue: number): { cash: number; kaspi: number; halyk: number; yandex: number } {
    return {
      cash: totalRevenue, // Conservative: all as cash until real data
      kaspi: 0,
      halyk: 0,
      yandex: 0,
    };
  }

  /**
   * Parse iiko date format (dd.MM.yyyy) to Date object.
   * Also handles yyyy-MM-dd format.
   */
  private parseIikoDate(dateStr: string): Date | null {
    try {
      const trimmed = dateStr.trim();

      // dd.MM.yyyy format
      if (trimmed.includes('.')) {
        const [day, month, year] = trimmed.split('.');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // yyyy-MM-dd format
      if (trimmed.includes('-')) {
        return new Date(trimmed);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize XML parsed value to always be an array.
   * fast-xml-parser returns single items as objects, not arrays.
   */
  private normalizeArray(value: unknown): any[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  async syncExpenses(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: { brand: { include: { company: true } } },
      });

      const restaurantIikoIds = restaurants.map(r => r.iikoId).filter(Boolean);
      if (restaurantIikoIds.length === 0) {
        this.logger.log('No restaurants found, skipping expense sync');
        return;
      }

      const token = await this.iikoAuth.getAccessToken();

      const dateFromStr = this.formatDate(dateFrom);
      const dateToStr = this.formatDate(dateTo);
      let processedCount = 0;

      // Query expenses for each restaurant
      for (const restaurant of restaurants) {
        try {
          const xmlData = await this.makeRequest(
            'GET',
            `/reports/productExpense?department=${restaurant.iikoId}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`,
            token
          );

          // Parse XML response
          const parsed = this.xmlParser.parse(xmlData);
          const dayValues = (parsed.dayDishValues?.dayDishValue || []).map((item: any) =>
            Array.isArray(item) ? item : [item]
          ).flat() as DayDishValue[];

          if (!Array.isArray(dayValues)) continue;

          // Process each expense entry
          for (const dayValue of dayValues) {
            const productName = dayValue.productName || 'Unknown';
            const productId = dayValue.productId || dayValue.productName || 'unknown';
            const amount = parseFloat(String(dayValue.value || 0));
            const expenseDate = this.parseDate(dayValue.date);

            if (!amount || isNaN(amount)) continue;

            // Get or create article
            let article = await this.prisma.ddsArticle.findFirst({
              where: { code: productId },
            });

            if (!article) {
              // Create default group if needed
              const group = await this.prisma.ddsArticleGroup.upsert({
                where: { tenantId_code: { tenantId, code: 'default' } },
                update: {},
                create: { tenantId, code: 'default', name: 'Default' },
              });

              article = await this.prisma.ddsArticle.create({
                data: {
                  groupId: group.id,
                  code: productId,
                  name: productName,
                  source: 'IIKO',
                  allocationType: 'DIRECT',
                },
              });
            }

            const syncId = `iiko:expense:${restaurant.iikoId}:${productId}:${expenseDate.toISOString()}`;

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
            await this.prisma.financialSnapshot.upsert({
              where: {
                restaurantId_date: {
                  restaurantId: restaurant.id,
                  date: expenseDate,
                },
              },
              update: {
                directExpenses: { increment: amount },
              },
              create: {
                restaurantId: restaurant.id,
                date: expenseDate,
                directExpenses: amount,
              },
            });
          }
        } catch (error) {
          this.logger.warn(
            `Failed to sync expenses for restaurant ${restaurant.name} (${restaurant.iikoId}): ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
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
    const tenantId = await this.getTenantId();

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
      });

      if (restaurants.length === 0) {
        this.logger.log('No restaurants found, skipping cash discrepancy sync');
        return;
      }

      const token = await this.iikoAuth.getAccessToken();
      const dateFromStr = this.formatDate(dateFrom);
      const dateToStr = this.formatDate(dateTo);
      let processedCount = 0;

      for (const restaurant of restaurants) {
        if (!restaurant.iikoId) continue;

        try {
          // iiko Server API: GET /reports/cashDiscrepancy
          const xmlData = await this.makeRequest(
            'GET',
            `/reports/cashDiscrepancy?department=${restaurant.iikoId}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`,
            token,
          );

          const parsed = this.xmlParser.parse(xmlData);
          const discrepancies = this.normalizeArray(
            parsed.cashDiscrepancies?.cashDiscrepancy,
          );

          for (const disc of discrepancies) {
            const expected = parseFloat(String(disc.expectedAmount || 0));
            const actual = parseFloat(String(disc.actualAmount || 0));
            const difference = actual - expected;
            const discDate = disc.date ? this.parseDate(disc.date) : dateFrom;
            const syncId = `iiko:cashdiscrepancy:${restaurant.iikoId}:${discDate.toISOString()}`;

            await this.prisma.cashDiscrepancy.upsert({
              where: { syncId },
              update: { expected, actual, difference },
              create: {
                syncId,
                restaurantId: restaurant.id,
                date: discDate,
                expected,
                actual,
                difference,
              },
            });

            processedCount++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to sync cash discrepancies for ${restaurant.name} (${restaurant.iikoId}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
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

  async syncKitchenShipments(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
      });

      if (restaurants.length === 0) {
        this.logger.log('No restaurants found, skipping kitchen shipment sync');
        return;
      }

      const token = await this.iikoAuth.getAccessToken();
      const dateFromStr = this.formatDate(dateFrom);
      const dateToStr = this.formatDate(dateTo);
      let processedCount = 0;

      for (const restaurant of restaurants) {
        if (!restaurant.iikoId) continue;

        try {
          // iiko Server API: GET /reports/storeOperations (shipments to departments)
          const xmlData = await this.makeRequest(
            'GET',
            `/reports/storeOperations?department=${restaurant.iikoId}&dateFrom=${dateFromStr}&dateTo=${dateToStr}&reportType=SALES`,
            token,
          );

          const parsed = this.xmlParser.parse(xmlData);
          const shipments = this.normalizeArray(
            parsed.storeOperations?.storeOperation ||
              parsed.dayDishValues?.dayDishValue,
          );

          for (const shipment of shipments) {
            const productName = shipment.productName || shipment.product || 'Unknown';
            const quantity = parseFloat(String(shipment.quantity || shipment.amount || 0));
            const amount = parseFloat(String(shipment.sum || shipment.value || 0));
            const shipmentDate = shipment.date ? this.parseDate(shipment.date) : dateFrom;

            if (!amount || isNaN(amount)) continue;

            const syncId = `iiko:shipment:${restaurant.iikoId}:${productName}:${shipmentDate.toISOString()}`;

            await this.prisma.kitchenShipment.upsert({
              where: { syncId },
              update: { quantity, amount },
              create: {
                syncId,
                restaurantId: restaurant.id,
                date: shipmentDate,
                productName,
                quantity,
                amount,
              },
            });

            processedCount++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to sync kitchen shipments for ${restaurant.name} (${restaurant.iikoId}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`✓ Synced ${processedCount} kitchen shipment records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`✗ Failed to sync kitchen shipments: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check if circuit breaker is open for given endpoint group.
   * Returns true if we should NOT make the request.
   */
  private isCircuitOpen(endpointGroup: string): boolean {
    const state = this.circuitBreakerStates.get(endpointGroup);
    if (!state) return false;

    if (state.failures >= this.maxFailures) {
      const elapsed = Date.now() - state.lastFailureTime;
      if (elapsed < this.circuitBreakerResetMs) {
        return true; // Circuit is open, reject
      }
      // Reset after cooldown (half-open → try again)
      this.circuitBreakerStates.delete(endpointGroup);
    }
    return false;
  }

  /**
   * Record a failure for the circuit breaker.
   */
  private recordFailure(endpointGroup: string): void {
    const state = this.circuitBreakerStates.get(endpointGroup) || {
      failures: 0,
      lastFailureTime: 0,
    };
    state.failures++;
    state.lastFailureTime = Date.now();
    this.circuitBreakerStates.set(endpointGroup, state);
  }

  /**
   * Record a success — reset the circuit breaker.
   */
  private recordSuccess(endpointGroup: string): void {
    this.circuitBreakerStates.delete(endpointGroup);
  }

  private async makeRequest(
    method: 'GET',
    endpoint: string,
    token: string,
  ): Promise<string> {
    // Extract endpoint group for circuit breaker (e.g., "/reports/sales" → "reports/sales")
    const endpointGroup = endpoint.split('?')[0].replace(/^\//, '');

    // Check circuit breaker
    if (this.isCircuitOpen(endpointGroup)) {
      const state = this.circuitBreakerStates.get(endpointGroup)!;
      const remainingMs = this.circuitBreakerResetMs - (Date.now() - state.lastFailureTime);
      throw new Error(
        `Circuit breaker OPEN for ${endpointGroup}: ${state.failures} failures, retry in ${Math.ceil(remainingMs / 1000)}s`,
      );
    }

    // iiko Server API: GET only, token as query parameter
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${separator}key=${encodeURIComponent(token)}`;

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, {
            timeout: this.httpTimeout,
            responseType: 'text',
            headers: { 'Accept': 'application/xml' },
          }),
        );

        this.recordSuccess(endpointGroup);
        return response.data;
      } catch (error) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `${method} ${endpoint} failed (attempt ${attempt + 1}/${maxRetries}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          this.recordFailure(endpointGroup);
          throw error;
        }
      }
    }

    throw new Error(`Failed to make request after ${maxRetries} attempts`);
  }

  /**
   * POST JSON request to iiko Server API v2 endpoints.
   * Used for OLAP reports that require JSON body.
   * READ-ONLY: only for fetching reports, never creating data!
   */
  private async makePostJsonRequest<T = any>(
    endpoint: string,
    body: Record<string, any>,
    token: string,
  ): Promise<T> {
    const endpointGroup = endpoint.split('?')[0].replace(/^\//, '');

    if (this.isCircuitOpen(endpointGroup)) {
      const state = this.circuitBreakerStates.get(endpointGroup)!;
      const remainingMs = this.circuitBreakerResetMs - (Date.now() - state.lastFailureTime);
      throw new Error(
        `Circuit breaker OPEN for ${endpointGroup}: ${state.failures} failures, retry in ${Math.ceil(remainingMs / 1000)}s`,
      );
    }

    const url = `${this.baseUrl}${endpoint}?key=${encodeURIComponent(token)}`;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, body, {
            timeout: this.httpTimeout,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

        this.recordSuccess(endpointGroup);
        return response.data;
      } catch (error) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `POST ${endpoint} failed (attempt ${attempt + 1}/${maxRetries}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          this.recordFailure(endpointGroup);
          throw error;
        }
      }
    }

    throw new Error(`Failed to make POST request after ${maxRetries} attempts`);
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
