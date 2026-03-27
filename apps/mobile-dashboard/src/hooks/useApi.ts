import { useCallback } from 'react';
import { dashboardApi } from '../services/api';
import { useDashboardStore } from '../store/dashboard';

/**
 * Хуки для загрузки данных с API.
 *
 * Используют простой подход с useState + useEffect
 * (react-query подключается в QueryProvider, но для MVP
 * эти хуки работают и без него).
 */

// ─── Generic fetch hook ────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcher()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки');
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, ...deps]);

  return { data, isLoading, error, refetch };
}

// ─── Specific hooks ────────────────────────────────────────────────────────

// TODO: Add date range calculation from periodType
function getPeriodDates(periodType: string): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const toDate = `${year}-${month}-${day}`;

  switch (periodType) {
    case 'today':
      return { dateFrom: toDate, dateTo: toDate };
    case 'thisWeek':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const fromDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      return { dateFrom: fromDate, dateTo: toDate };
    case 'thisMonth':
      return { dateFrom: `${year}-${month}-01`, dateTo: toDate };
    case 'lastMonth':
      const lastMonthDate = new Date(year, parseInt(month) - 2, 1);
      const lastMonthYear = lastMonthDate.getFullYear();
      const lastMonth = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      const lastMonthEnd = new Date(year, parseInt(month) - 1, 0);
      const endDay = String(lastMonthEnd.getDate()).padStart(2, '0');
      return { dateFrom: `${lastMonthYear}-${lastMonth}-01`, dateTo: `${lastMonthYear}-${lastMonth}-${endDay}` };
    default:
      return {};
  }
}

export function useDashboardSummary() {
  const period = useDashboardStore(s => s.period);
  const { dateFrom, dateTo } = getPeriodDates(period);
  return useApiQuery(
    () => dashboardApi.getDashboard(period, dateFrom, dateTo),
    [period],
  );
}

export function useBrandDetail(brandId: string) {
  const period = useDashboardStore(s => s.period);
  const { dateFrom, dateTo } = getPeriodDates(period);
  return useApiQuery(
    () => dashboardApi.getBrand(brandId, period, dateFrom, dateTo),
    [brandId, period],
  );
}

export function useRestaurantDetail(restaurantId: string) {
  const period = useDashboardStore(s => s.period);
  const { dateFrom, dateTo } = getPeriodDates(period);
  return useApiQuery(
    () => dashboardApi.getRestaurant(restaurantId, period, dateFrom, dateTo),
    [restaurantId, period],
  );
}

export function useArticleDetail(articleId: string, restaurantId: string) {
  const period = useDashboardStore(s => s.period);
  const { dateFrom, dateTo } = getPeriodDates(period);
  return useApiQuery(
    () => dashboardApi.getArticle(articleId, restaurantId, period, dateFrom, dateTo),
    [articleId, restaurantId, period],
  );
}
