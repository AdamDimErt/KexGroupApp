import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { restaurants, hourlyData, planLine } from '../data/restaurants';
import { getStatus, getExpenseBreakdown, statusColor } from '../utils/calculations';
import { colors } from '../theme';

const statusLabels: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Норма',
  yellow: 'Внимание',
  red: 'Ниже плана',
};

export function usePointDetail(pointId: string | null) {
  const r = restaurants.find(x => x.id === pointId) || restaurants[0];

  return useMemo(() => {
    const status = getStatus(r.revenue, r.plan);
    const col = statusColor[status];
    const profit = r.revenue - r.expenses;
    const profitColor = profit >= 0 ? colors.green : colors.red;
    const statusLabel = statusLabels[status];

    const maxBar = Math.max(...hourlyData.map(d => d.value));
    const chartW = Dimensions.get('window').width - 80;
    const barW = (chartW / hourlyData.length) - 6;

    const expenseItems = getExpenseBreakdown(r.expenses);

    return {
      restaurant: r,
      status,
      statusColor: col,
      statusLabel,
      profit,
      profitColor,
      hourlyData,
      planLine,
      maxBar,
      chartW,
      barW,
      expenseItems,
    };
  }, [pointId, r]);
}
