import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PeriodSelector } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuthStore } from '../store/auth';
import { useReportDds, useReportCompanyExpenses, useReportKitchen, useReportTrends } from '../hooks/useReports';
import { colors } from '../theme';
import { styles } from './ReportsScreen.styles';

// DDS expense group color map — same palette as PointDetailScreen
// NOTE: User requested emoji icons for visual distinction ("красиво") — emoji allowed here
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

  const canSeeDds = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
  const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';

  // Only fetch role-gated reports when the user has permission
  const dds = useReportDds(canSeeDds);
  const company = useReportCompanyExpenses(canSeeCompany);
  const kitchen = useReportKitchen();
  const trends = useReportTrends();

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
              {/* Simple bar chart for trend points */}
              {(trends.data?.points ?? []).length > 0 && (() => {
                const pts = trends.data!.points;
                const maxRev = Math.max(...pts.map(p => p.revenue), 1);
                return (
                  <View style={styles.trendChart}>
                    {pts.slice(-14).map((pt, i) => (
                      <View key={i} style={styles.trendBar}>
                        <View style={[styles.trendBarFill, { height: Math.max((pt.revenue / maxRev) * 60, 2) }]} />
                        <Text style={styles.trendBarLabel}>
                          {new Date(pt.date).getDate()}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
