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

        const res = await fetch(`${API_URL}/auth/refresh`, {
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

export const dashboardApi = {
  // Level 1 — Company dashboard
  getSummary: (periodType: string, from?: string, to?: string) =>
    api.request<any>(`/dashboard/summary?period=${periodType}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`),

  // Level 1b — Brand detail
  getBrand: (brandId: string, periodType: string) =>
    api.request<any>(`/dashboard/brands/${brandId}?period=${periodType}`),

  // Level 2 — Restaurant detail
  getRestaurant: (restaurantId: string, periodType: string) =>
    api.request<any>(`/dashboard/restaurants/${restaurantId}?period=${periodType}`),

  // Level 3 — Article group
  getArticleGroup: (restaurantId: string, groupId: string, periodType: string) =>
    api.request<any>(`/dashboard/restaurants/${restaurantId}/groups/${groupId}?period=${periodType}`),

  // Level 4 — Operations
  getOperations: (restaurantId: string, articleId: string, periodType: string) =>
    api.request<any>(`/dashboard/restaurants/${restaurantId}/articles/${articleId}/operations?period=${periodType}`),

  // Reports
  getDdsReport: (periodType: string) =>
    api.request<any>(`/reports/dds?period=${periodType}`),

  getKitchenReport: (periodType: string) =>
    api.request<any>(`/reports/kitchen?period=${periodType}`),

  getTrendsReport: (periodType: string) =>
    api.request<any>(`/reports/trends?period=${periodType}`),
};
