import * as Sentry from '@sentry/react-native';
import { toZonedTime, format } from 'date-fns-tz';

// ─── BUG-11-2: BRAND_MAP replacing keyword-only resolveBrand ──────────────────
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

// ─── Existing exports (keep unchanged) ──────────────────────────────────────────

/**
 * Маппит legacy status к новому semantic enum.
 * green → above, yellow → onplan, red → below
 */
export function mapLegacyStatus(
  status: 'green' | 'yellow' | 'red' | null | undefined,
): 'above' | 'onplan' | 'below' {
  if (status === 'green') return 'above';
  if (status === 'red') return 'below';
  return 'onplan';
}

/**
 * Margin percentage: financialResult / revenue × 100.
 * Returns null if revenue is 0 or invalid.
 */
export function computeMarginPct(
  revenue: number,
  financialResult: number,
): number | null {
  if (!revenue || revenue <= 0) return null;
  return (financialResult / revenue) * 100;
}

// ─── BUG-11-1: render-layer formatters (moved from RestaurantCard.tsx) ────────
// Unit contract: marginPct and deltaPct are ALREADY in percentage units (0-100),
// produced by computeMarginPct (`× 100` inside) and computePlanDelta (`attainment - 100`).
// Formatters MUST NOT multiply by 100 again — doing so produced the BUG-11-1 7000% margin bug.

/**
 * Format a margin value (already in percentage units 0-100) as "N%".
 * Example: formatMargin(70.48) === "70%"
 * Returns "—" for null.
 */
export function formatMargin(v: number | null): string {
  if (v === null) return '—';
  return `${Math.round(v)}%`;
}

/**
 * Format a signed delta value (already in percentage units, e.g. -4.74 means -4.74%).
 * Positive values get a "+" prefix, negatives keep their sign from toFixed.
 * Example: formatDelta(-4.74) === "-4.7%", formatDelta(5.2) === "+5.2%"
 * Returns "—" for null.
 */
export function formatDelta(v: number | null): string {
  if (v === null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

/**
 * Plan attainment percentage (0..150).
 * Returns 0 if plannedRevenue is 0 or invalid.
 */
export function computePlanAttainment(
  revenue: number,
  plannedRevenue: number,
): number {
  if (!plannedRevenue || plannedRevenue <= 0) return 0;
  return Math.min(150, (revenue / plannedRevenue) * 100);
}

// ─── BUG-11-4: computePlanDelta + formatPlanLabel ────────────────────────────

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

// ─── BUG-11-6: formatSyncTime (Asia/Almaty, TZ-safe) ─────────────────────────

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

// ─── Existing export: formatPeriodLabel (unchanged) ──────────────────────────

/**
 * Форматирует period как "1–19 апр 2026".
 */
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
