// Semantic tokens v3 — KEX GROUP Financial Dashboard
// Source: restaurant-card.html lines 64-68, 85-89; kpi-row (1).html lines 59-83
//         hero-card.html lines 27-36; colors-core (1).html; colors-status.html
//
// Business rules encoded here so components NEVER hardcode hex values.
// All thresholds drive the 4-element semantic sync pattern:
//   dot + border-left + bar-fill + status-text → same color on any card.

// ─── Restaurant performance thresholds ────────────────────────────────────────
// Source: restaurant-card.html lines 337, 374-378, 418, 459, 766

export const restaurantStatusThresholds = {
  above: 5,    // perf >= +5%  → positive (green)
  belowEq: -5, // perf <= -5%  → danger (red)
  // between -5 and +5 → onplan (warning/amber)
} as const;

// ─── Restaurant performance state colors ─────────────────────────────────────
// RULE: dot + border-left + bar-fill + status-text = ONE color per card
// (restaurant-card.html:716, 10-RULES.md §1.11)

export const restaurantStatusColors = {
  above: {
    dot:        '#22C55E',
    borderLeft: '#22C55E',
    fill:       '#22C55E',
    text:       '#22C55E',
  },
  onplan: {
    dot:        '#F59E0B',
    borderLeft: '#F59E0B',
    fill:       '#F59E0B',
    text:       '#F59E0B',
  },
  below: {
    dot:        '#EF4444',
    borderLeft: '#EF4444',
    fill:       '#EF4444',
    text:       '#EF4444',
  },
  offline: {
    dot:        '#64748B',
    borderLeft: '#64748B',
    fill:       '#64748B',
    text:       '#94A3B8', // muted — offline label is slightly softer
  },
} as const;

export type RestaurantStatusState = keyof typeof restaurantStatusColors;

/**
 * Resolves restaurant performance state from deviation percentage.
 * @param devPercent - deviation vs plan, e.g. +12.5 or -8.3
 * @param isOffline  - true when sync failed / no recent data
 */
export function getRestaurantStatus(
  devPercent: number,
  isOffline: boolean,
): RestaurantStatusState {
  if (isOffline) return 'offline';
  if (devPercent >= restaurantStatusThresholds.above) return 'above';
  if (devPercent <= restaurantStatusThresholds.belowEq) return 'below';
  return 'onplan';
}

// ─── KPI card semantics ───────────────────────────────────────────────────────
// Source: kpi-row (1).html lines 59-83, 536
// 3 cards: revenue (HERO, 6px border), expenses (neutral, 4px), balance (conditional, 4px)

export const kpiSemantics = {
  revenue: {
    borderLeftColor: '#2563EB',   // accent blue — primary KPI
    borderLeftWidth: 6,           // HERO — thicker than rest
    labelColor:      '#60A5FA',   // accent-light
    iconName:        'trending-up' as const,
  },
  expenses: {
    borderLeftColor: '#94A3B8',   // muted — expenses are neutral, NOT red
    borderLeftWidth: 4,
    labelColor:      '#94A3B8',
    iconName:        'arrow-down-up' as const,
    // RULE: NEVER color expenses red — it is a normal metric (kpi-row:515)
  },
  balance: {
    // Conditional — resolved by value sign. Apply via getKpiBalanceSemantics()
    positive: {
      borderLeftColor: '#22C55E',  // status.positive
      borderLeftWidth: 4,
      labelColor:      '#4ADE80',  // positiveLight
      iconName:        'wallet' as const,
    },
    negative: {
      borderLeftColor: '#EF4444',  // status.danger
      borderLeftWidth: 4,
      labelColor:      '#F87171',  // danger-light (red-400)
      iconName:        'trending-down' as const,
    },
  },
} as const;

/** Returns balance semantic tokens based on value sign */
export function getKpiBalanceSemantics(value: number) {
  return value >= 0
    ? kpiSemantics.balance.positive
    : kpiSemantics.balance.negative;
}

// ─── Border-left widths ───────────────────────────────────────────────────────
// Source: kpi-row (1).html:59; restaurant-card.html:57; hero-card.html:30
//         colors-text.html:188; colors-status.html:147; spacing (2).html:387

export const borderLeftWidths = {
  hero:     6, // KPI revenue hero — widest bar (emphasizes primary metric)
  semantic: 4, // restaurant-card, kpi balance/expenses, hero-card default
  accent:   3, // notes, alerts, adaptive callouts (thinner decorative)
} as const;

// ─── Delta pill variants (metric badge) ──────────────────────────────────────
// Source: restaurant-card.html lines 151-170; chips-badges.html:372
// RULE: any + (even +0.1%) = green. Any − = red. Never orange for small positive.

export const deltaVariants = {
  up: {
    bg:     'rgba(34,197,94,0.15)',
    text:   '#22C55E',
    icon:   'trending-up' as const,
  },
  flat: {
    bg:     'rgba(245,158,11,0.15)',
    text:   '#F59E0B',
    icon:   null,
  },
  down: {
    bg:     'rgba(239,68,68,0.15)',
    text:   '#EF4444',
    icon:   'trending-down' as const,
  },
  muted: {
    bg:     '#1E293B',
    text:   '#64748B',
    border: '#334155',
    icon:   null,
  },
} as const;

export type DeltaVariantKey = keyof typeof deltaVariants;

/**
 * Resolves delta pill variant from delta percentage.
 * @param delta - percentage change, e.g. +12.5 or -3.2 or 0
 * @param isOffline - true when no data
 */
export function getDeltaVariant(delta: number, isOffline: boolean): DeltaVariantKey {
  if (isOffline) return 'muted';
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

// ─── Source badge tokens ──────────────────────────────────────────────────────
// Source: hero-card.html lines 73-82; chips-badges.html:371
// Light-inverse: solid light bg, dark text — shows data attribution (iiko / 1С)

export const sourceBadge = {
  bg:          '#F8FAFC',  // text-default as solid bg (inverted)
  text:        '#0F172A',  // text-inverse
  fontFamily:  'FiraCode-SemiBold', // Fira Code 10/600 UPPERCASE
  fontSize:    10,
  fontWeight:  '600' as const,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  paddingVertical:   3,
  paddingHorizontal: 8,
  borderRadius: 4, // radii.sm
} as const;

// ─── Live-sync pulse dot ──────────────────────────────────────────────────────
// Source: hero-card.html lines 106-116; icons-lucide.html lines 129-141
// RN: implement via Animated.View with scale + opacity keyframes, useNativeDriver: true

export const pulseDot = {
  width:           6,
  height:          6,
  borderRadius:    3, // full circle at 6px
  backgroundColor: '#22C55E', // status.positive
  // Pulse: box-shadow → 0 0 0 0 rgba(34,197,94,0.6) → 6px → 0 @ 1.8s ease-out infinite
  // In RN: Animated scale 1→1.5→1 + opacity 0.6→0→0.6 @ 1.8s loop
  animationDurationMs: 1800,
} as const;
