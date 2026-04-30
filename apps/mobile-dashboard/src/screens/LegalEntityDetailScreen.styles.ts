import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, gap: 12,
  },
  backBtn: { color: colors.textPrimary, fontSize: 28, fontWeight: '300' },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '700', flex: 1 },
  subtitle: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },

  // ─── Hero Card ────────────────────────────────────────────────────────────────
  // Deliberately DIFFERENT from BrandDetailScreen hero:
  //   • BrandDetailScreen: solid accentDefault (#2563EB) — top of brand hierarchy
  //   • LegalEntityDetailScreen: bgCard surface + brand-tinted left border
  // This creates clear visual depth in the drill-down chain.
  // borderLeftColor is set inline per-brand (palette.text) in the screen component.
  heroCard: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16,                          // radii.xl — hero card
    padding: 20,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,            // card surface, not accent solid
    borderWidth: 1,
    borderColor: colors.border.default,
    borderLeftWidth: 4,                        // brand accent stripe — same as RestaurantCard
    // borderLeftColor set inline in screen TSX
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: colors.textTertiary,                // muted label, not white-on-blue
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Brand chip in top-right — mirrors heroBadge in BrandDetailScreen.styles
  heroBrandRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  heroBrandTag: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,                        // pill — matches brandBadge / kindBadge
    borderWidth: 1,
    // backgroundColor + borderColor + color set inline in screen TSX via brand palette
    overflow: 'hidden',
  },

  heroAmount: {
    color: colors.textPrimary,                 // text.default on card bg (not white on blue)
    fontSize: 34,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    marginTop: 8,
  },

  heroSubRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,      // token, not raw rgba
  },
  heroGreen: { color: colors.green, fontSize: 12 },
  heroExpenses: { color: colors.red, fontSize: 12, fontWeight: '500' },
  heroGray: { color: colors.textTertiary, fontSize: 12 },
  heroTaxId: { color: colors.textMuted, fontSize: 11, marginTop: 6 },

  // ─── List ─────────────────────────────────────────────────────────────────────
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  listTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  listCount: { color: colors.textTertiary, fontSize: 12 },

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.red, fontSize: 14, marginTop: 10 },
});
