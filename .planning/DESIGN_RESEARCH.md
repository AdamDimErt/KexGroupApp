# Design Research — KEX GROUP Mobile Financial Dashboard

> Date: 2026-04-03
> Scope: UX research, codebase audit, concept evaluation, design system recommendations

---

## Table of Contents

1. [Existing Codebase Audit](#1-existing-codebase-audit)
2. [Design Patterns Analysis](#2-design-patterns-analysis)
3. [Mobile Finance Dashboard Best Practices](#3-mobile-finance-dashboard-best-practices)
4. [User Role Analysis](#4-user-role-analysis)
5. [Design System Recommendations](#5-design-system-recommendations)
6. [Figma Concept Evaluation](#6-figma-concept-evaluation)
7. [Final Recommendation](#7-final-recommendation)

---

## 1. Existing Codebase Audit

### 1.1 Screens (6 total)

| Screen | File | Purpose | Status |
|--------|------|---------|--------|
| LoginScreen | `src/screens/LoginScreen.tsx` | OTP auth (phone + 6-digit code) | Functional, dark theme |
| DashboardScreen | `src/screens/DashboardScreen.tsx` | Company overview: total revenue, brands list | Connected to API via React Query |
| BrandDetailScreen | `src/screens/BrandDetailScreen.tsx` | Brand drill-down: revenue + restaurant list | Connected to API |
| PointsScreen | `src/screens/PointsScreen.tsx` | Restaurant list with search | Uses static mock data |
| PointDetailScreen | `src/screens/PointDetailScreen.tsx` | Restaurant detail: KPIs, hourly chart, expenses, payment breakdown | Connected to API |
| ReportsScreen | `src/screens/ReportsScreen.tsx` | Analytics: period pills, KPI cards, fact-vs-plan chart, ranking | Uses mock-derived data |
| NotificationsScreen | `src/screens/NotificationsScreen.tsx` | Notification list with unread indicator | Uses mock data |

### 1.2 Components (2 reusable)

| Component | File | Purpose |
|-----------|------|---------|
| RestaurantCard | `src/components/RestaurantCard.tsx` | Card showing restaurant name, revenue, deviation %, plan progress bar, margin |
| BottomNav | `src/components/BottomNav.tsx` | 4-tab bottom navigation: Home, Restaurants, Analytics, Notifications |

**Observation:** Only 2 reusable components exist. Many UI patterns are duplicated inline across screens (hero cards, KPI grids, chart containers, section headers). This is a major refactoring opportunity.

### 1.3 Theme System

The existing theme is well-structured with separate token files:

**Colors** (`src/theme/colors.ts`):
- Dark theme only (bg: `#060E1A`, card: `#0D1B2E`)
- Primary accent: Electric Blue `#2563EB` (Tailwind blue-600)
- Status colors: Green `#10B981`, Yellow `#F59E0B`, Red `#EF4444`
- Text hierarchy: 4 levels (primary, secondary, tertiary, muted) all on light-on-dark
- Special: hero gradient from `#1E3A6E` to `#2563EB`

**Spacing** (`src/theme/spacing.ts`):
- 7-step scale: xs(4), sm(8), md(12), lg(16), xl(20), xxl(28), xxxl(52)
- Radii: sm(4), md(10), lg(14), xl(16), xxl(20), full(9999)

**Typography** (`src/theme/typography.ts`):
- 10 text styles from screenTitle(26px) down to captionSmall(11px)
- KPI values: 28px normal, 36px large
- No font family specified (uses system default)
- Fonts installed: Plus Jakarta Sans, JetBrains Mono (in package.json but not applied)

**Shadows** (`src/theme/shadows.ts`):
- 3 shadow presets: card, button, elevated
- Button shadow uses accent color glow

### 1.4 Navigation

- **Current:** Manual `useState<Screen>` in `App.tsx` (no React Navigation despite it being installed)
- **Screens type:** `'login' | 'dashboard' | 'brand-details' | 'points' | 'point-details' | 'notifications' | 'reports'`
- **Tab bar:** Custom `BottomNav` with 4 tabs (Feather icons)
- **Back navigation:** Manual `onBack` callbacks
- **No transitions/animations:** Screen swaps are instant with no visual transition

**Issue:** React Navigation v7 is installed but unused. The manual state approach cannot support deep linking, gesture-based navigation, or proper stack history. This must be migrated.

### 1.5 State Management

- **Zustand stores:**
  - `auth.ts` — user, tokens, bootstrap/login/logout actions
  - `dashboard.ts` — period type, refresh state, last fetch timestamp
- **React Query (`useApi.ts`):** Custom hooks wrapping `dashboardApi` for server-state
- **No global UI state store** (theme, language preference, role-based visibility)

### 1.6 Data Layer

- **API client:** Custom `fetch`-based client with JWT auth + auto-refresh (`src/services/api.ts`)
- **Endpoints defined:** Dashboard summary, brand detail, restaurant detail, article detail, notifications
- **Mock data:** `src/data/restaurants.ts` still used by PointsScreen (5 hardcoded restaurants)
- **Config:** API URL from env, 15s timeout, Asia/Almaty timezone, KZT currency

### 1.7 i18n

- **Framework:** i18next + react-i18next
- **Languages:** Russian (default) + Kazakh
- **Coverage:** Comprehensive — auth, nav, dashboard, brand, points, reports, notifications, cost allocation, settings
- **Issue:** i18n keys exist but are NOT used in any screen. All UI text is hardcoded in Russian. This is a significant gap.

### 1.8 Key Architectural Gaps

1. **No proper navigation** — manual state instead of React Navigation
2. **i18n not wired** — translations exist but screens use hardcoded Russian
3. **No role-based UI** — UserRole type defined but no conditional rendering by role
4. **No chart library** — hourly bar chart and fact-vs-plan bars are all hand-built with Views
5. **Only 2 reusable components** — massive duplication of card/header/KPI patterns
6. **No light theme** — dark-only despite TZ saying "no dark theme" (contradictory)
7. **No pull-to-refresh** — required by TZ
8. **No skeleton loaders** — only ActivityIndicator spinners
9. **No offline support** — planned for Sprint 3 but not started
10. **No Article or Operation screens** — Levels 3 and 4 of drill-down not implemented

---

## 2. Design Patterns Analysis

### 2.1 UI Framework

**No component library** is used. Everything is custom `View`/`Text`/`TouchableOpacity` with `StyleSheet`. This is both a strength (full control, no dependency bloat) and a weakness (no pre-built components for common patterns like modals, date pickers, action sheets, badges).

**Recommendation:** Stay custom but build a proper component library internally. Adding React Native Paper or NativeBase at this stage would create conflicts with the existing dark theme system.

### 2.2 Navigation Pattern

- **Bottom tabs** (4): standard for mobile dashboards
- **Stack depth:** Login -> Dashboard -> Brand -> Restaurant -> (missing: Article -> Operation)
- **No drawer navigation** — correct for this use case
- **Missing:** Breadcrumbs or path indicator for the 4-level drill-down

### 2.3 State Management

- **Zustand:** Correct choice for this scale. Lightweight, no boilerplate.
- **React Query:** Correct for server-state. Supports caching, background refresh, optimistic updates.
- **Gap:** No combined store for UI preferences (theme, language, role visibility).

### 2.4 Visualization

- **No chart library installed.** All charts are manual:
  - Hourly revenue: vertical bars using `View` height
  - Fact vs Plan: horizontal bars using `width` percentages
  - Payment breakdown: horizontal bars with color coding
  - Plan progress: thin progress bar on RestaurantCard
- **Missing:** Line charts, area charts, pie/donut charts, sparklines

**Recommended chart libraries for React Native + Expo:**
- `react-native-gifted-charts` — best balance of features and Expo compatibility
- `victory-native` — well-documented, SVG-based, good for financial data
- `react-native-chart-kit` — simple but limited customization
- `react-native-skia` + custom — most performant, most flexible, steepest learning curve

---

## 3. Mobile Finance Dashboard Best Practices

### 3.1 Information Architecture for Financial Data

**Progressive disclosure** is the fundamental pattern for financial dashboards on mobile. Users should see a high-level summary first, with the ability to drill into details on demand.

**Recommended hierarchy for KEX GROUP:**
```
Level 0: Company KPI hero card (revenue, expenses, result)
Level 1: Brand cards (BNA, DNA) with key metrics
Level 2: Restaurant cards within brand, sortable/filterable
Level 3: Article breakdown within restaurant (Owner + FinDir only)
Level 4: Individual operations within article (Owner only)
```

### 3.2 Four-Level Drill-Down Navigation Best Practices

1. **Breadcrumb trail** — Show the navigation path at all times (e.g., "KEX GROUP > BNA > Galereya > Salary"). This is critical for 4 levels.
2. **Swipe-back gesture** — iOS users expect horizontal swipe to go back. React Navigation provides this out of the box.
3. **Persistent context** — Always show which entity you are viewing (restaurant name, period) in the header.
4. **Collapse/expand** — On Levels 3-4, consider inline expansion rather than full-screen navigation to reduce disorientation.
5. **Same period propagation** — When drilling down, carry the selected period through all levels.

### 3.3 KPI Display Patterns

- **Hero card** with the single most important number (total revenue) — already implemented.
- **KPI grid** (2x2 or 3-column) for secondary metrics — implemented on PointDetailScreen.
- **Trend indicators** — arrows or sparklines next to numbers showing direction. Currently using simple +/-% text.
- **Color-coded status** — green/yellow/red system is correct and already in use.
- **Comparative context** — always show "vs last period" or "vs plan" next to raw numbers.

### 3.4 Role-Based UI Patterns

For showing/hiding content by role:
- **Never use empty space** — if content is hidden, the layout should reflow naturally.
- **Role-aware queries** — backend should filter data by role; frontend should hide navigation paths that lead nowhere.
- **Subtle role indicators** — Owner might see "all data sources" badge; FinDir sees a subset.
- **Progressive access** — show grayed-out or locked indicators for data that requires a higher role (optional, can be omitted for simplicity).

### 3.5 Russian/Kazakh Language Considerations

- **Text expansion:** Kazakh text can be 15-30% longer than Russian equivalents. UI must handle variable text lengths without breaking layouts.
- **Number formatting:** Both languages use space as thousand separator (1 234 567) and comma for decimals. The current `toFixed()` + manual formatting needs to be replaced with `Intl.NumberFormat('ru-RU')`.
- **Currency:** KZT (tenge) symbol is `₸`. Already correctly used throughout.
- **Date formatting:** Russian uses `DD.MM.YYYY`, Kazakh uses the same format. Time is 24-hour.
- **Font support:** Inter (already in package.json via Plus Jakarta Sans which also supports Cyrillic) is an excellent choice. PT Sans is another strong option for Cyrillic readability.
- **Right-to-left:** Not needed — both Russian and Kazakh use LTR Cyrillic script.

### 3.6 Mobile-Specific Financial Dashboard Patterns

1. **Pull-to-refresh** — Users expect swipe-down to refresh financial data. Not yet implemented.
2. **Last sync indicator** — Show when data was last updated, with visual warning if stale.
3. **Haptic feedback** — Subtle vibration on important actions (period change, drill-down).
4. **Large touch targets** — Minimum 44x44pt for all interactive elements. Current cards meet this.
5. **Thumb-zone design** — Primary actions at bottom of screen. BottomNav is correctly placed.
6. **Offline resilience** — Cache last-known data and show "offline" banner. Not yet implemented.
7. **Period selector** — Sticky/accessible, not buried in a menu. ReportsScreen has this correctly.

---

## 4. User Role Analysis

### 4.1 Owner (OWNER)

**Full access to all 4 drill-down levels.**

**Primary use case:** Quick daily check of overall business health, then deep dive into problem areas.

**Key metrics (first screen):**
- Total revenue across all restaurants (today + vs yesterday/plan)
- Financial result (revenue - all expenses)
- Brand-level breakdown (BNA vs DNA performance)
- Alerts: any restaurant significantly below plan

**Navigation pattern:**
1. Opens app -> sees company dashboard (Level 0)
2. Notices BNA is down -> taps BNA brand card -> sees brand detail (Level 1)
3. Sees "Galereya" restaurant is red -> taps it -> restaurant detail (Level 2)
4. Checks expense breakdown -> taps "Salary" article -> article detail (Level 3)
5. Sees unusual expense -> taps to see individual operations (Level 4)

**Mobile UX needs:**
- Fastest possible load time (< 2 seconds)
- Notification-driven entry (push alert -> opens directly to problem area)
- Export capability (share PDF/screenshot to management group chat)
- Daily summary notification each evening

### 4.2 Finance Director (FINANCE_DIRECTOR)

**Access to Levels 0-3 (up to article level, no individual operations).**

**Primary use case:** Monitoring expense categories, verifying cost allocation, preparing financial reports.

**Key metrics (first screen):**
- Total expenses breakdown (direct vs distributed)
- Cost allocation coefficients per restaurant
- Expense trends (this month vs last month)
- Unusual expense alerts

**Navigation pattern:**
1. Opens app -> company dashboard
2. Drills into specific brand -> sees restaurants with expense data
3. Selects restaurant -> sees expense groups
4. Taps expense group -> sees individual articles with amounts and allocation source (iiko vs 1C)
5. Cannot drill further into operations (Level 4 blocked)

**Mobile UX needs:**
- Focus on expenses, not revenue (different card emphasis than Owner)
- Period comparison is critical (this month vs last month)
- Tables/lists with numerical precision (no rounding to "K" or "M" for expense analysis)
- Ability to see allocation formula/coefficient alongside distributed expenses

### 4.3 Operations Director (OPERATIONS_DIRECTOR)

**Access to Levels 0-2 (up to restaurant level, no article/operation detail).**

**Primary use case:** Monitoring restaurant operational performance, identifying underperforming locations.

**Key metrics (first screen):**
- Restaurant ranking by revenue
- Plan fulfillment percentage per restaurant
- Transaction count and average check
- Cash discrepancies (expected vs actual)

**Navigation pattern:**
1. Opens app -> company dashboard
2. Checks restaurant ranking -> identifies worst performer
3. Taps restaurant -> sees revenue by payment type, transaction volume
4. Checks cash discrepancy -> if significant, calls restaurant manager
5. Cannot drill into articles or operations (Levels 3-4 blocked)

**Mobile UX needs:**
- Restaurant comparison view (side-by-side or ranking table)
- Revenue by payment type is essential (Kaspi, Halyk, cash, Yandex)
- Cash discrepancy alerts with visual status (OK/WARNING/ERROR)
- Quick filters: sort by revenue, by plan %, by status

### 4.4 Admin (ADMIN)

**Configuration access only.**

**Primary use case:** User management, system health monitoring.

**Key actions:**
- View/edit user roles and phone numbers
- Monitor sync status (iiko + 1C connections)
- View sync logs and error history
- Configure notification thresholds
- Manage restaurant/brand assignments

**Mobile UX needs:**
- This role primarily needs a settings/admin panel, not financial data
- Sync status dashboard with last-sync timestamps
- User list with role assignment
- Push notification settings configuration
- Minimal financial data (may see aggregate numbers for context)

### 4.5 Role-Based Screen Matrix

| Screen / Feature | Owner | FinDir | OpsDir | Admin |
|-----------------|-------|--------|--------|-------|
| Company Dashboard | Full | Full | Full | Sync status only |
| Brand Detail | Full | Full | Full | N/A |
| Restaurant Detail | Full | Full | Full (no expenses) | N/A |
| Article Detail | Full | Full | N/A | N/A |
| Operation Detail | Full | N/A | N/A | N/A |
| Revenue by Payment | Yes | Yes | Yes | N/A |
| Expense Groups | Yes | Yes | Summary only | N/A |
| Cost Allocation | Yes | Yes | N/A | N/A |
| Cash Discrepancy | Yes | Yes | Yes | N/A |
| Reports & Export | Full | Full | Revenue only | N/A |
| Notifications | All types | Expense alerts | Revenue alerts | Sync alerts |
| Settings / Admin | Limited | Limited | Limited | Full |

---

## 5. Design System Recommendations

### 5.1 Color Palette

The app serves two brands under KEX GROUP. The design must be brand-neutral at the company level while allowing brand identification at drill-down levels.

**Proposed palette:**

```
Company Level (KEX GROUP):
  Primary:   #2563EB  (Electric Blue — current accent, neutral, professional)
  Secondary: #1E3A6E  (Navy — current gradient start, depth)

Brand Colors (for brand cards and detail screens):
  BNA (Burger na Abaya): #F97316 (Orange-500 — warm, fast food energy)
  DNA (Doner na Abaya):  #3B82F6 (Blue-500 — cool, differentiated from BNA)

Semantic Colors (keep current):
  Success:  #10B981  (Emerald — revenue up, on plan)
  Warning:  #F59E0B  (Amber — attention needed, near plan)
  Error:    #EF4444  (Red — below plan, critical)

Background (dark theme):
  Base:     #060E1A  (near-black with blue undertone)
  Surface:  #0D1B2E  (card background)
  Elevated: #142740  (raised elements, modals)

Background (light theme, future):
  Base:     #F8FAFC  (Slate-50)
  Surface:  #FFFFFF
  Elevated: #FFFFFF with shadow

Text (dark theme):
  Primary:   #EFF6FF  (current — excellent readability)
  Secondary: rgba(239,246,255,0.5)
  Tertiary:  rgba(239,246,255,0.25)
  Muted:     rgba(239,246,255,0.18)
```

### 5.2 Typography Scale

Using Inter (already installed as Plus Jakarta Sans dependency) with Cyrillic support:

```
Display:     36px / weight 500 / tracking -1.5  (hero KPI value)
Heading 1:   26px / weight 700 / tracking -0.8  (screen title)
Heading 2:   20px / weight 700 / tracking -0.6  (section heading)
Heading 3:   17px / weight 700                   (card title in header)
Body:        14px / weight 400                   (default text)
Body Small:  13px / weight 400                   (secondary text)
Caption:     12px / weight 400                   (timestamps, labels)
Caption SM:  11px / weight 400                   (badge text, fine print)
Label:       11px / weight 600 / uppercase / tracking 0.8  (section labels)
KPI Value:   28px / weight 500                   (metric numbers)
Mono:        14px / JetBrains Mono              (exact amounts, codes)
```

**Note:** JetBrains Mono is installed but unused. It should be applied to exact financial amounts (e.g., "₸1,234,567.00") for improved readability of digits in tabular contexts.

### 5.3 Spacing System

Current 7-step scale is good. Extend it slightly for consistency:

```
2xs:   2px   (hairline borders)
xs:    4px   (tight padding)
sm:    8px   (compact spacing)
md:   12px   (default inner padding)
lg:   16px   (card padding, section gaps)
xl:   20px   (screen horizontal padding)
2xl:  24px   (section separators)
3xl:  32px   (major section breaks)
4xl:  48px   (screen top padding)
```

**Border radii** — current scale is appropriate:
- Cards: 16px (current)
- Buttons: 14px (current)
- Badges/pills: 20px (current)
- Inputs: 14px (current)
- Full circle: 9999px

### 5.4 Component Library Plan

Build these reusable components to reduce the current duplication:

**Core Components (Phase 1):**
1. `KPICard` — metric value + label + trend + source badge (replaces 5+ inline patterns)
2. `HeroCard` — gradient card with large value + subtitle row (replaces dashboard/brand hero)
3. `SectionHeader` — title + count/action on right
4. `StatusBadge` — colored dot + label (green/yellow/red)
5. `TrendBadge` — deviation percentage with color
6. `PeriodSelector` — pill-style period toggle (already in Reports, needs extraction)
7. `BarChart` — horizontal/vertical bars with labels and legend
8. `ProgressBar` — thin plan-progress indicator
9. `Breadcrumb` — navigation path for 4-level drill-down
10. `EmptyState` — placeholder for no-data scenarios
11. `SkeletonLoader` — shimmer placeholder during loading

**Extended Components (Phase 2):**
12. `PullToRefresh` wrapper
13. `SyncIndicator` — last sync time with freshness color
14. `DataSourceBadge` — "iiko" / "1C" tags
15. `ExpenseRow` — label + bar + amount for expense breakdowns
16. `NotificationCard` — icon + title + body + time
17. `SearchBar` — with filter pills
18. `CurrencyText` — formatted tenge amounts with locale support

### 5.5 Dark/Light Theme Strategy

**Current state:** Dark theme only.
**TZ states:** "No dark theme" as a constraint — this is contradictory since the entire app IS dark.

**Recommendation:** Keep dark as default (it is already built and looks professional for financial data). Do NOT build a light theme for MVP. Dark themes have several advantages for financial dashboards:
- Reduced eye strain during extended use
- Better contrast for colored status indicators
- Professional, serious aesthetic appropriate for financial data
- Lower battery consumption on OLED screens (common on modern phones)

If light theme is requested later, the color token system is already structured to support it — just provide alternate token values behind a theme toggle.

### 5.6 Chart & Data Visualization Approach

**Recommended library:** `react-native-gifted-charts`

**Chart types needed:**
1. **Vertical bar chart** — hourly revenue (already hand-built, should migrate)
2. **Horizontal bar chart** — fact vs plan comparison (already hand-built)
3. **Stacked bar** — revenue by payment type
4. **Line chart** — revenue trend over days/weeks
5. **Donut chart** — expense distribution by category
6. **Sparkline** — mini trend in card context (e.g., 7-day revenue trend on a brand card)

**Visualization principles:**
- Always show comparison context (vs plan, vs previous period)
- Use semantic colors consistently (green = good, red = bad)
- Avoid 3D effects, keep charts flat and readable
- Label axes and values directly (no legends when possible)
- Touch-to-inspect: tap a bar to see exact value

---

## 6. Figma Concept Evaluation

### 6.1 Concept 1: Classic Finance (Dark)

**Description:** Dark theme, card-based layout, clean metric display.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Financial data display | 9/10 | Dark backgrounds make numbers pop. Cards provide clear data grouping. |
| Number readability | 9/10 | Light text on dark surface provides excellent contrast for KPI values. |
| Brand alignment | 7/10 | Professional but potentially too "banking" for a restaurant chain. |
| Role-based adaptability | 8/10 | Card-based layout easily shows/hides sections by role. |
| Dark/light potential | 6/10 | Already dark; converting to light would require significant rework. |
| Accessibility | 8/10 | Good contrast ratios for text. Need to verify color-blind safety of status colors. |

**Overall: 7.8/10**

**Strengths:** Closely matches the existing codebase. Clean, proven pattern for financial data. Easy to implement because the current code already follows this pattern.

**Weaknesses:** May feel cold and impersonal for restaurant industry context. Could benefit from subtle brand warmth.

### 6.2 Concept 2: Modern Gradient (Light)

**Description:** Light background, purple-blue gradient header, SaaS/dashboard feel.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Financial data display | 7/10 | Light backgrounds require more careful contrast management for numbers. |
| Number readability | 7/10 | Dark text on light works but gradient headers can reduce readability. |
| Brand alignment | 6/10 | SaaS aesthetic doesn't match restaurant industry. Feels like a Stripe dashboard. |
| Role-based adaptability | 7/10 | Works fine but gradient header wastes vertical space on mobile. |
| Dark/light potential | 5/10 | Gradient-heavy design is hard to adapt to dark mode coherently. |
| Accessibility | 6/10 | Gradients under text are an accessibility concern. Contrast varies across gradient. |

**Overall: 6.3/10**

**Strengths:** Modern, trendy look. Good whitespace usage.

**Weaknesses:** Gradients on headers reduce usable space and can hurt readability. The SaaS aesthetic is mismatched with the restaurant/food industry. Implementation would require a complete theme rewrite from the current dark codebase.

### 6.3 Concept 3: Minimal Clean (Revolut-style)

**Description:** Ultra-minimal white, text-first hierarchy, minimal chrome.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Financial data display | 8/10 | Text-first approach works well for numbers. Clean hierarchy. |
| Number readability | 9/10 | Large, unadorned numbers are very readable. |
| Brand alignment | 7/10 | Neutral enough to work for any brand. Revolut-style is well-understood. |
| Role-based adaptability | 8/10 | Minimal structure makes it easy to add/remove sections. |
| Dark/light potential | 9/10 | Minimal design translates well between themes. |
| Accessibility | 8/10 | Clean contrast, but ultra-thin borders may be invisible in bright light. |

**Overall: 8.2/10**

**Strengths:** Excellent number readability. Scales well to different content densities per role. Users familiar with Revolut/banking apps will feel at home. Clean, timeless aesthetic that won't feel dated.

**Weaknesses:** May feel too sparse for a dashboard with many metrics. Lacks visual warmth that could differentiate it from generic fintech. Ultra-minimal approach may not provide enough visual cues for the 4-level drill-down navigation.

### 6.4 Concept 4: Bold Corporate (Navy Header)

**Description:** Navy-blue header block, strong hierarchy with bold typography, brand icons and colors.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Financial data display | 8/10 | Strong hierarchy helps users find key numbers quickly. |
| Number readability | 8/10 | Bold typography makes numbers stand out. Navy provides good contrast. |
| Brand alignment | 9/10 | Best brand alignment — can incorporate BNA orange and DNA blue naturally. Corporate but warm. |
| Role-based adaptability | 7/10 | Bold headers take space; less room for role-specific content. |
| Dark/light potential | 7/10 | Navy + brand colors work in both themes with adjustment. |
| Accessibility | 7/10 | Good contrast overall but dense layouts can feel overwhelming. |

**Overall: 7.7/10**

**Strengths:** Strongest brand identity. The navy + brand color approach naturally differentiates BNA and DNA. Feels authoritative and trustworthy for business owners. The bold hierarchy guides the eye to important data.

**Weaknesses:** Can feel heavy on mobile. Bold corporate aesthetic may not feel modern enough for younger users. Risk of looking like a dated enterprise dashboard if not executed well.

### 6.5 Concept 5: Neon Fintech (Glassmorphism)

**Description:** Dark background with neon cyan/green accents, glassmorphism cards, modern fintech aesthetic.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Financial data display | 6/10 | Glassmorphism reduces card contrast. Neon colors can distract from numbers. |
| Number readability | 5/10 | Neon glow effects harm legibility. Multiple bright accents compete with data. |
| Brand alignment | 4/10 | Completely wrong for a restaurant business. This is a crypto/trading aesthetic. |
| Role-based adaptability | 6/10 | Style works but the visual noise makes varying content density harder. |
| Dark/light potential | 3/10 | Neon/glassmorphism is fundamentally a dark-mode concept. No light theme path. |
| Accessibility | 4/10 | Neon colors can trigger photosensitivity. Glassmorphism reduces contrast. WCAG concerns. |

**Overall: 4.7/10**

**Strengths:** Visually striking, modern. Would appeal to a crypto/trading audience.

**Weaknesses:** Worst choice for this project. Glassmorphism actively harms data readability. Neon accents are a distraction in a business tool where accuracy matters. Completely misaligned with the restaurant industry brand. Accessibility is a real concern. This aesthetic will look dated within 1-2 years.

---

## 7. Final Recommendation

### Primary Recommendation: Concept 1 (Classic Finance Dark) + Elements from Concept 3 (Minimal Clean) and Concept 4 (Bold Corporate)

**Rationale:** A hybrid approach gives the best result:

1. **Base: Classic Finance Dark (Concept 1)** — This is what is already built and working. The dark card-based layout is proven for financial dashboards. Minimal code changes needed.

2. **Borrow from Minimal Clean (Concept 3):** Adopt the text-first hierarchy and generous whitespace. Reduce visual chrome. Make numbers the hero, not cards. This means:
   - Simplify card borders (reduce from 1px border to subtle separator lines)
   - Increase KPI number size and weight for instant readability
   - Add more breathing room between sections
   - Use whitespace instead of borders to separate content

3. **Borrow from Bold Corporate (Concept 4):** Adopt the brand color differentiation strategy. This means:
   - BNA sections/cards get a subtle orange accent (left border or icon)
   - DNA sections/cards get a blue accent
   - Company-level stays neutral blue
   - Brand logos or icons in brand cards for instant recognition

### Specific Improvements to Implement

**Navigation:**
- Migrate from manual `useState` to React Navigation v7 with proper stack + tabs
- Add breadcrumb component showing path: "KEX > BNA > Galereya > Salary"
- Add swipe-back gesture support

**Data Display:**
- Wire up i18n (translations exist but are unused)
- Implement `Intl.NumberFormat('ru-RU')` for all currency/number formatting
- Add sparkline mini-charts to brand/restaurant cards
- Add "last updated X min ago" with freshness indicator

**Components to Build:**
- Extract 15+ reusable components from current inline patterns
- Add skeleton loaders for all data-fetching screens
- Add pull-to-refresh on all list screens

**Role-Based UI:**
- Implement role checks on navigation (hide Level 3-4 for OpsDir, hide Level 4 for FinDir)
- Adjust dashboard emphasis by role (Owner: revenue focus, FinDir: expense focus, OpsDir: operational focus)

**Charts:**
- Install `react-native-gifted-charts` or `victory-native`
- Replace hand-built bar charts with proper chart components
- Add trend sparklines to card components

**Missing Screens:**
- Article detail screen (Level 3)
- Operation detail screen (Level 4)
- Settings/profile screen
- Admin panel screen

### Concepts to Reject

- **Concept 2 (Modern Gradient):** Requires full theme rewrite, gradient headers waste mobile space, SaaS aesthetic is wrong for restaurant industry.
- **Concept 5 (Neon Fintech):** Absolutely wrong for this project. Harms readability, wrong brand association, poor accessibility. Do not use.

### Priority Order

1. Migrate navigation to React Navigation (blocks all future screen work)
2. Build reusable component library (reduces future implementation time 3-5x)
3. Wire up i18n (all translations already exist)
4. Implement role-based visibility
5. Add chart library and replace hand-built charts
6. Build missing Level 3-4 screens
7. Add pull-to-refresh, skeleton loaders, offline support
8. Brand color differentiation on brand/restaurant cards

---

## Sources

- [Fintech UX Best Practices 2026 — Eleken](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [UX Design Practices for Finance Apps — G & Co.](https://www.g-co.agency/insights/the-best-ux-design-practices-for-finance-apps)
- [Dashboard Design Principles — UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Drill-Down Interface Best Practices — FusionCharts](https://www.fusioncharts.com/resources/charting-best-practices/drill-down-interface)
- [Drill-Down Navigation — HPE Design System](https://design-system.hpe.design/templates/drill-down-navigation)
- [Best Free Cyrillic Fonts — Stfalcon](https://stfalcon.com/en/blog/post/best-free-fonts-for-designers)
- [Best Fonts for Mobile UI — Justinmind](https://www.justinmind.com/ui-design/best-font-mobile-app)
- [20 Best Cyrillic Fonts 2025 — TypeType](https://typetype.org/blog/20-best-cyrillic-fonts-of-2025/)
