// Radii scale v3 — KEX GROUP Financial Dashboard
// Source: radii (1).html lines 417-459, 650-659
// 6-level scale — strictly from this set only (no 5, 7, 10, 11, 14)

export const radii = {
  sm:   4,    // tooltips, tags, code-blocks, source-badges
  md:   8,    // dropdowns, small chips, inline actions
  lg:   12,   // buttons, inputs, cards, KPI           · DEFAULT interactive
  xl:   16,   // modals, bottom-sheets, hero-cards
  xl2:  20,   // large promo panels (rare — avoid without clear reason)
  full: 9999, // pill-btn, avatars, chips, status-dots, brand-badges
} as const;

export type Radii = typeof radii;
export type RadiiKey = keyof Radii;

// ─── Component radii map (reference) ─────────────────────────────────────────
// Source: radii (1).html line 659
// btn        = lg(12)   input    = lg(12)   card       = lg(12)
// kpi        = lg(12)   modal    = xl(16)   hero-card  = xl(16)
// chip/badge = full     avatar   = full     tooltip    = sm(4)
// dropdown   = md(8)

// Nesting rule: inner radius < parent radius.
// chip (full) inside card (12) is valid; reverse is a bug.
// Dense list rows h<44 → radius 0 or sm(4). (radii (1).html:645)

// ─── Deprecated alias — remove after Wave 5 ──────────────────────────────────
/** @deprecated use radii.xl2 */
export const radiiAliases = {
  xxl: radii.xl2, // old xxl=20 → new xl2=20
} as const;
