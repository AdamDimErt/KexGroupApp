import { useCallback, useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import { useDashboardStore } from '../store/dashboard';
import { useCachedQuery } from './useOfflineCache';

/**
 * Хуки для загрузки данных с API.
 *
 * All data hooks use useCachedQuery for offline support via AsyncStorage.
 * Legacy useApiQuery is kept for non-cacheable queries (e.g. notifications).
 */

// ─── Generic fetch hook (legacy, no offline cache) ─────────────────────────

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

function pad2(n: number) { return String(n).padStart(2, '0'); }
function isoDate(y: number, m: number, d: number) { return `${y}-${pad2(m)}-${pad2(d)}`; }

export function getPeriodDates(
  periodType: string,
  customFrom?: string | null,
  customTo?: string | null,
): { dateFrom?: string; dateTo?: string } {
  if (periodType === 'custom') {
    if (customFrom && customTo) return { dateFrom: customFrom, dateTo: customTo };
    return {};
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const toDate = isoDate(y, m, d);

  switch (periodType) {
    case 'today':
      return { dateFrom: toDate, dateTo: toDate };
    case 'thisWeek': {
      // Monday-based week (Kazakhstan standard)
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sun→6, Mon→0, Tue→1, etc.
      const weekStart = new Date(today);
      weekStart.setDate(d - mondayOffset);
      return {
        dateFrom: isoDate(weekStart.getFullYear(), weekStart.getMonth() + 1, weekStart.getDate()),
        dateTo: toDate,
      };
    }
    case 'thisMonth':
      return { dateFrom: isoDate(y, m, 1), dateTo: toDate };
    case 'lastMonth': {
      const lm = new Date(y, m - 2, 1);
      const lmEnd = new Date(y, m - 1, 0);
      return {
        dateFrom: isoDate(lm.getFullYear(), lm.getMonth() + 1, 1),
        dateTo: isoDate(lmEnd.getFullYear(), lmEnd.getMonth() + 1, lmEnd.getDate()),
      };
    }
    default:
      return {};
  }
}

export function useDashboardSummary() {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery(
    `dashboard_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getDashboard(period, dateFrom, dateTo),
    [period, customFrom, customTo],
  );
}

export function useBrandDetail(brandId: string, options?: { enabled?: boolean }) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery(
    `brand_${brandId}_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getBrand(brandId, period, dateFrom, dateTo),
    [brandId, period, customFrom, customTo],
    options,
  );
}

export function useRestaurantDetail(restaurantId: string) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery(
    `restaurant_${restaurantId}_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getRestaurant(restaurantId, period, dateFrom, dateTo),
    [restaurantId, period, customFrom, customTo],
  );
}

export function useArticleDetail(articleId: string, restaurantId: string) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery(
    `article_${articleId}_${restaurantId}_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getArticle(articleId, restaurantId, period, dateFrom, dateTo),
    [articleId, restaurantId, period, customFrom, customTo],
  );
}

export function useOperations(articleId: string, restaurantId: string, page: number = 1) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery(
    `operations_${articleId}_${restaurantId}_${page}_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getOperations(articleId, restaurantId, page, period, dateFrom, dateTo),
    [articleId, restaurantId, page, period, customFrom, customTo],
  );
}
