import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 60 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  periodRow: { flexDirection: 'row', gap: 6, marginTop: 16 },
  periodPill: {
    flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  periodPillActive: {
    backgroundColor: colors.accent, borderColor: 'transparent',
  },
  periodText: { color: colors.textTertiary, fontSize: 12 },
  periodTextActive: { color: '#FFF', fontWeight: '700' },
  body: { paddingHorizontal: 20, marginTop: 16, gap: 16 },
  // KPI
  kpiRow: { gap: 10, paddingRight: 4 },
  kpiCard: {
    minWidth: 160, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 16,
  },
  kpiCardGradient: {
    backgroundColor: colors.accent, borderColor: 'rgba(59,130,246,0.4)',
  },
  kpiLabelWhite: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiValueWhite: { color: '#FFF', fontSize: 20, fontWeight: '500', marginTop: 6 },
  kpiLabel: { color: colors.textLabel, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '500', marginTop: 6 },
  kpiChangeGreen: { color: colors.green, fontSize: 12, marginTop: 4 },
  kpiChange: { color: colors.textLabel, fontSize: 12, marginTop: 4 },
  kpiSource: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },
  kpiSourceDim: { color: colors.textTertiary, fontSize: 10, marginTop: 2 },
  // Chart
  chartCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 16,
  },
  chartTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 14 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chartLabel: { color: colors.textTertiary, fontSize: 10, width: 60 },
  chartBarsWrap: { flex: 1, gap: 3 },
  chartBarFact: { height: 8, backgroundColor: '#3B82F6', borderRadius: 4 },
  chartBarPlan: { height: 8, backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 4 },
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { color: colors.textLabel, fontSize: 11 },
  // Ranking
  rankCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 16,
  },
  rankTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  rankRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(59,130,246,0.06)' },
  rankCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#112338', alignItems: 'center', justifyContent: 'center',
  },
  rankNum: { color: colors.textSecondary, fontSize: 11 },
  rankName: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  rankRevenue: { color: colors.textPrimary, fontSize: 13 },
  rankPct: { fontSize: 12, fontWeight: '500', width: 38, textAlign: 'right' },
  // Export
  exportRow: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.28)',
  },
  exportText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
});
