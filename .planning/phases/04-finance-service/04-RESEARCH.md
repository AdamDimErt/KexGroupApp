# Phase 4: Finance Service — Research

**Researched:** 2026-04-07
**Domain:** NestJS service completion — interceptors, Prisma aggregations, report queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **URL Routes** — All new endpoints under `/dashboard` prefix. No new controller. No `/finance` prefix.
   - `GET /dashboard/article/:id/operations?restaurantId=&periodType=&dateFrom=&dateTo=`
   - `GET /dashboard/reports/dds?periodType=&dateFrom=&dateTo=`
   - `GET /dashboard/reports/company-expenses?periodType=&dateFrom=&dateTo=`
   - `GET /dashboard/reports/kitchen?periodType=&dateFrom=&dateTo=`
   - `GET /dashboard/reports/trends?periodType=&dateFrom=&dateTo=`

2. **Role Blocking** — Return `403 ForbiddenException` when a role accesses a forbidden endpoint. Implemented via `DataAccessInterceptor` (NestInterceptor) reading `x-user-role` header. Registered with `app.useGlobalInterceptors(new DataAccessInterceptor())` in `main.ts`.

   Access matrix (verbatim from CONTEXT.md):
   ```typescript
   const ACCESS_MATRIX = {
     'GET /dashboard/article/:id/operations': ['OWNER'],
     'GET /dashboard/reports/dds':            ['OWNER', 'FIN_DIRECTOR'],
     'GET /dashboard/reports/company-expenses': ['OWNER', 'FIN_DIRECTOR'],
     'GET /dashboard/reports/kitchen':         ['OWNER', 'FIN_DIRECTOR', 'OPERATIONS_DIRECTOR'],
     'GET /dashboard/reports/trends':          ['OWNER', 'FIN_DIRECTOR', 'OPERATIONS_DIRECTOR'],
     'GET /dashboard/article/:groupId':        ['OWNER', 'FIN_DIRECTOR'],
   };
   ```

3. **Report Data Shapes** — Rows by restaurant for DDS/kitchen; rows by article for company-expenses; daily points for trends. Exact shapes defined in CONTEXT.md Decision 3.

4. **Level 4 Operations** — `GET /dashboard/article/:articleId/operations`, OWNER only, `Expense` where `articleId + restaurantId + date range`, join `CostAllocation` for `allocationCoefficient`. Offset/limit pagination (default limit 50, offset 0).

5. **Last Sync Timestamp** — `lastSyncAt: string | null` in `DashboardSummaryDto`. Query `SyncLog` for `MAX(createdAt)` WHERE `tenantId = $1 AND status = 'SUCCESS'`.

### Claude's Discretion
- None specified.

### Deferred Ideas (OUT OF SCOPE)
- Role-based field masking (null out sensitive fields for OPS_DIRECTOR)
- Webhook notifications on report ready — Phase 6+
- Export to CSV/Excel — Phase 6+
</user_constraints>

---

## Summary

Phase 4 completes the Finance Service by adding 6 endpoints (1 Level-4 operations, 4 reports, already started lastSyncAt) and a global role-enforcement interceptor. The existing codebase in `dashboard.service.ts` (1061 lines) provides exact patterns to follow: `toNumber()` for Decimal conversion, `parseStartDate`/`parseEndDate` for UTC+5 timezone handling, `groupBy` + `aggregate` Prisma calls, and `Map`-based result assembly.

The DataAccessInterceptor is a standard NestJS `NestInterceptor` that short-circuits the request pipeline before the handler runs. It reads the route path from `ExecutionContext.switchToHttp().getRequest()` and compares against the ACCESS_MATRIX. Route params (`:id`, `:groupId`, `:articleId`) need pattern matching, not literal comparison.

Report queries are all Prisma `groupBy` or `findMany` with `_sum` aggregation — no raw SQL needed. The `SyncLog` query for `lastSyncAt` is a single `aggregate({ _max: { createdAt: true } })` call.

