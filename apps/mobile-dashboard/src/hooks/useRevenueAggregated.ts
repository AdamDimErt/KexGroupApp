import { useDashboardStore } from '../store/dashboard';
import { useCachedQuery } from './useOfflineCache';
import { dashboardApi } from '../services/api';
import { getPeriodDates } from './useApi';

/**
 * Fetches company-wide revenue aggregated data for RevenueDetailScreen.
 * Uses the same period from DashboardStore as all other data hooks.
 * Gracefully handles 404 (finance-agent endpoint not yet deployed) by
 * returning null data without crashing — screen shows "Данные недоступны".
 */
export function useRevenueAggregated() {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);

  return useCachedQuery(
    `revenue_aggregated_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getRevenueAggregated(period, dateFrom, dateTo),
    [period, customFrom, customTo],
  );
}
