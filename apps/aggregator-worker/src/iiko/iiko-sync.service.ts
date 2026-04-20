import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { IikoAuthService } from './iiko-auth.service';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import * as Sentry from '@sentry/node';
import { startOfBusinessDay } from '../utils/date';
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
type PaymentTypeField =
  | 'revenueCash'
  | 'revenueKaspi'
  | 'revenueHalyk'
  | 'revenueYandex'
  | 'other';

@Injectable()
export class IikoSyncService {
  private readonly logger = new Logger(IikoSyncService.name);
  private readonly baseUrl = (() => {
    const url = process.env.IIKO_SERVER_URL;
    if (!url) {
      throw new Error(
        'IIKO_SERVER_URL env is required (e.g. https://your-org.iiko.it/resto/api)',
      );
    }
    return url;
  })();
  private readonly httpTimeout = Number(
    process.env.IIKO_REQUEST_TIMEOUT_MS ?? '30000',
  );
  private readonly maxFailures = Number(
    process.env.IIKO_CIRCUIT_BREAKER_MAX_FAILURES ?? '3',
  );
  private readonly circuitBreakerResetMs =
    Number(process.env.IIKO_CIRCUIT_BREAKER_RESET_MINUTES ?? '15') * 60 * 1000;
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
    // Always format in Almaty time (UTC+5) so a date like
    // "2026-03-31T00:00:00+05:00" (= 2026-03-30T19:00:00Z) produces "31.03.2026"
    // and not "30.03.2026" as UTC getters would give on a UTC server.
    const almatyOffsetMs = 5 * 60 * 60 * 1000;
    const d = new Date(date.getTime() + almatyOffsetMs);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Parse dd.MM.yyyy to the UTC instant that represents midnight of that
   * calendar day in Asia/Almaty (UTC+5).
   *
   * Symmetric with formatDate: formatDate(parseDate(x)) === x for any
   * valid dd.MM.yyyy string, regardless of the host process TZ.
   *
   * Uses startOfBusinessDay so the Almaty offset lives in one place
   * (utils/date.ts) rather than being duplicated here.
   */
  private parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('.');
    // Construct a UTC noon anchor for that calendar date, then snap to
    // Almaty midnight. Using noon avoids any DST edge-cases if the
    // region ever introduces them; Almaty has none today (UTC+5, no DST).
    const utcAnchor = new Date(Date.UTC(+year, +month - 1, +day));
    return startOfBusinessDay(utcAnchor);
  }

  /**
   * Delete all FinancialSnapshot rows within the given date range.
   * Used by backfill to clear stale data before re-importing.
   */
  async clearSnapshots(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.financialSnapshot.deleteMany({
      where: {
        date: { gte: from, lte: to },
      },
    });
    return result.count;
  }

  async syncOrganizations(): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const token = await this.iikoAuth.getAccessToken();
      const xmlData = await this.makeRequest(
        'GET',
        '/corporation/departments',
        token,
      );

      // Parse XML response
      const parsed = this.xmlParser.parse(xmlData) as Record<string, unknown>;
      const rawCorporate = parsed['corporateItemDtoes'] as
        | Record<string, unknown>
        | undefined;
      const rawItems = rawCorporate?.['corporateItemDto'];
      const items = (this.normalizeArray(rawItems) as unknown[])
        .map((item: unknown): unknown[] =>
          Array.isArray(item) ? (item as unknown[]) : [item],
        )
        .flat() as CorporateItemDto[];

      if (!Array.isArray(items)) {
        this.logger.warn('No items found in corporation response');
        return;
      }

      // Separate brands (ORGDEVELOPMENT) and restaurants (DEPARTMENT)
      const brands = items.filter((item) => item.type === 'ORGDEVELOPMENT');
      const restaurants = items.filter((item) => item.type === 'DEPARTMENT');

      // Process brands
      for (const brand of brands) {
        // BUG-11-3 (worker half): set type so finance-service RESTAURANT filter works correctly
        const brandType = this.determineBrandType(brand.name);
        await this.prisma.brand.upsert({
          where: { iikoGroupId: brand.id },
          update: {
            name: brand.name,
            isActive: true,
            type: brandType,
          },
          create: {
            iikoGroupId: brand.id,
            name: brand.name,
            slug: this.slugify(brand.name),
            companyId: (await this.getOrCreateCompany(tenantId, brand.name)).id,
            isActive: true,
            type: brandType,
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
        '0c6e8c78-ad8c-44a7-9165-b537cba775f2':
          'f3864940-8072-4dde-9c03-d1fec8d661c4', // BNA
        'bec562e9-1225-4436-9743-e3ff1e74fc7a':
          'f401ea70-f72c-408b-b3a3-935e779c8043', // DNA
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
            `Brand not found for restaurant ${restaurant.name} (parent: ${restaurant.parentId}, mapped: ${brandId}), skipping`,
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
        durationMs,
      );
      this.logger.log(
        `✓ Synced ${restaurants.length} restaurants and ${brands.length} brands`,
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logSync(
        tenantId,
        'IIKO',
        'ERROR',
        undefined,
        durationMs,
        errorMessage,
      );
      this.logger.error(`✗ Failed to sync organizations: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncOrganizations');
        scope.setContext('sync', {
          dateFrom: undefined,
          dateTo: undefined,
        });
        Sentry.captureException(error);
      });
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

      const restaurantIikoIds = restaurants
        .map((r) => r.iikoId)
        .filter(Boolean);

      if (restaurantIikoIds.length === 0) {
        this.logger.log('No iikoIds found, skipping revenue sync');
        return;
      }

      const dateFromStr = this.formatDate(dateFrom);
      // iiko /reports/sales uses exclusive dateTo — "31.03.2026" does NOT include March 31.
      // Add 1 day so the intended last day is actually included in the response.
      const dateToExclusive = new Date(dateTo.getTime() + 24 * 60 * 60 * 1000);
      const dateToStr = this.formatDate(dateToExclusive);
      let processedCount = 0;

      // Step 1: Bulk OLAP fetch for ALL departments at once (2 queries total, not 68)
      // Returns: deptName → dateKey → {cash, kaspi, halyk, yandex, salesCount}
      const bulkOlapData = await this.fetchBulkOlapData(dateFromStr, dateToStr, token);

      // Collect all unique payment type names from OLAP data and sync to PaymentType table
      await this.syncPaymentTypesFromOlapData(bulkOlapData, tenantId);

      // Query revenue for each restaurant
      for (const restaurant of restaurants) {
        try {
          // Step 2: Get total revenue from /reports/sales (daily breakdown per restaurant)
          const xmlData = await this.makeRequest(
            'GET',
            `/reports/sales?department=${restaurant.iikoId}&dateFrom=${dateFromStr}&dateTo=${dateToStr}`,
            token,
          );

          const parsed = this.xmlParser.parse(xmlData) as Record<
            string,
            unknown
          >;
          const rawDayValuesObj = parsed['dayDishValues'] as
            | Record<string, unknown>
            | undefined;
          const rawDayValues = rawDayValuesObj?.['dayDishValue'];
          const dayValues = this.normalizeArray(rawDayValues) as DayDishValue[];

          if (dayValues.length === 0) continue;

          // Group revenue by date (actual daily values, NOT averaged)
          const revenueByDate = new Map<string, number>();
          for (const dayValue of dayValues) {
            const dateKey = String(dayValue.date || '').trim();
            if (!dateKey) continue;
            const amount = parseFloat(String(dayValue.value || 0));
            revenueByDate.set(
              dateKey,
              (revenueByDate.get(dateKey) || 0) + amount,
            );
          }

          // Step 3: Look up OLAP data for this restaurant by name (iiko returns names, not UUIDs)
          const paymentByDate = bulkOlapData.get(restaurant.name) || new Map();

          // Step 4: Upsert FinancialSnapshot for each day with actual values
          for (const [dateStr, dailyRevenue] of revenueByDate.entries()) {
            if (dailyRevenue === 0) continue;

            const snapshotDate = this.parseIikoDate(dateStr);
            if (!snapshotDate) continue;

            // Get payment breakdown for this day (or estimate from total if unavailable)
            const payments =
              paymentByDate.get(dateStr) || this.estimatePayments(dailyRevenue);

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
                salesCount: payments.salesCount,
              },
              create: {
                restaurantId: restaurant.id,
                date: snapshotDate,
                revenue: dailyRevenue,
                revenueCash: payments.cash,
                revenueKaspi: payments.kaspi,
                revenueHalyk: payments.halyk,
                revenueYandex: payments.yandex,
                salesCount: payments.salesCount,
              },
            });

            // Sync dynamic payment type breakdown to SnapshotPayment
            const paymentsForDate = paymentByDate.get(dateStr);
            if (paymentsForDate && paymentsForDate.raw.size > 0) {
              // Get the snapshot id
              const snap = await this.prisma.financialSnapshot.findUnique({
                where: { restaurantId_date: { restaurantId: restaurant.id, date: snapshotDate } },
                select: { id: true },
              });
              if (snap) {
                for (const [payTypeName, payAmount] of paymentsForDate.raw.entries()) {
                  if (payAmount <= 0) continue;
                  const pt = await this.prisma.paymentType.findUnique({
                    where: { tenantId_iikoCode: { tenantId, iikoCode: payTypeName } },
                  });
                  if (!pt) continue;
                  await this.prisma.snapshotPayment.upsert({
                    where: { snapshotId_paymentTypeId: { snapshotId: snap.id, paymentTypeId: pt.id } },
                    update: { amount: payAmount },
                    create: { snapshotId: snap.id, paymentTypeId: pt.id, amount: payAmount },
                  });
                }
              }
            }
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
      await this.logSync(
        tenantId,
        'IIKO',
        'SUCCESS',
        processedCount,
        durationMs,
      );
      this.logger.log(
        `✓ Synced revenue for ${processedCount} restaurants (with payment types)`,
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logSync(
        tenantId,
        'IIKO',
        'ERROR',
        undefined,
        durationMs,
        errorMessage,
      );
      this.logger.error(`✗ Failed to sync revenue: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncRevenue');
        scope.setContext('sync', {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        });
        Sentry.captureException(error);
      });
      throw error;
    }
  }

  /**
   * Fetch payment type breakdown + guest counts for ALL departments in one bulk OLAP call.
   * POST /v2/reports/olap — no Department filter (iiko ignores UUID filters, returns names).
   * Returns Map<deptName, Map<dateKey, {cash, kaspi, halyk, yandex, salesCount}>>.
   *
   * Two separate OLAP queries:
   *   1. PayTypes + Department + Date → DishDiscountSumInt (revenue breakdown)
   *   2. Department + Date → GuestNum (check counts, no PayType duplication)
   *
   * IMPORTANT: READ-ONLY — these POSTs only fetch report data, never create/modify anything!
   */
  private async fetchBulkOlapData(
    dateFrom: string,
    dateTo: string,
    token: string,
  ): Promise<
    Map<string, Map<string, { cash: number; kaspi: number; halyk: number; yandex: number; salesCount: number; raw: Map<string, number> }>>
  > {
    // result: deptName → dateKey → payment data
    const result = new Map<
      string,
      Map<string, { cash: number; kaspi: number; halyk: number; yandex: number; salesCount: number; raw: Map<string, number> }>
    >();

    const isoFrom = this.convertToIsoDate(dateFrom);
    const isoTo = this.convertToIsoDate(dateTo);
    const dateFilter = {
      filterType: 'DateRange',
      periodType: 'CUSTOM',
      from: isoFrom,
      to: isoTo,
    };

    // ── Query 1: Revenue breakdown by payment type ─────────────────────────
    try {
      const payResult = await this.makePostJsonRequest<{
        data: Array<{
          PayTypes?: string;
          'OpenDate.Typed'?: string;
          DishDiscountSumInt?: number;
          Department?: string;
        }>;
      }>(
        '/v2/reports/olap',
        {
          reportType: 'SALES',
          buildSummary: 'false',
          groupByRowFields: ['PayTypes', 'Department', 'OpenDate.Typed'],
          aggregateFields: ['DishDiscountSumInt'],
          filters: { 'OpenDate.Typed': dateFilter },
        },
        token,
      );

      if (payResult?.data && Array.isArray(payResult.data)) {
        for (const row of payResult.data) {
          const deptName = String(row.Department || '').trim();
          const payTypeName = String(row.PayTypes || '').trim();
          const dateStr = String(row['OpenDate.Typed'] || '').trim();
          const amount = row.DishDiscountSumInt || 0;

          if (!deptName || !payTypeName || !dateStr) continue;
          const dateKey = this.normalizeToDateKey(dateStr);
          if (!dateKey) continue;

          if (!result.has(deptName)) result.set(deptName, new Map());
          const deptMap = result.get(deptName)!;
          const existing = deptMap.get(dateKey) || { cash: 0, kaspi: 0, halyk: 0, yandex: 0, salesCount: 0, raw: new Map<string, number>() };

          if (amount > 0) {
            const field = this.classifyPaymentType(payTypeName);
            if (field === 'revenueCash') existing.cash += amount;
            else if (field === 'revenueKaspi') existing.kaspi += amount;
            else if (field === 'revenueHalyk') existing.halyk += amount;
            else if (field === 'revenueYandex') existing.yandex += amount;
            else existing.cash += amount;
            // Always store raw amount keyed by payment type name for dynamic sync
            existing.raw.set(payTypeName, (existing.raw.get(payTypeName) || 0) + amount);
          }

          deptMap.set(dateKey, existing);
        }
        this.logger.log(
          `✓ OLAP payment breakdown: ${result.size} departments, ${payResult.data.length} rows`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not fetch payment type breakdown (v2 OLAP): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // ── Query 2: Guest counts (salesCount) by department — no PayTypes grouping ──
    // Grouping without PayTypes avoids double-counting GuestNum for split payments.
    try {
      const guestResult = await this.makePostJsonRequest<{
        data: Array<{
          'OpenDate.Typed'?: string;
          GuestNum?: number;
          Department?: string;
        }>;
      }>(
        '/v2/reports/olap',
        {
          reportType: 'SALES',
          buildSummary: 'false',
          groupByRowFields: ['Department', 'OpenDate.Typed'],
          aggregateFields: ['GuestNum'],
          filters: { 'OpenDate.Typed': dateFilter },
        },
        token,
      );

      if (guestResult?.data && Array.isArray(guestResult.data)) {
        for (const row of guestResult.data) {
          const deptName = String(row.Department || '').trim();
          const dateStr = String(row['OpenDate.Typed'] || '').trim();
          const guestNum = row.GuestNum || 0;

          if (!deptName || !dateStr) continue;
          const dateKey = this.normalizeToDateKey(dateStr);
          if (!dateKey) continue;

          if (!result.has(deptName)) result.set(deptName, new Map());
          const deptMap = result.get(deptName)!;
          const existing = deptMap.get(dateKey) || { cash: 0, kaspi: 0, halyk: 0, yandex: 0, salesCount: 0, raw: new Map<string, number>() };
          existing.salesCount = guestNum;
          deptMap.set(dateKey, existing);
        }
        this.logger.log(
          `✓ OLAP guest counts: ${guestResult.data.length} rows`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not fetch guest counts (v2 OLAP GuestNum): ${
          error instanceof Error ? error.message : String(error)
        }`,
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
    if (
      lower.includes('halyk') ||
      lower.includes('халык') ||
      lower.includes('homebank')
    ) {
      return 'revenueHalyk';
    }

    // Yandex Eda / Яндекс
    if (
      lower.includes('яндекс') ||
      lower.includes('yandex') ||
      lower.includes('я.еда')
    ) {
      return 'revenueYandex';
    }

    // QrPay → treated as cash in legacy fixed fields, tracked separately via SnapshotPayment
    if (lower === 'qrpay' || lower.includes('qr pay')) {
      return 'revenueCash';
    }

    // Glovo / Wolt → other (delivery aggregators, not a payment type per se)
    if (
      lower.includes('глово') ||
      lower.includes('glovo') ||
      lower.includes('wolt')
    ) {
      return 'other';
    }

    // Card payments → other
    if (
      lower.includes('карт') ||
      lower.includes('card') ||
      lower.includes('visa') ||
      lower.includes('mastercard')
    ) {
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
  private estimatePayments(totalRevenue: number): {
    cash: number;
    kaspi: number;
    halyk: number;
    yandex: number;
    salesCount: number;
    raw: Map<string, number>;
  } {
    return {
      cash: totalRevenue, // Conservative: all as cash until real data
      kaspi: 0,
      halyk: 0,
      yandex: 0,
      salesCount: 0, // Unknown until OLAP data is available
      raw: new Map<string, number>(),
    };
  }

  /**
   * Parse iiko date string to the UTC instant for midnight of that calendar
   * day in Asia/Almaty (UTC+5). Supports two formats:
   *   - dd.MM.yyyy  (iiko Server XML / DDS shifts)
   *   - yyyy-MM-dd  (iiko Cloud OLAP / JSON responses)
   *
   * Both branches produce the same UTC instant as parseDate/startOfBusinessDay
   * so composite upsert keys are consistent regardless of host process TZ.
   */
  private parseIikoDate(dateStr: string): Date | null {
    try {
      const trimmed = dateStr.trim();

      // dd.MM.yyyy format
      if (trimmed.includes('.')) {
        const [day, month, year] = trimmed.split('.');
        return startOfBusinessDay(
          new Date(Date.UTC(+year, +month - 1, +day)),
        );
      }

      // yyyy-MM-dd format (no time component — treat as Almaty calendar date)
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-');
        return startOfBusinessDay(
          new Date(Date.UTC(+year, +month - 1, +day)),
        );
      }

      // yyyy-MM-ddTHH:mm:ss… — has an explicit time component, keep as-is
      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : d;
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

  /**
   * Extract all unique payment type names from OLAP bulk data and upsert into PaymentType table.
   * This ensures that when iiko adds/renames/removes payment types, our DB stays in sync.
   */
  private async syncPaymentTypesFromOlapData(
    bulkOlapData: Map<string, Map<string, { raw: Map<string, number>; [key: string]: unknown }>>,
    tenantId: string,
  ): Promise<void> {
    const allPayTypeNames = new Set<string>();

    for (const deptMap of bulkOlapData.values()) {
      for (const dayData of deptMap.values()) {
        for (const name of dayData.raw.keys()) {
          if (name) allPayTypeNames.add(name);
        }
      }
    }

    if (allPayTypeNames.size === 0) return;

    for (const name of allPayTypeNames) {
      await this.prisma.paymentType.upsert({
        where: { tenantId_iikoCode: { tenantId, iikoCode: name } },
        update: { name, isActive: true, updatedAt: new Date() },
        create: { tenantId, iikoCode: name, name, isActive: true },
      });
    }

    this.logger.log(`✓ Payment types synced: ${allPayTypeNames.size} types (${Array.from(allPayTypeNames).join(', ')})`);
  }

  async syncExpenses(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        include: { brand: { include: { company: true } } },
      });

      const restaurantIikoIds = restaurants
        .map((r) => r.iikoId)
        .filter(Boolean);
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
            token,
          );

          // Parse XML response
          const parsed = this.xmlParser.parse(xmlData) as Record<
            string,
            unknown
          >;
          const rawExpenseDayObj = parsed['dayDishValues'] as
            | Record<string, unknown>
            | undefined;
          const rawExpenseDayValues = rawExpenseDayObj?.['dayDishValue'];
          const dayValues = (
            this.normalizeArray(rawExpenseDayValues) as unknown[]
          )
            .map((item: unknown): unknown[] =>
              Array.isArray(item) ? (item as unknown[]) : [item],
            )
            .flat() as DayDishValue[];

          if (!Array.isArray(dayValues)) continue;

          // Process each expense entry
          for (const dayValue of dayValues) {
            const productName = dayValue.productName || 'Unknown';
            const productId =
              dayValue.productId || dayValue.productName || 'unknown';
            const amount = parseFloat(String(dayValue.value || 0));
            const expenseDate = this.parseDate(dayValue.date);

            if (!amount || isNaN(amount)) continue;

            // Get or create article
            let article = await this.prisma.ddsArticle.findFirst({
              where: { code: productId },
            });

            if (!article) {
              // Classify article into proper group based on name
              const nameLower = productName.toLowerCase();
              const packagingWords = ['пакет', 'коробка', 'стакан', 'ложка', 'вилка', 'салфетка', 'фольга', 'соусничка', 'контейнер', 'крышка', 'трубочка', 'пленка'];
              const groupCode = packagingWords.some(w => nameLower.includes(w)) ? 'OTHER' : 'FOOD';

              const group = await this.prisma.ddsArticleGroup.upsert({
                where: { tenantId_code: { tenantId, code: groupCode } },
                update: {},
                create: {
                  tenantId,
                  code: groupCode,
                  name: groupCode === 'FOOD' ? 'Продукты питания' : 'Прочие расходы',
                },
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
            }`,
          );
        }
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(
        tenantId,
        'IIKO',
        'SUCCESS',
        processedCount,
        durationMs,
      );
      this.logger.log(`✓ Synced ${processedCount} expense records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logSync(
        tenantId,
        'IIKO',
        'ERROR',
        undefined,
        durationMs,
        errorMessage,
      );
      this.logger.error(`✗ Failed to sync expenses: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncExpenses');
        scope.setContext('sync', {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        });
        Sentry.captureException(error);
      });
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

          const parsed = this.xmlParser.parse(xmlData) as Record<
            string,
            unknown
          >;
          const rawDiscObj = parsed['cashDiscrepancies'] as
            | Record<string, unknown>
            | undefined;
          const discrepancies = this.normalizeArray(
            rawDiscObj?.['cashDiscrepancy'],
          ) as Array<{
            expectedAmount?: unknown;
            actualAmount?: unknown;
            date?: unknown;
          }>;

          for (const disc of discrepancies) {
            const expectedRaw =
              typeof disc.expectedAmount === 'number' ||
              typeof disc.expectedAmount === 'string'
                ? disc.expectedAmount
                : 0;
            const actualRaw =
              typeof disc.actualAmount === 'number' ||
              typeof disc.actualAmount === 'string'
                ? disc.actualAmount
                : 0;
            const expected = parseFloat(String(expectedRaw));
            const actual = parseFloat(String(actualRaw));
            const difference = actual - expected;
            const dateRaw = typeof disc.date === 'string' ? disc.date : '';
            const discDate = dateRaw ? this.parseDate(dateRaw) : dateFrom;
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
      await this.logSync(
        tenantId,
        'IIKO',
        'SUCCESS',
        processedCount,
        durationMs,
      );
      this.logger.log(`✓ Synced ${processedCount} cash discrepancy records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logSync(
        tenantId,
        'IIKO',
        'ERROR',
        undefined,
        durationMs,
        errorMessage,
      );
      this.logger.error(`✗ Failed to sync cash discrepancies: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncCashDiscrepancies');
        scope.setContext('sync', {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        });
        Sentry.captureException(error);
      });
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

          const parsed = this.xmlParser.parse(xmlData) as Record<
            string,
            unknown
          >;
          const rawStoreOps = parsed['storeOperations'] as
            | Record<string, unknown>
            | undefined;
          const rawDayDish = parsed['dayDishValues'] as
            | Record<string, unknown>
            | undefined;
          const shipments = this.normalizeArray(
            rawStoreOps?.['storeOperation'] ?? rawDayDish?.['dayDishValue'],
          ) as Array<{
            productName?: unknown;
            product?: unknown;
            quantity?: unknown;
            amount?: unknown;
            sum?: unknown;
            value?: unknown;
            date?: unknown;
          }>;

          for (const shipment of shipments) {
            const rawProductName =
              typeof shipment.productName === 'string'
                ? shipment.productName
                : typeof shipment.product === 'string'
                  ? shipment.product
                  : 'Unknown';
            const productName: string = rawProductName;
            const quantityRaw =
              typeof shipment.quantity === 'number' ||
              typeof shipment.quantity === 'string'
                ? shipment.quantity
                : typeof shipment.amount === 'number' ||
                    typeof shipment.amount === 'string'
                  ? shipment.amount
                  : 0;
            const quantity = parseFloat(String(quantityRaw));
            const amountRaw =
              typeof shipment.sum === 'number' ||
              typeof shipment.sum === 'string'
                ? shipment.sum
                : typeof shipment.value === 'number' ||
                    typeof shipment.value === 'string'
                  ? shipment.value
                  : 0;
            const amount = parseFloat(String(amountRaw));
            const dateRaw =
              typeof shipment.date === 'string' ? shipment.date : '';
            const shipmentDate = dateRaw ? this.parseDate(dateRaw) : dateFrom;

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
      await this.logSync(
        tenantId,
        'IIKO',
        'SUCCESS',
        processedCount,
        durationMs,
      );
      this.logger.log(`✓ Synced ${processedCount} kitchen shipment records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logSync(
        tenantId,
        'IIKO',
        'ERROR',
        undefined,
        durationMs,
        errorMessage,
      );
      this.logger.error(`✗ Failed to sync kitchen shipments: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncKitchenShipments');
        scope.setContext('sync', {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        });
        Sentry.captureException(error);
      });
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
      const remainingMs =
        this.circuitBreakerResetMs - (Date.now() - state.lastFailureTime);
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
            headers: { Accept: 'application/xml' },
          }),
        );

        this.recordSuccess(endpointGroup);
        return response.data as string;
      } catch (error) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `${method} ${endpoint} failed (attempt ${attempt + 1}/${maxRetries}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
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
      const remainingMs =
        this.circuitBreakerResetMs - (Date.now() - state.lastFailureTime);
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
        return response.data as T;
      } catch (error) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `POST ${endpoint} failed (attempt ${attempt + 1}/${maxRetries}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
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

  /**
   * BUG-11-3 (worker half): Determine Brand.type from the brand name.
   * Matches kitchen/production brands so they are excluded from restaurant-level
   * dashboard aggregation.
   */
  private determineBrandType(
    name: string,
  ): 'RESTAURANT' | 'KITCHEN' | 'MARKETPLACE' {
    if (/цех|kitchen|fabrika/i.test(name)) return 'KITCHEN';
    return 'RESTAURANT';
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

      // Dead letter check: 3 consecutive ERRORs → needsManualReview
      if (status === 'ERROR') {
        try {
          const recent = await this.prisma.syncLog.findMany({
            where: { tenantId, system },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { id: true, status: true },
          });

          if (recent.length === 3 && recent.every((log) => log.status === 'ERROR')) {
            await this.prisma.syncLog.updateMany({
              where: { id: { in: recent.map((l) => l.id) } },
              data: { needsManualReview: true },
            });
            this.logger.warn(
              `Dead letter: 3 consecutive ERRORs for system=${system} — marked needsManualReview=true`,
            );
          }
        } catch (dlError) {
          this.logger.error(
            `Dead letter check failed: ${dlError instanceof Error ? dlError.message : String(dlError)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to log sync: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map a Russian DDS account name to one of the 12 DdsArticleGroup codes.
   * Uses deterministic .toLowerCase().includes() checks.
   */
  private resolveGroupCode(accountName: string): string {
    const name = accountName.toLowerCase();
    if (name.includes('аренд')) return 'RENT';
    if (name.includes('заработн') || name.includes('зарплат') || name.includes('зп') || name.includes('оплата труда')) return 'SALARY';
    if (name.includes('комисси') || name.includes('банк')) return 'BANK_FEE';
    if (name.includes('коммунал') || name.includes('электр') || name.includes('вода')) return 'UTILITIES';
    if (name.includes('маркетинг') || name.includes('реклам')) return 'MARKETING';
    if (name.includes('it') || name.includes('програм') || name.includes('интернет')) return 'IT';
    if (name.includes('транспорт') || name.includes('доставк')) return 'TRANSPORT';
    if (name.includes('оборуд') || name.includes('ремонт')) return 'EQUIPMENT';
    if (name.includes('налог') || name.includes('штраф')) return 'TAXES';
    if (name.includes('кухн') || name.includes('производств')) return 'KITCHEN';
    if (name.includes('продукт') || name.includes('еда') || name.includes('food')) return 'FOOD';
    return 'OTHER';
  }

  /**
   * Sync DDS account catalog from iiko Server /v2/entities/list?rootType=Account.
   * Upserts DdsArticle records keyed by iiko account UUID.
   * Must run BEFORE syncDdsTransactions to ensure FK references exist.
   */
  async syncDdsArticles(): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const token = await this.iikoAuth.getAccessToken();

      // Try POST JSON (v2 endpoint pattern used by iiko Server)
      let accounts: Array<{ id: string; name: string; parentId?: string }> = [];

      try {
        const response = await this.makePostJsonRequest<{ items?: Array<{ id: string; name: string; parentId?: string }> }>(
          '/v2/entities/list',
          { rootType: 'Account' },
          token,
        );
        accounts = response?.items ?? [];
        this.logger.debug(`syncDdsArticles raw response keys: ${JSON.stringify(Object.keys(response ?? {}))}`);
      } catch (postError) {
        // Fallback: some iiko Server versions expose GET endpoint
        this.logger.warn(
          `POST /v2/entities/list failed (${postError instanceof Error ? postError.message : String(postError)}), trying GET`,
        );
        const xmlData = await this.makeRequest('GET', '/v2/entities/list?rootType=Account', token);
        const parsed = this.xmlParser.parse(xmlData) as Record<string, unknown>;
        this.logger.debug(`syncDdsArticles GET parsed keys: ${JSON.stringify(Object.keys(parsed))}`);
        const rawItems = parsed['items'] || parsed['accounts'] || parsed['list'] || [];
        accounts = this.normalizeArray(rawItems) as Array<{ id: string; name: string; parentId?: string }>;
      }

      let processedCount = 0;

      for (const account of accounts) {
        if (!account.id || !account.name) continue;

        const groupCode = this.resolveGroupCode(account.name);
        const group = await this.prisma.ddsArticleGroup.findFirst({
          where: { tenantId, code: groupCode },
        });

        if (!group) {
          this.logger.warn(`DdsArticleGroup code=${groupCode} not found for tenant=${tenantId}, skipping account: ${account.name}`);
          continue;
        }

        // HQ-level accounts (no parent / parentId points to root) → DISTRIBUTED
        const allocationType = account.parentId ? 'DIRECT' : 'DISTRIBUTED';

        await this.prisma.ddsArticle.upsert({
          where: { groupId_code: { groupId: group.id, code: account.id } },
          update: { name: account.name, isActive: true },
          create: {
            groupId: group.id,
            name: account.name,
            code: account.id,
            source: 'IIKO',
            allocationType,
            isActive: true,
          },
        });

        processedCount++;
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`syncDdsArticles: upserted ${processedCount} DDS articles`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`syncDdsArticles failed: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncDdsArticles');
        Sentry.captureException(error);
      });
    }
  }

  /**
   * Sync DDS cash shift transactions (payIn/payOut) per restaurant.
   * Upserts Expense records with syncId = `dds:{shiftId}:{movementId}` for deduplication.
   * Must be called AFTER syncDdsArticles so FK references exist.
   */
  async syncDdsTransactions(dateFrom: Date, dateTo: Date): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
      });

      const token = await this.iikoAuth.getAccessToken();
      let processedCount = 0;

      for (const restaurant of restaurants) {
        if (!restaurant.iikoId) continue;

        try {
          const response = await this.makePostJsonRequest<{
            cashShifts?: Array<{
              id: string;
              date?: string;
              payIns?: Array<{ id: string; accountId: string; amount: number; comment?: string | null }>;
              payOuts?: Array<{ id: string; accountId: string; amount: number; comment?: string | null }>;
            }>;
          }>(
            '/v2/cashshifts/list',
            {
              organizationId: restaurant.iikoId,
              dateFrom: dateFrom.toISOString(),
              dateTo: dateTo.toISOString(),
            },
            token,
          );

          // LOW CONFIDENCE on response schema — log raw keys for first-run observability
          this.logger.debug(`syncDdsTransactions raw response keys (${restaurant.name}): ${JSON.stringify(Object.keys(response ?? {}))}`);

          const shifts = response?.cashShifts ?? [];

          for (const shift of shifts) {
            const movements = [...(shift.payIns ?? []), ...(shift.payOuts ?? [])];

            for (const movement of movements) {
              const syncId = `dds:${shift.id}:${movement.id}`;

              const article = await this.prisma.ddsArticle.findFirst({
                where: { code: movement.accountId, source: 'IIKO' },
              });

              if (!article) {
                this.logger.warn(
                  `syncDdsTransactions: no DdsArticle for accountId=${movement.accountId} (syncId=${syncId}), skipping`,
                );
                continue;
              }

              const shiftDate = shift.date ? new Date(shift.date) : dateFrom;

              await this.prisma.expense.upsert({
                where: { syncId },
                update: { amount: movement.amount, comment: movement.comment ?? null },
                create: {
                  syncId,
                  articleId: article.id,
                  restaurantId: restaurant.id,
                  date: shiftDate,
                  amount: movement.amount,
                  comment: movement.comment ?? null,
                  source: 'IIKO',
                },
              });

              processedCount++;
            }
          }
        } catch (restaurantError) {
          this.logger.warn(
            `syncDdsTransactions: failed for restaurant ${restaurant.name} (${restaurant.iikoId}): ${
              restaurantError instanceof Error ? restaurantError.message : String(restaurantError)
            }`,
          );
        }
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`syncDdsTransactions: upserted ${processedCount} expense records`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`syncDdsTransactions failed: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncDdsTransactions');
        scope.setContext('sync', {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        });
        Sentry.captureException(error);
      });
    }
  }

  async syncNomenclature(): Promise<void> {
    const startTime = Date.now();
    const tenantId = await this.getTenantId();

    try {
      const token = await this.iikoAuth.getAccessToken();

      // iiko Server API endpoint for nomenclature groups
      const xmlData = await this.makeRequest(
        'GET',
        '/v2/entities/products/group/list?includeDeleted=false',
        token,
      );

      const parsed = this.xmlParser.parse(xmlData as string) as Record<string, unknown>;

      // Log raw parsed structure on first run for observability (exact field names are MEDIUM confidence)
      // DdsArticle upsert for individual articles is handled by existing syncExpenses() flow
      this.logger.debug(`syncNomenclature parsed XML keys: ${JSON.stringify(Object.keys(parsed))}`);

      // The XML root may be "groupDtoList", "groups", or "corporateItemDtoList"
      // normalizeArray handles single-vs-array
      const rawGroups = parsed['groupDtoList'] || parsed['groups'] || parsed['corporateItemDtoList'] || [];
      const groups = this.normalizeArray(rawGroups);

      let processedCount = 0;

      for (const group of groups) {
        const groupId = String(group['id'] || group['groupId'] || '');
        const groupName = String(group['name'] || 'Unknown Group');

        if (!groupId) {
          this.logger.warn('Skipping nomenclature group without id');
          continue;
        }

        await this.prisma.ddsArticleGroup.upsert({
          where: { tenantId_code: { tenantId, code: groupId } },
          update: { name: groupName },
          create: { tenantId, code: groupId, name: groupName },
        });

        processedCount++;
      }

      const durationMs = Date.now() - startTime;
      await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
      this.logger.log(`Synced ${processedCount} nomenclature groups`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
      this.logger.error(`Failed to sync nomenclature: ${errorMessage}`);
      Sentry.withScope((scope) => {
        scope.setTag('system', 'IIKO');
        scope.setTag('method', 'syncNomenclature');
        Sentry.captureException(error);
      });
      throw error;
    }
  }
}
