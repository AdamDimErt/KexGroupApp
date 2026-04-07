// DDS Report DTOs

export class DdsRestaurantGroupDto {
  groupName: string;
  amount: number;
  share: number;
}

export class DdsRestaurantRowDto {
  restaurantId: string;
  restaurantName: string;
  totalExpense: number;
  groups: DdsRestaurantGroupDto[];
}

export class DdsReportDto {
  restaurants: DdsRestaurantRowDto[];
  totals: { totalExpense: number };
  period: { from: string; to: string };
}

// Company Expenses Report DTOs

export class CompanyExpenseCategoryDto {
  source: 'ONE_C' | 'IIKO';
  articleName: string;
  totalAmount: number;
  share: number;
}

export class CompanyExpensesReportDto {
  categories: CompanyExpenseCategoryDto[];
  totals: { totalAmount: number };
  period: { from: string; to: string };
}

// Kitchen Report DTOs

export class KitchenPurchaseItemDto {
  date: string;
  description: string;
  amount: number;
}

export class KitchenShipmentRowDto {
  restaurantName: string;
  totalAmount: number;
  items: number;
}

export class KitchenReportDto {
  purchases: KitchenPurchaseItemDto[];
  shipments: KitchenShipmentRowDto[];
  totals: { totalPurchases: number; totalShipments: number };
  period: { from: string; to: string };
}

// Trends Report DTOs

export class TrendPointDto {
  date: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export class TrendsReportDto {
  points: TrendPointDto[];
  summary: {
    avgDailyRevenue: number;
    avgDailyExpenses: number;
    totalNetProfit: number;
  };
  period: { from: string; to: string };
}
