# Phase 10 · Design System v3 Sync — TOKEN-MAP (Wave 1 Research)

**Author:** UX Architect
**Date:** 2026-04-19
**Status:** Wave 1 complete — ready for Wave 2 (mobile-agent tokens implementation)
**Source of truth:** 19 approved HTML prototypes in `C:\Users\Acer\Downloads\`
**Target:** `apps/mobile-dashboard/src/theme/*` (React Native + Expo)

---

## Executive summary

| Category | Tokens extracted | Breaking changes |
|---|---|---|
| Colors | 48 | 19 (text opacity→solid hex, status names, category palette) |
| Spacing | 11 | 1 (old 7-level → new 11-level) |
| Radii | 6 | 0 (scale compatible, only docs) |
| Typography | 7 heading + 5 body + 2 families + 4 weights | 4 (font families, KPI weight, heading weights, lh) |
| Shadows | 5 elev + 3 glow + 2 inset = 10 | 6 (all existing shadows are wrong) |
| Icons | 12 DDS + 30 UI + 8 semantic + 4 source | 3 (palette mismatch between files, name sync) |
| **Total** | **~140 tokens** | **~33 breaking changes** |

Text hierarchy flattens from 5 opacity levels to **5 solid-hex levels** (`#F8FAFC / #CBD5E1 / #94A3B8 / #64748B / #475569`).  Font stack swaps `JetBrains Mono`→`Fira Code v6.2` and `Plus Jakarta Sans`→`Fira Sans v4.301`.  Shadows rewritten: on dark OLED, **bg-color elevation is primary**, shadow is secondary. All shadow tokens must include `shadowColor / shadowOffset / shadowOpacity / shadowRadius / elevation`.

---

## 1 · Color tokens

### 1.1 Background hierarchy (OLED dark)

Source: `colors-core (1).html` lines 180-199, lines 493-495.

```
--color-bg:            #020617   · slate-950 · app base (OLED)
--color-bg-card:       #0F172A   · slate-900 · cards / sheets       · DEFAULT surface
--color-bg-card-elev:  #1E293B   · slate-800 · modals / hover / tooltip body
```

- RN usage: `colors.bg`, `colors.bgCard`, `colors.bgCardElev`
- Elevation principle (shadows (1).html, rule line 748): «Elevation = bg color FIRST, shadow SECOND» on dark mode
- No "bgInput" — remove. Inputs use `bgCard` + borders.

### 1.2 Text hierarchy (5 solid-hex levels + inverse + link)

Source: `colors-text.html` lines 310-348, `colors-core (1).html` lines 499, `type-headings (1).html` lines 493-513, `type-body (2).html` verify note (adds `text-secondary #CBD5E1` as 5th-level, round-trip to colors-text).

```
--color-text-default:    #F8FAFC   · slate-50  · headings, KPI, primary body         · AAA 18.5 on bg
--color-text-secondary:  #CBD5E1   · slate-300 · supporting text, secondary body     · AAA
--color-text-muted:      #94A3B8   · slate-400 · captions, metadata, timestamps      · AA 6.8
--color-text-tertiary:   #64748B   · slate-500 · labels, dates, IDs                  · AA 4.9 (fails AA on #1E293B!)
--color-text-disabled:   #475569   · slate-600 · decoration/placeholder ONLY         · decoration only
--color-text-inverse:    #0F172A   · slate-900 · text on light solid (iiko/1C chips) · AAA on light
--color-text-link:       #60A5FA   · blue-400  · inline links                        · AAA 8.9
```

**CRITICAL**: Brief task spec mentions `text-secondary` as 5th level. `colors-text.html` doesn't have it yet (known sync TODO, see type-body (2).html verify line 508), but `type-headings (1).html` lines 499-501 confirms it IS in the v3 scale. Include `#CBD5E1` as canonical 2nd level.

- RN usage: `colors.text.default / secondary / muted / tertiary / disabled / inverse / link`
- **Rationale**: Text hierarchy through solid hex, not opacity. Opacity breaks predictably in RN across platforms and light/dark modes.
- **Antipattern (colors-text.html line 493)**: `opacity: 0.6` instead of `text-muted` token.

### 1.3 Accent (brand)

Source: `colors-core (1).html` lines 207-239.

```
--color-accent:          #2563EB   · blue-600 · primary CTA, active nav               · AA 5.1
--color-accent-dark:     #1D4ED8   · blue-700 · pressed state SURFACE ONLY            · 4.2 (not for text)
--color-accent-light:    #60A5FA   · blue-400 · text links, soft accents              · AAA 8.9
--color-accent-hover:    #1E40AF   · blue-800 · hover surface                         · not for text
```

### 1.4 Semantic (status)

Source: `colors-core (1).html` lines 277-306, `colors-status.html` lines 297-332.

```
--color-positive:  #22C55E   · green-500  · +Δ revenue, sync OK            · AAA 9.8
--color-warning:   #F59E0B   · amber-500  · cash discrepancies             · AAA 10.2
--color-danger:    #EF4444   · red-500    · loss, sync error               · AA 5.9 (fails on #1E293B — beware)
--color-info:      #0EA5E9   · sky-500    · neutral notifications          · AA 7.1

// Optional light/dark variants (mostly used via tint)
--color-positive-dark:  #16A34A · green-600 · pressed, SURFACE ONLY
--color-positive-light: #4ADE80 · green-400 · badges, micro accents        · AAA 12.4
```

- RN usage: `colors.status.positive / warning / danger / info`
- **Antipattern (colors-status.html line 498)**: «положительная метрика +0.5% in warning-orange» — always `positive` even for tiny growth.
- **Critical rename**: old `colors.blue: #3B82F6` → removed. Info = `#0EA5E9` sky, not blue.

### 1.5 Brand badges (BNA / DNA)

Source: `restaurant-card.html` lines 96-112 + `shadows (1).html` lines 233-241.

```
// BNA (Burger na Abaya) — accent-blue pill
bna.bg:      rgba(37,99,235,0.15)    · tint 15%
bna.border:  rgba(37,99,235,0.30)    · tint 30%
bna.text:    #60A5FA                 · accent-light

// DNA (Doner na Abaya / A Doner) — violet pill
dna.bg:      rgba(168,85,247,0.15)
dna.border:  rgba(168,85,247,0.30)
dna.text:    #C4B5FD                 · violet-300
```

- RN usage: `colors.brand.bna` / `colors.brand.dna`
- **Rationale**: Violet chosen for DNA because it doesn't collide with any semantic (positive/warning/danger/info/accent) and has sufficient contrast on `bg-card`.
- **Rule**: NEVER use `#8B5CF6` (Food category) or `#A855F7` (Salary category) as DNA brand color — collision.

### 1.6 DDS category palette (12 colors, no-overlap)

Source: `colors-categories.html` lines 178-307.

| Key | Hex | Lucide icon | Notes |
|---|---|---|---|
| `food` | `#8B5CF6` | `utensils` | violet-500 · white text · AA 4.8 |
| `rent` | `#1E40AF` | `building-2` | blue-800 · white text · AAA 8.6 |
| `salary` | `#A855F7` | `wallet` | purple-500 · white text · AA 4.3 |
| `utilities` | `#CA8A04` | `zap` | yellow-600 · **dark text** (#0F172A) · AAA 7.1 |
| `marketing` | `#EC4899` | `megaphone` | pink-500 · white text · AA 4.5 |
| `it` | `#06B6D4` | `wifi` | cyan-500 · **dark text** · AAA 8.3 |
| `transport` | `#0D9488` | `truck` | teal-700 · white text · AA 4.6 |
| `equipment` | `#78716C` | `wrench` | stone-500 · white text · AA 4.7 |
| `taxes` | `#B91C1C` | `landmark` | red-700 (darker than danger) · white text · AAA 6.2 |
| `security` | `#475569` | `shield` | slate-600 · white text · AAA 7.4 |
| `training` | `#84CC16` | `graduation-cap` | lime-500 (≠positive green) · **dark text** · AAA 9.8 |
| `other` | `#64748B` | `more-horizontal` | slate-500 · white text · AA 5.1 |

- RN usage: `colors.categories.food / rent / ... / other`
- **Rule**: cuisine in KEX GROUP = `Burger` or `Doner` ONLY (per brief). Invented brand names forbidden.
- **Text-on-chip rule**: 3 light chips (`utilities`, `it`, `training`) require `text-inverse #0F172A`; others use `#FFFFFF`.
- **Open question**: `icons-lucide.html` (lines 352-363) shows DIFFERENT palette: `food: #F97316` (orange), `equipment: #6366F1`, `security: #14B8A6`, `transport: #0D9488` (match). This is a conflict — see section 9.

### 1.7 Pill backgrounds (tint pattern)

Source: `colors-core (1).html` lines 365-414, `colors-status.html` lines 336-370.

Universal formula: **`bg = color @ 0.15 opacity`, `border = color @ 0.30 opacity`, `text = solid color`**.

```
// positive tint
pill.positive.bg:      rgba(34,197,94,0.15)
pill.positive.border:  rgba(34,197,94,0.30)
pill.positive.text:    #22C55E

// warning tint
pill.warning.bg:       rgba(245,158,11,0.15)
pill.warning.border:   rgba(245,158,11,0.30)
pill.warning.text:     #F59E0B

// danger tint
pill.danger.bg:        rgba(239,68,68,0.15)
pill.danger.border:    rgba(239,68,68,0.30)
pill.danger.text:      #EF4444

// info tint
pill.info.bg:          rgba(14,165,233,0.15)
pill.info.border:      rgba(14,165,233,0.30)
pill.info.text:        #0EA5E9

// accent tint
pill.accent.bg:        rgba(37,99,235,0.15)
pill.accent.border:    rgba(37,99,235,0.30)
pill.accent.text:      #60A5FA
```

- RN usage: `colors.pill.positive.bg / border / text` (nested structure)
- **Migration**: replaces the old `greenBg / yellowBg / redBg / blueBg` which all used `0.12` opacity (off by 3%).

### 1.8 Borders and dividers

Source: `colors-core (1).html` lines 467-489.

```
--color-border-subtle:   #1E293B   · 1px · разделители внутри карточек
--color-border-default:  #334155   · 1px · границы карточек, inputs
--color-border-strong:   #475569   · 2px · focus ring, активные поля
```

- RN usage: `colors.border.subtle / default / strong`
- **Migration**: old `borderSubtle rgba 0.05` and `border rgba 0.08` → solid hex.

### 1.9 Interactive / pressed states

Source: `colors-core (1).html` lines 418-459.

```
btn.default:    bg #2563EB
btn.hover:      bg #1E40AF  · transition 150ms ease
btn.pressed:    bg #1D4ED8  · scale(0.98) · inset shadow
btn.focused:    bg #2563EB  · outline 2px #60A5FA  · outline-offset 2px
```

---

## 2 · Spacing tokens (11-level 4px-grid)

Source: `spacing (2).html` lines 488-556, 802-816.

```
--space-2xs:   4px    · icon-label inline, border-gap, chip-padding-y
--space-xs:    8px    · icon-text gap, btn-inline-gap, label-stack
--space-sm:   12px    · dense list rows, chip-padding-x, modal content-stack
--space-md:   16px    · card/kpi inset, btn padding-x, screen-margin     · DEFAULT
--space-lg:   20px    · hero-card inset, comfortable forms
--space-xl:   24px    · modal inset, list section-stack, between-groups
--space-2xl:  32px    · section-stack в dashboard, landing cards gap
--space-3xl:  40px    · hero-block padding, wide landing layout
--space-4xl:  48px    · onboarding hero, featured block
--space-5xl:  56px    · landing chapter-break
--space-6xl:  64px    · section-break marketing (rare)
```

### Component spacing map

Source: `spacing (2).html` line 816.

```
btn-inset         = md (16)        btn-inline         = xs (8)
input-inset       = md (16)        input-label-stack  = xs (8)
card-inset        = md (16)        card-stack         = xs (8)
kpi-inset         = md (16)        kpi-row-gap        = xs (8)
list-item-stack   = xs (8)         list-section-stack = xl (24)
modal-inset       = xl (24)        modal-stack        = sm (12)
bottom-sheet-inset = xl (24)       screen-margin      = md (16)
section-stack     = 2xl (32)
```

- RN usage: `spacing.xs2 / xs / sm / md / lg / xl / xl2 / xl3 / xl4 / xl5 / xl6` — note `2xs` is not a valid TS identifier, propose `xs2`.
- **Touch-target rule** (spacing (2).html lines 738-748): iOS HIG min 44pt (button height ≥ 44 = padding-y 12 + font 14 + padding-y 12); Android Material 48dp.
- **Density levels** (line 714-733): Dense = 4-8 stack / 8-12 inset · **Normal = 8-12 stack / 12-16 inset (DEFAULT)** · Comfortable = 16-24 stack / 20-32 inset.

---

## 3 · Radii tokens (6-level scale)

Source: `radii (1).html` lines 417-459, 650-659.

```
--radius-sm:      4px    · tooltips, tags, code-blocks
--radius-md:      8px    · dropdowns, small chips, inline actions
--radius-lg:     12px    · buttons, inputs, cards, KPI              · DEFAULT
--radius-xl:     16px    · modals, bottom-sheets, hero-cards
--radius-2xl:    20px    · large promo, panels (rare)
--radius-full: 9999px    · pill-btn, avatars, chips, status-dots
```

### Component radii map

Source: `radii (1).html` line 659.

```
btn      = lg (12)    input   = lg (12)    card    = lg (12)    kpi    = lg (12)
modal    = xl (16)    hero    = xl (16)    chip    = full       avatar = full
tooltip  = sm (4)     dropdown = md (8)
```

- RN usage: `radii.sm / md / lg / xl / xl2 / full` — note `2xl` → `xl2` for TS.
- **Rule**: internal radius ≤ parent radius (chip 4 inside card 12). Don't mix 12 and 8 on same hierarchy level.
- **Mobile nuance** (radii (1).html lines 643-647): chips height 20-24px → prefer `full`, not 12. Dense-list rows h<44 → radius 0 or sm.
- **Backward-compat**: old `xxl: 20` → new `xl2: 20` (same value, rename).

---

## 4 · Typography tokens

### 4.1 Font families (pinned)

Source: `type-families (1).html` lines 373-376, 621-624.

```
--font-family-sans: 'Fira Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
--font-family-mono: 'Fira Code', 'SF Mono', Monaco, Consolas, monospace

// Pinned versions
Fira Sans: v4.301
Fira Code: v6.2

// Loaded weights (both families)
400 regular, 500 medium, 600 semibold, 700 bold

// Feature flag for tabular numerics
--font-feature-numeric: 'tnum' 1   // applied only to Fira Code
```

- Kazakh support confirmed: full 9 extended glyphs (Ә ә · Ғ ғ · Қ қ · Ң ң · Ө ө · Ұ ұ · Ү ү · Һ һ · І і) in both families.
- **Expo-Google-Fonts packages**: `@expo-google-fonts/fira-sans` + `@expo-google-fonts/fira-code`.
- **Total payload ≈ 180 KB gzip** (4 weights × 2 families × 2 subsets latin + cyrillic-ext).

### 4.2 Heading scale (7 levels)

Source: `type-headings (1).html` lines 101-108, 622-639.

| Token | Family | Size | Weight | Line-height | Letter-spacing | Notes |
|---|---|---|---|---|---|---|
| `displayNumeric` | **Fira Code** | 32 | 700 | 40 | -0.5 | ONLY hero-KPI numbers. tnum. |
| `screenTitle` | Fira Sans | 26 | 700 | 32 | -0.3 | One per screen. DEFAULT page title. |
| `h1` | Fira Sans | 22 | 700 | 28 | -0.2 | Brand / section |
| `h2` | Fira Sans | 18 | 600 | 24 | 0 | Section within screen |
| `h3` | Fira Sans | 16 | 600 | 20 | 0 | Sub-section |
| `h4` | Fira Sans | 14 | 600 | 20 | 0 | Nano-section, form group |
| `subheading` | Fira Sans | 15 | 500 | 20 | 0 | Below screen-title · color = muted |

- **Critical**: All headings H1-H4 use **Fira Sans**. Fira Code ONLY for `displayNumeric` KPI values.
- Line-heights pixel-values (20 / 24 / 28 / 32 / 40), NOT string ratios like `'1.23'` (RN requirement per type-headings lines 613-617).

### 4.3 Body scale (5 tokens)

Source: `type-body (2).html` lines 94-103, 487-497.

| Token | Size | Weight | Line-height | Transform / LS | Usage |
|---|---|---|---|---|---|
| `body` | 14 | 400 | 1.5 | — | DEFAULT paragraph, descriptions |
| `bodySmall` | 13 | 400 | 1.5 | — | Secondary text, tooltips, helper |
| `caption` | 12 | 400 | 1.4 | — | Metadata, timestamps, breadcrumb |
| `label` | 11 | 600 | 1.25 | UPPERCASE · ls 0.8 | Card-label, section-header — ONLY uppercase |
| `button` | 14 | 600 | 1.25 | ls 0.2 | CTA text, parented to btn height 40-48 |

- RN usage: `typography.body / bodySmall / caption / label / button`
- **Rule (type-body line 428)**: `label` always UPPERCASE (semantic marker).

### 4.4 Letter-spacing scale

Source: `type-headings (1).html` line 631.

```
-0.5    · display-numeric
-0.3    · screen-title
-0.2    · h1
 0      · h2, h3, h4, subheading, body (default)
+0.2    · button
+0.8    · label (with UPPERCASE)
```

**Rule**: negative letter-spacing ONLY on sizes ≥ 22px. Positive letter-spacing only on `button` and `label`.

### 4.5 Component text map

Source: `type-body (2).html` lines 500-504.

```
card-label        = label              kpi-label       = label
section-header    = label              btn-text        = button
input-value       = body               input-label     = bodySmall
tooltip           = bodySmall          caption-meta    = caption
timestamp         = caption (mono)     body-copy       = body  (DEFAULT)
```

---

## 5 · Shadow tokens (5 elev + 3 glow + 2 inset = 10)

Source: `shadows (1).html` lines 73-78, 806-818.

### 5.1 Elevation shadows (CSS → RN conversion)

```
// elev-0: base (no shadow, color only)
elev0: { bg: '#020617' }

// elev-1: surface (no shadow, color only)
elev1: { bg: '#0F172A' }

// elev-2: cards / KPI / list rows · shadow-sm
elev2_shadowSm: {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.40,
  shadowRadius:  6,
  elevation:     2,
}

// card:hover · shadow-md (sync kpi-row, restaurant-card:hover)
hover_shadowMd: {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 6 },
  shadowOpacity: 0.50,
  shadowRadius:  16,
  elevation:     6,
}

// elev-3: popovers / dropdowns / tooltips · shadow-lg
elev3_shadowLg: {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 8 },
  shadowOpacity: 0.60,
  shadowRadius:  16,
  elevation:     8,
}

// elev-4: modals / bottom-sheets · shadow-xl + backdrop
elev4_shadowXl: {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 12 },
  shadowOpacity: 0.70,
  shadowRadius:  32,
  elevation:     12,
}
// + backdrop: rgba(0,0,0,0.6) blur(3px) [web only, iOS uses material effect]

// elev-5: toasts / FAB pressed · shadow-2xl
elev5_shadow2xl: {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 16 },
  shadowOpacity: 0.80,
  shadowRadius:  48,
  elevation:     16,
}
```

CSS origin strings (for reference — from shadows (1).html lines 809-813):
```
shadow-sm:   0 2px 6px -2px rgba(0,0,0,0.40)
shadow-md:   0 6px 16px -6px rgba(0,0,0,0.50)
shadow-lg:   0 8px 16px -4px rgba(0,0,0,0.60)
shadow-xl:   0 12px 32px -8px rgba(0,0,0,0.70)
shadow-2xl:  0 16px 48px -12px rgba(0,0,0,0.80)
```

**RN caveat (shadows (1).html lines 795-803)**:
- iOS renders all four shadow props faithfully.
- **Android renders only `elevation`** — no shadow offset/opacity/radius control. Approximate by tuning elevation numbers (2 / 6 / 8 / 12 / 16).
- The CSS `-2px / -6px / ...` spread values are approximate via `shadowOffset.height` minus `shadowRadius * 0.5`; above values are best-effort match.

### 5.2 Glow shadows (focus rings)

Source: `shadows (1).html` lines 814-816.

```
// glow-focus: accent focus ring (:focus-visible)
glowFocus: {
  shadowColor:   '#2563EB',
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.25,      // 25% opacity on accent
  shadowRadius:  4,
  elevation:     0,         // Android: border-width 2 + borderColor as fallback
}

// glow-success: validated input success ring
glowSuccess: {
  shadowColor:   '#22C55E',
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius:  4,
  elevation:     0,
}

// glow-danger: critical actions danger ring
glowDanger: {
  shadowColor:   '#EF4444',
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius:  4,
  elevation:     0,
}
```

CSS origin: `0 0 0 4px rgba(r,g,b,0.25)`.

**RN caveat**: Glow = ring that works reliably only on web. On iOS: only `shadowColor` gives faint halo (no spread control). On Android: implement as **2px border with glow color** + optional fallback `borderColor: colors.glowFocus` when `focus-visible` state active.

### 5.3 Inset shadows (pressed / well)

```
// inset-press: btn :active, pressed buttons
insetPress:  inset 0 2px 4px rgba(0,0,0,0.40)

// inset-well: search fields, inner wells
insetWell:   inset 0 1px 2px rgba(0,0,0,0.30)
```

**RN caveat**: RN has no native inset shadow support on either iOS or Android for `View`. Implement as:
- Option A: nested absolute `<View>` with `backgroundColor: rgba(0,0,0,0.08)` + small positive offset.
- Option B: use `react-native-inset-shadow` lib or `react-native-svg` mask.
- Recommended fallback: slight darker backgroundColor + `transform: scale(0.98)` for active buttons (matches the CSS intent).

### 5.4 Component shadow map

Source: `shadows (1).html` line 819.

```
card            = elev-2               kpi             = elev-2
restaurant-card = elev-2               card:hover      = elev-2 + shadow-md (lift by shadow, not level)
dropdown        = elev-3               popover         = elev-3
tooltip         = elev-3               modal           = elev-4 + backdrop
toast           = elev-5               btn:focus       = elev-2 + glow-focus
btn:active      = elev-2 + inset-press
```

---

## 6 · Icons mapping (Lucide)

### 6.1 Library pin

Source: `icons-lucide.html` line 585, `mobile-dashboard/package.json` line 34.

```
HTML prototypes:  lucide@0.344.0 (pinned via CDN unpkg)
Mobile code:      lucide-react-native ^1.8.0
```

**Mismatch investigation required** (see Open Questions §9): `lucide-react-native 1.8.0` tracks Lucide JS ~0.263.x (older than 0.344.0). Most icons exist in both, but some newly-added icons post-0.300.x may not be in the 1.8 RN port. Since the Mobile package hasn't pinned a version since install, Wave 2 should `npm install lucide-react-native@latest` to get ≥ 0.400 which syncs with HTML.

### 6.2 Icon sizes

Source: `icons-lucide.html` lines 464-473, line 586.

```
xs:   12       sm:    14       md:  16
lg:   20   · DEFAULT
xl:   24       xl2:   32
```

### 6.3 Stroke widths

Source: `icons-lucide.html` lines 476-495.

```
1.5    · decorative, ≥ 24px
2.0    · DEFAULT (Lucide standard), 14-20px
2.5    · small ≤ 16px, else thin lines disappear on dark
```

### 6.4 Icon color rules

Source: `icons-lucide.html` lines 548-559.

```
UI-default    text-muted #94A3B8       // default state
UI-active     text-default #F8FAFC     // hover / selected
UI-disabled   text-disabled #475569    // disabled
Semantic      matches status color (positive/warning/danger/info)
Categorical   matches category color (from §1.6)
```

### 6.5 Core icon list (verify every name matches kebab-case between lucide 0.344 and lucide-react-native)

Source: `icons-lucide.html` lines 349-461.

**DDS Categories** (12):
```
utensils · building-2 · wallet · zap · megaphone · wifi ·
truck · wrench · landmark · shield · graduation-cap · more-horizontal
```

**UI / Navigation / Actions** (30):
```
home · store · bar-chart-3 · bell · user · settings
plus · minus · x · check · search · filter
refresh-cw · more-vertical · more-horizontal · edit-2 · trash-2 · log-out
chevron-right · chevron-down · chevron-left · chevron-up · calendar · clock
info · eye · eye-off · download · upload · share-2
```

**Semantic / Status** (8):
```
trending-up · trending-down · check-circle · check-circle-2 · alert-triangle ·
x-circle · wifi · wifi-off
```

**Source / Data** (4):
```
database · file-text · cloud · server
```

**Naming note** (for RN port): Lucide icons convert kebab-case to PascalCase: `check-circle-2` → `CheckCircle2`, `trending-up` → `TrendingUp`, `alert-triangle` → `AlertTriangle`, `wifi-off` → `WifiOff`.

**Existing icons.ts already has**: `TrendingUp, TrendingDown, AlertTriangle, Info, Wifi, WifiOff, CheckCircle2 (need to add — currently only `Check`)`. Wave 2 to add `CheckCircle2` / `XCircle` / `AlertCircle` / `BarChart3 (exists)` etc.

### 6.6 RN import pattern

Source: `icons-lucide.html` line 579.

```typescript
// DO — named imports (tree-shaking)
import { Home, TrendingUp } from 'lucide-react-native'

// DON'T — breaks tree-shaking, bloats bundle
import * as Lucide from 'lucide-react-native'
```

Current `icons.ts` already follows this correctly. Props: `<Home size={20} color={colors.text.muted} strokeWidth={2} />`.

---

## 7 · Semantic tokens (business rules)

### 7.1 Restaurant performance thresholds

Source: `restaurant-card.html` lines 64-68, 85-89.

```
Above-plan   >= +5% vs plan     positive   #22C55E   border-left, dot, bar-fill, delta-pill
On-plan      -5% to +5%         warning    #F59E0B   same elements
Below-plan   <= -5%             danger     #EF4444   same elements
Offline      sync failed        neutral    #64748B   cursor:default, static
```

### 7.2 KPI card semantics (kpi-row)

Source: `kpi-row (1).html` lines 59-83.

```
revenue card:       border-left 6px  accent #2563EB       (hero KPI, wider bar)
expenses card:      border-left 4px  muted #94A3B8        (neutral, secondary)
balance-pos card:   border-left 4px  positive #22C55E     (profit state)
balance-neg card:   border-left 4px  danger #EF4444       (loss state)
```

- Label color matches border-left: revenue = `#60A5FA`, expenses = `#94A3B8`, balance-pos = `#4ADE80`, balance-neg = `#F87171`.
- **Semantic sync pattern (cross-component)**: dot + border-left + bar-fill + status-text must always use the same semantic color in any given card (reinforced by the brief).

### 7.3 Border-left widths

Source: brief + `kpi-row (1).html` line 59 + `restaurant-card.html` line 57 + `hero-card.html` line 30 + colors-text.html line 188 (rules note) + colors-status.html line 147 (alert callout) + spacing (2).html line 387 (adaptive callout).

```
6px    · KPI revenue (hero KPI emphasizing primary metric)
4px    · regular KPI (expenses, balance), restaurant-card, hero-card
3px    · notes, alerts, adaptive callouts, rules callouts
```

### 7.4 Delta pill variants

Source: `restaurant-card.html` lines 151-170.

```
up     positive-tint   trending-up icon
flat   warning-tint    (horizontal bar or "—")
down   danger-tint     trending-down icon
muted  #1E293B bg + #334155 border + #64748B text   (offline/no-data)
```

### 7.5 Source badges (iiko / 1С attribution)

Source: `hero-card.html` lines 73-82.

```
// Light solid bg with text-inverse
src.bg:     #F8FAFC
src.text:   #0F172A (text-inverse)
src.font:   Fira Code 10/600 UPPERCASE · ls 0.5
src.pad:    3px 8px
src.radius: sm (4px)
```

### 7.6 Live-sync pulse dot

Source: `hero-card.html` lines 106-116, `icons-lucide.html` lines 129-141.

```
pulse-dot:   width 6px  height 6px  bg positive #22C55E
animation:   box-shadow: 0 0 0 0 rgba(22,197,94,0.6) → 6px → 0 @ 1.8s ease-out infinite
```

**RN implementation**: via `Animated.View` with scale + opacity keyframes. Use `useNativeDriver: true` for transform; opacity fallback.

---

## 8 · Package.json changes (delta for Wave 2)

### 8.1 Remove

```json
"@expo-google-fonts/jetbrains-mono": "^0.4.1",
"@expo-google-fonts/plus-jakarta-sans": "^0.4.2"
```

### 8.2 Add

```json
"@expo-google-fonts/fira-sans": "^0.4.x",
"@expo-google-fonts/fira-code": "^0.4.x"
```

### 8.3 Upgrade

```json
// current
"lucide-react-native": "^1.8.0"

// recommended (verify published latest on npm)
"lucide-react-native": "^0.400.x" or "^0.544.x"   // must expose Lucide 0.344+ icons
```

**Caution**: `lucide-react-native` versioning doesn't match `lucide` JS. Wave 2 must verify: check `npm view lucide-react-native versions --json`, pick the one built from `lucide@^0.344.0`. If mismatch unresolvable, pin Lucide JS CDN pre-0.345 for HTML prototypes to avoid new-icon references not in RN port.

### 8.4 App.tsx font loading (reference for Wave 2)

```typescript
import {
  useFonts,
  FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_700Bold,
} from '@expo-google-fonts/fira-sans'
import {
  FiraCode_400Regular, FiraCode_500Medium, FiraCode_600SemiBold, FiraCode_700Bold,
} from '@expo-google-fonts/fira-code'

const [fontsLoaded] = useFonts({
  'FiraSans-Regular': FiraSans_400Regular,
  'FiraSans-Medium': FiraSans_500Medium,
  'FiraSans-SemiBold': FiraSans_600SemiBold,
  'FiraSans-Bold': FiraSans_700Bold,
  'FiraCode-Regular': FiraCode_400Regular,
  'FiraCode-Medium': FiraCode_500Medium,
  'FiraCode-SemiBold': FiraCode_600SemiBold,
  'FiraCode-Bold': FiraCode_700Bold,
})
```

Note: current `fontFamilies` keys (`FiraCode-Bold`, `FiraSans-Regular`, etc.) match the naming the mobile code expects — just the underlying module changes from `jetbrains-mono`/`plus-jakarta-sans` to `fira-code`/`fira-sans`.

---

## 9 · Migration map (old → new)

### 9.1 `colors.ts` breaking changes

| Old key | Old value | New key | New value | Reason |
|---|---|---|---|---|
| `bg` | `#020617` | `bg` | `#020617` | unchanged |
| `bgCard` | `#0F172A` | `bgCard` | `#0F172A` | unchanged |
| `bgCardElevated` | `#1E293B` | `bgCardElev` | `#1E293B` | rename |
| `bgInput` | rgba(37,99,235,0.06) | — | — | **REMOVE** (inputs use bgCard + border) |
| `bgSurface` | `#0F172A` | — | — | **REMOVE** (duplicate of bgCard) |
| `border` | rgba(248,250,252,0.08) | `border.default` | `#334155` | opacity→solid |
| `borderFocused` | rgba(37,99,235,0.28) | `border.focused` | `#2563EB` | opacity→solid, new hex |
| `borderRed` | rgba(239,68,68,0.20) | `border.danger` | `#EF4444` | opacity→solid |
| `borderActive` | rgba(37,99,235,0.30) | `border.active` | `#1D4ED8` | opacity→solid |
| `borderSubtle` | rgba(248,250,252,0.05) | `border.subtle` | `#1E293B` | opacity→solid |
| `accent` | `#2563EB` | `accent.default` | `#2563EB` | nested |
| `accentDark` | `#1D4ED8` | `accent.dark` | `#1D4ED8` | nested |
| `accentLight` | `#60A5FA` | `accent.light` | `#60A5FA` | nested |
| `accentGlow` | rgba(37,99,235,0.25) | `accent.glow` | rgba(37,99,235,0.25) | unchanged |
| `green` | `#22C55E` | `status.positive` | `#22C55E` | rename, semantic |
| `greenBg` | rgba(34,197,94,0.12) | `pill.positive.bg` | rgba(34,197,94,**0.15**) | opacity 0.12→0.15, rename |
| `yellow` | `#F59E0B` | `status.warning` | `#F59E0B` | rename |
| `yellowBg` | rgba(245,158,11,0.12) | `pill.warning.bg` | rgba(245,158,11,0.15) | opacity 0.12→0.15, rename |
| `red` | `#EF4444` | `status.danger` | `#EF4444` | rename |
| `redBg` | rgba(239,68,68,0.12) | `pill.danger.bg` | rgba(239,68,68,0.15) | opacity 0.12→0.15, rename |
| `blue` | **`#3B82F6`** | `status.info` | **`#0EA5E9`** | **BREAKING** hex change: blue-500 → sky-500 |
| `blueBg` | rgba(59,130,246,0.12) | `pill.info.bg` | rgba(14,165,233,0.15) | hex + opacity |
| `textPrimary` | `#F8FAFC` | `text.default` | `#F8FAFC` | rename |
| `textSecondary` | **rgba(248,250,252,0.60)** | `text.secondary` | **`#CBD5E1`** | **BREAKING** opacity → solid hex |
| `textTertiary` | **rgba(248,250,252,0.35)** | `text.tertiary` | **`#64748B`** | **BREAKING** opacity → solid hex |
| `textMuted` | **rgba(248,250,252,0.20)** | `text.muted` | **`#94A3B8`** | **BREAKING** opacity → solid hex, shade change |
| `textLabel` | rgba(248,250,252,0.45) | — | — | **REMOVE** — use `text.muted` + `typography.label` |
| (no equivalent) | — | `text.disabled` | `#475569` | **NEW** — decoration only |
| (no equivalent) | — | `text.inverse` | `#0F172A` | **NEW** — text on light bg |
| (no equivalent) | — | `text.link` | `#60A5FA` | **NEW** — inline links |
| `sparkGreen` | `#10B981` | `status.positive` | `#22C55E` | **BREAKING** duplicate removal |
| `heroGradientStart/End` | varies | **Keep or remove per hero-card spec** | see §7 | hero-card now uses solid bg + border-left, not gradient |
| `chartBar` | `#2563EB` | `chart.bar` | `#2563EB` | nested |
| `chartBarSelected` | `#60A5FA` | `chart.barSelected` | `#60A5FA` | nested |
| `chartAvgLine` | rgba(248,250,252,0.3) | `chart.avgLine` | `#64748B` | opacity→solid |
| `chartGrid` | rgba(248,250,252,0.06) | `chart.grid` | `#1E293B` | opacity→solid |
| (new) | — | `brand.bna.bg/border/text` | see §1.5 | **NEW** |
| (new) | — | `brand.dna.bg/border/text` | see §1.5 | **NEW** |
| (new) | — | `categories.food/rent/...` | see §1.6 | **NEW** palette |

### 9.2 `spacing.ts` breaking changes

| Old key | Old value | New key | New value | Reason |
|---|---|---|---|---|
| `xs` | 4 | `xs2` | 4 | **BREAKING** rename: old `xs` meant 4, new `xs` means 8 |
| `sm` | 8 | `xs` | 8 | scale re-aligned (Material/Tailwind-standard) |
| (no key) | — | `sm` | 12 | **NEW** level |
| `md` | 16 | `md` | 16 | unchanged (DEFAULT) |
| (no key) | — | `lg` | 20 | **NEW** level, replaces ad-hoc 20px |
| `lg` | 24 | `xl` | 24 | **BREAKING** rename: old `lg: 24` → new `xl: 24` |
| `xl` | 32 | `xl2` | 32 | **BREAKING** rename |
| `xxl` | 48 | `xl4` | 48 | **BREAKING** rename; `xl3: 40` now exists between |
| (no key) | — | `xl3` | 40 | **NEW** level |
| (no key) | — | `xl5` | 56 | **NEW** level |
| `xxxl` | 64 | `xl6` | 64 | **BREAKING** rename |

**Migration strategy**: add `const aliases` export to preserve backward-compat for one wave (see §10).

### 9.3 `radii.ts` breaking changes

| Old key | Old value | New key | New value | Reason |
|---|---|---|---|---|
| `sm` | 4 | `sm` | 4 | unchanged |
| `md` | 8 | `md` | 8 | unchanged |
| `lg` | 12 | `lg` | 12 | unchanged (DEFAULT) |
| `xl` | 16 | `xl` | 16 | unchanged |
| `xxl` | 20 | `xl2` | 20 | **BREAKING** rename (2-syllable → consistent `xl2`) |
| `full` | 9999 | `full` | 9999 | unchanged |

### 9.4 `typography.ts` breaking changes

| Old token | Old config | New token | New config | Reason |
|---|---|---|---|---|
| `screenTitle` | 26/700/ls -0.8 | `screenTitle` | 26/700/**lh 32**/ls **-0.3** | lh now pixels, ls corrected to 4px-grid rhythm |
| `heading` | 20/700/ls -0.6 | **removed; use `h1`** | 22/700/**lh 28**/ls -0.2 | **BREAKING** no 20px heading in v3 scale |
| `subheading` | 16/600/ls -0.3 | `subheading` | **15/500/lh 20/ls 0/color muted** | **BREAKING** weight 600→500, size 16→15, color added |
| `cardTitle` | 14/700/ls 0.2 | **removed; use `label`** | 11/600/UPPERCASE | **BREAKING** card-titles are labels |
| `body` | 14/400 | `body` | 14/400/lh 1.5/ls 0 | lh + ls specified |
| `bodySmall` | 13/400 | `bodySmall` | 13/400/lh 1.5/ls 0 | lh + ls specified |
| `caption` | 12/400 | `caption` | 12/400/lh 1.4/ls 0 | lh + ls specified |
| `captionSmall` | 11/400 | **removed** | — | use `label` (11/600/UPPERCASE) or `caption` |
| `label` | 11/600/UPPERCASE/ls 0.8 | `label` | 11/600/lh 1.25/UPPERCASE/ls 0.8 | lh added |
| `kpiValue` | 28/**500**/ls -0.5 | `displayNumeric` | **32/700/lh 40/ls -0.5** | **BREAKING** weight 500→700, size 28→32 |
| `kpiValueLarge` | 36/500/ls -1.5 | **removed** | — | consolidate into `displayNumeric` |
| `buttonText` | 15/700/ls 0.3 | `button` | **14/600/lh 1.25/ls 0.2** | **BREAKING** size 15→14, weight 700→600, ls 0.3→0.2 |
| `tabLabel` | 10/500 | **removed; use `caption`** | — | 10px below min readable |
| (new) | — | `h1` | 22/700/lh 28/ls -0.2 | **NEW** |
| (new) | — | `h2` | 18/600/lh 24/ls 0 | **NEW** |
| (new) | — | `h3` | 16/600/lh 20/ls 0 | **NEW** |
| (new) | — | `h4` | 14/600/lh 20/ls 0 | **NEW** |

