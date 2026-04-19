import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 60 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  sub: { color: colors.textTertiary, fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.borderColor,
    borderRadius: 14, padding: 14, marginHorizontal: 20, marginTop: 8,
  },
  cardUnread: { borderColor: 'rgba(59,130,246,0.2)' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  iconDot: { width: 8, height: 8, borderRadius: 4 },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ntTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  time: { color: colors.textTertiary, fontSize: 11 },
  bodyText: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  unreadDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accentDefault, marginTop: 5,
  },
});
