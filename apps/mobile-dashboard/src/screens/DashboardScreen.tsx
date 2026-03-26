import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { restaurants } from '../data/restaurants';
import { RestaurantCard } from '../components/RestaurantCard';
import { useDashboard } from '../hooks/useDashboard';
import { styles } from './DashboardScreen.styles';

interface DashboardProps {
  onPointSelect: (id: string) => void;
  onNavigateNotifications: () => void;
  onLogout: () => void;
}

export function DashboardScreen({ onPointSelect, onNavigateNotifications, onLogout }: DashboardProps) {
  const { totalRevenue, restaurantItems, confirmLogout } = useDashboard(onLogout);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Доброе утро 👋</Text>
          <Text style={styles.title}>Kex Group</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onNavigateNotifications} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellBadge} />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
            <Feather name="log-out" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Card — общая выручка */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>ВЫРУЧКА СЕГОДНЯ</Text>
          <View style={styles.heroSourceRow}>
            {['iiko', '1С'].map(src => (
              <View key={src} style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{src}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.heroAmount}>₸ {(totalRevenue / 1000000).toFixed(1)}M</Text>
        <View style={styles.heroSubRow}>
          <Text style={styles.heroGreen}>↑ 12.4% к плану</Text>
          <Text style={styles.heroGray}>Расходы: ₸5.1M</Text>
        </View>
      </View>

      {/* Список ресторанов */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Рестораны</Text>
        <Text style={styles.listCount}>{restaurants.length} точек</Text>
      </View>

      {restaurantItems.map(r => (
        <RestaurantCard
          key={r.id}
          name={r.name}
          city={r.city}
          type={r.type}
          revenue={r.revenue}
          transactions={r.transactions}
          dev={r.dev}
          status={r.status}
          planPct={r.planPct}
          onPress={() => onPointSelect(r.id)}
        />
      ))}

      {/* Остатки на счетах */}
      <Text style={styles.balancesLabel}>ОСТАТКИ НА СЧЕТАХ · 1С</Text>
      <View style={styles.balancesRow}>
        {[
          { bank: 'Kaspi Bank', balance: 2400000, upd: '10 мин' },
          { bank: 'Halyk Bank', balance: 890000, upd: '10 мин' },
        ].map(acc => (
          <View key={acc.bank} style={styles.balanceCard}>
            <Text style={styles.balanceBank}>{acc.bank}</Text>
            <Text style={styles.balanceAmount}>₸{(acc.balance / 1000000).toFixed(2)}M</Text>
            <Text style={styles.balanceUpd}>{acc.upd} назад</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
