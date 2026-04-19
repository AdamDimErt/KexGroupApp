# Phase 10 · Design System v3 · Usage Rules

**Created:** 2026-04-19
**Status:** Source-of-truth guideline for Wave 2+ mobile-agent implementation
**Derived from:** 17 approved HTML prototypes in `C:\Users\Acer\Downloads\` (latest `(N)` versions)

> Each rule cites the exact HTML file + line(s) it came from. A developer reading this doc should never have to open the prototypes to resolve an implementation question — but every claim is traceable back to source.

---

## 0 · How to read this doc

- **Section 1** — rules that hold across every component. Read first.
- **Section 2** — numeric thresholds that drive semantic color switching.
- **Section 3** — per-component Do / Don't lists (cited to HTML).
- **Section 4** — KEX GROUP brand vocabulary (what naming is allowed).
- **Section 5** — iOS / Android / RN specifics.
- **Section 6** — antipattern cheat-sheet (everything forbidden, in one place).
- **Section 7** — cross-file invariants the tokens must uphold together.

Rules that would naturally appear in multiple component sections have been **pulled up into Section 1**. Sections 3+ only contain rules unique to each component.

---

## 1 · Global rules — hold for every component

### 1.1 · 4px-grid spacing

Every `padding / margin / gap / width / height / border-radius` value MUST be a multiple of 4. The canonical scale has 11 steps: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 56 / 64` (`spacing (2).html:490–556`).

**Default inset** when unsure: `16 · md` (`spacing (2).html:512, 808`).
**DEFAULT:** `16 · md` explicitly marked default in the spacing scale. The token is `--space-md`.

**Forbidden values** (break the grid): `5`, `6`, `7`, `10`, `13`, `14`, `18`. Called out in `spacing (2).html:480` and its own Don't rule (`spacing (2).html:780–782`):

> «Не использовать значения вне 4px-grid — `5`, `7`, `10`, `13`, `14`, `18` ломают ритм.»

Single legacy exception: `6px` for inline icon-to-text gap — the spacing card marks it `opacity:0.4` and explicitly notes «⚠ 6px — legacy, избегать в новых компонентах» (`spacing (2).html:601–609`). **In v3 code use 4 or 8 — never 6.**

Semantic role mapping (`spacing (2).html:566–611`):
- **inset (padding):** 4 / 8 / 12 / 16 / 20 / 24
- **stack (vertical between blocks):** 8 / 12 / 16 / 24 / 32 / 48
- **inline (horizontal between siblings in a row):** 4 / 8 / 12 / 16 / 20

Density modes (`spacing (2).html:717–733`): **Normal** (stack 8–12, inset 12–16) is the **default** for the KEX dashboard.

### 1.2 · Radii — strictly 6 values from the scale

Allowed: `4 / 8 / 12 / 16 / 20 / full (9999)` (`radii (1).html:421–459`).

**Default:** `lg · 12` (`radii (1).html:504, 655` — «DEFAULT для interactive: btn / input / card / kpi»).

**Component map** (`radii (1).html:659`, must be respected cross-file):
| Component | Radius |
|---|---|
| button | `lg · 12` |
| input / textarea | `lg · 12` |
| card / kpi / restaurant-card | `lg · 12` |
| modal / bottom-sheet / hero-card | `xl · 16` |
| chip / badge / pill-btn / avatar / status-dot | `full · 9999` |
| tooltip / tag / code-block | `sm · 4` |
| dropdown / small chip | `md · 8` |

**Forbidden values** outside the scale (`radii (1).html:614`): `5`, `7`, `10`, `11`, `14`. Explicitly called out in the Don't list.

Nesting rule (`radii (1).html:608`): **inner radius < parent radius.** Chip (`4`) inside card (`12`) is correct; reverse is a bug.

### 1.3 · Text hierarchy — solid hex only, never opacity

Five levels, all solid hex from `colors-text.html:459–482`:

| Token | Hex | Role |
|---|---|---|
| `text-default` | `#F8FAFC` (slate-50) | KPI, headings, body content |
| `text-secondary` | `#CBD5E1` (slate-300) | supporting text (e.g. body-sm default) |
| `text-muted` | `#94A3B8` (slate-400) | captions, timestamps, meta labels |
| `text-tertiary` | `#64748B` (slate-500) | dates, IDs, tech meta — avoid on `bg-elev` (fails AA) |
| `text-disabled` | `#475569` (slate-600) | decoration only — NEVER for content |

Plus 2 non-hierarchy tokens:
- `text-inverse` `#0F172A` — only on light solid bg (iiko/1С source badges)
- `text-link` `#60A5FA` — clickable inline links, always with underline or icon

**Hard rule (cited):** `colors-text.html:494` — «Антипаттерн: opacity вместо solid hex на Text — в RN работает непредсказуемо на разных фонах и режимах. **Всегда** solid hex из токенов».

Contrast matrix validated in `colors-text.html:422–451`:
- `text-tertiary #64748B` fails on `bg-elev #1E293B` (3.7:1) → avoid that combo.
- `text-disabled #475569` fails on all backgrounds → decoration only.

### 1.4 · Accent = BLUE, not green

- **`accent #2563EB`** (blue-600) — brand, CTA, active navigation (`colors-core (1).html:210–214`).
- **`positive #22C55E`** (green-500) — profit, growth, success, +Δ (`colors-core (1).html:249–253`).
- **`accent-light #60A5FA`** (blue-400) — text-links, soft accents (`colors-core (1).html:230–237`).

These are **two different semantics.** Mixing them is explicitly forbidden in `type-headings (1).html:531–534`:

> «НЕ смешивать accent и positive. `accent = #60A5FA` (BLUE, link/interactive). `positive = #22C55E` (GREEN, success). Это две разные семантики.»

Also called out as Don't in `type-headings (1).html:598`: «`#22C55E` (green) как «accent» — это **POSITIVE**. Accent = `#60A5FA` (BLUE).»

Interactive accent states (`colors-core (1).html:422–458`):
- default `#2563EB`
- hover `#1E40AF` (blue-800)
- pressed `#1D4ED8` (blue-700) + `scale(0.98)` + inset shadow
- focused `#2563EB` + `2px #60A5FA` outline, offset 2

