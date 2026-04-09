// Design tokens from MASTER.md — KEX GROUP Financial Dashboard
// Dark Mode OLED + optional Light Mode

export const darkColors = {
  // Background hierarchy (OLED dark)
  bg: '#020617',           // --color-background (slate-950)
  bgCard: '#0F172A',       // --color-primary (slate-900)
  bgCardElevated: '#1E293B', // --color-secondary (slate-800)
  bgInput: 'rgba(37,99,235,0.06)',
  bgSurface: '#0F172A',

  // Borders
  border: 'rgba(248,250,252,0.08)',
  borderFocused: 'rgba(37,99,235,0.28)',
  borderRed: 'rgba(239,68,68,0.20)',
  borderActive: 'rgba(37,99,235,0.30)',
  borderSubtle: 'rgba(248,250,252,0.05)',

  // Accent / CTA — Electric Blue
  accent: '#2563EB',        // blue-600
  accentDark: '#1D4ED8',    // blue-700
  accentLight: '#60A5FA',   // blue-400
  accentGlow: 'rgba(37,99,235,0.25)',

  // Status indicators
  green: '#22C55E',
  greenBg: 'rgba(34,197,94,0.12)',
  yellow: '#F59E0B',
  yellowBg: 'rgba(245,158,11,0.12)',
  red: '#EF4444',
  redBg: 'rgba(239,68,68,0.12)',
  blue: '#3B82F6',
  blueBg: 'rgba(59,130,246,0.12)',

  // Text hierarchy
  textPrimary: '#F8FAFC',     // --color-text (slate-50)
  textSecondary: 'rgba(248,250,252,0.60)',
  textTertiary: 'rgba(248,250,252,0.35)',
  textMuted: 'rgba(248,250,252,0.20)',
  textLabel: 'rgba(248,250,252,0.45)',

  // Specials
  white: '#FFFFFF',
  black: '#000000',
  navBg: 'rgba(2,6,23,0.97)',
  heroGradientStart: '#0F172A',
  heroGradientEnd: '#1E293B',
  sparkGreen: '#10B981',

  // Chart colors
  chartBar: '#2563EB',
  chartBarSelected: '#60A5FA',
  chartAvgLine: 'rgba(248,250,252,0.3)',
  chartGrid: 'rgba(248,250,252,0.06)',
} as const;

export const lightColors = {
  // Background hierarchy (clean white)
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgCardElevated: '#F1F5F9',
  bgInput: 'rgba(15,23,42,0.04)',
  bgSurface: '#FFFFFF',

  // Borders
  border: 'rgba(15,23,42,0.10)',
  borderFocused: 'rgba(34,197,94,0.40)',
  borderRed: 'rgba(239,68,68,0.25)',
  borderActive: 'rgba(34,197,94,0.35)',
  borderSubtle: 'rgba(15,23,42,0.06)',

  // Accent / CTA (blue)
  accent: '#2563EB',
  accentDark: '#1D4ED8',
  accentLight: '#60A5FA',
  accentGlow: 'rgba(37,99,235,0.15)',

  // Status indicators
  green: '#16A34A',
  greenBg: 'rgba(22,163,74,0.10)',
  yellow: '#D97706',
  yellowBg: 'rgba(217,119,6,0.10)',
  red: '#DC2626',
  redBg: 'rgba(220,38,38,0.10)',
  blue: '#2563EB',
  blueBg: 'rgba(37,99,235,0.10)',

  // Text hierarchy
  textPrimary: '#0F172A',
  textSecondary: 'rgba(15,23,42,0.65)',
  textTertiary: 'rgba(15,23,42,0.40)',
  textMuted: 'rgba(15,23,42,0.25)',
  textLabel: 'rgba(15,23,42,0.50)',

  // Specials
  white: '#FFFFFF',
  black: '#000000',
  navBg: 'rgba(248,250,252,0.97)',
  heroGradientStart: '#E2E8F0',
  heroGradientEnd: '#CBD5E1',
  sparkGreen: '#22C55E',

  // Chart colors
  chartBar: '#16A34A',
  chartBarSelected: '#22C55E',
  chartAvgLine: 'rgba(15,23,42,0.2)',
  chartGrid: 'rgba(15,23,42,0.06)',
} as const;

// ThemeColors uses string for each value so dark and light are assignable
export type ThemeColors = { [K in keyof typeof darkColors]: string };

// Default export — dark mode (current theme state managed by useThemeStore)
export const colors: ThemeColors = darkColors;
