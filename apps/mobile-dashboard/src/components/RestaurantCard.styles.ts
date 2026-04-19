import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  // ─── Card shell ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderLeftWidth: 4,
    // borderLeftColor set dynamically via inline style per semantic state
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // ─── Row 1: header ────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  // left cluster: dot + meta
  leftCluster: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    alignItems: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6, // optical align with first text line
  },
  metaColumn: {
    flex: 1,
    gap: 3,
  },

  // brand badge (inline pill)
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  brandBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 9999,
    borderWidth: 1,
    backgroundColor: colors.brand.bna.bg,
    borderColor: colors.brand.bna.border,
  },
  brandBadgeDna: {
    backgroundColor: colors.brand.dna.bg,
    borderColor: colors.brand.dna.border,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.6,
    color: colors.brand.bna.text,
  },
  brandBadgeTextDna: {
    color: colors.brand.dna.text,
  },

  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text.default,
  },
  subLine: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text.muted,
  },
  subDim: {
    color: colors.text.tertiary,
  },

  // right cluster: revenue + delta + chevron
  rightCluster: {
    alignItems: 'flex-end',
    gap: 6,
  },
  revenueText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'FiraCode-Bold',
    letterSpacing: -0.3,
    color: colors.text.default,
  },
  revenueEmpty: {
    color: colors.text.disabled,
  },
  chevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // delta pill
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 9999,
  },
  deltaPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
  },

  // ─── Row 2: progress bar ──────────────────────────────────────────────────────
  barWrap: {
    height: 6,
    backgroundColor: colors.bgCardElev,
    borderRadius: 9999,
    marginTop: 16,
    overflow: 'visible', // allow plan-mark to overflow vertically
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9999,
  },
  planMark: {
    position: 'absolute',
    width: 2,
    top: -4,
    bottom: -4,
    backgroundColor: colors.text.default,
    // halo against card: shadow handled via elevation or borderWidth workaround in RN
    borderRadius: 1,
  },
  planLabel: {
    position: 'absolute',
    top: -17,
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.5,
    color: colors.text.muted,
  },

  // ─── Row 3: footer ────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerLeft: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text.muted,
  },
  footerValue: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    color: colors.text.secondary,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ─── Loading skeleton ─────────────────────────────────────────────────────────
  skBlock: {
    backgroundColor: colors.border.default,
    borderRadius: 4,
  },
  skBadge:      { width: 40, height: 14, borderRadius: 9999 },
  skName:       { width: 140, height: 14 },
  skSub:        { width: 220, height: 10 },
  skRevenue:    { width: 80, height: 16 },
  skDelta:      { width: 56, height: 14, borderRadius: 9999 },
  skFooterL:    { width: 160, height: 10 },
  skFooterR:    { width: 90, height: 10 },
});
