import { PeriodDto } from './summary.dto';

export class PaymentBreakdownItemDto {
  name: string;
  iikoCode: string;
  amount: number;
  percent: number;
}

export class DailyRevenuePointAggDto {
  date: string;        // YYYY-MM-DD
  revenue: number;
  transactions: number;
}

export class TopRestaurantDto {
  id: string;
  name: string;
  revenue: number;
  share: number;       // percent of totalRevenue
}

export class CompanyRevenueAggregatedDto {
  tenantId: string;
  period: PeriodDto;
  totalRevenue: number;
  totalDirectExpenses: number;
  totalDistributedExpenses: number;
  totalExpenses: number;
  financialResult: number;

  // Payment breakdown aggregated across all restaurants
  paymentBreakdown: PaymentBreakdownItemDto[];

  // Daily revenue chart aggregated by date
  dailyRevenue: DailyRevenuePointAggDto[];

  // Top 10 restaurants by revenue contribution
  topRestaurants: TopRestaurantDto[];
}
