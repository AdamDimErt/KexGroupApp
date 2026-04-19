import { StyleSheet } from 'react-native';

// ─── Chip styles v3 — KEX GROUP Dashboard ─────────────────────────────────────
// Source: chips-badges.html § 1

export const chipStyles = StyleSheet.create({
  // Base chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    gap: 6,
    overflow: 'hidden',
  },

  // Sizes
  sizeSm: { height: 24, paddingHorizontal: 10 },
  sizeMd: { height: 32, paddingHorizontal: 14 },
  sizeLg: { height: 40, paddingHorizontal: 18 },

  // States
  stateDefault:  { backgroundColor: 'transparent', borderColor: '#334155' },
  stateActive:   { backgroundColor: '#2563EB',     borderColor: 'transparent' },
  statePressed:  { backgroundColor: '#1D4ED8',     borderColor: 'transparent' },
  stateDisabled: { backgroundColor: '#1E293B',     borderColor: '#1E293B' },

  // Label
  labelSm: { fontSize: 11, fontWeight: '600', fontFamily: 'FiraCode-SemiBold', letterSpacing: 0.2 },
  labelMd: { fontSize: 12, fontWeight: '600', fontFamily: 'FiraCode-SemiBold', letterSpacing: 0.2 },
  labelLg: { fontSize: 14, fontWeight: '600', fontFamily: 'FiraCode-SemiBold', letterSpacing: 0.2 },

  labelDefault:  { color: '#94A3B8' },
  labelActive:   { color: '#FFFFFF' },
  labelDisabled: { color: '#475569' },

  // Remove button
  removeBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
  },
});
