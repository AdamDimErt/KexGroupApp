import { ViewStyle } from 'react-native';

// Shadows v3 — KEX GROUP Financial Dashboard
// Source: shadows (1).html lines 73-78, 806-819
//
// DARK MODE RULE: elevation = bg-color FIRST, shadow SECOND.
// A dark shadow on a dark bg is nearly invisible — color separation does the work.
// (shadows (1).html:526, 748)
//
// PLATFORM NOTES:
// - iOS: shadowColor / shadowOffset / shadowOpacity / shadowRadius all render
// - Android: ONLY `elevation` is respected — shadow props ignored
// - Tune elevation integers (2/6/8/12/16) for Android depth approximation

// ─── Elevation shadows (5 levels) ────────────────────────────────────────────
// elev-0 and elev-1 are bg-color only (no shadow object needed)
// elev-0 bg: #020617  elev-1 bg: #0F172A  (use colors.bg / colors.bgCard)

export type ShadowToken = Pick<ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export const shadows = {
  // elev-2: cards / KPI / list rows
  // CSS origin: 0 2px 6px -2px rgba(0,0,0,0.40)
  sm: {
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.40,
    shadowRadius:   6,
    elevation:      2,
  } as ShadowToken,

  // card:hover / lift-via-shadow (same elevation level, stronger shadow)
  // CSS origin: 0 6px 16px -6px rgba(0,0,0,0.50)
  md: {
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.50,
    shadowRadius:   16,
    elevation:      6,
  } as ShadowToken,

  // elev-3: popovers / dropdowns / tooltips
  // CSS origin: 0 8px 16px -4px rgba(0,0,0,0.60)
  lg: {
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 8 },
    shadowOpacity:  0.60,
    shadowRadius:   16,
    elevation:      8,
  } as ShadowToken,

  // elev-4: modals / bottom-sheets (+ backdrop rgba(0,0,0,0.6))
  // CSS origin: 0 12px 32px -8px rgba(0,0,0,0.70)
  xl: {
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 12 },
    shadowOpacity:  0.70,
    shadowRadius:   32,
    elevation:      12,
  } as ShadowToken,

  // elev-5: toasts / FAB pressed
  // CSS origin: 0 16px 48px -12px rgba(0,0,0,0.80)
  xl2: {
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 16 },
    shadowOpacity:  0.80,
    shadowRadius:   48,
    elevation:      16,
  } as ShadowToken,

  // ─── Glow shadows (focus rings) ────────────────────────────────────────────
  // CSS origin: 0 0 0 4px rgba(r,g,b,0.25)
  // iOS: shadowColor gives faint halo (no spread control)
  // Android fallback: use 2px border with glow color instead (implement in component)
  //   Platform.OS === 'android' → borderWidth: 2, borderColor: colors.accent.default

  glowFocus: {
    shadowColor:    '#2563EB', // accent
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0.25,
    shadowRadius:   4,
    elevation:      0, // Android: use borderWidth:2 + borderColor as fallback
  } as ShadowToken,

  glowSuccess: {
    shadowColor:    '#22C55E', // status.positive
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0.25,
    shadowRadius:   4,
    elevation:      0,
  } as ShadowToken,

  glowDanger: {
    shadowColor:    '#EF4444', // status.danger
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0.25,
    shadowRadius:   4,
    elevation:      0,
  } as ShadowToken,

  // ─── Inset shadows (pressed / well) ────────────────────────────────────────
  // CSS: inset 0 2px 4px rgba(0,0,0,0.40) / inset 0 1px 2px rgba(0,0,0,0.30)
  //
  // RN has NO native inset shadow for View on either platform.
  // Q4 resolution: implement as pseudo-tokens with usage guidance below.
  //
  // insetPress — btn :active state:
  //   Recommended: transform: [{scale: 0.98}] + backgroundColor: colors.accent.dark
  //   This matches colors-core interactive spec for pressed state.
  //
  // insetWell — search fields / inner wells:
  //   Recommended: backgroundColor: colors.bg (darker than bgCard)
  //               + borderColor: colors.border.subtle
  //
  // These are STYLE OBJECTS for background-only fallback, not real inset shadows.

  insetPress: {
    // Use as: style={{ ...shadows.insetPress, transform: [{scale: 0.98}] }}
    // backgroundColor should be set to colors.accent.dark (or colors.bgCardElev for neutral)
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0,   // disabled — achieve via scale + darker bg
    shadowRadius:   0,
    elevation:      0,
    // Note: actual inset effect = transform scale(0.98) + accentDark bg
  } as ShadowToken,

  insetWell: {
    // Use as: style={{ ...shadows.insetWell }}
    // backgroundColor should be set to colors.bg (deepest = #020617)
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0,   // disabled — achieve via bg color
    shadowRadius:   0,
    elevation:      0,
    // Note: actual well effect = bg #020617 + border #1E293B (subtle)
  } as ShadowToken,
} as const;

// ─── Component shadow map (reference) ─────────────────────────────────────────
// Source: shadows (1).html line 819
// card            = sm(elev-2)         kpi           = sm(elev-2)
// restaurant-card = sm(elev-2)         card:hover    = sm + md (shadow-md lift)
// dropdown        = lg(elev-3)         popover       = lg(elev-3)
// tooltip         = lg(elev-3)         modal         = xl(elev-4) + backdrop
// toast           = xl2(elev-5)        btn:focus     = sm + glowFocus
// btn:active      = sm + insetPress (scale 0.98 + accentDark bg)

// ─── Deprecated aliases — remove after Wave 5 ────────────────────────────────
/** @deprecated use shadows.sm */
export const shadowAliases = {
  card:     shadows.sm,  // old card=offset0/4,op0.10 → sm (BREAKING: opacity 0.40)
  button:   shadows.glowFocus, // old button=accentShadow → glowFocus (BREAKING: renamed)
  elevated: shadows.lg,  // old elevated → lg (consolidate)
} as const;
