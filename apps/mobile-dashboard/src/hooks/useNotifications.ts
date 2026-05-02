import { useApiQuery } from './useApi';
import { notificationApi } from '../services/api';
import type { NotificationListDto } from '../types';

// Map API notification types to colors
const notificationTypeColors: Record<string, string> = {
  SYNC_FAILURE: '#EF4444',
  LOW_REVENUE: '#F59E0B',
  LARGE_EXPENSE: '#EF4444',
  DAILY_SUMMARY: '#3B82F6',
};

export function useNotifications(page: number = 1, pageSize: number = 20) {
  const { data, isLoading, error } = useApiQuery<NotificationListDto>(
    () => notificationApi.getNotifications(page, pageSize),
    [page, pageSize],
  );

  // Transform API notifications to legacy format
  const items = (data?.notifications ?? []).map(n => ({
    id: n.id,
    read: n.isRead,
    color: notificationTypeColors[n.type] || '#3B82F6',
    title: n.title,
    body: n.body,
    time: new Date(n.createdAt).toLocaleString('ru-RU'),
  }));

  const unread = data?.unreadCount ?? 0;

  return {
    items,
    unread,
    isLoading,
    error,
    total: data?.total ?? 0,
  };
}
