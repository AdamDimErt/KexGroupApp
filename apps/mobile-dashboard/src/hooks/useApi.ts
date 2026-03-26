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

export function useDashboardSummary() {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getSummary(period),
    [period],
  );
}

export function useBrandDetail(brandId: string) {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getBrand(brandId, period),
    [brandId, period],
  );
}

export function useRestaurantDetail(restaurantId: string) {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getRestaurant(restaurantId, period),
    [restaurantId, period],
  );
}

export function useArticleGroupDetail(restaurantId: string, groupId: string) {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getArticleGroup(restaurantId, groupId, period),
    [restaurantId, groupId, period],
  );
}

export function useOperations(restaurantId: string, articleId: string) {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getOperations(restaurantId, articleId, period),
    [restaurantId, articleId, period],
  );
}

export function useDdsReport() {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getDdsReport(period),
    [period],
  );
}

export function useKitchenReport() {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getKitchenReport(period),
    [period],
  );
}

export function useTrendsReport() {
  const period = useDashboardStore(s => s.period);
  return useApiQuery(
    () => dashboardApi.getTrendsReport(period),
    [period],
  );
}
