import { useState, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { dashboardApi } from '../services/api';
import { useApiQuery } from './useApi';
import type { Period, KpiData, BarDataItem, RankingItem, DashboardSummaryDto } from '../types';

const periodLabels: Record<Period, string> = {
  day: 'День', week: 'Неделя', month: 'Месяц', quarter: 'Квартал',
};

// Map UI period to API periodType and date range
function getPeriodParams(period: Period): { periodType: string; dateFrom: string; dateTo: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const toDate = `${year}-${month}-${day}`;

  switch (period) {
    case 'day': {
      return { periodType: 'today', dateFrom: toDate, dateTo: toDate };
    }
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      const from = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      return { periodType: 'thisWeek', dateFrom: from, dateTo: toDate };
    }
    case 'month': {
      return { periodType: 'thisMonth', dateFrom: `${year}-${month}-01`, dateTo: toDate };
    }
    case 'quarter': {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      const qStart = new Date(year, quarterMonth, 1);
      const from = `${qStart.getFullYear()}-${String(qStart.getMonth() + 1).padStart(2, '0')}-01`;
      return { periodType: 'thisMonth', dateFrom: from, dateTo: toDate };
    }
  }
}

function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 1000000) return `₸${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `₸${Math.round(amount / 1000)}K`;
  return `₸${amount.toFixed(0)}`;
}

export const PERIODS: Period[] = ['day', 'week', 'month', 'quarter'];

export function useReports() {
  const [period, setPeriod] = useState<Period>('week');

  const { periodType, dateFrom, dateTo } = getPeriodParams(period);

  const { data: summary, isLoading, error } = useApiQuery<DashboardSummaryDto>(
    () => dashboardApi.getDashboard(periodType, dateFrom, dateTo),
    [period],
  );

  const kpi: KpiData = useMemo(() => {
    if (!summary) {
      return { revenue: '—', expenses: '—', profit: '—', revChg: '—', expChg: '—', profChg: '—' };
    }
    const profit = summary.financialResult;
    return {
      revenue: formatAmount(summary.totalRevenue),
      expenses: formatAmount(summary.totalExpenses),
      profit: formatAmount(profit),
      revChg: '—', // TODO: compare with previous period when API supports it
      expChg: '—',
      profChg: '—',
    };
  }, [summary]);

  const barData: BarDataItem[] = useMemo(() => {
    if (!summary?.brands) return [];
    return summary.brands.map(brand => ({
      name: brand.name.length > 12 ? brand.name.substring(0, 12) + '...' : brand.name,
      fact: brand.revenue,
      plan: brand.revenue, // No plan data yet — show fact as plan
    }));
  }, [summary]);

  const ranking: RankingItem[] = useMemo(() => {
    if (!summary?.brands) return [];
    return [...summary.brands]
      .sort((a, b) => b.revenue - a.revenue)
      .map(brand => ({
        name: brand.name,
        revenue: formatAmount(brand.revenue),
        planPct: 100, // No plan data yet
      }));
  }, [summary]);

  const maxFact = useMemo(() => {
    if (barData.length === 0) return 1;
    return Math.max(...barData.map(d => d.fact), 1);
  }, [barData]);

  const screenW = Dimensions.get('window').width;

  return {
    period,
    setPeriod,
    periodLabels,
    kpi,
    barData,
    ranking,
    maxFact,
    screenW,
    isLoading,
    error,
  };
}
