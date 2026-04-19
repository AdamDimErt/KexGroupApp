// Design tokens v3 — KEX GROUP Financial Dashboard
// Source: 19 approved HTML prototypes in C:\Users\Acer\Downloads\
// Dark mode OLED primary; light mode kept for gradual migration (TODO)

// ─── Background hierarchy ────────────────────────────────────────────────────
// Source: colors-core (1).html lines 180-199, 493-495

const bg = {
  bg:          '#020617', // slate-950 · OLED app base
  bgCard:      '#0F172A', // slate-900 · cards / sheets · DEFAULT surface
  bgCardElev:  '#1E293B', // slate-800 · modals / hover / tooltip body
} as const;

// ─── Text hierarchy (5 solid-hex levels) ─────────────────────────────────────
// Source: colors-text.html lines 459-482; type-headings (1).html 499-501
// RULE: NEVER opacity for text — always solid hex (colors-text.html:494)

const text = {
  default:   '#F8FAFC', // slate-50  · headings, KPI, primary body        · AAA 18.5 on bg
  secondary: '#CBD5E1', // slate-300 · supporting text, secondary body     · AAA
  muted:     '#94A3B8', // slate-400 · captions, metadata, timestamps      · AA 6.8
  tertiary:  '#64748B', // slate-500 · labels, dates, IDs (avoid on bgCardElev — fails AA)
  disabled:  '#475569', // slate-600 · decoration / placeholder ONLY
  inverse:   '#0F172A', // slate-900 · text on light solid bg (iiko/1С source badges)
  link:      '#60A5FA', // blue-400  · inline links · AAA 8.9
} as const;

// ─── Accent (brand / CTA) ─────────────────────────────────────────────────────
// Source: colors-core (1).html lines 207-239
// RULE: accent = BLUE. Never green (#22C55E = positive, separate semantic)

const accent = {
  default: '#2563EB', // blue-600 · primary CTA, active nav    · AA 5.1
  dark:    '#1D4ED8', // blue-700 · pressed state SURFACE ONLY  · not for text
  light:   '#60A5FA', // blue-400 · text links, soft accents   · AAA 8.9
  hover:   '#1E40AF', // blue-800 · hover surface              · not for text
  glow:    'rgba(37,99,235,0.25)', // focus ring base (25%)
} as const;

// ─── Semantic status ──────────────────────────────────────────────────────────
// Source: colors-core (1).html lines 277-306; colors-status.html lines 297-332
// RULE: use token names, not color names (positive/warning/danger/info)

const status = {
  positive:      '#22C55E', // green-500  · +Δ revenue, sync OK     · AAA 9.8
  positiveDark:  '#16A34A', // green-600  · pressed SURFACE ONLY
  positiveLight: '#4ADE80', // green-400  · badges, micro accents    · AAA 12.4
  warning:       '#F59E0B', // amber-500  · cash discrepancies       · AAA 10.2
  danger:        '#EF4444', // red-500    · loss, sync error         · AA 5.9 (fails on bgCardElev!)
  info:          '#0EA5E9', // sky-500    · neutral notifications    · AA 7.1
  // BREAKING: old blue=#3B82F6 → info=#0EA5E9 (sky, not blue)
} as const;

// ─── Tinted pill backgrounds (bg 15% / border 30% / text solid) ──────────────
// Source: colors-core (1).html lines 365-414; colors-status.html lines 336-370
// RULE: always 0.15 bg + 0.30 border. Old code used 0.12 — corrected here.

const pill = {
  positive: {
    bg:     'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.30)',
    text:   '#22C55E',
  },
  warning: {
    bg:     'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.30)',
    text:   '#F59E0B',
  },
  danger: {
    bg:     'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.30)',
    text:   '#EF4444',
  },
  info: {
    bg:     'rgba(14,165,233,0.15)',
    border: 'rgba(14,165,233,0.30)',
    text:   '#0EA5E9',
  },
  accent: {
    bg:     'rgba(37,99,235,0.15)',
    border: 'rgba(37,99,235,0.30)',
    text:   '#60A5FA', // accent-light for text on tint
  },
  neutral: {
    bg:     '#1E293B', // bgCardElev
    border: '#334155',
    text:   '#64748B', // text-tertiary
  },
} as const;

