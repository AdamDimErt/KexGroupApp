# Phase 10 · UI-SPEC · Component Map for React Native

**Created:** 2026-04-19
**Role:** UI Designer
**Status:** Wave 1 output — ready for Wave 2 (tokens) + Wave 3 (components)
**Source of truth:** HTML prototypes in `C:\Users\Acer\Downloads\` (19 approved files)

---

## 0 · Design Token Contract (reference only — implemented in Wave 2)

All components below reference these tokens. Wave 2 (`mobile-agent`) creates the actual `theme/*.ts` files.

### Color tokens (semantic)
```
colors.bg.canvas       = #020617   (deepest background, outer screen)
colors.bg.card         = #0F172A   (card surface, default input bg)
colors.bg.elev         = #1E293B   (raised elements, pressed states, disabled bg)
colors.border.default  = #1E293B   (card border)
colors.border.strong   = #334155   (input border default, chip default)
colors.border.subtle   = #475569   (hover borders, secondary pressed)

colors.text.default    = #F8FAFC   (primary text, KPI values)
colors.text.secondary  = #CBD5E1   (inline emphasis in meta rows — NEW 5th level)
colors.text.muted      = #94A3B8   (labels, helper, meta)
colors.text.tertiary   = #64748B   (periods, less-important meta, placeholders)
colors.text.disabled   = #475569   (disabled text, empty state "—")

colors.accent          = #2563EB   (primary brand — BLUE)
colors.accentDark      = #1D4ED8   (pressed primary, below-avg chart bar)
colors.accentLight     = #60A5FA   (focused icons, ghost/tertiary text, active chart bar)
colors.accentGlow      = rgba(37,99,235,0.15)   (focus ring)

colors.positive        = #22C55E   (success, above-plan, positive delta)
colors.positiveLight   = #4ADE80   (positive label accent, hover positive)
colors.danger          = #EF4444   (error, below-plan, negative balance)
colors.dangerDark      = #DC2626   (destructive pressed)
colors.dangerLight     = #F87171   (danger text in error copy)
colors.warning         = #F59E0B   (on-plan, warning)
colors.info            = #0EA5E9   (info-only semantic)

colors.brand.bna       = accent tints (brand-badge: rgba(37,99,235,0.15) bg, #60A5FA text)
colors.brand.dna       = violet tints (brand-badge: rgba(168,85,247,0.15) bg, #C4B5FD text, border rgba(168,85,247,0.30))
```

### Spacing (4pt grid · 11 steps)
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 56 / 64` → tokens `space.1…space.16`

### Radii (6 steps)
`4 / 8 / 12 / 16 / 20 / full(9999)` → `radii.sm / md / lg / xl / 2xl / full`

### Typography
- `fontFamily.sans` = Fira Sans (400/500/600/700)
- `fontFamily.mono` = Fira Code (400/500/600/700, `tabular-nums` enabled)
- Sizes map directly from `type-body (2).html` + `type-headings (1).html`:
  - body 14/400, body-sm 13/400, caption 12/400, label 11/500 upper, button 14/600

### Shadows
- `shadow.sm` = `0 1px 2px rgba(0,0,0,0.05)` — subtle resting
- `shadow.md` = `0 4px 6px -1px rgba(0,0,0,0.1)` — hover card
- `shadow.lg` = `0 8px 20px -6px rgba(0,0,0,0.5)` — hero hover
- `shadow.press` = inset + scale(0.98) (transform, not shadow)
- `shadow.glowFocus` = `0 0 0 4px rgba(37,99,235,0.15)` — input focus ring
- `shadow.glowPositive` = pulse ring rgba(34,197,94,0.6) (pulse-dot)

### Animation/transition
- `duration.fast` = 120ms (hover, press, transform)
- `duration.normal` = 150ms (color, background, border)
- `duration.slow` = 400ms (shake, shimmer interval piece)
- `easing.standard` = `ease` (cubic-bezier(0.25, 0.1, 0.25, 1))
- Press feedback: `transform: scale(0.98)` over 120ms
- Shimmer: `1.6s linear infinite` (cards) / `1.4s ease-in-out` (value pulses)
- Shake (OTP error): 400ms — translateX keyframes `0 / -4 / +4 / -4 / +4 / 0`
- Pulse-dot (live sync): 1.8s ease-out infinite, box-shadow ring 0→6px→0
- Blink cursor: 1s ease-in-out infinite (50% opacity)

---

## 1 · Component: `BottomNav` (UPDATE existing)

**Source HTML:** `icons-lucide.html` § 07 navbar application
**File path:** `apps/mobile-dashboard/src/components/BottomNav.tsx` + `BottomNav.styles.ts` (both exist — update colors/icons only)

### Props interface
```ts
interface BottomNavProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  hasAlerts: boolean;                  // badge on notifications
}
// No breaking changes — existing props match.
```

### States visual table
| State | icon color | bg (iconPill) | label color | indicator |
|---|---|---|---|---|
| default | `text.tertiary` #64748B | transparent | `text.tertiary` #64748B | hidden |
| active | `accentLight` #60A5FA | `rgba(37,99,235,0.12)` | `accentLight` #60A5FA | 2px bar accent |
| pressed | `accentLight` | `rgba(37,99,235,0.18)` | `accentLight` | visible |

### Layout
- Tab count: 4 (Home / Store / BarChart3 / Bell → labels: Главная / Рестораны / Аналитика / Уведомления)
- Tab height: 56pt total (48pt tap + 8pt safe area bottom minimum)
- Icon: Lucide `size={22}`, strokeWidth 2
- Label: Fira Sans 10/500
- iconPill padding: `6px 10px` radius `radii.md` (8px)
- Badge (alert dot): 6×6pt red #EF4444, absolute top-right of icon

### Breaking changes from current code
- `icon size={18}` → `size={22}` (sync with HTML: 22px)
- `iconPill` active bg: verify matches `rgba(37,99,235,0.12)` (not opacity-hack)
- `label` size verify 10/500 Fira Sans
- Text "Отчёты" → keep as "Аналитика" if existing (sync with HTML wording "Аналитика"/"Точки")
- Indicator: 2px accent bar at bottom of active tab (existing code has it)

### Antipatterns
- Icons under 20px — loses recognition
- Using `text.disabled` for inactive — use `text.tertiary` (not disabled, just inactive)
- Indicator gradient instead of solid — dilutes accent token

---

## 2 · Component: `RestaurantCard` (UPDATE existing — breaking changes)

**Source HTML:** `restaurant-card.html`
**File path:** `apps/mobile-dashboard/src/components/RestaurantCard.tsx` + `RestaurantCard.styles.ts`

### Props interface (new shape)
```ts
interface RestaurantCardProps {
  brand: 'BNA' | 'DNA';                    // NEW — replaces implicit brand
  name: string;                            // "Dostyk Plaza"
  city: string;                            // "Алматы"
  cuisine: 'Burger' | 'Doner';             // NEW — strictly 2 options (no «Пицца», «fast food»)
  transactions: number | null;             // 412 · null → "—"
  revenue: number | null;                  // in KZT units
  plannedRevenue: number;                  // for plan-bar calculation
  marginPct: number | null;                // 0.35 → "35%"
  deltaPct: number | null;                 // 0.10 → "+10.0%"
  planAttainmentPct: number;               // 0..100, bar-fill width
  planMarkPct: number;                     // where ПЛАН marker sits (usually 100%, but bar scale may differ)
  periodLabel: string;                     // "за 1–19 апр 2026"
  status: 'above' | 'onplan' | 'below' | 'offline' | 'loading';
  onPress?: () => void;                    // undefined for offline/loading
}
```

### Breaking changes from current
| Old prop | New prop | Reason |
|---|---|---|
| `type: string` (free-form) | `cuisine: 'Burger' \| 'Doner'` | TZ restriction |
| `dev: number` | `deltaPct: number \| null` | nullable for offline |
| `planPct: number` | `planAttainmentPct` + `planMarkPct` | bar needs 2 values (fill + mark) |
| — | `brand: 'BNA' \| 'DNA'` | visible brand-badge required |
| `transactions` reused as points | `transactions: number \| null` | now used for чеков count |
| `status: Status` (free-form) | `'above' \| 'onplan' \| 'below' \| 'offline' \| 'loading'` | 5 discrete states |
| Existing margin calc hack | `marginPct: number \| null` | passed in directly |

### States visual table (semantic sync — 4 tokens fire together)

| State (prop `status`) | dot color | border-left color | bar-fill color | status-text color | delta pill |
|---|---|---|---|---|---|
| above (≥+5%) | #22C55E | 4px #22C55E | #22C55E | #22C55E "Выше плана · +X%" | `up` pill trending-up green |
| onplan (−5%…+5%) | #F59E0B | 4px #F59E0B | #F59E0B | #F59E0B "В плане · +X%" | `flat` pill minus warning |
| below (≤−5%) | #EF4444 | 4px #EF4444 | #EF4444 | #EF4444 "Ниже плана · −X%" | `down` pill trending-down red |
| offline (sync fail) | #64748B | 4px #64748B | #64748B @40% opacity | #94A3B8 "Нет данных за N мин" | `muted` pill wifi-off #64748B |
| loading | #334155 | 4px #1E293B (neutral) | shimmer | shimmer skeleton | shimmer pill placeholder |

### Layout (source: `.rest-card` CSS)
- Background: `colors.bg.card` (#0F172A)
- Border: `1px solid colors.border.default` (#1E293B)
- Border-left: `4px solid {semanticColor}`
- Border-radius: 12px
- Padding: `16px 18px`
- Internal gap: 10px (column)

**Row 1 · header** (`.r-row1`)
- `display: flex`, `space-between`, `align-items: flex-start`, `gap: 12px`
- **Left** (`.r-left`, flex:1): dot 8×8 circle + meta column
  - dot `margin-top: 6px` (optical align with first line)
  - meta line1: brand-badge (pill) + name (Fira Sans 15/600, letter-spacing -0.1px)
  - meta line2: `r-sub` Fira Sans 11/400 muted "Город · Cuisine · N чеков · period(dim tertiary)"
- **Right** (`.r-right`, align-center):
  - stack: revenue (Fira Code 18/700 tabular, letter-spacing -0.3) + delta-pill
  - chevron-right 16px `text.tertiary` (hidden when offline/loading)

**Row 2 · progress bar** (`.r-bar-wrap`)
- height 6px, bg `colors.bg.elev`, radius `radii.full`
- `margin-top: 16px`
- `.r-bar-fill`: absolute, left:0, width = `planAttainmentPct%`
- `.r-plan-mark`: absolute 2px wide white #F8FAFC, `top: -4px`, `bottom: -4px`, `box-shadow: 0 0 0 2px #0F172A` (halo against card)
- `.r-plan-label` (optional, shown on first card): "ПЛАН" Fira Code 9/600 letter-spacing 0.5px muted, positioned above mark (top: -17px, translateX: -50%)

**Row 3 · footer** (`.r-row3`)
- space-between
- Left: "План **₸2.20М** · Маржа **35%**" — plan/margin values in `text.secondary` #CBD5E1 Fira Code 11/500 tabular, surrounding text 11/400 muted
- Right: status-text Fira Sans 11/600, semantic color (see table); offline variant has `alert-circle` 12px icon + "Нет данных за N мин"

### Brand-badge sub-component
```ts
// Inline, not separate component — just styled View+Text
<View style={[styles.brandBadge, brand === 'DNA' && styles.brandBadgeDna]}>
  <Text style={styles.brandBadgeText}>{brand}</Text>
</View>
```
- padding `2px 7px`, radius `radii.full` (9999px)
- Fira Code 10/600, letter-spacing 0.6px
- BNA: bg `rgba(37,99,235,0.15)`, border `1px rgba(37,99,235,0.30)`, text `#60A5FA`
- DNA: bg `rgba(168,85,247,0.15)`, border `1px rgba(168,85,247,0.30)`, text `#C4B5FD`

### Interactions
- Press: `transform: scale(0.99)` — 120ms ease (less aggressive than buttons' 0.98)
- Hover (web-only, inactive on RN): `shadow.md`
- Offline: `cursor: default` → no TouchableOpacity; render as View
- Loading: static View, shimmer skeleton animation

### Loading skeleton layout (sub-state)
- border-left: 4px `colors.border.default` (no semantic color yet)
- dot: 8×8 `#334155` solid
- All text replaced with `.sk` shimmer blocks:
  - badge: 40×14
  - name: 140×14
  - sub: 220×10
  - revenue: 80×16
  - delta: 56×14 radius full
  - bar-wrap: 6px shimmer across
  - footer left 160×10 / right 90×10

### Antipatterns
- ✗ `cuisine: 'Пицца' | 'Fast Food'` — only Burger or Doner exist
- ✗ Brand name "Kex Burgers" / "AliPush" / "Kex Pizza" — invented, does not exist
- ✗ Orange dot while delta is positive — semantic desync (visual bug)
- ✗ Card without `periodLabel` — KPI without period = slop
- ✗ Card without `deltaPct` — value without context
- ✗ Using opacity for offline — use explicit muted token #64748B

---

## 3 · Component: `Button` (NEW)

**Source HTML:** `buttons (1).html`
**File path:** `apps/mobile-dashboard/src/components/Button.tsx` + `Button.styles.ts`

### Props interface
```ts
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
  shape?: 'rounded' | 'pill';          // default: 'rounded'
  size?: 'xs' | 'sm' | 'md' | 'lg';    // default: 'md'
  state?: 'default' | 'loading' | 'disabled' | 'pressed';  // non-interactive states
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  iconOnly?: boolean;                  // 44×44 — requires accessibilityLabel
  fullWidth?: boolean;                 // width 100% (login/OTP screens)
  onPress?: () => void;
  children?: ReactNode;                // text content; ignored if iconOnly
  accessibilityLabel?: string;         // REQUIRED if iconOnly
  accessibilityHint?: string;
  testID?: string;
}
```

### Size spec table
| size | height | padding (horiz) | font | min-width | hit-slop |
|---|---|---|---|---|---|
| xs | 28 | 10 | 12/600 | 80 | +20 (h+20 v+20 total) |
| sm | 36 | 14 | 13/600 | 100 | +12 (h+6 v+6 each side) |
| md | 44 | 20 | 15/600 | 140 | 0 (native) |
| lg | 52 | 24 | 16/600 | 160 | 0 (native) |
| iconOnly md | 44×44 | 0 | — | 44 | 0 |
| iconOnly xs | 32×32 | 0 | — | 32 | +6 each |

### Shape spec
| shape | border-radius | use case |
|---|---|---|
| rounded | 12 | in-app actions, form buttons, secondary actions, toolbar |
| pill | 9999 | login, OTP, onboarding, marketing CTA, full-width primary |
| iconOnly rounded | 12 | toolbar icon-only md |
| iconOnly rounded xs | 10 | toolbar icon-only xs |

### States matrix · 5 variants × 5 states (25 combos)

**Primary** (`variant: 'primary'`)
| state | bg | border | text | icon color | shadow/effect |
|---|---|---|---|---|---|
| default | `accent` #2563EB | none | #FFFFFF | #FFFFFF | `shadow.sm` |
| pressed | `accentDark` #1D4ED8 | none | #FFFFFF | #FFFFFF | `transform: scale(0.98)` 120ms |
| disabled | `bg.elev` #334155 | none | `text.tertiary` #64748B | #64748B | `pointerEvents: none` — NOT opacity |
| loading | `accent` #2563EB | none | #FFFFFF | spinner #FFFFFF | `aria-busy` / `accessibilityState={busy}` · spinner leading 16px 900ms rotate |
| focused | `accent` | 2px outline `accentLight` #60A5FA + offset 2px | #FFFFFF | #FFFFFF | focus-visible only (keyboard) |

**Secondary** (`variant: 'secondary'`)
| state | bg | border | text | icon color | effect |
|---|---|---|---|---|---|
| default | transparent | `1.5px` #334155 | #F8FAFC | #F8FAFC | — |
| pressed | `bg.elev` #1E293B | `1.5px` #475569 | #F8FAFC | #F8FAFC | scale 0.98 |
| disabled | transparent | `1.5px` #1E293B | #475569 | #475569 | no opacity |
| loading | transparent | `1.5px` #334155 | #F8FAFC | spinner #F8FAFC | spinner |
| focused | transparent | outline 2px #60A5FA offset 2 | #F8FAFC | #F8FAFC | ring |

**Tertiary** (`variant: 'tertiary'`) — filled outline with accent
| state | bg | border | text | icon color | effect |
|---|---|---|---|---|---|
| default | transparent | `1.5px` #2563EB | `accentLight` #60A5FA | #60A5FA | — |
| pressed | `rgba(37,99,235,0.10)` | `1.5px` #2563EB | #60A5FA | #60A5FA | scale 0.98 |
| disabled | transparent | `1.5px` #1E293B | #475569 | #475569 | explicit tokens — no opacity |
| loading | transparent | `1.5px` #2563EB | #60A5FA | spinner #60A5FA | spinner |
| focused | transparent | outline 2px #60A5FA offset 2 | #60A5FA | #60A5FA | ring |

**Ghost** (`variant: 'ghost'`)
| state | bg | border | text | icon color | effect |
|---|---|---|---|---|---|
| default | transparent | none | `accentLight` #60A5FA | #60A5FA | — |
| pressed | `bg.elev` #1E293B | none | `accent` #2563EB | #2563EB | — |
| disabled | transparent | none | #475569 | #475569 | — |
| loading | `bg.elev` #1E293B | none | #60A5FA | spinner #60A5FA | OLED visibility → subtle bg on loading |
| focused | transparent | outline 2px #60A5FA offset 2 | #60A5FA | #60A5FA | ring |

**Destructive** (`variant: 'destructive'`)
| state | bg | border | text | icon color | effect |
|---|---|---|---|---|---|
| default | `danger` #EF4444 | none | #FFFFFF | #FFFFFF | `shadow.sm` |
| pressed | `dangerDark` #DC2626 | none | #FFFFFF | #FFFFFF | scale 0.98 |
| disabled | `bg.elev` #334155 | none | `text.tertiary` #64748B | #64748B | no opacity |
| loading | `danger` #EF4444 | none | #FFFFFF | spinner #FFFFFF | spinner |
| focused | `danger` | outline 2px #60A5FA offset 2 | #FFFFFF | #FFFFFF | ring |

### Internal layout
- `flexDirection: row`, `alignItems: center`, `justifyContent: center`
- `gap: 8` between icon and text
- `whiteSpace: nowrap` (single-line)
- iconOnly mode: `width === height`, icon 20px (md) / 14px (xs), no gap
- `min-width` locks layout so text variations (Default → Loading "Отправка…") don't jump

### Loading width stability rule
**Critical:** `min-width` = size's min-width token. Default text "Подтвердить" (lg: min 160) and Loading text "Отправка…" render in same width container.

### Accessibility contract (React Native)
```ts
accessibilityRole="button"
accessibilityLabel={accessibilityLabel ?? children}    // REQUIRED for iconOnly
accessibilityHint={accessibilityHint}
accessibilityState={{
  disabled: state === 'disabled',
  busy:     state === 'loading',
}}
// iOS haptic: Haptics.impactAsync(ImpactFeedbackStyle.Light) on press
// Android ripple: android_ripple={{ color: rgba(255,255,255,0.15) }}
```

### Animations
- Press-in: `transform: scale(0.98)` over 120ms
- Loading spinner: Lucide `Loader2` 16px, rotate 360° infinite 900ms linear
- Ghost loading: fade-in bg #1E293B (150ms) while spinner spins

### Antipatterns
- ✗ Pill shape for in-app actions (spooks CTA)
- ✗ Rounded 12 on login full-width primary (should be pill)
- ✗ `opacity: 0.6` for disabled → use explicit tokens (bg-disabled #334155, text-disabled #64748B)
- ✗ Height < 44pt without hit-slop (iOS HIG violation)
- ✗ iconOnly without `accessibilityLabel`
- ✗ Destructive as primary on-screen action — always via confirm dialog
- ✗ Loading without `min-width` — text "Отправка…" wider than "Подтвердить" causes layout jump

---

## 4 · Component: `Input` (TextInput) (NEW)

**Source HTML:** `inputs (1).html` § 01 + § 04 + § 05
**File path:** `apps/mobile-dashboard/src/components/Input.tsx` + `Input.styles.ts`

### Props interface
```ts
import type { LucideIcon } from 'lucide-react-native';

interface InputProps {
  label: string;                          // REQUIRED — no placeholder-as-label
  required?: boolean;                     // red asterisk after label
  helperText?: string;                    // default helper (11/400 muted)
  errorText?: string;                     // switches state to error; replaces helper
  successText?: string;                   // switches state to success; replaces helper
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;                   // shown when empty (not a label)
  size?: 'sm' | 'md' | 'lg';              // default 'md'
  state?: 'default' | 'focused' | 'filled' | 'disabled';  // auto + override
  leadingIcon?: LucideIcon;               // 14/16/20 per size
  trailingIcon?: LucideIcon;              // e.g. chevron-down, eye, x-circle
  onTrailingIconPress?: () => void;       // clear, toggle password
  showClearButton?: boolean;              // auto x-circle when filled+focused
  keyboardType?: KeyboardTypeOptions;     // 'default'|'email-address'|'numeric'|'phone-pad'
  secureTextEntry?: boolean;              // password
  autoCapitalize?: 'none'|'sentences'|'words'|'characters';
  maxLength?: number;
  editable?: boolean;                     // false → disabled
  testID?: string;
}
```

### Size spec
| size | height | padding-horiz | radius | font | icon |
|---|---|---|---|---|---|
| sm | 36 | 12 | 10 | 13 | 14 |
| md | 48 | 16 | 12 | 15 | 16 |
| lg | 56 | 20 | 14 | 16 | 20 |

**Default = md. `sm` only in dense filter rows.**

### States visual table (6 states)

| state | bg | border | text | icon | helper/copy | effect |
|---|---|---|---|---|---|---|
| **default** | `bg.card` #0F172A | `1px` #334155 | `text.default` #F8FAFC | `text.muted` #94A3B8 | `text.muted` 11/400 | — |
| **focused** | `bg.card` #0F172A | `2px` #2563EB + `glowFocus` ring 4px `rgba(37,99,235,0.15)` | #F8FAFC | `accentLight` #60A5FA | `accentLight` 11/400 | blink cursor `\|` accentLight |
| **filled** (default with value) | `bg.card` | `1px` #334155 | #F8FAFC | #94A3B8 | muted helper | clear x-circle 16 trailing (tap → clear) |
| **error** | `bg.card` | `2px` #EF4444 | `dangerLight` #F87171 | #EF4444 | `dangerLight` 11/400 + alert-circle 13px | replaces helper, same vertical position |
| **success** | `bg.card` | `2px` #22C55E | #F8FAFC | #22C55E | `#4ADE80` 11/400 + check-circle 13px | — |
| **disabled** | `bg.elev` #1E293B | `1px` #1E293B | `text.disabled` #475569 | #475569 | muted (dimmed) | `editable={false}`, placeholder dimmed to #475569 |

### Layout
- **Field wrapper** (`.field`): column, gap 6, marginBottom 14
- **Label** (above): Fira Sans 12/500 `text.muted` #94A3B8
  - Required marker: " *" #EF4444 after label text
- **Input row** (`.input`): row, align-center, gap 8, padding-horiz per size, radius per size
- **Helper** (below): Fira Sans 11/400 muted → color-changes to error/success without shifting position

### Error/Success helper (key rule)
Helper text occupies same position default/error/success — **only color + icon change**. Layout never shifts.

### Variations (from § 04)
- **Search**: leading `search` icon, placeholder "Найти точку, статью…"
- **Password**: trailing `eye` / `eye-off`, `secureTextEntry={true}`, content Fira Code letter-spacing 2
- **Number**: Fira Code tabular, trailing `suffix` like "₸" (Fira Code 14/500 muted)
- **Date**: leading `calendar`, trailing `chevron-down` — behaves as Select-like trigger
- **Select**: trailing `chevron-down`, full row tappable
- **Autofill override** (web only): `-webkit-autofill { box-shadow: inset 0 0 0 1000px #0F172A }`

### Accessibility
```ts
accessibilityLabel={label}
accessibilityHint={helperText}
accessibilityState={{ disabled: !editable }}
// Error: aria-invalid="true" + aria-describedby → helper text id
```

### Antipatterns
- ✗ Placeholder as label — text disappears on input, loses context
- ✗ Error without text — just red border doesn't say what's wrong
- ✗ Pill radius for in-app input — confused with CTA button
- ✗ Filled OTP digits in different colors (e.g. orange "1") — all cells text-default, color only by state

---

## 5 · Component: `PhoneInput` (NEW)

**Source HTML:** `inputs (1).html` § 02
**File path:** `apps/mobile-dashboard/src/components/PhoneInput.tsx` + `PhoneInput.styles.ts`
**Library:** `react-native-international-phone-number` (already in package.json v0.11.3)

### Props interface
```ts
interface PhoneInputProps {
  label: string;                          // "Телефон" / "Номер"
  value: string;                          // E.164: "+77012345678"
  onChangeText: (value: string, isValid: boolean) => void;
  mask?: 'A' | 'B';                       // A: "(7NN) NNN-NN-NN" (default) | B: "7NN NNN NN NN"
  defaultCountry?: 'KZ';                  // default 'KZ'
  state?: 'default' | 'focused' | 'error';
  errorText?: string;                     // e.g. "Номер должен содержать 10 цифр"
  helperText?: string;                    // e.g. "Код отправим на этот номер"
  disabled?: boolean;
  testID?: string;
}
```

### States visual table
| state | container border | prefix box bg | prefix text | digits color | helper |
|---|---|---|---|---|---|
| empty | `1px` #334155 | `bg.elev` #1E293B | `text.muted` #94A3B8 | `text.tertiary` #64748B (mask placeholder) | muted |
| focused | `2px` #2563EB + glow | `bg.elev` | #94A3B8 | `text.default` #F8FAFC + blink cursor | accentLight |
| filled | `1px` #334155 | `bg.elev` | #94A3B8 | #F8FAFC | muted |
| error | `2px` #EF4444 | `bg.elev` | #94A3B8 | `dangerLight` #F87171 | danger + alert-circle |

### Layout
- Wrapper: `height 48`, radius 12, `overflow: hidden`, row, align-center
- **Prefix box** (`.prefix`):
  - Width 52, height 100%, `bg.elev` #1E293B
  - Fira Code 15/500, letter-spacing 0
  - Displays "+7" (static, from `defaultCountry`)
  - **Divider:** NOT a pipe `|` character — use a 1px vertical line via `borderRight: 1px #334155` (RN: `View` with width 1 + height 60% + marginY 20%). CSS reference: `.prefix::after { content:''; position:absolute; right:0; top:20%; width:1px; height:60%; background:#334155; }`
- **Digits area** (`.digits`):
  - flex:1, padding-horiz 14
  - Fira Code 15/500, tabular-nums, letter-spacing 0.3
  - Shows `.mask` skeleton in empty: "(7__) ___-__-__" (A) or "7__ ___ __ __" (B)

### RN implementation hook
```ts
import PhoneInput from 'react-native-international-phone-number';
// Config: defaultCountry="KZ", disableDropdown=true (KZ only),
// language="ru", customMask=['(###) ###-##-##']
// Color overrides via theme to match spec above
```

### Antipatterns
- ✗ Symbol `|` as prefix divider — use CSS/RN border line
- ✗ Dropdown for country (KZ-only app)
- ✗ Prefix editable — "+7" is fixed

---

## 6 · Component: `OtpInput` (NEW)

**Source HTML:** `inputs (1).html` § 03
**File path:** `apps/mobile-dashboard/src/components/OtpInput.tsx` + `OtpInput.styles.ts`
**Library:** `react-native-confirmation-code-field` (to add in Wave 2)

### Props interface
```ts
interface OtpInputProps {
  length?: number;                        // default 6
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;   // fires when all cells filled
  state?: 'empty' | 'partial' | 'error' | 'success';  // auto per value length
  attemptsLeft?: number;                  // "попытки 2 из 3"
  resendEnabled?: boolean;
  onResend?: () => void;
  phoneHint?: string;                     // "Код отправлен на +7 (701) 234-56-78"
  autoFocus?: boolean;
  testID?: string;
}
```

### States visual table (4 states)

| state | cell bg | cell border | cell text | width/height | special |
|---|---|---|---|---|---|
| empty | `bg.card` #0F172A | `1px` #334155 | `#475569` digit placeholder "·" 16/400 | 48×48 | — |
| focused (active cell only) | `bg.elev` #1E293B | `2px` #2563EB + `glowFocus` | #F8FAFC + blink cursor `\|` 2px accentLight | 48×48 | ring glow |
| filled (past cells) | `bg.card` | `1px` #334155 | #F8FAFC 22/600 Fira Code tabular | 48×48 | — |
| error | `bg.card` | `2px` #EF4444 | #EF4444 22/600 | 48×48 | container shake 400ms |
| success | `bg.card` | `2px` #22C55E | #22C55E 22/600 | 48×48 | trailing `check-circle` 20px #22C55E |

### Layout
- Container `.otp`: `flexDirection: row`, `gap: 8`
- Cell `.otp-cell`: flex:1, 48×48, radius 12, center-center, Fira Code 22/600 tabular
- Placeholder dot: "·" 16/400 text.disabled #475569 (not a big "0")

### Footer (error state)
- row, space-between
- Left: helper-error + alert-circle 13 #EF4444 "Неверный код · попытки 2 из 3"
- Right: ghost-btn (Fira Sans 12/500 accentLight #60A5FA + refresh-cw 13px) "Запросить новый"

### Animations
- **Shake** (error): 400ms ease-in-out, keyframes `translateX(0, -4, 4, -4, 4, 0)` at %: 0, 20, 40, 60, 80, 100. Fires on validation fail.
- **Blink cursor**: 1s ease-in-out infinite, active cell only, opacity 1→0 at 50%
- **Success fade-in**: 200ms trailing check-circle opacity 0→1

### Accessibility
```ts
accessibilityLabel={`Поле ввода OTP, ${length} цифр`}
accessibilityHint={phoneHint}
// Use expo-haptics notificationAsync(Error) on shake
// Use expo-haptics notificationAsync(Success) on complete+success
```

### Antipatterns
- ✗ Coloring individual filled digits differently (orange "1" in success — breaks semantic sync)
- ✗ Auto-submit without visible success animation — user doesn't know code accepted
- ✗ No shake on error — error becomes visually undifferentiated from focus state

---

## 7 · Component: `KPICard` + `KPIRow` (NEW)

**Source HTML:** `kpi-row (1).html`
**File path:**
- `apps/mobile-dashboard/src/components/KPICard.tsx` + `KPICard.styles.ts`
- `apps/mobile-dashboard/src/components/KPIRow.tsx` (thin row wrapper)

### `KPICardProps` interface
```ts
import type { LucideIcon } from 'lucide-react-native';

interface KPICardProps {
  kind: 'revenue' | 'expenses' | 'balance';
  label: string;                          // "Выручка" / "Расходы" / "Баланс"
  value: number | null;                   // null → empty state
  deltaPct: number | null;                // 0.124 → "+12.4%"
  periodLabel: string;                    // "1–19 апр 2026"
  cardState?: 'default' | 'loading' | 'empty' | 'error';  // render mode
  onPress?: () => void;
  onRetry?: () => void;                   // error CTA
  headerIcon?: LucideIcon;                // override default (wallet/arrow-down-up/trending-up)
}
```

### `KPIRowProps` interface
```ts
interface KPIRowProps {
  revenue: KPICardProps;
  expenses: KPICardProps;
  balance: KPICardProps;                  // kind='balance' auto-switches pos/neg by value sign
  periodLabel: string;                    // single source, overrides each card
}
// Renders row with gap 12, equal flex:1 columns. Layout NEVER 2/3 cards — always 3.
```

### Visual table — border-left semantic (key rule)

| kind | border-left width | border-left color | label color | header icon |
|---|---|---|---|---|
| revenue (**hero**) | **6px** | `accent` #2563EB | `accentLight` #60A5FA | `trending-up` |
| expenses (**neutral**) | **4px** | `text.muted` #94A3B8 | `text.muted` #94A3B8 | `arrow-down-up` |
| balance ≥ 0 (**pos**) | **4px** | `positive` #22C55E | `positiveLight` #4ADE80 | `wallet` |
| balance < 0 (**neg**) | **4px** | `danger` #EF4444 | `dangerLight` #F87171 | `trending-down` |

### States visual table (per card)

| state | border-left | label | value | delta | period |
|---|---|---|---|---|---|
| default | semantic (above) | semantic | `text.default` #F8FAFC 24/700 Fira Code tabular (balance<0 → #EF4444) | trending + "+12.4%" (pos green / neg red) + "vs прошлый период" muted | "1–19 апр 2026" 10/400 tertiary |
| loading | semantic color retained | semantic | `.pulse-val` 26×70%w bg #1E293B pulse 1.4s | shimmer 110×10 | shimmer 80×8 |
| empty | **neutral** #1E293B (drops semantic) | `text.tertiary` #64748B | "—" 22/… text-disabled #475569 | hidden | "Нет данных" tertiary dimmed + period below |
| error | `danger` #EF4444 4px | — | `err-body`: alert-triangle 14 + "Sync failed" 12/500 `dangerLight` + "Данные не загружены. iiko не отвечает 12 мин." + `.cta` "Повторить" (pill 10/600 danger tint) | hidden | hidden |

### Layout (card, default state)
- bg `#0F172A`, border `1px #1E293B`, radius 12
- padding `14px 16px`
- gap `6px` column
- min-width 0, flex:1 in row

**Header row** (`.k-head` · row · space-between)
- label: Fira Code 11/600 UPPERCASE letter-spacing 0.8
- header icon: 14px, opacity 0.7, semantic color

**Value** (`.k-value`)
- Fira Code 24/700, letter-spacing -0.5, tabular-nums, line-height 1.1
- `text.default` default; `neg` variant: `danger` #EF4444

**Delta row** (`.k-delta` · row · align-center · gap 6 · margin-top 2)
- trending-up/down 12px (up green / down red per sign)
- `.pct`: Fira Code 12/500 tabular, up/down semantic color
- `.vs`: Fira Sans 11/400 `text.tertiary` "vs прошлый период"

**Period**
- Fira Sans 10/400 tertiary, margin-top 2

### Conditional balance rule
```ts
const isNegative = props.value < 0;
const borderColor = props.value < 0 ? colors.danger : colors.positive;
const labelColor  = props.value < 0 ? colors.dangerLight : colors.positiveLight;
const valueColor  = props.value < 0 ? colors.danger : colors.text.default;
```

### Row layout
```tsx
<View style={styles.row}>  {/* flexDirection: row, gap: 12 */}
  <KPICard {...revenue}  />
  <KPICard {...expenses} />
  <KPICard {...balance}  />
