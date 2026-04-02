import { useMemo } from 'react';
import { useBrandDetail as useBrandDetailApi } from './useApi';
import { colors } from '../theme';

export interface EnrichedRestaurant {
  id: string;
  name: string;
  revenue: number;
  trend: number; // changePercent
  status: 'green' | 'yellow' | 'red';
}

export function useBrandDetail(brandId: string) {
  const { data: brandData, isLoading, error } = useBrandDetailApi(brandId);

  return useMemo(() => {
    if (!brandData) {
      return {
        brand: null,
        totalRevenue: 0,
        totalExpenses: 0,
        restaurants: [] as EnrichedRestaurant[],
        isLoading,
        error,
      };
    }

    // Transform restaurants to match the component's expected format
    const restaurants: EnrichedRestaurant[] = brandData.restaurants.map(r => ({
      id: r.id,
      name: r.name,
      revenue: r.revenue.total,
      trend: r.changePercent,
      status: r.status,
    }));

    return {
      brand: {
        id: brandData.id,
        name: brandData.name,
      },
      totalRevenue: brandData.totalRevenue,
      totalExpenses: brandData.totalExpenses,
      restaurants,
      isLoading,
      error,
    };
  }, [brandId, brandData, isLoading, error]);
}
