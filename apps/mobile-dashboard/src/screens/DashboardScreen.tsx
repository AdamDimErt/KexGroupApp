import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bell, Search, LogOut, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { HeroCard } from '../components/HeroCard';
import { PeriodSelector, usePeriodHeroLabel, PERIOD_OPTIONS } from '../components/PeriodSelector';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { OfflineBanner } from '../components/OfflineBanner';
import { RevenueSparkline } from '../components/RevenueSparkline';
import { useDashboard } from '../hooks/useDashboard';
import { useSparklineRevenue } from '../hooks/useSparklineRevenue';
import { excludeTodayPartial } from '../utils/sparkline';
import { formatSyncTime } from '../utils/brand';
import { useAuthStore } from '../store/auth';
import { styles } from './DashboardScreen.styles';

interface DashboardProps {
  onPointSelect: (id: string) => void;
  onNavigateBrand?: (id: string, name: string) => void;
  onNavigateNotifications: () => void;
  onNavigateProfile?: () => void;
  onLogout: () => void;
  /** Navigate to the company revenue detail screen */
  onNavigateRevenueDetail?: () => void;
  /** Open flat search overlay (find any restaurant by name) */
  onNavigateSearch?: () => void;
}

export function DashboardScreen({ onPointSelect, onNavigateBrand, onNavigateNotifications, onNavigateProfile, onLogout, onNavigateRevenueDetail, onNavigateSearch }: DashboardProps) {
  const {
    totalRevenue, totalExpenses, financialResult, totalPlannedRevenue, totalRestaurantCount,
    restaurantItems, confirmLogout, isLoading, isRefreshing, error,
    lastSyncAt, refetch, handleRefresh, greeting,
    isStale, isOffline, cachedAt,
  } = useDashboard(onLogout);

  const heroPeriodLabel = usePeriodHeroLabel('');
  const role = useAuthStore(s => s.user?.role);

  // Sparkline data: дневная выручка за выбранный период.
  // Если последняя точка = сегодня (неполный день) — отрезаем её, иначе график
  // визуально «обваливается» в правом краю и пугает пользователя «упало!».
  // Sparkline — всегда последние 30 дней (для контекста), независимо от period switcher
  const { data: sparkData } = useSparklineRevenue();
  const rawPoints = (sparkData?.dailyRevenue ?? []).map(p => ({ date: p.date, revenue: p.revenue }));
  const { points: sparkPoints, todayDropped, todayValue } = excludeTodayPartial(rawPoints);

  // Цвет sparkline: нейтральный белый.
  // Раньше пытались сделать зелёный/красный по сравнению с прошлым периодом, но это
  // давало конфликт UX: «Результат» (выручка - расходы) мог быть зелёным, а график
  // красным (если этот месяц чуть слабее прошлого). Пользователь видел противоречие.
  // Sparkline — это ИНФОРМАЦИЯ о тренде, не ОЦЕНКА. Оценку даёт цифра «Результат».
  const trendColor = '#FFFFFF';

  // Sparkline ширину считаем по реальному размеру контейнера, чтобы избежать
  // overflow на устройствах с разной шириной экрана.
  const [sparkWidth, setSparkWidth] = useState(0);
  const onHeroLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - sparkWidth) > 1) setSparkWidth(w);
  };

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
          {onNavigateSearch && (
            <TouchableOpacity onPress={onNavigateSearch} style={styles.bellBtn}>
              <Search size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNavigateNotifications} style={styles.bellBtn}>
            <Bell size={20} color={colors.textSecondary} />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
            <LogOut size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Selector */}
      <PeriodSelector marginTop={16} />

      {/* Three KPI cards */}
      <View style={styles.kpiRow}>
        {/* ВЫРУЧКА — tappable, navigates to RevenueDetailScreen */}
        <TouchableOpacity
          style={[styles.kpiCard, { position: 'relative', minHeight: 62 }]}
          onPress={async () => {
            await Haptics.selectionAsync();
            onNavigateRevenueDetail?.();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Выручка — детали"
          disabled={!onNavigateRevenueDetail}
        >
          <Text style={styles.kpiLabel} numberOfLines={1}>ВЫРУЧКА</Text>
          <Text
            style={styles.kpiValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatAmount(totalRevenue)}
          </Text>
          {onNavigateRevenueDetail && (
            <ChevronRight
              size={12}
              color={colors.textTertiary}
              style={{ position: 'absolute', top: 12, right: 10 }}
            />
          )}
        </TouchableOpacity>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel} numberOfLines={1}>РАСХОДЫ</Text>
          <Text
            style={[styles.kpiValue, { color: colors.red }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatAmount(totalExpenses)}
          </Text>
        </View>
        {showBalance && (
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel} numberOfLines={1}>БАЛАНС</Text>
            <Text
              style={[styles.kpiValue, { color: financialResult >= 0 ? colors.green : colors.red }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatAmount(financialResult)}
            </Text>
          </View>
        )}
      </View>

      {/* Last sync indicator */}
      {lastSyncAt && (() => {
        const syncStale = (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
        const syncColor = syncStale ? '#EF4444' : 'rgba(255,255,255,0.35)';
        const timeStr = formatSyncTime(lastSyncAt);
        return (
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
            <Text style={[styles.syncText, { color: syncColor }]}>Синхронизация: {timeStr}</Text>
          </View>
        );
      })()}

      {/* Hero Card — total revenue (Binance-style: amount + PnL + sparkline) */}
      <View style={styles.heroCard} onLayout={onHeroLayout}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>ВЫРУЧКА</Text>
          <View style={styles.heroSourceRow}>
            {['iiko', '1С'].map(src => (
              <View key={src} style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{src}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text
          style={styles.heroAmount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {formatAmount(totalRevenue)}
        </Text>

        {/* PnL блок убран до подключения реальных расходов из 1С.
            До этого момента «PnL = revenue × 1.05 − revenue» давал ложное «−4.76%»,
            что вводило руководство в заблуждение. Вернём после интеграции с 1С. */}

        {/* Sparkline area chart.
            sparkWidth — фактическая внутренняя ширина hero-card (без padding 20*2).
            heroSparkWrap имеет marginHorizontal: -4, поэтому полезной ширины
            sparkWidth - 40 (паддинг) + 8 (компенсация отрицательного marginHorizontal) = sparkWidth - 32. */}
        {sparkPoints.length >= 2 && sparkWidth > 0 && (
          <View style={styles.heroSparkWrap}>
            <RevenueSparkline
              data={sparkPoints}
              width={Math.max(sparkWidth - 32, 0)}
              height={64}
              color={trendColor}
            />
            {/* Подсказка про неполный сегодняшний день — чтобы не казалось что «упало» */}
            {todayDropped && todayValue != null && (
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4 }}>
                ⏳ график — по полным дням · сегодня ещё в работе ({formatAmount(todayValue)})
              </Text>
            )}
          </View>
        )}

        {/* Footer: financial result + expenses (расходы выделены красным) */}
        <View style={styles.heroSubRow}>
          {showFinancialResult && (
            <Text style={financialResult >= 0 ? styles.heroGreen : { color: colors.red, fontSize: 12, fontWeight: '500' }}>
              {financialResult >= 0 ? '↑' : '↓'} Результат: {formatAmount(financialResult)}
            </Text>
          )}
          <Text style={{ color: colors.red, fontSize: 12, fontWeight: '500' }}>
            Расходы: {formatAmount(totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Brand list */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Бренды</Text>
        <Text style={styles.listCount}>{totalRestaurantCount} точек</Text>
      </View>

      {restaurantItems.map(r => (
        <RestaurantCard
          key={r.id}
          name={r.name}
          city={r.city ?? '—'}
          brand={r.brand}
          cuisine={r.cuisine}
          revenue={r.revenue}
          plannedRevenue={r.plannedRevenue}
          marginPct={r.marginPct}
          deltaPct={r.deltaPct}
          planAttainmentPct={r.planAttainmentPct}
          planMarkPct={r.planMarkPct}
          periodLabel={r.periodLabel}
          transactions={r.transactions}
          status={r.status}
          planLabel={r.planLabel}
          onPress={() => onNavigateBrand ? onNavigateBrand(r.id, r.name) : onPointSelect(r.id)}
        />
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  );
}
