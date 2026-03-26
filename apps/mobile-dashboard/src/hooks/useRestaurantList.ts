import { useState, useMemo } from 'react';
import { restaurants } from '../data/restaurants';
import { totalRevenue, getStatus, getDeviation, getPlanPercent } from '../utils/calculations';

export function useRestaurantList() {
  const [query, setQuery] = useState('');

  const total = totalRevenue(restaurants);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return restaurants
      .filter(r => r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q))
      .map(r => ({
        ...r,
        status: getStatus(r.revenue, r.plan),
        dev: getDeviation(r.revenue, r.plan),
        planPct: getPlanPercent(r.revenue, r.plan),
      }));
  }, [query]);

  return {
    query,
    setQuery,
    totalRevenue: total,
    filtered,
  };
}
