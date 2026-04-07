---
phase: 4
slug: finance-service
status: context-complete
created: 2026-04-07
---

# Phase 4 — Finance Service Context

> Decisions locked for researcher and planner. Do not re-ask the user.

---

## What Phase 4 Adds

Finance Service already has Levels 1–3 working (`/dashboard` controller, 4 endpoints).
Phase 4 completes the service with:

1. **Level 4 operations endpoint** — `GET /dashboard/article/:id/operations`
2. **4 report endpoints** — `/dashboard/reports/dds`, `/dashboard/reports/company-expenses`, `/dashboard/reports/kitchen`, `/dashboard/reports/trends`
3. **DataAccessInterceptor** — role-based access enforcement for all endpoints
4. **Last-sync timestamp** — add to Level 1 summary response

---

## Decision 1 — URL Routes

**Decision:** Keep everything under `/dashboard` prefix. No new controller or `/finance` prefix.

**Rationale:** Simplest path — no api-gateway routing changes, single controller file, consistent URL namespace.

```
GET /dashboard/article/:id/operations?restaurantId=&periodType=&dateFrom=&dateTo=
GET /dashboard/reports/dds?periodType=&dateFrom=&dateTo=
GET /dashboard/reports/company-expenses?periodType=&dateFrom=&dateTo=
GET /dashboard/reports/kitchen?periodType=&dateFrom=&dateTo=
GET /dashboard/reports/trends?periodType=&dateFrom=&dateTo=
```

All new endpoints added to `dashboard.controller.ts` + `dashboard.service.ts`.

**Note:** API Gateway proxy routes for `/dashboard/reports/*` and `/dashboard/article/:id/operations` are Phase 5 scope — not in Phase 4. Phase 4 builds the finance-service endpoints only; the gateway wiring happens in Phase 5.

---

## Decision 2 — Role Blocking

**Decision:** Return **403 ForbiddenException** when a role attempts to access a forbidden endpoint.

**Rationale:** Clear semantics — mobile app checks role from JWT before rendering navigation buttons, so 403 is a safety net, not primary UX. Empty response would silently mislead.

**Implementation:** `DataAccessInterceptor` (`NestInterceptor`) reads `x-user-role` header, throws `ForbiddenException` based on route + role matrix.

```typescript
// Access matrix
const ACCESS_MATRIX = {
  'GET /dashboard/article/:id/operations': ['OWNER'],            // Level 4 — OWNER only
  'GET /dashboard/reports/dds':            ['OWNER', 'FINANCE_DIRECTOR'],
  'GET /dashboard/reports/company-expenses': ['OWNER', 'FINANCE_DIRECTOR'],
  'GET /dashboard/reports/kitchen':         ['OWNER', 'FINANCE_DIRECTOR', 'OPERATIONS_DIRECTOR'],
  'GET /dashboard/reports/trends':          ['OWNER', 'FINANCE_DIRECTOR', 'OPERATIONS_DIRECTOR'],  // summary only for OPS
  'GET /dashboard/article/:groupId':        ['OWNER', 'FINANCE_DIRECTOR'],  // Level 3 — no OPS_DIRECTOR
};
```

**Registration:** `app.useGlobalInterceptors(new DataAccessInterceptor())` in `main.ts`.

---

## Decision 3 — Report Data Shapes

**Decision:** Rows = restaurants for DDS/company-expenses/kitchen; trends by day.

### `GET /dashboard/reports/dds`
DDS (cash flow statement) — all expense articles across all restaurants.

```typescript
{
  restaurants: Array<{
    restaurantId: string;
    restaurantName: string;
    totalExpense: number;
    groups: Array<{ groupName: string; amount: number; share: number }>;
  }>;
  totals: { totalExpense: number };
  period: { from: string; to: string };
}
```

### `GET /dashboard/reports/company-expenses`
HQ overhead (1C) + workshop expenses — undistributed, shown before allocation.

```typescript
{
  categories: Array<{
    source: 'ONE_C' | 'IIKO';
    articleName: string;
    totalAmount: number;
    share: number;  // % of total company expenses
  }>;
  totals: { totalAmount: number };
  period: { from: string; to: string };
}
```

### `GET /dashboard/reports/kitchen`
Workshop purchases (KitchenPurchase) and shipments to restaurants (KitchenShipment).

