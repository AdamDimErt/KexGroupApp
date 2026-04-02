import { Alert } from 'react-native';
import { useDashboardSummary } from './useApi';
import type { BrandIndicatorDto } from '../types';

export interface DashboardRestaurantItem {
  id: string;
  name: string;
  city: string;  // Placeholder from brand slug
  type: string;  // Placeholder from restaurant count
  revenue: number;
  transactions: number;  // Placeholder from restaurant count
  dev: number;
  status: 'green' | 'yellow' | 'red';
  planPct: number;
}

export function useDashboard(onLogout: () => void) {
  const { data: summary, isLoading, error } = useDashboardSummary();

  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const financialResult = summary?.financialResult ?? 0;
  const totalRestaurantCount = (summary?.brands ?? []).reduce((sum, b) => sum + b.restaurantCount, 0);

  // Transform brands to restaurant items for compatibility with existing UI
  const maxRevenue = Math.max(...(summary?.brands ?? []).map(b => b.revenue), 1);
  const restaurantItems: DashboardRestaurantItem[] = (summary?.brands ?? []).map(brand => {
    const status: 'green' | 'yellow' | 'red' = brand.financialResult >= 0 ? 'green' : (brand.changePercent < -10 ? 'red' : 'yellow');
    return {
      id: brand.id,
      name: brand.name,
      city: (brand.slug || brand.name).toUpperCase(),
      type: `${brand.restaurantCount} филиал${brand.restaurantCount !== 1 ? 'ов' : ''}`,
      revenue: brand.revenue,
      transactions: brand.restaurantCount,
      dev: brand.changePercent,
      status,
      planPct: Math.round((brand.revenue / maxRevenue) * 100),
    };
  });

  const confirmLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: onLogout },
    ]);
  };

  return {
    totalRevenue,
    totalExpenses,
    financialResult,
    totalRestaurantCount,
    restaurantItems,
    confirmLogout,
    isLoading,
    error,
  };
}
