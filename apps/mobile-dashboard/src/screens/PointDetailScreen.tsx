import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions, type DimensionValue } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Package } from 'lucide-react-native';
import { usePointDetail } from '../hooks/usePointDetail';
import { PeriodSelector, PERIOD_OPTIONS } from '../components/PeriodSelector';
import { useDashboardStore } from '../store/dashboard';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors } from '../theme';
import { styles } from './PointDetailScreen.styles';

function fmtRevenue(v: number): string {
  if (v >= 1000000) return `₸${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `₸${Math.round(v / 1000)}K`;
  return `₸${v.toFixed(0)}`;
}

function DailyRevenueChart({ data, periodLabel }: { data: { date: string; revenue: number }[]; periodLabel: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const points = data;
  const maxRev = Math.max(...points.map(p => p.revenue), 1);
  const avgRev = points.reduce((s, p) => s + p.revenue, 0) / points.length;

  // Адаптивная ширина: если > 14 дней — горизонтальный скролл
  const screenW = Dimensions.get('window').width - 80;
  const barWidth = points.length <= 14
    ? (screenW / points.length) - 6
    : 22; // фиксированная ширина для скролла
  const chartTotalW = points.length <= 14
    ? screenW
    : points.length * (barWidth + 6);

  // Показывать подписи: каждую для ≤14, через одну для 15-21, каждую 3ю для 22+
  const labelStep = points.length <= 14 ? 1 : points.length <= 21 ? 2 : 3;

  const handlePress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(selected === index ? null : index);
  };

  const sel = selected !== null ? points[selected] : null;
  const selDate = sel ? new Date(sel.date) : null;
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Выручка по дням</Text>
        <Text style={styles.chartSub}>{periodLabel}</Text>
      </View>

      {sel && selDate && (
        <View style={{ backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
            {dayNames[selDate.getDay()]}, {selDate.getDate()}.{String(selDate.getMonth() + 1).padStart(2, '0')}
          </Text>
          <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '700', marginTop: 2 }}>
            {fmtRevenue(sel.revenue)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
            {sel.revenue > avgRev
              ? `+${((sel.revenue / avgRev - 1) * 100).toFixed(0)}% от среднего`
              : sel.revenue < avgRev
                ? `${((sel.revenue / avgRev - 1) * 100).toFixed(0)}% от среднего`
                : 'равно среднему'}
          </Text>
        </View>
      )}

      {!sel && (
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 4 }}>
          Ср. выручка/день: {fmtRevenue(avgRev)}  •  Нажмите на столбец
        </Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: chartTotalW }}>
          {/* Bars + average line overlay */}
          <View style={{ height: 120, position: 'relative' }}>
            {/* Average line — positioned exactly at avg height from bottom */}
            {avgRev > 0 && (
              <View style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: (avgRev / maxRev) * 120,
                borderTopWidth: 1,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.25)',
                zIndex: 1,
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, position: 'absolute', right: 0, top: -14 }}>
                  ср. {fmtRevenue(avgRev)}
                </Text>
              </View>
            )}
            {/* Bars */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, justifyContent: 'space-between' }}>
              {points.map((p, i) => {
                const h = maxRev > 0 ? (p.revenue / maxRev) * 120 : 2;
                const isSelected = selected === i;
                return (
                  <TouchableOpacity key={i} onPress={() => handlePress(i)} activeOpacity={0.7} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={[
                      styles.bar,
                      { height: Math.max(h, 2), width: barWidth },
                      isSelected && { backgroundColor: '#10B981' },
                    ]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {/* Date labels */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            {points.map((p, i) => {
              const d = new Date(p.date);
              const showLabel = i % labelStep === 0;
              const isSelected = selected === i;
              return (
                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[
                    { color: 'rgba(255,255,255,0.4)', fontSize: points.length > 14 ? 8 : 10 },
                    isSelected && { color: '#10B981', fontWeight: '600' },
                  ]}>
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

interface Props {
  pointId: string | null;
  onBack: () => void;
}

// ─── Форматирование (отделено от JSX) ─────────────────────────────────────

function fmtK(value: number): string {
  if (Math.abs(value) >= 1000000) return `₸${(value / 1000000).toFixed(1)}M`;
  return `₸${Math.round(value / 1000)}k`;
}

function fmtAmount(value: number): string {
  if (value >= 1000000) return `₸${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₸${Math.round(value / 1000)}K`;
  return `₸${value.toFixed(0)}`;
}

function expenseBarPct(amount: number, maxAmount: number): DimensionValue {
  if (maxAmount === 0) return '0%';
  return `${(amount / maxAmount) * 100}%` as DimensionValue;
}

// Color palette for dynamic payment types — known iiko codes get fixed colors,
// unknown types cycle through the fallback palette
const KNOWN_PAYMENT_COLORS: Record<string, string> = {
  Cash: '#10B981',
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

// ─── Компонент (только разметка + стили) ──────────────────────────────────

export function PointDetailScreen({ pointId, onBack }: Props) {
  const {
    restaurant: r, statusColor: col, statusLabel, profit, profitColor,
    hourlyData, planLine, maxBar, barW, expenseItems, isLoading,
    directExpensesTotal, distributedExpensesTotal, distributedExpenseItems,
    financialResult, cashDiscrepancies, revenueChart, refetch,
    isStale, isOffline, cachedAt,
  } = usePointDetail(pointId);
  const period = useDashboardStore(s => s.period);
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? 'Сегодня';

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  if (!r || isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backBtn}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Загрузка...</Text>
        </View>
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
        <Text style={styles.title}>{r.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: col + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: col }]} />
          <Text style={[styles.statusText, { color: col }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Period Selector */}
      <PeriodSelector marginTop={12} />

      {/* KPI Grid 2x2 */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiBlue]}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>ВЫРУЧКА</Text>
            <View style={styles.srcBadge}><Text style={styles.srcText}>iiko</Text></View>
          </View>
          <Text style={styles.kpiValue}>{fmtK(r.revenue)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>РАСХОДЫ</Text>
            <View style={styles.srcBadge}><Text style={styles.srcText}>1С</Text></View>
          </View>
          <Text style={styles.kpiValue}>{fmtK(r.expenses)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>ПРИБЫЛЬ</Text>
          <Text style={[styles.kpiValue, { color: profitColor }]}>{fmtK(profit)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>ЧЕКОВ</Text>
            <View style={styles.srcBadge}><Text style={styles.srcText}>iiko</Text></View>
          </View>
          <Text style={styles.kpiValue}>{r.transactions}</Text>
        </View>
      </View>

      {/* Выручка по типам оплат */}
      {r.paymentTypes.length > 0 && r.revenue > 0 && (() => {
        const maxPt = Math.max(...r.paymentTypes.map(pt => pt.amount), 1);
        return (
          <View style={styles.expCard}>
            <Text style={styles.expTitle}>Выручка по типам оплат</Text>
            {r.paymentTypes.map((pt, idx) => {
              const color = paymentColor(pt.iikoCode, idx);
              const pct = r.revenue > 0 ? Math.round((pt.amount / r.revenue) * 100) : 0;
              return (
                <View key={pt.iikoCode} style={styles.expRow}>
                  <Text style={[styles.expLabel, { width: 80 }]} numberOfLines={1}>{pt.name}</Text>
                  <View style={styles.expBarBg}>
                    <View style={[styles.expBarFill, { width: expenseBarPct(pt.amount, maxPt), backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.expAmount, { color }]}>{fmtAmount(pt.amount)} ({pct}%)</Text>
                </View>
              );
            })}
          </View>
        );
      })()}

      {/* График выручки по дням (за период) — с кликабельными столбцами */}
      {revenueChart.length > 1 && <DailyRevenueChart data={revenueChart} periodLabel={periodLabel} />}

      {/* Финансовый результат */}
      <View style={styles.expCard}>
        <Text style={styles.expTitle}>Финансовый результат</Text>
        {/* Revenue line */}
        <View style={styles.expRow}>
          <Text style={styles.expLabel}>Выручка</Text>
          <Text style={[styles.expAmount, { color: '#10B981' }]}>₸{r.revenue.toLocaleString()}</Text>
        </View>
        {/* Direct expenses */}
        <View style={styles.expRow}>
          <Text style={styles.expLabel}>Прямые расходы</Text>
          <Text style={styles.expAmount}>-₸{directExpensesTotal.toLocaleString()}</Text>
        </View>
        {/* Distributed expenses (HQ + Kitchen share) with breakdown */}
        <View style={styles.expRow}>
          <Text style={styles.expLabel}>Распред. расходы</Text>
          <Text style={styles.expAmount}>-₸{distributedExpensesTotal.toLocaleString()}</Text>
        </View>
        {distributedExpenseItems.length > 0 ? (
          <View style={{ marginLeft: 12, marginBottom: 8 }}>
            {distributedExpenseItems.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, flex: 1 }} numberOfLines={1}>
                  {item.name}
                  <Text style={{ color: 'rgba(255,255,255,0.3)' }}> ({item.source === 'IIKO' ? 'iiko' : '1С'})</Text>
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 8 }}>
                  -₸{item.amount.toLocaleString()}
                </Text>
              </View>
            ))}
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4 }}>
              коэфф. = выручка точки / общая выручка
            </Text>
          </View>
        ) : (
          <Text style={styles.finFormulaHint}>доля ГО и Цеха по коэффициенту</Text>
        )}
        {/* Result line */}
        <View style={[styles.expRow, styles.finResultRow]}>
          <Text style={[styles.expLabel, { fontWeight: '700' }]}>Фин. результат</Text>
          <Text style={[styles.expAmount, { color: financialResult >= 0 ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: 15 }]}>
            ₸{financialResult.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Недостачи и излишки по кассе */}
      {cashDiscrepancies.length > 0 && (
        <View style={styles.expCard}>
          <Text style={styles.expTitle}>Недостачи и излишки</Text>
          {/* Column headers */}
          <View style={styles.discHeaderRow}>
            <Text style={styles.discHeaderCell}>Дата</Text>
            <Text style={styles.discHeaderCell}>Ожидание</Text>
            <Text style={styles.discHeaderCell}>Факт</Text>
            <Text style={[styles.discHeaderCell, { textAlign: 'right' }]}>Разница</Text>
          </View>
          {cashDiscrepancies.map((disc, i) => {
            const diffColor = disc.difference >= 0 ? '#10B981' : '#EF4444';
            const diffSign = disc.difference >= 0 ? '+' : '';
            return (
              <View key={i} style={styles.discRow}>
                <Text style={styles.discCell}>
                  {new Date(disc.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                </Text>
                <Text style={styles.discCell}>{fmtAmount(disc.expected)}</Text>
                <Text style={styles.discCell}>{fmtAmount(disc.actual)}</Text>
                <Text style={[styles.discCell, { color: diffColor, textAlign: 'right', fontWeight: '600' }]}>
                  {diffSign}₸{Math.abs(disc.difference).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      )}


      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  );
}