### 9.5 `shadows.ts` breaking changes — ALL ENTRIES REWRITTEN

| Old token | Old shadow | New token | New shadow (CSS origin) | Reason |
|---|---|---|---|---|
| `sm` | offset 0/1, opacity 0.05, radius 2, elev 1 | `sm` | offset 0/2, opacity **0.40**, radius **6**, elev 2 | **BREAKING** — dark mode needs opacity 0.40, not 0.05 |
| `card` | offset 0/4, opacity 0.10, radius 6, elev 4 | `md` | offset 0/6, opacity 0.50, radius 16, elev 6 | **BREAKING** — card:hover, not default card |
| `lg` | offset 0/10, opacity 0.10, radius 15, elev 8 | `lg` | offset 0/8, opacity 0.60, radius 16, elev 8 | **BREAKING** |
| `xl` | offset 0/20, opacity 0.15, radius 25, elev 12 | `xl` | offset 0/12, opacity 0.70, radius 32, elev 12 | **BREAKING** |
| `button` | shadowColor #2563EB, 0.25, radius 12 | `glowFocus` | radius 4, opacity 0.25, color #2563EB | **BREAKING** — renamed to glow-focus, radius 12→4 |
| `elevated` | offset 0/8, opacity 0.20, radius 20, elev 10 | **removed; use `lg` or `xl`** | — | consolidate |
| (new) | — | `xl2` | offset 0/16, opacity 0.80, radius 48, elev 16 | **NEW** — toasts |
| (new) | — | `glowSuccess` | radius 4, color #22C55E, opacity 0.25 | **NEW** |
| (new) | — | `glowDanger` | radius 4, color #EF4444, opacity 0.25 | **NEW** |
| (new) | — | `insetPress` (fallback see §5.3) | rgba(0,0,0,0.40) | **NEW** |
| (new) | — | `insetWell` (fallback see §5.3) | rgba(0,0,0,0.30) | **NEW** |

