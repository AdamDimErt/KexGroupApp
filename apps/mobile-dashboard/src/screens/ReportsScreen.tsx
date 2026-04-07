import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { PeriodSelector } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuthStore } from '../store/auth';
import { useReportDds, useReportCompanyExpenses, useReportKitchen, useReportTrends } from '../hooks/useReports';
import { colors } from '../theme';
import { styles } from './ReportsScreen.styles';

function fmtAmount(value: number): string {
  if (Math.abs(value) >= 1000000) return `₸${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `₸${Math.round(value / 1000)}K`;
  return `₸${value.toFixed(0)}`;
}

export function ReportsScreen() {
  const role = useAuthStore(s => s.user?.role);
  const canSeeDds = role === 'OWNER' || role === 'FINANCE_DIRECTOR';
  const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR';

  // Each section fetches independently
  const dds = useReportDds();
  const company = useReportCompanyExpenses();
  const kitchen = useReportKitchen();
  const trends = useReportTrends();

  // Aggregate offline state
  const isAnyOffline = dds.isOffline || company.isOffline || kitchen.isOffline || trends.isOffline;
  const isAnyStale = dds.isStale || company.isStale || kitchen.isStale || trends.isStale;
  const cachedAtValues = [dds.cachedAt, company.cachedAt, kitchen.cachedAt, trends.cachedAt].filter(
    (v): v is number => v !== null,
  );
  const earliestCache = cachedAtValues.length > 0 ? Math.min(...cachedAtValues) : null;

  const refetchAll = () => {
    dds.refetch();
    company.refetch();
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

        {/* DDS Summary — OWNER + FIN_DIR only */}
        {canSeeDds && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>ДДС сводный</Text>
            {dds.isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : dds.error ? (
              <Text style={styles.reportError}>{dds.error}</Text>
            ) : (
              <>
                <Text style={styles.reportTotal}>Итого: {fmtAmount(dds.data?.grandTotal ?? 0)}</Text>
                {(dds.data?.groups ?? []).map(group => (
                  <View key={group.groupId} style={styles.reportRow}>
                    <Text style={styles.reportLabel}>{group.groupName}</Text>
                    <Text style={styles.reportValue}>{fmtAmount(group.totalAmount)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Company Expenses — OWNER + FIN_DIR only */}
        {canSeeCompany && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Затраты компании</Text>
            {company.isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : company.error ? (
              <Text style={styles.reportError}>{company.error}</Text>
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

        {/* Kitchen — all roles */}
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

        {/* Trends — all roles */}
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Тренды</Text>
          {trends.isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : trends.error ? (
            <Text style={styles.reportError}>{trends.error}</Text>
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
