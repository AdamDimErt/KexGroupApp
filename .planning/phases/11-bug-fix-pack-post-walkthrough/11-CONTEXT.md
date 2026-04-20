# Phase 11: Post-walkthrough bug-fix pack — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Source:** 8 todos in `.planning/todos/pending/2026-04-20-*.md` (бывший walkthrough на эмуляторе Android 14 / Pixel 7, dev OTP 111111)

<domain>
## Phase Boundary

**Делаем:**
- Точечные bug-fix'ы по 8 дефектам, замеченным live-walkthrough'ом Dashboard/Reports/BrandDetail на эмуляторе 2026-04-20
- Root-cause в трёх слоях: finance-service DTO (units/filters), aggregator-worker (1C sync), mobile hooks/utils (brand map, plan formula, TZ render)

**Не делаем в этой фазе:**
- Delta chip period-over-period comparison (MEDIUM — отдельный todo, не блокер)
- Замена stub `plannedRevenue = revenue × 1.05` на реальные планы из finance-service (требует API extension — Phase 12)
- UI v3 миграция экранов с inline JSX на `<HeroCard>`/`<KPIRow>`/`<Button>` (см. `.planning/UI-AUDIT-2026-04-20.md` 32/60 — отдельная phase)
- Унификация grammar/labels, кроме уже сделанного "Доброй ночи" fix (не блокер)

**Цель фазы:**
Убрать 8 блокеров так, чтобы Dashboard и Reports показывали **правдоподобные данные** под OWNER-ролью, пригодные для демонстрации стейкхолдерам.

</domain>

<decisions>
## Implementation Decisions

### BUG-11-1 · Маржа 7000% — unit mismatch
- **LOCKED:** Root-cause лежит в одном из двух мест — либо finance-service `FinancialSnapshot.revenue` / `Expense.amount` в разных единицах (вероятно копейки/тиыны vs тенге), либо mobile hook пассует уже нормализованное значение дважды.
- **LOCKED:** Фикс **на бэке** (finance-service DTO нормализует к тенге Decimal(14,2) до возврата). Mobile workaround `/ 100` ЗАПРЕЩЕН как final fix — только если бэк недоступен для правки в рамках этой фазы.
- **LOCKED:** Формула маржи остаётся `(financialResult / revenue) × 100` в `utils/brand.ts` — она корректна.
- **VERIFY via SQL first:** `SELECT revenue, financial_result FROM ...` для подтверждения гипотезы перед кодингом.
- **Acceptance:** Маржа BNA ≈ 68%, DNA ≈ 68%, глобальная ≈ 68.8%.

### BUG-11-2 · resolveBrand знает только BNA/DNA
- **LOCKED:** Заменить keyword-match на `BRAND_MAP: Record<string, {code, cuisine}>` с явными записями для всех 6 брендов.
- **LOCKED:** Расширить TS-тип: `type BrandCode = 'BNA' | 'DNA' | 'JD' | 'SB' | 'KEX' | 'KITCHEN'`.
- **LOCKED:** Fallback — keyword ("doner"/"burger"/"донер") с warn log в Sentry про неизвестный бренд.
- **LOCKED:** Расширить `theme/colors.ts` `colors.brand` с 2 до 6 цветов. Новые цвета выбираем **семантически согласованные** с BNA/DNA (отступая от существующей палитры; детали — в Research).
- **Acceptance:** Just Doner badge = `JD`, Salam Bro = `SB`, КексБрэндс = `KEX`, Kitchen = `KITCHEN`.

### BUG-11-3 · Цех как бренд
- **LOCKED:** Prisma: новый enum `BrandType { RESTAURANT KITCHEN MARKETPLACE }` + поле `Brand.type BrandType @default(RESTAURANT)`.
- **LOCKED:** Миграция + backfill: все существующие Brand с `/цех|kitchen|fabrika/i` в имени → `type=KITCHEN`.
- **LOCKED:** aggregator-worker при upsert Brand определяет type по regex.
- **LOCKED:** finance-service `DashboardService.getBrandSummaries()` фильтрует `where: { type: 'RESTAURANT' }`.
- **LOCKED:** Kitchen-данные идут только в Reports/Цех секцию (сейчас всё ₸0 — связано с BUG-11-8).
- **Acceptance:** На Dashboard 5 брендов (без Цех). `Brand.type` в БД корректен.

### BUG-11-4 · "Выше плана · 0.0%"
- **LOCKED:** Разделить две функции в `utils/brand.ts`:
  - `computePlanAttainment(revenue, plan)` → 0..150% выполнения
  - `computePlanDelta(revenue, plan)` → attainment − 100 (может быть отрицательным)
