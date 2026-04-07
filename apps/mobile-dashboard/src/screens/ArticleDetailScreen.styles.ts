import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    gap: 12,
  },
  backBtn: { fontSize: 28, color: colors.textPrimary },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  groupTotal: { fontSize: 14, color: colors.textSecondary },
  card: {
    backgroundColor: '#12122A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  articleName: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  articleAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  articleShare: {
    fontSize: 12,
    color: colors.textTertiary,
    width: 45,
    textAlign: 'right',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sourceBadgeIiko: { backgroundColor: 'rgba(16,185,129,0.15)' },
  sourceBadge1C: { backgroundColor: 'rgba(99,102,241,0.15)' },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  changePositive: { color: colors.green, fontSize: 12 },
  changeNegative: { color: colors.red, fontSize: 12 },
  allocBadge: {
    fontSize: 10,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 32,
  },
  chevron: {
    fontSize: 16,
    color: colors.textTertiary,
    marginLeft: 4,
  },
});
