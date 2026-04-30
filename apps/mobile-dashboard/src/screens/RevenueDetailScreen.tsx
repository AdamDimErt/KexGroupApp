import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  ActivityIndicator,
  type DimensionValue,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useRevenueAggregated } from '../hooks/useRevenueAggregated';
import { PeriodSelector, PERIOD_OPTIONS } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { useDashboardStore } from '../store/dashboard';
import { colors } from '../theme';
import { styles } from './RevenueDetailScreen.styles';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtAmount(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `₸${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `₸${Math.round(v / 1_000)}K`;
  return `₸${Math.round(v)}`;
}

function fmtAmountFull(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `₸${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `₸${(v / 1_000).toFixed(1)}K`;
  return `₸${Math.round(v)}`;
}

function barPct(amount: number, maxAmount: number): DimensionValue {
  if (maxAmount === 0) return '0%';
  return `${Math.max((amount / maxAmount) * 100, 1)}%` as DimensionValue;
}

// ─── Payment type colors — mirrors PointDetailScreen palette ─────────────────
const KNOWN_PAYMENT_COLORS: Record<string, string> = {
  Cash: '#22C55E',
  Kaspi: '#F59E0B',
  Halyk: '#3B82F6',
  Yandex_food: '#EF4444',
  Glovo: '#FF6B35',
  QrPay: '#06B6D4',
  Card: '#8B5CF6',
  Online: '#EC4899',
};
const FALLBACK_COLORS = ['#14B8A6', '#F97316', '#A855F7', '#6366F1', '#84CC16', '#EAB308'];
function paymentColor(iikoCode: string, index: number): string {
  return KNOWN_PAYMENT_COLORS[iikoCode] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ─── DailyRevenueChart (same logic as PointDetailScreen) ─────────────────────

function DailyRevenueChart({
  data,
  periodLabel,
}: {
  data: { date: string; revenue: number }[];
  periodLabel: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const maxRev = Math.max(...data.map(p => p.revenue), 1);
  const avgRev = data.reduce((s, p) => s + p.revenue, 0) / (data.length || 1);

  // useWindowDimensions реагирует на поворот / split-screen, в отличие от Dimensions.get
  // которая фиксирует ширину при первом рендере.
  const { width: windowWidth } = useWindowDimensions();
  const screenW = windowWidth - 80;
  const MAX_BAR_W = 48;
  const barWidth =
    data.length <= 14
      ? Math.min(MAX_BAR_W, screenW / data.length - 6)
      : 22;
  const chartTotalW = data.length <= 14 ? screenW : data.length * (barWidth + 6);
  const labelStep = data.length <= 14 ? 1 : data.length <= 21 ? 2 : 3;

  const handlePress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(selected === index ? null : index);
  };

  const sel = selected !== null ? data[selected] : null;
  const selDate = sel ? new Date(sel.date) : null;
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <View style={styles.sectionCard}>
      {/* Card header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={styles.sectionTitle}>Выручка по дням</Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12, alignSelf: 'center' }}>
          {periodLabel}
        </Text>
      </View>

      {/* Tooltip for selected bar */}
      {sel && selDate ? (
        <View style={styles.chartSelectedTooltip}>
          <Text style={styles.chartSelectedDay}>
            {dayNames[selDate.getDay()]}, {selDate.getDate()}.{String(selDate.getMonth() + 1).padStart(2, '0')}
          </Text>
          <Text style={styles.chartSelectedRevenue}>{fmtAmountFull(sel.revenue)}</Text>
          <Text style={styles.chartSelectedVsAvg}>
            {sel.revenue > avgRev
              ? `+${((sel.revenue / avgRev - 1) * 100).toFixed(0)}% от среднего`
              : sel.revenue < avgRev
              ? `${((sel.revenue / avgRev - 1) * 100).toFixed(0)}% от среднего`
              : 'равно среднему'}
          </Text>
        </View>
      ) : (
        <Text style={styles.chartAvgHint}>
          {'Ср. '}
          {fmtAmount(avgRev)}
          {'/день  •  Нажмите на столбец'}
        </Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: chartTotalW }}>
          {/* Bars */}
          <View style={{ height: 120, position: 'relative' }}>
            {/* Average dashed line */}
            {avgRev > 0 && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: (avgRev / maxRev) * 120,
                  borderTopWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.borderDefault,
                  zIndex: 1,
                }}
              >
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 9,
                    position: 'absolute',
                    right: 0,
                    top: -14,
                  }}
                >
                  {fmtAmount(avgRev)}
                </Text>
              </View>
            )}
            {/* Bar columns */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                height: 120,
                justifyContent: 'space-between',
              }}
            >
              {data.map((p, i) => {
                const h = maxRev > 0 ? (p.revenue / maxRev) * 120 : 2;
                const isSelected = selected === i;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handlePress(i)}
                    activeOpacity={0.7}
                    style={{ alignItems: 'center', flex: 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={`День ${i + 1}: ${fmtAmount(p.revenue)}`}
                  >
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(h, 2),
                          width: barWidth,
                          backgroundColor: isSelected ? colors.green : colors.accentDefault,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {/* Date labels */}
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}
          >
            {data.map((p, i) => {
              const d = new Date(p.date);
              const showLabel = i % labelStep === 0;
              const isSelected = selected === i;
              return (
                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                  <Text
                    style={{
                      color: isSelected ? colors.green : colors.textTertiary,
                      fontSize: data.length > 14 ? 8 : 10,
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {showLabel ? String(d.getDate()) : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main screen component ────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onNavigateRestaurant?: (restaurantId: string) => void;
}

export function RevenueDetailScreen({ onBack, onNavigateRestaurant }: Props) {
  const { data, isLoading, error, refetch, isStale, isOffline, cachedAt } =
    useRevenueAggregated();

  const period = useDashboardStore(s => s.period);
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? 'Сегодня';

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const handleBackPress = async () => {
    await Haptics.selectionAsync();
    onBack();
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Выручка компании</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentDefault} />
        </View>
      </View>
    );
  }

  // ── Error / endpoint not ready ─────────────────────────────────────────────
  if (error || !data) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Выручка компании</Text>
        </View>
        <View style={styles.unavailableContainer}>
          <TrendingUp size={48} color={colors.textTertiary} />
          <Text style={styles.unavailableText}>Данные недоступны</Text>
          <Text style={styles.unavailableHint}>
            Детальная аналитика выручки появится после обновления сервиса
          </Text>
          <TouchableOpacity
            onPress={refetch}
            activeOpacity={0.75}
            style={{
              marginTop: 12,
              backgroundColor: colors.accentDefault,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
            accessibilityRole="button"
            accessibilityLabel="Повторить запрос"
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const marginPct =
    data.totalRevenue > 0
      ? Math.round((data.financialResult / data.totalRevenue) * 100)
      : 0;
  const marginIsPositive = data.financialResult >= 0;

  const maxPayment = Math.max(...data.paymentBreakdown.map(p => p.amount), 1);

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} isStale={isStale} cachedAt={cachedAt} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor={colors.accentDefault}
            colors={[colors.accentDefault]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Выручка компании</Text>
        </View>

        {/* Period selector */}
        <PeriodSelector marginTop={8} />

        {/* ── Hero: Total Revenue ─────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroSectionLabel}>Выручка</Text>
          <Text style={styles.heroAmount}>{fmtAmountFull(data.totalRevenue)}</Text>
          {/* Period label as subtle delta placeholder */}
          <View style={styles.heroDelta}>
            <TrendingUp size={14} color={colors.textTertiary} />
            <Text style={styles.heroDeltaNeutral}>{periodLabel}</Text>
          </View>
        </View>

        {/* ── Payment breakdown ───────────────────────────────────────────── */}
        {data.paymentBreakdown.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Выручка по типам оплат</Text>
            {data.paymentBreakdown.map((pt, idx) => {
              const color = paymentColor(pt.iikoCode, idx);
              return (
                <View key={pt.iikoCode} style={styles.paymentRow}>
                  <Text style={styles.paymentLabel} numberOfLines={1}>
                    {pt.name}
                  </Text>
                  <View style={styles.paymentBarBg}>
                    <View
                      style={[
                        styles.paymentBarFill,
                        {
                          width: barPct(pt.amount, maxPayment),
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.paymentAmount, { color }]}>
                    {fmtAmount(pt.amount)} ({Math.round(pt.percent)}%)
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Daily chart ─────────────────────────────────────────────────── */}
        {data.dailyRevenue.length > 1 && (
          <DailyRevenueChart data={data.dailyRevenue} periodLabel={periodLabel} />
        )}

        {/* ── Financial result ─────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Финансовый результат</Text>

          {/* Revenue row */}
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Выручка</Text>
            <Text style={[styles.finValue, { color: colors.green }]}>
              {fmtAmountFull(data.totalRevenue)}
            </Text>
          </View>

          {/* Direct expenses */}
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Прямые расходы</Text>
            <Text style={styles.finValueNegative}>
              {'-'}
              {fmtAmountFull(data.totalDirectExpenses)}
            </Text>
          </View>

          {/* Distributed expenses */}
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Распред. расходы</Text>
            <Text style={styles.finValueNegative}>
              {'-'}
              {fmtAmountFull(data.totalDistributedExpenses)}
            </Text>
          </View>

          {/* Result row */}
          <View style={[styles.finRow, styles.finRowBorder]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.finLabelBold}>Чистая прибыль</Text>
              <View
                style={[
                  styles.finMarginChip,
                  {
                    backgroundColor: marginIsPositive
                      ? colors.pill.positive.bg
                      : colors.pill.danger.bg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.finMarginText,
                    {
                      color: marginIsPositive
                        ? colors.pill.positive.text
                        : colors.pill.danger.text,
                    },
                  ]}
                >
                  {marginPct}%
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {marginIsPositive ? (
                <TrendingUp size={14} color={colors.green} />
              ) : (
                <TrendingDown size={14} color={colors.red} />
              )}
              <Text
                style={
                  marginIsPositive ? styles.finValuePositive : styles.finValueNegative
                }
              >
                {fmtAmountFull(data.financialResult)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Top 5 restaurants ────────────────────────────────────────────── */}
        {data.topRestaurants.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Топ-5 точек по выручке</Text>
            {data.topRestaurants.slice(0, 5).map((r, idx) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.topRow,
                  idx === Math.min(data.topRestaurants.length, 5) - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  onNavigateRestaurant?.(r.id);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${r.name}: ${fmtAmount(r.revenue)}`}
              >
                <Text style={styles.topRank}>{idx + 1}</Text>
                <Text style={styles.topName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.topRevenue}>{fmtAmount(r.revenue)}</Text>
                <Text style={styles.topShare}>({Math.round(r.share)}%)</Text>
                {onNavigateRestaurant && (
                  <ChevronRight
                    size={14}
                    color={colors.textTertiary}
                    style={styles.topChevron}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