- **LOCKED:** Новая `formatPlanLabel(deltaPct): { text, status: 'above' | 'onplan' | 'below' }` с порогом ±0.5%.
- **LOCKED:** `RestaurantCard` красит label по status (positive/danger/text.secondary).
- **LOCKED:** Когда `plannedRevenue` null/undefined → "Нет плана" (не "Выше плана · 0%").
- **Acceptance:** BNA (29.28M/30.74M) показывает "Ниже плана · −4.7%" красным.

### BUG-11-5 · "84 точек" вместо 13
- **LOCKED:** Fix на finance-service — `COUNT(DISTINCT id) WHERE isActive AND brand.type='RESTAURANT'`.
- **LOCKED:** Mobile `useDashboard.ts` читает `totalRestaurants` (не `salesCount` / `totalPoints`).
- **Acceptance:** После BUG-11-3 (Kitchen скрыт) — показывает ≤ 13.

### BUG-11-6 · Sync time timezone
- **LOCKED:** finance-service возвращает `lastSyncAt` как ISO UTC с `Z` (`.toISOString()`).
- **LOCKED:** Mobile рендерит через `date-fns-tz` (`toZonedTime` + `format`) с фиксированной TZ `Asia/Almaty`.
- **LOCKED:** Добавить `date-fns` + `date-fns-tz` в `apps/mobile-dashboard/package.json` если нет.
- **LOCKED:** Не трогать TZ эмулятора — работать независимо от device TZ.
- **Acceptance:** Unit test `formatSyncTime('2026-04-20T07:30:00Z')` → `'12:30'`.

### BUG-11-7 · DDS секция для OWNER
- **LOCKED:** Сначала диагностика: grep `ReportsScreen.tsx` на DDS-секцию.
  - Если секция удалена — восстановить (рендер зависит от роли OWNER/FIN_DIRECTOR).
  - Если секция есть но скрыта — проверить `useAuthStore`, возможно dev bypass даёт неOWNER роль.
- **LOCKED:** Dev bypass OTP `111111` должен давать OWNER роль в development (либо на auth-service уровне, либо на seed user в БД).
- **Acceptance:** OWNER видит 4 секции (DDS + Затраты компании + Цех + Тренды). OPS_DIRECTOR видит 2 (Цех + Тренды). FIN_DIR видит 4.

### BUG-11-8 · 1C sync лежит
- **LOCKED:** Диагностика порядком — credentials в `.env`, логи `SchedulerService`, ручной trigger `OneCyncService.syncExpenses()`.
- **LOCKED:** Если credentials отсутствуют — НЕ захардкожывать, добавить в `.env.example` как required.
- **LOCKED:** Если credentials корректны но sync падает — добавить try/catch на record-level (паттерн bug_021).
- **Acceptance:** Reports секция "Затраты компании" получает данные, Reports/Цех показывает Закупки/Отгрузки/Доход с ₸.
- **Note:** Этот баг пересекается с pending todo `2026-04-17-iiko-url-fallback-multitenancy.md` — координировать подходы.

### Claude's Discretion
- Выбор точных цветов для новых brand кодов (JD/SB/KEX/KITCHEN) — из палитры MASTER.md с WCAG AA контрастом на фоне `#020617` / `#0F172A`
- Разделение fix на waves — предлагаю backend-first (wave 1: finance-service + prisma migration), потом mobile (wave 2: utils/hooks/components), потом worker (wave 3: 1C sync отдельно т.к. infra-зависим)
- Формат unit tests — Jest + следовать существующему паттерну `brand.spec.ts` / `useOperations.spec.ts`
- Migration rollback strategy — reversible migration для `Brand.type` (down: DROP COLUMN)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bug Root-cause docs (source of truth)
- `.planning/todos/pending/2026-04-20-margin-pct-7000-percent-unit-mismatch.md` — BUG-11-1 полное описание
- `.planning/todos/pending/2026-04-20-resolve-brand-only-knows-bna-dna.md` — BUG-11-2
- `.planning/todos/pending/2026-04-20-kitchen-shown-as-consumer-brand.md` — BUG-11-3
- `.planning/todos/pending/2026-04-20-plan-attainment-shows-zero-percent.md` — BUG-11-4
- `.planning/todos/pending/2026-04-20-wrong-restaurant-count-84-instead-of-13.md` — BUG-11-5
- `.planning/todos/pending/2026-04-20-sync-time-timezone-bug-utc-vs-almaty.md` — BUG-11-6
- `.planning/todos/pending/2026-04-20-reports-missing-dds-section-for-owner.md` — BUG-11-7
- `.planning/todos/pending/2026-04-20-onec-sync-not-running-zero-expenses-kitchen.md` — BUG-11-8

