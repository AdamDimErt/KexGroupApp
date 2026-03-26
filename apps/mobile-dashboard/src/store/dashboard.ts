import { create } from 'zustand';

type PeriodType = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface DashboardState {
  period: PeriodType;
  isRefreshing: boolean;
  lastFetchedAt: number | null;

  setPeriod: (period: PeriodType) => void;
  setRefreshing: (val: boolean) => void;
  markFetched: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  period: 'today',
  isRefreshing: false,
  lastFetchedAt: null,

  setPeriod: (period) => set({ period }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  markFetched: () => set({ lastFetchedAt: Date.now() }),
}));
