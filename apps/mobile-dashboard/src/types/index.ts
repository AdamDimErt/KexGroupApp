// ─── Навигация ────────────────────────────────────────────────────────────────
export type Screen = 'login' | 'dashboard' | 'brand-details' | 'legal-entity-details' | 'point-details' | 'notifications' | 'reports' | 'article-detail' | 'operations' | 'profile' | 'settings' | 'search' | 'revenue-detail';

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
  plannedRevenue: number;        // План = выручка за такой же по длительности предыдущий период
}

export interface DashboardSummaryDto {
  tenantId: string;
  period: PeriodDto;
  totalRevenue: number;
  totalExpenses: number;
  financialResult: number;
  totalPlannedRevenue: number;   // Сумма plannedRevenue по всем брендам
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

export interface LegalEntitySummaryDto {
  id: string;
  name: string;                    // "ТОО \"A Doner\""
  taxpayerIdNumber: string | null; // ИНН/БИН
  revenue: number;
  expenses: number;
  financialResult: number;
  restaurantCount: number;
}

export interface BrandDetailDto {
  id: string;
  name: string;
  period: PeriodDto;
  totalRevenue: number;
  totalExpenses: number;
  restaurants: RestaurantIndicatorDto[];
  /**
   * Юр-лица (JURPERSON в iiko) под этим брендом.
   * Бэкенд скрывает записи с restaurantCount === 0.
   * UI: показывать как уровень drill-down только если length >= 2.
   */
  legalEntities: LegalEntitySummaryDto[];
}

export interface LegalEntityDetailDto {
  id: string;
  name: string;
  taxpayerIdNumber: string | null;
  brandId: string;
  brandName: string;
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

export interface DistributedExpenseItemDto {
  name: string;
  source: string;
  amount: number;
  coefficient: number;
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
  distributedExpenseItems: DistributedExpenseItemDto[];
  financialResult: number;
  salesCount: number;
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

// ─── Level 4: Operations ─────────────────────────────────────────────────────
export interface OperationDto {
  id: string;
  date: string;          // ISO datetime
  amount: number;
  comment: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationCoefficient: number | null;  // null for direct expenses
}

export interface OperationsListDto {
  operations: OperationDto[];
  total: number;
  page: number;
}

// ─── Reports DTOs ────────────────────────────────────────────────────────────
export interface ReportDdsItemDto {
  groupName: string;
  groupId: string;
  totalAmount: number;
  restaurants: { restaurantId: string; restaurantName: string; amount: number }[];
}

export interface ReportDdsDto {
  period: PeriodDto;
  groups: ReportDdsItemDto[];
  grandTotal: number;
}

export interface ReportCompanyExpenseItemDto {
  articleName: string;
  articleId: string;
  amount: number;
  source: 'IIKO' | 'ONE_C';
}

export interface ReportCompanyExpensesDto {
  period: PeriodDto;
  items: ReportCompanyExpenseItemDto[];
  grandTotal: number;
}

export interface ReportKitchenItemDto {
  type: 'purchase' | 'shipment' | 'income';
  description: string;
  amount: number;
  date: string;
}

export interface ReportKitchenDto {
  period: PeriodDto;
  items: ReportKitchenItemDto[];
  totalPurchases: number;
  totalShipments: number;
  totalIncome: number;
}

export interface ReportTrendsPointDto {
  date: string;
  revenue: number;
  expenses: number;
}

export interface ReportTrendsDto {
  period: PeriodDto;
  points: ReportTrendsPointDto[];
  avgRevenue: number;
  avgExpenses: number;
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

// ─── Company Revenue Aggregated ───────────────────────────────────────────────
export interface PaymentBreakdownItemDto {
  name: string;
  iikoCode: string;
  amount: number;
  percent: number;
}

export interface DailyRevenueAggregatedPointDto {
  date: string;
  revenue: number;
  transactions: number;
}

export interface TopRestaurantDto {
  id: string;
  name: string;
  revenue: number;
  share: number;
}

export interface CompanyRevenueAggregatedDto {
  tenantId: string;
  period: PeriodDto;
  totalRevenue: number;
  totalDirectExpenses: number;
  totalDistributedExpenses: number;
  totalExpenses: number;
  financialResult: number;
  paymentBreakdown: PaymentBreakdownItemDto[];
  dailyRevenue: DailyRevenueAggregatedPointDto[];
  topRestaurants: TopRestaurantDto[];
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
