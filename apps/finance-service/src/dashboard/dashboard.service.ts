import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompanySummaryDto,
  BrandSummaryDto,
  RestaurantSummaryDto,
  ArticleSummaryDto,
  DashboardSummaryDto,
  BrandIndicatorDto,
  BrandDetailDto,
  RestaurantDetailDto,
  ArticleGroupDetailDto,
  RestaurantIndicatorDto,
  RevenueBreakdownDto,
  ExpenseGroupDto,
  CashDiscrepancyResponseDto,
  DailyRevenuePointDto,
  ArticleIndicatorDto,
  PaymentTypeAmountDto,
} from './dto/summary.dto';
import {
  DdsReportDto,
  DdsRestaurantRowDto,
  DdsRestaurantGroupDto,
  CompanyExpensesReportDto,
  CompanyExpenseCategoryDto,
  KitchenReportDto,
  KitchenPurchaseItemDto,
  KitchenShipmentRowDto,
  TrendsReportDto,
  TrendPointDto,
} from './dto/reports.dto';
import {
  CompanyRevenueAggregatedDto,
  PaymentBreakdownItemDto,
  DailyRevenuePointAggDto,
  TopRestaurantDto,
} from './dto/revenue-aggregated.dto';

/**
 * Asia/Almaty = UTC+5 (no DST)
 * All business dates must be interpreted in this timezone.
 */
const TIMEZONE_OFFSET_HOURS = 5;

/**
 * ISO offset string derived from TIMEZONE_OFFSET_HOURS, e.g. "+05:00"
 */
const TZ_OFFSET = `+${String(TIMEZONE_OFFSET_HOURS).padStart(2, '0')}:00`;

