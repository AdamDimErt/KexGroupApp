import type { Status, Restaurant, ExpenseItem } from '../types';

/** Статус выполнения плана */
export function getStatus(revenue: number, plan: number): Status {
  const r = revenue / plan;
  if (r >= 1) return 'green';
  if (r >= 0.9) return 'yellow';
  return 'red';
}

/** Отклонение от плана в процентах */
export function getDeviation(revenue: number, plan: number): number {
  return Math.round((revenue - plan) / plan * 100);
}

/** Процент выполнения плана (0-100) */
export function getPlanPercent(revenue: number, plan: number): number {
  return Math.min((revenue / plan) * 100, 100);
}

/** Маржа в процентах */
export function getMargin(revenue: number, expenses: number): number {
  return Math.round((revenue - expenses) / revenue * 100);
}

/** Разбивка расходов по категориям */
export function getExpenseBreakdown(totalExpenses: number): ExpenseItem[] {
  return [
    { label: 'Зарплата', amount: Math.round(totalExpenses * 0.40) },
    { label: 'Продукты', amount: Math.round(totalExpenses * 0.35) },
    { label: 'Аренда', amount: Math.round(totalExpenses * 0.18) },
    { label: 'Коммунальные', amount: Math.round(totalExpenses * 0.07) },
  ];
}

/** Цвет статуса */
export const statusColor: Record<Status, string> = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
};

/** Цвет по проценту выполнения плана */
export function planColor(pct: number): string {
  if (pct >= 100) return '#10B981';
  if (pct >= 90) return '#F59E0B';
  return '#EF4444';
}

/** Суммарная выручка */
export function totalRevenue(restaurants: Restaurant[]): number {
  return restaurants.reduce((s, r) => s + r.revenue, 0);
}
