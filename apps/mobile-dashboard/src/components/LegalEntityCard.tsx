import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, TrendingUp, TrendingDown, Building2 } from 'lucide-react-native';
import { colors } from '../theme';

type BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';

export interface LegalEntityCardProps {
  name: string;
  taxpayerIdNumber: string | null;
  revenue: number;
  financialResult: number;
  restaurantCount: number;
  brand: BrandCode;
  onPress?: () => void;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatRevenue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `₸${(v / 1_000_000).toFixed(2)}М`;
  if (Math.abs(v) >= 1_000)     return `₸${(v / 1_000).toFixed(0)}К`;
  return `₸${Math.round(v)}`;
}

function formatResult(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '−' : '+'}₸${(abs / 1_000_000).toFixed(2)}М`;
  if (abs >= 1_000)     return `${v < 0 ? '−' : '+'}₸${(abs / 1_000).toFixed(0)}К`;
  return `${v < 0 ? '−' : '+'}₸${abs}`;
}

function formatMarginPct(revenue: number, result: number): string {
  if (revenue <= 0) return '—';
  return `${Math.round((result / revenue) * 100)}%`;
}

function pluralPoints(n: number): string {
  const tail = n % 100;
  const last = n % 10;
  if (tail >= 11 && tail <= 14) return 'точек';
  if (last === 1)                return 'точка';
  if (last >= 2 && last <= 4)   return 'точки';
  return 'точек';
}

/** Strip ТОО/ИП prefix and return badge kind + clean display name. */
function parseEntityName(raw: string): { kind: 'ТОО' | 'ИП' | null; display: string } {
  const s = raw.trim();
  const too = s.match(/^(ТОО|TOO)\s*[«"„]?\s*(.+?)\s*[»""]?$/i);
  if (too) return { kind: 'ТОО', display: too[2] };
  const ip = s.match(/^(ИП|IP)\s*[«"„]?\s*(.+?)\s*[»""]?$/i);
  if (ip) return { kind: 'ИП', display: ip[2] };
  return { kind: null, display: s };
}

// ─── Brand color map (mirrors RestaurantCard lookup) ─────────────────────────

const BRAND_PALETTE: Record<BrandCode, { bg: string; border: string; text: string }> = {
  BNA:     colors.brand.bna,
  DNA:     colors.brand.dna,
  JD:      colors.brand.jd,
  SB:      colors.brand.sb,
  KEX:     colors.brand.kex,
  KITCHEN: colors.brand.kitchen,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LegalEntityCard({
  name,
  taxpayerIdNumber,
  revenue,
  financialResult,
  restaurantCount,
  brand,
  onPress,
}: LegalEntityCardProps) {
  const profitable = financialResult >= 0;
  const palette    = BRAND_PALETTE[brand] ?? BRAND_PALETTE.BNA;
  const { kind, display } = parseEntityName(name);

  const resultColor  = profitable ? colors.status.positive : colors.status.danger;
  const resultBg     = profitable ? colors.pill.positive.bg : colors.pill.danger.bg;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: palette.text }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Row 1: badge + name + chevron */}
      <View style={styles.headerRow}>
        <View style={styles.leftCluster}>
          {/* entity-type badge — mirrors brandBadge in RestaurantCard */}
          {kind ? (
            <View style={[styles.kindBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.kindBadgeText, { color: palette.text }]}>{kind}</Text>
            </View>
          ) : (
            <Building2 size={14} strokeWidth={1.5} color={colors.text.tertiary} />
          )}
          <Text style={styles.entityName} numberOfLines={2}>{display}</Text>
        </View>
        <View style={styles.rightCluster}>
          <Text style={styles.revenueText}>{formatRevenue(revenue)}</Text>
          <ChevronRight size={16} strokeWidth={2} color={colors.text.tertiary} />
        </View>
      </View>

      {/* Row 2: sub-line — restaurant count + BIN */}
      <Text style={styles.subLine}>
        {restaurantCount} {pluralPoints(restaurantCount)}
        {taxpayerIdNumber ? (
          <Text style={styles.subDim}> · БИН {taxpayerIdNumber}</Text>
        ) : null}
      </Text>

      {/* Row 3: metrics footer — result pill + margin */}
      <View style={styles.metricsRow}>
        {/* Financial result pill — same pill shape as delta in RestaurantCard */}
        <View style={[styles.resultPill, { backgroundColor: resultBg }]}>
          {profitable
            ? <TrendingUp  size={11} strokeWidth={2} color={resultColor} />
            : <TrendingDown size={11} strokeWidth={2} color={resultColor} />
          }
          <Text style={[styles.resultPillText, { color: resultColor }]}>
            {formatResult(financialResult)}
          </Text>
        </View>

        <Text style={styles.marginLabel}>
          {'Маржа '}
          <Text style={[styles.marginValue, { color: resultColor }]}>
            {formatMarginPct(revenue, financialResult)}
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Derived from RestaurantCard.styles — shared tokens, no new values.

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,      // bgCard, not bgCardElev — matches RestaurantCard
    borderWidth: 1,
    borderColor: colors.border.default,
    borderLeftWidth: 4,                   // signature left accent, same as RestaurantCard
    borderRadius: 12,                     // radii.lg — system card radius
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 8,                      // spacing.xs — same as RestaurantCard
    gap: 8,
  },

  // Row 1
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  // Entity-type badge — pill shape, matches brandBadge in RestaurantCard.styles
  kindBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.6,
  },

  entityName: {
    flex: 1,
    fontSize: 15,                         // matches restaurantName in RestaurantCard.styles
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text.default,
  },

  // Revenue + chevron — mirrors rightCluster / chevronRow
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revenueText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'FiraCode-Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    color: colors.text.default,
  },

  // Row 2: sub-line
  subLine: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text.muted,
  },
  subDim: {
    color: colors.text.tertiary,
  },

  // Row 3: metrics footer
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,  // token, not raw rgba
    marginTop: 2,
  },

  // Financial result pill — identical to deltaPill in RestaurantCard.styles
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 9999,
  },
  resultPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
  },

  // Margin label on the right
  marginLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text.muted,
  },
  marginValue: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
  },
});