</View>
```
All three cards have `flex: 1`, same height, same structure. **Never display 2/3 or mixed sizes.**

### Interactions
- Hover: `shadow.md` (web-only)
- Press: `transform: scale(0.98)` 120ms
- Loading/empty/error: `cursor: default`, no scale

### Antipatterns
- ✗ Coloring `value` semantic green/red (except balance<0 explicit). Rule: color only `label` + `border-left` + `delta`
- ✗ "Расходы" in danger/red color — it's a normal metric, not an error
- ✗ Balance static color — must be conditional
- ✗ KPI without period OR delta — cipher without context
- ✗ Border-left on only 2 of 3 cards — inconsistent row
- ✗ Different font sizes across cards in same row

---

## 8 · Component: `HeroCard` (NEW)

**Source HTML:** `hero-card.html`
**File path:** `apps/mobile-dashboard/src/components/HeroCard.tsx` + `HeroCard.styles.ts`

### Props interface
```ts
import type { LucideIcon } from 'lucide-react-native';

interface HeroCardProps {
  variant?: 'primary' | 'positive' | 'danger';    // border-left color
  label: string;                                  // "Выручка за месяц"
  periodLabel: string;                            // "01.04 – 19.04"
  value: number | null;
  formattedValue?: string;                        // "₸8.24М" override
  deltaPct?: number;                              // 0.123 → "+12.3%"
  profit?: { label: string; value: number | string; deltaPct?: number };  // bottom row
  expenses?: { label: string; value: number | string };
  sources?: ('iiko' | '1C')[];                    // top-right badges
  lastSyncText?: string;                          // "Последний синк · 2 мин назад"
  cardState?: 'default' | 'loading' | 'empty' | 'error';
  onPress?: () => void;
  onEmptyCTA?: () => void;                        // "Сменить период"
  onRetry?: () => void;                           // "Повторить"
  headerIcon?: LucideIcon;                        // e.g. alert-triangle for critical
}
```

### Variant visual table

| variant | border-left | hover border-left | KPI text color | pulse-dot |
|---|---|---|---|---|
| primary | `4px` `accent` #2563EB | `accentLight` #60A5FA | `text.default` #F8FAFC | `positive` #22C55E pulse 1.8s |
| positive | `4px` `positive` #22C55E | `positiveLight` #4ADE80 | `positive` #22C55E | `positive` pulse |
| danger | `4px` `danger` #EF4444 | `dangerLight` #F87171 | `danger` #EF4444 | `danger` #EF4444 static (no pulse) |

### Layout

**Card** (`.hero`)
- bg `#0F172A`, border `1px #1E293B`, border-left 4px variant
- radius 16, padding `20px 22px 20px 22px`
- gap 14 column

