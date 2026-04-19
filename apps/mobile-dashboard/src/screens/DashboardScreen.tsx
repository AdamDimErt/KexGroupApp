import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bell, Settings, LogOut, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { OfflineBanner } from '../components/OfflineBanner';
import { useDashboard } from '../hooks/useDashboard';
import { useDashboardStore } from '../store/dashboard';
import { useAuthStore } from '../store/auth';
import { styles } from './DashboardScreen.styles';

interface DashboardProps {
  onPointSelect: (id: string) => void;
  onNavigateBrand?: (id: string, name: string) => void;
  onNavigateNotifications: () => void;
  onNavigateProfile?: () => void;
  onLogout: () => void;
}

export function DashboardScreen({ onPointSelect, onNavigateBrand, onNavigateNotifications, onNavigateProfile, onLogout }: DashboardProps) {
  const {
    totalRevenue, totalExpenses, financialResult, totalRestaurantCount,
    restaurantItems, confirmLogout, isLoading, isRefreshing, error,
    lastSyncAt, refetch, handleRefresh, greeting,
    isStale, isOffline, cachedAt,
  } = useDashboard(onLogout);

  const heroLabel = usePeriodHeroLabel('ВЫРУЧКА');
  const role = useAuthStore(s => s.user?.role);

  // Access matrix:
  // OWNER + FINANCE_DIRECTOR: see revenue, expenses, balance (financial result)
  // OPERATIONS_DIRECTOR: see revenue + expenses only (no balance / financial result)
  // ADMIN: same as OWNER
  const showBalance = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
  const showFinancialResult = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';

  const onRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleRefresh();
  };

  const formatAmount = (amount: number) => {
    if (Math.abs(amount) >= 1000000) return `₸${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `₸${(amount / 1000).toFixed(0)}K`;
    return `₸${amount.toFixed(0)}`;
  };

  // ─── Loading state with skeleton ────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.title}>Kex Group</Text>
          </View>
        </View>
        {/* Period selector skeleton */}
        <View style={styles.skeletonPeriodRow}>
          <SkeletonLoader width={80} height={34} borderRadius={20} />
          <SkeletonLoader width={80} height={34} borderRadius={20} />
          <SkeletonLoader width={80} height={34} borderRadius={20} />
          <SkeletonLoader width={100} height={34} borderRadius={20} />
        </View>
        {/* KPI row skeleton */}
        <View style={styles.skeletonRow}>
          <SkeletonLoader width={'33%'} height={70} borderRadius={12} />
          <SkeletonLoader width={'33%'} height={70} borderRadius={12} />
          <SkeletonLoader width={'33%'} height={70} borderRadius={12} />
        </View>
        {/* Hero card skeleton */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <SkeletonLoader width={'100%'} height={120} borderRadius={16} />
        </View>
        {/* Brand list skeleton */}
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          <SkeletonLoader width={'100%'} height={80} borderRadius={12} />
          <SkeletonLoader width={'100%'} height={80} borderRadius={12} />
        </View>
      </ScrollView>
    );
  }

  // ─── Error state with retry ─────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={48} color={colors.red} />
        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
        <Text style={styles.errorMessage}>
          {typeof error === 'string' ? error : (typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : 'Неизвестная ошибка')}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
          <RefreshCw size={16} color="#FFF" />
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <OfflineBanner isOffline={isOffline} isStale={isStale} cachedAt={cachedAt} />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.accentDefault}
          colors={[colors.accentDefault]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.title}>Kex Group</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onNavigateNotifications} style={styles.bellBtn}>
            <Bell size={20} color={colors.textSecondary} />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
          {onNavigateProfile && (
            <TouchableOpacity onPress={onNavigateProfile} style={styles.logoutBtn}>
              <Settings size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
            <LogOut size={18} color={colors.textTertiary} />
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
        const syncStale = (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
        const syncColor = syncStale ? '#EF4444' : 'rgba(255,255,255,0.35)';
        const timeStr = new Date(lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return (
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
            <Text style={[styles.syncText, { color: syncColor }]}>Синхронизация: {timeStr}</Text>
          </View>
        );
      })()}

      {/* Hero Card — total revenue */}
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
          {showFinancialResult && (
            <Text style={financialResult >= 0 ? styles.heroGreen : styles.heroGray}>
              {financialResult >= 0 ? '↑' : '↓'} Результат: {formatAmount(financialResult)}
            </Text>
          )}
          <Text style={styles.heroGray}>Расходы: {formatAmount(totalExpenses)}</Text>
        </View>
      </View>

      {/* Brand list */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Бренды</Text>
        <Text style={styles.listCount}>{totalRestaurantCount} точек</Text>
      </View>

      {restaurantItems.map(r => (
        // TODO: Wave 4 — sync with finance-service API
        <RestaurantCard
          key={r.id}
          name={r.name}
          city={r.city ?? '—'}
          brand={(r as any).brand || 'BNA'}
          cuisine={(r as any).cuisine || 'Burger'}
          revenue={r.revenue}
          plannedRevenue={(r as any).plannedRevenue ?? 0}
          marginPct={(r as any).marginPct ?? null}
          deltaPct={(r as any).deltaPct ?? r.dev ?? null}
          planAttainmentPct={(r as any).planAttainmentPct ?? 0}
          planMarkPct={(r as any).planMarkPct ?? 100}
          periodLabel={(r as any).periodLabel || '—'}
          transactions={(r as any).transactions ?? null}
          status={
            r.status === 'green' ? 'above' :
            r.status === 'red' ? 'below' :
            r.status === 'yellow' ? 'onplan' :
            (r.status as 'above' | 'onplan' | 'below' | 'offline' | 'loading') ?? 'onplan'
          }
          onPress={() => onNavigateBrand ? onNavigateBrand(r.id, r.name) : onPointSelect(r.id)}
        />
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  );
}
