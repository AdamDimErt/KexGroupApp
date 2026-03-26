import { Platform } from 'react-native';
import { API_URL, REQUEST_TIMEOUT } from '../config';

// ─── Register push token with backend ──────────────────────────────────────

export async function registerPushToken(
  accessToken: string,
  fcmToken: string,
): Promise<void> {
  await fetch(`${API_URL}/notifications/register-token`, {
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
}

// ─── Unregister push token ─────────────────────────────────────────────────

export async function unregisterPushToken(
  accessToken: string,
  fcmToken: string,
): Promise<void> {
  await fetch(`${API_URL}/notifications/unregister-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fcmToken }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
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
    `${API_URL}/notifications?page=${page}&pageSize=20`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    },
  );
  return res.json();
}

// ─── Mark as read ──────────────────────────────────────────────────────────

export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<void> {
  await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
}

export async function markAllNotificationsRead(
  accessToken: string,
): Promise<void> {
  await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
}
