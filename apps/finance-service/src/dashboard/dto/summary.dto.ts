export class CompanySummaryDto {
  id: string;
  name: string;
  revenue: number;
  directExpenses: number;
  allocatedExpenses: number;
  netProfit: number;
}

export class BrandIndicatorDto {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  expenses: number;
  financialResult: number;
  changePercent: number;
  restaurantCount: number;
}

export class DashboardSummaryDto {
  tenantId: string;
  period: {
    type: string;
    from: string;
    to: string;
  };
  totalRevenue: number;
  totalExpenses: number;
  financialResult: number;
  brands: BrandIndicatorDto[];
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | null;
}

export class BrandSummaryDto {
  id: string;
  name: string;
  revenue: number;
  directExpenses: number;
  allocatedExpenses: number;
  netProfit: number;
}

export class RestaurantSummaryDto {
  id: string;
  name: string;
  revenue: number;
  directExpenses: number;
  allocatedExpenses: number;
  netProfit: number;
}

export class ArticleSummaryDto {
  id: string;
  name: string;
  code: string | null;
  source: string;
  allocationType: string;
  amount: number;
  coefficient?: number; // Cost allocation coefficient: restaurant.revenue / sum(all_restaurants.revenue)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE-FACING DTOs (match shared-types contracts)
// ═══════════════════════════════════════════════════════════════════════════════

export class PeriodDto {
  type: string;
  from: string;
  to: string;
}

export class RevenueBreakdownDto {
  total: number;
  cash: number;
  kaspi: number;
  halyk: number;
  yandex: number;
}

export class RestaurantIndicatorDto {
  id: string;
  name: string;
  brandId: string;
  revenue: RevenueBreakdownDto;
  directExpenses: number;
  distributedExpenses: number;
  financialResult: number;
  changePercent: number;
  status: 'green' | 'yellow' | 'red';
}

export class BrandDetailDto {
  id: string;
  name: string;
  period: PeriodDto;
  totalRevenue: number;
  totalExpenses: number;
  restaurants: RestaurantIndicatorDto[];
}

export class ExpenseGroupDto {
  groupId: string;
  groupName: string;
  totalAmount: number;
  articleCount: number;
}

export class CashDiscrepancyResponseDto {
  date: string;
  expected: number;
  actual: number;
  difference: number;
}

export class DailyRevenuePointDto {
  date: string;
  revenue: number;
}

export class RestaurantDetailDto {
  id: string;
  name: string;
  brandName: string;
  period: PeriodDto;
  revenue: RevenueBreakdownDto;
  expenseGroups: ExpenseGroupDto[];
  directExpensesTotal: number;
  distributedExpensesTotal: number;
  financialResult: number;
  cashDiscrepancies: CashDiscrepancyResponseDto[];
  revenueChart: DailyRevenuePointDto[];
}

export class ArticleIndicatorDto {
  id: string;
  name: string;
  code: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationType: 'DIRECT' | 'DISTRIBUTED';
  amount: number;
  sharePercent: number;
  previousPeriodAmount: number;
  changePercent: number;
}

export class ArticleGroupDetailDto {
  groupId: string;
  groupName: string;
  period: PeriodDto;
  restaurantId: string;
  restaurantName: string;
  totalAmount: number;
  articles: ArticleIndicatorDto[];
}
