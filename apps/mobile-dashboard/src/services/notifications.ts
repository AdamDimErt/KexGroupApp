import { Platform } from 'react-native';
import { API_URL, REQUEST_TIMEOUT } from '../config';

async function assertOk(res: Response, op: string): Promise<void> {
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `${op} failed: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`,
    );
  }
}

// ─── Register push token with backend ──────────────────────────────────────

export async function registerPushToken(
  accessToken: string,
  fcmToken: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/register-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      fcmToken,
      platform: Platform.OS, // 'ios' | 'android'
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  await assertOk(res, 'registerPushToken');
}

// ─── Unregister push token ─────────────────────────────────────────────────

export async function unregisterPushToken(
  accessToken: string,
  fcmToken: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/unregister-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fcmToken }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  await assertOk(res, 'unregisterPushToken');
}

// ─── Fetch notifications list ──────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
}

export async function fetchNotifications(
  accessToken: string,
  page = 1,
): Promise<NotificationsResponse> {
  const res = await fetch(
    `${API_URL}/api/notifications?page=${page}&pageSize=20`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    },
  );
  await assertOk(res, 'fetchNotifications');
  return res.json();
}

// ─── Mark as read ──────────────────────────────────────────────────────────

export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    },
  );
  await assertOk(res, 'markNotificationRead');
}

export async function markAllNotificationsRead(
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  await assertOk(res, 'markAllNotificationsRead');
}

// ─── Notification preferences ──────────────────────────────────────────────

export interface NotificationPref {
  type: string;
  enabled: boolean;
}

export async function fetchNotificationPrefs(
  accessToken: string,
): Promise<NotificationPref[]> {
  const res = await fetch(`${API_URL}/api/notifications/preferences`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  await assertOk(res, 'fetchNotificationPrefs');
  return res.json();
}

export async function updateNotificationPref(
  accessToken: string,
  type: string,
  enabled: boolean,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/preferences/${type}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ enabled }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  await assertOk(res, 'updateNotificationPref');
}
