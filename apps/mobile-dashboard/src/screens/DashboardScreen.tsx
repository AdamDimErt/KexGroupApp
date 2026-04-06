import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { useDashboard } from '../hooks/useDashboard';
import { useDashboardStore } from '../store/dashboard';
import { styles } from './DashboardScreen.styles';

interface DashboardProps {
  onPointSelect: (id: string) => void;
  onNavigateBrand?: (id: string, name: string) => void;
  onNavigateNotifications: () => void;
  onLogout: () => void;
}

export function DashboardScreen({ onPointSelect, onNavigateBrand, onNavigateNotifications, onLogout }: DashboardProps) {
  const { totalRevenue, totalExpenses, financialResult, totalRestaurantCount, restaurantItems, confirmLogout, isLoading, error } = useDashboard(onLogout);
  const heroLabel = usePeriodHeroLabel('ВЫРУЧКА');

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.heroGray, { marginTop: 12 }]}>Загрузка данных...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1, padding: 24 }]}>
        <Text style={[styles.heroLabel, { color: colors.red, marginBottom: 8 }]}>Ошибка загрузки</Text>
        <Text style={styles.heroGray}>{typeof error === 'string' ? error : (typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : 'Неизвестная ошибка')}</Text>
      </View>
    );
  }

  const formatAmount = (amount: number) => {
    if (Math.abs(amount) >= 1000000) return `₸${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `₸${(amount / 1000).toFixed(0)}K`;
    return `₸${amount.toFixed(0)}`;
  };

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

      {/* Period Selector */}
      <PeriodSelector marginTop={16} />

      {/* Hero Card — общая выручка */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>{heroLabel}</Text>
          <View style={styles.heroSourceRow}>
            {['iiko', '1С'].map(src => (
              <View key={src} style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{src}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.heroAmount}>{formatAmount(totalRevenue)}</Text>
        <View style={styles.heroSubRow}>
          <Text style={financialResult >= 0 ? styles.heroGreen : styles.heroGray}>
            {financialResult >= 0 ? '↑' : '↓'} Результат: {formatAmount(financialResult)}
          </Text>
          <Text style={styles.heroGray}>Расходы: {formatAmount(totalExpenses)}</Text>
        </View>
      </View>

      {/* Список брендов */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Бренды</Text>
        <Text style={styles.listCount}>{totalRestaurantCount} точек</Text>
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
          onPress={() => onNavigateBrand ? onNavigateBrand(r.id, r.name) : onPointSelect(r.id)}
        />
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
