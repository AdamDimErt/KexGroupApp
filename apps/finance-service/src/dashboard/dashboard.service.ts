import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    // dateStr = "2026-01-15"
    // Almaty midnight = UTC (00:00 - 5h) = previous day 19:00 UTC
    return new Date(`${dateStr}T00:00:00${TZ_OFFSET}`);
  }

  /**
   * Parse date string as end-of-day in Asia/Almaty timezone.
   * Returns UTC Date representing 23:59:59.999 Almaty time.
   */
  private parseEndDate(dateStr: string): Date {
    return new Date(`${dateStr}T23:59:59.999${TZ_OFFSET}`);
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
    // First, get all restaurants in the same brand
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { brandId: true },
    });

    if (!restaurant) {
      return 0;
    }

    const allRestaurantsInBrand = await this.prisma.restaurant.findMany({
      where: { brandId: restaurant.brandId },
      select: { id: true },
    });

    const totalRevenue = await this.prisma.financialSnapshot.aggregate({
      where: {
        restaurantId: { in: allRestaurantsInBrand.map((r) => r.id) },
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

    // Revenue by restaurant (single query)
    const revenueByRestaurant = await this.prisma.financialSnapshot.groupBy({
      by: ['restaurantId'],
      where: {
        restaurantId: { in: allRestaurantIds },
        date: { gte: startDate, lte: endDate },
      },
      _sum: { revenue: true, directExpenses: true },
    });

    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [
        item.restaurantId,
        {
          revenue: this.toNumber(item._sum.revenue),
          expenses: this.toNumber(item._sum.directExpenses),
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

    return {
      tenantId,
      period: { type: periodType, from: dateFrom, to: dateTo },
      totalRevenue,
      totalExpenses,
      financialResult: totalRevenue - totalExpenses,
      brands: brandIndicators,
      lastSyncAt: null, // TODO: track last sync timestamp
      lastSyncStatus: null,
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
    const revenueByRestaurant = await this.prisma.financialSnapshot.groupBy({
      by: ['restaurantId'],
      where: {
        restaurantId: { in: restaurantIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { revenue: true },
    });

    // Get all direct expenses for all restaurants in one aggregated query (group by restaurantId)
    const directExpensesByRestaurant = await this.prisma.expense.groupBy({
      by: ['restaurantId'],
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

    // Get all allocated expenses for all restaurants in one aggregated query (group by restaurantId)
    const allocatedExpensesByRestaurant =
      await this.prisma.costAllocation.groupBy({
        by: ['restaurantId'],
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

    // Create maps for quick lookup
    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [
        item.restaurantId,
        this.toNumber(item._sum.revenue),
      ]),
    );

    const directExpensesMap = new Map(
      directExpensesByRestaurant.map((item) => [
        item.restaurantId,
        this.toNumber(item._sum.amount),
      ]),
    );

    const allocatedExpensesMap = new Map(
      allocatedExpensesByRestaurant.map((item) => [
        item.restaurantId,
        this.toNumber(item._sum.allocatedAmount),
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
    const expensesByArticle = await this.prisma.expense.groupBy({
      by: ['articleId'],
      where: {
        restaurantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

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
          amount: this.toNumber(item._sum.amount),
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
    const snapshots = await this.prisma.financialSnapshot.groupBy({
      by: ['restaurantId'],
      where: {
        restaurantId: { in: restaurantIds },
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        revenue: true,
        revenueCash: true,
        revenueKaspi: true,
        revenueHalyk: true,
        revenueYandex: true,
        directExpenses: true,
      },
    });

    const snapshotMap = new Map(snapshots.map((s) => [s.restaurantId, s]));

    // Distributed expenses per restaurant
    const allocations = await this.prisma.costAllocation.groupBy({
      by: ['restaurantId'],
      where: {
        restaurantId: { in: restaurantIds },
        periodStart: { lte: endDate },
        periodEnd: { gte: startDate },
      },
      _sum: { allocatedAmount: true },
    });

    const allocationMap = new Map(
      allocations.map((a) => [
        a.restaurantId,
        this.toNumber(a._sum.allocatedAmount),
      ]),
    );

    let totalRevenue = 0;
    let totalExpenses = 0;

    const restaurants: RestaurantIndicatorDto[] = brand.restaurants.map((r) => {
      const snap = snapshotMap.get(r.id);
      const revenue = this.toNumber(snap?._sum.revenue);
      const cash = this.toNumber(snap?._sum.revenueCash);
      const kaspi = this.toNumber(snap?._sum.revenueKaspi);
      const halyk = this.toNumber(snap?._sum.revenueHalyk);
      const yandex = this.toNumber(snap?._sum.revenueYandex);
      const directExp = this.toNumber(snap?._sum.directExpenses);
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

    const paymentsByType = await this.prisma.snapshotPayment.groupBy({
      by: ['paymentTypeId'],
      where: { snapshotId: { in: snapshotIds } },
      _sum: { amount: true },
    });

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
        return { name: pt.name, iikoCode: pt.iikoCode, amount: this.toNumber(p._sum.amount) };
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
    const expensesByGroup = await this.prisma.expense.groupBy({
      by: ['articleId'],
      where: {
        restaurantId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

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
      const amount = this.toNumber(exp._sum.amount);
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

    // Distributed expenses total
    const allocatedAgg = await this.prisma.costAllocation.aggregate({
      where: {
        restaurantId,
        periodStart: { lte: endDate },
        periodEnd: { gte: startDate },
      },
      _sum: { allocatedAmount: true },
    });
    const distributedExpensesTotal = this.toNumber(
      allocatedAgg._sum.allocatedAmount,
    );

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
    const currentExpenses = await this.prisma.expense.groupBy({
      by: ['articleId'],
      where: {
        articleId: { in: articleIds },
        restaurantId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const currentMap = new Map(
      currentExpenses.map((e) => [e.articleId, this.toNumber(e._sum.amount)]),
    );

    // Previous period: calculate same duration before dateFrom
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1); // 1ms before current start
    const prevStart = new Date(prevEnd.getTime() - periodMs);

    const prevExpenses = await this.prisma.expense.groupBy({
      by: ['articleId'],
      where: {
        articleId: { in: articleIds },
        restaurantId,
        date: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true },
    });

    const prevMap = new Map(
      prevExpenses.map((e) => [e.articleId, this.toNumber(e._sum.amount)]),
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
}
