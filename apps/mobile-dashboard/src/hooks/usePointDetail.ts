import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useRestaurantDetail } from './useApi';
import { colors } from '../theme';

const statusLabels: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Норма',
  yellow: 'Внимание',
  red: 'Ниже плана',
};

export interface HourlyDataPoint {
  hour: string;
  value: number;
}

export interface PaymentBreakdown {
  cash: number;
  kaspi: number;
  halyk: number;
  yandex: number;
  other: number;
}

export interface EnrichedRestaurant {
  name: string;
  revenue: number;
  expenses: number;
  transactions: number;
  paymentBreakdown: PaymentBreakdown;
}

export function usePointDetail(restaurantId: string | null) {
  const { data: restaurantDetail, isLoading, error } = useRestaurantDetail(restaurantId || '');

  return useMemo(() => {
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
        chartW: Dimensions.get('window').width - 80,
        barW: 0,
        expenseItems: [],
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

    const chartW = Dimensions.get('window').width - 80;
    const barW = hourlyData.length > 0 ? (chartW / hourlyData.length) - 6 : 0;

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

    // Extract payment type breakdown
    const paymentBreakdown: PaymentBreakdown = typeof revenueObj === 'object' && revenueObj !== null
      ? {
          cash: revenueObj.cash || 0,
          kaspi: revenueObj.kaspi || 0,
          halyk: revenueObj.halyk || 0,
          yandex: revenueObj.yandex || 0,
          other: Math.max(0, (revenueObj.total || 0) - (revenueObj.cash || 0) - (revenueObj.kaspi || 0) - (revenueObj.halyk || 0) - (revenueObj.yandex || 0)),
        }
      : { cash: 0, kaspi: 0, halyk: 0, yandex: 0, other: 0 };

    const enrichedRestaurant: EnrichedRestaurant = {
      name: restaurantDetail.name,
      revenue,
      expenses: restaurantDetail.directExpensesTotal + restaurantDetail.distributedExpensesTotal,
      transactions: restaurantDetail.revenueChart?.length ?? 0,
      paymentBreakdown,
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
      chartW,
      barW,
      expenseItems,
      isLoading,
      error,
    };
  }, [restaurantId, restaurantDetail, isLoading, error]);
}