**Primary recommendation:** Follow the existing `getArticleGroupDetail` method structure for Level 4 and report methods. All patterns are already established in the codebase.

---

## Existing Patterns (HIGH confidence — extracted from source)

### Private Helper Methods
```typescript
// Decimal → number (handles null, undefined, Prisma Decimal objects)
private toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Handles Prisma Decimal: calls .toString() then parseFloat
  const strValue = String(value as object);
  const parsed = parseFloat(strValue);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Date parsing — UTC+5 (Asia/Almaty, no DST)
private parseStartDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:00`);
}
private parseEndDate(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+05:00`);
}
```

### Controller Header Reading Pattern
```typescript
// Existing pattern in dashboard.controller.ts
@Get()
async getDashboardSummary(
  @Query() query: DashboardQueryDto,
  @Headers('x-tenant-id') tenantId?: string,
  @Headers('x-user-role') userRole?: string,
  @Headers('x-user-restaurant-ids') userRestaurantIds?: string,
): Promise<DashboardSummaryDto> {
  if (!tenantId) {
    throw new BadRequestException('Missing x-tenant-id header');
  }
  // ...
}
```

### Prisma groupBy Pattern
```typescript
// Existing: expense.groupBy with _sum — used in getArticleGroupDetail, getRestaurantSummary
const expensesByArticle = await this.prisma.expense.groupBy({
  by: ['articleId'],
  where: {
    restaurantId,
    date: { gte: startDate, lte: endDate },
  },
  _sum: { amount: true },
});

// Existing: costAllocation.groupBy — used in getBrandDetail
const allocations = await this.prisma.costAllocation.groupBy({
  by: ['restaurantId'],
  where: {
    restaurantId: { in: restaurantIds },
    periodStart: { lte: endDate },
    periodEnd: { gte: startDate },
  },
  _sum: { allocatedAmount: true },
});
```

### Existing Method Signatures (service public API)
```typescript
getDashboardSummary(tenantId, periodType, dateFrom, dateTo, restaurantFilter?): Promise<DashboardSummaryDto>
getCompanySummary(tenantId, dateFrom, dateTo): Promise<CompanySummaryDto[]>
getBrandSummary(companyId, dateFrom, dateTo): Promise<BrandSummaryDto[]>
getRestaurantSummary(brandId, dateFrom, dateTo): Promise<RestaurantSummaryDto[]>
getArticleSummary(restaurantId, dateFrom, dateTo): Promise<ArticleSummaryDto[]>
getBrandDetail(brandId, periodType, dateFrom, dateTo): Promise<BrandDetailDto>
getRestaurantDetail(restaurantId, periodType, dateFrom, dateTo): Promise<RestaurantDetailDto>
getArticleGroupDetail(groupId, restaurantId, periodType, dateFrom, dateTo): Promise<ArticleGroupDetailDto>
```

### DashboardSummaryDto — lastSyncAt already declared
```typescript
// In dto/summary.dto.ts — the field is ALREADY declared, just populated with null
export class DashboardSummaryDto {
  // ...
  lastSyncAt: string | null;        // ← already exists, populated as null
  lastSyncStatus: 'success' | 'error' | null;
}
// In getDashboardSummary():
return {
  // ...
  lastSyncAt: null, // TODO: track last sync timestamp  ← just replace this
  lastSyncStatus: null,
};
```

---

## Standard Stack

### Core (already installed — no new packages needed)
| Library | Purpose | Used In |
|---------|---------|---------|
| `@nestjs/common` | `NestInterceptor`, `ExecutionContext`, `CallHandler`, `ForbiddenException`, `BadRequestException` | interceptor + controller |
| `@prisma/client` | DB access, `Prisma.Decimal` type | service queries |
| `class-validator` | `@IsOptional`, `@IsInt`, `@Min` for new DTO fields | operations DTO |
| `rxjs` | `Observable` for interceptor `handle()` passthrough | interceptor |

No new npm packages required. All needed imports are already available.

---

## Architecture Patterns

### Recommended File Structure
```
apps/finance-service/src/
├── common/
│   └── interceptors/
│       └── data-access.interceptor.ts    ← NEW
├── dashboard/
│   ├── dto/
│   │   ├── dashboard-query.dto.ts        existing
│   │   ├── summary.dto.ts                existing
│   │   ├── operations.dto.ts             ← NEW
│   │   └── reports.dto.ts                ← NEW
│   ├── dashboard.controller.ts           extend with 6 new endpoints
│   ├── dashboard.service.ts              extend with 6 new methods
│   └── dashboard.service.spec.ts         extend with new describes
└── main.ts                               add useGlobalInterceptors
```

### Pattern 1: DataAccessInterceptor
**What:** NestJS interceptor that reads `x-user-role` header and throws `ForbiddenException` before handler runs if role not in ACCESS_MATRIX for the route.

**How to read route path from ExecutionContext:**
```typescript
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

const ACCESS_MATRIX: Record<string, string[]> = {
  '/dashboard/article/:id/operations': ['OWNER'],
  '/dashboard/reports/dds':            ['OWNER', 'FIN_DIRECTOR'],
  '/dashboard/reports/company-expenses': ['OWNER', 'FIN_DIRECTOR'],
  '/dashboard/reports/kitchen':          ['OWNER', 'FIN_DIRECTOR', 'OPERATIONS_DIRECTOR'],
  '/dashboard/reports/trends':           ['OWNER', 'FIN_DIRECTOR', 'OPERATIONS_DIRECTOR'],
  '/dashboard/article/:groupId':         ['OWNER', 'FIN_DIRECTOR'],
};

@Injectable()
export class DataAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      headers: Record<string, string>;
    }>();

    const role = request.headers['x-user-role'];
    const path = request.path; // e.g. "/dashboard/article/uuid/operations"
    const method = request.method; // "GET"

    // Match against ACCESS_MATRIX patterns
    const matchedPattern = this.matchPattern(path);
    if (matchedPattern !== null) {
      const allowed = ACCESS_MATRIX[matchedPattern] ?? [];
      if (!role || !allowed.includes(role)) {
        throw new ForbiddenException(
          `Role ${role ?? 'unknown'} cannot access ${path}`,
        );
      }
    }

    return next.handle();
  }

  private matchPattern(path: string): string | null {
    for (const pattern of Object.keys(ACCESS_MATRIX)) {
      // Convert pattern like /dashboard/article/:id/operations to regex
      const regexStr = pattern
        .replace(/:[^/]+/g, '[^/]+')   // :id → [^/]+
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(path)) return pattern;
    }
    return null;
  }
}
```

**Registration in main.ts:**
```typescript
import { DataAccessInterceptor } from './common/interceptors/data-access.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... existing setup ...
  app.useGlobalInterceptors(new DataAccessInterceptor());
  // ... existing listen() ...
}
```

**Important:** `useGlobalInterceptors` is called AFTER `useGlobalPipes`. Order matters: pipes run on request, interceptors wrap the handler. The interceptor fires before the handler regardless.

### Pattern 2: Level 4 Operations Query
**Prisma query for `Expense` with pagination + CostAllocation join:**
```typescript
async getArticleOperations(
  articleId: string,
  restaurantId: string,
  dateFrom: string,
  dateTo: string,
  limit: number,
  offset: number,
): Promise<{ items: OperationItemDto[]; total: number; period: { from: string; to: string } }> {
  const startDate = this.parseStartDate(dateFrom);
  const endDate = this.parseEndDate(dateTo);

  const where = {
    articleId,
    restaurantId,
    date: { gte: startDate, lte: endDate },
  };

  // Count total for pagination
  const total = await this.prisma.expense.count({ where });

  // Fetch page with restaurant name + costAllocations
  const expenses = await this.prisma.expense.findMany({
    where,
    include: {
      restaurant: { select: { name: true } },
      costAllocations: {
        select: { coefficient: true },
        // Take most recent allocation for this expense
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { date: 'desc' },
    take: limit,
    skip: offset,
  });

  const items: OperationItemDto[] = expenses.map((exp) => ({
    id: exp.id,
    date: exp.date.toISOString(),
    amount: this.toNumber(exp.amount),
    comment: exp.comment ?? null,
    source: exp.source as 'IIKO' | 'ONE_C',
    allocationCoefficient:
      exp.costAllocations.length > 0
        ? this.toNumber(exp.costAllocations[0].coefficient)
        : null,
    restaurantName: exp.restaurant?.name ?? '',
  }));

  return {
    items,
    total,
    period: { from: dateFrom, to: dateTo },
  };
}
```

**Key schema facts:**
- `Expense.costAllocations` relation exists (`CostAllocation[]`)
- `CostAllocation.coefficient` is `Decimal @db.Decimal(10, 6)` — use `toNumber()`
- `Expense.restaurantId` is nullable (`String?`) — guard with `?? ''`
- `Expense.date` is `@db.Date` — `.toISOString()` gives UTC, safe for display

### Pattern 3: SyncLog lastSyncAt Query
```typescript
// In getDashboardSummary(), replace the `lastSyncAt: null` line:
const lastSyncResult = await this.prisma.syncLog.aggregate({
  where: {
    tenantId,
    status: 'SUCCESS',
  },
  _max: { createdAt: true },
});
const lastSyncAt = lastSyncResult._max.createdAt
  ? lastSyncResult._max.createdAt.toISOString()
  : null;

// Then in return:
return {
  // ...
  lastSyncAt,
  lastSyncStatus: lastSyncAt ? 'success' : null,
};
```

### Pattern 4: DDS Report Query
```typescript
// Report rows by restaurant — groupBy restaurantId, then group expenses by articleGroup
async getReportDds(
  tenantId: string,
  dateFrom: string,
  dateTo: string,
): Promise<DdsReportDto> {
  const startDate = this.parseStartDate(dateFrom);
  const endDate = this.parseEndDate(dateTo);

  // Get all restaurant IDs for tenant
  const restaurants = await this.prisma.restaurant.findMany({
    where: { brand: { company: { tenantId } }, isActive: true },
    select: { id: true, name: true },
  });
  const restaurantIds = restaurants.map((r) => r.id);

  // Expenses grouped by restaurantId + articleId
  const expenseRows = await this.prisma.expense.groupBy({
    by: ['restaurantId', 'articleId'],
    where: {
      restaurantId: { in: restaurantIds },
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Fetch all relevant articles with their groups
  const articleIds = [...new Set(expenseRows.map((e) => e.articleId))];
  const articles = await this.prisma.ddsArticle.findMany({
    where: { id: { in: articleIds } },
    include: { group: { select: { name: true } } },
  });
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  // Build per-restaurant structure with group buckets
  // ... (assemble Map<restaurantId, Map<groupName, amount>>)
  // Return DdsReportDto shape from CONTEXT.md
}
```

### Pattern 5: Company Expenses Report Query
```typescript
// Source: ONE_C expenses with no restaurantId (HQ overhead) + IIKO expenses for kitchen
// groupBy articleId with source, no restaurantId filter (global/unallocated)
const hqExpenses = await this.prisma.expense.groupBy({
  by: ['articleId', 'source'],
  where: {
    restaurantId: null,  // unallocated HQ expenses
    date: { gte: startDate, lte: endDate },
  },
  _sum: { amount: true },
});
// Also include IIKO workshop expenses if restaurantId is null
// Fetch DdsArticle for name, compute share % of totalAmount
```

### Pattern 6: Kitchen Report Query
```typescript
// KitchenPurchase: tenantId + date range
const purchases = await this.prisma.kitchenPurchase.findMany({
  where: {
    tenantId,
    date: { gte: startDate, lte: endDate },
  },
  orderBy: { date: 'asc' },
});

// KitchenShipment: restaurantId in tenant's restaurants, date range, grouped by restaurant
const shipmentsGrouped = await this.prisma.kitchenShipment.groupBy({
  by: ['restaurantId'],
  where: {
    restaurantId: { in: restaurantIds },
    date: { gte: startDate, lte: endDate },
  },
  _sum: { amount: true },
  _count: { id: true },
});
```

### Pattern 7: Trends Report Query
```typescript
// Revenue by day: financialSnapshot grouped by date
const dailyRevenue = await this.prisma.financialSnapshot.groupBy({
  by: ['date'],
  where: {
    restaurantId: { in: restaurantIds },
    date: { gte: startDate, lte: endDate },
  },
  _sum: { revenue: true },
  orderBy: { date: 'asc' },
});

// Expenses by day: expense grouped by date
const dailyExpenses = await this.prisma.expense.groupBy({
  by: ['date'],
  where: {
    restaurantId: { in: restaurantIds },
    date: { gte: startDate, lte: endDate },
  },
  _sum: { amount: true },
  orderBy: { date: 'asc' },
});

// Merge by date key, compute netProfit = revenue - expenses per day
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route pattern matching | Custom string parser | Regex replace `:param` → `[^/]+` | Already sufficient; NestJS Router uses same approach |
| Decimal arithmetic | Manual float math | `toNumber()` then JS arithmetic | Prisma Decimal object loses precision if coerced directly |
| Date timezone | `new Date(dateStr)` directly | `parseStartDate`/`parseEndDate` with `+05:00` suffix | UTC midnight ≠ Almaty midnight — off by 5 hours |
| Role checks | Per-endpoint `if (role !== 'OWNER')` | Single `DataAccessInterceptor` | Centralised, testable, no duplication across 6+ methods |
| Pagination count + data | Two separate query patterns | `prisma.expense.count()` + `findMany()` with same `where` | Prisma does not support COUNT in `findMany` — requires two calls |

---

## Common Pitfalls

### Pitfall 1: Route Matching with Path Params
**What goes wrong:** `request.path` contains actual UUIDs, e.g. `/dashboard/article/550e8400-e29b-41d4-a716-446655440000/operations`. Direct string comparison against ACCESS_MATRIX keys fails.
**Why it happens:** ACCESS_MATRIX keys use `:id` placeholders.
**How to avoid:** Normalise path using regex: replace UUID/alphanumeric segments between slashes with pattern. Use the `matchPattern()` helper shown above.
**Warning signs:** All requests to parameterised routes pass the check (no matches in matrix) or all get 403.

### Pitfall 2: Level 4 Route Collision
**What goes wrong:** `GET /dashboard/article/:groupId` (existing Level 3) and `GET /dashboard/article/:articleId/operations` (new Level 4) — NestJS routes are matched in registration order. If `:groupId` is registered first, it may capture `operations` as the groupId value.
**How to avoid:** Register the more specific route `/article/:articleId/operations` BEFORE the generic `/article/:groupId` in the controller, OR use NestJS `@Get('article/:articleId/operations')` — NestJS routes with more literal segments take priority automatically in recent versions.
**Verification:** Test that `GET /dashboard/article/some-id/operations` calls the operations handler, not the group handler.

### Pitfall 3: `Expense.restaurantId` is Nullable
**What goes wrong:** Company-expenses query needs `restaurantId: null` to find HQ/unallocated expenses. Passing `undefined` instead of `null` matches ALL records.
**How to avoid:** Use explicit `restaurantId: null` in the Prisma `where` clause.

### Pitfall 4: `SyncLog` Has No `tenantId` Index on `status`
**What goes wrong:** MAX(createdAt) query scans the entire SyncLog table if no combined index exists.
**What exists:** Schema shows `@@index([tenantId, createdAt])` and `@@index([system, status, createdAt])` — no `[tenantId, status]` index.
**How to avoid:** Order the `where` clause to hit the `[tenantId, createdAt]` index. Query is low-frequency (once per Level 1 load), so performance is acceptable without a migration.

### Pitfall 5: Prisma `groupBy` + `_sum` returns null for empty groups
**What goes wrong:** `item._sum.amount` is `null` (not `0`) when no expenses exist. Passing directly to arithmetic causes `NaN`.
**How to avoid:** Always wrap with `this.toNumber(item._sum.amount)` — the helper returns `0` for null/undefined.

### Pitfall 6: `DataAccessInterceptor` registered without DI container
**What goes wrong:** `app.useGlobalInterceptors(new DataAccessInterceptor())` bypasses NestJS DI. If the interceptor needs injectable services (e.g., PrismaService for permission lookups), they won't be injected.
**Current design:** The interceptor only reads the `x-user-role` header — no DI needed. This is correct and intentional.
**Warning signs:** If the interceptor ever needs `@Inject()`, switch to `APP_INTERCEPTOR` provider pattern in `AppModule`.

---

## New DTOs to Create

### `operations.dto.ts`
```typescript
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OperationsQueryDto extends DashboardQueryDto {
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  limit?: number;   // default 50 in service

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;  // default 0 in service
}

export class OperationItemDto {
  id: string;
  date: string;
  amount: number;
  comment: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationCoefficient: number | null;
  restaurantName: string;
}

export class ArticleOperationsDto {
  items: OperationItemDto[];
  total: number;
  period: { from: string; to: string };
}
```

### `reports.dto.ts`
Four response classes matching CONTEXT.md Decision 3 shapes: `DdsReportDto`, `CompanyExpensesReportDto`, `KitchenReportDto`, `TrendsReportDto`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default, already configured) |
| Config file | `apps/finance-service/package.json` → `"jest"` key |
| Quick run command | `cd apps/finance-service && npm test -- --testPathPattern=dashboard` |
| Full suite command | `cd apps/finance-service && npm test` |

### Phase Requirements → Test Map
| Feature | Behavior | Test Type | File | Automated Command |
|---------|----------|-----------|------|-------------------|
| DataAccessInterceptor | 403 for OWNER-only routes when role=FIN_DIRECTOR | Unit | `dashboard.service.spec.ts` or new `data-access.interceptor.spec.ts` | `npm test -- --testPathPattern=interceptor` |
| DataAccessInterceptor | 200 passthrough when role is in allowed list | Unit | `data-access.interceptor.spec.ts` | same |
| DataAccessInterceptor | Route with param (`:id`) matches pattern | Unit | `data-access.interceptor.spec.ts` | same |
| Level 4 operations | Returns paginated items with allocationCoefficient | Unit | `dashboard.service.spec.ts` new describe | `npm test -- --testPathPattern=dashboard` |
| Level 4 operations | Returns `total` count matching DB count | Unit | same | same |
| lastSyncAt | Populated from SyncLog MAX(createdAt) | Unit | `dashboard.service.spec.ts` new describe | same |
| DDS report | Returns rows grouped by restaurant with groups array | Unit | `dashboard.service.spec.ts` new describe | same |
| Company expenses report | Returns categories with source and share% | Unit | `dashboard.service.spec.ts` new describe | same |
| Kitchen report | Returns purchases array and shipments by restaurant | Unit | `dashboard.service.spec.ts` new describe | same |
| Trends report | Returns daily points with revenue/expenses/netProfit | Unit | `dashboard.service.spec.ts` new describe | same |

### Sampling Rate
- **Per task commit:** `cd apps/finance-service && npm test -- --testPathPattern=dashboard --passWithNoTests`
- **Per wave merge:** `cd apps/finance-service && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (test infrastructure to create)
- [ ] `apps/finance-service/src/common/interceptors/data-access.interceptor.spec.ts` — unit tests for interceptor path matching and 403 enforcement
- [ ] New `describe` blocks in `dashboard.service.spec.ts` for: `getArticleOperations`, `getReportDds`, `getReportCompanyExpenses`, `getReportKitchen`, `getReportTrends`, `getDashboardSummary` (lastSyncAt)
- [ ] Add `syncLog` to `mockPrismaService` in spec: `{ aggregate: jest.fn(), findMany: jest.fn() }`
- [ ] Add `kitchenPurchase`, `kitchenShipment` to `mockPrismaService` for kitchen report tests

**Existing spec infrastructure is solid** — `mockPrismaService` pattern, `jest.clearAllMocks()` in `afterEach`, `toMatchObject` assertions. New describes follow the same structure exactly.

---

## State of the Art

| Feature | Approach Used in Codebase | Notes |
|---------|--------------------------|-------|
| Global interceptor | `app.useGlobalInterceptors(new X())` | No DI — acceptable since no injected deps |
| Route matching | Regex pattern conversion | Standard NestJS community approach |
| Decimal handling | `toNumber()` helper wrapping `parseFloat(String(val))` | Avoids Prisma Decimal precision loss |
| Timezone | Hardcoded `+05:00` suffix on date strings | Asia/Almaty has no DST — safe permanently |
| Pagination | `count()` + `findMany(skip, take)` | Cursor-based pagination not needed at this scale |

---

## Open Questions

1. **`request.path` vs `request.route.path` in Express**
   - What we know: `request.path` gives the resolved URL (e.g., `/dashboard/article/uuid/operations`). `request.route?.path` gives the registered Express route pattern (e.g., `/article/:articleId/operations`) — but this is only available after route matching.
   - What's unclear: Whether `request.route.path` is reliably populated in NestJS interceptors (which run before the handler).
   - Recommendation: Use `request.path` with the regex-based `matchPattern()` helper described above. This is reliable and tested in the intercept phase.

2. **`/dashboard/article/:groupId` vs `/dashboard/article/:articleId/operations` ordering**
   - What we know: NestJS 10+ resolves `/article/:id/operations` before `/article/:id` due to more literal segments. This is documented NestJS routing behaviour.
   - Recommendation: Still register the specific route first (line ordering in controller) as a defensive practice.

---

## Sources

### Primary (HIGH confidence)
- Codebase read directly: `apps/finance-service/src/dashboard/dashboard.service.ts` — all Prisma patterns, helpers, method signatures
- Codebase read directly: `apps/finance-service/src/dashboard/dashboard.service.spec.ts` — test patterns, mock structure
- Codebase read directly: `packages/database/schema.prisma` — Expense, CostAllocation, SyncLog, KitchenPurchase, KitchenShipment model definitions
- Codebase read directly: `apps/finance-service/src/main.ts` — existing bootstrap, interceptor registration point
- Codebase read directly: `apps/finance-service/src/dashboard/dashboard.controller.ts` — header reading, BadRequestException patterns

### Secondary (MEDIUM confidence)
- NestJS docs pattern for `NestInterceptor` + `ExecutionContext` — standard since NestJS v7, stable through v10
- NestJS route resolution order (specific before generic) — documented in official routing guide

---

## Metadata

**Confidence breakdown:**
- Existing patterns: HIGH — read directly from source files
- DataAccessInterceptor design: HIGH — standard NestJS pattern with minimal ambiguity
- Prisma queries: HIGH — all query shapes follow established patterns in the existing 1061-line service
- Route collision risk: MEDIUM — NestJS 10 handles this, but ordering is defensive
- SyncLog query performance: MEDIUM — no combined `[tenantId, status]` index, but acceptable for read frequency

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable stack, no fast-moving dependencies)
