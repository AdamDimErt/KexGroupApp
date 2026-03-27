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

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

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

        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

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
  RestaurantDetailDto,
  ArticleGroupDetailDto,
  NotificationListDto,
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
