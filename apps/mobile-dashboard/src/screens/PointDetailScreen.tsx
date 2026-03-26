import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, type DimensionValue } from 'react-native';
import { usePointDetail } from '../hooks/usePointDetail';
import { styles } from './PointDetailScreen.styles';

interface Props {
  pointId: string | null;
  onBack: () => void;
}

// ─── Форматирование (отделено от JSX) ─────────────────────────────────────

function fmtK(value: number): string {
  return `₸${Math.round(value / 1000)}k`;
}

function expenseBarPct(amount: number, maxAmount: number): DimensionValue {
  if (maxAmount === 0) return '0%';
  return `${(amount / maxAmount) * 100}%` as DimensionValue;
}

// ─── Компонент (только разметка + стили) ──────────────────────────────────

export function PointDetailScreen({ pointId, onBack }: Props) {
  const {
    restaurant: r, statusColor: col, statusLabel, profit, profitColor,
    hourlyData, planLine, maxBar, barW, expenseItems,
  } = usePointDetail(pointId);

  const maxExpense = expenseItems.length > 0 ? expenseItems[0].amount : 0;

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

      {/* График выручки по часам */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Выручка по часам</Text>
          <Text style={styles.chartSub}>Сегодня</Text>
        </View>

        <View style={styles.chartArea}>
          <View style={[styles.planLine, { bottom: (planLine / maxBar) * 120 }]}>
            <Text style={styles.planText}>план</Text>
          </View>
          <View style={styles.barsRow}>
            {hourlyData.map((d, i) => (
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