**Row 1 · header** (`.h-row1`) — row, space-between, align-center
- **Left** `.h-label-grp` row, gap 10:
  - Optional lucide icon (e.g. alert-triangle 14px, color per variant) → only in critical variant
  - Label: Fira Code 11/600 UPPERCASE letter-spacing 0.8, `text.muted` (or dangerLight in critical)
  - Separator: 1px × 10 `#334155`
  - Period: Fira Code 11/500 letter-spacing 0.4 UPPERCASE `text.tertiary`
- **Right** `.h-sources` row, gap 6:
  - Source badges (see Badge § 10): `iiko`, `1С` tokens

**Row 2 · KPI** (`.h-row2`) — row, `align-items: baseline`, space-between
- Value (`.h-kpi`): Fira Code 36/600 tabular letter-spacing -1.5 line-height 1, variant color
- Sync (`.h-sync`): row gap 6, Fira Code 10/400 tertiary letter-spacing 0.3
  - Pulse-dot 6×6 circle variant color + pulse animation 1.8s

**Row 3 · footer** (`.h-row3`) — row, space-between, border-top 1px `#1E293B`, padding-top 12
- **Left** (profit / meta): row gap 8
  - Icon (trending-up 16 positive / trending-down 16 danger)
  - Label: Fira Sans 12/600 `text.default` "Прибыль" / "Маржа"
  - Value: Fira Code 15/600 tabular `text.default`
  - Delta-pill: pill, padding `3px 8px`, radius full, positive-tint bg `rgba(34,197,94,0.15)`, border `rgba(34,197,94,0.30)`, text `positive`, Fira Code 11/600 letter-spacing 0.2 + trending-up 11
