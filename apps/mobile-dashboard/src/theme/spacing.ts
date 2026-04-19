// Spacing scale v3 — KEX GROUP Financial Dashboard
// Source: spacing (2).html lines 488-556, 802-816
// 11-level 4px-grid — every value is a multiple of 4

export const spacing = {
  xs2: 4,   // --space-2xs · icon-label inline, border-gap, chip-padding-y
  xs:  8,   // --space-xs  · icon-text gap, btn-inline-gap, label-stack
  sm:  12,  // --space-sm  · dense list rows, chip-padding-x, modal content-stack
  md:  16,  // --space-md  · card/kpi inset, btn padding-x, screen-margin  · DEFAULT
  lg:  20,  // --space-lg  · hero-card inset, comfortable forms
  xl:  24,  // --space-xl  · modal inset, list section-stack, between-groups
  xl2: 32,  // --space-2xl · section-stack in dashboard, landing cards gap
  xl3: 40,  // --space-3xl · hero-block padding, wide landing layout
  xl4: 48,  // --space-4xl · onboarding hero, featured block
  xl5: 56,  // --space-5xl · landing chapter-break
  xl6: 64,  // --space-6xl · section-break marketing (rare)
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

// ─── Component spacing map (reference, not runtime) ───────────────────────────
// Source: spacing (2).html line 816
// btn-inset=md(16)      btn-inline=xs(8)
// input-inset=md(16)    input-label-stack=xs(8)
// card-inset=md(16)     card-stack=xs(8)
// kpi-inset=md(16)      kpi-row-gap=xs(8)
// list-item-stack=xs(8) list-section-stack=xl(24)
// modal-inset=xl(24)    modal-stack=sm(12)
// bottom-sheet-inset=xl(24)  screen-margin=md(16)
// section-stack=xl2(32)

// ─── Deprecated aliases — remove after Wave 5 ────────────────────────────────
// Old 7-level scale mapped to new names. Keep for gradual migration.
/** @deprecated use spacing.xs2 */
export const spacingAliases = {
  xs:   spacing.xs2, // old xs=4  → new xs2=4
  sm:   spacing.xs,  // old sm=8  → new xs=8
  lg:   spacing.xl,  // old lg=24 → new xl=24
  xl:   spacing.xl2, // old xl=32 → new xl2=32
  xxl:  spacing.xl4, // old xxl=48 → new xl4=48
  xxxl: spacing.xl6, // old xxxl=64 → new xl6=64
} as const;
