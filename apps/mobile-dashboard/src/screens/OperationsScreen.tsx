import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useOperations } from '../hooks/useApi';
import { PeriodSelector } from '../components/PeriodSelector';
import { colors } from '../theme';
import { styles } from './OperationsScreen.styles';
import type { OperationDto } from '../types';

interface Props {
  articleId: string | null;
  restaurantId: string | null;
  onBack: () => void;
}

function fmtAmount(value: number): string {
  if (Math.abs(value) >= 1000000) return `\u20B8${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `\u20B8${Math.round(value / 1000)}K`;
  return `\u20B8${value.toFixed(0)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month} ${hours}:${mins}`;
}

export function OperationsScreen({ articleId, restaurantId, onBack }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useOperations(
    articleId || '',
    restaurantId || '',
    page,
  );

  const operations = data?.operations ?? [];
  const total = data?.total ?? 0;
  const hasMore = operations.length < total;

  const handleRefresh = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  if (!articleId || !restaurantId || (isLoading && page === 1)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backBtn}>\u2039</Text>
          </TouchableOpacity>
          <Text style={styles.title}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const renderOperation = (op: OperationDto) => {
    const isIiko = op.source === 'IIKO';
    return (
      <View key={op.id} style={styles.opRow}>
        <View style={styles.opHeader}>
          <Text style={styles.opDate}>{fmtDate(op.date)}</Text>
          <Text style={styles.opAmount}>{fmtAmount(op.amount)}</Text>
        </View>
        {op.comment && (
          <Text style={styles.opComment}>{op.comment}</Text>
        )}
        <View style={styles.opFooter}>
          <View
            style={[
              styles.sourceBadge,
              isIiko ? styles.sourceBadgeIiko : styles.sourceBadge1C,
            ]}
          >
            <Text
              style={[
                styles.sourceText,
                { color: isIiko ? '#10B981' : '#6366F1' },
              ]}
            >
              {isIiko ? 'iiko' : '1\u0421'}
            </Text>
          </View>
          {op.allocationCoefficient != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.coeffLabel}>\u041a\u043e\u044d\u0444\u0444: </Text>
              <Text style={styles.coeffValue}>
                {(op.allocationCoefficient * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>\u2039</Text>
        </TouchableOpacity>
        <Text style={styles.title}>\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u0438</Text>
      </View>

      <PeriodSelector marginTop={12} />

      <View style={styles.card}>
        <Text style={styles.totalLabel}>
          \u0412\u0441\u0435\u0433\u043e \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0439: {total}
        </Text>

        {operations.length === 0 ? (
          <Text style={styles.emptyText}>
            \u041d\u0435\u0442 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0439 \u0437\u0430
            \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439
            \u043f\u0435\u0440\u0438\u043e\u0434
          </Text>
        ) : (
          operations.map(renderOperation)
        )}

        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={handleLoadMore}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.loadMoreText}>
                \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c
                \u0435\u0449\u0451
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
