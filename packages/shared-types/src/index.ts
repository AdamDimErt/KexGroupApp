// ═══════════════════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export enum UserRole {
  ADMIN               = 'ADMIN',               // Суперадмин — все тенанты
  OWNER               = 'OWNER',               // Владелец — все 4 уровня
  FINANCE_DIRECTOR    = 'FINANCE_DIRECTOR',    // Фин. директор — уровни 1-3
  OPERATIONS_DIRECTOR = 'OPERATIONS_DIRECTOR', // Опер. директор — уровни 1-2
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
}

export interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  tenantId: string | null;
  tenant: TenantDto | null;
  restaurantIds: string[];
}

export interface SendOtpRequestDto {
  phone: string;
}

export interface SendOtpResponseDto {
  success: boolean;
  message: string;
  retryAfterSec?: number;
}

export interface VerifyOtpRequestDto {
  phone: string;
  code: string;
}

export interface AuthSuccessDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD
// ═══════════════════════════════════════════════════════════════════════════════

export type PeriodType = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export interface PeriodDto {
  type: PeriodType;
  from: string;  // ISO date string
  to: string;    // ISO date string
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — COMPANY (Главный экран)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RevenueBreakdownDto {
  total: number;
  cash: number;
  kaspi: number;
  halyk: number;
  yandex: number;
}

export interface BrandIndicatorDto {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  expenses: number;
  financialResult: number;
  changePercent: number;         // Динамика vs предыдущий период (+/-%)
  restaurantCount: number;
}

export interface DashboardSummaryDto {
  tenantId: string;
  period: PeriodDto;
  totalRevenue: number;
  totalExpenses: number;         // Прямые + распределённые
  financialResult: number;       // OWNER + FIN_DIRECTOR only (null для OPS_DIRECTOR)
  brands: BrandIndicatorDto[];
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 1b — BRAND RESTAURANTS (Раскрытие бренда)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RestaurantIndicatorDto {
  id: string;
  name: string;
  brandId: string;
  revenue: RevenueBreakdownDto;
  directExpenses: number;
  distributedExpenses: number;
  financialResult: number;       // revenue.total - directExpenses - distributedExpenses
  changePercent: number;         // Динамика vs предыдущий период
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

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — RESTAURANT DETAIL (Детализация по точке)
// ═══════════════════════════════════════════════════════════════════════════════

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
  difference: number;            // + излишек, - недостача
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
  salesCount: number;                    // Количество чеков за период
  cashDiscrepancies: CashDiscrepancyDto[];
  revenueChart: DailyRevenuePointDto[];  // График выручки по дням
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — ARTICLES (Статьи ДДС) — 👑 OWNER + 📊 FIN_DIRECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArticleIndicatorDto {
  id: string;
  name: string;
  code: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationType: 'DIRECT' | 'DISTRIBUTED';
  amount: number;
  sharePercent: number;          // Доля в общих расходах точки (%)
  previousPeriodAmount: number;
  changePercent: number;         // Сравнение с предыдущим периодом (+/-%)
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

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 4 — OPERATIONS (Операции) — только 👑 OWNER
// ═══════════════════════════════════════════════════════════════════════════════

export interface OperationDto {
  id: string;
  date: string;                  // ISO datetime
  amount: number;
  comment: string | null;
  source: 'IIKO' | 'ONE_C';
  // Для распределённых затрат:
  isDistributed: boolean;
  originalAmount: number | null; // Исходная сумма до распределения
  coefficient: number | null;    // Коэффициент распределения (0-1)
}

export interface ArticleOperationsDto {
  articleId: string;
  articleName: string;
  restaurantId: string;
  restaurantName: string;
  period: PeriodDto;
  totalAmount: number;
  operations: OperationDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DdsReportRowDto {
  articleGroupName: string;
  articleName: string;
  source: 'IIKO' | 'ONE_C';
  amounts: Record<string, number>;  // key = restaurantId, value = amount
  total: number;
}

export interface DdsReportDto {
  period: PeriodDto;
  restaurants: { id: string; name: string }[];
  rows: DdsReportRowDto[];
  grandTotal: number;
}

export interface KitchenShipmentDto {
  id: string;
  restaurantName: string;
  date: string;
  productName: string;
  quantity: number;
  amount: number;
}

export interface KitchenPurchaseDto {
  id: string;
  date: string;
  productName: string;
  supplierName: string | null;
  quantity: number;
  amount: number;
}

export interface KitchenReportDto {
  period: PeriodDto;
  shipments: KitchenShipmentDto[];
  shipmentsTotal: number;
  purchases: KitchenPurchaseDto[];
  purchasesTotal: number;
  incomeTotal: number;
}

export interface TrendPointDto {
  date: string;
  revenue: number;
  expenses: number;
  result: number;
}

export interface TrendsReportDto {
  period: PeriodDto;
  companyTrend: TrendPointDto[];
  brandTrends: {
    brandId: string;
    brandName: string;
    trend: TrendPointDto[];
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncStatusDto {
  system: 'IIKO' | 'ONE_C';
  lastSyncAt: string | null;
  status: 'SUCCESS' | 'ERROR' | null;
  errorMessage: string | null;
  nextSyncAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  timestamp: string;
}
