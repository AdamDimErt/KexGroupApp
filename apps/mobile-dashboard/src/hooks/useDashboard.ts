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

  // Transform brands to restaurant items for compatibility with existing UI
  const restaurantItems: DashboardRestaurantItem[] = (summary?.brands ?? []).map(brand => {
    const status: 'green' | 'yellow' | 'red' = brand.financialResult >= 0 ? 'green' : (brand.changePercent < -10 ? 'red' : 'yellow');
    return {
      id: brand.id,
      name: brand.name,
      city: brand.slug || 'N/A',  // Use slug as placeholder for city
      type: `${brand.restaurantCount} филиал${brand.restaurantCount !== 1 ? 'ов' : ''}`,  // Show restaurant count as type
      revenue: brand.revenue,
      transactions: brand.restaurantCount,
      dev: brand.financialResult,
      status,
      planPct: brand.revenue,
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
    restaurantItems,
    confirmLogout,
    isLoading,
    error,
  };
}
