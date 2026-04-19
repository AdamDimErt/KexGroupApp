import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 84, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.navBg,
    borderTopWidth: 1, borderTopColor: colors.borderColor,
    paddingBottom: 16,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 8 },
  iconPill: {
    width: 44, height: 28, borderRadius: 8, // radii.md
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: 'rgba(37,99,235,0.12)', // spec: 0.12 (not accentGlow at 0.25)
    borderColor: colors.accentDefault,
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.bg,
  },
  label: { fontSize: 10, fontWeight: '400', color: colors.textTertiary },
  labelActive: { color: colors.accentLight, fontWeight: '500' },
  indicator: {
    height: 2, width: 22, borderRadius: 2,
    backgroundColor: colors.accentDefault, marginTop: 2,
  },
});
