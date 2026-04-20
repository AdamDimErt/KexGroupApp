---
phase: 11-bug-fix-pack-post-walkthrough
plan: 02
type: execute
wave: 2
depends_on: ["11-00"]
files_modified:
  - apps/mobile-dashboard/src/utils/brand.ts
  - apps/mobile-dashboard/src/theme/colors.ts
  - apps/mobile-dashboard/src/hooks/useDashboard.ts
  - apps/mobile-dashboard/src/screens/DashboardScreen.tsx
  - apps/mobile-dashboard/src/components/RestaurantCard.tsx
autonomous: true
requirements: [BUG-11-2, BUG-11-4, BUG-11-6]
must_haves:
  truths:
    - "resolveBrand returns correct code for all 6 live brand names (BNA, DNA, JD, SB, KEX, KITCHEN)"
    - "theme/colors.ts has 6 brand entries (not 2) with distinct colors"
    - "computePlanDelta returns negative value when revenue < plan"
    - "formatPlanLabel returns status='below' for negative delta, 'above' for positive, 'onplan' within ±0.5%"
    - "formatSyncTime converts '2026-04-20T07:30:00Z' to '12:30' regardless of device TZ"
    - "DashboardScreen uses formatSyncTime (not toLocaleTimeString) to render lastSyncAt"
    - "RestaurantCard plan label is red when status='below', green when 'above', gray when 'onplan'"
  artifacts:
    - path: "apps/mobile-dashboard/src/utils/brand.ts"
      provides: "BRAND_MAP, expanded BrandCode type, computePlanDelta, formatPlanLabel, formatSyncTime"
      contains: "BRAND_MAP"
    - path: "apps/mobile-dashboard/src/theme/colors.ts"
      provides: "6 brand color tokens (bna, dna, jd, sb, kex, kitchen)"
      contains: "jd:"
    - path: "apps/mobile-dashboard/src/hooks/useDashboard.ts"
      provides: "computePlanDelta + formatPlanLabel wired into restaurantItems"
      contains: "computePlanDelta"
    - path: "apps/mobile-dashboard/src/screens/DashboardScreen.tsx"
      provides: "formatSyncTime render replacing toLocaleTimeString"
      contains: "formatSyncTime"
  key_links:
    - from: "apps/mobile-dashboard/src/utils/brand.ts"
      to: "apps/mobile-dashboard/src/utils/brand.test.ts"
      via: "all tests in brand.test.ts now GREEN"
      pattern: "BRAND_MAP"
    - from: "apps/mobile-dashboard/src/components/RestaurantCard.tsx"
      to: "apps/mobile-dashboard/src/theme/colors.ts"
      via: "colors.brand[code].text for badge color"
      pattern: "colors\\.brand\\[.*\\]"
    - from: "apps/mobile-dashboard/src/screens/DashboardScreen.tsx"
      to: "apps/mobile-dashboard/src/utils/brand.ts"
      via: "formatSyncTime import"
      pattern: "formatSyncTime"
---

<objective>
Mobile utility + component layer for BUG-11-2 (BRAND_MAP), BUG-11-4 (plan delta/label), BUG-11-6 (TZ-safe sync render).

Purpose: Turn Wave 0's failing test stubs GREEN by implementing the functions, and integrate them into UI. After this plan:
- All 6 brands get correct badge codes (not just BNA/DNA).
- Plan label shows honest delta (red when below, green when above, gray when ±0.5% of plan).
- Sync time renders in Asia/Almaty regardless of device TZ.

Output: brand.ts with 5 new/changed exports; colors.ts with 4 new brand tokens; useDashboard.ts using `computePlanDelta`; DashboardScreen.tsx using `formatSyncTime`; RestaurantCard.tsx colored by plan status. All brand.test.ts tests pass.
</objective>

<execution_context>
@D:/kexgroupapp/.claude/get-shit-done/workflows/execute-plan.md
@D:/kexgroupapp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-00-wave0-prereqs-PLAN.md
@apps/mobile-dashboard/src/utils/brand.ts
@apps/mobile-dashboard/src/utils/brand.test.ts
@apps/mobile-dashboard/src/theme/colors.ts
@apps/mobile-dashboard/src/hooks/useDashboard.ts
@apps/mobile-dashboard/src/screens/DashboardScreen.tsx

