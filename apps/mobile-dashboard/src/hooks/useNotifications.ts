import type { Notification } from '../types';

const items: Notification[] = [
  { id: '1', read: false, color: '#EF4444', title: 'Kex Кофе Абай', body: 'Выручка ниже плана на 15%', time: '10 мин' },
  { id: '2', read: false, color: '#F59E0B', title: 'Kex Pizza Мега', body: 'Выручка ниже плана на 7.5%', time: '1 ч' },
  { id: '3', read: true, color: '#3B82F6', title: 'Отчёт готов', body: 'Недельный отчёт 4–10 марта', time: '2 ч' },
  { id: '4', read: true, color: '#10B981', title: 'Kex Burgers Галерея', body: 'Превышен дневной план на 10%', time: '3 ч' },
  { id: '5', read: true, color: '#3B82F6', title: 'Синхронизация 1С', body: 'Данные обновлены успешно', time: '4 ч' },
];

export function useNotifications() {
  const unread = items.filter(n => !n.read).length;

  return {
    items,
    unread,
  };
}