### 9.6 Icons file

Existing `icons.ts` already does correct named imports and covers most required Lucide icons. Wave 2 additions:
- Import additionally: `CheckCircle2, XCircle, CircleDot (exists), ArrowRight, ArrowDown, ArrowUp, Link2, Smartphone (exists), Package (exists), MessageSquare`.
- Revise `GROUP_ICON_COLORS` to use the colors-categories palette (§1.6) — **BREAKING** for 4 colors.

---

## 10 · Aliases (backward-compat during transition)

To let Wave 3-4 migrate one screen at a time without mass-renaming, export deprecated aliases in each theme file:

```typescript
// src/theme/spacing.ts — Wave 2 implementation
export const spacing = {
  xs2: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24,
  xl2: 32, xl3: 40, xl4: 48, xl5: 56, xl6: 64,
} as const

// Deprecated — remove after Wave 5
export const spacingAliases = {
  xxl: 48,   // → xl4
  xxxl: 64,  // → xl6
  // Old lg→xl mapping: old lg: 24 is now xl: 24
  // Old xl→xl2 mapping: old xl: 32 is now xl2: 32
  // Mass find/replace planned in Wave 3 per component
}
```

Similar pattern for `colors.ts`: nested structure with `colorsFlat` legacy export.

**Recommendation**: do NOT add aliases. Fail loud via TypeScript errors — this catches the 9 screens + 7 components in one pass (Wave 3/4), which is cleaner long-term than a 2-phase migration. Brief explicitly names this as "breaking changes list" in §9 above, implying direct cutover is accepted.

