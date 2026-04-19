import { StyleSheet } from 'react-native';

// ─── Badge styles v3 — KEX GROUP Dashboard ────────────────────────────────────
// Source: chips-badges.html § 2 (status) · § 3 (source) · § 4 (metric)

// ─── Status tone tokens (plain objects — NOT StyleSheet, contain color strings) ─

export interface BadgeToneTokens {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const BADGE_TONES: Record<string, BadgeToneTokens> = {
  positive: {
    bg:     'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.30)',
    text:   '#22C55E',
    dot:    '#22C55E',
  },
  negative: {
    bg:     'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.30)',
    text:   '#EF4444',
    dot:    '#EF4444',
  },
  warning: {
    bg:     'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.30)',
    text:   '#F59E0B',
    dot:    '#F59E0B',
  },
  neutral: {
    bg:     'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.25)',
    text:   '#94A3B8',
    dot:    '#475569',
  },
  info: {
    bg:     'rgba(14,165,233,0.10)',
    border: 'rgba(14,165,233,0.30)',
    text:   '#0EA5E9',
    dot:    '#0EA5E9',
  },
};

export const badgeStyles = StyleSheet.create({
  // ─── Status badge ─────────────────────────────────────────────────────────────
  status: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // ─── Source badge ─────────────────────────────────────────────────────────────
  source: {
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  sourceSolid:        { backgroundColor: '#F8FAFC', borderWidth: 0 },
  sourceOutline:      { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  sourceTextSolid:    { fontSize: 10, fontWeight: '600', fontFamily: 'FiraCode-SemiBold', letterSpacing: 0.6, textTransform: 'uppercase', color: '#0F172A' },
  sourceTextOutline:  { fontSize: 10, fontWeight: '600', fontFamily: 'FiraCode-SemiBold', letterSpacing: 0.6, textTransform: 'uppercase', color: '#94A3B8' },

  // ─── Metric badge ─────────────────────────────────────────────────────────────
  metric: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    letterSpacing: 0.2,
  },
  metricPositive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  metricNegative: { backgroundColor: 'rgba(239,68,68,0.15)' },
  metricNeutral:  { backgroundColor: '#1E293B' },

  // ─── Skeleton ─────────────────────────────────────────────────────────────────
  skeleton: {
    width: 48,
    height: 24,
    borderRadius: 9999,
    backgroundColor: '#1E293B',
  },
});