@Injectable()
export class DashboardService {
  private readonly timezone: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.timezone = this.config.get<string>('TIMEZONE') || 'Asia/Almaty';
  }

  /**
   * Parse date string as start-of-day in Asia/Almaty timezone.
   * Returns UTC Date representing 00:00:00 Almaty time.
   */
  private parseStartDate(dateStr: string): Date {
    // Accept both "2026-01-15" and "2026-01-15T00:00:00Z" formats
    const dateOnly = dateStr.split('T')[0]; // Extract YYYY-MM-DD
    return new Date(`${dateOnly}T00:00:00${TZ_OFFSET}`);
  }

  /**
   * Parse date string as end-of-day in Asia/Almaty timezone.
   * Returns UTC Date representing 23:59:59.999 Almaty time.
   */
  private parseEndDate(dateStr: string): Date {
    const dateOnly = dateStr.split('T')[0];
    return new Date(`${dateOnly}T23:59:59.999${TZ_OFFSET}`);
  }

  /**
   * Convert Decimal/number to number
   */
  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      // Handle Decimal type from Prisma
      const obj = value as Record<string, unknown>;
      if (typeof obj.toString === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const strValue = String(obj);
        const parsed = parseFloat(strValue);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return 0;
  }

  /**
   * Get cost allocation coefficient for a restaurant
   * coefficient = restaurant.revenue / sum(all_restaurants.revenue)
   */
  private async getCoefficientForRestaurant(
    restaurantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<number> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Get this restaurant's revenue
    const restaurantRevenue = await this.prisma.financialSnapshot.aggregate({
      where: {
        restaurantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { revenue: true },
    });

    // Get all restaurants' revenue for the same period
    // Denominator must be company-wide (all active restaurants in the tenant),
    // NOT brand-local — matches aggregator-worker/allocation.service.ts formula:
    //   coefficient = restaurant.revenue / sum(all_active_restaurants.revenue)
    // TODO (variant B): read persisted coefficient from CostAllocation table instead
    //   of recalculating, to guarantee dashboard/worker consistency when worker has
    //   already run for the period.
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        brand: {
          select: {
            company: {
              select: { tenantId: true },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return 0;
    }

    const tenantId = restaurant.brand.company.tenantId;

    // Fetch all active restaurants belonging to this tenant (company-wide scope)
    const allRestaurantsInTenant = await this.prisma.restaurant.findMany({
      where: {
        isActive: true,
        brand: { company: { tenantId } },
      },
      select: { id: true },
    });

    const totalRevenue = await this.prisma.financialSnapshot.aggregate({
      where: {
        restaurantId: { in: allRestaurantsInTenant.map((r) => r.id) },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { revenue: true },
    });

    const restRevenue = this.toNumber(restaurantRevenue._sum.revenue);
    const totalRev = this.toNumber(totalRevenue._sum.revenue);

    if (totalRev === 0) {
      return 0;
    }

    return restRevenue / totalRev;
  }

  /**
   * Get dashboard summary — aggregated view with brand breakdown.
   * Returns the format expected by the mobile app (DashboardSummaryDto).
   */
  async getDashboardSummary(
    tenantId: string,
    periodType: string,
    dateFrom: string,
    dateTo: string,
    restaurantFilter?: string[],
  ): Promise<DashboardSummaryDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Get all brands for this tenant (through companies)
    const brands = await this.prisma.brand.findMany({
      where: {
        company: { tenantId },
        isActive: true,
      },
      include: {
        _count: { select: { restaurants: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get all restaurant IDs for this tenant (optionally filtered for OPS_DIRECTOR)
    const allRestaurants = await this.prisma.restaurant.findMany({
      where: {
        brand: { company: { tenantId } },
        isActive: true,
        ...(restaurantFilter ? { id: { in: restaurantFilter } } : {}),
      },
      select: { id: true, brandId: true },
    });

    const allRestaurantIds = allRestaurants.map((r) => r.id);

    // Revenue by restaurant (single query) — raw SQL for Prisma 7 driver adapter compat
    const revenueByRestaurant = await this.prisma.$queryRaw<
      Array<{ restaurantId: string; sum_revenue: number; sum_directExpenses: number }>
    >(Prisma.sql`
      SELECT "restaurantId",
             COALESCE(SUM("revenue"), 0)::float8 AS "sum_revenue",
             COALESCE(SUM("directExpenses"), 0)::float8 AS "sum_directExpenses"
      FROM "finance"."FinancialSnapshot"
      WHERE "restaurantId" = ANY(${allRestaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "restaurantId"
    `);

    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [
        item.restaurantId,
        {
          revenue: this.toNumber(item.sum_revenue),
          expenses: this.toNumber(item.sum_directExpenses),
        },
      ]),
    );

    // Build brand-to-restaurants map
    const brandRestaurantMap = new Map<string, string[]>();
    for (const r of allRestaurants) {
      const list = brandRestaurantMap.get(r.brandId) || [];
      list.push(r.id);
      brandRestaurantMap.set(r.brandId, list);
    }

    let totalRevenue = 0;
    let totalExpenses = 0;

    const brandIndicators: BrandIndicatorDto[] = brands.map((brand) => {
      const restaurantIds = brandRestaurantMap.get(brand.id) || [];
      let brandRevenue = 0;
      let brandExpenses = 0;

      for (const rid of restaurantIds) {
        const data = revenueMap.get(rid);
        if (data) {
          brandRevenue += data.revenue;
          brandExpenses += data.expenses;
        }
      }

      totalRevenue += brandRevenue;
      totalExpenses += brandExpenses;

      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        revenue: brandRevenue,
        expenses: brandExpenses,
        financialResult: brandRevenue - brandExpenses,
        changePercent: 0, // TODO: compare with previous period
        restaurantCount: brand._count.restaurants,
      };
    });

    const lastSyncResult = await this.prisma.syncLog.aggregate({
      where: { tenantId, status: 'SUCCESS' },
      _max: { createdAt: true },
    });
    const lastSyncAt = lastSyncResult._max.createdAt
      ? lastSyncResult._max.createdAt.toISOString()
      : null;

    return {
      tenantId,
      period: { type: periodType, from: dateFrom, to: dateTo },
      totalRevenue,
      totalExpenses,
      financialResult: totalRevenue - totalExpenses,
      brands: brandIndicators,
      lastSyncAt,
      lastSyncStatus: lastSyncAt ? 'success' : null,
    };
  }

  /**
   * Get company-level summary (level 1)
   * Aggregates all brands and restaurants
   * Uses aggregated queries to avoid N+1 problems
   */
  async getCompanySummary(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<CompanySummaryDto[]> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    const companies = await this.prisma.company.findMany({
      where: { tenantId },
    });

    const result: CompanySummaryDto[] = [];

    for (const company of companies) {
      // Get all restaurants for this company in one query
      const restaurants = await this.prisma.restaurant.findMany({
        where: {
          brand: {
            companyId: company.id,
          },
        },
        select: { id: true },
      });

      const restaurantIds = restaurants.map((r) => r.id);

      // Get all revenue for all restaurants in one aggregated query
      const revenueAgg = await this.prisma.financialSnapshot.aggregate({
        where: {
          restaurantId: { in: restaurantIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { revenue: true },
      });
      const totalRevenue = this.toNumber(revenueAgg._sum.revenue);

      // Get all direct expenses for all restaurants in one aggregated query
      const directExpensesAgg = await this.prisma.expense.aggregate({
        where: {
          restaurantId: { in: restaurantIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
          article: {
            allocationType: 'DIRECT',
          },
        },
        _sum: { amount: true },
      });
      const totalDirectExpenses = this.toNumber(directExpensesAgg._sum.amount);

      // Get all allocated expenses for all restaurants in one aggregated query
      const allocatedExpensesAgg = await this.prisma.costAllocation.aggregate({
        where: {
          restaurantId: { in: restaurantIds },
          periodStart: {
            lte: endDate,
          },
          periodEnd: {
            gte: startDate,
          },
        },
        _sum: { allocatedAmount: true },
      });
      const totalAllocatedExpenses = this.toNumber(
        allocatedExpensesAgg._sum.allocatedAmount,
      );

      result.push({
        id: company.id,
        name: company.name,
        revenue: totalRevenue,
        directExpenses: totalDirectExpenses,
        allocatedExpenses: totalAllocatedExpenses,
        netProfit: totalRevenue - totalDirectExpenses - totalAllocatedExpenses,
      });
    }

    return result;
  }

  /**
   * Get brand-level summary (level 2)
   * Aggregates all restaurants within a brand
   * Uses aggregated queries to avoid N+1 problems
   */
  async getBrandSummary(
    companyId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<BrandSummaryDto[]> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    const brands = await this.prisma.brand.findMany({
      where: { companyId },
    });

    const result: BrandSummaryDto[] = [];

    for (const brand of brands) {
      // Get all restaurants for this brand in one query
      const restaurants = await this.prisma.restaurant.findMany({
        where: { brandId: brand.id },
        select: { id: true },
      });

      const restaurantIds = restaurants.map((r) => r.id);

      // Get all revenue for all restaurants in this brand in one aggregated query
      const revenueAgg = await this.prisma.financialSnapshot.aggregate({
        where: {
          restaurantId: { in: restaurantIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { revenue: true },
      });
      const totalRevenue = this.toNumber(revenueAgg._sum.revenue);

      // Get all direct expenses for all restaurants in this brand in one aggregated query
      const directExpensesAgg = await this.prisma.expense.aggregate({
        where: {
          restaurantId: { in: restaurantIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
          article: {
            allocationType: 'DIRECT',
          },
        },
        _sum: { amount: true },
      });
      const totalDirectExpenses = this.toNumber(directExpensesAgg._sum.amount);

      // Get all allocated expenses for all restaurants in this brand in one aggregated query
      const allocatedExpensesAgg = await this.prisma.costAllocation.aggregate({
        where: {
          restaurantId: { in: restaurantIds },
          periodStart: {
            lte: endDate,
          },
          periodEnd: {
            gte: startDate,
          },
        },
        _sum: { allocatedAmount: true },
      });
      const totalAllocatedExpenses = this.toNumber(
        allocatedExpensesAgg._sum.allocatedAmount,
      );

      result.push({
        id: brand.id,
        name: brand.name,
        revenue: totalRevenue,
        directExpenses: totalDirectExpenses,
        allocatedExpenses: totalAllocatedExpenses,
        netProfit: totalRevenue - totalDirectExpenses - totalAllocatedExpenses,
      });
    }

    return result;
  }

  /**
   * Get restaurant-level summary (level 3)
   * Shows per-restaurant financials
   * Uses aggregated queries to avoid N+1 problems
   */
  async getRestaurantSummary(
    brandId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<RestaurantSummaryDto[]> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    const restaurants = await this.prisma.restaurant.findMany({
      where: { brandId },
      select: { id: true, name: true },
    });

    const restaurantIds = restaurants.map((r) => r.id);

    // Get all revenue for all restaurants in one aggregated query (group by restaurantId)
    const revenueByRestaurant = await this.prisma.$queryRaw<
      Array<{ restaurantId: string; sum_revenue: number }>
    >(Prisma.sql`
      SELECT "restaurantId", COALESCE(SUM("revenue"), 0)::float8 AS "sum_revenue"
      FROM "finance"."FinancialSnapshot"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "restaurantId"
    `);

    // Get all direct expenses for all restaurants in one aggregated query (group by restaurantId)
    const directExpensesByRestaurant = await this.prisma.$queryRaw<
      Array<{ restaurantId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT e."restaurantId", COALESCE(SUM(e."amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense" e
      JOIN "finance"."DdsArticle" a ON a."id" = e."articleId"
      WHERE e."restaurantId" = ANY(${restaurantIds})
        AND e."date" >= ${startDate} AND e."date" <= ${endDate}
        AND a."allocationType" = 'DIRECT'
      GROUP BY e."restaurantId"
    `);

    // Get all allocated expenses for all restaurants in one aggregated query (group by restaurantId)
    const allocatedExpensesByRestaurant = await this.prisma.$queryRaw<
      Array<{ restaurantId: string; sum_allocatedAmount: number }>
    >(Prisma.sql`
      SELECT "restaurantId", COALESCE(SUM("allocatedAmount"), 0)::float8 AS "sum_allocatedAmount"
      FROM "finance"."CostAllocation"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "periodStart" <= ${endDate}
        AND "periodEnd" >= ${startDate}
      GROUP BY "restaurantId"
    `);

    // Create maps for quick lookup
    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [
        item.restaurantId,
        this.toNumber(item.sum_revenue),
      ]),
    );

    const directExpensesMap = new Map(
      directExpensesByRestaurant.map((item) => [
        item.restaurantId,
        this.toNumber(item.sum_amount),
      ]),
    );

    const allocatedExpensesMap = new Map(
      allocatedExpensesByRestaurant.map((item) => [
        item.restaurantId,
        this.toNumber(item.sum_allocatedAmount),
      ]),
    );

    // Build result from restaurants with values from maps
    const result: RestaurantSummaryDto[] = restaurants.map((restaurant) => {
      const revenue = revenueMap.get(restaurant.id) || 0;
      const directExpenses = directExpensesMap.get(restaurant.id) || 0;
      const allocatedExpenses = allocatedExpensesMap.get(restaurant.id) || 0;

      return {
        id: restaurant.id,
        name: restaurant.name,
        revenue,
        directExpenses,
        allocatedExpenses,
        netProfit: revenue - directExpenses - allocatedExpenses,
      };
    });

    return result;
  }

  /**
   * Get article-level summary (level 4)
   * Shows expenses by DDS article within a restaurant
   * Includes cost allocation coefficient
   */
  async getArticleSummary(
    restaurantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ArticleSummaryDto[]> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Get all expenses grouped by article
    const expensesByArticle = await this.prisma.$queryRaw<
      Array<{ articleId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT "articleId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense"
      WHERE "restaurantId" = ${restaurantId}
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "articleId"
    `);

    // Get article details for all articles
    const articleIds = expensesByArticle.map((item) => item.articleId);
    const articles = await this.prisma.ddsArticle.findMany({
      where: { id: { in: articleIds } },
      include: { group: true },
    });

    // Create article map for quick lookup
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    // Calculate coefficient
    const coefficient = await this.getCoefficientForRestaurant(
      restaurantId,
      dateFrom,
      dateTo,
    );

    // Build result
    const result: ArticleSummaryDto[] = expensesByArticle
      .map((item) => {
        const article = articleMap.get(item.articleId);
        if (!article) {
          return null;
        }
        return {
          id: article.id,
          name: article.name,
          code: article.code,
          source: article.source,
          allocationType: article.allocationType,
          amount: this.toNumber(item.sum_amount),
          coefficient,
        };
      })
      .filter(Boolean) as ArticleSummaryDto[];

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE-FACING METHODS (match shared-types DTO contracts)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get brand detail with restaurant indicators.
   * Mobile Level 1b: tap a brand card → see its restaurants.
   */
  async getBrandDetail(
    brandId: string,
    periodType: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<BrandDetailDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        restaurants: {
          where: { isActive: true },
          select: { id: true, name: true, brandId: true },
        },
      },
    });

    if (!brand) {
      return {
        id: brandId,
        name: '',
        period: { type: periodType, from: dateFrom, to: dateTo },
        totalRevenue: 0,
        totalExpenses: 0,
        restaurants: [],
      };
    }

    const restaurantIds = brand.restaurants.map((r) => r.id);

    // Revenue breakdown per restaurant (single query, grouped)
    const snapshots = await this.prisma.$queryRaw<
      Array<{
        restaurantId: string;
        sum_revenue: number;
        sum_revenueCash: number;
        sum_revenueKaspi: number;
        sum_revenueHalyk: number;
        sum_revenueYandex: number;
        sum_directExpenses: number;
      }>
    >(Prisma.sql`
      SELECT "restaurantId",
             COALESCE(SUM("revenue"), 0)::float8 AS "sum_revenue",
             COALESCE(SUM("revenueCash"), 0)::float8 AS "sum_revenueCash",
             COALESCE(SUM("revenueKaspi"), 0)::float8 AS "sum_revenueKaspi",
             COALESCE(SUM("revenueHalyk"), 0)::float8 AS "sum_revenueHalyk",
             COALESCE(SUM("revenueYandex"), 0)::float8 AS "sum_revenueYandex",
             COALESCE(SUM("directExpenses"), 0)::float8 AS "sum_directExpenses"
      FROM "finance"."FinancialSnapshot"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "restaurantId"
    `);

    const snapshotMap = new Map(snapshots.map((s) => [s.restaurantId, s]));

    // Distributed expenses per restaurant
    const allocations = await this.prisma.$queryRaw<
      Array<{ restaurantId: string; sum_allocatedAmount: number }>
    >(Prisma.sql`
      SELECT "restaurantId", COALESCE(SUM("allocatedAmount"), 0)::float8 AS "sum_allocatedAmount"
      FROM "finance"."CostAllocation"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "periodStart" <= ${endDate}
        AND "periodEnd" >= ${startDate}
      GROUP BY "restaurantId"
    `);

    const allocationMap = new Map(
      allocations.map((a) => [
        a.restaurantId,
        this.toNumber(a.sum_allocatedAmount),
      ]),
    );

    let totalRevenue = 0;
    let totalExpenses = 0;

    const restaurants: RestaurantIndicatorDto[] = brand.restaurants.map((r) => {
      const snap = snapshotMap.get(r.id);
      const revenue = this.toNumber(snap?.sum_revenue);
      const cash = this.toNumber(snap?.sum_revenueCash);
      const kaspi = this.toNumber(snap?.sum_revenueKaspi);
      const halyk = this.toNumber(snap?.sum_revenueHalyk);
      const yandex = this.toNumber(snap?.sum_revenueYandex);
      const directExp = this.toNumber(snap?.sum_directExpenses);
      const distributedExp = allocationMap.get(r.id) || 0;
      const financialResult = revenue - directExp - distributedExp;

      totalRevenue += revenue;
      totalExpenses += directExp + distributedExp;

      // Status: green if profit > 0, yellow if break-even, red if loss
      let status: 'green' | 'yellow' | 'red' = 'green';
      if (financialResult < 0) status = 'red';
      else if (financialResult === 0) status = 'yellow';

      return {
        id: r.id,
        name: r.name,
        brandId: r.brandId,
        revenue: { total: revenue, cash, kaspi, halyk, yandex, byType: [] },
        directExpenses: directExp,
        distributedExpenses: distributedExp,
        financialResult,
        changePercent: 0, // TODO: compare with previous period
        status,
      };
    });

    return {
      id: brand.id,
      name: brand.name,
      period: { type: periodType, from: dateFrom, to: dateTo },
      totalRevenue,
      totalExpenses,
      restaurants,
    };
  }

  /**
   * Get restaurant detail with expense groups, cash discrepancies, revenue chart.
   * Mobile Level 2: tap a restaurant → see full details.
   */
  async getRestaurantDetail(
    restaurantId: string,
    periodType: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<RestaurantDetailDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { brand: { select: { name: true } } },
    });

    if (!restaurant) {
      return {
        id: restaurantId,
        name: '',
        brandName: '',
        period: { type: periodType, from: dateFrom, to: dateTo },
        revenue: { total: 0, cash: 0, kaspi: 0, halyk: 0, yandex: 0, byType: [] },
        expenseGroups: [],
        directExpensesTotal: 0,
        distributedExpensesTotal: 0,
        distributedExpenseItems: [],
        financialResult: 0,
        salesCount: 0,
        cashDiscrepancies: [],
        revenueChart: [],
      };
    }

    // Revenue breakdown + salesCount (aggregated)
    const revenueAgg = await this.prisma.financialSnapshot.aggregate({
      where: {
        restaurantId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        revenue: true,
        revenueCash: true,
        revenueKaspi: true,
        revenueHalyk: true,
        revenueYandex: true,
        salesCount: true,
      },
    });

    // Dynamic payment type breakdown
    const snapshotIds = (await this.prisma.financialSnapshot.findMany({
      where: { restaurantId, date: { gte: startDate, lte: endDate } },
      select: { id: true },
    })).map(s => s.id);

    const paymentsByType = await this.prisma.$queryRaw<
      Array<{ paymentTypeId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT "paymentTypeId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."SnapshotPayment"
      WHERE "snapshotId" = ANY(${snapshotIds})
      GROUP BY "paymentTypeId"
    `);

    const paymentTypeIds = paymentsByType.map(p => p.paymentTypeId);
    const paymentTypes = await this.prisma.paymentType.findMany({
      where: { id: { in: paymentTypeIds } },
      select: { id: true, name: true, iikoCode: true },
    });
    const ptMap = new Map(paymentTypes.map(pt => [pt.id, pt]));

    const byType: PaymentTypeAmountDto[] = paymentsByType
      .map(p => {
        const pt = ptMap.get(p.paymentTypeId);
        if (!pt) return null;
        return { name: pt.name, iikoCode: pt.iikoCode, amount: this.toNumber(p.sum_amount) };
      })
      .filter((x): x is PaymentTypeAmountDto => x !== null)
      .sort((a, b) => b.amount - a.amount);

    const revenueBreakdown: RevenueBreakdownDto = {
      total: this.toNumber(revenueAgg._sum.revenue),
      cash: this.toNumber(revenueAgg._sum.revenueCash),
      kaspi: this.toNumber(revenueAgg._sum.revenueKaspi),
      halyk: this.toNumber(revenueAgg._sum.revenueHalyk),
      yandex: this.toNumber(revenueAgg._sum.revenueYandex),
      byType,
    };

    // Expense groups: expenses grouped by article group
    const expensesByGroup = await this.prisma.$queryRaw<
      Array<{ articleId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT "articleId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense"
      WHERE "restaurantId" = ${restaurantId}
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "articleId"
    `);

    // Get article details with groups
    const articleIds = expensesByGroup.map((e) => e.articleId);
    const articles = await this.prisma.ddsArticle.findMany({
      where: { id: { in: articleIds } },
      include: { group: true },
    });
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    // Aggregate by group
    const groupTotals = new Map<
      string,
      { name: string; total: number; count: number }
    >();
    let directExpensesTotal = 0;

    for (const exp of expensesByGroup) {
      const article = articleMap.get(exp.articleId);
      if (!article) continue;
      const amount = this.toNumber(exp.sum_amount);
      directExpensesTotal += amount;

      const existing = groupTotals.get(article.groupId);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        groupTotals.set(article.groupId, {
          name: article.group.name,
          total: amount,
          count: 1,
        });
      }
    }

    const expenseGroups: ExpenseGroupDto[] = Array.from(
      groupTotals.entries(),
    ).map(([groupId, data]) => ({
      groupId,
      groupName: data.name,
      totalAmount: data.total,
      articleCount: data.count,
    }));

    // Distributed expenses with article breakdown
    const allocations = await this.prisma.costAllocation.findMany({
      where: {
        restaurantId,
        periodStart: { lte: endDate },
        periodEnd: { gte: startDate },
      },
      include: {
        expense: {
          include: {
            article: true,
          },
        },
      },
    });

    const distributedExpensesTotal = allocations.reduce(
      (sum, a) => sum + this.toNumber(a.allocatedAmount),
      0,
    );

    // Group by article for breakdown
    const distByArticle = new Map<string, { name: string; source: string; amount: number; coefficient: number }>();
    for (const a of allocations) {
      const articleName = a.expense.article?.name ?? 'Без статьи';
      const source = a.expense.source;
      const key = a.expense.articleId ?? 'unknown';
      const existing = distByArticle.get(key);
      if (existing) {
        existing.amount += this.toNumber(a.allocatedAmount);
      } else {
        distByArticle.set(key, {
          name: articleName,
          source,
          amount: this.toNumber(a.allocatedAmount),
          coefficient: this.toNumber(a.coefficient),
        });
      }
    }
    const distributedExpenseItems = Array.from(distByArticle.values())
      .sort((a, b) => b.amount - a.amount);

    // Cash discrepancies
    const cashDiscs = await this.prisma.cashDiscrepancy.findMany({
      where: {
        restaurantId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const cashDiscrepancies: CashDiscrepancyResponseDto[] = cashDiscs.map(
      (cd) => ({
        date: cd.date.toISOString().split('T')[0],
        expected: this.toNumber(cd.expected),
        actual: this.toNumber(cd.actual),
        difference: this.toNumber(cd.difference),
      }),
    );

    // Daily revenue chart
    const dailySnapshots = await this.prisma.financialSnapshot.findMany({
      where: {
        restaurantId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
      select: { date: true, revenue: true },
    });

    const revenueChart: DailyRevenuePointDto[] = dailySnapshots.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      revenue: this.toNumber(s.revenue),
    }));

    return {
      id: restaurant.id,
      name: restaurant.name,
      brandName: restaurant.brand.name,
      period: { type: periodType, from: dateFrom, to: dateTo },
      revenue: revenueBreakdown,
      expenseGroups,
      directExpensesTotal,
      distributedExpensesTotal,
      distributedExpenseItems,
      financialResult:
        revenueBreakdown.total - directExpensesTotal - distributedExpensesTotal,
      salesCount: this.toNumber(revenueAgg._sum.salesCount),
      cashDiscrepancies,
      revenueChart,
    };
  }

  /**
   * Get article group detail with individual article indicators.
   * Mobile Level 3: tap an expense group → see individual articles.
   * @param groupId — DDS article group ID
   * @param restaurantId — scope to this restaurant
   */
  async getArticleGroupDetail(
    groupId: string,
    restaurantId: string,
    periodType: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ArticleGroupDetailDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Get group info
    const group = await this.prisma.ddsArticleGroup.findUnique({
      where: { id: groupId },
    });

    // Get restaurant info
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!group || !restaurant) {
      return {
        groupId,
        groupName: group?.name || '',
        period: { type: periodType, from: dateFrom, to: dateTo },
        restaurantId,
        restaurantName: restaurant?.name || '',
        totalAmount: 0,
        articles: [],
      };
    }

    // Get all articles in this group
    const articlesInGroup = await this.prisma.ddsArticle.findMany({
      where: { groupId },
      select: {
        id: true,
        name: true,
        code: true,
        source: true,
        allocationType: true,
      },
    });

    const articleIds = articlesInGroup.map((a) => a.id);

    // Current period expenses by article
    const currentExpenses = await this.prisma.$queryRaw<
      Array<{ articleId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT "articleId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense"
      WHERE "articleId" = ANY(${articleIds})
        AND "restaurantId" = ${restaurantId}
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "articleId"
    `);

    const currentMap = new Map(
      currentExpenses.map((e) => [e.articleId, this.toNumber(e.sum_amount)]),
    );

    // Previous period: calculate same duration before dateFrom
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1); // 1ms before current start
    const prevStart = new Date(prevEnd.getTime() - periodMs);

    const prevExpenses = await this.prisma.$queryRaw<
      Array<{ articleId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT "articleId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense"
      WHERE "articleId" = ANY(${articleIds})
        AND "restaurantId" = ${restaurantId}
        AND "date" >= ${prevStart} AND "date" <= ${prevEnd}
      GROUP BY "articleId"
    `);

    const prevMap = new Map(
      prevExpenses.map((e) => [e.articleId, this.toNumber(e.sum_amount)]),
    );

    // Calculate total for share percent
    let totalAmount = 0;
    for (const amount of currentMap.values()) {
      totalAmount += amount;
    }

    // Build article indicators
    const articles: ArticleIndicatorDto[] = articlesInGroup
      .map((article) => {
        const amount = currentMap.get(article.id) || 0;
        const prevAmount = prevMap.get(article.id) || 0;
        const changePercent =
          prevAmount > 0
            ? Math.round(((amount - prevAmount) / prevAmount) * 10000) / 100
            : 0;
        const sharePercent =
          totalAmount > 0
            ? Math.round((amount / totalAmount) * 10000) / 100
            : 0;

        return {
          id: article.id,
          name: article.name,
          code: article.code,
          source: article.source as 'IIKO' | 'ONE_C',
          allocationType: article.allocationType as 'DIRECT' | 'DISTRIBUTED',
          amount,
          sharePercent,
          previousPeriodAmount: prevAmount,
          changePercent,
        };
      })
      .filter((a) => a.amount > 0) // Only show articles with expenses
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending

    return {
      groupId: group.id,
      groupName: group.name,
      period: { type: periodType, from: dateFrom, to: dateTo },
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      totalAmount,
      articles,
    };
  }

  /**
   * Get individual expense operations for a specific article and restaurant.
   * Level 4: paginated list of raw Expense records with allocationCoefficient.
   * Access: OWNER only (enforced via DataAccessInterceptor in Phase 4-03).
   */
  async getArticleOperations(
    articleId: string,
    restaurantId: string,
    dateFrom: string,
    dateTo: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    items: Array<{
      id: string;
      date: string;
      amount: number;
      comment: string | null;
      source: 'IIKO' | 'ONE_C';
      allocationCoefficient: number | null;
      restaurantName: string;
    }>;
    total: number;
    period: { from: string; to: string };
  }> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    const where = {
      articleId,
      restaurantId,
      date: { gte: startDate, lte: endDate },
    };

    const total = await this.prisma.expense.count({ where });

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        restaurant: { select: { name: true } },
        costAllocations: {
          select: { coefficient: true },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    const items = expenses.map((exp) => ({
      id: exp.id,
      date: exp.date.toISOString(),
      amount: this.toNumber(exp.amount),
      comment: exp.comment ?? null,
      source: exp.source as 'IIKO' | 'ONE_C',
      allocationCoefficient:
        exp.costAllocations.length > 0
          ? this.toNumber(exp.costAllocations[0].coefficient)
          : null,
      restaurantName: exp.restaurant?.name ?? '',
    }));

    return { items, total, period: { from: dateFrom, to: dateTo } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-RESTAURANT REPORT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * DDS report: expenses grouped by restaurant with article group breakdown.
   * GET /dashboard/reports/dds
   */
  async getReportDds(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<DdsReportDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Get all active restaurants for this tenant
    const restaurants = await this.prisma.restaurant.findMany({
      where: { brand: { company: { tenantId } }, isActive: true },
      select: { id: true, name: true },
    });
    const restaurantIds = restaurants.map((r) => r.id);
    const restaurantNameMap = new Map(restaurants.map((r) => [r.id, r.name]));

    // Group expenses by restaurantId + articleId
    const expenseRows = await this.prisma.$queryRaw<
      Array<{ restaurantId: string | null; articleId: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT "restaurantId", "articleId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "restaurantId", "articleId"
    `);

    // Fetch article details with group name
    const articleIds = [...new Set(expenseRows.map((e) => e.articleId))];
    const articles = await this.prisma.ddsArticle.findMany({
      where: { id: { in: articleIds } },
      include: { group: { select: { name: true } } },
    });
    const articleGroupMap = new Map(
      articles.map((a) => [a.id, a.group?.name ?? 'Unknown']),
    );

    // Build Map<restaurantId, Map<groupName, amount>>
    const restaurantGroupMap = new Map<string, Map<string, number>>();
    for (const row of expenseRows) {
      if (!row.restaurantId) continue;
      const groupName = articleGroupMap.get(row.articleId) ?? 'Unknown';
      const amount = this.toNumber(row.sum_amount);
      if (!restaurantGroupMap.has(row.restaurantId!)) {
        restaurantGroupMap.set(row.restaurantId!, new Map());
      }
      const groupAmounts = restaurantGroupMap.get(row.restaurantId!)!;
      groupAmounts.set(groupName, (groupAmounts.get(groupName) ?? 0) + amount);
    }

    // Build restaurant rows
    let grandTotal = 0;
    const restaurantRows: DdsRestaurantRowDto[] = [];

    for (const restaurantId of restaurantIds) {
      const groupAmounts = restaurantGroupMap.get(restaurantId);
      if (!groupAmounts || groupAmounts.size === 0) continue;

      const totalExpense = Array.from(groupAmounts.values()).reduce(
        (sum, v) => sum + v,
        0,
      );
      grandTotal += totalExpense;

      const groups: DdsRestaurantGroupDto[] = Array.from(
        groupAmounts.entries(),
      ).map(([groupName, amount]) => ({
        groupName,
        amount,
        share: totalExpense > 0 ? Math.round((amount / totalExpense) * 10000) / 100 : 0,
      }));

      restaurantRows.push({
        restaurantId,
        restaurantName: restaurantNameMap.get(restaurantId) ?? '',
        totalExpense,
        groups,
      });
    }

    return {
      restaurants: restaurantRows,
      totals: { totalExpense: grandTotal },
      period: { from: dateFrom, to: dateTo },
    };
  }

  /**
   * Company expenses report: HQ overhead (restaurantId=null) grouped by article.
   * GET /dashboard/reports/company-expenses
   */
  async getReportCompanyExpenses(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<CompanyExpensesReportDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Query unallocated (HQ) expenses — restaurantId is null
    // Filter by tenant via article.group.tenantId
    const expenseRows = await this.prisma.$queryRaw<
      Array<{ articleId: string; source: string; sum_amount: number }>
    >(Prisma.sql`
      SELECT e."articleId", e."source", COALESCE(SUM(e."amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense" e
      JOIN "finance"."DdsArticle" a ON a."id" = e."articleId"
      JOIN "finance"."DdsArticleGroup" g ON g."id" = a."groupId"
      WHERE e."restaurantId" IS NULL
        AND e."date" >= ${startDate} AND e."date" <= ${endDate}
        AND g."tenantId" = ${tenantId}
      GROUP BY e."articleId", e."source"
    `);

    // Fetch article names
    const articleIds = [...new Set(expenseRows.map((e) => e.articleId))];
    const articles = await this.prisma.ddsArticle.findMany({
      where: { id: { in: articleIds } },
      select: { id: true, name: true },
    });
    const articleNameMap = new Map(articles.map((a) => [a.id, a.name]));

    // Compute totals
    const totalAmount = expenseRows.reduce(
      (sum, row) => sum + this.toNumber(row.sum_amount),
      0,
    );

    const categories: CompanyExpenseCategoryDto[] = expenseRows.map((row) => {
      const amount = this.toNumber(row.sum_amount);
      return {
        source: row.source as 'ONE_C' | 'IIKO',
        articleName: articleNameMap.get(row.articleId) ?? '',
        totalAmount: amount,
        share:
          totalAmount > 0
            ? Math.round((amount / totalAmount) * 10000) / 100
            : 0,
      };
    });

    return {
      categories,
      totals: { totalAmount },
      period: { from: dateFrom, to: dateTo },
    };
  }

  /**
   * Kitchen report: purchases from KitchenPurchase + shipments from KitchenShipment.
   * GET /dashboard/reports/kitchen
   */
  async getReportKitchen(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<KitchenReportDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Purchases — directly filtered by tenantId
    const rawPurchases = await this.prisma.kitchenPurchase.findMany({
      where: { tenantId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    const purchases: KitchenPurchaseItemDto[] = rawPurchases.map((p) => ({
      date: p.date.toISOString(),
      description: p.productName,
      amount: this.toNumber(p.amount),
    }));

    // Get restaurants for tenant to filter shipments
    const restaurants = await this.prisma.restaurant.findMany({
      where: { brand: { company: { tenantId } }, isActive: true },
      select: { id: true, name: true },
    });
    const restaurantIds = restaurants.map((r) => r.id);
    const restaurantNameMap = new Map(restaurants.map((r) => [r.id, r.name]));

    // Shipments grouped by restaurant
    const shipmentRows = await this.prisma.$queryRaw<
      Array<{ restaurantId: string; sum_amount: number; count_id: number }>
    >(Prisma.sql`
      SELECT "restaurantId",
             COALESCE(SUM("amount"), 0)::float8 AS "sum_amount",
             COUNT("id")::int AS "count_id"
      FROM "finance"."KitchenShipment"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "restaurantId"
    `);

    const shipments: KitchenShipmentRowDto[] = shipmentRows.map((row) => ({
      restaurantName: restaurantNameMap.get(row.restaurantId) ?? '',
      totalAmount: this.toNumber(row.sum_amount),
      items: row.count_id,
    }));

    const totalPurchases = purchases.reduce((sum, p) => sum + p.amount, 0);
    const totalShipments = shipments.reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      purchases,
      shipments,
      totals: { totalPurchases, totalShipments },
      period: { from: dateFrom, to: dateTo },
    };
  }

  /**
   * Trends report: daily revenue vs expenses vs net profit.
   * GET /dashboard/reports/trends
   */
  async getReportTrends(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<TrendsReportDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // Get restaurant IDs for tenant
    const restaurants = await this.prisma.restaurant.findMany({
      where: { brand: { company: { tenantId } }, isActive: true },
      select: { id: true },
    });
    const restaurantIds = restaurants.map((r) => r.id);

    // Daily revenue grouped by date
    const revenueRows = await this.prisma.$queryRaw<
      Array<{ date: Date; sum_revenue: number }>
    >(Prisma.sql`
      SELECT "date", COALESCE(SUM("revenue"), 0)::float8 AS "sum_revenue"
      FROM "finance"."FinancialSnapshot"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "date"
      ORDER BY "date" ASC
    `);

    // Daily expenses grouped by date
    const trendExpenseRows = await this.prisma.$queryRaw<
      Array<{ date: Date; sum_amount: number }>
    >(Prisma.sql`
      SELECT "date", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "date"
      ORDER BY "date" ASC
    `);

    // Merge by date string (YYYY-MM-DD) using Almaty timezone (+05:00)
    const dateMap = new Map<string, { revenue: number; expenses: number }>();

    // Convert DB date to Almaty local date string (avoids UTC-5 shift making Apr 1 → Mar 31)
    const toAlmatyDate = (d: Date | string): string => {
      const dt = d instanceof Date ? d : new Date(String(d));
      // Add 5 hours (Almaty UTC+5) then take date portion
      const almaty = new Date(dt.getTime() + 5 * 3600_000);
      return almaty.toISOString().slice(0, 10);
    };

    for (const row of revenueRows) {
      const key = toAlmatyDate(row.date);
      const entry = dateMap.get(key) ?? { revenue: 0, expenses: 0 };
      entry.revenue += this.toNumber(row.sum_revenue);
      dateMap.set(key, entry);
    }

    for (const row of trendExpenseRows) {
      const key = toAlmatyDate(row.date);
      const entry = dateMap.get(key) ?? { revenue: 0, expenses: 0 };
      entry.expenses += this.toNumber(row.sum_amount);
      dateMap.set(key, entry);
    }

    // Build points sorted by date, filter to requested range only
    const points: TrendPointDto[] = Array.from(dateMap.entries())
      .filter(([date]) => date >= dateFrom && date <= dateTo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        expenses: data.expenses,
        netProfit: data.revenue - data.expenses,
      }));

    // Compute summary
    const n = points.length;
    if (n === 0) {
      return {
        points: [],
        summary: {
          avgDailyRevenue: 0,
          avgDailyExpenses: 0,
          totalNetProfit: 0,
        },
        period: { from: dateFrom, to: dateTo },
      };
    }

    const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
    const totalExpenses = points.reduce((sum, p) => sum + p.expenses, 0);

    return {
      points,
      summary: {
        avgDailyRevenue: totalRevenue / n,
        avgDailyExpenses: totalExpenses / n,
        totalNetProfit: totalRevenue - totalExpenses,
      },
      period: { from: dateFrom, to: dateTo },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY REVENUE AGGREGATED
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get company-wide aggregated revenue for the "Выручка детально" mobile screen.
   * Aggregates FinancialSnapshot + SnapshotPayment + Expense + CostAllocation
   * across all restaurants of a tenant for the given period.
   *
   * RBAC: OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR.
   * For OPERATIONS_DIRECTOR pass restaurantFilter (assigned restaurant IDs).
   *
   * GET /dashboard/revenue-aggregated?dateFrom&dateTo&periodType
   */
  async getCompanyRevenueAggregated(
    tenantId: string,
    periodType: string,
    dateFrom: string,
    dateTo: string,
    restaurantFilter?: string[],
  ): Promise<CompanyRevenueAggregatedDto> {
    const startDate = this.parseStartDate(dateFrom);
    const endDate = this.parseEndDate(dateTo);

    // ── 1. Resolve active restaurant IDs for this tenant (+ OPS_DIRECTOR filter) ──
    const restaurantRows = await this.prisma.restaurant.findMany({
      where: {
        brand: { company: { tenantId } },
        isActive: true,
        ...(restaurantFilter ? { id: { in: restaurantFilter } } : {}),
      },
      select: { id: true, name: true },
    });

    if (restaurantRows.length === 0) {
      return {
        tenantId,
        period: { type: periodType, from: dateFrom, to: dateTo },
        totalRevenue: 0,
        totalDirectExpenses: 0,
        totalDistributedExpenses: 0,
        totalExpenses: 0,
        financialResult: 0,
        paymentBreakdown: [],
        dailyRevenue: [],
        topRestaurants: [],
      };
    }

    const restaurantIds = restaurantRows.map((r) => r.id);
    const restaurantNameMap = new Map(restaurantRows.map((r) => [r.id, r.name]));

    // ── 2. Revenue aggregated per restaurant + per day ──
    const snapshotRows = await this.prisma.$queryRaw<
      Array<{
        restaurantId: string;
        date: Date;
        sum_revenue: number;
        sum_directExpenses: number;
        sum_salesCount: number;
      }>
    >(Prisma.sql`
      SELECT "restaurantId",
             "date",
             COALESCE(SUM("revenue"), 0)::float8          AS "sum_revenue",
             COALESCE(SUM("directExpenses"), 0)::float8   AS "sum_directExpenses",
             COALESCE(SUM("salesCount"), 0)::float8       AS "sum_salesCount"
      FROM "finance"."FinancialSnapshot"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY "restaurantId", "date"
      ORDER BY "date" ASC
    `);

    // Convert DB date to Asia/Almaty YYYY-MM-DD string (UTC+5 shift)
    const toAlmatyDate = (d: Date | string): string => {
      const dt = d instanceof Date ? d : new Date(String(d));
      const almaty = new Date(dt.getTime() + 5 * 3_600_000);
      return almaty.toISOString().slice(0, 10);
    };

    // ── 3. Daily revenue chart (aggregated by date across all restaurants) ──
    const dailyMap = new Map<string, { revenue: number; transactions: number }>();
    // ── 4. Per-restaurant totals for topRestaurants ──
    const restaurantRevMap = new Map<string, number>();

    for (const row of snapshotRows) {
      const dateKey = toAlmatyDate(row.date);
      const revenue = this.toNumber(row.sum_revenue);
      const transactions = this.toNumber(row.sum_salesCount);

      // Accumulate daily
      const dayEntry = dailyMap.get(dateKey) ?? { revenue: 0, transactions: 0 };
      dayEntry.revenue += revenue;
      dayEntry.transactions += transactions;
      dailyMap.set(dateKey, dayEntry);

      // Accumulate per restaurant
      restaurantRevMap.set(
        row.restaurantId,
        (restaurantRevMap.get(row.restaurantId) ?? 0) + revenue,
      );
    }

    const dailyRevenue: DailyRevenuePointAggDto[] = Array.from(dailyMap.entries())
      .filter(([date]) => date >= dateFrom && date <= dateTo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        transactions: data.transactions,
      }));

    // Total revenue = sum across all daily points
    const totalRevenue = dailyRevenue.reduce((s, p) => s + p.revenue, 0);

    // ── 5. Payment breakdown across all restaurants ──
    // Resolve snapshot IDs for the period+restaurants
    const snapshotIdRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT "id"
        FROM "finance"."FinancialSnapshot"
        WHERE "restaurantId" = ANY(${restaurantIds})
          AND "date" >= ${startDate} AND "date" <= ${endDate}
      `,
    );
    const snapshotIds = snapshotIdRows.map((r) => r.id);

    let paymentBreakdown: PaymentBreakdownItemDto[] = [];

    if (snapshotIds.length > 0) {
      const paymentRows = await this.prisma.$queryRaw<
        Array<{ paymentTypeId: string; sum_amount: number }>
      >(Prisma.sql`
        SELECT "paymentTypeId", COALESCE(SUM("amount"), 0)::float8 AS "sum_amount"
        FROM "finance"."SnapshotPayment"
        WHERE "snapshotId" = ANY(${snapshotIds})
        GROUP BY "paymentTypeId"
      `);

      if (paymentRows.length > 0) {
        const ptIds = paymentRows.map((p) => p.paymentTypeId);
        const paymentTypes = await this.prisma.paymentType.findMany({
          where: { id: { in: ptIds } },
          select: { id: true, name: true, iikoCode: true },
        });
        const ptMap = new Map(paymentTypes.map((pt) => [pt.id, pt]));

        paymentBreakdown = paymentRows
          .map((p) => {
            const pt = ptMap.get(p.paymentTypeId);
            if (!pt) return null;
            const amount = this.toNumber(p.sum_amount);
            return {
              name: pt.name,
              iikoCode: pt.iikoCode,
              amount,
              percent:
                totalRevenue > 0
                  ? Math.round((amount / totalRevenue) * 10000) / 100
                  : 0,
            };
          })
          .filter((x): x is PaymentBreakdownItemDto => x !== null)
          .sort((a, b) => b.amount - a.amount);
      }
    }

    // ── 6. Direct expenses total ──
    const directExpensesAgg = await this.prisma.$queryRaw<
      Array<{ sum_amount: number }>
    >(Prisma.sql`
      SELECT COALESCE(SUM(e."amount"), 0)::float8 AS "sum_amount"
      FROM "finance"."Expense" e
      JOIN "finance"."DdsArticle" a ON a."id" = e."articleId"
      WHERE e."restaurantId" = ANY(${restaurantIds})
        AND e."date" >= ${startDate} AND e."date" <= ${endDate}
        AND a."allocationType" = 'DIRECT'
    `);
    const totalDirectExpenses = this.toNumber(directExpensesAgg[0]?.sum_amount);

    // ── 7. Distributed expenses total (CostAllocation) ──
    const distributedAgg = await this.prisma.$queryRaw<
      Array<{ sum_amount: number }>
    >(Prisma.sql`
      SELECT COALESCE(SUM("allocatedAmount"), 0)::float8 AS "sum_amount"
      FROM "finance"."CostAllocation"
      WHERE "restaurantId" = ANY(${restaurantIds})
        AND "periodStart" <= ${endDate}
        AND "periodEnd" >= ${startDate}
    `);
    const totalDistributedExpenses = this.toNumber(distributedAgg[0]?.sum_amount);

    const totalExpenses = totalDirectExpenses + totalDistributedExpenses;
    const financialResult = totalRevenue - totalExpenses;

    // ── 8. Top restaurants by revenue (max 10) ──
    const topRestaurants: TopRestaurantDto[] = Array.from(restaurantRevMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, revenue]) => ({
        id,
        name: restaurantNameMap.get(id) ?? '',
        revenue,
        share:
          totalRevenue > 0
            ? Math.round((revenue / totalRevenue) * 10000) / 100
            : 0,
      }));

    return {
      tenantId,
      period: { type: periodType, from: dateFrom, to: dateTo },
      totalRevenue,
      totalDirectExpenses,
      totalDistributedExpenses,
      totalExpenses,
      financialResult,
      paymentBreakdown,
      dailyRevenue,
      topRestaurants,
    };
  }
}
