import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  Wallet,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react-native';
import { kpiSemantics, getKpiBalanceSemantics } from '../theme';
import { kpiStyles as S } from './KPICard.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KPIKind = 'revenue' | 'expenses' | 'balance';
export type KPICardState = 'default' | 'loading' | 'empty' | 'error';

export interface KPICardProps {
  kind: KPIKind;
  label: string;
  value: number | null;
  deltaPct: number | null;
  periodLabel: string;
  cardState?: KPICardState;
  onPress?: () => void;
  onRetry?: () => void;
  headerIcon?: LucideIcon;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKpiValue(value: number | null): string {
  if (value === null) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₸${(abs / 1_000_000).toFixed(2)}М`;
  if (abs >= 1_000) return `${sign}₸${(abs / 1_000).toFixed(0)}К`;
  return `${sign}₸${abs}`;
}

function formatDelta(v: number | null): string {
  if (v === null) return '';
  const sign = v > 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(1)}%`;
}

const defaultIconMap: Record<KPIKind, LucideIcon> = {
  revenue:  TrendingUp,
  expenses: ArrowDownUp,
  balance:  Wallet,
};

// ─── KPICard ──────────────────────────────────────────────────────────────────

export function KPICard({
  kind,
  label,
  value,
  deltaPct,
  periodLabel,
  cardState = 'default',
  onPress,
  onRetry,
  headerIcon,
}: KPICardProps) {

  // Semantic token resolution
  let borderLeftColor: string;
  let borderLeftWidth: number;
  let labelColor: string;
  let valueColor = '#F8FAFC';
  let HeaderIcon: LucideIcon;

  if (kind === 'revenue') {
    borderLeftColor = kpiSemantics.revenue.borderLeftColor;
    borderLeftWidth = kpiSemantics.revenue.borderLeftWidth;
    labelColor      = kpiSemantics.revenue.labelColor;
    HeaderIcon      = headerIcon ?? TrendingUp;
  } else if (kind === 'expenses') {
    borderLeftColor = kpiSemantics.expenses.borderLeftColor;
    borderLeftWidth = kpiSemantics.expenses.borderLeftWidth;
    labelColor      = kpiSemantics.expenses.labelColor;
    HeaderIcon      = headerIcon ?? ArrowDownUp;
  } else {
    // balance — conditional
    const bal = (value !== null && cardState === 'default')
      ? getKpiBalanceSemantics(value)
      : kpiSemantics.balance.positive; // default while loading/empty
    borderLeftColor = bal.borderLeftColor;
    borderLeftWidth = bal.borderLeftWidth;
    labelColor      = bal.labelColor;
    valueColor      = (value !== null && value < 0) ? '#EF4444' : '#F8FAFC';
    HeaderIcon      = headerIcon ?? (value !== null && value < 0 ? TrendingDown : Wallet);
  }

  // Empty state — drop semantic border
  if (cardState === 'empty') {
    borderLeftColor = '#1E293B';
  }

  // Loading skeleton
  if (cardState === 'loading') {
    return (
      <View style={[S.card, { borderLeftColor, borderLeftWidth }]}>
        <View style={S.headerRow}>
          <View style={[S.skBlock, { width: 80, height: 11 }]} />
          <View style={[S.skBlock, { width: 14, height: 14, borderRadius: 3 }]} />
        </View>
        <View style={[S.skBlock, S.skValue, { width: '70%' }]} />
        <View style={[S.skBlock, S.skDelta]} />
        <View style={[S.skBlock, S.skPeriod]} />
      </View>
    );
  }

  // Error state
  if (cardState === 'error') {
    return (
      <View style={[S.card, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
        <View style={S.errorBody}>
          <View style={S.errorRow}>
            <AlertTriangle size={14} strokeWidth={1.75} color="#EF4444" />
            <Text style={S.errorMsg}>Ошибка загрузки</Text>
          </View>
          <Text style={S.errorDetail}>Данные не загружены</Text>
          {onRetry && (
            <TouchableOpacity style={S.retryBtn} onPress={onRetry}>
              <Text style={S.retryText}>Повторить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Empty state
  if (cardState === 'empty') {
    return (
      <View style={[S.card, { borderLeftColor: '#1E293B', borderLeftWidth: 4 }]}>
        <View style={S.headerRow}>
          <Text style={[S.label, { color: '#64748B' }]}>{label}</Text>
        </View>
        <Text style={[S.value, S.emptyValue]}>—</Text>
        <Text style={S.noDataText}>Нет данных</Text>
        <Text style={S.period}>{periodLabel}</Text>
      </View>
    );
  }

  // Default state
  const delta = deltaPct;
  const deltaColor = delta === null ? '#64748B' : delta > 0 ? '#22C55E' : delta < 0 ? '#EF4444' : '#64748B';
  const DeltaIcon  = delta !== null && delta > 0 ? TrendingUp : delta !== null && delta < 0 ? TrendingDown : null;

  const CardWrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.85 } : {};

  return (
    <CardWrapper
      {...(wrapperProps as any)}
      style={[S.card, { borderLeftColor, borderLeftWidth }]}
    >
      {/* Header */}
      <View style={S.headerRow}>
        <Text style={[S.label, { color: labelColor }]}>{label}</Text>
        <HeaderIcon size={14} strokeWidth={1.75} color={labelColor} style={{ opacity: 0.7 }} />
      </View>

      {/* Value */}
      <Text style={[S.value, { color: valueColor }]}>
        {formatKpiValue(value)}
      </Text>

      {/* Delta */}
      {delta !== null && (
        <View style={S.deltaRow}>
          {DeltaIcon && <DeltaIcon size={12} strokeWidth={2} color={deltaColor} />}
          <Text style={[S.deltaPct, { color: deltaColor }]}>{formatDelta(delta)}</Text>
          <Text style={S.deltaVs}>vs прошлый период</Text>
        </View>
      )}

      {/* Period */}
      <Text style={S.period}>{periodLabel}</Text>
    </CardWrapper>
  );
}
