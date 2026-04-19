import React from 'react';
import { View, Text } from 'react-native';
import { badgeStyles as S, BADGE_TONES } from './Badge.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeTone   = 'positive' | 'negative' | 'warning' | 'neutral' | 'info';
export type SourceStyle = 'solid' | 'outline';
export type MetricTone  = 'positive' | 'negative' | 'neutral';

// ─── Status badge ─────────────────────────────────────────────────────────────

export interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
  showDot?: boolean;
  testID?: string;
}

export function StatusBadge({ tone, label, showDot = true, testID }: StatusBadgeProps) {
  const t = BADGE_TONES[tone];
  return (
    <View
      style={[
        S.status,
        { backgroundColor: t.bg, borderColor: t.border },
      ]}
      testID={testID}
      accessibilityLabel={label}
    >
      {showDot && (
        <View style={[S.statusDot, { backgroundColor: t.dot }]} />
      )}
      <Text style={[S.statusText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

export interface SourceBadgeProps {
  source: 'iiko' | '1C' | string;
  style?: SourceStyle;
  testID?: string;
}

export function SourceBadge({ source, style = 'outline', testID }: SourceBadgeProps) {
  const isSolid = style === 'solid';
  return (
    <View
      style={[S.source, isSolid ? S.sourceSolid : S.sourceOutline]}
      testID={testID}
      accessibilityLabel={source}
    >
      <Text style={isSolid ? S.sourceTextSolid : S.sourceTextOutline}>{source}</Text>
    </View>
  );
}

// ─── Metric badge ─────────────────────────────────────────────────────────────

export interface MetricBadgeProps {
  value: string;             // formatted, e.g. "+12.3%" or "₸1.2М"
  tone?: MetricTone;
  testID?: string;
}

const METRIC_BG: Record<MetricTone, object> = {
  positive: S.metricPositive,
  negative: S.metricNegative,
  neutral:  S.metricNeutral,
};

const METRIC_TEXT_COLOR: Record<MetricTone, string> = {
  positive: '#22C55E',
  negative: '#EF4444',
  neutral:  '#94A3B8',
};

export function MetricBadge({ value, tone = 'neutral', testID }: MetricBadgeProps) {
  return (
    <View
      style={[S.metric, METRIC_BG[tone]]}
      testID={testID}
      accessibilityLabel={value}
    >
      <Text style={[S.metricText, { color: METRIC_TEXT_COLOR[tone] }]}>{value}</Text>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function BadgeSkeleton({ testID }: { testID?: string }) {
  return <View style={S.skeleton} testID={testID} />;
}
