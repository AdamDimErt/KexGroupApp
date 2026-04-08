import { dashboardApi } from '../services/api';
import { useDashboardStore } from '../store/dashboard';
import { getPeriodDates } from './useApi';
import { useCachedQuery } from './useOfflineCache';
import type {
  ReportDdsDto,
  ReportCompanyExpensesDto,
  ReportKitchenDto,
  ReportTrendsDto,
} from '../types';

export function useReportDds(enabled = true) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery<ReportDdsDto>(
    `report_dds_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getReportDds(period, dateFrom, dateTo),
    [period, customFrom, customTo],
    { enabled },
  );
}

export function useReportCompanyExpenses(enabled = true) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery<ReportCompanyExpensesDto>(
    `report_company_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getReportCompanyExpenses(period, dateFrom, dateTo),
    [period, customFrom, customTo],
    { enabled },
  );
}

export function useReportKitchen() {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery<ReportKitchenDto>(
    `report_kitchen_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getReportKitchen(period, dateFrom, dateTo),
    [period, customFrom, customTo],
  );
}

export function useReportTrends() {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useCachedQuery<ReportTrendsDto>(
    `report_trends_${period}_${dateFrom}_${dateTo}`,
    () => dashboardApi.getReportTrends(period, dateFrom, dateTo),
    [period, customFrom, customTo],
  );
}
