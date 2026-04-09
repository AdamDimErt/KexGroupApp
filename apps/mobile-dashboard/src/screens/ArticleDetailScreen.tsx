import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { useArticleDetail } from '../hooks/useApi';
import { PeriodSelector } from '../components/PeriodSelector';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuthStore } from '../store/auth';
import { colors } from '../theme';
import { styles } from './ArticleDetailScreen.styles';
import type { ArticleIndicatorDto } from '../types';

interface Props {
  groupId: string | null;
  restaurantId: string | null;
  onBack: () => void;
  onNavigateOperation: (articleId: string) => void;
}

function fmtAmount(value: number): string {
  if (Math.abs(value) >= 1000000) return `\u20B8${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `\u20B8${Math.round(value / 1000)}K`;
  return `\u20B8${value.toFixed(0)}`;
}

export function ArticleDetailScreen({
  groupId,
  restaurantId,
  onBack,
  onNavigateOperation,
}: Props) {
  const { data, isLoading, refetch, isStale, isOffline, cachedAt } = useArticleDetail(
    groupId || '',
    restaurantId || '',
  );
  const role = useAuthStore(s => s.user?.role);
  const canDrillToLevel4 = role === 'OWNER' || role === 'ADMIN';

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  if (!groupId || !restaurantId || isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backBtn}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{'Loading...'}</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const articles = data?.articles ?? [];

  const renderArticle = (article: ArticleIndicatorDto) => {
    const isIiko = article.source === 'IIKO';
    const changeColor =
      article.changePercent >= 0 ? styles.changePositive : styles.changeNegative;
    const changeSign = article.changePercent >= 0 ? '+' : '';

    const row = (
      <View style={styles.articleRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.articleName} numberOfLines={1}>
              {article.name}
            </Text>
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
                {isIiko ? 'iiko' : '1C'}
              </Text>
            </View>
            {article.allocationType === 'DISTRIBUTED' && (
              <Text style={styles.allocBadge}>{'\u0440\u0430\u0441\u043F.'}</Text>
            )}
          </View>
          <Text style={changeColor}>
            {changeSign}
            {article.changePercent.toFixed(1)}%{' '}
            {'\u043A \u043F\u0440\u0435\u0434. \u043F\u0435\u0440\u0438\u043E\u0434\u0443'}
          </Text>
        </View>
        <Text style={styles.articleAmount}>{fmtAmount(article.amount)}</Text>
        <Text style={styles.articleShare}>
          {article.sharePercent.toFixed(1)}%
        </Text>
        {canDrillToLevel4 && <ChevronRight size={16} color="rgba(255,255,255,0.3)" />}
      </View>
    );

    if (canDrillToLevel4) {
      return (
        <TouchableOpacity
          key={article.id}
          onPress={() => onNavigateOperation(article.id)}
          activeOpacity={0.7}
        >
          {row}
        </TouchableOpacity>
      );
    }
    return <View key={article.id}>{row}</View>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <OfflineBanner isOffline={isOffline} isStale={isStale} cachedAt={cachedAt} />
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
          <Text style={styles.backBtn}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {data?.groupName ?? '\u0421\u0442\u0430\u0442\u044C\u0438'}
        </Text>
      </View>

      <PeriodSelector marginTop={12} />

      <View style={styles.card}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text style={styles.groupTotal}>
            {'\u0418\u0442\u043E\u0433\u043E'}: {fmtAmount(data?.totalAmount ?? 0)}
          </Text>
          <Text style={styles.groupTotal}>{data?.restaurantName}</Text>
        </View>

        {articles.length === 0 ? (
          <Text style={styles.emptyText}>
            {'\u041D\u0435\u0442 \u0441\u0442\u0430\u0442\u0435\u0439 \u0437\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434'}
          </Text>
        ) : (
          articles.map(renderArticle)
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
    </View>
  );
}
