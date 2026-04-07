import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 60,
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
  periodRowContent: { paddingHorizontal: 20, gap: 8 },
  periodChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  periodChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  periodChipText: { color: colors.textTertiary, fontSize: 13, fontWeight: '500' },
  periodChipTextActive: { color: '#FFF' },
  // Hero Card
  heroCard: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 20, padding: 22, overflow: 'hidden',
    backgroundColor: colors.accent,
    borderWidth: 1, borderColor: colors.borderActive,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroSourceRow: { flexDirection: 'row', gap: 4 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  heroBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '500' },
  heroAmount: { color: '#FFF', fontSize: 36, fontWeight: '500', letterSpacing: -1.5, marginTop: 6 },
  heroSubRow: { flexDirection: 'row', gap: 12, marginTop: 4, alignItems: 'center' },
  heroGreen: { color: colors.sparkGreen, fontSize: 12 },
  heroGray: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  // List
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  listTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  listCount: { color: colors.textTertiary, fontSize: 12 },
  // Balances
  balancesLabel: {
    color: colors.textTertiary, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.8, paddingHorizontal: 20, marginTop: 8, marginBottom: 8,
  },
  balancesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  balanceCard: {
    flex: 1, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
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
    backgroundColor: '#12122A',
    borderRadius: 12,
    padding: 12,
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
});
