import { StyleSheet } from 'react-native';

// ─── Input styles v3 — KEX GROUP Dashboard ────────────────────────────────────
// Source: inputs (1).html § 01 + § 04 + § 05

export const inputStyles = StyleSheet.create({
  // ─── Field wrapper ────────────────────────────────────────────────────────────
  field: { gap: 6, marginBottom: 14 },

  // ─── Label ───────────────────────────────────────────────────────────────────
  label: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  labelRequired: { color: '#EF4444' },

  // ─── Input row ────────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },

  // sizes
  sizeSm: { height: 36, paddingHorizontal: 12, borderRadius: 10 },
  sizeMd: { height: 48, paddingHorizontal: 16, borderRadius: 12 },
  sizeLg: { height: 56, paddingHorizontal: 20, borderRadius: 14 },

  // ─── State borders ────────────────────────────────────────────────────────────
  borderDefault:  { borderWidth: 1, borderColor: '#334155' },
  borderFocused:  { borderWidth: 2, borderColor: '#2563EB' },
  borderError:    { borderWidth: 2, borderColor: '#EF4444' },
  borderSuccess:  { borderWidth: 2, borderColor: '#22C55E' },
  borderDisabled: { borderWidth: 1, borderColor: '#1E293B', backgroundColor: '#1E293B' },

  // ─── TextInput itself ─────────────────────────────────────────────────────────
  input: {
    flex: 1,
    color: '#F8FAFC',
    padding: 0,         // override RN default
  },
  inputSm: { fontSize: 13 },
  inputMd: { fontSize: 15 },
  inputLg: { fontSize: 16 },
  inputDisabled:  { color: '#475569' },
  inputError:     { color: '#F87171' },

  // ─── Helper row ───────────────────────────────────────────────────────────────
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helperDefault: { fontSize: 11, fontWeight: '400', color: '#94A3B8' },
  helperFocused: { color: '#60A5FA' },
  helperError:   { color: '#F87171' },
  helperSuccess: { color: '#4ADE80' },
});
