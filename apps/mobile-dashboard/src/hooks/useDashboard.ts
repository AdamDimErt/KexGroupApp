import { useCallback, useState } from 'react';
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

/** Returns a time-aware greeting in Russian */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

export function useDashboard(onLogout: () => void) {
  const { data: summary, isLoading, error, refetch, isStale, isOffline, cachedAt } = useDashboardSummary();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastSyncAt = summary?.lastSyncAt ?? null;
  const lastSyncStatus = summary?.lastSyncStatus ?? null;

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

  /** Pull-to-refresh handler — sets refreshing state, refetches, then clears */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      refetch();
    } finally {
      // Give a brief moment so the spinner is visible
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [refetch]);

  const greeting = getGreeting();

  return {
    totalRevenue,
    totalExpenses,
    financialResult,
    totalRestaurantCount,
    restaurantItems,
    confirmLogout,
    isLoading,
    isRefreshing,
    error,
    lastSyncAt,
    lastSyncStatus,
    refetch,
    handleRefresh,
    greeting,
    isStale,
    isOffline,
    cachedAt,
  };
}
