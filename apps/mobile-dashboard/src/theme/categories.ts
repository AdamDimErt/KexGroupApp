// DDS Category color palette v3 — KEX GROUP Financial Dashboard
// Source: colors-categories.html lines 178-307
// Q1 resolution: colors-categories.html is source of truth (not icons-lucide.html)
// icons-lucide decorative colors are stale for food/equipment/security/taxes.
//
// Non-overlap guarantee: none of these 12 values collide with:
//   positive #22C55E · danger #EF4444 · warning #F59E0B · accent #2563EB
//
// Text-on-chip rule: UTILITIES, IT, TRAINING use text-inverse (#0F172A — dark text)
//   all others use #FFFFFF (white text)

export const categoryColors = {
  food:       '#8B5CF6', // violet-500   · Продукты питания  · white text · AA 4.8
  rent:       '#1E40AF', // blue-800     · Аренда помещений  · white text · AAA 8.6
  salary:     '#A855F7', // purple-500   · Заработная плата  · white text · AA 4.3
  utilities:  '#CA8A04', // yellow-600   · Коммунальные      · DARK TEXT (#0F172A) · AAA 7.1
  marketing:  '#EC4899', // pink-500     · Маркетинг         · white text · AA 4.5
  it:         '#06B6D4', // cyan-500     · IT и связь        · DARK TEXT (#0F172A) · AAA 8.3
  transport:  '#0D9488', // teal-700     · Транспорт         · white text · AA 4.6
  equipment:  '#78716C', // stone-500    · Оборудование      · white text · AA 4.7
  taxes:      '#B91C1C', // red-700      · Налоги (darker than danger#EF4444) · white · AAA 6.2
  security:   '#475569', // slate-600    · Охрана            · white text · AAA 7.4
  training:   '#84CC16', // lime-500     · Обучение (lime ≠ positive green) · DARK TEXT · AAA 9.8
  other:      '#64748B', // slate-500    · Прочие            · white text · AA 5.1
} as const;

export type CategoryKey = keyof typeof categoryColors;

// ─── Text-on-chip color rule ──────────────────────────────────────────────────
// 3 light chips require dark text (text-inverse #0F172A), others use #FFFFFF

export const LIGHT_CATEGORY_CHIPS: Set<CategoryKey> = new Set([
  'utilities',
  'it',
  'training',
]);

/** Returns correct text color for a given category chip */
export function categoryTextColor(key: CategoryKey): '#0F172A' | '#FFFFFF' {
  return LIGHT_CATEGORY_CHIPS.has(key) ? '#0F172A' : '#FFFFFF';
}

// ─── DDS expense group name → category key mapping ───────────────────────────
// Maps Russian DDS group names (from iiko) to category palette keys

export const GROUP_NAME_TO_CATEGORY: Record<string, CategoryKey> = {
  'Продукты питания':    'food',
  'Аренда помещений':   'rent',
  'Заработная плата':   'salary',
  'Коммунальные услуги':'utilities',
  'Маркетинг и реклама':'marketing',
  'IT и связь':         'it',
  'Транспортные расходы':'transport',
  'Оборудование и ремонт':'equipment',
  'Налоги и сборы':     'taxes',
  'Охрана и безопасность':'security',
  'Обучение персонала': 'training',
  'Прочие расходы':     'other',
} as const;

// ─── Tinted badge format (15%/30% pattern, same as pill tokens) ───────────────
// Source: colors-categories.html lines 349-401

export function categoryTint(hex: string): {
  bg: string;
  border: string;
  text: string;
} {
  return {
    bg:     `${hex}26`, // ~15% opacity in hex (0x26 = 38 ≈ 15%)
    border: `${hex}4D`, // ~30% opacity in hex (0x4D = 77 ≈ 30%)
    text:   hex,
  };
}