- **Right** (expenses meta): row gap 6, trending-down 14 muted + label Fira Sans 12/500 muted + value Fira Code 14/500 tabular muted

**Alt row 3 · inline-meta** (`.h-inline-meta`)
- Used in profit-hero variant (Owner view)
- row gap 14, border-top 1px `#1E293B`, padding-top 12
- Compact key-value: `.k` Fira Sans 11/500 tertiary UPPERCASE margin-right 6 + value Fira Code 12 tabular muted

**Drill-down** (`.drill`)
- absolute bottom:14 right:16
- chevron-right 18, color `accentLight` #60A5FA (or dangerLight in critical)

### States

| state | layout |
|---|---|
| loading | border-left `#1E293B` (neutral), cursor default, rows replaced with `.sk` bg `#1E293B` animation 1.4s pulse 0.5→0.9 opacity. Sizes: label 160×14, sources 36×18 + 30×18, KPI 280×44 radius 8, sync 120×12, row3 180×18 + 120×18 |
| empty | border-left `#1E293B`, padding 24×22, `.empty-body` centered column gap 10: bar-chart-3 32px #475569 + msg 13 muted "Нет данных за выбранный период" + `.cta` pill accent-tint 6×12 "Сменить период" + calendar 12 |
| error | border-left `danger`, padding 18×22, `.error-body` row space-between: left row gap 8 alert-triangle 16 #EF4444 + "Ошибка синка iiko · 12 мин назад" 13 text-default; right `.cta.danger` pill danger-tint "Повторить" + refresh-cw 12 |

