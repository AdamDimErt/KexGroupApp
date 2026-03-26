import { useState, useMemo } from 'react';
import { Dimensions } from 'react-native';
import type { Period, KpiData, BarDataItem, RankingItem } from '../types';

const periodLabels: Record<Period, string> = {
  day: 'День', week: 'Неделя', month: 'Месяц', quarter: 'Квартал',
};

const kpiMap: Record<Period, KpiData> = {
  day: { revenue: '₸8.24M', expenses: '₸5.10M', profit: '₸3.14M', revChg: '+12.4%', expChg: '+8.1%', profChg: '+18.7%' },
  week: { revenue: '₸57.7M', expenses: '₸35.8M', profit: '₸21.9M', revChg: '+15.2%', expChg: '+9.4%', profChg: '+24.3%' },
  month: { revenue: '₸247M', expenses: '₸153M', profit: '₸94M', revChg: '+18.4%', expChg: '+11.2%', profChg: '+28.7%' },
  quarter: { revenue: '₸741M', expenses: '₸459M', profit: '₸282M', revChg: '+21.3%', expChg: '+13.5%', profChg: '+32.1%' },
};

const barDataMap: Record<Period, BarDataItem[]> = {
  day: [
    { name: 'Галерея', fact: 2420, plan: 2200 },
    { name: 'Мега', fact: 1850, plan: 2000 },
    { name: 'Абай', fact: 1020, plan: 1200 },
    { name: 'Нурлы', fact: 1680, plan: 1500 },
    { name: 'Байтерек', fact: 1270, plan: 1100 },
  ],
  week: [
    { name: 'Галерея', fact: 16940, plan: 15400 },
    { name: 'Мега', fact: 12950, plan: 14000 },
    { name: 'Абай', fact: 7140, plan: 8400 },
    { name: 'Нурлы', fact: 11760, plan: 10500 },
    { name: 'Байтерек', fact: 8890, plan: 7700 },
  ],
  month: [
    { name: 'Галерея', fact: 72600, plan: 66000 },
    { name: 'Мега', fact: 55500, plan: 60000 },
    { name: 'Абай', fact: 30600, plan: 36000 },
    { name: 'Нурлы', fact: 50400, plan: 45000 },
    { name: 'Байтерек', fact: 38100, plan: 33000 },
  ],
  quarter: [
    { name: 'Галерея', fact: 217800, plan: 198000 },
    { name: 'Мега', fact: 166500, plan: 180000 },
    { name: 'Абай', fact: 91800, plan: 108000 },
    { name: 'Нурлы', fact: 151200, plan: 135000 },
    { name: 'Байтерек', fact: 114300, plan: 99000 },
  ],
};

const rankingMap: Record<Period, RankingItem[]> = {
  day: [
    { name: 'Kex Burgers Галерея', revenue: '₸2.42M', planPct: 110 },
    { name: 'Kex Diner Нурлытау', revenue: '₸1.68M', planPct: 112 },
    { name: 'Kex Pizza Мега', revenue: '₸1.85M', planPct: 93 },
    { name: 'Kex Burgers Байтерек', revenue: '₸1.27M', planPct: 115 },
    { name: 'Kex Кофе Абай', revenue: '₸1.02M', planPct: 85 },
  ],
  week: [
    { name: 'Kex Burgers Галерея', revenue: '₸16.9M', planPct: 110 },
    { name: 'Kex Pizza Мега', revenue: '₸13.0M', planPct: 93 },
    { name: 'Kex Diner Нурлытау', revenue: '₸11.8M', planPct: 112 },
    { name: 'Kex Burgers Байтерек', revenue: '₸8.9M', planPct: 115 },
    { name: 'Kex Кофе Абай', revenue: '₸7.1M', planPct: 85 },
  ],
  month: [
    { name: 'Kex Burgers Галерея', revenue: '₸72.6M', planPct: 110 },
    { name: 'Kex Pizza Мега', revenue: '₸55.5M', planPct: 93 },
    { name: 'Kex Diner Нурлытау', revenue: '₸50.4M', planPct: 112 },
    { name: 'Kex Burgers Байтерек', revenue: '₸38.1M', planPct: 115 },
    { name: 'Kex Кофе Абай', revenue: '₸30.6M', planPct: 85 },
  ],
  quarter: [
    { name: 'Kex Burgers Галерея', revenue: '₸217M', planPct: 110 },
    { name: 'Kex Pizza Мега', revenue: '₸167M', planPct: 93 },
    { name: 'Kex Diner Нурлытау', revenue: '₸151M', planPct: 112 },
    { name: 'Kex Burgers Байтерек', revenue: '₸114M', planPct: 115 },
    { name: 'Kex Кофе Абай', revenue: '₸91.8M', planPct: 85 },
  ],
};

export const PERIODS: Period[] = ['day', 'week', 'month', 'quarter'];

export function useReports() {
  const [period, setPeriod] = useState<Period>('week');

  const kpi = kpiMap[period];
  const barData = barDataMap[period];
  const ranking = rankingMap[period];

  const maxFact = useMemo(() => Math.max(...barData.map(d => d.fact)), [barData]);
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
  };
}