**Surface-only tokens** (fail AA for text): `accent-dark #1D4ED8` (`colors-core (1).html:223–224`), `positive-dark #16A34A` (`colors-core (1).html:258–260`). Use only as background fills.

### 1.5 · Semantic full set

`colors-core (1).html:277–306`:

| Token | Hex | Usage |
|---|---|---|
| `success` / `positive` | `#22C55E` | +Δ, OK sync, growth |
| `warning` | `#F59E0B` | cash discrepancies, attention |
| `danger` | `#EF4444` | loss, sync error |
| `info` | `#0EA5E9` (sky-500) | neutral notifications |

Info was updated from `#3B82F6` → `#0EA5E9` — see `colors-status.html:555`. Use `#0EA5E9` always.

### 1.6 · Tinted backgrounds — 15% / 30% pattern

Tint surface pair: `bg 15% opacity + border 30% opacity + text solid` (`colors-core (1).html:501`, `colors-status.html:548`). Applies to all semantic-tinted chips, callouts, badges. Never invent ratios.

### 1.7 · Typography families — Fira Sans + Fira Code (pinned)

Two families only (`type-families (1).html:372–378`):
- **Fira Sans v4.301** — ALL body / UI / headings (screen-title, h1–h4, subheading, button text, labels, nav, input).
- **Fira Code v6.2** — numerals, deltas, percentages, timestamps, tokens, code, KPI values.

