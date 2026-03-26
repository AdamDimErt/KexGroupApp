import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useReports, PERIODS } from '../hooks/useReports';
import { planColor } from '../utils/calculations';
import { styles } from './ReportsScreen.styles';
import type { Period } from '../types';

export function ReportsScreen() {
  const { period, setPeriod, periodLabels, kpi, barData, ranking, maxFact } = useReports();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Аналитика</Text>

        {/* Period pills */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodPill, period === p && styles.periodPillActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {periodLabels[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        {/* KPI Cards — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow}>
          {/* Card 1 — gradient */}
          <View style={[styles.kpiCard, styles.kpiCardGradient]}>
            <Text style={styles.kpiLabelWhite}>ВЫРУЧКА</Text>
            <Text style={styles.kpiValueWhite}>{kpi.revenue}</Text>
            <Text style={styles.kpiChangeGreen}>↑ {kpi.revChg}</Text>
            <Text style={styles.kpiSource}>iiko + 1С</Text>
          </View>

          {/* Card 2 */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>РАСХОДЫ</Text>
            <Text style={styles.kpiValue}>{kpi.expenses}</Text>
            <Text style={styles.kpiChange}>↑ {kpi.expChg}</Text>
            <Text style={styles.kpiSourceDim}>iiko + 1С</Text>
          </View>

          {/* Card 3 */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ПРИБЫЛЬ</Text>
            <Text style={styles.kpiValue}>{kpi.profit}</Text>
            <Text style={styles.kpiChangeGreen}>↑ {kpi.profChg}</Text>
            <Text style={styles.kpiSourceDim}>iiko + 1С</Text>
          </View>
        </ScrollView>

        {/* Bar Chart: Факт vs План */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Факт vs План</Text>
          {barData.map((d, i) => (
            <View key={i} style={styles.chartRow}>
              <Text style={styles.chartLabel}>{d.name}</Text>
              <View style={styles.chartBarsWrap}>
                <View style={[styles.chartBarFact, { width: `${(d.fact / maxFact) * 100}%` }]} />
                <View style={[styles.chartBarPlan, { width: `${(d.plan / maxFact) * 100}%` }]} />
              </View>
            </View>
          ))}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Факт</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(59,130,246,0.4)' }]} />
              <Text style={styles.legendText}>План</Text>
            </View>
          </View>
        </View>

        {/* Restaurant Ranking */}
        <View style={styles.rankCard}>
          <Text style={styles.rankTitle}>Рейтинг · Выручка</Text>
          {ranking.map((r, idx) => (
            <View key={r.name} style={[styles.rankRow, idx < ranking.length - 1 && styles.rankRowBorder]}>
              <View style={styles.rankCircle}>
                <Text style={styles.rankNum}>{idx + 1}</Text>
              </View>
              <Text style={styles.rankName}>{r.name}</Text>
              <Text style={styles.rankRevenue}>{r.revenue}</Text>
              <Text style={[styles.rankPct, { color: planColor(r.planPct) }]}>
                {r.planPct}%
              </Text>
            </View>
          ))}
        </View>

        {/* Export buttons */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
            <Text style={styles.exportText}>📤 Отправить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
            <Text style={styles.exportText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
