import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, TrendingUp, TrendingDown, WifiOff, AlertCircle } from 'lucide-react-native';
import { colors, restaurantStatusColors, deltaVariants } from '../theme';
import { formatMargin, formatDelta } from '../utils/brand';
import { styles } from './RestaurantCard.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RestaurantCardProps {
  brand: 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';
  name: string;
  city: string;
  cuisine: 'Burger' | 'Doner' | 'Mixed' | 'Multi' | 'Kitchen';
  transactions: number | null;
  revenue: number | null;
  plannedRevenue: number;
  marginPct: number | null;
  deltaPct: number | null;        // percentage units, e.g. -4.74 = "-4.7%"
  planAttainmentPct: number;      // 0..100
  planMarkPct: number;            // where ПЛАН marker sits (usually 100)
  periodLabel: string;            // "за 1–19 апр 2026"
  status: 'above' | 'onplan' | 'below' | 'offline' | 'loading';
  showPlanLabel?: boolean;        // show "ПЛАН" text above marker (first card only)
  planLabel?: { text: string; status: 'above' | 'onplan' | 'below' }; // BUG-11-4: pre-computed label from hook
  onPress?: () => void;
}

// ─── Local formatters (currency) ──────────────────────────────────────────────
// formatMargin + formatDelta live in utils/brand.ts — unit-contract normalized per BUG-11-1 fix.

function formatRevenue(v: number | null): string {
  if (v === null) return '—';
  if (v >= 1_000_000) return `₸${(v / 1_000_000).toFixed(2)}М`;
  if (v >= 1_000) return `₸${(v / 1_000).toFixed(0)}К`;
  return `₸${v}`;
}

