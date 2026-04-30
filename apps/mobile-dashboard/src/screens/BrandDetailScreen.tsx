import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBrandDetail } from '../hooks/useBrandDetail';
import { useSparklineRevenue } from '../hooks/useSparklineRevenue';
import { RestaurantCard } from '../components/RestaurantCard';
import { LegalEntityCard } from '../components/LegalEntityCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { RevenueSparkline } from '../components/RevenueSparkline';
import { colors } from '../theme';
import { excludeTodayPartial } from '../utils/sparkline';
import { styles } from './BrandDetailScreen.styles';

function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `₸${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `₸${(amount / 1_000).toFixed(0)}K`;
  return `₸${amount.toFixed(0)}`;
}

interface BrandDetailScreenProps {
  brandId: string | null;
  brandName: string;
  onNavigateToRestaurant: (restaurantId: string) => void;
  onNavigateToLegalEntity?: (legalEntityId: string, name: string) => void;
  onBack: () => void;
}

export function BrandDetailScreen({
  brandId,
  brandName,
  onNavigateToRestaurant,
  onNavigateToLegalEntity,
  onBack,
}: BrandDetailScreenProps) {
  const { totalRevenue, totalExpenses, restaurants, legalEntities, isLoading, error, refetch, isStale, isOffline, cachedAt } = useBrandDetail(brandId || '');
  // Skip-when-1 rule (UX 1A): show the legal-entity drill-down step only if
  // a brand actually has more than one active legal entity. Brands like BNA/JD/KEX
  // have a single ТОО — forcing an extra screen with one tile would be friction.
  const showLegalEntities = legalEntities.length >= 2;
  // Pick brand colour from any restaurant (they all share the same brand here)
  // so LegalEntityCards inherit the parent brand's accent.
  const brandCode = restaurants[0]?.brand ?? 'BNA';
  const heroLabel = usePeriodHeroLabel('ВЫРУЧКА');

  // Sparkline data — пока используем company-wide aggregated revenue.
  // TODO(api): добавить brand-фильтр в /revenue/aggregated → revenueAggregated(brandId)
  // и брать dailyRevenue именно по этому бренду. Сейчас отображает компанию целиком.
  // Также: отрезаем сегодняшнюю точку если она неполная (чтобы график не «проваливался»).
  // Sparkline — всегда последние 30 дней (для контекста), независимо от period switcher
  const { data: sparkData } = useSparklineRevenue();
  const rawPoints = (sparkData?.dailyRevenue ?? []).map(p => ({ date: p.date, revenue: p.revenue }));
  const { points: sparkPoints, todayDropped, todayValue } = excludeTodayPartial(rawPoints);

  // Финансовый результат бренда (выручка - расходы)
  const financialResult = totalRevenue - totalExpenses;
  // Sparkline — нейтральный белый, как на главной. Цвет графика не должен оценивать
  // бизнес — для этого есть строка "Результат" внизу (зелёный +, красный −).
  const sparkColor = '#FFFFFF';

  // Ширина для sparkline — берём по реальному размеру hero-карточки
  const [sparkWidth, setSparkWidth] = useState(0);
  const onHeroLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - sparkWidth) > 1) setSparkWidth(w);
  };

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  if (!brandId) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Text style={styles.errorText}>Brand not found</Text>
      </View>
    );
  }

  if (isLoading && restaurants.length === 0) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.accentDefault} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <OfflineBanner isOffline={isOffline} isStale={isStale} cachedAt={cachedAt} />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accentDefault} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{brandName}</Text>
      </View>

      {/* Period Selector */}
      <PeriodSelector marginTop={12} />

      {/* Hero Card — brand revenue summary (Binance-style: amount + PnL + sparkline) */}
      <View style={styles.heroCard} onLayout={onHeroLayout}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>{heroLabel}</Text>
          <View style={styles.heroSourceRow}>
            {['iiko'].map(src => (
              <View key={src} style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{src}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.heroAmount}>{formatAmount(totalRevenue)}</Text>

        {/* PnL блок убран — формула revenue × 1.05 давала ложные −4.76%.
            Вернём после интеграции с 1С (реальные расходы → настоящий PnL). */}

        {/* Sparkline area chart */}
        {sparkPoints.length >= 2 && sparkWidth > 0 && (
          <View style={styles.heroSparkWrap}>
            <RevenueSparkline
              data={sparkPoints}
              width={sparkWidth - 44 /* heroCard padding 22*2 */}
              height={64}
              color={sparkColor}
            />
            {todayDropped && todayValue != null && (
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4 }}>
                ⏳ график — по полным дням · сегодня ещё в работе ({formatAmount(todayValue)})
              </Text>
            )}
          </View>
        )}

        {/* Footer row: финансовый результат + расходы (красным) + точки */}
        <View style={styles.heroSubRow}>
          <Text style={financialResult >= 0 ? styles.heroGreen : styles.heroExpenses}>
            {financialResult >= 0 ? '↑' : '↓'} Результат: {formatAmount(financialResult)}
          </Text>
          {totalExpenses > 0 && (
            <Text style={styles.heroExpenses}>Расходы: {formatAmount(totalExpenses)}</Text>
          )}
          <Text style={styles.heroGray}>Точек: {restaurants.length}</Text>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {showLegalEntities ? (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Юр-лица</Text>
            <Text style={styles.listCount}>{legalEntities.length}</Text>
          </View>

          {legalEntities.map((le) => (
            <LegalEntityCard
              key={le.id}
              name={le.name}
              taxpayerIdNumber={le.taxpayerIdNumber}
              revenue={le.revenue}
              financialResult={le.financialResult}
              restaurantCount={le.restaurantCount}
              brand={brandCode}
              onPress={() => onNavigateToLegalEntity?.(le.id, le.name)}
            />
          ))}
        </>
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Рестораны</Text>
            <Text style={styles.listCount}>{restaurants.length} точек</Text>
          </View>

          {restaurants.map(r => (
            <RestaurantCard
              key={r.id}
              name={r.name}
              city={r.name}
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
              onPress={() => onNavigateToRestaurant(r.id)}
            />
          ))}
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  );
}
