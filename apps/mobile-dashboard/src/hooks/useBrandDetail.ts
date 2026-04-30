import { useMemo } from 'react';
import { useBrandDetail as useBrandDetailApi } from './useApi';
import {
  resolveBrand,
  mapLegacyStatus,
  computeMarginPct,
  computePlanAttainment,
  formatPeriodLabel,
} from '../utils/brand';
import type { LegalEntitySummaryDto } from '../types';

export interface EnrichedRestaurant {
  id: string;
  name: string;
  revenue: number;
  trend: number; // changePercent (legacy, kept for backward-compat)
  // NEW fields (required by RestaurantCard v2)
  brand: 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';
  cuisine: 'Burger' | 'Doner' | 'Mixed' | 'Multi' | 'Kitchen';
  plannedRevenue: number; // STUB: revenue * 1.05 — Phase 11: real plan from finance-service API
  marginPct: number | null;
  deltaPct: number | null;
  planAttainmentPct: number;
  planMarkPct: number;
  periodLabel: string;
  transactions: number | null; // STUB: null — RestaurantIndicatorDto lacks salesCount (only RestaurantDetailDto)
  status: 'above' | 'onplan' | 'below' | 'offline' | 'loading';
}

export function useBrandDetail(brandId: string) {
  const { data: brandData, isLoading, error, refetch, isStale, isOffline, cachedAt } = useBrandDetailApi(brandId);

  const computed = useMemo(() => {
    if (!brandData) {
      return {
        brand: null,
        totalRevenue: 0,
        totalExpenses: 0,
        restaurants: [] as EnrichedRestaurant[],
        legalEntities: [] as LegalEntitySummaryDto[],
        isLoading,
        error,
      };
    }

    const periodLabel = formatPeriodLabel(brandData.period?.from, brandData.period?.to);
    const { code: brandCode, cuisine: brandCuisine } = resolveBrand(brandData.name);

    const restaurants: EnrichedRestaurant[] = brandData.restaurants.map(r => {
      const revValue = typeof r.revenue === 'number' ? r.revenue : r.revenue.total;
      const plannedRevenue = revValue * 1.05; // STUB — Phase 11: real plan from finance-service API
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
        transactions: null, // STUB: salesCount not in RestaurantIndicatorDto — Phase 11: add to API
        status: mapLegacyStatus(r.status),
      };
    });

    return {
      brand: {
        id: brandData.id,
        name: brandData.name,
      },
      totalRevenue: brandData.totalRevenue,
      totalExpenses: brandData.totalExpenses,
      restaurants,
      // Backend may not yet include legalEntities[] when brand row is empty (BrandDetailDto fallback);
      // default to [] so the screen can safely check legalEntities.length without crashing.
      legalEntities: brandData.legalEntities ?? [],
      isLoading,
      error,
    };
  }, [brandId, brandData, isLoading, error]);

  return { ...computed, refetch, isStale, isOffline, cachedAt };
}
