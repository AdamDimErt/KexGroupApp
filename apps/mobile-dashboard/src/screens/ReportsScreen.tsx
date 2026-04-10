import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Award, Trophy } from 'lucide-react-native';
import { PeriodSelector } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuthStore } from '../store/auth';
import { useReportCompanyExpenses, useReportKitchen, useReportTrends } from '../hooks/useReports';
import { useRestaurantList } from '../hooks/useRestaurantList';
import { colors } from '../theme';
import { styles } from './ReportsScreen.styles';

function fmtAmount(value: number): string {
  if (Math.abs(value) >= 1000000) return `₸${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `₸${Math.round(value / 1000)}K`;
  return `₸${value.toFixed(0)}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <Text style={styles.reportEmpty}>{message}</Text>
  );
}

export function ReportsScreen() {
  const role = useAuthStore(s => s.user?.role);
  const [selectedTrendIdx, setSelectedTrendIdx] = useState<number | null>(null);

  const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';

  // Only fetch role-gated reports when the user has permission
  const company = useReportCompanyExpenses(canSeeCompany);
  const kitchen = useReportKitchen();
  const trends = useReportTrends();
  const { filtered: allRestaurants } = useRestaurantList();

  // Top 3 restaurants by revenue
  const topRestaurants = [...allRestaurants]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // Aggregate offline state (only from sections actually being fetched)
  const activeSections = [kitchen, trends, ...(canSeeCompany ? [company] : [])];
  const isAnyOffline = activeSections.some(s => s.isOffline);
  const isAnyStale = activeSections.some(s => s.isStale);
  const cachedAtValues = activeSections.map(s => s.cachedAt).filter((v): v is number => v !== null);
  const earliestCache = cachedAtValues.length > 0 ? Math.min(...cachedAtValues) : null;

  const refetchAll = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (canSeeCompany) company.refetch();
    kitchen.refetch();
    trends.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <OfflineBanner isOffline={isAnyOffline} isStale={isAnyStale} cachedAt={earliestCache} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAll} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Аналитика</Text>
        </View>

        <PeriodSelector marginTop={12} />

        {/* Company Expenses -- OWNER + FINANCE_DIRECTOR only */}
        {canSeeCompany && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Затраты компании</Text>
            {company.isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : company.error ? (
              <Text style={styles.reportError}>{company.error}</Text>
            ) : (company.data?.items ?? []).length === 0 ? (
              <EmptyState message="Нет данных за выбранный период" />
            ) : (
              <>
                <Text style={styles.reportTotal}>Итого: {fmtAmount(company.data?.grandTotal ?? 0)}</Text>
                {(company.data?.items ?? []).map(item => (
                  <View key={item.articleId} style={styles.reportRow}>
                    <Text style={styles.reportLabel}>{item.articleName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.reportValue}>{fmtAmount(item.amount)}</Text>
                      <Text style={styles.reportBadge}>{item.source === 'IIKO' ? 'iiko' : '1С'}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Kitchen -- all roles */}
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Цех</Text>
          {kitchen.isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : kitchen.error ? (
            <Text style={styles.reportError}>{kitchen.error}</Text>
          ) : (
            <>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Закупки</Text>
                <Text style={styles.reportValue}>{fmtAmount(kitchen.data?.totalPurchases ?? 0)}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Отгрузки</Text>
                <Text style={styles.reportValue}>{fmtAmount(kitchen.data?.totalShipments ?? 0)}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Доход</Text>
                <Text style={[styles.reportValue, { color: '#10B981' }]}>
                  {fmtAmount(kitchen.data?.totalIncome ?? 0)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Trends -- all roles */}
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Тренды</Text>
          {trends.isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : trends.error ? (
            <Text style={styles.reportError}>{trends.error}</Text>
          ) : (trends.data?.points ?? []).length === 0 && !trends.data?.avgRevenue && !trends.data?.avgExpenses ? (
            <EmptyState message="Недостаточно данных для отображения трендов" />
          ) : (
            <>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Ср. выручка/день</Text>
                <Text style={styles.reportValue}>{fmtAmount(trends.data?.avgRevenue ?? 0)}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Ср. расходы/день</Text>
                <Text style={styles.reportValue}>{fmtAmount(trends.data?.avgExpenses ?? 0)}</Text>
              </View>
              {/* Interactive bar chart — all days in period, horizontal scroll, clickable */}
              {(trends.data?.points ?? []).length > 0 && (() => {
                const pts = trends.data!.points;
                const maxRev = Math.max(...pts.map(p => p.revenue), 1);
                const avgRev = pts.reduce((s, p) => s + p.revenue, 0) / (pts.length || 1);
                const avgLineY = 80 - (avgRev / maxRev) * 80;
                const barW = pts.length > 20 ? 24 : pts.length > 10 ? 32 : 40;
                const selected = selectedTrendIdx !== null ? pts[selectedTrendIdx] : null;

                return (
                  <View style={{ marginTop: 12 }}>
                    {/* Tooltip */}
                    {selected && (
                      <View style={{ backgroundColor: 'rgba(30,41,59,0.95)', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.accent + '40' }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                          {new Date(selected.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ color: colors.accent, fontSize: 13 }}>Выручка: {fmtAmount(selected.revenue)}</Text>
                          {selected.expenses > 0 && <Text style={{ color: '#EF4444', fontSize: 13 }}>Расходы: {fmtAmount(selected.expenses)}</Text>}
                        </View>
                        {avgRev > 0 && (
                          <Text style={{ color: selected.revenue >= avgRev ? '#10B981' : '#F59E0B', fontSize: 11, marginTop: 2 }}>
                            {selected.revenue >= avgRev ? '↑' : '↓'} {Math.abs(Math.round(((selected.revenue - avgRev) / avgRev) * 100))}% от среднего
                          </Text>
                        )}
                      </View>
                    )}
                    {/* Scrollable chart */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, paddingTop: 20 }}>
                        {pts.map((pt, i) => {
                          const h = Math.max((pt.revenue / maxRev) * 80, 3);
                          const isSelected = selectedTrendIdx === i;
                          const day = new Date(pt.date).getDate();
                          return (
                            <TouchableOpacity
                              key={i}
                              activeOpacity={0.7}
                              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTrendIdx(isSelected ? null : i); }}
                              style={{ alignItems: 'center', width: barW, marginHorizontal: 1 }}
                            >
                              <View style={{
                                width: barW - 6,
                                height: h,
                                backgroundColor: isSelected ? colors.accentLight : colors.accent,
                                borderRadius: 4,
                                opacity: isSelected ? 1 : 0.65,
                              }} />
                              <Text style={{ fontSize: 9, color: isSelected ? colors.accentLight : 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: isSelected ? '700' : '400' }}>
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                    {/* Avg line label */}
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textAlign: 'right', marginTop: 4 }}>
                      Среднее: {fmtAmount(avgRev)}/день
                    </Text>
                  </View>
                );
              })()}

              {/* Top restaurants ranking */}
              {topRestaurants.length > 0 && (
                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Trophy size={16} color={colors.accent} />
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginLeft: 8 }}>Лучшие точки</Text>
                  </View>
                  {topRestaurants.map((r, i) => {
                    const medals = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze
                    const medalColor = medals[i] ?? colors.textTertiary;
                    const maxTopRev = topRestaurants[0]?.revenue || 1;
                    const barPct = (r.revenue / maxTopRev) * 100;
                    return (
                      <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: medalColor, fontSize: 16, fontWeight: '700', width: 24 }}>{i + 1}</Text>
                        <View style={{ flex: 1, marginLeft: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{r.name}</Text>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{fmtAmount(r.revenue)}</Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                            <View style={{ height: 4, width: `${barPct}%` as any, backgroundColor: medalColor, borderRadius: 2, opacity: 0.7 }} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
