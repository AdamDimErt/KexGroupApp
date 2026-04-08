import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBrandDetail } from '../hooks/useBrandDetail';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors } from '../theme';
import { styles } from './BrandDetailScreen.styles';

interface BrandDetailScreenProps {
  brandId: string | null;
  brandName: string;
  onNavigateToRestaurant: (restaurantId: string) => void;
  onBack: () => void;
}

export function BrandDetailScreen({
  brandId,
  brandName,
  onNavigateToRestaurant,
  onBack,
}: BrandDetailScreenProps) {
  const { totalRevenue, restaurants, isLoading, error, refetch, isStale, isOffline, cachedAt } = useBrandDetail(brandId || '');
  const heroLabel = usePeriodHeroLabel('ВЫРУЧКА');

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
        <ActivityIndicator size="large" color={colors.accent} />
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
      refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accent} />}
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

      {/* Hero Card — brand revenue summary */}
      <View style={styles.heroCard}>
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
        <Text style={styles.heroAmount}>₸ {(totalRevenue / 1000000).toFixed(1)}M</Text>
        <View style={styles.heroSubRow}>
          <Text style={styles.heroGreen}>↑ 8.2% к плану</Text>
          <Text style={styles.heroGray}>Точек: {restaurants.length}</Text>
        </View>
      </View>

      {/* Restaurants list */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Рестораны</Text>
        <Text style={styles.listCount}>{restaurants.length} точек</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {restaurants.map(r => (
        <RestaurantCard
          key={r.id}
          name={r.name}
          city={r.name} // Use name as city placeholder (no separate city data for now)
          type="Ресторан"
          revenue={r.revenue}
          transactions={0}
          dev={r.trend}
          status={r.status}
          planPct={r.trend}
          onPress={() => onNavigateToRestaurant(r.id)}
        />
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  );
}
