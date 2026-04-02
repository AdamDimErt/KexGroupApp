import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, type DimensionValue } from 'react-native';
import { usePointDetail } from '../hooks/usePointDetail';
import type { PaymentBreakdown } from '../hooks/usePointDetail';
import { styles } from './PointDetailScreen.styles';

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

const PAYMENT_TYPES: { key: keyof PaymentBreakdown; label: string; color: string }[] = [
  { key: 'cash', label: 'Наличные', color: '#10B981' },
  { key: 'kaspi', label: 'Kaspi', color: '#F59E0B' },
  { key: 'halyk', label: 'Halyk', color: '#3B82F6' },
  { key: 'yandex', label: 'Yandex', color: '#EF4444' },
  { key: 'other', label: 'Другое', color: '#8B5CF6' },
];

// ─── Компонент (только разметка + стили) ──────────────────────────────────

export function PointDetailScreen({ pointId, onBack }: Props) {
  const {
    restaurant: r, statusColor: col, statusLabel, profit, profitColor,
    hourlyData, planLine, maxBar, barW, expenseItems, isLoading,
  } = usePointDetail(pointId);

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
      {r.paymentBreakdown && r.revenue > 0 && (() => {
        const pb = r.paymentBreakdown;
        const maxPb = Math.max(pb.cash, pb.kaspi, pb.halyk, pb.yandex, pb.other, 1);
        return (
          <View style={styles.expCard}>
            <Text style={styles.expTitle}>Выручка по типам оплат</Text>
            {PAYMENT_TYPES.map(pt => {
              const val = pb[pt.key];
              if (val <= 0) return null;
              const pct = r.revenue > 0 ? Math.round((val / r.revenue) * 100) : 0;
              return (
                <View key={pt.key} style={styles.expRow}>
                  <Text style={[styles.expLabel, { width: 80 }]}>{pt.label}</Text>
                  <View style={styles.expBarBg}>
                    <View style={[styles.expBarFill, { width: expenseBarPct(val, maxPb), backgroundColor: pt.color }]} />
                  </View>
                  <Text style={[styles.expAmount, { color: pt.color }]}>{fmtAmount(val)} ({pct}%)</Text>
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
          <Text style={styles.chartSub}>Сегодня</Text>
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