### Interactions
- Hover: `shadow.lg` (8px 20px rgba(0,0,0,0.5)) + border-left shifts to lighter variant
- Press: no scale (hero cards feel more stable)
- Empty/error: cursor default, hover disabled

### Antipatterns
- ✗ Accent bg (full-fill blue background) — WCAG contrast issue. Use bg-card + accent border-left
- ✗ Hero without period — breaks temporal context
- ✗ Missing pulse-dot on "last sync" — no liveness signal
- ✗ Empty state without CTA — user stuck

---

## 9 · Component: `Chart` (BarChart) (NEW)

**Source HTML:** `chart (1).html`
**File path:** `apps/mobile-dashboard/src/components/Chart.tsx` + `Chart.styles.ts`
**Sub-files suggested:** `BarColumn.tsx`, `ChartGrid.tsx`, `PeriodTabs.tsx`

### Props interface
```ts
type Period = '7d' | '14d' | '30d' | '90d';

interface ChartDataPoint {
  date: string;                           // ISO YYYY-MM-DD
  value: number;                          // KZT
  label?: string;                         // override x-axis; else derived
  critical?: boolean;                     // ≤10% avg → red bar
}

interface ChartProps {
  title: string;                          // "Тренды · Выручка"
  data: ChartDataPoint[];                 // ordered oldest → newest
  activeIndex?: number;                   // which bar is highlighted (over-label shown)
  onBarPress?: (index: number, point: ChartDataPoint) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  labelVariant?: 'date' | 'dow';          // 'A · DD.MM' or 'B · Пн 8'
  cardState?: 'default' | 'loading' | 'empty' | 'single-value';
  average?: number;                       // avg line position
  max?: number;                           // max line position (defaults to Math.max)
}
```

### Layout — card
- `.chart-card`: bg `#0F172A`, border `1px #1E293B`, radius 16, padding 20
- `.chart-head`: row, space-between, flex-wrap, gap 12, margin-bottom 16
  - `.chart-title`: Fira Sans 14/600 default + suffix `.muted` 12/400 muted (e.g. "14 дней")
  - `.period-tabs`: inline-flex, bg `#020617`, border `1px #1E293B`, radius 8, padding 2
    - Each tab: button Fira Code 11/600 tabular `text.muted` padding `5px 10px` radius 6
    - Active tab: bg `#1E293B` text `accentLight` #60A5FA
    - Transition: 120ms bg/color

### Chart body
- `.chart-body`: height 150, position relative, margin-top 8
- `.chart-grid`: absolute, left:0, right:40 (leaves space for labels)
  - `.grid-line`: absolute, left:0 right:0, `border-top: 1px dashed #1E293B`
  - `.grid-line.max` top:10%, label "макс ₸2.4М" muted #94A3B8
  - avg line top:45%, label "ср ₸1.4М" tertiary #64748B
  - Label: position right -44, top -7, Fira Code 10/400 tabular, bg `#0F172A` padding `2px 6px` radius 4 (for legibility over dashed line)

### Bars
- `.bars`: absolute, left:0 right:40, top:0 bottom:0, `flexDirection: row`, `alignItems: flex-end`, `gap: 6`
- `.bar-col`: flex:1, height 100%, column, center-bottom, min-width 0
  - **Hit-slop pseudo:** inset `-8px -4px -16px -4px` → ensures ≥32pt tap target on skinny bars
  - In RN, use `hitSlop={{ top: 8, right: 4, bottom: 16, left: 4 }}` on Pressable wrapping column

### Bar visual states
| bar state | color | use |
|---|---|---|
| above-avg | `accent` #2563EB | regular bars ≥ avg |
| below-avg | `accentDark` #1D4ED8 | regular bars < avg |
| active (selected) | `accentLight` #60A5FA | user-selected bar |
| zero | `text.disabled` #475569 | no-data bars (minor height 6%) |
| critical | `danger` #EF4444 | ≤10% avg (business threshold) |
| loading skel | `bg.elev` #1E293B pulse | skeleton |

