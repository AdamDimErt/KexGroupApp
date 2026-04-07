import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, type DimensionValue } from 'react-native';
import { usePointDetail } from '../hooks/usePointDetail';
import { PeriodSelector, PERIOD_OPTIONS } from '../components/PeriodSelector';
import { useDashboardStore } from '../store/dashboard';
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

export function PointDetailScreen({ pointId, onBack }: Props) {
  const {
    restaurant: r, statusColor: col, statusLabel, profit, profitColor,
    hourlyData, planLine, maxBar, barW, expenseItems, isLoading,
  } = usePointDetail(pointId);
  const period = useDashboardStore(s => s.period);
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? 'Сегодня';

  const maxExpense = expenseItems.length > 0 ? expenseItems[0].amount : 0;

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

      {/* Расходы · 1С */}
      <View style={styles.expCard}>
        <Text style={styles.expTitle}>Расходы · 1С</Text>
        {expenseItems.map((item, i) => (
          <View key={i} style={styles.expRow}>
            <Text style={styles.expLabel}>{item.label}</Text>
            <View style={styles.expBarBg}>
              <View style={[styles.expBarFill, { width: expenseBarPct(item.amount, maxExpense) }]} />
            </View>
            <Text style={styles.expAmount}>-₸{item.amount.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