function formatPlanned(v: number): string {
  if (v >= 1_000_000) return `₸${(v / 1_000_000).toFixed(2)}М`;
  if (v >= 1_000) return `₸${(v / 1_000).toFixed(0)}К`;
  return `₸${v}`;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ showPlanLabel }: { showPlanLabel?: boolean }) {
  return (
    <View style={[styles.card, { borderLeftColor: colors.border.default }]}>
      <View style={styles.headerRow}>
        <View style={styles.leftCluster}>
          <View style={[styles.dot, { backgroundColor: '#334155' }]} />
          <View style={styles.metaColumn}>
            <View style={styles.nameLine}>
              <View style={[styles.skBlock, styles.skBadge]} />
              <View style={[styles.skBlock, styles.skName]} />
            </View>
            <View style={[styles.skBlock, styles.skSub]} />
          </View>
        </View>
        <View style={styles.rightCluster}>
          <View style={[styles.skBlock, styles.skRevenue]} />
          <View style={[styles.skBlock, styles.skDelta]} />
        </View>
      </View>

      <View style={styles.barWrap}>
        <View style={[styles.skBlock, { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 9999 }]} />
      </View>

      <View style={styles.footerRow}>
        <View style={[styles.skBlock, styles.skFooterL]} />
        <View style={[styles.skBlock, styles.skFooterR]} />
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RestaurantCard({
  brand,
  name,
  city,
  cuisine,
  transactions,
  revenue,
  plannedRevenue,
  marginPct,
  deltaPct,
  planAttainmentPct,
  planMarkPct,
  periodLabel,
  status,
  showPlanLabel,
  planLabel,
  onPress,
}: RestaurantCardProps) {

  if (status === 'loading') {
    return <LoadingSkeleton showPlanLabel={showPlanLabel} />;
  }

  // Semantic color resolution
  const semanticColors = status === 'offline'
    ? restaurantStatusColors.offline
    : restaurantStatusColors[status as keyof typeof restaurantStatusColors];

  // BUG-11-2: dynamic brand color lookup for all 6 codes
  const brandKey = (brand || 'BNA').toLowerCase() as keyof typeof colors.brand;
  const brandTheme = colors.brand[brandKey] ?? colors.brand.bna;

  // BUG-11-4: plan label color from planLabel.status (if provided)
  const planLabelColor =
    planLabel?.status === 'above' ? colors.status.positive :
    planLabel?.status === 'below' ? colors.status.danger :
    colors.text.secondary;

  // Delta pill
  const isOffline = status === 'offline';
  const deltaKey = isOffline
    ? 'muted'
    : deltaPct === null
      ? 'muted'
      : deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat';
  const deltaToken = deltaVariants[deltaKey];

  // Status label text — prefer planLabel (BUG-11-4) when provided, fall back to legacy delta-based render
  const statusLabel = (() => {
    if (status === 'offline') return null; // rendered differently
    if (planLabel) return null; // planLabel renders separately with explicit color
    if (status === 'above')  return `Выше плана · ${formatDelta(deltaPct)}`;
    if (status === 'onplan') return `В плане · ${formatDelta(deltaPct)}`;
    if (status === 'below')  return `Ниже плана · ${formatDelta(deltaPct)}`;
    return null;
  })();

  // clamp plan bar to 0..100
  const fillWidth = Math.min(Math.max(planAttainmentPct, 0), 100);
  const markLeft  = Math.min(Math.max(planMarkPct, 0), 100);

  const CardWrapper = (onPress && status !== 'offline')
    ? TouchableOpacity
    : View;
  const wrapperProps = (onPress && status !== 'offline')
    ? { activeOpacity: 0.85, onPress }
    : {};

  return (
    <CardWrapper
      {...(wrapperProps as any)}
      style={[styles.card, { borderLeftColor: semanticColors.borderLeft }]}
    >
      {/* Row 1: header */}
      <View style={styles.headerRow}>

        {/* Left: dot + meta */}
        <View style={styles.leftCluster}>
          <View style={[styles.dot, { backgroundColor: semanticColors.dot }]} />
          <View style={styles.metaColumn}>
            {/* name line: brand badge + name */}
            <View style={styles.nameLine}>
              {/* BUG-11-2: dynamic brand theme for all 6 codes */}
              <View style={[styles.brandBadge, { backgroundColor: brandTheme.bg, borderColor: brandTheme.border }]}>
                <Text style={[styles.brandBadgeText, { color: brandTheme.text }]}>
                  {brand}
                </Text>
              </View>
              <Text style={styles.restaurantName} numberOfLines={1}>{name}</Text>
            </View>
            {/* sub line */}
            <Text style={styles.subLine}>
              {city} · {cuisine}{' '}
              {transactions !== null
                ? `· ${transactions} чеков · `
                : '· '}
              <Text style={styles.subDim}>{periodLabel}</Text>
            </Text>
          </View>
        </View>

        {/* Right: revenue + delta + chevron */}
        <View style={styles.rightCluster}>
          <View style={styles.chevronRow}>
            <Text style={[styles.revenueText, revenue === null && styles.revenueEmpty]}>
              {formatRevenue(revenue)}
            </Text>
            {status !== 'offline' && onPress && (
              <ChevronRight size={16} strokeWidth={2} color={colors.text.tertiary} />
            )}
          </View>
          {/* delta pill */}
          <View style={[styles.deltaPill, { backgroundColor: deltaToken.bg }]}>
            {deltaKey === 'up' && (
              <TrendingUp size={11} strokeWidth={2} color={deltaToken.text} />
            )}
            {deltaKey === 'down' && (
              <TrendingDown size={11} strokeWidth={2} color={deltaToken.text} />
            )}
            {isOffline && (
              <WifiOff size={11} strokeWidth={2} color={deltaToken.text} />
            )}
            <Text style={[styles.deltaPillText, { color: deltaToken.text }]}>
              {isOffline ? 'Нет данных' : formatDelta(deltaPct)}
            </Text>
          </View>
        </View>
      </View>

      {/* Row 2: plan progress bar */}
      <View style={styles.barWrap}>
        {/* fill */}
        <View
          style={[
            styles.barFill,
            {
              width: `${fillWidth}%`,
              backgroundColor: isOffline
                ? 'rgba(100,116,139,0.4)' // offline: muted 40%
                : semanticColors.fill,
            },
          ]}
        />
        {/* plan marker */}
        <View style={[styles.planMark, { left: `${markLeft}%` as any }]}>
          {showPlanLabel && (
            <Text style={styles.planLabel}>ПЛАН</Text>
          )}
        </View>
      </View>

      {/* Row 3: footer */}
      <View style={styles.footerRow}>
        {/* left: plan + margin */}
        <Text style={styles.footerLeft}>
          {'План '}
          <Text style={styles.footerValue}>{formatPlanned(plannedRevenue)}</Text>
          {' · Маржа '}
          <Text style={styles.footerValue}>{formatMargin(marginPct)}</Text>
        </Text>

        {/* right: status text or offline row */}
        {status === 'offline' ? (
          <View style={styles.offlineRow}>
            <AlertCircle size={12} strokeWidth={2} color={semanticColors.text} />
            <Text style={[styles.statusText, { color: semanticColors.text }]}>
              Нет данных
            </Text>
          </View>
        ) : planLabel ? (
          <Text style={[styles.statusText, { color: planLabelColor }]}>
            {planLabel.text}
          </Text>
        ) : (
          <Text style={[styles.statusText, { color: semanticColors.text }]}>
            {statusLabel}
          </Text>
        )}
      </View>
    </CardWrapper>
  );
}