- Bar width: 100% of col, min-height 4, border-radius `4px 4px 0 0`
- Transition bg 150ms

### Over-label (on active bar)
- `.over-label`: absolute, `bottom: 100%`, `left: 50%`, `translateX(-50%)`, margin-bottom 6, pointer-events none, column align-center gap 1
- `.amt`: Fira Code 12/700 `accentLight` #60A5FA tabular
- `.delta`: Fira Code 10/600 positive #22C55E (neg → #EF4444) tabular
- **Connector**: absolute, top -22, bottom -32 (extends through bar), transform translateX(-50%), 1px dashed `rgba(96,165,250,0.35)` (only visible on active)

### X-axis labels
- `.x-labels`: row, gap 6, padding-right 40, margin-top 8
- `.lbl`: flex:1, text-center, Fira Code 10/500 tabular `text.muted`, whitespace nowrap
  - Active: `accentLight` #60A5FA 10/700
  - Critical active (rare): danger #EF4444

**Variant A · date** (default, 14d+): Fira Code 10/500 "DD.MM" (e.g. "12.04")
**Variant B · dow** (7d optional): Fira Sans 10/500, column layout:
- `.day` 9/500 tertiary "Пн" / "Вт"
- `.num` 10/600 muted "8"
- Active: both lines in `accentLight` #60A5FA

### States

**Loading** (`cardState: 'loading'`)
- Skeleton bars: 14 `.skel-bar` with animated heights (pre-computed % pattern), bg `#1E293B`, border-radius 4×4×0×0
- `@keyframes pulse`: opacity 0.4 ↔ 0.8, 1.4s ease-in-out
- Stagger: `animation-delay: i * 0.1s`
- X-labels: 14 `.skel-label` 24×10 radius 3 bg `#1E293B` staggered

**Empty** (`cardState: 'empty'`)
- Replace body with `.empty`: column center gap 12, height 150
- Lucide `bar-chart-3` 32×32 `#475569`
- msg: Fira Sans 14/500 `text.tertiary` "Нет данных за период"
- CTA column:
  - Primary ghost-sm: `calendar` 14 + "Сменить период" Fira Sans 13/600 `accentLight` padding `8×14` radius 12
  - Secondary ghost-xs: "или обновить" Fira Sans 11/500 `text.muted` padding `2×6`

**Single-value** (`cardState: 'single-value'`)
- column center gap 8, height 150
- single bar: 48×80, bg `accentLight` #60A5FA, radius `4×4×0×0`
- amt: Fira Code 14/700 `text.default` tabular "₸2.1М"
- caption: Fira Sans 12/400 muted "единственный день с данными"

**Critical day** (data-level, inside default state)
- Bar uses `.crit` color `danger` #EF4444
- Over-label: amt `danger`, delta `danger.neg` "−100 %"
- Active x-label: `danger`

### Period tabs default
- 14d default
- Options: 7д / 14д / 30д / 90д (Fira Code tabular)

### Accessibility
```ts
accessibilityRole="image"                       // entire chart
accessibilityLabel={`График выручки · ${period} · средн ₸${avg}`}
// Each bar: accessibilityRole="button", label "DD.MM · ₸X.XМ · +N%"
```

### Antipatterns
- ✗ More than 4 periods in tab group (90д is longest supported)
- ✗ Connector without active bar — pure decoration
- ✗ Over-label without active bar — floats unanchored
- ✗ Variant B labels for 14d+ — too crowded
- ✗ Y-axis label without bg — clashes with dashed grid-line

---

## 10 · Component: `Chip` (NEW)

**Source HTML:** `chips-badges.html` § 1 (filter) · § 3 (source alternative — covered in Badge)
**File path:** `apps/mobile-dashboard/src/components/Chip.tsx` + `Chip.styles.ts`

### Props interface
```ts
import type { LucideIcon } from 'lucide-react-native';

interface ChipProps {
  label: string;                          // "Неделя" / "Бренд: BNA"
  variant?: 'filter';                     // single variant; filter = interactive (tap toggles)
  size?: 'sm' | 'md' | 'lg';              // default 'md'
  state?: 'default' | 'active' | 'pressed' | 'focused' | 'disabled';
  leadingIcon?: LucideIcon;               // calendar, etc.
  removable?: boolean;                    // shows trailing x button
  onPress?: () => void;                   // toggle active
  onRemove?: () => void;                  // only when removable + active
  testID?: string;
}
```

### Size spec
| size | height | padding-horiz | font | icon |
|---|---|---|---|---|
| sm | 24 | 10 | 11/600 | 12 |
| md | 32 | 14 | 12/600 | 14 |
| lg | 40 | 18 | 14/600 | 16 |

### States visual table
| state | bg | border | text | effect |
|---|---|---|---|---|
| default | transparent | `1px #334155` | `text.muted` #94A3B8 | — |
| active | `accent` #2563EB | transparent | `#FFFFFF` | — |
| pressed (from active) | `accentDark` #1D4ED8 | transparent | `#FFFFFF` | `transform: scale(0.98)` |
| focused | (keeps default or active bg) | outline `2px` `accentLight` offset 2 | — | focus ring |
| disabled | `bg.elev` #1E293B | `1px` #1E293B | `text.disabled` #475569 | `pointerEvents: none` |

### Layout
- Inline-flex, align-center, gap 6
- All sizes: radius `full` (9999)
- Fira Code, letter-spacing 0.2, tabular-nums, white-space nowrap
- Transition: bg / border / color 150ms, transform 100ms
- Hit-area: ≥32pt → sm needs hit-slop `+4` each side

### Removable (with x-btn)
- Trailing `.x-btn`: 16×16, margin-right -4, radius 50% (circle tap area)
- Icon `x` 12px currentColor
- Tap: fires `onRemove`, not `onPress`

### Accessibility
```ts
accessibilityRole="button"
accessibilityState={{ selected: state === 'active', disabled: state === 'disabled' }}
accessibilityLabel={label}
// Removable: separate Pressable with accessibilityLabel={`Удалить фильтр ${label}`}
```

### Antipatterns
- ✗ Using filter-active style (solid accent) for Status badge → user thinks it's tappable
- ✗ Status-dot without text → cryptic
- ✗ Chip with height < 24pt → tap target too small

---

## 11 · Component: `Badge` (NEW)

**Source HTML:** `chips-badges.html` § 2 (status) · § 3 (source) · § 4 (metric)
**File path:** `apps/mobile-dashboard/src/components/Badge.tsx` + `Badge.styles.ts`

### Props interface
```ts
import type { LucideIcon } from 'lucide-react-native';

interface BadgeProps {
  kind: 'status' | 'source' | 'metric';
  label: string;                          // "В плане" / "iiko" / "+12.3%"
  tone?: 'positive' | 'negative' | 'warning' | 'neutral' | 'info';  // status + metric
  sourceVariant?: 'solid' | 'outline';    // source only: default 'solid'
  live?: boolean;                         // status only: enable pulse-dot
  leadingIcon?: LucideIcon;               // database/file-text/trending-up/down
  testID?: string;
}
```

### Status badge spec (§ 2)
- **Non-interactive** (display only)
- height 24, padding `0 10`, radius full, border `1px`
- Fira Code 11/600 UPPERCASE letter-spacing 0.6
- Leading dot: 8×8 circle solid tone color
- gap 6

| tone | bg | border | text | dot |
|---|---|---|---|---|
| positive | `rgba(34,197,94,0.10)` | `rgba(34,197,94,0.30)` | `positive` #22C55E | #22C55E |
| negative | `rgba(239,68,68,0.10)` | `rgba(239,68,68,0.30)` | `danger` #EF4444 | #EF4444 |
| warning | `rgba(245,158,11,0.10)` | `rgba(245,158,11,0.30)` | `warning` #F59E0B | #F59E0B |
| neutral | `rgba(148,163,184,0.08)` | `rgba(148,163,184,0.25)` | `text.muted` #94A3B8 | `bg.elev` #475569 |
| info | `rgba(14,165,233,0.10)` | `rgba(14,165,233,0.30)` | `info` #0EA5E9 | #0EA5E9 |

**Live pulse** (when `live: true` + `tone: positive`):
- Dot has box-shadow ring animation:
  - 0%: `0 0 0 0 rgba(34,197,94,0.6)`
  - 70%: `0 0 0 8px rgba(34,197,94,0)`
  - 100%: `0 0 0 0 rgba(34,197,94,0)`
- 1.4s ease-out infinite

### Source badge spec (§ 3)
- **Non-interactive** data attribution
- height 22, padding `0 9`, radius full
- Fira Code 10/600 UPPERCASE letter-spacing 0.6
- gap 5, leading icon 10×10

| variant | bg | border | text |
|---|---|---|---|
| solid (default) | `#F8FAFC` (text.default inverse) | transparent | `#0F172A` (bg.card) |
| outline | transparent | `1px #334155` | `text.muted` #94A3B8 |

