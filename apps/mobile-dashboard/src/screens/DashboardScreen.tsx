import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useDashboard } from '../hooks/useDashboard';
import { useDashboardStore } from '../store/dashboard';
import { useAuthStore } from '../store/auth';
import { styles } from './DashboardScreen.styles';

interface DashboardProps {
  onPointSelect: (id: string) => void;
  onNavigateBrand?: (id: string, name: string) => void;
  onNavigateNotifications: () => void;
  onLogout: () => void;
}

export function DashboardScreen({ onPointSelect, onNavigateBrand, onNavigateNotifications, onLogout }: DashboardProps) {
  const { totalRevenue, totalExpenses, financialResult, totalRestaurantCount, restaurantItems, confirmLogout, isLoading, error, lastSyncAt, refetch } = useDashboard(onLogout);
  const heroLabel = usePeriodHeroLabel('ВЫРУЧКА');
  const role = useAuthStore(s => s.user?.role);
  const showBalance = role === 'OWNER' || role === 'FINANCE_DIRECTOR';

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const formatAmount = (amount: number) => {
    if (Math.abs(amount) >= 1000000) return `₸${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `₸${(amount / 1000).toFixed(0)}K`;
    return `₸${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header stays the same */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Загрузка...</Text>
            <Text style={styles.title}>Kex Group</Text>
          </View>
        </View>
        <View style={styles.skeletonRow}>
          <SkeletonLoader width={'33%'} height={70} borderRadius={12} />
          <SkeletonLoader width={'33%'} height={70} borderRadius={12} />
          <SkeletonLoader width={'33%'} height={70} borderRadius={12} />
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <SkeletonLoader width={'100%'} height={120} borderRadius={16} />
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          <SkeletonLoader width={'100%'} height={80} borderRadius={12} />
          <SkeletonLoader width={'100%'} height={80} borderRadius={12} />
        </View>
      </ScrollView>
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accent} />}
    >
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

      {/* Three KPI cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>ВЫРУЧКА</Text>
          <Text style={styles.kpiValue}>{formatAmount(totalRevenue)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>РАСХОДЫ</Text>
          <Text style={styles.kpiValue}>{formatAmount(totalExpenses)}</Text>
        </View>
        {showBalance && (
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>БАЛАНС</Text>
            <Text style={[styles.kpiValue, { color: financialResult >= 0 ? '#10B981' : '#EF4444' }]}>
              {formatAmount(financialResult)}
            </Text>
          </View>
        )}
      </View>

      {/* Last sync indicator */}
      {lastSyncAt && (() => {
        const isStale = (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
        const syncColor = isStale ? '#EF4444' : 'rgba(255,255,255,0.35)';
        const timeStr = new Date(lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return (
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
            <Text style={[styles.syncText, { color: syncColor }]}>Синхронизация: {timeStr}</Text>
          </View>
        );
      })()}

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
