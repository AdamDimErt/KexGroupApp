import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme';
import { statusColor, type Status } from '../data/restaurants';
import { styles } from './RestaurantCard.styles';

interface Props {
  name: string;
  city: string;
  type: string;
  revenue: number;
  transactions: number;
  dev: number;
  status: Status;
  planPct: number;
  onPress: () => void;
}

// ─── Логика вычислений (отделена от JSX) ──────────────────────────────────

function getCardColors(status: Status, dev: number) {
  const col = statusColor[status];
  const isRed = status === 'red';
  const devBg = dev >= 0 ? colors.greenBg : (isRed ? colors.redBg : colors.yellowBg);
  const devColor = dev >= 0 ? colors.green : (isRed ? colors.red : colors.yellow);
  return { col, isRed, devBg, devColor };
}

function formatRevenue(revenue: number): string {
  return `₸${(revenue / 1000000).toFixed(2)}M`;
}

function formatDev(dev: number): string {
  return `${dev > 0 ? '+' : ''}${dev}%`;
}

function calcMarginPct(revenue: number): number {
  if (revenue === 0) return 0;
  return Math.round((revenue - (revenue * 0.65)) / revenue * 100);
}

// ─── Компонент (только разметка + стили) ──────────────────────────────────

export function RestaurantCard({ name, city, revenue, transactions, dev, status, planPct, onPress }: Props) {
  const { col, isRed, devBg, devColor } = getCardColors(status, dev);

  return (
    <TouchableOpacity style={[styles.card, isRed && styles.cardRed]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: col }]} />
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{city} · {transactions} чеков</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.revenue}>{formatRevenue(revenue)}</Text>
          <View style={[styles.devBadge, { backgroundColor: devBg }]}>
            <Text style={[styles.devText, { color: devColor }]}>{formatDev(dev)}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${planPct}%`, backgroundColor: col }]} />
      </View>

      <Text style={styles.margin}>Маржа: {calcMarginPct(revenue)}%</Text>
    </TouchableOpacity>
  );
}
