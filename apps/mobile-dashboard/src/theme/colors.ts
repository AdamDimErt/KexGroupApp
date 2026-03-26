// Дизайн-токены цветов из Figma дизайна HoldingView
export const colors = {
  // Фон
  bg: '#060E1A',
  bgCard: '#0D1B2E',
  bgInput: 'rgba(59,130,246,0.06)',

  // Границы
  border: 'rgba(59,130,246,0.08)',
  borderFocused: 'rgba(59,130,246,0.28)',
  borderRed: 'rgba(239,68,68,0.20)',
  borderActive: 'rgba(59,130,246,0.30)',

  // Акценты
  accent: '#2563EB',      // Electric Blue
  accentDark: '#1D4ED8',
  accentLight: '#60A5FA',
  accentGlow: 'rgba(37,99,235,0.35)',

  // Статусы
  green: '#10B981',      // Emerald — рост / в плане
  greenBg: 'rgba(16,185,129,0.12)',
  yellow: '#F59E0B',      // Amber — предупреждение
  yellowBg: 'rgba(245,158,11,0.12)',
  red: '#EF4444',      // Red — критично
  redBg: 'rgba(239,68,68,0.12)',

  // Текст
  textPrimary: '#EFF6FF',
  textSecondary: 'rgba(239,246,255,0.5)',
  textTertiary: 'rgba(239,246,255,0.25)',
  textMuted: 'rgba(239,246,255,0.18)',
  textLabel: 'rgba(239,246,255,0.40)',

  // Специальные
  white: '#FFFFFF',
  navBg: 'rgba(6,14,26,0.97)',
  heroGradientStart: '#1E3A6E',
  heroGradientEnd: '#2563EB',
  sparkGreen: '#4ADE80',
} as const;
