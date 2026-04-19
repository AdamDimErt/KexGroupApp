import { TextStyle } from 'react-native';

// Typography v3 — KEX GROUP Financial Dashboard
// Source: type-families (1).html, type-headings (1).html, type-body (2).html
//
// RULES:
// - Fira Sans = ALL headings (H1-H4, screenTitle, subheading) + body/UI/labels
// - Fira Code = ONLY displayNumeric (KPI hero values) and numeric strings
// - Line-heights in PIXELS (not ratio strings) — RN requirement
// - All line-heights are multiples of 4
// - Negative letter-spacing ONLY on sizes ≥22px
// - tabular-nums applied to Fira Code (fontVariant: ['tabular-nums'])
// - Weights: 400/500/600/700 ONLY

// ─── Font family keys ─────────────────────────────────────────────────────────
// Source: type-families (1).html lines 373-376, 621-624
// These string keys must match the useFonts() map in App.tsx exactly.

export const fontFamilies = {
  // Fira Sans v4.301 — all headings and body
  sans:         'FiraSans-Regular',    // 400
  sansMedium:   'FiraSans-Medium',     // 500
  sansSemiBold: 'FiraSans-SemiBold',   // 600
  sansBold:     'FiraSans-Bold',       // 700

  // Fira Code v6.2 — KPI numerals, timestamps, source badges
  mono:         'FiraCode-Regular',    // 400
  monoMedium:   'FiraCode-Medium',     // 500
  monoSemiBold: 'FiraCode-SemiBold',   // 600
  monoBold:     'FiraCode-Bold',       // 700

  // Convenience aliases (backward-compat from v2)
  heading:      'FiraSans-Bold',       // was FiraCode-Bold (BREAKING: headings now Fira Sans)
  headingMedium: 'FiraSans-Medium',    // was FiraCode-Medium
  body:         'FiraSans-Regular',
  bodyMedium:   'FiraSans-Medium',
  bodySemiBold: 'FiraSans-SemiBold',
  bodyBold:     'FiraSans-Bold',
  /** @deprecated KPI numerals use monoBold via displayNumeric token */
  kpi:          'FiraCode-Bold',
} as const;

// ─── Heading scale (7 tokens) ─────────────────────────────────────────────────
// Source: type-headings (1).html lines 101-108, 622-639

export const headings = {
  // KPI hero value — Fira Code ONLY usage in headings
  // tabularNums applied via fontVariant
  displayNumeric: {
    fontFamily:    fontFamilies.monoBold,
    fontSize:      32,
    fontWeight:    '700' as TextStyle['fontWeight'],
    lineHeight:    40,
    letterSpacing: -0.5,
    fontVariant:   ['tabular-nums'] as TextStyle['fontVariant'],
  } as TextStyle,

  // One per screen — DEFAULT page title
  screenTitle: {
    fontFamily:    fontFamilies.sansBold,
    fontSize:      26,
    fontWeight:    '700' as TextStyle['fontWeight'],
    lineHeight:    32,
    letterSpacing: -0.3,
  } as TextStyle,

  h1: {
    fontFamily:    fontFamilies.sansBold,
    fontSize:      22,
    fontWeight:    '700' as TextStyle['fontWeight'],
    lineHeight:    28,
    letterSpacing: -0.2,
  } as TextStyle,

  h2: {
    fontFamily:    fontFamilies.sansSemiBold,
    fontSize:      18,
    fontWeight:    '600' as TextStyle['fontWeight'],
    lineHeight:    24,
    letterSpacing: 0,
  } as TextStyle,

  h3: {
    fontFamily:    fontFamilies.sansSemiBold,
    fontSize:      16,
    fontWeight:    '600' as TextStyle['fontWeight'],
    lineHeight:    20,
    letterSpacing: 0,
  } as TextStyle,

  h4: {
    fontFamily:    fontFamilies.sansSemiBold,
    fontSize:      14,
    fontWeight:    '600' as TextStyle['fontWeight'],
    lineHeight:    20,
    letterSpacing: 0,
  } as TextStyle,

  // Below screen-title — color = text.muted (applied by component, not here)
  subheading: {
    fontFamily:    fontFamilies.sansMedium,
    fontSize:      15,
    fontWeight:    '500' as TextStyle['fontWeight'],
    lineHeight:    20,
    letterSpacing: 0,
  } as TextStyle,
} as const;

// ─── Body scale (5 tokens) ───────────────────────────────────────────────────
// Source: type-body (2).html lines 94-103, 487-497
// Note: lineHeight 1.5 and 1.4 are kept as ratios here because RN accepts both;
// pixel equivalents: body 14*1.5=21 (rounds to 20), bodySmall 13*1.5≈20, caption 12*1.4≈16

export const body = {
  // DEFAULT paragraph, descriptions
  body: {
    fontFamily:    fontFamilies.sans,
    fontSize:      14,
    fontWeight:    '400' as TextStyle['fontWeight'],
    lineHeight:    21,   // 14 * 1.5, nearest 4px multiple from 20
    letterSpacing: 0,
  } as TextStyle,

  bodySmall: {
    fontFamily:    fontFamilies.sans,
    fontSize:      13,
    fontWeight:    '400' as TextStyle['fontWeight'],
    lineHeight:    20,   // 13 * 1.5 ≈ 20
    letterSpacing: 0,
  } as TextStyle,

  caption: {
    fontFamily:    fontFamilies.sans,
    fontSize:      12,
    fontWeight:    '400' as TextStyle['fontWeight'],
    lineHeight:    16,   // 12 * 1.4 ≈ 16 (multiple of 4)
    letterSpacing: 0,
  } as TextStyle,

  // ALWAYS UPPERCASE (semantic marker) — textTransform applied here
  label: {
    fontFamily:    fontFamilies.sansSemiBold,
    fontSize:      11,
    fontWeight:    '600' as TextStyle['fontWeight'],
    lineHeight:    16,   // 11 * 1.25 ≈ 14, rounded to 16 (multiple of 4)
    letterSpacing: 0.8,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  } as TextStyle,

  // CTA text, parented to btn height 40-48
  button: {
    fontFamily:    fontFamilies.sansSemiBold,
    fontSize:      14,
    fontWeight:    '600' as TextStyle['fontWeight'],
    lineHeight:    20,   // 14 * 1.25 = 17.5, rounded to 20
    letterSpacing: 0.2,
  } as TextStyle,
} as const;

// ─── Combined export for convenience ─────────────────────────────────────────

export const typography = {
  ...headings,
  ...body,
} as const;

// ─── Deprecated token aliases — remove after Wave 5 ──────────────────────────
// Old tokens removed in v3; aliases point to closest v3 equivalent.

/** @deprecated use typography.h1 — old 20px heading removed from v3 scale */
export const typographyAliases = {
  heading:       headings.h1,          // old 20/700 → h1 22/700 (closest match)
  cardTitle:     body.label,           // old 14/700 card title → label 11/600 UPPERCASE
  kpiValue:      headings.displayNumeric, // old 28/500 → displayNumeric 32/700 (BREAKING)
  kpiValueLarge: headings.displayNumeric, // old 36/500 → same (consolidate)
  buttonText:    body.button,          // old 15/700/ls0.3 → button 14/600/ls0.2
  captionSmall:  body.caption,         // old 11/400 → caption (use label for 11/600/UPPER)
  tabLabel:      body.caption,         // old 10/500 below min readable → caption
  screenTitle:   headings.screenTitle, // unchanged key, updated values
  subheading:    headings.subheading,  // key unchanged, weight/size updated
} as const;
