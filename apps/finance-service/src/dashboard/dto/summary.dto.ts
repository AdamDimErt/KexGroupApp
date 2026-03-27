export class CompanySummaryDto {
  id: string;
  name: string;
  revenue: number;
  directExpenses: number;
  allocatedExpenses: number;
  netProfit: number;
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
