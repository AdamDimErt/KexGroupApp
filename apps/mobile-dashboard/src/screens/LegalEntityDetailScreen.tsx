import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLegalEntityDetail } from '../hooks/useLegalEntityDetail';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors } from '../theme';
import { resolveBrand } from '../utils/brand';
import { styles } from './LegalEntityDetailScreen.styles';

function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `₸${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `₸${(amount / 1_000).toFixed(0)}K`;
  return `₸${amount.toFixed(0)}`;
}

interface LegalEntityDetailScreenProps {
  legalEntityId: string | null;
  legalEntityName: string;
  onNavigateToRestaurant: (restaurantId: string) => void;
  onBack: () => void;
}

export function LegalEntityDetailScreen({
  legalEntityId,
  legalEntityName,
  onNavigateToRestaurant,
  onBack,
}: LegalEntityDetailScreenProps) {
  const {
    legalEntity,
    brand,
    totalRevenue,
    totalExpenses,
    restaurants,
    isLoading,
    error,
    refetch,
    isStale,
    isOffline,
    cachedAt,
  } = useLegalEntityDetail(legalEntityId || '');
  const heroLabel = usePeriodHeroLabel('ВЫРУЧКА');

  const financialResult = totalRevenue - totalExpenses;
  const taxId = legalEntity?.taxpayerIdNumber ?? null;

  // Brand palette for hero card tinting — resolves from brand name returned by hook
  const brandCode = brand?.name ? resolveBrand(brand.name).code : 'BNA';
  const brandKey  = brandCode.toLowerCase() as keyof typeof colors.brand;
  const palette   = colors.brand[brandKey] ?? colors.brand.bna;

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  if (!legalEntityId) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Text style={styles.errorText}>Юр-лицо не найдено</Text>
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
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accentDefault} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backBtn}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {legalEntityName || legalEntity?.name || 'Юр-лицо'}
            </Text>
            {brand?.name ? (
              <Text style={styles.subtitle}>{brand.name}</Text>
            ) : null}
          </View>
        </View>

        {/* Period Selector */}
        <PeriodSelector marginTop={12} />

        {/* Hero — выручка/расходы/прибыль */}
        <View style={[styles.heroCard, { borderLeftColor: palette.text }]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{heroLabel}</Text>
            {brand?.name ? (
              <View style={styles.heroBrandRow}>
                <Text style={[
                  styles.heroBrandTag,
                  { backgroundColor: palette.bg, borderColor: palette.border, color: palette.text },
                ]}>
                  {brandCode}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroAmount}>{formatAmount(totalRevenue)}</Text>

          <View style={styles.heroSubRow}>
            <Text style={financialResult >= 0 ? styles.heroGreen : styles.heroExpenses}>
              {financialResult >= 0 ? '↑' : '↓'} Результат: {formatAmount(financialResult)}
            </Text>
            {totalExpenses > 0 && (
              <Text style={styles.heroExpenses}>Расходы: {formatAmount(totalExpenses)}</Text>
            )}
            <Text style={styles.heroGray}>Точек: {restaurants.length}</Text>
          </View>

          {taxId ? <Text style={styles.heroTaxId}>БИН/ИНН: {taxId}</Text> : null}
        </View>

        {/* Restaurants list */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Рестораны</Text>
          <Text style={styles.listCount}>{restaurants.length}</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {restaurants.map((r) => (
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

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
