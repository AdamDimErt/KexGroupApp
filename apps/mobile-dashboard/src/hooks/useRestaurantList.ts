import { useState, useMemo } from 'react';
import { useBrandDetail, useDashboardSummary } from './useApi';
import type { RestaurantIndicatorDto } from '../types';

export interface RestaurantListItem {
  id: string;
  name: string;
  brandId: string;
  revenue: number;  // Simplified to number
  directExpenses: number;
  distributedExpenses: number;
  financialResult: number;
  changePercent: number;
  status: 'green' | 'yellow' | 'red';
  city: string;  // Placeholder for UI compatibility (from brandId)
  type: string;  // Placeholder for UI compatibility
  transactions: number;  // Placeholder for restaurant transactions count
  dev: number;  // Financial result percentage/change
  planPct: number;  // Plan percentage (mapped from revenue)
}

export function useRestaurantList(brandId?: string) {
  const [query, setQuery] = useState('');

  // If brandId is provided, fetch specific brand details
  // Otherwise, get all restaurants from dashboard
  const brandQuery = brandId ? useBrandDetail(brandId) : { data: null, isLoading: false, error: null };
  const { data: brandDetail, isLoading: brandLoading, error: brandError } = brandQuery;
  const { data: dashboardSummary, isLoading: dashboardLoading, error: dashboardError } = useDashboardSummary();

  const total = brandId
    ? (brandDetail?.totalRevenue ?? 0)
    : (dashboardSummary?.totalRevenue ?? 0);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();

    // Get restaurants either from specific brand or all restaurants across brands
    const restaurants: RestaurantIndicatorDto[] = brandId
      ? (brandDetail?.restaurants ?? [])
      : (dashboardSummary?.brands ?? []).length > 0
        ? []  // For now, show empty if no brand specified (ideally would fetch all restaurants)
        : [];

    return restaurants
      .filter(r => r.name.toLowerCase().includes(q))
      .map(r => {
        const revValue = typeof r.revenue === 'number' ? r.revenue : r.revenue.total;
        return {
          id: r.id,
          name: r.name,
          brandId: r.brandId,
          revenue: revValue,  // Convert to number
          directExpenses: r.directExpenses,
          distributedExpenses: r.distributedExpenses,
          financialResult: r.financialResult,
          changePercent: r.changePercent,
          status: r.status,
          city: r.brandId || 'N/A',  // Use brandId as placeholder
          type: 'Restaurant',  // Placeholder
          transactions: 0,  // Placeholder - would need additional data
          dev: r.financialResult,
          planPct: revValue,
        } as RestaurantListItem;
      });
  }, [query, brandDetail, dashboardSummary, brandId]);

  const isLoading = brandId ? brandLoading : dashboardLoading;
  const error = brandId ? brandError : dashboardError;

  return {
    query,
    setQuery,
    totalRevenue: total,
    filtered,
    isLoading,
    error,
  };
}
