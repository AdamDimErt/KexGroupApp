import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, type DimensionValue } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePointDetail } from '../hooks/usePointDetail';
import { PeriodSelector, PERIOD_OPTIONS } from '../components/PeriodSelector';
import { useDashboardStore } from '../store/dashboard';
import { useAuthStore } from '../store/auth';
import { colors } from '../theme';
import { styles } from './PointDetailScreen.styles';

interface Props {
  pointId: string | null;
  onBack: () => void;
  onNavigateArticle?: (groupId: string) => void;
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

export function PointDetailScreen({ pointId, onBack, onNavigateArticle }: Props) {
  const {
    restaurant: r, statusColor: col, statusLabel, profit, profitColor,
    hourlyData, planLine, maxBar, barW, expenseItems, isLoading,
    expenseGroups, directExpensesTotal, distributedExpensesTotal,
    financialResult, cashDiscrepancies, revenueChart, refetch,
  } = usePointDetail(pointId);
  const period = useDashboardStore(s => s.period);
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? 'Сегодня';
  const role = useAuthStore(s => s.user?.role);
  const canDrillToLevel3 = role === 'OWNER' || role === 'FINANCE_DIRECTOR';

  const maxExpense = expenseGroups.length > 0 ? Math.max(...expenseGroups.map(g => g.totalAmount)) : 0;

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

      {/* График выручки по часам */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Выручка по часам</Text>
          <Text style={styles.chartSub}>{periodLabel}</Text>
        </View>

        <View style={styles.chartArea}>
          {maxBar > 0 && (
            <View style={[styles.planLine, { bottom: (planLine / maxBar) * 120 }]}>
              <Text style={styles.planText}>план</Text>
            </View>
          )}
          <View style={styles.barsRow}>
            {hourlyData.map((d: any, i: number) => (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, { height: (d.value / maxBar) * 120, width: barW }]} />
                <Text style={styles.barLabel}>{d.hour}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Расходы по группам статей ДДС */}
      <View style={styles.expCard}>
        <Text style={styles.expTitle}>Расходы по группам</Text>
        {expenseGroups.map((group) => {
          const barWidth = maxExpense > 0 ? expenseBarPct(group.totalAmount, maxExpense) : '0%';
          const row = (
            <View style={styles.expRow}>
              <Text style={styles.expLabel}>{group.groupName}</Text>
              <View style={styles.expBarBg}>
                <View style={[styles.expBarFill, { width: barWidth as DimensionValue }]} />
              </View>
              <Text style={styles.expAmount}>-₸{group.totalAmount.toLocaleString()}</Text>
              {canDrillToLevel3 && <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>›</Text>}
            </View>
          );
          if (canDrillToLevel3 && onNavigateArticle) {
            return (
              <TouchableOpacity key={group.groupId} onPress={() => onNavigateArticle(group.groupId)} activeOpacity={0.7}>
                {row}
              </TouchableOpacity>
            );
          }
          return <View key={group.groupId}>{row}</View>;
        })}
      </View>

      {/* Финансовый результат */}
      <View style={styles.expCard}>
        <Text style={styles.expTitle}>Финансовый результат</Text>
        <View style={styles.expRow}>
          <Text style={styles.expLabel}>Прямые расходы</Text>
          <Text style={styles.expAmount}>-₸{directExpensesTotal.toLocaleString()}</Text>
        </View>
        <View style={styles.expRow}>
          <Text style={styles.expLabel}>Распределённые расходы</Text>
          <Text style={styles.expAmount}>-₸{distributedExpensesTotal.toLocaleString()}</Text>
        </View>
        <View style={[styles.expRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }]}>
          <Text style={[styles.expLabel, { fontWeight: '700' }]}>Итого</Text>
          <Text style={[styles.expAmount, { color: financialResult >= 0 ? '#10B981' : '#EF4444', fontWeight: '700' }]}>
            ₸{financialResult.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Недостачи и излишки */}
      {cashDiscrepancies.length > 0 && (
        <View style={styles.expCard}>
          <Text style={styles.expTitle}>Недостачи и излишки</Text>
          {cashDiscrepancies.map((disc, i) => {
            const diffColor = disc.difference >= 0 ? '#10B981' : '#EF4444';
            const diffSign = disc.difference >= 0 ? '+' : '';
            return (
              <View key={i} style={styles.expRow}>
                <Text style={styles.expLabel}>{new Date(disc.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</Text>
                <Text style={[styles.expAmount, { color: diffColor }]}>
                  {diffSign}₸{disc.difference.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* График выручки по дням за период */}
      {revenueChart.length > 0 && (() => {
        const maxRevenue = Math.max(...revenueChart.map(p => p.revenue), 1);
        const CHART_HEIGHT = 100;
        return (
          <View style={styles.revenueChartCard}>
            <Text style={styles.revenueChartTitle}>Выручка по дням</Text>
            <View style={styles.revenueChartContainer}>
              {revenueChart.slice(-14).map((point, i) => {
                const barHeight = Math.max((point.revenue / maxRevenue) * CHART_HEIGHT, 2);
                const dayLabel = new Date(point.date).getDate().toString();
                return (
                  <View key={i} style={styles.revenueChartBarWrapper}>
                    <View style={[styles.revenueChartBar, { height: barHeight }]} />
                    <Text style={styles.revenueChartLabel}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })()}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
