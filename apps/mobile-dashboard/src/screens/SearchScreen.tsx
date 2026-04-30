import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { useRestaurantList } from '../hooks/useRestaurantList';

interface Props {
  onPointSelect: (id: string) => void;
  onBack: () => void;
}

/**
 * Flat search screen — single input, sorted-by-revenue list, no brand grouping
 * or filter chips. Replaces the old "Рестораны" tab; reached via 🔍 in the
 * dashboard header. Purpose: "I know the name, take me to it in one tap."
 */
export function SearchScreen({ onPointSelect, onBack }: Props) {
  const {
    query,
    setQuery,
    filtered,
    isLoading,
    error,
    isOffline,
    isStale,
    cachedAt,
  } = useRestaurantList();

  const inputRef = useRef<TextInput | null>(null);

  // Autofocus the search input on mount — entering the screen always implies
  // the user wants to type immediately.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Sort by revenue desc — biggest contributors first when the user hasn't
  // typed anything; keep the same order while filtering so familiar items
  // stay near the top.
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.revenue - a.revenue),
    [filtered],
  );

  return (
    <View style={styles.container}>
      <OfflineBanner isOffline={isOffline} isStale={isStale} cachedAt={cachedAt} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Назад"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchWrap}>
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Найти ресторан..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {isLoading
            ? 'Загрузка...'
            : query
              ? `Найдено: ${sorted.length}`
              : `Все рестораны: ${sorted.length}`}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={
          sorted.length === 0 && !isLoading
            ? [styles.listContent, { flex: 1 }]
            : styles.listContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLoading && sorted.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={colors.accentDefault} />
          </View>
        ) : error && sorted.length === 0 ? (
          <View style={styles.centerWrap}>
            <Text style={styles.emptyTitle}>Ошибка загрузки</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.centerWrap}>
            <Search size={36} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {query ? 'Ничего не найдено' : 'Нет ресторанов'}
            </Text>
            <Text style={styles.emptyBody}>
              {query
                ? `По запросу «${query}» рестораны не найдены`
                : 'Подождите, пока подгрузятся данные'}
            </Text>
          </View>
        ) : (
          sorted.map(r => (
            <RestaurantCard
              key={r.id}
              name={r.name}
              city={r.brandName}
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
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgInput as string,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 4,
  },

  metaRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  metaText: {
    color: colors.textTertiary,
    fontSize: 12,
  },

  list: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 100 },

  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
