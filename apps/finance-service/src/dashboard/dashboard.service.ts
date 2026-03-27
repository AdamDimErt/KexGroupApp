import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompanySummaryDto,
  BrandSummaryDto,
  RestaurantSummaryDto,
  ArticleSummaryDto,
} from './dto/summary.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

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
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

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
   * Get company-level summary (level 1)
   * Aggregates all brands and restaurants
   * Uses aggregated queries to avoid N+1 problems
   */
  async getCompanySummary(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<CompanySummaryDto[]> {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

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
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

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
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

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
    const allocatedExpensesByRestaurant = await this.prisma.costAllocation.groupBy({
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
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

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
    const result: ArticleSummaryDto[] = expensesByArticle.map((item) => {
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
    }).filter(Boolean) as ArticleSummaryDto[];

    return result;
  }
}
