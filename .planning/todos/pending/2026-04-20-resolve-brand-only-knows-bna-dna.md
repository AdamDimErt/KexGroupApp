---
created: 2026-04-20T00:42:00Z
title: resolveBrand знает только BNA/DNA — 4 бренда из 6 получают неправильный бейдж
area: mobile
priority: critical
files:
  - apps/mobile-dashboard/src/utils/brand.ts
  - apps/mobile-dashboard/src/theme/colors.ts (colors.brand map)
---

## Problem

Реальные данные iiko возвращают **6 брендов**, но `resolveBrand(nameOrSlug)` ищет только ключевые слова `"doner"/"донер"` → DNA, иначе → BNA. Результат на Dashboard:

| Название в API | Ожидаемый бейдж | Фактически |
|---|---|---|
| Burger na Abaya | BNA | BNA ✓ |
| Doner na Abaya | DNA | DNA ✓ |
| Just Doner | **JD** | **DNA** (matches "doner") |
| Salam Bro | **SB** | **BNA** (fallback) |
| КексБрэндс | **KEX** | **BNA** (fallback) |
| Цех | **KITCHEN** (или скрыть) | **BNA** (fallback) |

Subtitle показывает правильно: `JD · Doner · 20-20 апр 2026`, но большой badge-круг — `DNA`. Конфликт.

## Root Cause

`apps/mobile-dashboard/src/utils/brand.ts`:
```ts
export function resolveBrand(nameOrSlug: string): { code: 'BNA' | 'DNA'; cuisine: string } {
  const s = nameOrSlug.toLowerCase();
  if (s.includes('doner') || s.includes('донер')) return { code: 'DNA', cuisine: 'Doner' };
  return { code: 'BNA', cuisine: 'Burger' };
}
```

Тип литерал `'BNA' | 'DNA'` тоже нужно расширить.

## Solution

Заменить keyword-match на **таблицу маппинга по точному имени** (case-insensitive) + fallback на первые 2-3 буквы:

```ts
type BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN';

const BRAND_MAP: Record<string, { code: BrandCode; cuisine: string }> = {
  'burger na abaya': { code: 'BNA', cuisine: 'Burger' },
  'doner na abaya':  { code: 'DNA', cuisine: 'Doner' },
  'just doner':      { code: 'JD',  cuisine: 'Doner' },
  'salam bro':       { code: 'SB',  cuisine: 'Burger' },
  'кексбрэндс':      { code: 'KEX', cuisine: 'Mixed' },
  'kex-brands':      { code: 'KEX', cuisine: 'Mixed' },
  'цех':             { code: 'KITCHEN', cuisine: 'Kitchen' },
  'kitchen':         { code: 'KITCHEN', cuisine: 'Kitchen' },
};

export function resolveBrand(nameOrSlug: string) {
  const key = nameOrSlug.toLowerCase().trim();
  if (BRAND_MAP[key]) return BRAND_MAP[key];
  // fallback: keyword detection for unknown brand names
  if (key.includes('doner') || key.includes('донер')) return { code: 'DNA', cuisine: 'Doner' };
  if (key.includes('burger') || key.includes('бургер')) return { code: 'BNA', cuisine: 'Burger' };
  return { code: 'BNA', cuisine: 'Mixed' }; // safe default, но логать unknown brand
}
```

**Связанные файлы:**
- `src/theme/colors.ts` — расширить `colors.brand` с 2 до 6 цветов (JD, SB, KEX, KITCHEN новые цвета из DESIGN_RESEARCH.md)
- `src/components/RestaurantCard.tsx` — badge component принимает BrandCode

## Acceptance

- На Dashboard у Just Doner badge = `JD`, у Salam Bro = `SB`, у КексБрэндс = `KEX`
- `resolveBrand('Just Doner').code === 'JD'`
- Неизвестный бренд пишет warning в Sentry (чтобы заметить новое имя)
- `colors.brand` имеет все 6 цветов с WCAG AA контрастом
