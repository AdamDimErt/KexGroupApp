import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useDashboardSummary } from './useApi';
import type { BrandIndicatorDto } from '../types';
import {
  resolveBrand,
  mapLegacyStatus,
  computeMarginPct,
  computePlanAttainment,
  formatPeriodLabel,
} from '../utils/brand';

export interface DashboardRestaurantItem {
  id: string;
  name: string;
  city: string;
  // NEW fields (required by RestaurantCard v2)
  brand: 'BNA' | 'DNA';
  cuisine: 'Burger' | 'Doner';
  revenue: number;
  plannedRevenue: number; // STUB: revenue * 1.05 — Phase 11: replace with real plan from finance-service API
  marginPct: number | null;
  deltaPct: number | null;
  planAttainmentPct: number;
  planMarkPct: number;
  periodLabel: string;
  transactions: number | null; // STUB: null at brand level — salesCount only on RestaurantDetailDto
  status: 'above' | 'onplan' | 'below' | 'offline' | 'loading';
  // Keep legacy for backward-compat during transition (will remove later)
  type?: string;
  dev?: number;
  planPct?: number;
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

  const periodLabel = formatPeriodLabel(summary?.period?.from, summary?.period?.to);

  // Transform brands to restaurant items for compatibility with existing UI
  const restaurantItems: DashboardRestaurantItem[] = (summary?.brands ?? []).map((brand: BrandIndicatorDto) => {
    const legacyStatus: 'green' | 'yellow' | 'red' =
      brand.financialResult >= 0 ? 'green' : (brand.changePercent < -10 ? 'red' : 'yellow');
    const { code, cuisine } = resolveBrand(brand.name);
    const plannedRevenue = brand.revenue * 1.05; // STUB — Phase 11: real plan from finance-service API
    return {
      id: brand.id,
      name: brand.name,
      city: (brand.slug || brand.name).toUpperCase(),
      brand: code,
      cuisine,
      revenue: brand.revenue,
      plannedRevenue,
      marginPct: computeMarginPct(brand.revenue, brand.financialResult),
      deltaPct: brand.changePercent,
      planAttainmentPct: computePlanAttainment(brand.revenue, plannedRevenue),
      planMarkPct: 100,
      periodLabel,
      transactions: null, // STUB: brand-level has no salesCount — Phase 11: aggregate from restaurants
      status: mapLegacyStatus(legacyStatus),
      // Legacy backward-compat fields
      type: `${brand.restaurantCount} филиал${brand.restaurantCount !== 1 ? 'ов' : ''}`,
      dev: brand.changePercent,
      planPct: Math.round((brand.revenue / Math.max(plannedRevenue, 1)) * 100),
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
