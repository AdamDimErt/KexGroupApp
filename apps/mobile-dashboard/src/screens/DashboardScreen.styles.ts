import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 60,
  },
  greeting: { color: colors.textTertiary, fontSize: 12 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.6, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: { position: 'relative', padding: 4 },
  logoutBtn: { padding: 6 },
  bellIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute', top: 2, right: 2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.bg,
  },
  // Period selector
  periodRow: { marginTop: 16 },
  periodRowContent: { paddingHorizontal: 16, gap: 8 },
  periodChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.bgCard,
  },
  periodChipActive: {
    borderColor: colors.accentDefault,
    backgroundColor: colors.accentDefault,
  },
  periodChipText: { color: colors.textTertiary, fontSize: 13, fontWeight: '500' },
  periodChipTextActive: { color: '#FFF' },
  // Hero Card
  heroCard: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 20, overflow: 'hidden',
    backgroundColor: colors.accentDefault,
    borderWidth: 1, borderColor: colors.borderActive,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroSourceRow: { flexDirection: 'row', gap: 4 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  heroBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '500' },
  heroAmount: { color: '#FFF', fontSize: 36, fontWeight: '500', letterSpacing: -1.5, marginTop: 6 },
  // PnL-стили удалены — блок убран до подключения 1С (см. DashboardScreen.tsx).
  heroSparkWrap: { marginTop: 10, marginHorizontal: -4 },
  heroSubRow: { flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' },
  heroGreen: { color: colors.green, fontSize: 12 },
  heroGray: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  // List
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  listTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  listCount: { color: colors.textTertiary, fontSize: 12 },
  // Balances
  balancesLabel: {
    color: colors.textTertiary, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.8, paddingHorizontal: 16, marginTop: 8, marginBottom: 8,
  },
  balancesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  balanceCard: {
    flex: 1, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.borderColor,
    borderRadius: 12, padding: 14,
  },
  balanceBank: { color: colors.textTertiary, fontSize: 11 },
  balanceAmount: { color: colors.textPrimary, fontSize: 15, fontWeight: '500', marginTop: 2 },
  balanceUpd: { color: colors.textTertiary, fontSize: 10, marginTop: 2 },
  // KPI row (three cards)
  kpiRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,  // flat alias added in Wave 5
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Sync indicator
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 11,
  },
  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  skeletonPeriodRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: colors.red,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  errorMessage: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentDefault,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
