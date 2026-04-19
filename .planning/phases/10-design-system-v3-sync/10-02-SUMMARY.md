# Phase 10 Wave 3 — Design System v3 Component Layer — SUMMARY

Status: COMPLETE
Date: 2026-04-19
Agent: mobile-agent

---

## Deliverables — all files

### Step 0 — App.tsx font loading
| File | Lines | Change |
|------|-------|--------|
| `apps/mobile-dashboard/App.tsx` | 668 | Added `useFonts` hook (8 weights: FiraSans 400/500/600/700 + FiraCode 400/500/600/700). Added null guard before bootstrapping render. `colors.accentDefault` already migrated in prior session. |

### Step 1 — Updated components
| File | Lines | Notes |
|------|-------|-------|
| `apps/mobile-dashboard/src/components/BottomNav.tsx` | 59 | Already spec-compliant (icon size=22, accentLight, textTertiary). No changes needed. |
| `apps/mobile-dashboard/src/components/BottomNav.styles.ts` | 33 | Already spec-compliant. |
| `apps/mobile-dashboard/src/components/RestaurantCard.tsx` | 253 | Full rewrite: new props (brand, cuisine, status enum, planAttainmentPct, planMarkPct, plannedRevenue, marginPct, deltaPct, periodLabel). 5 states: above/onplan/below/offline/loading. Brand badge (BNA/DNA), plan bar (6px), ПЛАН marker, delta pill (TrendingUp/TrendingDown/WifiOff). |
| `apps/mobile-dashboard/src/components/RestaurantCard.styles.ts` | 200 | Full rewrite: semantic colors from theme, nested token refs (colors.brand.bna.*, colors.border.*), plan bar styles, skeleton blocks. |

### Step 2 — New components
| Component | TSX lines | Styles lines | Notes |
|-----------|-----------|--------------|-------|
| Button | 239 | 76 | 5 variants, 4 sizes, loading spinner (Loader2+Animated), expo-haptics, accessibility |
| Input | 203 | 54 | 6 states, label+helper+error+success, leadingIcon/trailingIcon, clearButton |
| PhoneInput | 201 | inline | Custom mask `(7NN) NNN-NN-NN`, no external lib |
| OtpInput | 282 | inline | 4-6 digits, attemptsLeft, resend timer, expo-haptics |
| KPICard | 188 | 84 | 3 kinds (revenue/expenses/balance), 4 states, kpiSemantics+getKpiBalanceSemantics |
| KPIRow | 26 | (uses KPICard.styles) | Thin wrapper: 3 KPICards in flex row |
| HeroCard | 272 | 182 | PulseDot animation, 3 variants, source badges (iiko/1C), profit+expenses footer, drill chevron |
| Chart | 306 | 183 | Bar chart, 4 periods (7d/14d/30d/90d), DOW/date labels, avg/max grid lines, loading skeleton, empty/single-value states |
| Chip | 115 | 46 | 3 sizes, 5 states, removable with X, leading icon, accessibility selected |
| Badge | 104 | 101 | 3 sub-components: StatusBadge (5 tones), SourceBadge (solid/outline), MetricBadge (3 tones), BadgeSkeleton |

---

## RestaurantCard screen usage (grep result)

| Screen file | Line | Props used |
|-------------|------|-----------|
| `src/screens/DashboardScreen.tsx` | 210 | name, city, type, revenue, transactions, dev, status, planPct, onPress |
| `src/screens/BrandDetailScreen.tsx` | 96 | name, city, type="Ресторан", revenue, transactions=0, dev, status, planPct, onPress |
| `src/screens/PointsScreen.tsx` | 95 | name, city, (additional props from hook data) |

---

## Breaking changes — RestaurantCard

The RestaurantCard prop interface changed significantly. Screens that pass old props will get TypeScript errors (props silently ignored at runtime since RN doesn't throw on extra props, but required new props will show as undefined).

| Old prop | Status | New equivalent |
|----------|--------|---------------|
| `type: string` | REMOVED | replaced by `cuisine: 'Burger' | 'Doner'` |
| `dev: number` | REMOVED | replaced by `deltaPct: number | null` |
| `planPct: number` | REMOVED | split into `planAttainmentPct` + `planMarkPct` |
| (none) | ADDED REQUIRED | `brand: 'BNA' | 'DNA'` |
| (none) | ADDED REQUIRED | `cuisine: 'Burger' | 'Doner'` |
| (none) | ADDED REQUIRED | `plannedRevenue: number` |
| (none) | ADDED REQUIRED | `marginPct: number | null` |
| (none) | ADDED REQUIRED | `deltaPct: number | null` |
| (none) | ADDED REQUIRED | `planAttainmentPct: number` |
| (none) | ADDED REQUIRED | `planMarkPct: number` |
| (none) | ADDED REQUIRED | `periodLabel: string` |
| `status: string` | CHANGED type | `status: 'above' | 'onplan' | 'below' | 'offline' | 'loading'` |

Action required for Wave 4: screens (DashboardScreen, BrandDetailScreen, PointsScreen) must be updated to pass new required props. Data comes from finance-service snapshots via useApi/useDashboard hooks — those hooks need to map API response fields to the new card props.

---

## Wave 4 readiness

- All component files complete and type-safe
- Fonts registered in App.tsx — all components can safely use `fontFamily: 'FiraSans-Bold'`, `fontFamily: 'FiraCode-SemiBold'`, etc.
- Design token imports: all components use `src/theme` exports only (no hardcoded hex except in theme itself)
- Accessibility: all interactive components have `accessibilityRole`, `accessibilityLabel`, `accessibilityState`
- Touch targets: all tappable elements >= 44pt (via explicit height or hitSlop)
- Remaining for Wave 4: update 3 screens (DashboardScreen, BrandDetailScreen, PointsScreen) to pass new RestaurantCard props from real API data
