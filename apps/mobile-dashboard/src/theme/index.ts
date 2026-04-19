// Theme barrel — KEX GROUP Financial Dashboard v3
// Wave 2 Phase 10: design-system token sync

// ─── Colors ──────────────────────────────────────────────────────────────────
export {
  colors,
  darkColors,
  lightColors,
  type ThemeColors,
  type DarkColors,
  type LightColors,
} from './colors';

// ─── Spacing (4px-grid, 11 levels) ───────────────────────────────────────────
export { spacing, spacingAliases as spacingLegacy } from './spacing';

// ─── Radii (6-level scale) ────────────────────────────────────────────────────
export { radii, radiiAliases } from './radii';

// ─── Typography (Fira Sans + Fira Code) ──────────────────────────────────────
export {
  typography,
  fontFamilies,
  headings,
  body,
  typographyAliases,
} from './typography';

// ─── Shadows (dark-mode elevation) ───────────────────────────────────────────
export { shadows, shadowAliases, type ShadowToken } from './shadows';

// ─── DDS category tokens ──────────────────────────────────────────────────────
export {
  categoryColors,
  categoryTextColor,
  categoryTint,
  GROUP_NAME_TO_CATEGORY,
  LIGHT_CATEGORY_CHIPS,
  type CategoryKey,
} from './categories';

// ─── Semantic business-rule tokens ───────────────────────────────────────────
export {
  restaurantStatusThresholds,
  restaurantStatusColors,
  getRestaurantStatus,
  kpiSemantics,
  getKpiBalanceSemantics,
  borderLeftWidths,
  deltaVariants,
  getDeltaVariant,
  sourceBadge,
  pulseDot,
  type RestaurantStatusState,
  type DeltaVariantKey,
} from './semantic';

// ─── Icons ────────────────────────────────────────────────────────────────────
export {
  GROUP_ICONS,
  GROUP_ICON_COLORS,
  DEFAULT_GROUP_ICON,
} from './icons';

// ─── Theme store / hook ───────────────────────────────────────────────────────
export { useThemeStore, useColors } from './useTheme';
