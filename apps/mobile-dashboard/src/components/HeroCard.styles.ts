import { StyleSheet } from 'react-native';

// ─── HeroCard styles v3 — KEX GROUP Dashboard ─────────────────────────────────
// Source: hero-card.html

export const heroStyles = StyleSheet.create({
  // ─── Card shell ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderLeftWidth: 4,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 14,
    position: 'relative',
  },

  // ─── Row 1 · header ───────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  separator: { width: 1, height: 10, backgroundColor: '#334155' },
  period: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  sourcesRow: { flexDirection: 'row', gap: 6 },
  sourceBadge: {
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#0F172A',
  },

  // ─── Row 2 · KPI ──────────────────────────────────────────────────────────────
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: -1.5,
    lineHeight: 42,
    color: '#F8FAFC',         // overridden per variant
  },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  syncText: {
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'FiraCode-Regular',
    letterSpacing: 0.3,
    color: '#64748B',
  },

  // ─── Row 3 · footer ───────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLabel: { fontSize: 12, fontWeight: '600', color: '#F8FAFC' },
  footerValue: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    color: '#F8FAFC',
  },
  footerDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.30)',
  },
  footerDeltaText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.2,
    color: '#22C55E',
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerRightLabel: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  footerRightValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    color: '#94A3B8',
  },

  // Drill-down chevron
  drillBtn: { position: 'absolute', bottom: 14, right: 16 },

  // ─── States ───────────────────────────────────────────────────────────────────
  // Loading skeleton
  skBlock: { backgroundColor: '#1E293B', borderRadius: 4 },
  skLabel: { width: 160, height: 14 },
  skSources: { flexDirection: 'row', gap: 6 },
  skSource: { width: 36, height: 18, borderRadius: 9999 },
  skKpi: { width: '80%', height: 44, borderRadius: 8 },
  skSync: { width: 120, height: 12 },
  skFooterL: { width: 180, height: 18 },
  skFooterR: { width: 120, height: 18 },

  // Empty
  emptyBody: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyIcon: { opacity: 0.6 },
  emptyMsg: { fontSize: 13, fontWeight: '500', color: '#64748B', textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.30)',
  },
  emptyCtaText: { fontSize: 13, fontWeight: '600', color: '#60A5FA' },

  // Error
  errorBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  errorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  errorMsg: { fontSize: 13, color: '#F8FAFC', flex: 1 },
  errorCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  errorCtaText: { fontSize: 10, fontWeight: '600', color: '#EF4444' },
});
