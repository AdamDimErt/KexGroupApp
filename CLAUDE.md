# KEX GROUP Dashboard

## Project Summary
Mobile-first financial dashboard for KEX GROUP restaurant chain (Burger na Abaya + Doner na Abaya, 13+ locations in Kazakhstan).

## Business Requirements (from signed TZ)
- **4 roles**: Owner (full access), Finance Director (up to article level), Operations Director (up to restaurant level), Admin
- **4-level drill-down**: Company -> Brand -> Restaurant -> Article -> Operation
- **2 legal entities**: TOO "Burger na Abaya" (8 BNA points), TOO "A Doner" (5 DNA points)
- **Languages**: Russian + Kazakh
- **Notifications**: Push (FCM), not SMS
- **Auth**: OTP via phone (Telegram Gateway / Mobizon SMS), JWT tokens

## Architecture
- **Monorepo** (Turborepo): apps/ + packages/
- **Apps**: auth-service, api-gateway, finance-service, aggregator-worker, mobile-dashboard
- **Packages**: database (Prisma), shared-types
- **Backend**: NestJS microservices, PostgreSQL (multi-schema: auth + finance), Redis, Prisma ORM
- **Mobile**: React Native + Expo, Zustand + React Query + Axios
- **Monitoring**: Sentry

## Architecture Decisions
- Variant B: brands as grouping level on main screen
- Mobile only, no tablet/web adaptation
- Push notifications (FCM), not SMS
- .env (not Vault), staging later
- Cost Allocation Engine: distributes HQ expenses by revenue share coefficient

## Data Sources
### iiko Cloud API (restaurant POS)
- Revenue by payment type (cash, Kaspi, Halyk, Yandex, card) per restaurant per day
- DDS expenses with articles (direct restaurant expenses)
- Kitchen shipments (from production to restaurants)
- Cash discrepancies (expected vs actual at shift close)
- Restaurant/brand organizational structure
- DDS article groups and articles reference data

### 1C OData (accounting)
- HQ overhead expenses (rent, salaries, IT, marketing, legal) - undistributed
- Kitchen purchases (raw materials for production)
- Kitchen income (sales to external clients)
- Bank account balances (for cash flow)
- Cost items by legal entity

### Cost Allocation Engine
- Takes undistributed expenses (HQ from 1C + DDS articles without restaurant from iiko)
- Calculates coefficient: restaurant revenue / total revenue
- Distributes expenses proportionally
- Recalculates on period change
- Shows coefficient at drill-down level 4

## Sync Schedule (aggregator-worker)
1. iiko structure -> Brand, Restaurant (daily 03:00)
2. iiko revenue -> FinancialSnapshot (every 15 min)
3. iiko DDS -> Expense (IIKO) (every 30 min)
4. iiko kitchen -> KitchenShipment (every hour)
5. iiko cash -> CashDiscrepancy (every hour)
6. 1C expenses -> Expense (ONE_C) (every hour)
7. 1C kitchen -> KitchenPurchase/Income (every hour)
8. Cost Allocation run (after steps 2-7)

## iiko Cloud API — Researched Endpoints (2026-03-27)

**Base URL:** `https://api-ru.iiko.services/api/1/`
**Auth:** `POST /access_token` → JWT Bearer, TTL 1h, refresh every 45min, store in Redis TTL 55min
**Full spec:** `IIKOCLOUD_API_RESEARCH.json` | Quick ref: `IIKOCLOUD_QUICK_REFERENCE.md`

### CRITICAL endpoints (MVP, worker-agent implements all):
| Endpoint | Schedule | DB target |
|----------|----------|-----------|
| `POST /access_token` | before every request | Redis |
| `GET /organizations` | daily 03:00 | Brand, Restaurant |
| `GET /payment_types` | daily 03:00 | reference cache |
| `POST /reports/olap` | every 15 min | FinancialSnapshot |
| `POST /reports/expenses` | every 30 min | Expense (IIKO) |
| `POST /reports/cash_discrepancies` | every hour | CashDiscrepancy |

### HIGH endpoints (MVP):
- `POST /reports/receipts` — on-demand, drill-down Level 4 (Owner only)
- `GET /nomenclature/groups` — daily, → DdsArticle, DdsArticleGroup
- `GET /nomenclature` — daily, menu/DDS article mapping

### MEDIUM endpoints (MVP+):
- `POST /reports/kitchen_shipments` — hourly, → KitchenShipment
- `POST /reports/shifts` — hourly, shift timing context
- `GET /terminal_groups/is_alive` — every 30min, health check (skip org if dead)
- `GET /discounts`, `GET /removal_types` — daily, revenue reconciliation

### Key request schemas:
```jsonc
// /reports/olap — revenue
{ "organizationIds": ["uuid"], "reportType": "SALES",
  "dateFrom": "ISO8601", "dateTo": "ISO8601",
  "rowGroupFields": ["paymentType", "restaurantId"],
  "aggregateFields": ["revenue", "salesCount"] }

// /reports/expenses — DDS
{ "organizationIds": ["uuid"], "restaurantIds": ["uuid"],
  "dateFrom": "ISO8601", "dateTo": "ISO8601",
  "groupBy": ["restaurantId", "articleId", "date"] }

// /reports/cash_discrepancies
{ "organizationIds": ["uuid"], "dateFrom": "ISO8601",
  "dateTo": "ISO8601", "includeClosedShifts": true }
// response key: { discrepancy: decimal, status: "OK|WARNING|ERROR" }
```

### Cost Allocation formula:
```
coefficient        = restaurant.revenue / sum(all_restaurants.revenue)
allocated_expense  = hq_expense_1C × coefficient
net_profit         = revenue - direct_iiko - allocated_1C
```

### Constraints for all agents:
- Rate limit: max 15-30 day window per query; use windowed queries for history
- Pagination: required for `/receipts` and large expense ranges (offset + limit)
- OLAP latency: async poll + Redis cache 15min TTL
- HTTP timeout: 30s (servers in RU, latency from KZ ~200-500ms)
- Circuit breaker + exponential backoff required on all iiko HTTP calls
- Log all iiko errors to Sentry with context (orgId, dateFrom, dateTo)

## External Tools
- notebooklm-py: installed globally, authenticated, available as CLI for research

## Module Boundaries (Agent Teams)
- apps/auth-service/ → auth-agent owns
- apps/api-gateway/ → gateway-agent owns
- apps/finance-service/ → finance-agent owns
- apps/aggregator-worker/ → worker-agent owns
- apps/mobile-dashboard/ → mobile-agent owns
- packages/database/ → leader only
- packages/shared-types/ → leader only

## Verification Commands
- Unit tests: cd apps/{service} && npm test
- Lint: npm run lint
- Type check: npx tsc --noEmit

## NEVER edit (all agents)
- .env, .env.*, docker-compose.yml, turbo.json
- Чужие apps/*, packages/* (кроме read)

## Env
- Используй process.env.*, НИКОГДА не хардкодь ключи
