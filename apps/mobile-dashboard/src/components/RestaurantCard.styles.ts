import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  cardRed: {
    borderColor: colors.borderRed,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', marginRight: 4 },
  revenue: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 3 },
  devBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  devText: { fontSize: 11, fontWeight: '600' },
  chevron: { color: colors.textTertiary, fontSize: 18 },
  progressBg: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  margin: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 6,
  },
});