Weights: **only** 400 / 500 / 600 / 700 (`type-families (1).html:596` — Don't use 100–300 or 800–900).

**`tabular-nums`** must be applied to Fira Code for any column of numbers (`type-families (1).html:590`). Without it, digits misalign because Fira Sans is proportional by default.

**Don't mix families in the same numeric string** (`type-families (1).html:594`):
> «Не миксовать Fira Sans и Fira Code в одной «числовой» строке.»

### 1.8 · Typography sizes — shared rules

- All line-heights must be multiples of 4 (`type-headings (1).html:592, 600`).
- Negative letter-spacing only on large sizes: `-0.5` display, `-0.3` screen, `-0.2` h1 (`type-headings (1).html:593`).
- **Never positive letter-spacing on body-sizes** — illegible (`type-headings (1).html:601`).
- **Never scaled-up samples** when documenting (14px token shown at 28px) — always use actual production size (`type-body (2).html:437`).

Heading scale (`type-headings (1).html:624–630`):
| Token | Size | LH | Weight | LS | Family |
|---|---|---|---|---|---|
| `display-numeric` | 32 | 40 | 700 | -0.5 | **Fira Code** (KPI only) |
| `screen-title` | 26 | 32 | 700 | -0.3 | Fira Sans — **DEFAULT** |
| `h1` | 22 | 28 | 700 | -0.2 | Fira Sans |
| `h2` | 18 | 24 | 600 | 0 | Fira Sans |
| `h3` | 16 | 20 | 600 | 0 | Fira Sans |
| `h4` | 14 | 20 | 600 | 0 | Fira Sans |
| `subheading` | 15 | 20 | 500 | 0 | Fira Sans muted |

Body scale (`type-body (2).html:488–504`):
| Token | Size | LH | Weight | LS | Transform |
|---|---|---|---|---|---|
| `body` | 14 | 1.5 | 400 | 0 | — — **DEFAULT** |
| `body-sm` | 13 | 1.5 | 400 | 0 | — |
| `caption` | 12 | 1.4 | 400 | 0 | — |
| `label` | 11 | 1.25 | 600 | 0.8 | **UPPERCASE** always |
| `button` | 14 | 1.25 | 600 | 0.2 | — |

### 1.9 · Icons — Lucide 0.344.0 pinned

Source: `type-families (1).html:3`, `icons-lucide.html:585`. All Lucide includes in prototypes use `lucide@0.344.0/dist/umd/lucide.min.js` (few older files still have `@latest` — those are obsolete and should not be trusted for version).

**RN mapping** (`icons-lucide.html:579`): package is `lucide-react-native`. Import **named only** — `import { Home } from 'lucide-react-native'`. Never `import * as Lucide` (breaks tree-shaking).

Sizes (`icons-lucide.html:586`): `12 / 14 / 16 / 20 (default) / 24 / 32` — no arbitrary values.

Stroke (`icons-lucide.html:587`):
- `1.5` for ≥24px (decorative)
- `2` default (14–20px, Lucide standard)
- `2.5` for ≤16px — thin lines disappear on dark bg otherwise

Library mixing explicitly forbidden (`icons-lucide.html:567`): «миксовать библиотеки (Lucide + Heroicons) — stroke / filling / метрика рассинхронизируются».

**No emoji as icons** (`icons-lucide.html:564`).

UI-icon color: `text-muted #94A3B8` default, `text-default #F8FAFC` on hover/active, `text-disabled #475569` when disabled.

### 1.10 · Border-left pattern

`hero-card`, `kpi-row`, `restaurant-card` all share a **border-left as semantic signal** paradigm:
- 4px wide default (hero variants, restaurant-card, kpi balance/expenses)
- 6px wide on hero-KPI emphasis (revenue card in kpi-row — `kpi-row (1).html:59`, 536)

The border-left color must stay in sync with dot / bar-fill / status-text on the same card (see §1.11).

### 1.11 · Semantic sync within a single card

From `restaurant-card.html:327–329, 716`:

> «Dot + border-left + bar-fill + status-text — единый semantic по всей карточке»

If any one of those four elements is positive-green, all four must be positive-green. Mismatch (e.g. orange dot on a +10% card) is explicitly called out as a visual bug in `restaurant-card.html:747`.

### 1.12 · Shadow & elevation — color first, shadow second

Dark-mode hard rule (`shadows (1).html:526, 748`):

> «На dark UI elevation — это **В ПЕРВУЮ ОЧЕРЕДЬ bg-color**, во вторую — shadow. Просто тёмная тень на тёмном фоне почти невидима.»

Elevation levels (`shadows (1).html:535–569`):
- `elev-0` #020617 — app base, no shadow
- `elev-1` #0F172A — surfaces, color only
- `elev-2` #0F172A + shadow-sm — cards, kpi, list-rows
- `elev-3` #1E293B + shadow-lg — popovers, dropdowns, tooltips
- `elev-4` #1E293B + shadow-xl — modals, bottom-sheets (always with backdrop)
- `elev-5` #1E293B + shadow-2xl — toasts, FAB pressed

Shadow tokens (`shadows (1).html:809–819`):
```
--shadow-sm:    0 2px 6px -2px rgba(0,0,0,0.40)
--shadow-md:    0 6px 16px -6px rgba(0,0,0,0.50)   // card :hover
--shadow-lg:    0 8px 16px -4px rgba(0,0,0,0.60)   // elev-3
--shadow-xl:    0 12px 32px -8px rgba(0,0,0,0.70)  // elev-4
--shadow-2xl:   0 16px 48px -12px rgba(0,0,0,0.80) // elev-5
--glow-focus:   0 0 0 4 rgba(37,99,235,0.25)       // :focus-visible
--glow-success: 0 0 0 4 rgba(34,197,94,0.25)
--glow-danger:  0 0 0 4 rgba(239,68,68,0.25)
--inset-press:  inset 0 2 4 rgba(0,0,0,0.40)       // :active
--inset-well:   inset 0 1 2 rgba(0,0,0,0.30)       // search field
```

Hover = **same elevation + shadow-md** (lift via shadow strength, not by bumping elevation level) — `shadows (1).html:227, 819`.

### 1.13 · Backgrounds — 3-level surface hierarchy

`colors-core (1).html:178–200`:
- `bg` `#020617` (slate-950) — OLED app background
- `bg-card` `#0F172A` (slate-900) — cards, sheets
- `bg-card-elev` `#1E293B` (slate-800) — elevated cards, modals, hover

### 1.14 · Borders — 3 strengths

`colors-core (1).html:467–488`:
- `border-subtle` `#1E293B` 1px — dividers inside cards
- `border-default` `#334155` 1px — card outlines, inputs
- `border-strong` `#475569` 2px — focus-ring, active fields

### 1.15 · Transitions — standardized durations

From prototype patterns (`colors-core (1).html:135–140`, `buttons (1).html:80`, `kpi-row (1).html:52`, `restaurant-card.html:60`):
- `150ms ease` — bg / border-color / color (hover, focus, state)
- `120ms ease` — card shadow / transform
- `100ms ease` — pressed `transform: scale(0.98)` or `0.99`

### 1.16 · Focus-visible = 2px #60A5FA outline, offset 2

Universal across all interactive elements (`buttons (1).html:121`, `chips-badges.html:79`). Keyboard-only (`:focus-visible`) — never show on tap/click.

---

## 2 · Semantic thresholds (performance coloring)

From `restaurant-card.html:337, 374–378, 418, 459, 766`:

| Performance vs plan | State | Color | Token |
|---|---|---|---|
| `≥ +5%` | above | green | `#22C55E` (positive) |
| `−5% < x < +5%` | onplan | amber | `#F59E0B` (warning) |
| `≤ −5%` | below | red | `#EF4444` (danger) |
| sync-fail / no data | offline | grey | `#64748B` (muted) |

These thresholds drive **all four** visual layers on a restaurant-card: dot, border-left, bar-fill, status-text (see §1.11 semantic sync).

**Status thresholds for cash discrepancies** (`colors-status.html:486–490`):
- ≤ 5% → warning
- > 5% → danger
- Sync delay > 15 min → warning; sync error → danger

**Chart criticality** (`chart (1).html:561`): `≤ 10% of avg` = critical red bar.

---

## 3 · Component-specific rules

### 3.1 · Button

**Variants × states matrix:** 5 variants (`primary`, `secondary`, `tertiary`, `ghost`, `destructive`) × 5 states (`default`, `pressed`, `disabled`, `loading`, `with-icon`) (`buttons (1).html:319–469`).

**Radius by context** (`buttons (1).html:237–242`):
- **Pill (`full · 9999px`)** — login, OTP, onboarding, marketing CTA, **full-width primary actions**
- **Rounded (`lg · 12px`)** — in-app actions, form buttons, toolbar, secondary actions

**Don't:**
- «✗ Pill в карточке» (`buttons (1).html:241`)
- «✗ Rounded на login full-width» (`buttons (1).html:241`)

**Sizes** (`buttons (1).html:269–285`):
| Token | h | padding-x | font | min-w | use |
|---|---|---|---|---|---|
| `lg` | 52 | 24 | 16/600 | 160 | CTA, hero |
| `md` | 44 | 20 | 15/600 | 140 | **default** |
| `sm` | 36 | 14 | 13/600 | 100 | inline, +12pt hit-slop |
| `xs` | 28 | 10 | 12/600 | — | drill-down L4 + 20pt hit-slop |
| icon-only | 44 | 0 | — | 44 | toolbar, strict tap-area |

**Loading state:** `min-width` locks layout. Default and Loading of the same button must be identical width — different text lengths must not jump (`buttons (1).html:289–314`).

**Disabled:** explicit tokens `bg #334155 / text #64748B` — **never opacity** (`buttons (1).html:96, 600`).

**Ghost loading requires bg-change** (`buttons (1).html:111, 602`) — ghost buttons are transparent, so loading state shows `bg #1E293B` for OLED visibility. Specific fix for a class of "invisible loading" bugs.

**Icon-only button:** strict 44×44, Lucide 20px, `aria-label` required (`buttons (1).html:503`).

**Accessibility ARIA table** (`buttons (1).html:552–591`):
- Loading: `aria-busy="true"` + `aria-live="polite"`
- Disabled: native `disabled` attr (not `aria-disabled` unless focusable)
- Icon-only: `aria-label` mandatory

**RN:** `accessibilityRole="button"`, `accessibilityState={{disabled, busy}}`, `accessibilityLabel` (`buttons (1).html:589`).

### 3.2 · Input

**Radius:** rounded `12px` always — never pill (`inputs (1).html:380, 554, 563`):

> «Антипаттерн: pill-radius для in-app поля — спутывается с CTA-кнопкой»

**Height:** `≥44pt` (iOS HIG). `sm 36` allowed only in dense lists / filters (`inputs (1).html:555`).

**States** (`inputs (1).html:91–116`):
- default — border `#334155`
- focused — border `2px #2563EB` + glow `0 0 0 4 rgba(37,99,235,0.15)`
- error — border `2px #EF4444` + helper red
- success — border `2px #22C55E`
- disabled — bg `#1E293B`, border `#1E293B`, text `#475569`

**Label:** Fira Sans `12/500 text-muted`, `8px` above input, `for` → id binding (`inputs (1).html:556`).

**Helper text → error:** same position, color change only (`inputs (1).html:557, 564`):

> «Антипаттерн: error без текста (только красная рамка) — пользователь не знает что исправлять»

**Required marker:** `*` in `#EF4444` after label (`inputs (1).html:558`).

**Phone KZ specific** (`inputs (1).html:139–162, 380`):
- Prefix `+7` on `bg #1E293B`, width 52px
- **Divider is a 1px `#334155` CSS line, NOT the `|` pipe character** (`inputs (1).html:566`):

  > «Антипаттерн: символ «|» как разделитель prefix — использовать CSS-токен `1px #334155`»

- Digits in Fira Code, `tabular-nums`

**OTP 6-digit specific** (`inputs (1).html:165–194`):
- Cells 48×48, `radius 12`, `gap 8`
- Empty placeholder is a dot `·`
- Error state = red border + **shake animation 400ms** (`inputs (1).html:186–194`)
- All filled digits are `text-default #F8FAFC`. Color changes only by state — never per-digit (`inputs (1).html:567`):

  > «Антипаттерн: раскраска filled OTP-цифр в разные цвета (оранжевая «1») — все цифры text-default #F8FAFC»

**Clear-icon (`x-circle`):** shown only when filled + focused (`inputs (1).html:560`).

**Autofill override:** `-webkit-autofill` → `bg-card` (`inputs (1).html:561`).

**Placeholder vs label** (`inputs (1).html:565`):

> «Антипаттерн: placeholder вместо label — при наборе подсказка исчезает, теряется контекст»

### 3.3 · KPI-row (3 cards)

**Structure** (`kpi-row (1).html:266–308`):
- Always **3 equal columns** (Выручка / Расходы / Баланс). All three have a border-left — not just some (`kpi-row (1).html:487, 525`).
- card: `bg #0F172A`, `border 1px #1E293B`, `border-left 4px semantic`, `radius 12`, `padding 14/16`, `gap 6`.

**Semantic colors by card** (`kpi-row (1).html:59–62, 536`):
- Revenue: `border-left 6px #2563EB` (thicker — primary KPI)
- Expenses: `border-left 4px #94A3B8` (neutral muted) — **never red** (`kpi-row (1).html:515`): «Не делать «Расходы» красными — это нормальная метрика, не ошибка.»
- Balance: conditional — `≥0` → positive `#22C55E`, `<0` → danger `#EF4444`. Value color also flips red when negative (unique exception to the value-color rule below).

**Value color rule** (`kpi-row (1).html:494, 510`):

> «Value всегда text-default `#F8FAFC`. Цвет только у label / border-left / delta. **Исключение**: balance `<0` → `#EF4444`.»

So ONLY expenses (normal) and revenue keep `#F8FAFC`. Balance can flip. Nothing else.

**Delta mandatory** (`kpi-row (1).html:505`):

> «Delta обязательна — цифра без контекста «+/−% vs период» бесполезна.»

**Period mandatory** (`kpi-row (1).html:523`):

> «Не выводить KPI без period и без delta — цифра без контекста = слой слоп.»

**States** (`kpi-row (1).html:370–478`):
- loading: `pulse-val` shimmer on value + skeleton bars for label/period
- empty: border-left `#1E293B`, value `—`, muted colors
- error: border-left red + alert-triangle + «Повторить» CTA pill

**Interactivity:** hover box-shadow (shadow-md), active `scale(0.98)`, transition 120ms.

### 3.4 · Restaurant-card

**Structure** (3 rows):
1. Header — dot, brand-badge, name, sub-line, revenue, delta-pill, chevron
2. Progress bar with `ПЛАН` marker
3. Footer — «План X · Маржа Y» + status-text

**Card tokens** (`restaurant-card.html:764`):
- `bg #0F172A`, `border 1px #1E293B`, `border-left 4px semantic`, `radius 12`, `padding 16/18`

**Semantic sync is absolute** (see §1.11 and `restaurant-card.html:716`): dot + border-left + bar-fill + status-text = one color.

**Brand-badges mandatory** (`restaurant-card.html:722`):
- BNA: `bg rgba(37,99,235,0.15)`, border `rgba(37,99,235,0.30)`, text `#60A5FA` (accent-tint)
- DNA: `bg rgba(168,85,247,0.15)`, border `rgba(168,85,247,0.30)`, text `#C4B5FD` (violet-tint)
- Radius `full`, Fira Code `10/600` UPPERCASE

**Cuisine labels restricted** (`restaurant-card.html:744, 770`):

> «Cuisine «Пицца» не существует — только Burger (BNA) или Doner (DNA).»

**Plan marker:** 2px white vertical line with `box-shadow: 0 0 0 2px #0F172A` ring so it reads against any bar-fill color (`restaurant-card.html:192–199`).

**Period in sub-line mandatory:** «Алматы · Burger · 412 чеков · за 1–19 апр 2026» (`restaurant-card.html:726`).

**Offline state** (`restaurant-card.html:463–497`):
- border-left `#64748B`, dot muted, cursor default (not clickable), no chevron
- value `—`, delta-pill `wifi-off + offline`
- status: «Нет данных за 12 мин» with `alert-circle` icon

**Fictional brand names forbidden** — see §4.

### 3.5 · Hero-card

**Structure** (`hero-card.html:27–36`):
- `bg #0F172A`, `border 1px #1E293B`, `border-left 4px variant`, `radius 16` (larger than kpi-row), `padding 20/22`

**3 variants** (`hero-card.html:42, 467`):
- revenue — `border-left accent #2563EB`
- profit — `border-left positive #22C55E`, value `#22C55E`
- critical — `border-left danger #EF4444`, value `#EF4444`, `alert-triangle` in header

**Rows** (`hero-card.html:291–328`):
1. Label + period separator + source-badges (iiko, 1С)
2. KPI `Fira Code 36/600 tabular -1.5` + live-sync `pulse-dot`
3. Profit-meta (icon + label + value + delta-pill) OR expenses-meta

**Drill-down chevron** bottom-right in `#60A5FA` (`hero-card.html:169–175`).

**Hover:** `border-left-color` flips to a lighter variant + `shadow-md` (`hero-card.html:40–45`).

**Source-badges** light-inverse (bg `#F8FAFC`, text `#0F172A`) — see §3.7.

### 3.6 · Chart (bar)

**Card:** `bg #0F172A`, `border 1px #1E293B`, `radius 16`, `padding 20` (`chart (1).html:551`).
**Chart body:** `height 150`, bars `gap 6`, bar radius `4 (top-only)`, min-height `4`.

**Bar colors by context** (`chart (1).html:130–134, 553`):
- `above` (avg or more) — `#2563EB` (accent)
- `below` (below avg) — `#1D4ED8` (accent-dark)
- `active` (selected day) — `#60A5FA` (accent-light)
- `zero` — `#475569` (muted)
- `crit` (≤10% of avg) — `#EF4444` (danger)

**Y-axis:** 2 dashed grid lines (max, avg). Labels on right, `bg #0F172A` padded for legibility (`chart (1).html:75–95`).

**Active bar over-label:** amount `Fira Code 12/700 #60A5FA` + delta `Fira Code 10/600 semantic`. **Dashed connector 1px 35% opacity** from bar to x-label (`chart (1).html:164–173, 556`).

**X-labels 2 variants** (`chart (1).html:556`):
- A: `Fira Code 10/500 tabular DD.MM` — use on 14d+
- B: `Fira Sans 10/500 Пн + 8` — use on 7d (more readable on few bars)

**Default period:** `14д` (`chart (1).html:557`). Pick among `7д / 14д / 30д / 90д`.

**Hit-slop for bars** (`chart (1).html:117–123`): invisible tap-target `-8 top / -16 bottom / -4 horizontal` extending the bar column so tap-zone reaches 32pt even on thin bars.

**States:**
- loading — 14 skeleton bars + 14 skeleton labels, `pulse 1.4s staggered 0.1s` (`chart (1).html:558`)
- empty — Lucide `bar-chart-3` 32px `#475569` + «Сменить период» ghost CTA + «обновить» ghost-xs (`chart (1).html:559`)
- single — centered bar 48×80 `#60A5FA` + amount + caption (`chart (1).html:560`)
- critical — red bar + ₸0 + −100% over-label (`chart (1).html:561`)

### 3.7 · Chips / Badges — 4 roles

Four distinct semantic roles, never mix styles across them (`chips-badges.html:355–363`):

**1. Filter chip** (`chips-badges.html:54–88`) — clickable, changes filter/period:
- `h md 32 · pad 0/14 · radius full · gap 6`
- default: border `#334155`, text `#94A3B8`
- active: `bg #2563EB`, text `#FFFFFF`, no border
- pressed: `bg #1D4ED8`, text `#FFFFFF`, `scale(0.98)`
- focused: outline `2px #60A5FA` offset 2
- disabled: `bg #1E293B`, border same, text `#475569`
- hit-area ≥32pt
- removable variant includes `x-button` 16×16 (`chips-badges.html:82–88`)

**2. Status badge** (`chips-badges.html:91–125`) — non-interactive, shows object state:
- dot 8px + tinted bg 10% + border 30% + solid text (`chips-badges.html:370`)
- variants: pos (`#22C55E`) / neg (`#EF4444`) / warn (`#F59E0B`) / neut (`#94A3B8`)
- **live variant** — pulse animation 1.4s `ease-out infinite`

**3. Source badge** (`chips-badges.html:128–146, 371`) — data attribution (iiko, 1С):
- Solid light (primary): `bg #F8FAFC`, text `#0F172A`
- Outline (secondary/tooltip): transparent bg, border `#334155`, text `#94A3B8`
- `h 22 · pad 0/9 · radius full · Fira Code 10/600 UPPERCASE`

**4. Metric badge** (`chips-badges.html:148–161, 372`) — delta/percentage attached to KPI:
- pos: `bg rgba(34,197,94,0.15)`, text `#22C55E`
- neg: `bg rgba(239,68,68,0.15)`, text `#EF4444`
- neutral: `bg #1E293B`, text `#94A3B8`, no icon
- `h 22 · pad 0/8 · radius full`
- **Any positive (even +0.5%) is green. Any negative is red.** No orange-for-small-positive (`chips-badges.html:318, colors-status.html:498`).

**Antipatterns** (`chips-badges.html:361–362`):
- Filter-style (solid accent) for status — user will think it's clickable
- Status-dot without text — color meaning not discoverable

**Sizes:**
| Size | h | pad-x | font | icon |
|---|---|---|---|---|
| sm | 24 | 10 | 11/600 | 12 |
| md | 32 | 14 | 12/600 | 14 — **default** |
| lg | 40 | 18 | 14/600 | 16 |

### 3.8 · Colors — rules specific to each palette file

**colors-core:** see §1.4 (accent=blue), §1.5 (semantic set), §1.6 (tints), §1.13 (bg), §1.14 (borders).

**colors-text:** see §1.3. Key addition from `colors-text.html:458–482` — **«типографика ≠ цвет»** (`colors-text.html:407`): same text-muted color is used across body, caption, label, timestamp; what differs is type-scale (size/weight/transform). They are two independent axes.

**colors-status:** see §1.5 + thresholds in §2. Names are semantic, not color-based (`colors-status.html:550`): use `positive / warning / danger / info`, not `green / yellow / red / blue`.

**colors-categories** (`colors-categories.html`) — 12 DDS category colors, chosen to avoid overlap with positive `#22C55E` / danger `#EF4444` / warning `#F59E0B` / accent `#2563EB` (`colors-categories.html:173, 311–313`):

| Category | Code | Hex | Contrast text |
|---|---|---|---|
| Продукты | FOOD | `#8B5CF6` | white |
| Аренда | RENT | `#1E40AF` | white |
| Зарплата | SALARY | `#A855F7` | white |
| Коммуналка | UTILITIES | `#CA8A04` | dark `#0F172A` |
| Маркетинг | MARKETING | `#EC4899` | white |
| IT · связь | IT | `#06B6D4` | dark |
| Транспорт | TRANSPORT | `#0D9488` | white |
| Оборудование | EQUIPMENT | `#78716C` | white |
| Налоги | TAXES | `#B91C1C` | white (darker than danger) |
| Охрана | SECURITY | `#475569` | white |
| Обучение | TRAINING | `#84CC16` | dark (lime ≠ positive green) |
| Прочие | OTHER | `#64748B` | white |

5 application formats per category color (`colors-categories.html:349–401`):
- Solid badge — TOP-3 emphasis
- Tinted badge — **default for filter chips** (list, selector)
- Dot + label — inline in lists
- Bar fill — distribution charts (% by category)
- Left-accent card — drill-down rows

10-color mobile alt available (Охрана + Обучение → «Прочие» on 375px screens).

> **Heads-up for mobile-agent:** `icons-lucide.html:352` has `Продукты` at `#F97316` (orange), while `colors-categories.html:183` has it at `#8B5CF6` (violet). The categories file is the source of truth; icons-lucide is stale on these 4 colors. Same drift on Налоги / Охрана / IT — trust colors-categories.

### 3.9 · Typography — additional rules

Only one `screen-title` per screen (`type-headings (1).html:591, 602`). Multiple h1 acceptable but rare.

Color hierarchy mapping (`type-headings (1).html:594`):
- screen-title → `text-default`
- subheading → `text-muted`
- category-label (pseudo-eyebrow) → `text-tertiary`

**Typography × color is two axes** (`colors-text.html:406–409`): the same `text-muted` color can serve body, caption, label, and timestamp — what distinguishes them is typography (size/weight/transform).

### 3.10 · Spacing — see §1.1

### 3.11 · Radii — see §1.2

### 3.12 · Shadows — see §1.12

---

## 4 · KEX GROUP brand rules

### 4.1 · Exactly 2 brands

- **BNA** — Burger na Abaya (TOO) — 8 locations
- **DNA** — Doner na Abaya (TOO "A Doner") — 5 locations

Source: `00-BRIEF.md:66–72`, `restaurant-card.html:325, 740`.

### 4.2 · Cuisine is `Burger` or `Doner` only

No other values acceptable (`restaurant-card.html:744, 770`):

> «Cuisine "Пицца" не существует — только Burger (BNA) или Doner (DNA).»

### 4.3 · Forbidden fictional names

From `restaurant-card.html:740, 775`, confirmed in `00-BRIEF.md:71`:
- «Kex Burgers» ✗
- «Kex Pizza» ✗
- «AliPush» ✗
- «fast food» as cuisine ✗

### 4.4 · Sample point names (fictional but realistic)

Used across prototypes as placeholder data — safe to use in mocks:
- **Dostyk Plaza** (Алматы, BNA) — `restaurant-card.html:345`
- **Mega Almaty** (Алматы, BNA) — `restaurant-card.html:388`
- **Esentai Mall** (Алматы, BNA) — `restaurant-card.html:549`
- **Khan Shatyr** (Астана, BNA) — `restaurant-card.html:582`
- **Keruen** (Астана, BNA) — `restaurant-card.html:471`
- **Aport** (Алматы, DNA) — `restaurant-card.html:614`
- **Asia Park** (Алматы, DNA) — `restaurant-card.html:428`
- **Mega Silk Way** (Астана, DNA) — `restaurant-card.html:648`

### 4.5 · Period formatting

Period strings use Cyrillic abbreviations: «1–19 апр 2026», «Апрель 2026», «01.04 – 19.04» (`hero-card.html:299`, `restaurant-card.html:346`). Use `Fira Code` for ISO-like dates, `Fira Sans` for Russian month names. `tabular-nums` on date ranges.

### 4.6 · Currency

Symbol `₸` (Kazakhstani tenge). Space after: `₸8.24М`, `₸2 420 000`. Million marker `М` Cyrillic. Always `tabular-nums` on amounts.

---

## 5 · Adaptive / mobile-specific rules

### 5.1 · Touch targets

- **iOS HIG — min 44pt** (`spacing (2).html:743`, `buttons (1).html:597`)
- **Android Material — min 48dp** (`spacing (2).html:744`)
- Mobile tap-zones for critical actions (delete, exit): `min radius 8 + padding 12` around the element (`spacing (2).html:745`)

Button sizes `lg (52)` and `md (44)` meet iOS natively; `sm (36)` needs `+12pt hit-slop`; `xs (28)` needs `+20pt hit-slop`; `icon-only` is strict 44×44.

### 5.2 · iOS Dynamic Type

All headings must respect user font-scale via `useFontScaling` (`type-body (2).html:477`, `type-headings (1).html:613`). Min body size = 14px (at 1.5× zoom → 21px, still readable).

### 5.3 · Android sp vs dp

Use `sp` (scale-independent pixels) for text; test at 200% scale (`type-body (2).html:478`).

### 5.4 · React Native theme access

Never hardcode hex values in components (`buttons (1).html:610`, `inputs (1).html:573`):

> «Не копировать хексы в компонент — только через `useTheme()`. Это даёт бесплатный light-mode switch + A/B смены акцента.»

Use `theme.colors.accent`, `theme.text.default`, etc.

### 5.5 · RN shadow/elevation platform split

`shadows (1).html:800`:
- iOS: `shadowColor / shadowOpacity / shadowRadius / shadowOffset`
- Android: `elevation` prop (not shadow props)

iOS should prefer `blur / vibrancy` (SwiftUI material effects) for modals; Android uses distinct shadows per Material 3 elevation.

Web modals: `backdrop-filter: blur(8px)` with `rgba(0,0,0,0.6)` solid-overlay fallback.

### 5.6 · Responsive text

- `screen-title` longer than 280px → `text-overflow: ellipsis` + tooltip (`type-headings (1).html:614`)
- Viewport < 375px: screen-title `26 → 24`, h1 `22 → 20` (optional tune-down) (`type-headings (1).html:615`)

### 5.7 · RN line-height

Use number `lineHeight: 32`, never string `'1.23'` (`type-headings (1).html:616`).

### 5.8 · Chips on small heights

`h 20–24` (dense) → prefer `radius full` over `12` — on small heights 12px looks square (`radii (1).html:644`).

### 5.9 · Dense list rows

`height < 44` → `radius 0` or `sm 4`. Form inherits from container, not from UI radius tokens (`radii (1).html:645`).

### 5.10 · Font loading (bunny.net CDN)

`type-families (1).html:608–615`:
- `bunny.net` or self-host via `@fontsource/fira-sans` + `@fontsource/fira-code`
- preload critical, `font-display: swap`
- fallback sans: `'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- fallback mono: `'Fira Code', 'SF Mono', Monaco, Consolas, monospace`
- subsets: latin + cyrillic + cyrillic-ext (Kazakh)
- total weight ≈ 180 KB gzip (4 weights × 2 families × 2 subsets)

### 5.11 · Phone input RN packages

`inputs (1).html:573`:
- `react-native-international-phone-number` — recommended (matches MEMORY.md preference)
- alternative: `react-native-mask-text`
- OTP: `react-native-confirmation-code-field`

### 5.12 · Kazakh extended glyphs

9 glyphs must render: `Ә ә · Ғ ғ · Қ қ · Ң ң · Ө ө · Ұ ұ · Ү ү · Һ һ · І і` (`type-families (1).html:422–426`). Fira Sans and Fira Code v6.2+ both cover these.

---

## 6 · Antipattern cheat-sheet

A consolidated forbidden-list. Every line maps to a rule above — this section is the single place a dev can scan before code review.

### Typography
- ✗ Fira Code for headings (H1–H4, screen-title) — all on Fira Sans (`type-headings (1).html:597`)
- ✗ Mixing Fira Sans + Fira Code in the same numeric string (`type-families (1).html:594`)
- ✗ Proportional-nums on Fira Code — breaks tabular (`type-families (1).html:595`)
- ✗ Font weights 100–300 or 800–900 — only 400/500/600/700 (`type-families (1).html:596`)
- ✗ Loading all 18 Fira Code weights — only 4 (`type-families (1).html:597`)
- ✗ Body-sm 13 for primary body text — only secondary/helper (`type-body (2).html:425`)
- ✗ Label in lowercase — UPPERCASE always (`type-body (2).html:429`)
- ✗ letter-spacing ≥ 0.3 on body — illegible (`type-body (2).html:432`)
- ✗ Scaled-up samples (14px token shown at 28px) (`type-body (2).html:437`)
- ✗ Positive letter-spacing on body sizes (`type-headings (1).html:601`)
- ✗ Line-height not multiple of 4 (e.g. 38) (`type-headings (1).html:600`)
- ✗ Multiple `screen-title` on one screen (`type-headings (1).html:602`)
- ✗ Heading levels outside the scale (e.g. 20/650 weight) (`type-headings (1).html:599`)

### Colors
- ✗ Accent = green — accent is BLUE `#2563EB`, positive is GREEN `#22C55E` (`type-headings (1).html:598`)
- ✗ `opacity` for text hierarchy — always solid hex tokens (`colors-text.html:494`)
- ✗ `text-disabled #475569` for content — decoration only (`colors-text.html:473`)
- ✗ `text-link` on non-clickable text (`colors-text.html:490`)
- ✗ `text-disabled` for timestamps — use `text-muted` or `text-tertiary` (`colors-text.html:486`)
- ✗ `text-tertiary` on `bg-elev` — fails AA (3.7:1) (`colors-text.html:438`)
- ✗ Positive metric (+0.5%) shown in warning orange — any + is green (`colors-status.html:498`)
- ✗ `info`-tint adjacent to accent-CTA without visual separation (`colors-status.html:500`)
- ✗ Hardcoded `#2563EB` in components — use `theme.colors.accent` (`buttons (1).html:610`)
- ✗ `accent-dark #1D4ED8` for text — surface-only (4.2:1 fails AA) (`colors-core (1).html:223`)
- ✗ `positive-dark #16A34A` for text — surface-only (3.9:1) (`colors-core (1).html:260`)

### Spacing & Radii
- ✗ Values outside 4px-grid: `5`, `7`, `10`, `13`, `14`, `18` (`spacing (2).html:781`)
- ✗ Mixing `gap 8` + `gap 12` at same hierarchy level (`spacing (2).html:785`)
- ✗ `padding: 0` on interactive — tap-fail (`spacing (2).html:789`)
- ✗ `gap > 24` between tightly-related items (`spacing (2).html:793`)
- ✗ Mixing `gap` and `margin` for the same effect (`spacing (2).html:797`)
- ✗ Radii outside scale: `5`, `7`, `10`, `11`, `14` (`radii (1).html:614`)
- ✗ Pill on form-input — confuses with CTA (`radii (1).html:619`)
- ✗ Mixed-corner radius without function reason (`radii (1).html:622`)
- ✗ `sm · 4` radius on buttons — squared-ugly on touch-targets (`radii (1).html:626`)
- ✗ `2xl · 20` radius without clear reason — infantile feel (`radii (1).html:630`)
- ✗ Inner radius ≥ parent radius — breaks nesting (`radii (1).html:608`)

### Shadows & Elevation
- ✗ White/light shadows on dark UI (`shadows (1).html:770`)
- ✗ Shadow without bg-elevation change — depth invisible (`shadows (1).html:773`)
- ✗ Mixing `glow` with `elevation` levels — they are separate layers (`shadows (1).html:776`)
- ✗ Shadow above `elev-4` on cards — feels floaty (`shadows (1).html:780`)
- ✗ Same shadow on all cards — kills primary/secondary hierarchy (`shadows (1).html:784`)
- ✗ Modal without backdrop — floats in space (`shadows (1).html:751`)

### Button
- ✗ Pill-radius in card — confuses with CTA (`buttons (1).html:241`)
- ✗ Rounded-12 on login full-width (`buttons (1).html:241`)
- ✗ `opacity` for disabled — use explicit tokens (`buttons (1).html:600`)
- ✗ Destructive as primary action of screen — always via confirm-dialog (`buttons (1).html:604`)
- ✗ Ghost loading without `bg #1E293B` — invisible on OLED (`buttons (1).html:602`)
- ✗ Icon-only without `aria-label` (`buttons (1).html:583`)

### Input
- ✗ Pill-radius on input — mistaken for CTA (`inputs (1).html:563`)
- ✗ Error without helper text (just red border) (`inputs (1).html:564`)
- ✗ Placeholder replacing label — hint disappears while typing (`inputs (1).html:565`)
- ✗ `|` pipe character as phone-prefix separator — use `1px #334155` CSS line (`inputs (1).html:566`)
- ✗ Coloring filled OTP digits (orange «1») — all digits `text-default` (`inputs (1).html:567`)

### KPI-row
- ✗ Coloring `value` by semantic — only label / border / delta (exception: balance <0) (`kpi-row (1).html:510`)
- ✗ Расходы = red — it's a normal metric, not an error (`kpi-row (1).html:515`)
- ✗ Balance with static color — must be conditional on sign (`kpi-row (1).html:519`)
- ✗ KPI without period or delta — context-less number (`kpi-row (1).html:523`)
- ✗ Different card structure within one row (border-left on some only) (`kpi-row (1).html:527`)

### Restaurant-card
- ✗ Fictional brands «Kex Burgers», «Kex Pizza», «fast food» (`restaurant-card.html:740`)
- ✗ Cuisine «Пицца» — only Burger or Doner (`restaurant-card.html:744`)
- ✗ Semantic mismatch: orange dot on +10% card (`restaurant-card.html:747`)
- ✗ Orange color on performance > 0 — warning ≠ success (`restaurant-card.html:751`)
- ✗ Card without period or delta (`restaurant-card.html:755`)

### Chips / Badges
- ✗ Filter-style (solid accent) on status badges — user thinks it's clickable (`chips-badges.html:361`)
- ✗ Status-dot without text — color meaning not discoverable (`chips-badges.html:362`)

### Icons
- ✗ Emoji as icons — platform-inconsistent, uncoloring impossible (`icons-lucide.html:564`)
- ✗ Mixing icon libraries (Lucide + Heroicons) — stroke/metric desync (`icons-lucide.html:567`)
- ✗ UI-icons in category colors — chevron-right `#F97316` reads as «Продукты category» (`icons-lucide.html:571`)
- ✗ `import * as Lucide` — breaks tree-shaking (`icons-lucide.html:579`)
- ✗ Arbitrary icon sizes — only `12/14/16/20/24/32` (`icons-lucide.html:559`)

---

## 7 · Integration rules (cross-file consistency)

These are invariants that must hold once you combine tokens — each is a reconciliation the prototypes explicitly worked out:

### 7.1 · radii.html ↔ buttons.html

Button radius is `lg · 12` (rounded) or `full · 9999` (pill). **Not `md · 8`** (`radii (1).html:663`):

> «Исправлено: было ~~md · 8 · buttons~~ → buttons теперь lg · 12 (as actually built).»

### 7.2 · shadows.html ↔ kpi-row.html ↔ restaurant-card.html

Card `:hover` state uses `shadow-md` (`0 6px 16px -6px rgba(0,0,0,0.5)`), **not an elevation bump** (`shadows (1).html:810, 819`). Lift comes from shadow strength at the same elevation level.

Also: all three card files transition at `120ms ease` for shadow/transform, not `150ms`.

### 7.3 · colors-text.html ↔ type-headings.html ↔ type-body.html

Five-level text hierarchy `default / secondary / muted / tertiary / disabled` is the shared axis. Typography tokens reference these colors but do not own them. `text-secondary #CBD5E1` was added specifically because `type-body` needed a color between `default` and `muted` for `body-sm` default (`type-body (2).html:508`).

### 7.4 · icons-lucide.html ↔ colors-categories.html

Icons file MUST pull category colors from `colors-categories.html`, not define its own. Current drift (4 colors) is a known bug — `colors-categories.html` is the source of truth.

### 7.5 · type-families ↔ type-headings ↔ type-body

Headings are always Fira Sans (`type-headings` explicit fix for a previous regression — `type-headings (1).html:643`). Only `display-numeric` token uses Fira Code, and only for the KPI hero value.

### 7.6 · spacing ↔ radii → «paired tokens»

`spacing (2).html:767`:

> «Парь с radii: card padding `16` + radius `12` (оба в lg-области). Consistency на уровне токенов.»

Match the tier: `md` padding with `lg` radius reads as a coherent card; `xs` padding with `xl` radius reads as mismatched.

### 7.7 · hero-card ↔ kpi-row — border-left widths are different

Hero = 4px default (6px on revenue-hero positive variant), kpi-row revenue = **6px** (`kpi-row (1).html:59`). Don't unify these — the distinction visually stacks the hero above the row.

### 7.8 · All cards share interaction contract

hero-card / kpi-row / restaurant-card all implement:
- `:hover` → `shadow-md` + (optionally) `border-left-color` lightens
- `:active` → `transform: scale(0.98)` (kpi-row) or `0.99` (restaurant-card)
- `transition: 120ms ease` on shadow/transform
- Loading state → neutral `border-left: #1E293B`, cursor default
- Empty/error state → muted or danger border-left accordingly, not interactive

### 7.9 · Semantic chips reuse status semantics across all files

Positive tint `rgba(34,197,94,0.15)` with border `rgba(34,197,94,0.30)` and text `#22C55E` is the same recipe in `colors-core`, `colors-status`, `chips-badges`, `kpi-row`, `restaurant-card`, `hero-card`. Never invent a different ratio for the same semantic.

### 7.10 · Period / delta / source triad

Whenever a KPI is shown, three things are always near it (`kpi-row (1).html:523`, `restaurant-card.html:726`, `hero-card.html:291`):
- **period** — «1–19 апр 2026» in Fira Sans muted
- **delta** — «+12.3%» metric badge
- **source** — iiko / 1С badges (hero-card header; optional in kpi-row)

Missing any of them is the documented «слой слоп» (context-less number) antipattern.

---

**End of rules.** Implementation order for Wave 2: tokens (`theme/*`) → package.json fonts → App.tsx font load → Wave 3 component sync.
