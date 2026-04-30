import { useMemo } from 'react';
import { useLegalEntityDetail as useLegalEntityDetailApi } from './useApi';
import {
  resolveBrand,
  mapLegacyStatus,
  computeMarginPct,
  computePlanAttainment,
  formatPeriodLabel,
} from '../utils/brand';
import type { EnrichedRestaurant } from './useBrandDetail';

export function useLegalEntityDetail(legalEntityId: string) {
  const { data, isLoading, error, refetch, isStale, isOffline, cachedAt } =
    useLegalEntityDetailApi(legalEntityId);

  const computed = useMemo(() => {
    if (!data) {
      return {
        legalEntity: null,
        brand: null,
        totalRevenue: 0,
        totalExpenses: 0,
        restaurants: [] as EnrichedRestaurant[],
        isLoading,
        error,
      };
    }

    const periodLabel = formatPeriodLabel(data.period?.from, data.period?.to);
    const { code: brandCode, cuisine: brandCuisine } = resolveBrand(data.brandName);

    const restaurants: EnrichedRestaurant[] = data.restaurants.map((r) => {
      const revValue = typeof r.revenue === 'number' ? r.revenue : r.revenue.total;
      const plannedRevenue = revValue * 1.05; // STUB consistent with useBrandDetail
      return {
        id: r.id,
        name: r.name,
        revenue: revValue,
        trend: r.changePercent,
        brand: brandCode,
        cuisine: brandCuisine,
        plannedRevenue,
        marginPct: computeMarginPct(revValue, r.financialResult),
        deltaPct: r.changePercent,
        planAttainmentPct: computePlanAttainment(revValue, plannedRevenue),
        planMarkPct: 100,
        periodLabel,
        transactions: null,
        status: mapLegacyStatus(r.status),
      };
    });

    return {
      legalEntity: {
        id: data.id,
        name: data.name,
        taxpayerIdNumber: data.taxpayerIdNumber,
      },
      brand: { id: data.brandId, name: data.brandName },
      totalRevenue: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      restaurants,
      isLoading,
      error,
    };
  }, [legalEntityId, data, isLoading, error]);

  return { ...computed, refetch, isStale, isOffline, cachedAt };
}
