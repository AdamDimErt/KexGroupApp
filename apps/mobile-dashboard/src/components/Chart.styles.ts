import { StyleSheet } from 'react-native';

// ─── Chart styles v3 — KEX GROUP Dashboard ────────────────────────────────────
// Source: chart (1).html

export const chartStyles = StyleSheet.create({
  // ─── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },

  // ─── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  title: { fontSize: 14, fontWeight: '600', color: '#F8FAFC' },
  titleSuffix: { fontSize: 12, fontWeight: '400', color: '#94A3B8' },

  // ─── Period tabs ──────────────────────────────────────────────────────────────
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
    gap: 0,
  },
  periodTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  periodTabActive: { backgroundColor: '#1E293B' },
  periodTabText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    color: '#94A3B8',
  },
  periodTabTextActive: { color: '#60A5FA' },

  // ─── Chart body ───────────────────────────────────────────────────────────────
  chartBody: {
    height: 150,
    position: 'relative',
    marginTop: 8,
  },

  // Grid lines
  grid: { position: 'absolute', left: 0, right: 40, top: 0, bottom: 0 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    borderStyle: 'dashed',
  },
  gridLabel: {
    position: 'absolute',
    right: -44,
    top: -7,
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'FiraCode-Regular',
    color: '#94A3B8',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridLabelAvg: { color: '#64748B' },

  // Bars container
  bars: {
    position: 'absolute',
    left: 0,
    right: 40,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },

  // Single bar column
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: '100%',
    minHeight: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  // Over-label (active bar)
  overLabel: {
    position: 'absolute',
    bottom: '100%',
    alignItems: 'center',
    gap: 1,
    marginBottom: 6,
    pointerEvents: 'none' as any,
  },
  overAmt: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'FiraCode-Bold',
    color: '#60A5FA',
  },
  overDelta: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    color: '#22C55E',
  },

  // ─── X-axis ───────────────────────────────────────────────────────────────────
  xAxis: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 40,
    marginTop: 8,
  },
  xLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    color: '#94A3B8',
  },
  xLabelActive:   { color: '#60A5FA', fontWeight: '700' },
  xLabelCritical: { color: '#EF4444' },

  // DOW variant (B)
  xLabelCol: { flex: 1, alignItems: 'center' },
  xDow: { fontSize: 9, fontWeight: '500', color: '#64748B' },
  xNum: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  xDowActive: { color: '#60A5FA' },

  // ─── States ───────────────────────────────────────────────────────────────────
  skBar: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#1E293B',
  },
  skLabel: { width: 24, height: 10, borderRadius: 3, backgroundColor: '#1E293B' },

  // Empty
  emptyBody: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyMsg: { fontSize: 14, fontWeight: '500', color: '#64748B', textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.30)',
  },
  emptyCtaText: { fontSize: 13, fontWeight: '600', color: '#60A5FA' },
});
