import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 100,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },

  // ── Total Revenue Hero ────────────────────────────────────────────────────
  heroSection: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  heroSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'FiraCode-Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  heroDelta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDeltaPositive: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
  heroDeltaNegative: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.red,
  },
  heroDeltaNeutral: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  // ── Section Cards ─────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 14,
    marginTop: -8,
  },

  // ── Payment bars ──────────────────────────────────────────────────────────
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  paymentLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    width: 90,
  },
  paymentBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bgCardElev,
    borderRadius: 3,
    marginRight: 10,
  },
  paymentBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: '500',
    width: 90,
    textAlign: 'right',
    fontFamily: 'FiraCode-Regular',
    fontVariant: ['tabular-nums'],
  },

  // ── Daily chart ───────────────────────────────────────────────────────────
  bar: {
    backgroundColor: colors.accentDefault,
    borderRadius: 4,
  },
  chartSelectedTooltip: {
    backgroundColor: colors.pill.accent.bg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  chartSelectedDay: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  chartSelectedRevenue: {
    color: colors.green,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'FiraCode-Bold',
    fontVariant: ['tabular-nums'],
  },
  chartSelectedVsAvg: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  chartAvgHint: {
    color: colors.textTertiary,
    fontSize: 11,
    marginBottom: 4,
  },

  // ── Financial result rows ─────────────────────────────────────────────────
  finRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  finRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 4,
    paddingTop: 12,
  },
  finLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  finLabelBold: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  finValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  finValuePositive: {
    color: colors.green,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'FiraCode-Bold',
    fontVariant: ['tabular-nums'],
  },
  finValueNegative: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  finMarginChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  finMarginText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Top restaurants ───────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  topRank: {
    width: 24,
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  topName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    marginLeft: 10,
  },
  topRevenue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    fontVariant: ['tabular-nums'],
    marginRight: 6,
  },
  topShare: {
    color: colors.textTertiary,
    fontSize: 12,
    width: 42,
    textAlign: 'right',
  },
  topChevron: {
    marginLeft: 4,
  },

  // ── States ────────────────────────────────────────────────────────────────
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  unavailableText: {
    color: colors.textTertiary,
    fontSize: 15,
    textAlign: 'center',
  },
  unavailableHint: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