---

## 11 · Breaking changes impact (code-level)

Files currently using old tokens that Wave 3/4 will need to update:

```
src/theme/colors.ts           — rewrite file
src/theme/spacing.ts          — rewrite file (rename keys)
src/theme/radii.ts            — minor: xxl→xl2
src/theme/typography.ts       — rewrite 5 tokens, add h1-h4
src/theme/shadows.ts          — rewrite file
src/theme/icons.ts            — add 4 icons + re-color GROUP_ICON_COLORS
src/theme/useTheme.ts         — adjust for nested structure
src/theme/index.ts            — re-export
App.tsx                       — replace font imports

src/components/BottomNav.tsx        — colors.textMuted → colors.text.muted (etc.)
src/components/RestaurantCard.tsx   — rename border color tokens, apply BNA/DNA badge
src/components/DayRangePicker.tsx   — use border.default, remove opacity borders
src/components/MonthRangePicker.tsx — same
src/components/PeriodSelector.tsx   — pill background update
src/components/OfflineBanner.tsx    — status.danger renaming
src/components/SkeletonLoader.tsx   — verify elev-2 shimmer colors

src/screens/Dashboard.tsx   — KPI card tokens (revenue/expenses/balance semantics §7.2)
src/screens/Login.tsx       — text hierarchy, pill tints, button tokens
src/screens/PointDetail.tsx — restaurant performance thresholds §7.1
src/screens/BrandDetail.tsx — BNA/DNA brand badges §1.5
src/screens/Article.tsx     — DDS category palette §1.6
src/screens/Operations.tsx  — source badges §7.5, semantic tokens
src/screens/Points.tsx      — restaurant-card tokens §7.1
src/screens/Reports.tsx     — chart colors, sparkline
src/screens/Profile.tsx     — text hierarchy
src/screens/Notifications.tsx — alert-callout border-left 3px pattern
```