```typescript
{
  purchases: Array<{ date: string; description: string; amount: number }>;
  shipments: Array<{ restaurantName: string; totalAmount: number; items: number }>;
  totals: { totalPurchases: number; totalShipments: number };
  period: { from: string; to: string };
}
```

### `GET /dashboard/reports/trends`
Revenue vs expenses vs net profit by day over the selected period.

```typescript
{
  points: Array<{
    date: string;       // YYYY-MM-DD
    revenue: number;
    expenses: number;
    netProfit: number;
  }>;
  summary: {
    avgDailyRevenue: number;
    avgDailyExpenses: number;
    totalNetProfit: number;
  };
  period: { from: string; to: string };
}
```

---

## Decision 4 — Level 4 Operations

**URL:** `GET /dashboard/article/:articleId/operations`

**Query params:** `restaurantId` (required), `periodType`, `dateFrom`, `dateTo`, optional `limit` (default 50) + `offset` (default 0).

**Access:** OWNER only (403 for all other roles).

**Response shape:**

```typescript
{
  items: Array<{
    id: string;
    date: string;          // ISO8601
    amount: number;
    comment: string | null;
    source: 'IIKO' | 'ONE_C';
    allocationCoefficient: number | null;  // null for direct expenses
    restaurantName: string;
  }>;
  total: number;          // total count for pagination
  period: { from: string; to: string };
}
```

**Data source:** `Expense` model where `articleId = :articleId AND restaurantId = :restaurantId AND date BETWEEN dateFrom AND dateTo`. For allocated expenses (`source = ONE_C` with `restaurantId` set via CostAllocation), also join `CostAllocation` for coefficient.

**Pagination:** offset/limit (simple, consistent with existing patterns).

---

## Decision 5 — Last Sync Timestamp

Add `lastSyncAt: string | null` field to `DashboardSummaryDto` (Level 1 response).

**Data source:** Query `SyncLog` for most recent SUCCESS entry for the tenant:
```sql
SELECT MAX("createdAt") FROM "finance"."SyncLog"
WHERE "tenantId" = $1 AND "status" = 'SUCCESS'
```

---

## Deferred Ideas

- Role-based field masking (return same shape but null out sensitive fields for OPS_DIRECTOR) — noted, not in Phase 4 scope
- Webhook notifications on report ready — noted, Phase 6+
- Export to CSV/Excel — noted, Phase 6+

---

## Phase 5 Dependencies

The following items are intentionally out of Phase 4 scope and will be handled in Phase 5 (api-gateway):

- API Gateway proxy routes for `/dashboard/reports/dds`, `/dashboard/reports/company-expenses`, `/dashboard/reports/kitchen`, `/dashboard/reports/trends`
- API Gateway proxy route for `/dashboard/article/:id/operations`

Phase 4 builds the finance-service endpoints only. The gateway-agent owns `apps/api-gateway/` and will wire these proxy routes in Phase 5.

---

## Code Context

### Existing files (read before editing)
- `apps/finance-service/src/dashboard/dashboard.controller.ts` — 116 lines, 4 endpoints
- `apps/finance-service/src/dashboard/dashboard.service.ts` — 1061 lines, has `parseStartDate`, `parseEndDate`, `toNumber`, `getCoefficientForRestaurant`
- `apps/finance-service/src/dashboard/dto/dashboard-query.dto.ts` — existing query DTO
- `apps/finance-service/src/dashboard/dto/summary.dto.ts` — existing response DTOs
- `apps/finance-service/src/main.ts` — register DataAccessInterceptor here
- `apps/finance-service/src/dashboard/dashboard.service.spec.ts` — existing tests (keep green)

### New files to create
- `apps/finance-service/src/common/interceptors/data-access.interceptor.ts`
- `apps/finance-service/src/dashboard/dto/operations.dto.ts`
- `apps/finance-service/src/dashboard/dto/reports.dto.ts`

### Patterns to follow
- Decimal → number via `toNumber(d: Prisma.Decimal) => Number(d.toString())`
- Date parsing: `parseStartDate` / `parseEndDate` (UTC+5 Almaty offset)
- Header reading: `@Headers('x-user-role')`, `@Headers('x-tenant-id')`
- Error: `throw new BadRequestException(...)` / `throw new ForbiddenException(...)`
