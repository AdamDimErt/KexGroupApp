import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 84, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.navBg,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingBottom: 16,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 8 },
  iconPill: {
    width: 44, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.borderActive,
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.bg,
  },
  label: { fontSize: 10, color: colors.textTertiary },
  labelActive: { color: colors.accentLight, fontWeight: '600' },
  indicator: {
    height: 2, width: 22, borderRadius: 2,
    backgroundColor: colors.accent, marginTop: 2,
  },
});