### Upstream phase summaries (на чём строим)
- `.planning/phases/10-design-system-v3-sync/10-04-SUMMARY.md` — Wave 4: resolveBrand/computeMarginPct/computePlanAttainment введены. Именно эти функции правим.
- `.planning/phases/07-mobile-screens/` — оригинальная реализация ReportsScreen с 4 секциями (DDS/Company/Kitchen/Trends)
- `.planning/phases/03-aggregator-worker-iiko-1/` — 1C sync implementation (OneCyncService)

### Architecture
- `.planning/ARCHITECTURE.md` — схемы БД, multi-schema Postgres (auth + finance), 18 моделей Prisma
- `.planning/REQUIREMENTS.md` — 4-level drill-down, 3 роли access matrix
- `apps/finance-service/src/dashboard/dashboard.service.ts` — getSummary, getBrandSummaries
- `apps/mobile-dashboard/src/utils/brand.ts` — resolveBrand, computeMarginPct, computePlanAttainment
- `apps/mobile-dashboard/src/theme/colors.ts` — brand color tokens
- `apps/aggregator-worker/src/onec/onec-sync.service.ts` — 1C OData sync
- `apps/aggregator-worker/src/scheduler/scheduler.service.ts` — cron jobs

### Related commits / patterns
- `77c495d fix(worker): pin parseDate to Asia/Almaty midnight (bug_012)` — vector-fix pattern для TZ (BUG-11-6)
- `787777b fix(worker): dedupe CostAllocation rows to one-per-day (bug_021)` — record-level try/catch pattern для BUG-11-8

### UI design references
- `design-system/kex-group/` — утверждённая палитра (для новых brand колоров)
- `.planning/phases/10-design-system-v3-sync/10-UI-SPEC.md` — 11 components, RestaurantCard spec

</canonical_refs>

<specifics>
## Specific Ideas

### Гипотеза BUG-11-1 — числовая проверка
Из walkthrough:
- KPI итого: Выручка 99.3M, Расходы 30.9M, Баланс 68.5M → маржа ≈ 68.8% ✓ на KPI-уровне
- BNA ₸29.28M, margin 7048% → financialResult = 29.28M × 70.48 = ₸2063M
- 2063M ≈ 29.28M × 70 — соотношение ~70x наталкивает на единицы. 29.28M тенге = 2928M копеек. Если financial_result хранится в копейках как "доля × 100", получится `2928M × 0.70 ≈ 2050M`. Совпадает.
- Это подтверждает: финрезультат приходит в 100× раз больше (копейки? или × 100 где-то в агрегации).

### Brand mapping из живых данных
Реальные имена из iiko (подтверждены на экране):
- `Burger na Abaya` → BNA
- `Doner na Abaya` → DNA
- `Just Doner` → JD
- `Salam Bro` → SB
- `КексБрэндс` / `KEX-BRANDS` → KEX
- `Цех` / `Kitchen` → KITCHEN (но скрыть)

### Plan label thresholds (BUG-11-4)
```ts
if (deltaPct > 0.5)  → 'Выше плана · +X%' (positive, green)
if (deltaPct < -0.5) → 'Ниже плана · X%' (danger, red)
else                 → 'По плану · X%' (neutral, gray)
```

### TZ проверки
- Устройство эмулятора может быть в UTC или в системной TZ — тест **не должен** зависеть от `process.env.TZ`.
- Использовать `Asia/Almaty` константу, не системную.

</specifics>

<deferred>
## Deferred Ideas

- **Delta chip period-over-period** — пока просто скрыть на "Сегодня" (где нет базы сравнения). Реализация real comparison → Phase 12.
- **plannedRevenue из API** — сейчас stub `revenue × 1.05`. Убрать после того, как finance-service добавит endpoint `/plans/brand/:id?period=...`. Phase 12.
- **UI v3 migration** — экраны бэкэнд-переписываются на компоненты (HeroCard/KPIRow). Отдельная phase после bug-fix.
- **Multi-tenancy iiko URL** — см. `2026-04-17-iiko-url-fallback-multitenancy.md`. Координировать с BUG-11-8 (1C sync), но отдельно.

</deferred>

---

*Phase: 11-bug-fix-pack-post-walkthrough*
*Context gathered: 2026-04-20 from live walkthrough + 8 diagnostic todos*
