import { API_URL, REQUEST_TIMEOUT } from '../config';
import { getStoredTokens, clearTokens } from './auth';

// ─── Base API client with auth + refresh ───────────────────────────────────

class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { accessToken } = await getStoredTokens();
    const res = await this.fetchWithAuth<T>(path, options, accessToken);
    return res;
  }

  private async fetchWithAuth<T>(
    path: string,
    options: RequestInit,
    token: string | null,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401 && token) {
      // Try refresh
      const newToken = await this.refreshToken();
      if (newToken) {
        return this.fetchWithAuth<T>(path, options, newToken);
      }
      // Refresh failed — logout
      await clearTokens();
      throw new AuthError('Session expired');
    }

    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body);
    }

    return res.json();
  }

  private async refreshToken(): Promise<string | null> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const { refreshToken } = await getStoredTokens();
        if (!refreshToken) return null;

        const refreshController = new AbortController();
        const refreshTimeoutId = setTimeout(() => refreshController.abort(), REQUEST_TIMEOUT);
        let res: Response;
        try {
          res = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            signal: refreshController.signal,
          });
        } finally {
          clearTimeout(refreshTimeoutId);
        }

        if (!res.ok) return null;

        const data = await res.json();
        // Store new tokens via auth service
        const { saveTokens } = await import('./auth');
        await saveTokens(data.accessToken, data.refreshToken, data.user);
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}

export const api = new ApiClient();

// ─── Error classes ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── API methods ───────────────────────────────────────────────────────────

import type {
  DashboardSummaryDto,
  BrandDetailDto,
  LegalEntityDetailDto,
  RestaurantDetailDto,
  ArticleGroupDetailDto,
  NotificationListDto,
  OperationsListDto,
  ReportDdsDto,
  ReportCompanyExpensesDto,
  ReportKitchenDto,
  ReportTrendsDto,
  CompanyRevenueAggregatedDto,
} from '../types';

export const dashboardApi = {
  // Level 1 — Company dashboard
  // GET /api/finance/dashboard?periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  getDashboard: (periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<DashboardSummaryDto>(`/api/finance/dashboard?${params.toString()}`);
  },

  // Level 1b — Brand detail
  // GET /api/finance/brand/:id?periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  getBrand: (brandId: string, periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<BrandDetailDto>(`/api/finance/brand/${brandId}?${params.toString()}`);
  },

  // Level 1.5 — Legal entity detail (JURPERSON drill-down)
  // GET /api/finance/legal-entity/:id?periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  getLegalEntity: (legalEntityId: string, periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<LegalEntityDetailDto>(`/api/finance/legal-entity/${legalEntityId}?${params.toString()}`);
  },

  // Level 2 — Restaurant detail
  // GET /api/finance/restaurant/:id?periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  getRestaurant: (restaurantId: string, periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<RestaurantDetailDto>(`/api/finance/restaurant/${restaurantId}?${params.toString()}`);
  },

  // Level 3 — Article detail
  // GET /api/finance/article/:id?restaurantId=xxx&periodType=today&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  getArticle: (articleId: string, restaurantId: string, periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ restaurantId, periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<ArticleGroupDetailDto>(`/api/finance/article/${articleId}?${params.toString()}`);
  },

  // Level 4 — Operations list
  // GET /api/finance/article/:articleId/operations?restaurantId=&periodType=&page=&limit=
  getOperations: (
    articleId: string,
    restaurantId: string,
    page: number,
    periodType: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    const params = new URLSearchParams({ restaurantId, periodType, page: String(page), limit: '20' });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<OperationsListDto>(`/api/finance/article/${articleId}/operations?${params.toString()}`);
  },

  // Reports — DDS summary across all restaurants
  // Backend returns { restaurants: [{ groups: [...] }] }, we aggregate into { groups, grandTotal }
  getReportDds: async (periodType: string, dateFrom?: string, dateTo?: string): Promise<ReportDdsDto> => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const raw = await api.request<any>(`/api/finance/reports/dds?${params.toString()}`);

    // If backend already returns { groups }, pass through
    if (raw.groups) return raw as ReportDdsDto;

    // Transform: aggregate restaurants[].groups[] into flat groups[]
    const groupMap = new Map<string, { groupName: string; groupId: string; totalAmount: number; restaurants: { restaurantId: string; restaurantName: string; amount: number }[] }>();
    for (const rest of (raw.restaurants ?? [])) {
      for (const g of (rest.groups ?? [])) {
        const key = g.groupName;
        if (!groupMap.has(key)) {
          groupMap.set(key, { groupName: g.groupName, groupId: g.groupName, totalAmount: 0, restaurants: [] });
        }
        const entry = groupMap.get(key)!;
        entry.totalAmount += g.amount ?? 0;
        entry.restaurants.push({ restaurantId: rest.restaurantId, restaurantName: rest.restaurantName, amount: g.amount ?? 0 });
      }
    }
    const groups = [...groupMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);
    const grandTotal = groups.reduce((s, g) => s + g.totalAmount, 0);
    return { groups, grandTotal, period: raw.period ?? { from: dateFrom ?? '', to: dateTo ?? '' } } as ReportDdsDto;
  },

  // Reports — Company expenses (HQ + Kitchen)
  getReportCompanyExpenses: (periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<ReportCompanyExpensesDto>(`/api/finance/reports/company-expenses?${params.toString()}`);
  },

  // Reports — Kitchen purchases and shipments
  getReportKitchen: (periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<ReportKitchenDto>(`/api/finance/reports/kitchen?${params.toString()}`);
  },

  // Company revenue aggregated — for RevenueDetailScreen
  getRevenueAggregated: (periodType: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return api.request<CompanyRevenueAggregatedDto>(`/api/finance/dashboard/revenue-aggregated?${params.toString()}`);
  },

  // Reports — Trends (revenue + expenses over time)
  // Backend returns { points } without avgRevenue/avgExpenses — compute on client
  getReportTrends: async (periodType: string, dateFrom?: string, dateTo?: string): Promise<ReportTrendsDto> => {
    const params = new URLSearchParams({ periodType });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const raw = await api.request<any>(`/api/finance/reports/trends?${params.toString()}`);
    const points = raw.points ?? [];
    const count = points.length || 1;
    const avgRevenue = raw.avgRevenue ?? points.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0) / count;
    const avgExpenses = raw.avgExpenses ?? points.reduce((s: number, p: any) => s + (p.expenses ?? 0), 0) / count;
    return { points, avgRevenue, avgExpenses, period: raw.period ?? { from: dateFrom ?? '', to: dateTo ?? '' } } as ReportTrendsDto;
  },
};

// ─── Notification API ───────────────────────────────────────────────────────

export const notificationApi = {
  // GET /api/notifications?page=1&pageSize=20
  getNotifications: (page: number = 1, pageSize: number = 20) =>
    api.request<NotificationListDto>(`/api/notifications?page=${page}&pageSize=${pageSize}`),

  // PATCH /api/notifications/:id/read
  markAsRead: (notificationId: string) =>
    api.request<{ success: boolean }>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),

  // PATCH /api/notifications/read-all
  markAllAsRead: () =>
    api.request<{ success: boolean }>('/api/notifications/read-all', { method: 'PATCH' }),

  // POST /api/notifications/register-token
  registerToken: (fcmToken: string, platform: string) =>
    api.request<{ success: boolean }>('/api/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token: fcmToken, platform }),
    }),
};
