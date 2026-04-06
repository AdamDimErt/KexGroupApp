import { create } from 'zustand';

export type PeriodType = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface DashboardState {
  period: PeriodType;
  /** First day of custom range (YYYY-MM-DD), only used when period === 'custom' */
  customFrom: string | null;
  /** Last day of custom range (YYYY-MM-DD), only used when period === 'custom' */
  customTo: string | null;
  isRefreshing: boolean;
  lastFetchedAt: number | null;

  setPeriod: (period: PeriodType) => void;
  setCustomPeriod: (from: string, to: string) => void;
  setRefreshing: (val: boolean) => void;
  markFetched: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  period: 'today',
  customFrom: null,
  customTo: null,
  isRefreshing: false,
  lastFetchedAt: null,

  setPeriod: (period) => set({ period }),
  setCustomPeriod: (customFrom, customTo) => set({ period: 'custom', customFrom, customTo }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  markFetched: () => set({ lastFetchedAt: Date.now() }),
}));