- Use `solid` for primary placement (e.g. hero-card top-right)
- Use `outline` for sub/tooltip context

### Metric badge spec (§ 4)
- **Non-interactive**, attached to KPI values
- height 22, padding `0 8`, radius full
- Fira Code 11/600 tabular-nums letter-spacing 0.2
- gap 4, leading icon 12

| tone | bg | text |
|---|---|---|
| positive | `rgba(34,197,94,0.15)` | `positive` #22C55E + `trending-up` 12 #22C55E |
| negative | `rgba(239,68,68,0.15)` | `danger` #EF4444 + `trending-down` 12 #EF4444 |
| neutral | `bg.elev` #1E293B | `text.muted` #94A3B8 no icon |

### Loading skeleton
- `.skel`: 48×24, bg `#1E293B`, radius full, pulse 1.4s
- Stagger delays for rows: `i * 0.1s`

### Antipatterns
- ✗ Status badge clickable (tap-toggle) → users expect filter behavior
- ✗ Source badge with border + inverse bg (hybrid) — pick solid OR outline
- ✗ Metric without tone-appropriate sign — "+12%" in neutral looks like missing data
- ✗ Live pulse on non-positive tones — pulsing red would read as alarm, not liveness

---

# 12 · Component hierarchy tree (token flow)

Each component's token dependencies:

```
BottomNav
  ├── colors.accentLight · colors.text.tertiary
  ├── colors.bg.canvas (root)
  ├── radii.md (iconPill) · radii.full (badge dot)
  ├── typography.sans 10/500 (label)
  └── lucide icons: Home · Store · BarChart3 · Bell

RestaurantCard
  ├── colors.{positive,warning,danger,text.muted}  (semantic sync 4-token group)
  ├── colors.bg.card · colors.border.default
  ├── colors.brand.bna · colors.brand.dna
  ├── radii.lg (12) · radii.full (badges, bar)
  ├── spacing.{4,8,10,12,16,18}
  ├── typography.sans {15/600 name · 11/400 sub · 11/600 status}
  ├── typography.mono {18/700 revenue · 10/600 badge · 11/500 plan/margin}
  ├── shadows.md (hover)
  └── lucide icons: ChevronRight · TrendingUp · TrendingDown · Minus · WifiOff · AlertCircle

Button
  ├── colors.{accent,accentDark,accentLight,accentGlow}  (primary)
  ├── colors.{danger,dangerDark}  (destructive)
  ├── colors.{border.strong,border.subtle,bg.elev,text.disabled}  (secondary/disabled)
  ├── radii.lg (12) · radii.full (pill)
  ├── spacing.{8 (gap), 10/14/20/24 (paddings per size)}
  ├── typography.sans 600 × 12/13/15/16
  ├── shadows.sm · animation.press (scale 0.98)
  └── lucide icons: Loader2 (spinner) · any variant icons

Input
  ├── colors.{bg.card,bg.elev,border.strong,accent,accentLight,accentGlow,danger,positive,text.disabled}
  ├── radii.md (10) / lg (12) / xl (14) per size
  ├── spacing.{6,8,12,14,16,20}
  ├── typography.sans {12/500 label · 11/400 helper · 13/15/16 field}
  ├── typography.mono (number/password/suffix)
  ├── animation.blink
  └── lucide icons: Search · Eye · EyeOff · Calendar · ChevronDown · AlertCircle · CheckCircle · XCircle

PhoneInput
  (extends Input tokens)
  ├── typography.mono 15/500 tabular letter-spacing 0.3
  ├── colors.bg.elev (prefix box) · colors.border.strong (divider)
  └── library: react-native-international-phone-number

OtpInput
  (extends Input base)
  ├── typography.mono 22/600 tabular
  ├── animation.shake (400ms · 5-step translateX)
  ├── animation.blink
  └── lucide icons: CheckCircle · RefreshCw · AlertCircle

KPICard + KPIRow
  ├── colors.{accent,text.muted,positive,positiveLight,danger,dangerLight}
  ├── border-left tokens: 6px (revenue hero) vs 4px (others)
  ├── radii.lg (12)
  ├── spacing.{6,12,14,16}
  ├── typography.mono {24/700 value · 12/500 pct · 11/600 label}
  ├── typography.sans {11/400 vs · 10/400 period}
  ├── animations.pulse (loading value block 1.4s)
  └── lucide icons: TrendingUp · TrendingDown · Wallet · ArrowDownUp · Minus · AlertTriangle · RefreshCw

HeroCard
  ├── colors.{accent,positive,danger} (3 border-left variants)
  ├── radii.2xl (16)
  ├── spacing.{6,8,10,12,14,20,22}
  ├── typography.mono {36/600 kpi · 15/600 profit-value · 12/tabular meta}
  ├── typography.sans {11/600 label · 12/600 profit-label · 14/500 msg}
  ├── shadows.lg (hover)
  ├── animations.pulse-dot 1.8s
  └── lucide icons: TrendingUp · TrendingDown · ChevronRight · AlertTriangle · BarChart3 · Calendar · RefreshCw

Chart
  ├── colors.{accent,accentDark,accentLight,text.disabled,danger,bg.canvas,bg.elev}
  ├── radii.2xl (card 16) · radii.md (8 tabs) · radii.sm (4 bars top-only)
  ├── spacing.{2,6,8,10,12,20}
  ├── typography.sans {14/600 title · 12/400 muted}
  ├── typography.mono {11/600 tabs · 10/500 labels · 12/700 over-amt · 10/600 over-delta}
  ├── animations.{shimmer, pulse}
  └── lucide icons: BarChart3 · Calendar

Chip
  ├── colors.{accent,accentDark,border.strong,text.muted,bg.elev,text.disabled}
  ├── radii.full
  ├── spacing.{10,14,18 horiz · 4,6 gap}
  ├── typography.mono {11/600 · 12/600 · 14/600 per size}
  └── lucide icons: X (remove) · Calendar (optional leading)

Badge
  ├── colors all tones + their alpha tints (0.08-0.30 ranges)
  ├── radii.full
  ├── spacing.{8,9,10 horiz · 4,5,6 gap}
  ├── typography.mono {10-11/600 tabular letter-spacing 0.6}
  ├── animations.pulse-dot (1.4s status live)
  └── lucide icons: TrendingUp · TrendingDown · Database · FileText · Cloud · Server
```

---

# 13 · Shared styles (candidate for `src/styles/shared.ts`)

```ts
// Card pattern used by RestaurantCard, KPICard, HeroCard, Chart card
export const cardBase = {
  backgroundColor: colors.bg.card,        // #0F172A
  borderWidth: 1,
  borderColor: colors.border.default,     // #1E293B
  borderRadius: radii.lg,                 // 12 (HeroCard + Chart use 16)
};

// Border-left accent pattern (semantic carrier)
export const borderLeftSemantic = (color: string, width: 4 | 6 = 4) => ({
  borderLeftWidth: width,
  borderLeftColor: color,
});

// Pill-shape (chip, badge, delta-pill, brand-badge)
export const pillShape = {
  borderRadius: 9999,
  paddingHorizontal: 8,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
};

// Tabular number text (ALL KPI values, percentages, dates)
export const tabularText = {
  fontFamily: typography.mono.regular,
  fontVariant: ['tabular-nums'] as const,
};

// Label UPPERCASE pattern (k-label, chart title-muted, section-head)
export const labelCaps = {
  fontFamily: typography.mono.semibold,
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
};

// Shimmer skeleton (used by RestaurantCard loading, HeroCard loading, Chart loading)
export const shimmerBlock = {
  backgroundColor: colors.bg.elev,        // #1E293B → #293548 → #1E293B gradient
  borderRadius: 6,
  // animation handled by Animated.Value in SkeletonLoader component
};

// Press-in interaction
export const pressScale = {
  // use react-native-gesture-handler or Animated.Value: toValue 0.98, duration 120
};

// Focus ring (universal for Button, Input, Chip keyboard focus)
export const focusRing = {
  borderWidth: 2,
  borderColor: colors.accentLight,        // #60A5FA
  // offset via negative margin + padding compensation
};

// Helper text (Input, PhoneInput, OtpInput)
export const helperTextBase = {
  fontFamily: typography.sans.regular,
  fontSize: 11,
  lineHeight: 16,
  color: colors.text.muted,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 5,
};
```

These extract cleanly — 7-ish shared patterns across 11 components. Keep `cardBase`, `borderLeftSemantic`, `pillShape`, `tabularText`, `labelCaps`, `helperTextBase`, and `shimmerBlock` at minimum.

---

# 14 · Screen usage map

Which screens consume which components:

