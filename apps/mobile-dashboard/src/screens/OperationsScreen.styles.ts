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
  card: {
    backgroundColor: '#12122A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  opRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  opHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opDate: { fontSize: 12, color: colors.textSecondary },
  opAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  opComment: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  opFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeIiko: { backgroundColor: 'rgba(16,185,129,0.15)' },
  sourceBadge1C: { backgroundColor: 'rgba(99,102,241,0.15)' },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  coeffLabel: { fontSize: 11, color: colors.textTertiary },
  coeffValue: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 32,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
});
