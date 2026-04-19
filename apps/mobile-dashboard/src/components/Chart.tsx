import React, { useCallback } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { BarChart3, Calendar } from 'lucide-react-native';
import { chartStyles as S } from './Chart.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartPeriod = '7d' | '14d' | '30d' | '90d';
export type ChartCardState = 'default' | 'loading' | 'empty' | 'single-value';
export type LabelVariant = 'date' | 'dow';

export interface ChartDataPoint {
  date: string;          // ISO YYYY-MM-DD
  value: number;         // KZT
  label?: string;        // override x-axis
  critical?: boolean;    // ≤10% avg → red bar
}

export interface ChartProps {
  title: string;
  data: ChartDataPoint[];
  activeIndex?: number;
  onBarPress?: (index: number, point: ChartDataPoint) => void;
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  labelVariant?: LabelVariant;
  cardState?: ChartCardState;
  average?: number;
  max?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: { key: ChartPeriod; label: string }[] = [
  { key: '7d',  label: '7д'  },
  { key: '14d', label: '14д' },
  { key: '30d', label: '30д' },
  { key: '90d', label: '90д' },
];

const BAR_COLORS = {
  aboveAvg: '#2563EB',
  belowAvg: '#1D4ED8',
  active:   '#60A5FA',
  zero:     '#475569',
  critical: '#EF4444',
  loading:  '#1E293B',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

function getDow(iso: string): { day: string; num: string } {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const date  = new Date(iso);
  return { day: days[date.getDay()], num: String(date.getDate()) };
}

function formatAmount(v: number): string {
  if (v >= 1_000_000) return `₸${(v / 1_000_000).toFixed(1)}М`;
  if (v >= 1_000) return `₸${(v / 1_000).toFixed(0)}К`;
  return `₸${v}`;
}

// ─── Period tabs ──────────────────────────────────────────────────────────────

function PeriodTabs({ period, onPeriodChange }: { period: ChartPeriod; onPeriodChange: (p: ChartPeriod) => void }) {
  return (
    <View style={S.periodTabs}>
      {PERIODS.map(p => (
        <TouchableOpacity
          key={p.key}
          style={[S.periodTab, period === p.key && S.periodTabActive]}
          onPress={() => onPeriodChange(p.key)}
          activeOpacity={0.8}
        >
          <Text style={[S.periodTabText, period === p.key && S.periodTabTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Chart body ───────────────────────────────────────────────────────────────

function ChartBars({
  data,
  activeIndex,
  onBarPress,
  average,
  max: maxOverride,
  labelVariant,
}: {
  data: ChartDataPoint[];
  activeIndex?: number;
  onBarPress?: (i: number, p: ChartDataPoint) => void;
  average?: number;
  max?: number;
  labelVariant: LabelVariant;
}) {
  const maxVal = maxOverride ?? Math.max(...data.map(d => d.value), 1);
  const avg    = average ?? (data.reduce((s, d) => s + d.value, 0) / (data.length || 1));

  function getBarColor(point: ChartDataPoint, idx: number): string {
    if (idx === activeIndex)   return BAR_COLORS.active;
    if (point.critical)        return BAR_COLORS.critical;
    if (point.value === 0)     return BAR_COLORS.zero;
    if (point.value >= avg)    return BAR_COLORS.aboveAvg;
    return BAR_COLORS.belowAvg;
  }

  // Grid: max at 10% top, avg at 45%
  const avgTop = avg > 0 ? 100 - (avg / maxVal) * 90 : 50; // approx top %

  return (
    <>
      <View style={S.chartBody}>
        {/* Grid */}
        <View style={S.grid}>
          <View style={[S.gridLine, { top: '10%' }]}>
            <Text style={S.gridLabel}>макс {formatAmount(maxVal)}</Text>
          </View>
          <View style={[S.gridLine, { top: `${avgTop}%` as any }]}>
            <Text style={[S.gridLabel, S.gridLabelAvg]}>ср {formatAmount(avg)}</Text>
          </View>
        </View>

        {/* Bars */}
        <View style={S.bars}>
          {data.map((point, idx) => {
            const heightPct = maxVal > 0 ? Math.max((point.value / maxVal) * 90, 2.5) : 2.5;
            const isActive  = idx === activeIndex;
            const barColor  = getBarColor(point, idx);
            const deltaAvg  = avg > 0 ? ((point.value - avg) / avg) : 0;
            return (
              <Pressable
                key={point.date}
                style={S.barCol}
                onPress={() => onBarPress?.(idx, point)}
                hitSlop={{ top: 8, right: 4, bottom: 16, left: 4 }}
                accessibilityRole="button"
                accessibilityLabel={`${formatDate(point.date)} · ${formatAmount(point.value)}`}
              >
                {/* Over-label (active only) */}
                {isActive && (
                  <View style={S.overLabel}>
                    <Text style={S.overAmt}>{formatAmount(point.value)}</Text>
                    <Text style={[S.overDelta, { color: deltaAvg >= 0 ? '#22C55E' : '#EF4444' }]}>
                      {deltaAvg >= 0 ? '+' : ''}{(deltaAvg * 100).toFixed(0)}%
                    </Text>
                  </View>
                )}
                <View
                  style={[S.bar, { height: `${heightPct}%`, backgroundColor: barColor }]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={S.xAxis}>
        {data.map((point, idx) => {
          const isActive   = idx === activeIndex;
          const isCritical = point.critical;
          if (labelVariant === 'dow') {
            const dow = getDow(point.date);
            return (
              <View key={point.date} style={S.xLabelCol}>
                <Text style={[S.xDow, isActive && S.xDowActive]}>{dow.day}</Text>
                <Text style={[S.xNum, isActive && S.xDowActive]}>{dow.num}</Text>
              </View>
            );
          }
          return (
            <Text
              key={point.date}
              style={[
                S.xLabel,
                isActive && S.xLabelActive,
                isCritical && !isActive && S.xLabelCritical,
              ]}
            >
              {point.label ?? formatDate(point.date)}
            </Text>
          );
        })}
      </View>
    </>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SKEL_HEIGHTS = [55, 80, 65, 90, 75, 85, 60, 95, 70, 80, 65, 75, 85, 70];

function LoadingSkeleton({ barCount }: { barCount: number }) {
  const counts = Array.from({ length: barCount }).map((_, i) => SKEL_HEIGHTS[i % SKEL_HEIGHTS.length]);
  return (
    <>
      <View style={S.chartBody}>
        <View style={S.bars}>
          {counts.map((h, i) => (
            <View key={i} style={[S.barCol]}>
              <View style={[S.skBar, { height: `${h}%` }]} />
            </View>
          ))}
        </View>
      </View>
      <View style={S.xAxis}>
        {counts.map((_, i) => (
          <View key={i} style={[S.skLabel, { alignSelf: 'center' }]} />
        ))}
      </View>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Chart({
  title,
  data,
  activeIndex,
  onBarPress,
  period,
  onPeriodChange,
  labelVariant,
  cardState = 'default',
  average,
  max,
}: ChartProps) {

  // Determine period suffix
  const periodSuffix =
    period === '7d' ? '7 дней' :
    period === '14d' ? '14 дней' :
    period === '30d' ? '30 дней' : '90 дней';

  // Auto label variant: DOW only for 7d
  const effectiveLabelVariant: LabelVariant = labelVariant ?? (period === '7d' ? 'dow' : 'date');

  // Bar count for skeleton
  const skelCount = period === '7d' ? 7 : period === '14d' ? 14 : period === '30d' ? 14 : 14;

  return (
    <View
      style={S.card}
      accessibilityRole="image"
      accessibilityLabel={`График выручки · ${period} · средн ${average ? formatAmount(average) : ''}`}
    >
      {/* Header */}
      <View style={S.header}>
        <View style={S.titleRow}>
          <Text style={S.title}>{title}</Text>
          <Text style={S.titleSuffix}>{periodSuffix}</Text>
        </View>
        <PeriodTabs period={period} onPeriodChange={onPeriodChange} />
      </View>

      {/* Body */}
      {cardState === 'loading' && (
        <LoadingSkeleton barCount={skelCount} />
      )}

      {cardState === 'empty' && (
        <View style={S.emptyBody}>
          <BarChart3 size={32} strokeWidth={1.5} color="#475569" />
          <Text style={S.emptyMsg}>Нет данных за период</Text>
          <TouchableOpacity style={S.emptyCta} activeOpacity={0.8}>
            <Calendar size={14} strokeWidth={2} color="#60A5FA" />
            <Text style={S.emptyCtaText}>Сменить период</Text>
          </TouchableOpacity>
        </View>
      )}

      {cardState === 'single-value' && data.length === 1 && (
        <View style={[S.emptyBody]}>
          <View style={{ width: 48, height: 80, backgroundColor: '#60A5FA', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          <Text style={[S.emptyMsg, { color: '#F8FAFC', fontSize: 14, fontWeight: '700' }]}>
            {formatAmount(data[0].value)}
          </Text>
          <Text style={S.emptyMsg}>единственный день с данными</Text>
        </View>
      )}

      {cardState === 'default' && data.length > 0 && (
        <ChartBars
          data={data}
          activeIndex={activeIndex}
          onBarPress={onBarPress}
          average={average}
          max={max}
          labelVariant={effectiveLabelVariant}
        />
      )}
    </View>
  );
}
