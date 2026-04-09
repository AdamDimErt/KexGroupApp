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
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  // KPI Grid
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 20, marginTop: 16,
  },
  kpiCard: {
    width: '48%', backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 16,
  },
  kpiBlue: {
    backgroundColor: colors.accent,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { color: 'rgba(239,246,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { color: colors.textPrimary, fontSize: 28, fontWeight: '500', marginTop: 4 },
  srcBadge: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  srcText: { color: colors.accentLight, fontSize: 10, fontWeight: '600' },
  // Chart
  chartCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 20, marginHorizontal: 20, marginTop: 12,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  chartSub: { color: colors.textTertiary, fontSize: 12 },
  chartArea: { position: 'relative', height: 160 },
  planLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(239,246,255,0.15)',
    flexDirection: 'row', justifyContent: 'flex-end',
  },
  planText: { color: colors.textTertiary, fontSize: 10, marginTop: -12 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingTop: 20 },
  barCol: { alignItems: 'center', gap: 6 },
  bar: { backgroundColor: colors.accent, borderRadius: 4 },
  barLabel: { color: colors.textTertiary, fontSize: 10 },
  // Expenses
  expCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 20, marginHorizontal: 20, marginTop: 12,
  },
  expTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 16 },
  expRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  expLabel: { color: colors.textPrimary, fontSize: 13, width: 110 },
  expBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 3, marginRight: 12 },
  expBarFill: { height: '100%', backgroundColor: 'rgba(59,130,246,0.35)', borderRadius: 3 },
  expAmount: { color: colors.red, fontSize: 13, fontWeight: '500', width: 100, textAlign: 'right' },
  // Financial result formula hint
  finFormulaHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 2,
  },
  finResultRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    marginTop: 4,
  },
  // Cash discrepancy table
  discHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  discHeaderCell: {
    flex: 1,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  discRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  discCell: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  // DDS expense group rows (color-coded)
  expGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  expGroupIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  expGroupInfo: {
    flex: 1,
  },
  expGroupName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  expGroupBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
  },
  expGroupRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  expGroupAmount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  expGroupPct: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  // Revenue chart (daily bar chart)
  revenueChartCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  revenueChartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  revenueChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 4,
  },
  revenueChartBarWrapper: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 1,
  },
  revenueChartBar: {
    width: '80%',
    backgroundColor: colors.accent,
    borderRadius: 4,
    minHeight: 2,
  },
  revenueChartLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
});
