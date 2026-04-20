import { useState, useMemo, useCallback } from 'react';
import { useBrandDetail, useDashboardSummary } from './useApi';
import type { RestaurantIndicatorDto } from '../types';
import {
  resolveBrand,
  mapLegacyStatus,
  computeMarginPct,
  computePlanAttainment,
  formatPeriodLabel,
} from '../utils/brand';

export interface RestaurantListItem {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  revenue: number;
  directExpenses: number;
  distributedExpenses: number;
  financialResult: number;
  changePercent: number;
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
  city: string;
  // Keep legacy for backward-compat during transition
  type?: string;
  dev?: number;
  planPct?: number;
}

function mapRestaurant(r: RestaurantIndicatorDto, brandName: string): RestaurantListItem {
  const revValue = typeof r.revenue === 'number' ? r.revenue : r.revenue.total;
  const { code, cuisine } = resolveBrand(brandName);
  const plannedRevenue = revValue * 1.05; // STUB — Phase 11: real plan from finance-service API
  return {
    id: r.id,
    name: r.name,
    brandId: r.brandId,
    brandName,
    revenue: revValue,
    directExpenses: r.directExpenses,
    distributedExpenses: r.distributedExpenses,
    financialResult: r.financialResult,
    changePercent: r.changePercent,
    brand: code,
    cuisine,
    plannedRevenue,
    marginPct: computeMarginPct(revValue, r.financialResult),
    deltaPct: r.changePercent,
    planAttainmentPct: computePlanAttainment(revValue, plannedRevenue),
    planMarkPct: 100,
    periodLabel: formatPeriodLabel(),
    transactions: null, // STUB: salesCount not in RestaurantIndicatorDto — Phase 11: add to API
    status: mapLegacyStatus(r.status),
    city: brandName,
    // Legacy backward-compat fields
    type: 'Restaurant',
    dev: r.changePercent ?? 0,
    planPct: Math.min(100, Math.max(0, revValue > 0 ? 65 : 0)),
  };
}

/**
 * Hook supports up to MAX_BRANDS brands via fixed-slot hooks (Rules of Hooks require
 * unconditional calls). Each slot uses `enabled: false` when the brand ID is not yet
 * available, preventing API calls with empty strings.
 */
const MAX_BRANDS = 5;
const EMPTY_ID = '';

export function useRestaurantList(brandId?: string) {
  const [query, setQuery] = useState('');

  const dashboard = useDashboardSummary();
  const brands = dashboard.data?.brands ?? [];

  // Fixed-slot brand detail hooks — enabled only when the slot has a real ID.
  // This pattern satisfies Rules of Hooks (no conditional hook calls) while
  // avoiding network requests for slots without a valid brand ID.
  const slot0Id = brands[0]?.id ?? EMPTY_ID;
  const slot1Id = brands[1]?.id ?? EMPTY_ID;
  const slot2Id = brands[2]?.id ?? EMPTY_ID;
  const slot3Id = brands[3]?.id ?? EMPTY_ID;
  const slot4Id = brands[4]?.id ?? EMPTY_ID;

  const b0 = useBrandDetail(slot0Id, { enabled: slot0Id !== EMPTY_ID });
  const b1 = useBrandDetail(slot1Id, { enabled: slot1Id !== EMPTY_ID });
  const b2 = useBrandDetail(slot2Id, { enabled: slot2Id !== EMPTY_ID });
  const b3 = useBrandDetail(slot3Id, { enabled: slot3Id !== EMPTY_ID });
  const b4 = useBrandDetail(slot4Id, { enabled: slot4Id !== EMPTY_ID });

  const brandResults = [b0, b1, b2, b3, b4].slice(0, MAX_BRANDS);

  const total = dashboard.data?.totalRevenue ?? 0;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let restaurants: RestaurantListItem[] = [];

    if (brandId) {
      // Specific brand: find matching slot
      const slotIndex = brands.findIndex(b => b.id === brandId);
      const detail = slotIndex >= 0 ? brandResults[slotIndex]?.data : null;
      const brandName = brands[slotIndex]?.name ?? '';
      restaurants = (detail?.restaurants ?? []).map(r => mapRestaurant(r, brandName));
    } else {
      // All brands: merge restaurants from every loaded slot
      for (let i = 0; i < brands.length && i < MAX_BRANDS; i++) {
        const detail = brandResults[i]?.data;
        const bName = brands[i]?.name ?? '';
        const rows = (detail?.restaurants ?? []).map(r => mapRestaurant(r, bName));
        restaurants = restaurants.concat(rows);
      }
    }

    return restaurants.filter(r => r.name.toLowerCase().includes(q));
  }, [query, brandId, brands, b0.data, b1.data, b2.data, b3.data, b4.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading =
    dashboard.isLoading ||
    brandResults.some((b, i) => i < brands.length && b.isLoading);

  const error =
    dashboard.error ||
    brandResults.find((b, i) => i < brands.length && b.error)?.error ||
    null;

  const isOffline =
    dashboard.isOffline ||
    brandResults.some((b, i) => i < brands.length && b.isOffline);

  const isStale =
    dashboard.isStale ||
    brandResults.some((b, i) => i < brands.length && b.isStale);

  const cachedAt = dashboard.cachedAt;

  const refetch = useCallback(() => {
    dashboard.refetch();
    brandResults.forEach((b, i) => { if (i < brands.length) b.refetch(); });
  }, [dashboard, brandResults, brands.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    query,
    setQuery,
    totalRevenue: total,
    filtered,
    isLoading,
    error,
    isOffline,
    isStale,
    cachedAt,
    refetch,
  };
}
