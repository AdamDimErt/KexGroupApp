import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Search } from 'lucide-react-native';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { PeriodSelector, usePeriodHeroLabel } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useRestaurantList, type RestaurantListItem } from '../hooks/useRestaurantList';
import { styles } from './PointsScreen.styles';

interface Props {
  onPointSelect: (id: string) => void;
}

type BrandCode = RestaurantListItem['brand'];
type BrandFilter = BrandCode | 'ALL';

const BRAND_PALETTE: Record<BrandCode, { bg: string; border: string; text: string }> = {
  BNA: colors.brand.bna,
  DNA: colors.brand.dna,
  JD: colors.brand.jd,
  SB: colors.brand.sb,
  KEX: colors.brand.kex,
  KITCHEN: colors.brand.kitchen,
};

interface BrandGroup {
  code: BrandCode;
  name: string;
  items: RestaurantListItem[];
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

  const [activeBrand, setActiveBrand] = useState<BrandFilter>('ALL');

  // Group restaurants by brand from the *unfiltered-by-brand* list — chips show
  // counts even after a filter is applied, so the user can see what's hidden.
  const brandGroups = useMemo<BrandGroup[]>(() => {
    const map = new Map<BrandCode, BrandGroup>();
    for (const r of filtered) {
      const existing = map.get(r.brand);
      if (existing) {
        existing.items.push(r);
      } else {
        map.set(r.brand, { code: r.brand, name: r.brandName, items: [r] });
      }
    }
    // Sort groups by total revenue desc — biggest contributors first
    return Array.from(map.values()).sort((a, b) => {
      const sumA = a.items.reduce((s, x) => s + x.revenue, 0);
      const sumB = b.items.reduce((s, x) => s + x.revenue, 0);
      return sumB - sumA;
    });
  }, [filtered]);

  // Visible groups = all when ALL, single group otherwise.
  const visibleGroups = useMemo<BrandGroup[]>(() => {
    if (activeBrand === 'ALL') return brandGroups;
    return brandGroups.filter(g => g.code === activeBrand);
  }, [brandGroups, activeBrand]);

  const visibleCount = useMemo(
    () => visibleGroups.reduce((s, g) => s + g.items.length, 0),
    [visibleGroups],
  );

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleChipPress = useCallback(async (next: BrandFilter) => {
    await Haptics.selectionAsync();
    setActiveBrand(next);
  }, []);

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

    if (!isLoading && visibleCount === 0) {
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
        {visibleGroups.map((group, idx) => {
          const palette = BRAND_PALETTE[group.code] ?? BRAND_PALETTE.BNA;
          const sumRevenue = group.items.reduce((s, x) => s + x.revenue, 0);
          // Hide group header when only one brand is shown (filter active and
          // single brand) — count and revenue duplicate the chip context.
          const showGroupHeader = visibleGroups.length > 1 || activeBrand === 'ALL';

          return (
            <View key={group.code} style={idx > 0 ? styles.groupGap : undefined}>
              {showGroupHeader && (
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <View
                      style={[
                        styles.groupBadge,
                        { backgroundColor: palette.bg, borderColor: palette.border },
                      ]}
                    >
                      <Text style={[styles.groupBadgeText, { color: palette.text }]}>
                        {group.code}
                      </Text>
                    </View>
                    <Text style={styles.groupName} numberOfLines={1}>
                      {group.name}
                    </Text>
                  </View>
                  <Text style={styles.groupMeta}>
                    {group.items.length} · ₸{(sumRevenue / 1_000_000).toFixed(2)}М
                  </Text>
                </View>
              )}
              {group.items.map(r => (
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
            </View>
          );
        })}
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

      {/* Brand filter chips — horizontal scroll, sits above the list */}
      {brandGroups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          <BrandChip
            label="Все"
            count={filtered.length}
            active={activeBrand === 'ALL'}
            palette={null}
            onPress={() => handleChipPress('ALL')}
          />
          {brandGroups.map(g => (
            <BrandChip
              key={g.code}
              label={g.code}
              count={g.items.length}
              active={activeBrand === g.code}
              palette={BRAND_PALETTE[g.code]}
              onPress={() => handleChipPress(g.code)}
            />
          ))}
        </ScrollView>
      )}

      {/* List with pull-to-refresh */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={
          visibleCount === 0 && !isLoading
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

// ─── Brand filter chip ────────────────────────────────────────────────────────

interface BrandChipProps {
  label: string;
  count: number;
  active: boolean;
  palette: { bg: string; border: string; text: string } | null; // null = neutral "Все"
  onPress: () => void;
}

function BrandChip({ label, count, active, palette, onPress }: BrandChipProps) {
  const isAll = palette === null;
  // Active state mirrors brandBadge styling but at chip scale.
  const backgroundColor = active
    ? (isAll ? colors.accentDefault : palette!.bg)
    : 'transparent';
  const borderColor = active
    ? (isAll ? colors.accentDefault : palette!.border)
    : colors.border.default;
  const labelColor = active
    ? (isAll ? '#FFFFFF' : palette!.text)
    : colors.textSecondary;
  const countColor = active
    ? (isAll ? 'rgba(255,255,255,0.75)' : palette!.text)
    : colors.textTertiary;

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor, borderColor }]}
      activeOpacity={0.78}
      onPress={onPress}
    >
      <Text style={[styles.chipLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.chipCount, { color: countColor }]}>{count}</Text>
    </TouchableOpacity>
  );
}
