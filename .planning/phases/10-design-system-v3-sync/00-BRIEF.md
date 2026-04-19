# Phase 10 · Design System v3 Sync — Brief

**Created:** 2026-04-19  
**Goal:** Синхронизировать `apps/mobile-dashboard/` с 19 утверждёнными HTML-прототипами design-system.

---

## Контекст

В течение нескольких сессий пользователь через Claude Design (отдельный AI) создавал HTML-прототипы design-system компонентов. Каждый файл прошёл 2-3 итерации review через ui-critic агента. Итого **19 approved файлов** лежат в `C:\Users\Acer\Downloads\`.

Текущий код в `apps/mobile-dashboard/src/theme/` построен по старой MASTER.md и **НЕ СООТВЕТСТВУЕТ** утверждённой design-system.

---

## Утверждённые HTML-файлы (source of truth)

Все в `C:\Users\Acer\Downloads\`. Если несколько версий — брать **самую свежую** (с максимальным суффиксом `(N)`).

### Colors
1. `colors-core (1).html` — palette + text + tints + interactive states
2. `colors-text.html` — text hierarchy (TODO: добавить `text-secondary #CBD5E1` как 5-й уровень)
3. `colors-status.html` — positive/danger/warning/info (info = `#0EA5E9`)
4. `colors-categories.html` — 12 DDS category colors

### Typography
5. `type-families (1).html` — Fira Sans v4.301 + Fira Code v6.2 (pinned), 4 weights
6. `type-body (2).html` — body/body-sm/caption/label/button (14/13/12/11/14)
7. `type-headings (1).html` — 7 heading tokens (display/screen/h1-h4/subheading), все Fira Sans кроме display-numeric

### Spacing / Radii / Shadows
8. `spacing (2).html` — 11-level scale: `4/8/12/16/20/24/32/40/48/56/64`
9. `radii (1).html` — 6-ступенчатая шкала: `4/8/12/16/20/full`
10. `shadows (1).html` — 5 elevation levels + 3 glow + 2 inset

### Icons
11. `icons-lucide.html` — Lucide v0.344.0 pinned (mobile использует lucide-react-native — нужно проверить mapping)

### Components
12. `buttons (1).html` — 5 variants × 5 states, pill/rounded 12px
13. `inputs (1).html` — 6 text-states + phone KZ +7 + OTP 4 states
14. `kpi-row (1).html` — 3 KPI cards с semantic (revenue=accent 6px border-left, expenses=muted, balance conditional)
15. `restaurant-card.html` — BNA/DNA brand-badges, plan-bar с ПЛАН marker, 4 performance states
16. `hero-card.html` — border-left + label + value + delta + period
17. `chart (1).html` — bar chart с периодами и states
18. `chips-badges.html` — 4 sections: filter/status/source/metric
19. `bottom-nav` (есть в коде, возможно в более старой версии)

---

## Ключевые правила (из approved)

- **Accent = BLUE `#2563EB`** (user явно поправил в начале сессии)
- **Positive = GREEN `#22C55E`** — отдельный semantic
- **Border-left pattern** в карточках (`kpi-row`, `hero-card`, `restaurant-card`) — 4px (hero) или 6px (revenue hero)
- **Semantic sync**: dot + border-left + bar-fill + status-text — один цвет в карточке
- **4px-grid** везде (никаких 5, 6, 7, 10, 13, 14, 18)
- **Radii только из шкалы** (никаких 5, 7, 10, 11)
- **Text hierarchy через solid hex**, НЕ через opacity
- **5 уровней text**: default `#F8FAFC` / secondary `#CBD5E1` / muted `#94A3B8` / tertiary `#64748B` / disabled `#475569`
- **Fira Code tnum** для KPI чисел, **Fira Sans** для всех headings
- **Lucide pinned** 0.344.0

---

## Bren KEX GROUP

- **TOO Burger na Abaya** (BNA) — 8 точек
- **TOO A Doner** / Doner na Abaya (DNA) — 5 точек
- Cuisine: ТОЛЬКО `Burger` или `Doner` (не «Пицца», не «Fast Food»)
- НЕ использовать выдуманные бренды вроде «Kex Burgers», «Kex Pizza», «AliPush»

---

## Текущее состояние mobile-dashboard

**Theme:** `src/theme/{colors,spacing,typography,shadows,icons,useTheme,index}.ts`  
**Components:** BottomNav, RestaurantCard, DayRangePicker, MonthRangePicker, PeriodSelector, OfflineBanner, SkeletonLoader  
**Screens:** Dashboard, Login, PointDetail, BrandDetail, Article, Operations, Points, Reports, Profile, Notifications

**КРИТИЧЕСКИЙ GAP в package.json:**
- `@expo-google-fonts/jetbrains-mono` → должно `fira-code`
- `@expo-google-fonts/plus-jakarta-sans` → должно `fira-sans`

---

## Wave структура

**Wave 1** (research): UX Architect + UI Designer + UX Researcher (через Design Lead) → RESEARCH.md + UI-SPEC.md  
**Wave 2** (tokens): mobile-agent → theme/* + package.json + App.tsx  
**Wave 3** (components): mobile-agent → обновить 2 + создать 9 компонентов (не в этой сессии)  
**Wave 4** (screens): mobile-agent → sync 9 screens (не в этой сессии)  
**Wave 5** (verify): tsc + lint + test + gsd-verifier (не в этой сессии)

**Текущий запуск:** Wave 1 + Wave 2 → остановка на review
