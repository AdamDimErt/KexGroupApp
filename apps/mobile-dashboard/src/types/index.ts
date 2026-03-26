// ─── Навигация ────────────────────────────────────────────────────────────────
export type Screen = 'login' | 'dashboard' | 'points' | 'point-details' | 'notifications' | 'reports';

// ─── Пользователь ────────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'OWNER' | 'FINANCE_DIRECTOR' | 'OPERATIONS_DIRECTOR';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  tenantId: string | null;
  restaurantIds: string[];
}

// ─── Рестораны ────────────────────────────────────────────────────────────────
export interface Restaurant {
  id: string;
  name: string;
  city: string;
  type: string;
  revenue: number;
  plan: number;
  expenses: number;
  transactions: number;
}

export type Status = 'green' | 'yellow' | 'red';

// ─── Уведомления ──────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  read: boolean;
  color: string;
  title: string;
  body: string;
  time: string;
}

// ─── Аналитика ────────────────────────────────────────────────────────────────
export type Period = 'day' | 'week' | 'month' | 'quarter';

export interface KpiData {
  revenue: string;
  expenses: string;
  profit: string;
  revChg: string;
  expChg: string;
  profChg: string;
}

export interface BarDataItem {
  name: string;
  fact: number;
  plan: number;
}

export interface RankingItem {
  name: string;
  revenue: string;
  planPct: number;
}

// ─── Графики ──────────────────────────────────────────────────────────────────
export interface HourlyDataPoint {
  hour: string;
  value: number;
}

export interface ExpenseItem {
  label: string;
  amount: number;
}
