import type { Restaurant, HourlyDataPoint } from '../types';

// Re-export types for backward compatibility
export type { Restaurant } from '../types';
export type { Status } from '../types';

// Re-export utils for backward compatibility
export { getStatus, statusColor } from '../utils/calculations';

export const restaurants: Restaurant[] = [
  { id: '1', name: 'Kex Burgers Галерея', city: 'Алматы', type: 'Fast Food', revenue: 2420000, plan: 2200000, expenses: 1574000, transactions: 412 },
  { id: '2', name: 'Kex Pizza Мега', city: 'Астана', type: 'Пицца', revenue: 1850000, plan: 2000000, expenses: 1295000, transactions: 298 },
  { id: '3', name: 'Kex Кофе Абай', city: 'Алматы', type: 'Кофейня', revenue: 1020000, plan: 1200000, expenses: 680000, transactions: 248 },
  { id: '4', name: 'Kex Diner Нурлытау', city: 'Астана', type: 'Diner', revenue: 1680000, plan: 1500000, expenses: 1092000, transactions: 356 },
  { id: '5', name: 'Kex Burgers Байтерек', city: 'Астана', type: 'Fast Food', revenue: 1270000, plan: 1100000, expenses: 825500, transactions: 289 },
];

export const hourlyData: HourlyDataPoint[] = [
  { hour: '10:00', value: 120000 },
  { hour: '11:00', value: 180000 },
  { hour: '12:00', value: 230000 },
  { hour: '13:00', value: 290000 },
  { hour: '14:00', value: 210000 },
  { hour: '15:00', value: 150000 },
  { hour: '16:00', value: 170000 },
  { hour: '17:00', value: 190000 },
];

export const planLine = 220000;