// ─── Borders ──────────────────────────────────────────────────────────────────
// Source: colors-core (1).html lines 467-489
// BREAKING: old rgba opacity borders → solid hex

const border = {
  subtle:  '#1E293B', // 1px · dividers inside cards
  default: '#334155', // 1px · card outlines, inputs
  strong:  '#475569', // 2px · focus ring, active fields
  danger:  '#EF4444', // 2px · error state input border
  focused: '#2563EB', // 2px · focused input (accent, not rgba)
  active:  '#1D4ED8', // accent-dark border for pressed state
} as const;

// ─── Brand badges (BNA / DNA) ─────────────────────────────────────────────────
// Source: restaurant-card.html lines 96-112; shadows (1).html lines 233-241
// RULE: DNA uses violet — must NOT collide with food category #8B5CF6

const brand = {
  bna: {
    bg:     'rgba(37,99,235,0.15)',  // accent-tint 15%
    border: 'rgba(37,99,235,0.30)',  // accent-tint 30%
    text:   '#60A5FA',               // accent-light
  },
  dna: {
    bg:     'rgba(168,85,247,0.15)', // violet-tint 15%
    border: 'rgba(168,85,247,0.30)', // violet-tint 30%
    text:   '#C4B5FD',               // violet-300
  },
} as const;

// ─── Chart colors ─────────────────────────────────────────────────────────────
// Source: chart (1).html lines 130-134, 553

const chart = {
  bar:         '#2563EB', // above-avg
  barDark:     '#1D4ED8', // below-avg (accent-dark)
  barSelected: '#60A5FA', // active/selected day (accent-light)
  barZero:     '#475569', // zero revenue
  barCrit:     '#EF4444', // critical (≤10% of avg)
  avgLine:     '#64748B', // dashed average line (was opacity 0.3)
  grid:        '#1E293B', // grid lines (was opacity 0.06)
} as const;

// ─── Interactive states ───────────────────────────────────────────────────────
// Source: colors-core (1).html lines 418-459

const interactive = {
  btnDefault: '#2563EB',
  btnHover:   '#1E40AF',
  btnPressed: '#1D4ED8',
  // Focus: border 2px #60A5FA + outline-offset 2
} as const;

// ─── Specials ─────────────────────────────────────────────────────────────────

const specials = {
  white:    '#FFFFFF',
  black:    '#000000',
  navBg:    'rgba(2,6,23,0.97)',   // bottom nav glass
  srcBadgeBg:   '#F8FAFC',        // iiko/1С source badge background
  srcBadgeText: '#0F172A',        // text-inverse on light badge
  // TODO Wave 3: remove heroGradientStart/End after HeroCard migration to solid bg + border-left
  heroGradientStart: '#0F172A',   // deprecated — hero-card now solid bg, no gradient
  heroGradientEnd:   '#1E293B',   // deprecated — remove in Wave 3
} as const;

// ─── Backward-compat flat keys (for App.tsx + components until Wave 3) ───────
// Components use colors.textPrimary, colors.accent (flat), colors.border (flat),
// colors.accentLight, colors.accentDark, colors.green/red/yellow/greenBg/redBg/yellowBg
// These shadow the nested equivalents so old code compiles without change.

