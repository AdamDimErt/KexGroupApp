// Spacing scale from MASTER.md
export const spacing = {
  xs: 4,    // --space-xs: 4px — Tight gaps
  sm: 8,    // --space-sm: 8px — Icon gaps, inline spacing
  md: 16,   // --space-md: 16px — Standard padding
  lg: 24,   // --space-lg: 24px — Section padding
  xl: 32,   // --space-xl: 32px — Large gaps
  xxl: 48,  // --space-2xl: 48px — Section margins
  xxxl: 64, // --space-3xl: 64px — Hero padding
} as const;

export const radii = {
  sm: 4,
  md: 8,    // MASTER.md: border-radius: 8px (buttons, inputs)
  lg: 12,   // MASTER.md: border-radius: 12px (cards)
  xl: 16,   // MASTER.md: border-radius: 16px (modals)
  xxl: 20,
  full: 9999,
} as const;
