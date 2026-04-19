import { StyleSheet } from 'react-native';

// ─── KPICard styles v3 — KEX GROUP Dashboard ──────────────────────────────────
// Source: kpi-row (1).html

export const kpiStyles = StyleSheet.create({
  // ─── Card ─────────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,          // width set inline per kind
    gap: 6,
    minWidth: 0,
  },

  // ─── Header row ───────────────────────────────────────────────────────────────
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#94A3B8',           // overridden inline per kind
  },

  // ─── Value ────────────────────────────────────────────────────────────────────
  value: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'FiraCode-Bold',
    letterSpacing: -0.5,
    lineHeight: 28,
    color: '#F8FAFC',           // overridden for negative balance
  },
  valueEmpty: { color: '#475569' },

  // ─── Delta row ────────────────────────────────────────────────────────────────
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  deltaPct: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
  },
  deltaVs: { fontSize: 11, fontWeight: '400', color: '#64748B' },

  // ─── Period ───────────────────────────────────────────────────────────────────
  period: { fontSize: 10, fontWeight: '400', color: '#64748B', marginTop: 2 },

  // ─── Loading skeleton ─────────────────────────────────────────────────────────
  skBlock: { backgroundColor: '#1E293B', borderRadius: 4 },
  skValue: { height: 26, borderRadius: 6, marginBottom: 4 },
  skDelta: { height: 10, width: 110, borderRadius: 4 },
  skPeriod: { height: 8, width: 80, borderRadius: 3 },

  // ─── Empty state ──────────────────────────────────────────────────────────────
  emptyValue: { fontSize: 22, color: '#475569' },
  noDataText: { fontSize: 10, color: '#64748B', marginTop: 2 },

  // ─── Error state ──────────────────────────────────────────────────────────────
  errorBody: { gap: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorMsg: { fontSize: 12, fontWeight: '500', color: '#F87171', flex: 1 },
  errorDetail: { fontSize: 10, color: '#64748B' },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  retryText: { fontSize: 10, fontWeight: '600', color: '#EF4444' },

  // ─── Row ──────────────────────────────────────────────────────────────────────
  row: { flexDirection: 'row', gap: 12 },
});