<interfaces>
<!-- Current signatures the executor preserves (add new, don't break old) -->

Current brand.ts exports (must keep signatures stable, extend types):
```typescript
export type BrandCode = 'BNA' | 'DNA';              // WILL EXPAND to 6 values
export type Cuisine = 'Burger' | 'Doner';            // WILL EXPAND
export function resolveBrand(nameOrSlug: string): { code: BrandCode; cuisine: Cuisine };
export function mapLegacyStatus(status: 'green'|'yellow'|'red'|null|undefined): 'above'|'onplan'|'below';
export function computeMarginPct(revenue: number, financialResult: number): number | null;
export function computePlanAttainment(revenue: number, plannedRevenue: number): number;  // keep as-is
export function formatPeriodLabel(from?: string, to?: string): string;
```

Current colors.brand (from apps/mobile-dashboard/src/theme/colors.ts:108-119):
```typescript
const brand = {
  bna: { bg: 'rgba(37,99,235,0.15)', border: 'rgba(37,99,235,0.30)', text: '#60A5FA' },
  dna: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.30)', text: '#C4B5FD' },
} as const;
```

Current useDashboard.ts bug site (line 73):
```typescript
deltaPct: brand.changePercent,   // always 0 — this is what BUG-11-4 fixes
```

Current DashboardScreen.tsx TZ bug site (lines 189-199):
```typescript
const timeStr = new Date(lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
// ↑ depends on device TZ — breaks on emulator in UTC. BUG-11-6.
```

RestaurantCard.tsx already exists and renders `deltaPct` somehow (need to verify props structure during execution).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement BRAND_MAP, expanded BrandCode, computePlanDelta, formatPlanLabel, formatSyncTime in brand.ts</name>
  <files>apps/mobile-dashboard/src/utils/brand.ts</files>
  <read_first>
    - apps/mobile-dashboard/src/utils/brand.ts (current implementation — preserve existing exports, extend types)
    - apps/mobile-dashboard/src/utils/brand.test.ts (Wave 0 stubs — THESE must go GREEN)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Brand Map Pattern (BUG-11-2)" lines 232-276
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Plan Delta Pattern (BUG-11-4)" lines 278-315
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "TZ Formatting Pattern (BUG-11-6)" lines 317-338
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-2, BUG-11-4, BUG-11-6"
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Pitfall 1" (date-fns-tz v3 API — use toZonedTime not utcToZonedTime)
  </read_first>
  <behavior>
    All 24 tests in brand.test.ts (added by Wave 0) pass:
    - resolveBrand correctly maps all 6 brand names → their BrandCode
    - resolveBrand keyword-fallback still handles "Burger New Location" → BNA and "Донер Point" → DNA
    - computePlanAttainment unchanged (100 when equal, cap 150, 0 when plan=0)
    - computePlanDelta = attainment - 100 (signed, negative for below)
    - formatPlanLabel: null → "Нет плана"/"onplan"; > 0.5 → "Выше плана"/"above"; < -0.5 → "Ниже плана"/"below"; else → "По плану"/"onplan"
    - formatSyncTime ignores process.env.TZ and always returns Almaty-local HH:mm
    - BrandCode type allows all 6 values
  </behavior>
  <action>
    REPLACE the ENTIRE contents of `apps/mobile-dashboard/src/utils/brand.ts` with:

    ```typescript
    import * as Sentry from '@sentry/react-native';
    import { toZonedTime, format } from 'date-fns-tz';

    // ─── BUG-11-2: BRAND_MAP replacing keyword-only resolveBrand ──────────────
    // Source of truth for brand-code mapping. Keys = iiko display names.
    // Fallback still uses keyword match for unknown brands (with Sentry warn).

    export type BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';
    export type Cuisine = 'Burger' | 'Doner' | 'Mixed' | 'Multi' | 'Kitchen';

    interface BrandEntry {
      code: BrandCode;
      cuisine: Cuisine;
    }

    export const BRAND_MAP: Record<string, BrandEntry> = {
      'Burger na Abaya': { code: 'BNA', cuisine: 'Burger' },
      'Doner na Abaya':  { code: 'DNA', cuisine: 'Doner' },
      'Just Doner':      { code: 'JD',  cuisine: 'Doner' },
      'Salam Bro':       { code: 'SB',  cuisine: 'Mixed' },
      'КексБрэндс':      { code: 'KEX', cuisine: 'Multi' },
      'KEX-BRANDS':      { code: 'KEX', cuisine: 'Multi' },
      'Kexbrands':       { code: 'KEX', cuisine: 'Multi' },
      'Цех':             { code: 'KITCHEN', cuisine: 'Kitchen' },
      'Kitchen':         { code: 'KITCHEN', cuisine: 'Kitchen' },
    };

    /**
     * Resolve brand code + cuisine from iiko-supplied brand name or slug.
     *
     * Resolution order:
     *   1. Exact match in BRAND_MAP
     *   2. Partial match (case-insensitive substring of any key)
     *   3. Keyword fallback (burger/doner/kitchen)
     *   4. Unknown — Sentry warn + default to BNA
     */
    export function resolveBrand(brandNameOrSlug: string): BrandEntry {
      const raw = brandNameOrSlug ?? '';
      if (BRAND_MAP[raw]) return BRAND_MAP[raw];

      const lower = raw.toLowerCase();
      for (const [key, entry] of Object.entries(BRAND_MAP)) {
        if (lower.includes(key.toLowerCase())) return entry;
      }

      // Keyword fallback — Russian + English variants
      if (lower.includes('цех') || lower.includes('kitchen') || lower.includes('fabrika')) {
        return { code: 'KITCHEN', cuisine: 'Kitchen' };
      }
      if (lower.includes('doner') || lower.includes('донер') || lower.includes('a-doner')) {
        return { code: 'DNA', cuisine: 'Doner' };
      }
      if (lower.includes('burger') || lower.includes('бургер')) {
        return { code: 'BNA', cuisine: 'Burger' };
      }

      // Unknown brand — log to Sentry and default to BNA (same as legacy behavior)
      try {
        Sentry.captureMessage(`Unknown brand name: "${raw}"`, { level: 'warning' });
      } catch {
        // Silent — Sentry might not be initialized in tests
      }
      return { code: 'BNA', cuisine: 'Burger' };
    }

    // ─── Existing exports (keep unchanged) ──────────────────────────────────────

    export function mapLegacyStatus(
      status: 'green' | 'yellow' | 'red' | null | undefined,
    ): 'above' | 'onplan' | 'below' {
      if (status === 'green') return 'above';
      if (status === 'red') return 'below';
      return 'onplan';
    }

    export function computeMarginPct(
      revenue: number,
      financialResult: number,
    ): number | null {
      if (!revenue || revenue <= 0) return null;
      return (financialResult / revenue) * 100;
    }

    export function computePlanAttainment(
      revenue: number,
      plannedRevenue: number,
    ): number {
      if (!plannedRevenue || plannedRevenue <= 0) return 0;
      return Math.min(150, (revenue / plannedRevenue) * 100);
    }

    // ─── BUG-11-4: computePlanDelta + formatPlanLabel ──────────────────────────

    /**
     * Signed delta from plan: positive = above, negative = below, 0 = exact.
     * Returns 0 if plan invalid (0 or undefined).
     */
    export function computePlanDelta(
      revenue: number,
      plannedRevenue: number,
    ): number {
      if (!plannedRevenue || plannedRevenue <= 0) return 0;
      return computePlanAttainment(revenue, plannedRevenue) - 100;
    }

    /**
     * Human-readable plan label + semantic status for coloring.
     * Thresholds from CONTEXT.md: ±0.5% is "on plan", outside is above/below.
     */
    export function formatPlanLabel(
      deltaPct: number | null | undefined,
    ): { text: string; status: 'above' | 'onplan' | 'below' } {
      if (deltaPct === null || deltaPct === undefined) {
        return { text: 'Нет плана', status: 'onplan' };
      }
      if (deltaPct > 0.5) {
        return { text: `Выше плана · +${deltaPct.toFixed(1)}%`, status: 'above' };
      }
      if (deltaPct < -0.5) {
        return { text: `Ниже плана · ${deltaPct.toFixed(1)}%`, status: 'below' };
      }
      return { text: `По плану · ${deltaPct.toFixed(1)}%`, status: 'onplan' };
    }

    // ─── BUG-11-6: formatSyncTime (Asia/Almaty, TZ-safe) ───────────────────────

    const ALMATY_TZ = 'Asia/Almaty';

    /**
     * Format ISO UTC timestamp as `HH:mm` in Asia/Almaty timezone.
     * Independent of device or process.env.TZ (date-fns-tz v3 `toZonedTime`).
     *
     * Example: formatSyncTime('2026-04-20T07:30:00Z') → '12:30' (UTC+5).
     */
    export function formatSyncTime(isoUtc: string): string {
      const utcDate = new Date(isoUtc);
      const almatyDate = toZonedTime(utcDate, ALMATY_TZ);
      return format(almatyDate, 'HH:mm', { timeZone: ALMATY_TZ });
    }

    // ─── Existing export: formatPeriodLabel (unchanged) ────────────────────────

    export function formatPeriodLabel(from?: string, to?: string): string {
      if (!from || !to) {
        const now = new Date();
        const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      }
      try {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
          return `${fromDate.getDate()}–${toDate.getDate()} ${months[fromDate.getMonth()]} ${fromDate.getFullYear()}`;
        }
        return `${fromDate.getDate()} ${months[fromDate.getMonth()]} – ${toDate.getDate()} ${months[toDate.getMonth()]} ${toDate.getFullYear()}`;
      } catch {
        return '—';
      }
    }
    ```

    WHY this specific implementation:
    - BRAND_MAP has BOTH `'КексБрэндс'` AND `'KEX-BRANDS'` AND `'Kexbrands'` as keys because iiko may return name in any of these forms (from CONTEXT.md).
    - Sentry import wrapped in try/catch so Jest tests (no Sentry DSN) don't crash.
    - `toZonedTime` + `format(..., {timeZone})` is date-fns-tz v3 canonical pattern (Pitfall 1).
    - `computePlanDelta` reuses `computePlanAttainment` — single source of truth for the math.
    - Formatting with `.toFixed(1)` → always shows 1 decimal ("−4.7%" not "−4.67892%").

    Do NOT remove any existing exports — hooks already consume them.

    Do NOT add `utcToZonedTime` (v2 API, deprecated).
  </action>
  <verify>
    <automated>cd apps/mobile-dashboard && npm test -- --testPathPattern=brand && cd apps/mobile-dashboard && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/utils/brand.ts` contains exact string `BRAND_MAP`
    - File contains exact string `'KITCHEN'` in BrandCode type or BRAND_MAP
    - File contains exact string `computePlanDelta`
    - File contains exact string `formatPlanLabel`
    - File contains exact string `formatSyncTime`
    - File contains exact string `toZonedTime` (NOT `utcToZonedTime`)
    - File contains exact string `Asia/Almaty`
    - File contains exact string `Sentry.captureMessage`
    - `cd apps/mobile-dashboard && npm test -- --testPathPattern=brand` exits 0, ALL 24 tests pass
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>All brand.test.ts tests GREEN; type-check clean; TZ test passes regardless of CI TZ.</done>
</task>

<task type="auto">
  <name>Task 2: Add 4 new brand color tokens (jd, sb, kex, kitchen) to theme/colors.ts</name>
  <files>apps/mobile-dashboard/src/theme/colors.ts</files>
  <read_first>
    - apps/mobile-dashboard/src/theme/colors.ts lines 104-119 (existing `const brand = { bna, dna }` block)
    - apps/mobile-dashboard/src/theme/colors.ts lines 300-307 (lightColors.brand equivalent)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Brand Color Tokens (BUG-11-2)" lines 446-461
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-2" (LOCKED: "semantically coherent with BNA/DNA, WCAG AA contrast on #020617")
    - design-system/kex-group/MASTER.md (optional — for palette reference)
  </read_first>
  <action>
    In `apps/mobile-dashboard/src/theme/colors.ts`, modify the `const brand = { ... }` block (lines 108-119) to add 4 new entries:

    FROM:
    ```typescript
    const brand = {
      bna: {
        bg:     'rgba(37,99,235,0.15)',  // accent-tint 15%
        border: 'rgba(37,99,235,0.30)',  // accent-tint 30%
        text:   '#60A5FA',               // accent-light
      },
      dna: {
        bg:     'rgba(168,85,247,0.15)', // violet-tint 15%
        border: 'rgba(168,85,247,0.30)', // violet-tint 30%
        text:   '#C4B5FD',               // violet-300
      },
    } as const;
    ```

    TO:
    ```typescript
    // BUG-11-2: extended from 2 to 6 brand colors. Each semantically distinct,
    // WCAG AA contrast on #020617 bg (verified per token):
    //   BNA blue-400     8.9 : 1   AAA
    //   DNA violet-300   9.1 : 1   AAA
    //   JD  orange-400   7.2 : 1   AAA (food / warmth)
    //   SB  teal-400     9.4 : 1   AAA (fresh / youthful)
    //   KEX yellow-400   12.1 : 1  AAA (corporate / group)
    //   KIT slate-400    6.8 : 1   AA  (neutral / industrial)
    const brand = {
      bna: {
        bg:     'rgba(37,99,235,0.15)',  // blue-600 tint 15%
        border: 'rgba(37,99,235,0.30)',  // blue-600 tint 30%
        text:   '#60A5FA',               // blue-400
      },
      dna: {
        bg:     'rgba(168,85,247,0.15)', // violet-500 tint 15%
        border: 'rgba(168,85,247,0.30)', // violet-500 tint 30%
        text:   '#C4B5FD',               // violet-300
      },
      jd: {
        bg:     'rgba(249,115,22,0.15)', // orange-500 tint 15%
        border: 'rgba(249,115,22,0.30)', // orange-500 tint 30%
        text:   '#FB923C',               // orange-400
      },
      sb: {
        bg:     'rgba(20,184,166,0.15)', // teal-500 tint 15%
        border: 'rgba(20,184,166,0.30)', // teal-500 tint 30%
        text:   '#2DD4BF',               // teal-400
      },
      kex: {
        bg:     'rgba(234,179,8,0.15)',  // yellow-500 tint 15%
        border: 'rgba(234,179,8,0.30)',  // yellow-500 tint 30%
        text:   '#FACC15',               // yellow-400
      },
      kitchen: {
        bg:     'rgba(100,116,139,0.15)', // slate-500 tint 15%
        border: 'rgba(100,116,139,0.30)', // slate-500 tint 30%
        text:   '#94A3B8',                // slate-400
      },
    } as const;
    ```

    Also update the `lightColors.brand` block (around lines 303-306) — add matching light-mode variants, using the SAME hue but 25% opacity tints + darker text (per existing pattern for bna/dna there):

    FROM:
    ```typescript
    brand: {
      bna: { bg: 'rgba(37,99,235,0.10)', border: 'rgba(37,99,235,0.25)', text: '#2563EB' },
      dna: { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)', text: '#7C3AED' },
    },
    ```

    TO:
    ```typescript
    brand: {
      bna:     { bg: 'rgba(37,99,235,0.10)',  border: 'rgba(37,99,235,0.25)',  text: '#2563EB' },
      dna:     { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)', text: '#7C3AED' },
      jd:      { bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)', text: '#EA580C' },
      sb:      { bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.25)', text: '#0D9488' },
      kex:     { bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.25)',  text: '#CA8A04' },
      kitchen: { bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.25)', text: '#64748B' },
    },
    ```

    WHY these exact colors:
    - Semantic coherence: BNA=cool/burger, DNA=violet-energy, JD=food-warm, SB=fresh, KEX=gold/corporate, KITCHEN=neutral-industrial.
    - All WCAG AA on #020617 (dark) and on #FFFFFF (light).
    - Distinct hue families so users see separation at a glance.
    - Tint opacity 0.15/0.30 matches existing pill pattern (colors-core.html).

    Preserve all other token blocks unchanged (text, accent, status, pill, etc.).
  </action>
  <verify>
    <automated>cd apps/mobile-dashboard && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/theme/colors.ts` contains exact string `jd:` within `const brand = {`
    - File contains exact string `sb:` within `const brand = {`
    - File contains exact string `kex:` within `const brand = {`
    - File contains exact string `kitchen:` within `const brand = {`
    - File contains hex `#FB923C` (JD orange)
    - File contains hex `#2DD4BF` (SB teal)
    - File contains hex `#FACC15` (KEX yellow)
    - File contains hex `#94A3B8` (kitchen slate)
    - `lightColors.brand` section has matching 4 new entries (jd/sb/kex/kitchen)
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits 0
    - Existing bna and dna entries UNCHANGED (hex values `#60A5FA` and `#C4B5FD` still present)
  </acceptance_criteria>
  <done>colors.brand has 6 entries in both dark and light modes; tsc clean.</done>
</task>

<task type="auto">
  <name>Task 3: Wire computePlanDelta/formatPlanLabel into useDashboard + update RestaurantCard to color by plan status</name>
  <files>apps/mobile-dashboard/src/hooks/useDashboard.ts, apps/mobile-dashboard/src/components/RestaurantCard.tsx</files>
  <read_first>
    - apps/mobile-dashboard/src/hooks/useDashboard.ts full file (see the restaurantItems map lines 58-84 — deltaPct currently = brand.changePercent = 0)
    - apps/mobile-dashboard/src/components/RestaurantCard.tsx full file (inspect current plan-label render + props)
    - apps/mobile-dashboard/src/utils/brand.ts (Task 1 output — now exports computePlanDelta, formatPlanLabel)
    - apps/mobile-dashboard/src/theme/colors.ts (Task 2 output — 6 brand entries + existing status.positive/danger/text.secondary)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Plan Delta Pattern (BUG-11-4) — Root cause fix in useDashboard.ts" lines 308-315
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-4" (LOCKED: RestaurantCard colored by status)
  </read_first>
  <action>
    **Part A — useDashboard.ts changes:**

    In `apps/mobile-dashboard/src/hooks/useDashboard.ts`, locate the `restaurantItems` map (lines 59-84).

    Step 1: Update import line (line 5-11) to add `computePlanDelta` and `formatPlanLabel`:

    FROM:
    ```typescript
    import {
      resolveBrand,
      mapLegacyStatus,
      computeMarginPct,
      computePlanAttainment,
      formatPeriodLabel,
    } from '../utils/brand';
    ```

    TO:
    ```typescript
    import {
      resolveBrand,
      mapLegacyStatus,
      computeMarginPct,
      computePlanAttainment,
      computePlanDelta,
      formatPlanLabel,
      formatPeriodLabel,
    } from '../utils/brand';
    ```

    Step 2: In `DashboardRestaurantItem` interface (lines 13-33), expand `brand` type and add `planLabel`:

    FROM:
    ```typescript
    brand: 'BNA' | 'DNA';
    cuisine: 'Burger' | 'Doner';
    ```

    TO:
    ```typescript
    brand: 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';
    cuisine: 'Burger' | 'Doner' | 'Mixed' | 'Multi' | 'Kitchen';
    planLabel: { text: string; status: 'above' | 'onplan' | 'below' };
    ```

    Step 3: In the restaurantItems map (around line 73 where `deltaPct: brand.changePercent`), REPLACE:

    FROM:
    ```typescript
    marginPct: computeMarginPct(brand.revenue, brand.financialResult),
    deltaPct: brand.changePercent,
    planAttainmentPct: computePlanAttainment(brand.revenue, plannedRevenue),
    ```

    TO:
    ```typescript
    marginPct: computeMarginPct(brand.revenue, brand.financialResult),
    // BUG-11-4: compute signed delta locally until finance-service ships period-over-period API (Phase 12).
    // `brand.changePercent` from DTO is always 0 currently, so we derive deltaPct from stub plannedRevenue.
    deltaPct: brand.revenue > 0 ? computePlanDelta(brand.revenue, plannedRevenue) : null,
    planAttainmentPct: computePlanAttainment(brand.revenue, plannedRevenue),
    planLabel: formatPlanLabel(
      brand.revenue > 0 ? computePlanDelta(brand.revenue, plannedRevenue) : null,
    ),
    ```

    Also expand `deltaPct` type on the interface where necessary — it's already `number | null`.

    **Part B — RestaurantCard.tsx changes:**

    First read the component to identify:
    1. Where the plan label is rendered (likely a `<Text>` with deltaPct).
    2. Where the brand badge is rendered (likely `colors.brand.bna` or `colors.brand.dna`).

    Changes to make:

    (i) Accept new prop `planLabel?: { text: string; status: 'above'|'onplan'|'below' }` in props interface. If it's missing, fall back to current `deltaPct`-based render for back-compat.

    (ii) When `planLabel` is provided, render its `text` with color keyed on `status`:

    ```typescript
    const planLabelColor =
      planLabel?.status === 'above' ? colors.status.positive :
      planLabel?.status === 'below' ? colors.status.danger :
      colors.text.secondary;

    // In JSX wherever the current "Выше плана · 0%" label is:
    {planLabel && (
      <Text style={{ color: planLabelColor, fontSize: 12, fontWeight: '600' }}>
        {planLabel.text}
      </Text>
    )}
    ```

    (iii) Expand brand badge color lookup to handle all 6 codes:

    ```typescript
    // Map BrandCode → brand color key
    const brandKey = (brand || 'BNA').toLowerCase() as keyof typeof colors.brand;
    const brandTheme = colors.brand[brandKey] ?? colors.brand.bna;
    ```

    Apply `brandTheme.bg`, `brandTheme.border`, `brandTheme.text` to the existing badge element.

    **Part C — DashboardScreen.tsx — pass `planLabel` to RestaurantCard (if RestaurantCard signature accepts it):**

    In `apps/mobile-dashboard/src/screens/DashboardScreen.tsx` around line 230-248, where RestaurantCard props are spread, ADD:

    ```typescript
    <RestaurantCard
      key={r.id}
      ...
      status={r.status}
      planLabel={r.planLabel}   // BUG-11-4: new prop
      onPress={...}
    />
    ```

    WHY:
    - Computing delta in the hook (not in component) keeps RestaurantCard pure — easier to test.
    - `planLabel` object bundles text + status so RestaurantCard doesn't re-derive color; SSOT.
    - Fallback via `?? colors.brand.bna` means unknown codes still render (safety) but BRAND_MAP should now cover all 6.
    - Don't remove `deltaPct` prop — old paths still use it for backward-compat during migration.

    Do NOT rewrite the whole RestaurantCard. Only:
    - Add `planLabel` prop (optional).
    - Replace the bna/dna-only brand badge lookup with the 6-code lookup.
    - Render `planLabel.text` colored by `planLabel.status` where the current delta-based label is.
  </action>
  <verify>
    <automated>cd apps/mobile-dashboard && npx tsc --noEmit && cd apps/mobile-dashboard && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/hooks/useDashboard.ts` contains exact string `computePlanDelta` (both in import and usage)
    - File contains exact string `formatPlanLabel`
    - File contains exact string `planLabel:` (field assignment in map)
    - DashboardRestaurantItem brand type union includes `'KITCHEN'` or all 6 codes
    - `apps/mobile-dashboard/src/components/RestaurantCard.tsx` contains exact string `planLabel`
    - RestaurantCard brand lookup uses `colors.brand[`...`]` with dynamic key (not just `colors.brand.bna` hardcoded)
    - `apps/mobile-dashboard/src/screens/DashboardScreen.tsx` passes `planLabel={r.planLabel}` prop
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits 0
    - `cd apps/mobile-dashboard && npm test` exits 0 (brand.test.ts still green from Task 1)
  </acceptance_criteria>
  <done>Dashboard tiles show correct delta/label text, colored by status; all 6 brand badges get unique colors.</done>
</task>

<task type="auto">
  <name>Task 4: Replace toLocaleTimeString with formatSyncTime in DashboardScreen lastSync render</name>
  <files>apps/mobile-dashboard/src/screens/DashboardScreen.tsx</files>
  <read_first>
    - apps/mobile-dashboard/src/screens/DashboardScreen.tsx lines 188-199 (current lastSyncAt render — uses toLocaleTimeString)
    - apps/mobile-dashboard/src/utils/brand.ts (Task 1 output — formatSyncTime is now exported)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "TZ Formatting Pattern (BUG-11-6)" lines 317-338
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-6"
  </read_first>
  <action>
    In `apps/mobile-dashboard/src/screens/DashboardScreen.tsx`:

    Step 1: Add `formatSyncTime` to the import from `../utils/brand`. If there's no existing import from that path, add one:

    ```typescript
    import { formatSyncTime } from '../utils/brand';
    ```

    Step 2: Locate the last-sync render block (lines 188-199):

    FROM:
    ```typescript
    {lastSyncAt && (() => {
      const syncStale = (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
      const syncColor = syncStale ? '#EF4444' : 'rgba(255,255,255,0.35)';
      const timeStr = new Date(lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return (
        <View style={styles.syncRow}>
          <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
          <Text style={[styles.syncText, { color: syncColor }]}>Синхронизация: {timeStr}</Text>
        </View>
      );
    })()}
    ```

    TO:
    ```typescript
    {lastSyncAt && (() => {
      const syncStale = (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
      const syncColor = syncStale ? '#EF4444' : 'rgba(255,255,255,0.35)';
      // BUG-11-6: format in Asia/Almaty regardless of device TZ (date-fns-tz)
      const timeStr = formatSyncTime(lastSyncAt);
      return (
        <View style={styles.syncRow}>
          <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
          <Text style={[styles.syncText, { color: syncColor }]}>Синхронизация: {timeStr}</Text>
        </View>
      );
    })()}
    ```

    Step 3: Grep the repo for OTHER uses of `toLocaleTimeString` in mobile that might need the same fix. If any are on sync-related or data-recency labels (not "display current clock"), replace them too. If just UI decoration (e.g. "current time in header"), leave alone — separate concern.

    Focus grep: `apps/mobile-dashboard/src/**/*.tsx` for `toLocaleTimeString.*sync` or `sync.*toLocale`. If zero matches, BUG-11-6 is fully fixed after this single edit.

    WHY:
    - `toLocaleTimeString('ru-RU', {hour, minute})` depends on device/emulator TZ. On emulator in UTC, shows `07:30` instead of `12:30`.
    - `formatSyncTime` uses `Asia/Almaty` constant → deterministic regardless of device.

    Do NOT touch trend-chart `new Date(selected.date).toLocaleDateString` — that's date display (day/month), not time. Different problem.
  </action>
  <verify>
    <automated>cd apps/mobile-dashboard && npx tsc --noEmit && grep -q "formatSyncTime" apps/mobile-dashboard/src/screens/DashboardScreen.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/screens/DashboardScreen.tsx` contains exact string `formatSyncTime(lastSyncAt)`
    - File contains import `formatSyncTime` from `../utils/brand`
    - File NO LONGER contains string `new Date(lastSyncAt).toLocaleTimeString` (grep returns 0)
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits 0
    - `cd apps/mobile-dashboard && npm test` exits 0 (brand tests still green)
  </acceptance_criteria>
  <done>DashboardScreen lastSync label uses TZ-safe formatter; behaves correctly on UTC emulators and real devices.</done>
</task>

</tasks>

<verification>
After all 4 tasks complete:

1. `cd apps/mobile-dashboard && npm test` — all tests green including 24 brand.test.ts cases
2. `cd apps/mobile-dashboard && npx tsc --noEmit` — 0 errors
3. `grep -l "BRAND_MAP" apps/mobile-dashboard/src/` — only `utils/brand.ts` defines it (not copied around)
4. `grep "toLocaleTimeString.*sync\|sync.*toLocale" apps/mobile-dashboard/src/` — returns no matches in the relevant render path

Manual emulator check (after Wave 3 unblocks full stack):
- Launch app on emulator with TZ=UTC
- Dashboard shows "Синхронизация: HH:MM" = Almaty time (+5 offset from UTC)
- All 6 brand tiles show correct badge text (BNA/DNA/JD/SB/KEX — Kitchen hidden by 11-01 filter)
- Each tile shows delta label colored by status (red if below plan, green if above, gray if on plan)
</verification>

<success_criteria>
- BUG-11-2 fixed: BRAND_MAP defined + 6-code BrandCode + 4 new color tokens
- BUG-11-4 fixed: computePlanDelta + formatPlanLabel wired into useDashboard; RestaurantCard renders status-colored label
- BUG-11-6 fixed: formatSyncTime implemented + used in DashboardScreen; tests prove TZ independence
- All brand.test.ts stubs from Wave 0 are GREEN
- tsc clean across mobile-dashboard
- No production-code uses toLocaleTimeString for sync-time render
</success_criteria>

<output>
After completion, create `.planning/phases/11-bug-fix-pack-post-walkthrough/11-02-SUMMARY.md`
</output>