const flatAliases = {
  // Text — flat shortcuts (old API)
  textPrimary:   text.default,    // → text.default
  textSecondary: text.secondary,  // → text.secondary
  textMuted:     text.muted,      // → text.muted
  textTertiary:  text.tertiary,   // → text.tertiary
  textDisabled:  text.disabled,   // → text.disabled
  textLink:      text.link,       // → text.link
  textLabel:     text.muted,      // legacy textLabel → muted (#94A3B8)

  // Accent — flat shortcuts (old API: colors.accent used as string)
  // NOTE: colors.accent is now nested object; these flat aliases allow
  //   colors.accentDefault / colors.accentDark / colors.accentLight to work.
  // ALSO: colors.accentFlat is a flat string alias for colors.accent.default
  //   so that StyleSheet.create({ color: colors.accentFlat }) compiles.
  accentDefault: accent.default,
  accentDark:    accent.dark,
  accentLight:   accent.light,
  accentHover:   accent.hover,
  accentGlow:    accent.glow,
  // Legacy flat alias — screens that use colors.accent as a flat string
  // must use colors.accentDefault instead. This alias added for compat.
  accentFlat:    accent.default,  // same as accentDefault

  // Status — flat shortcuts
  green:    status.positive,
  yellow:   status.warning,
  red:      status.danger,
  blue:     status.info, // deprecated: info=#0EA5E9 (sky), not blue

  // Tinted pill BGs — flat shortcuts (old greenBg/yellowBg/redBg/blueBg)
  greenBg:  pill.positive.bg,
  yellowBg: pill.warning.bg,
  redBg:    pill.danger.bg,
  blueBg:   pill.info.bg,

  // Border — flat single value (old: colors.border → now border.default)
  borderColor:  border.default,  // named borderColor to avoid clash with nested border object
  // Additional flat border aliases for legacy screens
  borderSubtle:  border.subtle,  // was missing, used by DashboardScreen.styles
  borderDefault: border.default,
  borderStrong:  border.strong,
  borderFocused: border.focused,
  borderActive:  border.active,  // was deleted, restored here
  borderDanger:  border.danger,
  borderRed:     border.danger,

  // Restored legacy fields (removed in Wave 2, needed by old screens)
  bgInput:    'rgba(37,99,235,0.06)' as string,  // LoginScreen.styles, PointsScreen.styles
  sparkGreen: '#10B981' as string,               // DashboardScreen.styles, BrandDetailScreen.styles
} as const;

// ─── Dark colors (PRIMARY) ───────────────────────────────────────────────────

export const darkColors = {
  // Backgrounds
  ...bg,

  // Text (nested)
  text,

  // Accent (nested)
  accent,

  // Status (nested)
  status,

  // Pill tints (nested)
  pill,

  // Borders (nested)
  border,

  // Brand badges (nested)
  brand,

  // Chart
  chart,

  // Interactive
  interactive,

  // Specials
  ...specials,

  // Flat backward-compat aliases (remove in Wave 5)
  ...flatAliases,
} as const;