Estimated edits: ~40 files × 3-15 token replacements each = **~300-500 edit operations**.

---

## 12 · Open questions (CONFLICTS found in prototypes)

### Q1 — DDS category palette mismatch between colors-categories vs icons-lucide

`colors-categories.html` (MAIN) defines:
```
food=#8B5CF6, rent=#1E40AF, salary=#A855F7, utilities=#CA8A04, marketing=#EC4899,
it=#06B6D4, transport=#0D9488, equipment=#78716C, taxes=#B91C1C, security=#475569,
training=#84CC16, other=#64748B
```

`icons-lucide.html` demonstration row (lines 352-363) uses **different values**:
```
food=#F97316  (orange, NOT violet)
equipment=#6366F1 (indigo, NOT stone)
security=#14B8A6 (teal, NOT slate-600)
```

`GROUP_ICON_COLORS` in mobile code matches neither — it's a 3rd palette:
```
food=#F97316, rent=#3B82F6, transport=#10B981, equipment=#6366F1, security=#14B8A6, training=#A855F7
```

**Recommendation**: treat `colors-categories.html` as source-of-truth (it's the later, more intentional file with explicit anti-overlap rationale and full WCAG verification). Ignore icons-lucide decorative colors. Ask user: «Брать палитру из colors-categories (8B5CF6 violet Food)?» before Wave 2.

### Q2 — `text-secondary #CBD5E1` still missing in colors-text.html

Per `type-body (2).html` verify line 508 and `type-headings (1).html` line 500, `#CBD5E1` is the 2nd-level text token. But `colors-text.html` only shows 6 text tokens (default/muted/tertiary/disabled/inverse/link) — no secondary. The brief spec (§0-BRIEF.md line 60) confirms 5 levels INCLUDING secondary.

**Resolution**: include `text.secondary = #CBD5E1` in Wave 2 `colors.ts`. The gap in `colors-text.html` is a doc sync TODO, not a design disagreement.

### Q3 — `lucide-react-native@^1.8.0` vs `lucide@0.344.0`

Mobile package currently installs `lucide-react-native ^1.8.0`, which corresponds to an older Lucide JS (~0.263). Some newer icons in prototypes (`CheckCircle2` etc.) may need fallback aliases.

**Resolution**: Wave 2 should run `npm install lucide-react-native@latest` and verify each icon name still resolves. If v1.8 specifically has to stay, create an icon-alias map (`CheckCircle2 → CheckCircle`) in `icons.ts`.

### Q4 — Inset shadows non-trivial in RN

RN `View` has no native `inset` shadow. The `insetPress` / `insetWell` tokens from CSS can't translate directly.

**Resolution**: Wave 2 should expose `insetPress` / `insetWell` as _pseudo-tokens_:
- For btn:active state, use `transform: scale(0.98) + backgroundColor: accentDark` (already matches colors-core interactive spec).
- For search-well, use slightly darker `backgroundColor: #020617 (bg, not bgCard)` + `borderColor: #1E293B (subtle)`.
- Do NOT implement real inset shadows — accept the visual compromise.

### Q5 — Glow (focus ring) on Android

Android `elevation` doesn't support colored rings. Current `focusRing` pattern in prototypes is `0 0 0 4px rgba(...)` CSS, not RN-native.

**Resolution**: Wave 2 should implement glow as `borderWidth: 2, borderColor: <glowColor>` on Android (`Platform.OS === 'android'`), and `shadowColor + shadowRadius 4` on iOS. Document in `shadows.ts`.

### Q6 — Linear gradient for hero

Current mobile `colors.ts` has `heroGradientStart / End`. `hero-card.html` has NO gradient — just solid `bg-card #0F172A` + `border-left 4px`.

**Resolution**: remove `heroGradientStart/End` from colors and `expo-linear-gradient` usage in HeroCard component (if present). Wave 2/3 should flatten the hero design.

### Q7 — Typography `kpiValue` / `kpiValueLarge` → single `displayNumeric`

Current mobile has two KPI type tokens (28px medium, 36px medium). v3 collapses these to single `displayNumeric: 32px bold tnum`. Screens may have used both.

**Resolution**: Wave 2 sets `displayNumeric: 32/700/Fira Code/tnum`. Wave 3 mass-renames old usages. Component decision: if some screens need larger/smaller, use `screenTitle` (26) or hero-KPI variant — don't create a 36px token.

### Q8 — chips-badges, chart, buttons, inputs not read in detail

Due to scope (this research focuses on tokens), chart color palette and chips-badges section variants were scanned at the key-rule level only. Wave 2 tokens cover all colors and semantics needed; component-specific props (chart bar heights, chip sizes, input states) will be re-extracted in Wave 3 per-component.

---

## 13 · Ready-for-Wave-2 checklist

- [x] Colors hierarchy extracted (bg, text, accent, status, brand, categories, pills, borders, interactive)
- [x] Spacing 11-level scale with component map
- [x] Radii 6-level scale with component map
- [x] Typography: 2 families, 4 weights, 7 headings, 5 body, full component map
- [x] Shadows: 5 elev + 3 glow + 2 inset with RN conversion notes
- [x] Icons: library pin, sizes, stroke, color rules, kebab-case list
- [x] Semantic tokens: restaurant perf, KPI variants, border-widths, source badges, pulse
- [x] Package.json delta (remove jetbrains-mono + plus-jakarta-sans, add fira-sans + fira-code)
- [x] App.tsx font loader example
- [x] Migration map (old → new for 5 files)
- [x] Breaking-changes list with file scope estimates
- [x] 8 open questions flagged for user review

**NEXT (Wave 2):** mobile-agent implements:
1. `src/theme/colors.ts` — rewrite with nested structure
2. `src/theme/spacing.ts` — 11-level scale
3. `src/theme/radii.ts` — rename xxl→xl2
4. `src/theme/typography.ts` — new 7+5 token set
5. `src/theme/shadows.ts` — dark-mode-first rewrite
6. `src/theme/icons.ts` — 4 new icons + re-color
7. `src/theme/index.ts` — re-export
8. `src/theme/useTheme.ts` — nested structure wiring
9. `package.json` — font dep swap
10. `App.tsx` — font loader swap

Stop after Wave 2 for user review. Waves 3-5 (components, screens, verify) follow in subsequent sessions.

---

*End of RESEARCH.md · 2026-04-19 · UX Architect*
