import { StyleSheet } from 'react-native';

// ─── Button styles v3 — KEX GROUP Dashboard ───────────────────────────────────
// Source: buttons (1).html
// All hex values sourced from design tokens (no hardcoded colors outside theme)

export const buttonStyles = StyleSheet.create({
  // ─── Base container ──────────────────────────────────────────────────────────
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  fullWidth: { width: '100%' },

  // ─── Sizes ───────────────────────────────────────────────────────────────────
  sizeXs: { height: 28, paddingHorizontal: 10, minWidth: 80 },
  sizeSm: { height: 36, paddingHorizontal: 14, minWidth: 100 },
  sizeMd: { height: 44, paddingHorizontal: 20, minWidth: 140 },
  sizeLg: { height: 52, paddingHorizontal: 24, minWidth: 160 },

  // icon-only sizes
  iconOnlyMd: { width: 44, height: 44, minWidth: 44, paddingHorizontal: 0 },
  iconOnlyXs: { width: 32, height: 32, minWidth: 32, paddingHorizontal: 0 },

  // ─── Shapes ──────────────────────────────────────────────────────────────────
  shapeRounded: { borderRadius: 12 },
  shapePill:    { borderRadius: 9999 },
  shapeIconRounded:   { borderRadius: 12 },
  shapeIconRoundedXs: { borderRadius: 10 },

  // ─── Primary variant ─────────────────────────────────────────────────────────
  primaryDefault:  { backgroundColor: '#2563EB' },
  primaryPressed:  { backgroundColor: '#1D4ED8' },
  primaryDisabled: { backgroundColor: '#334155' },
  primaryLoading:  { backgroundColor: '#2563EB' },

  // ─── Secondary variant ────────────────────────────────────────────────────────
  secondaryDefault:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#334155' },
  secondaryPressed:  { backgroundColor: '#1E293B',     borderWidth: 1.5, borderColor: '#475569' },
  secondaryDisabled: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#1E293B' },
  secondaryLoading:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#334155' },

  // ─── Tertiary variant (accent outline) ───────────────────────────────────────
  tertiaryDefault:  { backgroundColor: 'transparent',          borderWidth: 1.5, borderColor: '#2563EB' },
  tertiaryPressed:  { backgroundColor: 'rgba(37,99,235,0.10)', borderWidth: 1.5, borderColor: '#2563EB' },
  tertiaryDisabled: { backgroundColor: 'transparent',          borderWidth: 1.5, borderColor: '#1E293B' },
  tertiaryLoading:  { backgroundColor: 'transparent',          borderWidth: 1.5, borderColor: '#2563EB' },

  // ─── Ghost variant ────────────────────────────────────────────────────────────
  ghostDefault:  { backgroundColor: 'transparent' },
  ghostPressed:  { backgroundColor: '#1E293B' },
  ghostDisabled: { backgroundColor: 'transparent' },
  ghostLoading:  { backgroundColor: '#1E293B' },

  // ─── Destructive variant ──────────────────────────────────────────────────────
  destructiveDefault:  { backgroundColor: '#EF4444' },
  destructivePressed:  { backgroundColor: '#DC2626' },
  destructiveDisabled: { backgroundColor: '#334155' },
  destructiveLoading:  { backgroundColor: '#EF4444' },

  // ─── Label sizes ─────────────────────────────────────────────────────────────
  labelXs: { fontSize: 12, fontWeight: '600', letterSpacing: 0 },
  labelSm: { fontSize: 13, fontWeight: '600', letterSpacing: 0 },
  labelMd: { fontSize: 15, fontWeight: '600', letterSpacing: 0 },
  labelLg: { fontSize: 16, fontWeight: '600', letterSpacing: 0 },

  // ─── Label colors ─────────────────────────────────────────────────────────────
  labelWhite:        { color: '#FFFFFF' },
  labelDefault:      { color: '#F8FAFC' },
  labelAccentLight:  { color: '#60A5FA' },
  labelDisabled:     { color: '#64748B' },
  labelSecDisabled:  { color: '#475569' },
});