// ─── Light colors (TODO — not updated to v3 nested structure yet) ─────────────
// Kept as stub for useThemeStore toggle. Wave 3+ will align.
export const lightColors = {
  bg:          '#F8FAFC',
  bgCard:      '#FFFFFF',
  bgCardElev:  '#F1F5F9',

  text: {
    default:   '#0F172A',
    secondary: '#334155',
    muted:     '#64748B',
    tertiary:  '#94A3B8',
    disabled:  '#CBD5E1',
    inverse:   '#F8FAFC',
    link:      '#2563EB',
  },

  accent: {
    default: '#2563EB',
    dark:    '#1D4ED8',
    light:   '#60A5FA',
    hover:   '#1E40AF',
    glow:    'rgba(37,99,235,0.15)',
  },

  status: {
    positive:      '#16A34A',
    positiveDark:  '#15803D',
    positiveLight: '#22C55E',
    warning:       '#D97706',
    danger:        '#DC2626',
    info:          '#0284C7',
  },

  pill: {
    positive: { bg: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.25)', text: '#16A34A' },
    warning:  { bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.25)', text: '#D97706' },
    danger:   { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.25)', text: '#DC2626' },
    info:     { bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.25)', text: '#0284C7' },
    accent:   { bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.25)', text: '#2563EB' },
    neutral:  { bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B' },
  },

  border: {
    subtle:  '#E2E8F0',
    default: '#CBD5E1',
    strong:  '#94A3B8',
    danger:  '#DC2626',
    focused: '#2563EB',
    active:  '#1D4ED8',
  },

  brand: {
    bna: { bg: 'rgba(37,99,235,0.10)', border: 'rgba(37,99,235,0.25)', text: '#2563EB' },
    dna: { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)', text: '#7C3AED' },
  },

  chart: {
    bar:         '#2563EB',
    barDark:     '#1D4ED8',
    barSelected: '#60A5FA',
    barZero:     '#94A3B8',
    barCrit:     '#DC2626',
    avgLine:     '#94A3B8',
    grid:        '#E2E8F0',
  },

  interactive: {
    btnDefault: '#2563EB',
    btnHover:   '#1E40AF',
    btnPressed: '#1D4ED8',
  },

  white:    '#FFFFFF',
  black:    '#000000',
  navBg:    'rgba(248,250,252,0.97)',
  srcBadgeBg:   '#0F172A',
  srcBadgeText: '#F8FAFC',
  heroGradientStart: '#E2E8F0',
  heroGradientEnd:   '#CBD5E1',

  // Flat backward-compat aliases (mirrors darkColors flatAliases)
  textPrimary:   '#0F172A',
  textSecondary: '#334155',
  textMuted:     '#64748B',
  textTertiary:  '#94A3B8',
  textDisabled:  '#CBD5E1',
  textLink:      '#2563EB',
  textLabel:     '#64748B',
  accentDefault: '#2563EB',
  accentDark:    '#1D4ED8',
  accentLight:   '#60A5FA',
  accentHover:   '#1E40AF',
  accentGlow:    'rgba(37,99,235,0.15)',
  accentFlat:    '#2563EB',
  green:         '#16A34A',
  yellow:        '#D97706',
  red:           '#DC2626',
  blue:          '#0284C7',
  greenBg:       'rgba(22,163,74,0.12)',
  yellowBg:      'rgba(217,119,6,0.12)',
  redBg:         'rgba(220,38,38,0.12)',
  blueBg:        'rgba(2,132,199,0.12)',
  borderColor:   '#CBD5E1',
  borderSubtle:  '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderStrong:  '#94A3B8',
  borderFocused: '#2563EB',
  borderActive:  '#1D4ED8',
  borderDanger:  '#DC2626',
  borderRed:     '#DC2626',
  bgInput:       'rgba(37,99,235,0.06)',
  sparkGreen:    '#16A34A',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DarkColors  = typeof darkColors;
export type LightColors = typeof lightColors;
// Union type for both modes — components should use ThemeColors
export type ThemeColors = DarkColors | LightColors;

// ─── Default export (dark mode) ───────────────────────────────────────────────

export const colors: DarkColors = darkColors;

// ─── Deprecated flat aliases — for gradual Wave 3 migration ──────────────────
// These map old flat keys to their v3 nested equivalents so screens don't
// break immediately. Remove after Wave 5 (mass rename).

/** @deprecated use colors.text.default */
export const textPrimary   = darkColors.text.default;
/** @deprecated use colors.text.secondary */
export const textSecondary = darkColors.text.secondary;
/** @deprecated use colors.text.muted */
export const textMuted     = darkColors.text.muted;
/** @deprecated use colors.text.tertiary */
export const textTertiary  = darkColors.text.tertiary;
/** @deprecated use colors.status.positive */
export const green         = darkColors.status.positive;
/** @deprecated use colors.status.warning */
export const yellow        = darkColors.status.warning;
/** @deprecated use colors.status.danger */
export const red           = darkColors.status.danger;
/** @deprecated use colors.status.info */
export const info          = darkColors.status.info;
/** @deprecated use colors.accent.default */
export const accentFlat    = darkColors.accent.default;
/** @deprecated use colors.bgCardElev */
export const bgCardElevated = darkColors.bgCardElev;
