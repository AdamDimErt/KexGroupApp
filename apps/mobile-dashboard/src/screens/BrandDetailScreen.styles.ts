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
  // Hero Card — brand summary
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
  // Loading / Error
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.red, fontSize: 14, marginTop: 10 },
});
