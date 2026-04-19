# Phase 10-03: TypeScript Error Resolution — Design System v3 Migration

**Date:** 2026-04-19
**Agent:** mobile-agent
**Status:** COMPLETE

## Result

`npx tsc --noEmit` exits with code 0 (zero errors) in `apps/mobile-dashboard/`.
`npm test` passes 8/8 tests.

## Root Causes Fixed

### 1. Nested color objects used as flat ColorValue strings
Wave 2/3 refactored `colors.accent` and `colors.border` into nested objects
(`colors.accent = { default, dark, light, ... }`, `colors.border = { subtle, default, ... }`).
All React Native `StyleSheet.create` usages and component props that expected a flat string broke.

**Fix strategy:** Add flat aliases to `src/theme/colors.ts` (`flatAliases` const), then mass-replace
`colors.accent` → `colors.accentDefault` and `colors.border` → `colors.borderColor` across affected files.

### 2. Missing flat aliases in `flatAliases` (colors.ts)
Several tokens that existed pre-Wave-2 were removed from the flat layer:
`borderActive`, `borderSubtle`, `borderDefault`, `borderStrong`, `borderFocused`, `borderDanger`,
`borderRed`, `bgInput`, `sparkGreen`, `textLabel`, `accentFlat`.

**Fix:** Re-added all of them to `flatAliases` pointing at the correct nested token values.
No nested tokens were deleted.

### 3. ThemeColors union type mismatch (lightColors)
`ThemeColors = DarkColors | LightColors` requires both to have identical keys.
`lightColors` was missing the entire flat alias block after the Wave 2 refactor.

**Fix:** Added a matching flat alias block to `lightColors` before its closing `} as const`.

### 4. RestaurantCard required prop changes (Wave 3)
Wave 3 redesigned `RestaurantCard` props interface, adding required props:
`brand`, `cuisine`, `plannedRevenue`, `marginPct`, `deltaPct`, `planAttainmentPct`,
`planMarkPct`, `periodLabel`, `transactions`, and changing status enum from
`'green'|'yellow'|'red'` to `'above'|'onplan'|'below'|'offline'|'loading'`.

`DashboardScreen`, `BrandDetailScreen`, and `PointsScreen` were not updated.

**Fix:** Added stub props with `(r as any).propName ?? defaultValue` pattern and inline
status ternary adapters. `// TODO: Wave 4` comments added. No hook return types modified.

## Files Modified

### Theme
- `src/theme/colors.ts` — added flat aliases to `flatAliases` and matching block to `lightColors`

### Screens (styles)
- `src/screens/DashboardScreen.styles.ts`
- `src/screens/BrandDetailScreen.styles.ts`
- `src/screens/LoginScreen.styles.ts`
- `src/screens/NotificationsScreen.styles.ts`
- `src/screens/OperationsScreen.styles.ts`
- `src/screens/PointDetailScreen.styles.ts`
- `src/screens/PointsScreen.styles.ts`
- `src/screens/ReportsScreen.styles.ts`

### Screens (JSX)
- `src/screens/DashboardScreen.tsx` — RestaurantCard stubs + status adapter + accentDefault
- `src/screens/BrandDetailScreen.tsx` — RestaurantCard stubs + status adapter + accentDefault
- `src/screens/PointsScreen.tsx` — RestaurantCard stubs + status adapter + accentDefault
- `src/screens/ArticleDetailScreen.tsx` — accentDefault
- `src/screens/OperationsScreen.tsx` — accentDefault
- `src/screens/PointDetailScreen.tsx` — accentDefault
- `src/screens/ProfileScreen.tsx` — accentDefault + borderColor
- `src/screens/ReportsScreen.tsx` — accentDefault

### Components
- `src/components/DayRangePicker.tsx` — borderColor + accentDefault in StyleSheet
- `src/components/MonthRangePicker.tsx` — borderColor + accentDefault in StyleSheet
- `src/components/PeriodSelector.tsx` — borderColor + accentDefault in StyleSheet

### Shared
- `src/styles/shared.ts` — borderColor

## Verification
- `npx tsc --noEmit` — exit 0, zero errors
- `npm test` — 8/8 passed (useOperations role-gate tests)
