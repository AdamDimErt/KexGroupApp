import { useMemo } from 'react';
import { useRestaurantDetail } from './useApi';
import { colors } from '../theme';
import type { PaymentTypeAmountDto, ExpenseGroupDto, CashDiscrepancyDto, DailyRevenuePointDto, DistributedExpenseItemDto } from '../types';

const statusLabels: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Норма',
  yellow: 'Внимание',
  red: 'Ниже среднего',
};

export interface HourlyDataPoint {
  hour: string;
  value: number;
}

export interface EnrichedRestaurant {
  name: string;
  revenue: number;
  expenses: number;
  transactions: number;
  paymentTypes: PaymentTypeAmountDto[];
}

export function usePointDetail(restaurantId: string | null) {
  const { data: restaurantDetail, isLoading, error, refetch, isStale, isOffline, cachedAt } = useRestaurantDetail(restaurantId || '');

  const computed = useMemo(() => {
    if (!restaurantDetail) {
      return {
        restaurant: null,
        status: 'yellow' as const,
        statusColor: colors.yellow,
        statusLabel: 'Загрузка...',
        profit: 0,
        profitColor: colors.textSecondary,
        hourlyData: [] as HourlyDataPoint[],
        planLine: 0,
        maxBar: 0,
        expenseItems: [],
        expenseGroups: [] as ExpenseGroupDto[],
        directExpensesTotal: 0,
        distributedExpensesTotal: 0,
        distributedExpenseItems: [] as DistributedExpenseItemDto[],
        financialResult: 0,
        cashDiscrepancies: [] as CashDiscrepancyDto[],
        revenueChart: [] as DailyRevenuePointDto[],
        isLoading: true,
        error: null,
      };
    }

    const status = restaurantDetail.financialResult >= 0 ? ('green' as const) : ('red' as const);
    const col = status === 'green' ? colors.green : colors.red;
    const profit = restaurantDetail.financialResult;
    const profitColor = profit >= 0 ? colors.green : colors.red;
    const statusLabel = statusLabels[status];

    // Convert daily revenue points to hourly data format for chart display
    const revenuePoints = restaurantDetail.revenueChart || [];
    const hourlyData: HourlyDataPoint[] = revenuePoints.map(point => ({
      hour: new Date(point.date).getHours() + 'h',
      value: point.revenue,
    }));

    const maxBar = hourlyData.length > 0
      ? Math.max(...hourlyData.map(d => d.value))
      : 0;

    // Calculate average as plan line
    const planLine = hourlyData.length > 0
      ? hourlyData.reduce((sum, d) => sum + d.value, 0) / hourlyData.length
      : 0;

    // chartW/barW удалены: ширина графика считается в DailyRevenueChart внутри
    // PointDetailScreen через useWindowDimensions (реакция на поворот / split-screen).

    // Transform expense groups to simple items
    const expenseItems = restaurantDetail.expenseGroups.map(group => ({
      label: group.groupName,
      amount: group.totalAmount,
    }));

    // Enrich restaurant with properties screen expects
    const revenueObj = restaurantDetail.revenue;
    const revenue = typeof revenueObj === 'number'
      ? revenueObj
      : revenueObj.total;

    // Extract dynamic payment types from byType array (sorted by amount desc)
    let paymentTypes: PaymentTypeAmountDto[] =
      typeof revenueObj === 'object' && revenueObj !== null && Array.isArray(revenueObj.byType)
        ? revenueObj.byType.filter(pt => pt.amount > 0)
        : [];

    // Fallback: if SnapshotPayment breakdown is missing or incomplete (sum < 80% of revenue),
    // build from legacy revenueCash/Kaspi/Halyk/Yandex columns + "Прочее" remainder
    const byTypeSum = paymentTypes.reduce((s, p) => s + p.amount, 0);
    if (revenue > 0 && byTypeSum < revenue * 0.8 && typeof revenueObj === 'object' && revenueObj !== null) {
      const fallback: PaymentTypeAmountDto[] = [];
      if (revenueObj.cash > 0) fallback.push({ name: 'Наличные', iikoCode: 'Cash', amount: revenueObj.cash });
      if (revenueObj.kaspi > 0) fallback.push({ name: 'Каспи банк', iikoCode: 'Kaspi', amount: revenueObj.kaspi });
      if (revenueObj.halyk > 0) fallback.push({ name: 'Халык банк', iikoCode: 'Halyk', amount: revenueObj.halyk });
      if (revenueObj.yandex > 0) fallback.push({ name: 'Яндекс', iikoCode: 'Yandex_food', amount: revenueObj.yandex });
      const known = fallback.reduce((s, p) => s + p.amount, 0);
      const other = revenue - known;
      if (other > revenue * 0.01) fallback.push({ name: 'Прочее', iikoCode: 'Other', amount: other });
      paymentTypes = fallback.sort((a, b) => b.amount - a.amount);
    }

    const enrichedRestaurant: EnrichedRestaurant = {
      name: restaurantDetail.name,
      revenue,
      expenses: restaurantDetail.directExpensesTotal + restaurantDetail.distributedExpensesTotal,
      transactions: restaurantDetail.salesCount ?? 0,
      paymentTypes,
    };

    return {
      restaurant: enrichedRestaurant,
      status,
      statusColor: col,
      statusLabel,
      profit,
      profitColor,
      hourlyData,
      planLine,
      maxBar,
      expenseItems,
      expenseGroups: restaurantDetail.expenseGroups,
      directExpensesTotal: restaurantDetail.directExpensesTotal,
      distributedExpensesTotal: restaurantDetail.distributedExpensesTotal,
      distributedExpenseItems: restaurantDetail.distributedExpenseItems ?? [],
      financialResult: restaurantDetail.financialResult,
      cashDiscrepancies: restaurantDetail.cashDiscrepancies ?? [],
      revenueChart: restaurantDetail.revenueChart ?? [],
      isLoading,
      error,
    };
  }, [restaurantId, restaurantDetail, isLoading, error]);

  return { ...computed, refetch, isStale, isOffline, cachedAt };
}
