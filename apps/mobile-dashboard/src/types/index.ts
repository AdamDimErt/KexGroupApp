// ─── Навигация ────────────────────────────────────────────────────────────────
export type Screen = 'login' | 'dashboard' | 'brand-details' | 'points' | 'point-details' | 'notifications' | 'reports';

// ─── Пользователь ────────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'OWNER' | 'FINANCE_DIRECTOR' | 'OPERATIONS_DIRECTOR';

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  tenantId: string | null;
  tenant?: TenantDto | null;
  restaurantIds: string[];
}

// ─── API Response Wrappers ──────────────────────────────────────────────────
export interface PeriodDto {
  type: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';
  from: string;  // ISO date string
  to: string;    // ISO date string
}

export interface PaymentTypeAmountDto {
  name: string;
  iikoCode: string;
  amount: number;
}

export interface RevenueBreakdownDto {
  total: number;
  cash: number;
  kaspi: number;
  halyk: number;
  yandex: number;
  byType?: PaymentTypeAmountDto[];
}

export interface BrandIndicatorDto {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  expenses: number;
  financialResult: number;
  changePercent: number;
  restaurantCount: number;
}

export interface DashboardSummaryDto {
  tenantId: string;
  period: PeriodDto;
  totalRevenue: number;
  totalExpenses: number;
  financialResult: number;
  brands: BrandIndicatorDto[];
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | null;
}

export interface RestaurantIndicatorDto {
  id: string;
  name: string;
  brandId: string;
  revenue: RevenueBreakdownDto;
  directExpenses: number;
  distributedExpenses: number;
  financialResult: number;
  changePercent: number;
  status: 'green' | 'yellow' | 'red';
}

export interface BrandDetailDto {
  id: string;
  name: string;
  period: PeriodDto;
  totalRevenue: number;
  totalExpenses: number;
  restaurants: RestaurantIndicatorDto[];
}

export interface ExpenseGroupDto {
  groupId: string;
  groupName: string;
  totalAmount: number;
  articleCount: number;
}

export interface CashDiscrepancyDto {
  date: string;
  expected: number;
  actual: number;
  difference: number;
}

export interface DailyRevenuePointDto {
  date: string;
  revenue: number;
}

export interface RestaurantDetailDto {
  id: string;
  name: string;
  brandName: string;
  period: PeriodDto;
  revenue: RevenueBreakdownDto;
  expenseGroups: ExpenseGroupDto[];
  directExpensesTotal: number;
  distributedExpensesTotal: number;
  financialResult: number;
  salesCount: number;                // Количество чеков за период
  cashDiscrepancies: CashDiscrepancyDto[];
  revenueChart: DailyRevenuePointDto[];
}

export interface ArticleIndicatorDto {
  id: string;
  name: string;
  code: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationType: 'DIRECT' | 'DISTRIBUTED';
  amount: number;
  sharePercent: number;
  previousPeriodAmount: number;
  changePercent: number;
}

export interface ArticleGroupDetailDto {
  groupId: string;
  groupName: string;
  period: PeriodDto;
  restaurantId: string;
  restaurantName: string;
  totalAmount: number;
  articles: ArticleIndicatorDto[];
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
export type NotificationType = 'SYNC_FAILURE' | 'LOW_REVENUE' | 'LARGE_EXPENSE' | 'DAILY_SUMMARY';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationListDto {
  notifications: NotificationDto[];
  unreadCount: number;
  total: number;
}

// Legacy format for UI components
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
