import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Award, Trophy } from 'lucide-react-native';
import { PeriodSelector } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuthStore } from '../store/auth';
import { useReportDds, useReportCompanyExpenses, useReportKitchen, useReportTrends } from '../hooks/useReports';
import { useRestaurantList } from '../hooks/useRestaurantList';
import { colors } from '../theme';
import { styles } from './ReportsScreen.styles';

// DDS expense group color map — same palette as PointDetailScreen
// DDS group colors — Lucide SVG icons used in PointDetailScreen; here we use color indicators only
const GROUP_COLORS: Record<string, string> = {
  'Продукты питания': '#10B981',
  'Аренда помещений': '#6366F1',
  'Заработная плата': '#F59E0B',
  'Коммунальные услуги': '#06B6D4',
  'Маркетинг и реклама': '#EC4899',
  'IT и связь': '#8B5CF6',
  'Транспорт и доставка': '#F97316',
  'Оборудование и ремонт': '#64748B',
  'Налоги и сборы': '#EF4444',
  'Прочие расходы': '#94A3B8',
  'Комиссии банков': '#3B82F6',
  'Цех (производство)': '#14B8A6',
};

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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedTrendIdx, setSelectedTrendIdx] = useState<number | null>(null);

  const canSeeDds = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
  const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';

  // Only fetch role-gated reports when the user has permission
  const dds = useReportDds(canSeeDds);
  const company = useReportCompanyExpenses(canSeeCompany);
  const kitchen = useReportKitchen();
  const trends = useReportTrends();
  const { filtered: allRestaurants } = useRestaurantList();

  // Top 3 restaurants by revenue
  const topRestaurants = [...allRestaurants]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // Aggregate offline state (only from sections actually being fetched)
  const activeSections = [kitchen, trends, ...(canSeeDds ? [dds] : []), ...(canSeeCompany ? [company] : [])];
  const isAnyOffline = activeSections.some(s => s.isOffline);
  const isAnyStale = activeSections.some(s => s.isStale);
  const cachedAtValues = activeSections.map(s => s.cachedAt).filter((v): v is number => v !== null);
  const earliestCache = cachedAtValues.length > 0 ? Math.min(...cachedAtValues) : null;

  const refetchAll = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (canSeeDds) dds.refetch();
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

        {/* DDS Summary -- OWNER + FINANCE_DIRECTOR only */}
        {canSeeDds && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>ДДС сводный</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: -6, marginBottom: 12 }}>по всем точкам</Text>
            {dds.isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : dds.error ? (
              <Text style={styles.reportError}>{dds.error}</Text>
            ) : (dds.data?.groups ?? []).length === 0 ? (
              <EmptyState message="Нет данных за выбранный период" />
            ) : (
              <>
                {/* Grand total */}
                <View style={{ marginBottom: 16, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Общий итог</Text>
                  <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 4 }}>{fmtAmount(dds.data?.grandTotal ?? 0)}</Text>
                </View>
                {/* Group rows — sorted by totalAmount desc */}
                {[...(dds.data?.groups ?? [])].sort((a, b) => b.totalAmount - a.totalAmount).map(group => {
                  const groupColor = GROUP_COLORS[group.groupName] ?? '#94A3B8';
                  const pct = (dds.data?.grandTotal ?? 0) > 0
                    ? ((group.totalAmount / (dds.data!.grandTotal)) * 100).toFixed(1)
                    : '0.0';
                  const isExpanded = expandedGroup === group.groupId;
                  const sortedRestaurants = [...(group.restaurants ?? [])].sort((a, b) => b.amount - a.amount);
                  const groupTotal = group.totalAmount > 0 ? group.totalAmount : 1;
                  return (
                    <View key={group.groupId}>
                      <TouchableOpacity
                        onPress={() => setExpandedGroup(isExpanded ? null : group.groupId)}
                        activeOpacity={0.7}
                        style={[styles.ddsGroupRow, { borderLeftColor: groupColor }]}
                      >
                        <Text style={[styles.reportLabel, { fontWeight: '600' }]}>{group.groupName}</Text>
                        <Text style={styles.ddsPct}>{pct}%</Text>
                        <Text style={styles.reportValue}>{fmtAmount(group.totalAmount)}</Text>
                        <Text style={styles.ddsChevron}>{isExpanded ? '▾' : '▸'}</Text>
                      </TouchableOpacity>
                      {isExpanded && sortedRestaurants.map(restaurant => {
                        const restPct = (restaurant.amount / groupTotal) * 100;
                        return (
                          <View key={restaurant.restaurantId} style={styles.ddsRestaurantRow}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, flex: 1 }} numberOfLines={1}>
                              {restaurant.restaurantName}
                            </Text>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' }}>
                                {fmtAmount(restaurant.amount)}
                              </Text>
                              <View style={{ width: 60, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1, marginTop: 3 }}>
                                <View style={{ width: `${Math.round(restPct)}%` as `${number}%`, height: '100%', backgroundColor: groupColor, borderRadius: 1 }} />
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

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
