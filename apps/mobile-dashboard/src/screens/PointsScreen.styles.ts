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
    backgroundColor: colors.bgInput as string,
    borderWidth: 1, borderColor: colors.borderColor,
    borderRadius: 14, marginTop: 12, paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1, color: colors.textPrimary, fontSize: 14,
    paddingVertical: 12,
  },
  list: { flex: 1 },
  listContent: { paddingTop: 12, paddingBottom: 100 },

  // Brand filter chips — horizontal scroller above the list
  chipsScroll: { flexGrow: 0, marginTop: 14 },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.4,
  },
  chipCount: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  // Brand group header — section title between groups when no filter is active
  groupGap: { marginTop: 10 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  groupBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'FiraCode-Bold',
    letterSpacing: 0.6,
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  groupMeta: {
    color: colors.textTertiary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },

  // Loading skeletons
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error state
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  errorIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  errorTitle: {
    color: colors.red,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
