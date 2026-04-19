import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Search } from 'lucide-react-native';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useRestaurantList } from '../hooks/useRestaurantList';
import { styles } from './PointsScreen.styles';

interface Props {
  onPointSelect: (id: string) => void;
}

function SkeletonCards() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonLoader width="60%" height={16} borderRadius={6} />
          <SkeletonLoader width="40%" height={12} borderRadius={6} />
          <View style={styles.skeletonRow}>
            <SkeletonLoader width="35%" height={14} borderRadius={6} />
            <SkeletonLoader width="35%" height={14} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PointsScreen({ onPointSelect }: Props) {
  const periodLabel = usePeriodHeroLabel('');
  const {
    query,
    setQuery,
    totalRevenue,
    filtered,
    isLoading,
    error,
    isOffline,
    isStale,
    cachedAt,
    refetch,
  } = useRestaurantList();

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const renderBody = () => {
    if (isLoading) {
      return <SkeletonCards />;
    }

    if (error && filtered.length === 0) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      );
    }

    if (!isLoading && filtered.length === 0) {
      const isSearch = query.length > 0;
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>{isSearch ? '?' : 'x'}</Text>
          <Text style={styles.emptyTitle}>
            {isSearch ? 'Ничего не найдено' : 'Нет ресторанов'}
          </Text>
          <Text style={styles.emptyBody}>
            {isSearch
              ? `По запросу "${query}" рестораны не найдены`
              : 'Данные ещё не загружены. Потяните вниз для обновления.'}
          </Text>
        </View>
      );
    }

    return (
      <>
        {filtered.map(r => (
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
            onPress={() => onPointSelect(r.id)}
          />
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Offline / stale data banner */}
      <OfflineBanner isOffline={isOffline} isStale={isStale} cachedAt={cachedAt} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Рестораны</Text>
        <Text style={styles.total}>
          {isLoading
            ? 'Загрузка...'
            : `\u20B8${(totalRevenue / 1_000_000).toFixed(2)}M ${periodLabel.toLowerCase()}`}
        </Text>

        {/* Period Selector */}
        <PeriodSelector marginTop={12} />

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={14} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по ресторанам..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            editable={!isLoading}
          />
        </View>
      </View>

      {/* List with pull-to-refresh */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={
          filtered.length === 0 && !isLoading
            ? [styles.listContent, { flex: 1 }]
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accentDefault}
            colors={[colors.accentDefault]}
          />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}
