Redesign the Login screen for a restaurant holding executive dashboard app called "HoldingView".

Context: Users are restaurant directors and owners — not tech-savvy. They open this app when they need a quick status check. The login must feel instant and trustworthy.

BACKGROUND:
- Full screen dark: radial-gradient(ellipse at 30% 0%, #1E1040 0%, #0A0812 65%)
- Two blurred ambient circles: purple top-right (280px, blur:90px, opacity:0.25), pink bottom-left (180px, blur:70px, opacity:0.15), pointer-events none, position absolute

LOGO BLOCK (top center, marginTop: 72px):
- 56px rounded square (radius 16px) with gradient background linear-gradient(135deg, #7C3AED, #4338CA)
- Bold white letter "H" inside, fontSize 26px
- Below: app name "HoldingView" in 20px bold white, letterSpacing -0.03em
- Below: tagline "Весь холдинг — одним взглядом" in 13px rgba(255,255,255,0.4)

PHONE INPUT (marginTop 48px):
- Label: "Номер телефона" 12px uppercase muted
- Input: +7 prefix in muted color inside input, background rgba(255,255,255,0.06), border 1px solid rgba(255,255,255,0.08), borderRadius 14px, padding 16px, white text fontSize 16px
- On focus: border becomes rgba(124,58,237,0.7), subtle box-shadow 0 0 0 3px rgba(124,58,237,0.12)

SMS CODE INPUT (hidden initially, appears after phone submit):
- Label: "Код из SMS"
- 4 separate digit boxes, each 56px wide, gap 8px, same dark style
- Auto-advance on each digit entry

SUBMIT BUTTON:
- Full width, background: linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)
- borderRadius 14px, padding 16px, fontSize 15px fontWeight 700 white
- boxShadow: 0 8px 32px rgba(124,58,237,0.35)
- Loading state: spinner icon, opacity 0.7, text "Отправляем код..."

BOTTOM NOTE:
- "Вход только для авторизованных сотрудников" 11px rgba(255,255,255,0.2) centered

🏠 Dashboard.tsx — Главный экран: сводка по холдингу
Completely redesign the Dashboard as the main executive overview screen. This is what a restaurant director sees first — must show the health of ALL restaurants at a glance.

CONTEXT: Data comes from iiko (sales) and 1C (finances, bank balances). Show combined metrics clearly.

BACKGROUND: #0A0812 full screen dark

HEADER (paddingTop 52px, paddingHorizontal 20px):
- Left: greeting "Доброе утро 👋" 13px rgba(255,255,255,0.4), below it bold "Kex Group" 22px white letterSpacing -0.03em
- Right: notification bell icon (lucide BellRing), 22px, muted color, with a small red dot badge if there are alerts

HOLDING SUMMARY CARD (marginTop 16px, full width):
- Background: linear-gradient(135deg, #7C3AED 0%, #3730A3 100%)
- borderRadius 20px, padding 22px
- Top row: label "Выручка сегодня" 11px white/60%, right side: source tags "iiko" and "1С" as tiny pills rgba(255,255,255,0.15) white text 10px
- Big number: "₸ 8 240 000" 38px JetBrains Mono fontWeight 600 white, letterSpacing -0.04em
- Below number: "↑ 12.4% к плану" in #4ADE80 small, and "↓ Расходы: ₸5.1M" in rgba(255,255,255,0.6) small — on same line
- Mini sparkline at bottom (recharts AreaChart no axes no grid, white stroke 1.5px, white fill opacity 0.15, height 52px, last 7 days data)

RESTAURANT STATUS LIST (marginTop 20px):
- Section title: "Рестораны" 14px fontWeight 600 white, right side: "5 точек" muted small
- Each restaurant row is a CARD (background #130E24, border 1px solid rgba(255,255,255,0.06), borderRadius 16px, padding 16px, marginBottom 8px):
  - LEFT: Status indicator circle 10px — GREEN (#10B981) if revenue >= plan, RED (#EF4444) if below plan, YELLOW (#F59E0B) if within 10% below
  - Restaurant name bold 14px white, below it city + format small muted
  - CENTER: revenue today mono 14px white
  - RIGHT: plan deviation badge — green "+8%" or red "-15%" with colored background pill, chevron icon
  - Below the main row: thin progress bar (height 3px, background rgba(255,255,255,0.06)), fill shows % of daily plan reached, color matches status indicator
- Make the RED restaurant card have a slightly brighter border rgba(239,68,68,0.25) to draw attention

BANK BALANCE ROW (marginTop 8px):
- Label "Остатки на счетах (1С)" 11px uppercase muted
- Two side-by-side mini cards (background #130E24, borderRadius 12px, padding 12px 14px):
  - Card 1: bank name "Kaspi Bank", balance "₸2 400 000" mono white, "Обновлено 10 мин" muted tiny
  - Card 2: bank name "Halyk Bank", balance "₸890 000" mono white, same update time

🍽️ PointDetails.tsx — Детали ресторана (по тапу на красный)
Redesign PointDetails as a drill-down screen when director taps on a restaurant with a problem. This is the most important screen — must answer: "What's wrong here?"

BACKGROUND: #0A0812

HEADER:
- Back button (ChevronLeft lucide) left, restaurant name center bold white, status badge right (🔴 "Проблема" red pill OR 🟢 "ОК" green pill)

STATUS BANNER (if restaurant is below plan):
- Full width card, background rgba(239,68,68,0.12), border 1px solid rgba(239,68,68,0.25), borderRadius 16px, padding 16px
- Red warning icon (AlertTriangle lucide) left
- Text: "Выручка ниже плана на 15%" bold 14px in #F87171
- Subtext: "Ожидалось ₸1 200 000 · Факт ₸1 020 000" muted 12px

METRICS GRID (2x2, gap 10px, marginTop 12px):
- Each card: background #130E24, borderRadius 16px, padding 16px, border rgba(255,255,255,0.06)
- Card 1 (purple gradient bg): "Выручка" label, "₸1 020 000" large mono, "iiko" source tag top-right tiny
- Card 2: "Расходы" label, "₸680 000" large mono, "1С" source tag
- Card 3: "Прибыль" label, "₸340 000" large mono in #10B981
- Card 4: "Кол-во чеков" label, "248" large mono, "iiko" source tag

HOURLY REVENUE CHART:
- Title "Выручка по часам" left, "Сегодня" right muted
- BarChart recharts height 140px, bars purple (#7C3AED), bar radius [3,3,0,0]
- X axis: hours "10:00 12:00 14:00 16:00 18:00 20:00", no Y axis
- Reference line: dashed white opacity 0.3, label "план" — showing expected hourly revenue

EXPENSES BREAKDOWN (1С data):
- Title "Расходы (из 1С)"
- Simple list: each row has category name, amount right in red mono, percentage bar behind it (background rgba(255,255,255,0.04), fill rgba(239,68,68,0.3), height 100% position absolute)

BANK BALANCE (1С data):
- Title "Счета"
- Card list same style as dashboard, showing bank name + balance + last sync time

📊 Reports.tsx — Аналитика по периодам
Redesign Reports as an executive analytics screen with period comparison. Directors use this for weekly/monthly reviews.

BACKGROUND: #0A0812

HEADER: "Аналитика" 26px bold white

PERIOD SELECTOR:
- Pill toggle: "День / Неделя / Месяц / Квартал"
- Active pill: gradient purple background, white text bold
- Inactive: rgba(255,255,255,0.06) background, muted text
- Full width row with equal-width pills

KPI SUMMARY ROW (horizontal scroll, 3 cards):
- Each card 160px wide, background #130E24, borderRadius 16px, padding 16px
- Card 1 (has purple gradient): "Выручка" ₸29.8M, "↑ 18.4%" green
- Card 2: "Расходы" ₸18.4M, "↑ 11.2%" shown in muted (not red, because within acceptable range)
- Card 3: "Прибыль" ₸11.4M, "↑ 28.7%" green
- Source note below value: "iiko + 1С" in 10px muted

REVENUE VS PLAN CHART:
- Title "Факт vs План" left
- BarChart recharts height 160px
- Two bar groups per period: "Факт" purple (#7C3AED), "План" rgba(255,255,255,0.15) — so plan looks like a ghost/outline
- X axis: restaurant short names
- Tooltip: dark card style

RESTAURANT RANKING TABLE:
- Title "Рейтинг ресторанов"
- Each row: rank number in small circle, restaurant name, revenue amount mono, plan fulfillment % as colored text (green >100%, yellow 90-100%, red <90%)
- Sorted by revenue descending
- No borders between rows, just 1px rgba(255,255,255,0.04) dividers

EXPORT ROW:
- "Отправить отчёт" button: outline style border rgba(124,58,237,0.5), purple text, Send icon left
- "Скачать PDF" button: same style, Download icon left
- Side by side, equal width

📋 BottomNav.tsx
Redesign BottomNav for an executive restaurant dashboard app:

- Background: rgba(10,8,18,0.96), backdropFilter blur(20px)
- Top border: 1px solid rgba(255,255,255,0.05)
- Height: 68px
- 4 tabs only (remove Suppliers): Home "Главная", Store "Рестораны", BarChart3 "Аналитика", Bell "Уведомления"
- Active tab: icon color #7C3AED, label 10px #7C3AED fontWeight 600, small 4px circle dot below label in #7C3AED
- Inactive tab: icon rgba(255,255,255,0.25) strokeWidth 1.5, label rgba(255,255,255,0.25) 10px
- If Уведомления has unread alerts: show small red dot badge on top-right of Bell icon
- Tab change has subtle scale transform: active icon scales 1.1

🎨 globals.css — Design system
Replace globals.css with a design system for a B2B executive restaurant analytics app:

FONTS (Google Fonts import):
- 'Plus Jakarta Sans' weights 400,500,600,700 — for all UI text
- 'JetBrains Mono' weights 400,500 — for all numbers, amounts, percentages

CSS VARIABLES:
--bg-base: #0A0812
--bg-surface: #130E24
--bg-elevated: #1A1433
--bg-hover: #201848

--border-subtle: rgba(255,255,255,0.05)
--border-default: rgba(255,255,255,0.08)
--border-strong: rgba(255,255,255,0.14)

--text-primary: #F4F3FF
--text-secondary: rgba(255,255,255,0.45)
--text-muted: rgba(255,255,255,0.22)

--accent: #7C3AED
--accent-gradient: linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)
--accent-dim: rgba(124,58,237,0.12)
--accent-glow: rgba(124,58,237,0.25)

--status-green: #10B981
--status-yellow: #F59E0B
--status-red: #EF4444
--status-green-dim: rgba(16,185,129,0.10)
--status-yellow-dim: rgba(245,158,11,0.10)
--status-red-dim: rgba(239,68,68,0.10)

--positive: #10B981
--negative: #F87171

--font-ui: 'Plus Jakarta Sans', sans-serif
--font-mono: 'JetBrains Mono', monospace
--nav-h: 68px
--page-px: 20px
--radius-card: 16px

GLOBAL STYLES:
- * box-sizing border-box, no default margin/padding
- body: background var(--bg-base), color var(--text-primary), font-family var(--font-ui), -webkit-font-smoothing antialiased
- ::-webkit-scrollbar width 0 (hide scrollbars)
- .mono { font-family: var(--font-mono); letter-spacing: -0.03em; }
- .card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-card); }
- @keyframes fadeUp { from: opacity 0, translateY 10px; to: opacity 1, translateY 0 }
- .fade-up { animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
- .fade-up-1 through .fade-up-5 with animation-delay 0.05s increments

Применяй по одному, начни с globals.css — он задаёт всю систему. Потом Dashboard, потом остальные.я хочу цвета изменить какой то синий с цвет или поджонбый05:47Вот несколько вариантов на выбор:Выбери вариант выше — и я сразу дам готовый промпт для globals.css и все остальные промпты с обновлёнными цветами, которые просто вставишь в Figma Make.Q: Какой стиль синего тебе ближе?
A: Navy Premium — тёмно-синий (#0D1B2E) + акцент #3B82F6 (классик)05:48Вот все промпты с Navy Premium палитрой — копируй по одному в Figma Make:

1. globals.css — вставляй первым
Replace the entire globals.css with a new Navy Premium design system:

FONTS (Google Fonts import at top):
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

CSS VARIABLES:
--bg-base: #060E1A
--bg-surface: #0D1B2E
--bg-elevated: #112338
--bg-hover: #162C44

--border-subtle: rgba(59,130,246,0.08)
--border-default: rgba(59,130,246,0.14)
--border-strong: rgba(59,130,246,0.28)

--text-primary: #EFF6FF
--text-secondary: rgba(239,246,255,0.50)
--text-muted: rgba(239,246,255,0.25)

--accent: #3B82F6
--accent-gradient: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)
--accent-dim: rgba(59,130,246,0.12)
--accent-glow: rgba(59,130,246,0.22)

--status-green: #10B981
--status-yellow: #F59E0B
--status-red: #EF4444
--status-green-dim: rgba(16,185,129,0.10)
--status-yellow-dim: rgba(245,158,11,0.10)
--status-red-dim: rgba(239,68,68,0.10)

--positive: #10B981
--negative: #F87171

--font-ui: 'Plus Jakarta Sans', sans-serif
--font-mono: 'JetBrains Mono', monospace
--nav-h: 68px
--page-px: 20px
--radius-card: 16px

GLOBAL STYLES:
- * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
- body { background: var(--bg-base); color: var(--text-primary); font-family: var(--font-ui); -webkit-font-smoothing: antialiased; }
- ::-webkit-scrollbar { width: 0; }
- .mono { font-family: var(--font-mono); letter-spacing: -0.03em; }
- .card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-card); }
- @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
- .fade-up { animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
- .fade-up-1 { animation-delay: 0.05s; }
- .fade-up-2 { animation-delay: 0.10s; }
- .fade-up-3 { animation-delay: 0.15s; }
- .fade-up-4 { animation-delay: 0.20s; }
- .fade-up-5 { animation-delay: 0.25s; }

2. Login.tsx
Redesign Login.tsx with Navy Premium color scheme for a restaurant holding executive app "HoldingView".

BACKGROUND:
- radial-gradient(ellipse at 25% 0%, #0F2347 0%, #060E1A 65%)
- Two ambient blurred circles: blue top-right 280px blur:90px rgba(59,130,246,0.15), cyan bottom-left 180px blur:70px rgba(16,185,129,0.08) — position absolute pointer-events none

LOGO (top, marginTop 72px, centered or left):
- 52px rounded square radius:14px, background: linear-gradient(135deg, #2563EB, #1D4ED8)
- Bold white "H" inside fontSize 24px
- Below: "HoldingView" 20px bold #EFF6FF letterSpacing -0.03em
- Below: "Весь холдинг — одним взглядом" 13px rgba(239,246,255,0.35)

PHONE INPUT (marginTop 52px):
- Label "Номер телефона" 11px uppercase rgba(239,246,255,0.4) letterSpacing 0.06em marginBottom 6px
- Input: background rgba(59,130,246,0.06), border 1px solid rgba(59,130,246,0.14), borderRadius 14px, padding 16px, color #EFF6FF fontSize 15px, fontFamily Plus Jakarta Sans
- Placeholder "+7 (___) ___-__-__" rgba(239,246,255,0.25)
- On focus: border rgba(59,130,246,0.6), boxShadow 0 0 0 3px rgba(59,130,246,0.10)

SUBMIT BUTTON:
- Full width, background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)
- borderRadius 14px, padding 16px, fontSize 15px fontWeight 700 color white
- boxShadow: 0 8px 28px rgba(37,99,235,0.35)
- Loading: text "Отправляем код...", opacity 0.7

BOTTOM NOTE:
- "Только для авторизованных сотрудников" 11px rgba(239,246,255,0.18) centered marginTop 32px

3. Dashboard.tsx
Redesign Dashboard.tsx as the main executive overview for a restaurant holding. Colors: Navy Premium scheme with --bg-base #060E1A, --accent #3B82F6, gradient linear-gradient(135deg, #2563EB, #1D4ED8).

BACKGROUND: var(--bg-base) #060E1A

AMBIENT GLOW (position absolute top -100px right -60px, 250px circle, background radial-gradient rgba(59,130,246,0.08), blur 80px, pointer-events none)

HEADER (paddingTop 52px, paddingHorizontal 20px):
- Left: "Доброе утро 👋" 12px var(--text-muted), below "Kex Group" 22px fontWeight 700 var(--text-primary) letterSpacing -0.03em
- Right: bell icon BellRing from lucide-react, 22px color var(--text-secondary), red dot badge 8px if alerts exist

HERO CARD (marginTop 16px, full width, borderRadius 20px, padding 22px):
- background: linear-gradient(135deg, #1E3A6E 0%, #1D4ED8 60%, #2563EB 100%)
- border: 1px solid rgba(59,130,246,0.3)
- Top row: label "Выручка сегодня" 11px rgba(255,255,255,0.6) uppercase, right side: "iiko" and "1С" as tiny pills background rgba(255,255,255,0.12) white text 10px borderRadius 4px padding 2px 6px
- Big amount: "₸ 8 240 000" 38px JetBrains Mono fontWeight 500 white letterSpacing -0.04em marginTop 6px
- Below: "↑ 12.4% к плану" color #10B981 fontSize 12px, gap 12px, "Расходы: ₸5.1M" rgba(255,255,255,0.55) fontSize 12px — same row
- Sparkline at bottom: recharts AreaChart height 56px no axes no grid, white stroke 1.5px, white fill opacity 0.12, last 7 days dummy data, marginTop 14px

STATUS LIST SECTION (marginTop 20px):
- Row: "Рестораны" 13px fontWeight 600 var(--text-primary), right "5 точек" var(--text-muted) 12px

Each restaurant card (background var(--bg-surface) #0D1B2E, border 1px solid var(--border-subtle), borderRadius 16px, padding 16px, marginBottom 8px):
- LEFT: status dot 10px circle — #10B981 green if ok, #EF4444 red if problem, #F59E0B yellow if warning
- Restaurant name 14px fontWeight 600 var(--text-primary), below: city + type 11px var(--text-muted)
- RIGHT: revenue "₸2.4M" JetBrains Mono 14px var(--text-primary), below: deviation badge "+8%" green pill or "-15%" red pill fontSize 11px padding 2px 8px borderRadius 20px
- BOTTOM: progress bar height 3px background rgba(59,130,246,0.08) fill #3B82F6 (or #EF4444 if red) borderRadius 2px showing % of daily plan — full width below the content
- RED restaurants get border: 1px solid rgba(239,68,68,0.22) to draw attention
- Chevron right icon 14px var(--text-muted) absolute right

BANK BALANCES (marginTop 4px):
- Label "Остатки на счетах · 1С" 11px uppercase var(--text-muted) marginBottom 8px
- Two cards side by side (flex gap 8px), each background var(--bg-surface) borderRadius 12px padding 12px:
  - Bank name 11px var(--text-muted), balance "₸2 400 000" JetBrains Mono 15px var(--text-primary) marginTop 2px, "10 мин назад" 10px var(--text-muted) marginTop 2px

4. PointDetails.tsx
Redesign PointDetails.tsx as a drill-down screen for a specific restaurant. Navy Premium: bg #060E1A, accent #3B82F6.

HEADER (paddingTop 52px paddingHorizontal 20px):
- Back button ChevronLeft 22px var(--text-secondary) left, restaurant name center 16px fontWeight 600, status pill right: "🔴 Проблема" red background rgba(239,68,68,0.12) color #EF4444 OR "🟢 Норма" green

ALERT BANNER (show only if status is red, marginTop 12px):
- background rgba(239,68,68,0.08), border 1px solid rgba(239,68,68,0.20), borderRadius 14px, padding 14px 16px
- Left: AlertTriangle lucide 16px #EF4444
- Text: "Выручка ниже плана на 15%" fontWeight 600 14px #F87171
- Subtext: "Ожидалось ₸1 200 000 · Факт ₸1 020 000" 12px var(--text-secondary)

METRICS GRID 2x2 (gap 10px marginTop 12px):
- Card 1: background linear-gradient(135deg,#1E3A6E,#2563EB) borderRadius 16px padding 16px — label "Выручка" 11px uppercase white/60%, value "₸1 020 000" JetBrains Mono 20px white, source tag "iiko" top-right tiny pill white/20%
- Card 2: var(--bg-surface) — "Расходы" ₸680 000 source "1С"
- Card 3: var(--bg-surface) — "Прибыль" ₸340 000 color #10B981
- Card 4: var(--bg-surface) — "Чеков" 248 source "iiko"

HOURLY CHART (marginTop 16px):
- Title "Выручка по часам" left, "Сегодня" right var(--text-muted)
- recharts BarChart height 140px, bars fill #3B82F6 radius [3,3,0,0], X axis hours no Y axis
- ReferenceLine dashed rgba(255,255,255,0.2) label "план" fontSize 10px

EXPENSES LIST (marginTop 16px):
- Title "Расходы · 1С" 13px fontWeight 600
- Each row: category left var(--text-secondary), amount right JetBrains Mono #F87171, thin divider between rows rgba(59,130,246,0.06)
- Background bar behind each row: position absolute height 100% width proportional rgba(239,68,68,0.06)

BANK SECTION (marginTop 16px):
- Title "Счета · 1С"
- Cards same style as dashboard bank cards

5. Points.tsx
Redesign Points.tsx branch list screen. Navy Premium: bg #060E1A, surface #0D1B2E, accent #3B82F6.

HEADER (paddingTop 52px paddingHorizontal 20px):
- "Точки продаж" 26px fontWeight 700 var(--text-primary) letterSpacing -0.03em
- Below: total revenue in JetBrains Mono 14px var(--text-secondary)

SEARCH (marginTop 12px):
- background rgba(59,130,246,0.06), border 1px solid var(--border-subtle), borderRadius 14px, padding 12px 16px 12px 40px
- Search icon 14px var(--text-muted) absolute left 14px
- On focus: border var(--border-strong)

BRANCH CARDS (gap 8px, marginTop 12px):
Each card background var(--bg-surface) border var(--border-subtle) borderRadius 16px padding 16px:
- Top row: status dot 8px circle left, name 14px fontWeight 600, right: revenue JetBrains Mono 14px, change % badge (green/red pill)
- Below name: city · transaction count 11px var(--text-muted)
- Progress bar full width height 3px marginTop 12px: background rgba(59,130,246,0.08), fill color #3B82F6 (width = revenue / max_revenue * 100%), borderRadius 2px
- Profit margin below bar: "Маржа: 35%" 11px var(--text-muted)
- Hover/active: border-color var(--border-strong)
- RED status card gets border rgba(239,68,68,0.2)

6. Sales.tsx
Redesign Sales.tsx. Navy Premium: bg #060E1A, surface #0D1B2E, accent #3B82F6.

HEADER:
- "Продажи" 26px bold, below total in JetBrains Mono large var(--text-primary)
- Add button top-right: 40px rounded background linear-gradient(135deg,#2563EB,#1D4ED8), Plus icon white

CATEGORY SUMMARY (horizontal scroll, gap 8px, marginTop 12px):
- Pills: background var(--bg-surface), border var(--border-subtle), borderRadius 20px, padding 10px 14px
- Left dot color per category: Касса #3B82F6, Доставка #10B981, Kaspi QR #F59E0B
- Category name 11px var(--text-muted), sum JetBrains Mono 13px var(--text-primary)

FILTER ROW (gap 8px marginTop 8px):
- Pills: active background rgba(59,130,246,0.14) border rgba(59,130,246,0.28) color #3B82F6 fontWeight 600
- Inactive: background var(--bg-surface) border var(--border-subtle) color var(--text-muted)

GROUPED TRANSACTION LIST:
- Date label: uppercase 11px var(--text-muted) letterSpacing 0.05em, right: daily total JetBrains Mono var(--text-secondary)
- Group card: background var(--bg-surface) borderRadius 16px overflow hidden, each row padding 13px 16px, divider 1px rgba(59,130,246,0.06)
- Row: colored dot 8px left in 32px square background var(--bg-elevated) borderRadius 8px, name bold 13px + category·time 11px muted, amount right +₸XX JetBrains Mono #10B981

7. Expenses.tsx
Redesign Expenses.tsx. Navy Premium: bg #060E1A, surface #0D1B2E, accent #3B82F6.

HEADER:
- "Расходы" label 11px uppercase var(--text-muted), below total amount JetBrains Mono 32px var(--text-primary) letterSpacing -0.04em
- Add FAB: 52px circle bottom-right fixed, background linear-gradient(135deg,#2563EB,#1D4ED8), boxShadow 0 8px 24px rgba(37,99,235,0.4)

STACKED BAR (full width height 8px borderRadius 4px marginTop 4px marginBottom 16px):
- Each segment colored: Продукты #3B82F6, Зарплата #F59E0B, Аренда #A78BFA, Коммунальные #10B981, Прочее rgba(239,246,255,0.2)
- No gap between segments, smooth continuous bar

LEGEND (2-column grid gap 8px):
- Each item: color swatch 8px circle, name 12px var(--text-secondary), amount JetBrains Mono 12px right, pct 11px var(--text-muted) right

FILTER PILLS (horizontal scroll marginTop 8px):
- Active: background rgba(59,130,246,0.14) border rgba(59,130,246,0.28) color #3B82F6 fontWeight 600 borderRadius 20px
- Inactive: background var(--bg-surface) border var(--border-subtle) color var(--text-muted)

EXPENSE LIST:
- Grouped card var(--bg-surface) borderRadius 16px overflow hidden
- Row: emoji in 36px square background var(--bg-elevated) borderRadius 8px, name+point middle, amount #F87171 JetBrains Mono right, ChevronRight muted
- Dividers 1px rgba(59,130,246,0.06)

8. Reports.tsx
Redesign Reports.tsx executive analytics. Navy Premium: bg #060E1A, surface #0D1B2E, accent #3B82F6.

HEADER: "Аналитика" 26px bold

PERIOD PILLS (full width, 4 equal pills: День Неделя Месяц Квартал):
- Active: background linear-gradient(135deg,#2563EB,#1D4ED8) white bold borderRadius 20px
- Inactive: background var(--bg-surface) border var(--border-subtle) color var(--text-muted) borderRadius 20px

KPI CARDS (horizontal scroll, gap 10px, 3 cards 160px wide):
- Card 1 background linear-gradient(135deg,#1E3A6E,#2563EB) borderRadius 16px padding 16px: "Выручка" ₸29.8M "#10B981 ↑ 18.4%", "iiko+1С" tag 10px
- Card 2 var(--bg-surface): "Расходы" ₸18.4M, change muted
- Card 3 var(--bg-surface): "Прибыль" ₸11.4M "#10B981 ↑ 28.7%"

BAR CHART (marginTop 16px):
- Title "Факт vs План"
- recharts BarChart height 160px, "Факт" bars fill #3B82F6 radius [4,4,0,0], "План" bars fill rgba(59,130,246,0.15) radius [4,4,0,0]
- No Y axis, X axis restaurant short names 10px var(--text-muted)
- Tooltip: background var(--bg-elevated) border var(--border-default) borderRadius 10px fontFamily JetBrains Mono

RANKING TABLE (marginTop 16px):
- Title "Рейтинг · Выручка"
- Rows: rank in 22px circle background var(--bg-elevated), name flex-1, revenue JetBrains Mono, plan% color #10B981 if >100% / #F59E0B if 90-100% / #EF4444 if <90%
- Dividers 1px rgba(59,130,246,0.06)

EXPORT BUTTONS (row gap 8px marginTop 16px):
- Both: border 1px solid rgba(59,130,246,0.28) color #3B82F6 background transparent borderRadius 12px padding 12px fontWeight 600
- Left: Send icon + "Отправить"
- Right: Download icon + "PDF"

9. BottomNav.tsx
Redesign BottomNav. Navy Premium: bg rgba(6,14,26,0.96), accent #3B82F6.

- backdropFilter blur(20px), borderTop 1px solid rgba(59,130,246,0.08), height 68px
- 4 tabs: Home "Главная", Store "Рестораны", BarChart3 "Аналитика", Bell "Уведомления"
- Active: icon color #3B82F6 strokeWidth 2, label 10px #3B82F6 fontWeight 600, small dot 4px below label background #3B82F6 borderRadius 2px
- Inactive: icon rgba(239,246,255,0.25) strokeWidth 1.5, label rgba(239,246,255,0.22) 10px fontWeight 400
- Bell tab: if alerts exist, show 8px red circle badge top-right of icon
- Active tab icon: transform scale(1.08) transition 0.2s