| Screen | Components used | Notes |
|---|---|---|
| **LoginScreen** (existing) | `PhoneInput` · `OtpInput` · `Button` (primary lg pill fullWidth) | OTP flow: phone → Button "Получить код" → OtpInput → auto-submit / Button "Войти" |
| **DashboardScreen** (existing) | `HeroCard` (revenue primary) · `KPIRow` · `RestaurantCard` (list) · `Chart` (trends) · `Chip` (period filters) · `Badge` (status live iiko) | Owner view; hero + 3 KPIs + chart + top-N points |
| **PointsScreen** (existing) | `RestaurantCard` (list, all 13 points) · `Chip` (brand BNA/DNA filters, city) · `Input` (search) · `Badge` (status per point) | Filter row: period chips + brand/city; search input; card list |
| **PointDetailScreen** (existing) | `HeroCard` (single point revenue/profit) · `KPIRow` · `Chart` · `Badge` (source iiko/1C badges in hero) · `Button` (actions) · `Chip` (period) | Drill-down L2→L3 |
| **BrandDetailScreen** (existing) | Same as PointDetailScreen but at brand-level agg | |
| **ArticleDetailScreen** (existing) | `Chart` · `KPICard` (single) · `Badge` (category tone) · `Button` | Drill-down L3→L4 (articles) |
| **OperationsScreen** (existing) | Future: transaction table · filter `Chip` row · `Input` (search) · `Badge` (status per operation) · `Button` | L4 operations list |
| **ReportsScreen** (existing) | `Chart` (multi-chart composition) · `KPIRow` · `Chip` (period + filter chips) · `Button` (export) | Analytics view |
| **NotificationsScreen** (existing) | `Badge` (status per notif) · `Button` (mark read, actions) | Alert list |
| **ProfileScreen** (existing) | `Button` (logout destructive, edit) · `Input` (name/phone fields) · `Badge` (role) | Settings |

**Global** (every screen): `BottomNav` (bottom fixed, z-100 over content)

---

# 15 · Lucide icons needed (full import map)

All icons MUST use `lucide-react-native` (already installed v1.8.0 → needs upgrade to pin 0.344.0 parity in Wave 2).

**Import pattern** (tree-shaking friendly):
```ts
import { Home, Store, BarChart3, Bell, TrendingUp, TrendingDown /* etc */ } from 'lucide-react-native';
```
NOT `import * as Lucide from ...` (kills tree-shaking).

### Canonical icon set (alphabetical)

**Navigation / nav-bar**
- `Home` — dashboard tab
- `Store` — points/restaurants tab
- `BarChart3` — reports/analytics tab + chart empty state
- `Bell` — notifications tab
- `User` — profile (if added)

**Action / interactive**
- `Plus` · `Minus` · `X` · `Check` — misc
- `Search` — Input search variant
- `Filter` — toolbar / chip trigger
- `RefreshCw` — retry CTA, reload, resend OTP
- `MoreVertical` · `MoreHorizontal` — overflow menus
- `Edit2` — edit action
- `Trash2` — destructive button example
- `LogOut` — profile logout
- `Download` · `Upload` · `Share2` — export actions

**Directional**
- `ChevronRight` — card drill-down, list nav
- `ChevronDown` — select, expand
- `ChevronLeft` — back nav
- `ChevronUp` — collapse

**Time**
- `Calendar` — date input, period selector
- `Clock` — timestamp (rare)

**Info / visual**
- `Eye` · `EyeOff` — password reveal
- `Info` — info tooltip (info semantic #0EA5E9)

**Semantic / status**
- `TrendingUp` — positive delta, revenue hero header icon
- `TrendingDown` — negative delta, danger variant
- `CheckCircle` — success Input state, success OTP
- `AlertCircle` — error Input helper, offline restaurant
- `AlertTriangle` — warning, error HeroCard, KPI error state
- `XCircle` — hard error
- `Wallet` — balance KPI header icon
- `ArrowDownUp` — expenses KPI header icon
- `Wifi` — live sync positive icon (semantic icon demos)
- `WifiOff` — offline restaurant delta pill

**Buttons / loading**
- `Loader2` — button loading spinner (rotate 900ms)
- `Pencil` — secondary edit example (buttons demo)
- `ArrowRight` — ghost button example

**Data attribution** (source badge)
- `Database` — iiko source
- `FileText` — 1С source
- `Cloud` — cloud source
- `Server` — on-prem source

**Category icons** (12 DDS — only used if category feature ships in later phase)
- `Utensils` (food) · `Building2` (rent) · `Wallet` (salary) · `Zap` (utilities) · `Megaphone` (marketing) · `Wifi` (IT) · `Truck` (transport) · `Wrench` (equipment) · `Landmark` (taxes) · `Shield` (security) · `GraduationCap` (training) · `MoreHorizontal` (other)
- **Note**: category rendering not in scope of components 1-11. Reserved for future ArticleDetailScreen category pills.

**Decorative link/ref icon** (from HTML prototypes, not used in RN)
- `Link2` — skip; was for HTML pinned-link callout

### Size conventions
| size | px | use |
|---|---|---|
| xs | 12 | metric-badge inline icons, sub-badges |
| sm | 14 | source badges, chip icons sm, helper-text icons, small utilities |
| md | 16 | field icons md, delta-pill, hero-card trending icons |
| lg | 20 | DEFAULT · iconOnly button, nav icons (adjusted to 22 in BottomNav spec) |
| xl | 24 | category cat-grid icons, heading decor |
| 2xl | 32 | empty-state hero illustrations |

### Stroke conventions
- `strokeWidth={2}` — default
- `strokeWidth={2.5}` — for ≤16px icons (thin lines fade on dark bg)
- `strokeWidth={1.5}` — for ≥24px decorative icons

### a11y
- Interactive icons (in button/pressable): `accessibilityLabel` on parent (icon inherits)
- Decorative-only icons: wrap in `<View accessibilityElementsHidden importantForAccessibility="no">`

---

# 16 · Breaking changes summary

### `BottomNav` (update)
| Aspect | Before | After | Migration |
|---|---|---|---|
| Icon size | 18 | 22 | increase one number |
| Active color token | `colors.accentLight` | same but verify token = #60A5FA | no change if theme is correct |
| Active bg | unclear | `rgba(37,99,235,0.12)` | explicit per spec |
| Labels | "Отчёты"? | "Аналитика" (HTML wording) | string change |
| Props | unchanged | unchanged | none |

### `RestaurantCard` (rewrite — breaking)
Full props shape changes. Parent screens (`PointsScreen`, `DashboardScreen`) must be updated to:
- Pass `brand` explicitly (from restaurant data)
- Pass `cuisine` as `'Burger' | 'Doner'` (derived from brand: BNA→Burger, DNA→Doner)
- Pass `planAttainmentPct` + `planMarkPct` separately (used to be single `planPct`)
- Pass `status` as `'above'|'onplan'|'below'|'offline'|'loading'` (new discrete set)
- Pass `periodLabel` string (was implicit, now required)
- Pass `marginPct`, `deltaPct` as nullable

**Data layer impact**: `data/restaurants.ts` must expose `status` with new token set. `statusColor` map stays but keys rename:
```ts
// before: { green, yellow, red } → after: { above, onplan, below, offline }
```

### Icons library upgrade
- `lucide-react-native` `^1.8.0` → pin to v0.344.0-compatible version (Wave 2 package.json work)
- The HTML prototypes use `lucide@0.344.0` on web; lucide-react-native version parity must be verified

### Typography fonts (Wave 2)
- `@expo-google-fonts/jetbrains-mono` → `@expo-google-fonts/fira-code` (replace import + App.tsx useFonts)
- `@expo-google-fonts/plus-jakarta-sans` → `@expo-google-fonts/fira-sans` (same)
- All styles using `JetBrainsMono_*` / `PlusJakartaSans_*` → replace with `FiraCode_*` / `FiraSans_*`

### New dependencies (Wave 2)
- Add: `react-native-confirmation-code-field` (for OtpInput)
- Keep: `react-native-international-phone-number@^0.11.3` (PhoneInput)
- Verify: `lucide-react-native` version alignment with pinned 0.344.0

---

# 17 · Deliverable checklist for Wave 2/3 mobile-agent

For each of the 11 components:
- [ ] Component `.tsx` file with typed props interface
- [ ] Co-located `.styles.ts` using tokens only (no hex hardcode)
- [ ] All variants/states implemented per spec table
- [ ] Loading/empty/error states where applicable (RestaurantCard, KPICard, HeroCard, Chart)
- [ ] Accessibility props (role, label, hint, state) populated
- [ ] Animations wired (press scale, shake, blink, pulse-dot, shimmer)
- [ ] Lucide icons imported named (no wildcard)
- [ ] Shared styles from `src/styles/shared.ts` consumed where applicable

Screen migrations (Wave 4, out of this phase's scope):
- [ ] Each of 9 screens rewritten to use new component props
- [ ] `PointsScreen` list re-shape to pass `brand`/`cuisine`/`status`
- [ ] `LoginScreen` migrates to `PhoneInput` + `OtpInput` + new `Button`
- [ ] `DashboardScreen` adopts `HeroCard` (revenue) + `KPIRow` + `Chart` + `RestaurantCard` list

---

**End of UI-SPEC · ready for Wave 2 tokens implementation.**
