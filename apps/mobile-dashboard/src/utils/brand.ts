export type BrandCode = 'BNA' | 'DNA';
export type Cuisine = 'Burger' | 'Doner';

/**
 * Определяет brand code (BNA/DNA) и cuisine по имени или slug бренда.
 * Использует keyword matching — "burger" → BNA, "doner" → DNA.
 * Fallback на BNA если не удалось распознать.
 */
export function resolveBrand(brandNameOrSlug: string): {
  code: BrandCode;
  cuisine: Cuisine;
} {
  const normalized = (brandNameOrSlug ?? '').toLowerCase();
  if (normalized.includes('doner') || normalized.includes('a-doner') || normalized.includes('донер')) {
    return { code: 'DNA', cuisine: 'Doner' };
  }
  // Default: Burger na Abaya
  return { code: 'BNA', cuisine: 'Burger' };
}

/**
 * Маппит legacy status к новому semantic enum.
 * green → above, yellow → onplan, red → below
 */
export function mapLegacyStatus(
  status: 'green' | 'yellow' | 'red' | null | undefined
): 'above' | 'onplan' | 'below' {
  if (status === 'green') return 'above';
  if (status === 'red') return 'below';
  return 'onplan';
}

/**
 * Margin percentage: financialResult / revenue × 100.
 * Returns null if revenue is 0 or invalid.
 */
export function computeMarginPct(revenue: number, financialResult: number): number | null {
  if (!revenue || revenue <= 0) return null;
  return (financialResult / revenue) * 100;
}

/**
 * Plan attainment percentage. Stub: returns 100 if no plan data.
 * TODO: Phase 11 — replace stub with real plannedRevenue from finance-service API.
 */
export function computePlanAttainment(revenue: number, plannedRevenue: number): number {
  if (!plannedRevenue || plannedRevenue <= 0) return 100;
  return Math.min(150, (revenue / plannedRevenue) * 100); // cap at 150%
}

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
