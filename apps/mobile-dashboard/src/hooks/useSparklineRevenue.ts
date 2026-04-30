import { useDashboardStore } from '../store/dashboard';
import { useCachedQuery } from './useOfflineCache';
import { dashboardApi } from '../services/api';
import { getPeriodDates } from './useApi';

/**
 * Sparkline data hook — выбирает период данных в зависимости от выбранного
 * period switcher:
 *
 *   • today, yesterday          → fallback на последние 14 дней
 *     (за 1 день нельзя нарисовать линию, нужно минимум 2 точки;
 *      14 дней дают приятный контекст «как было в последние 2 недели»)
 *
 *   • thisWeek                  → текущая неделя (7 точек)
 *   • thisMonth                 → текущий месяц
 *   • lastMonth                 → прошлый месяц
 *   • custom                    → выбранный пользователем диапазон
 *
 * Зачем не «всегда последние 30 дней»:
 *   Если пользователь выбрал «Прошлый месяц» — он ожидает увидеть график
 *   именно за прошлый месяц. Если бы график показывал last 30 days, это
 *   ломало бы интуицию.
 */
export function useSparklineRevenue() {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);

  // Для коротких периодов (today/yesterday) — расширяем окно до 14 дней,
  // иначе sparkline не сможет нарисовать линию (нужно ≥ 2 точки).
  let { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  if (period === 'today' || period === 'yesterday') {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 13);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    dateFrom = fmt(start);
    dateTo = fmt(today);
  }

  return useCachedQuery(
    `sparkline_revenue_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getRevenueAggregated(period, dateFrom, dateTo),
    [period, customFrom, customTo, dateFrom, dateTo],
  );
}
