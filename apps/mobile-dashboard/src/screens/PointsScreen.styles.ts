import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60 },
  title: {
    color: colors.textPrimary, fontSize: 26, fontWeight: '700',
    letterSpacing: -0.8,
  },
  total: {
    color: colors.textSecondary, fontSize: 14, marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, marginTop: 12, paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1, color: colors.textPrimary, fontSize: 14,
    paddingVertical: 12,
  },
  list: { flex: 1 },
  listContent: { paddingTop: 12, paddingBottom: 100 },
});
