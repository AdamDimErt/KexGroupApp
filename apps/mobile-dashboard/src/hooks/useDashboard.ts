import { Alert } from 'react-native';
import { restaurants } from '../data/restaurants';
import { totalRevenue, getStatus, getDeviation, getPlanPercent } from '../utils/calculations';

export function useDashboard(onLogout: () => void) {
  const total = totalRevenue(restaurants);

  const restaurantItems = restaurants.map(r => {
    const status = getStatus(r.revenue, r.plan);
    const dev = getDeviation(r.revenue, r.plan);
    const planPct = getPlanPercent(r.revenue, r.plan);
    return { ...r, status, dev, planPct };
  });

  const confirmLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: onLogout },
    ]);
  };

  return {
    totalRevenue: total,
    restaurantItems,
    confirmLogout,
  };
}
