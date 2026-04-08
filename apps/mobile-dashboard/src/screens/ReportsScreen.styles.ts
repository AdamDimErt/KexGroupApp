import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },

  reportCard: {
    backgroundColor: '#12122A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  reportTotal: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  reportLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  reportValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reportBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  reportError: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    padding: 12,
  },
  reportEmpty: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    padding: 12,
    fontStyle: 'italic',
  },
  // DDS expandable group rows
  ddsGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ddsRestaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginLeft: 16,
    marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
  },
  ddsChevron: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  ddsPct: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginLeft: 4,
    marginRight: 8,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
    height: 80,
    paddingHorizontal: 4,
  },
  trendBar: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 1,
  },
  trendBarFill: {
    width: '80%',
    backgroundColor: colors.accent,
    borderRadius: 2,
    minHeight: 2,
  },
  trendBarLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 4,
  },
});
