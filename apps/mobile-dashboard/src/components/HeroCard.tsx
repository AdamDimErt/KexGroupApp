import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronRight,
  AlertTriangle,
  Calendar,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react-native';
import { heroStyles as S } from './HeroCard.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HeroVariant  = 'primary' | 'positive' | 'danger';
export type HeroCardState = 'default' | 'loading' | 'empty' | 'error';

export interface HeroCardProps {
  variant?: HeroVariant;
  label: string;
  periodLabel: string;
  value: number | null;
  formattedValue?: string;
  deltaPct?: number;
  profit?: { label: string; value: number | string; deltaPct?: number };
  expenses?: { label: string; value: number | string };
  sources?: ('iiko' | '1C')[];
  lastSyncText?: string;
  cardState?: HeroCardState;
  onPress?: () => void;
  onEmptyCTA?: () => void;
  onRetry?: () => void;
  headerIcon?: LucideIcon;
}

// ─── Variant tokens ───────────────────────────────────────────────────────────

const variantMap = {
  primary:  { borderLeft: '#2563EB', kpiColor: '#F8FAFC', dotColor: '#22C55E', pulse: true },
  positive: { borderLeft: '#22C55E', kpiColor: '#22C55E', dotColor: '#22C55E', pulse: true },
  danger:   { borderLeft: '#EF4444', kpiColor: '#EF4444', dotColor: '#EF4444', pulse: false },
} as const;

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ color, enabled }: { color: string; enabled: boolean }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!enabled) return;
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 1.5, duration: 900, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [enabled, scale, opacity]);

  return (
    <Animated.View
      style={[
        S.syncDot,
        { backgroundColor: color },
        enabled && { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatValue(value: number | null, formatted?: string): string {
  if (formatted) return formatted;
  if (value === null) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₸${(abs / 1_000_000).toFixed(2)}М`;
  if (abs >= 1_000) return `${sign}₸${(abs / 1_000).toFixed(0)}К`;
  return `${sign}₸${abs}`;
}

function formatPct(v: number): string {
  return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroCard({
  variant = 'primary',
  label,
  periodLabel,
  value,
  formattedValue,
  deltaPct,
  profit,
  expenses,
  sources = ['iiko'],
  lastSyncText,
  cardState = 'default',
  onPress,
  onEmptyCTA,
  onRetry,
  headerIcon: HeaderIcon,
}: HeroCardProps) {

  const vt = variantMap[variant];

  // Loading
  if (cardState === 'loading') {
    return (
      <View style={[S.card, { borderLeftColor: '#1E293B' }]}>
        <View style={S.headerRow}>
          <View style={[S.skBlock, S.skLabel]} />
          <View style={S.skSources}>
            <View style={[S.skBlock, S.skSource]} />
            <View style={[S.skBlock, S.skSource]} />
          </View>
        </View>
        <View style={[S.skBlock, S.skKpi]} />
        <View style={[S.skBlock, S.skSync]} />
        <View style={[S.footerRow, { borderTopColor: '#1E293B' }]}>
          <View style={[S.skBlock, S.skFooterL]} />
          <View style={[S.skBlock, S.skFooterR]} />
        </View>
      </View>
    );
  }

  // Empty
  if (cardState === 'empty') {
    return (
      <View style={[S.card, { borderLeftColor: '#1E293B' }]}>
        <View style={S.emptyBody}>
          <BarChart3 size={32} strokeWidth={1.5} color="#475569" style={S.emptyIcon} />
          <Text style={S.emptyMsg}>Нет данных за выбранный период</Text>
          {onEmptyCTA && (
            <TouchableOpacity style={S.emptyCta} onPress={onEmptyCTA}>
              <Calendar size={12} strokeWidth={2} color="#60A5FA" />
              <Text style={S.emptyCtaText}>Сменить период</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Error
  if (cardState === 'error') {
    return (
      <View style={[S.card, { borderLeftColor: '#EF4444' }]}>
        <View style={S.errorBody}>
          <View style={S.errorLeft}>
            <AlertTriangle size={16} strokeWidth={1.75} color="#EF4444" />
            <Text style={S.errorMsg}>
              Ошибка синка {sources?.[0] ?? 'данных'}
              {lastSyncText ? ` · ${lastSyncText}` : ''}
            </Text>
          </View>
          {onRetry && (
            <TouchableOpacity style={S.errorCta} onPress={onRetry}>
              <RefreshCw size={12} strokeWidth={2} color="#EF4444" />
              <Text style={S.errorCtaText}>Повторить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Default
  const CardWrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.9 } : {};

  return (
    <CardWrapper
      {...(wrapperProps as any)}
      style={[S.card, { borderLeftColor: vt.borderLeft }]}
    >
      {/* Row 1 · header */}
      <View style={S.headerRow}>
        <View style={S.labelGroup}>
          {HeaderIcon && (
            <HeaderIcon size={14} strokeWidth={1.75} color="#94A3B8" />
          )}
          <Text style={S.label}>{label}</Text>
          <View style={S.separator} />
          <Text style={S.period}>{periodLabel}</Text>
        </View>
        <View style={S.sourcesRow}>
          {sources?.map(src => (
            <View key={src} style={S.sourceBadge}>
              <Text style={S.sourceBadgeText}>{src}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Row 2 · KPI value + sync */}
      <View style={S.kpiRow}>
        <Text style={[S.kpiValue, { color: vt.kpiColor }]}>
          {formatValue(value, formattedValue)}
        </Text>
        <View style={S.syncRow}>
          <PulseDot color={vt.dotColor} enabled={vt.pulse} />
          {lastSyncText && <Text style={S.syncText}>{lastSyncText}</Text>}
        </View>
      </View>

      {/* Row 3 · footer */}
      {(profit || expenses) && (
        <View style={S.footerRow}>
          {/* Left: profit */}
          {profit && (
            <View style={S.footerLeft}>
              {typeof profit.value === 'number' && profit.value >= 0
                ? <TrendingUp size={16} strokeWidth={2} color="#22C55E" />
                : <TrendingDown size={16} strokeWidth={2} color="#EF4444" />
              }
              <Text style={S.footerLabel}>{profit.label}</Text>
              <Text style={S.footerValue}>
                {typeof profit.value === 'number'
                  ? formatValue(profit.value)
                  : profit.value}
              </Text>
              {profit.deltaPct !== undefined && (
                <View style={S.footerDeltaPill}>
                  <TrendingUp size={11} strokeWidth={2} color="#22C55E" />
                  <Text style={S.footerDeltaText}>{formatPct(profit.deltaPct)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Right: expenses */}
          {expenses && (
            <View style={S.footerRight}>
              <TrendingDown size={14} strokeWidth={1.75} color="#94A3B8" />
              <Text style={S.footerRightLabel}>{expenses.label}</Text>
              <Text style={S.footerRightValue}>
                {typeof expenses.value === 'number'
                  ? formatValue(expenses.value)
                  : expenses.value}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Drill-down chevron */}
      {onPress && (
        <View style={S.drillBtn}>
          <ChevronRight
            size={18}
            strokeWidth={2}
            color={variant === 'danger' ? '#F87171' : '#60A5FA'}
          />
        </View>
      )}
    </CardWrapper>
  );
}
