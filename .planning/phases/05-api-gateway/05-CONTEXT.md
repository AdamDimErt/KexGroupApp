# Phase 5: API Gateway — Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** Auto-generated from existing code analysis + ROADMAP gaps

<domain>
## Phase Boundary

Close the remaining 30% of API Gateway. The finance-proxy controller already has 4 routes
(dashboard, brand/:id, restaurant/:id, article/:id). Phase 5 adds:

1. **5 missing proxy routes** in FinanceProxyController — operations endpoint + 4 report endpoints
2. **E2E test suite** for the complete gateway (supertest)
3. **Nginx/HTTPS** — DEFERRED (no live server yet)

Agent boundary: `apps/api-gateway/src/` ONLY. Never touch finance-service or other apps.

</domain>

<decisions>
## Implementation Decisions

### Decision 1: New proxy routes to add
Exact mapping (gateway URL → finance-service URL):

| Gateway route | Finance-service route | Roles (gateway @Roles) |
|--------------|----------------------|----------------------|
| `GET /finance/article/:id/operations` | `/dashboard/article/:id/operations` | `[OWNER]` |
| `GET /finance/reports/dds` | `/dashboard/reports/dds` | `[OWNER, FINANCE_DIRECTOR]` |
| `GET /finance/reports/company-expenses` | `/dashboard/reports/company-expenses` | `[OWNER, FINANCE_DIRECTOR]` |
| `GET /finance/reports/kitchen` | `/dashboard/reports/kitchen` | `[OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR]` |
| `GET /finance/reports/trends` | `/dashboard/reports/trends` | `[OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR]` |

### Decision 2: Query params per route

**operations:** `restaurantId` (required), `periodType`, `dateFrom`, `dateTo`, `limit`, `offset`
**reports/dds, company-expenses, kitchen, trends:** `periodType`, `dateFrom`, `dateTo`

### Decision 3: Header forwarding pattern
All new routes follow existing pattern — forward these headers to finance-service:
- `authorization` (from request header)
- `x-tenant-id` (from `req.user.tenantId`)
- `x-user-role` (from `req.user.role`)
- `x-user-restaurant-ids` (from `req.user.restaurantIds.join(',')`)

Finance-service DataAccessInterceptor handles 403 for role enforcement. Gateway @Roles
provides early rejection at the JWT level (defence in depth).

### Decision 4: Route registration order
`/finance/article/:id/operations` must be registered BEFORE `/finance/article/:id` in controller
to prevent NestJS treating 'operations' as the article ID param.

### Decision 5: E2E tests scope
File: `test/finance-proxy.e2e-spec.ts`
Framework: supertest + jest (already in devDependencies)
Coverage:
- Operations endpoint returns 403 for FINANCE_DIRECTOR (mock JWT)
- Reports/dds returns 403 for OPERATIONS_DIRECTOR
- Reports/kitchen returns 200 for OPERATIONS_DIRECTOR (mock downstream)
- All 5 routes exist (404 check for non-existent routes)
Use: `app.listen()` style (NestJS testing module, no real HTTP to finance-service — mock FinanceProxyService)

### Decision 6: Swagger annotations
All 5 new routes get `@ApiOperation({ summary: '...' })` consistent with existing routes.

### Claude's Discretion
- Exact supertest mock approach (jest.fn() on FinanceProxyService.forward)
- Swagger response types (ApiResponse decorator) — optional, not required
- Nginx/HTTPS — explicitly deferred

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing.**

### Existing gateway code (patterns to follow)
- `apps/api-gateway/src/finance/finance-proxy.controller.ts` — existing 4 routes, copy patterns exactly
- `apps/api-gateway/src/finance/finance-proxy.service.ts` — forward() method signature
- `apps/api-gateway/src/guards/roles.guard.ts` — RolesGuard implementation
- `apps/api-gateway/src/decorators/roles.decorator.ts` — @Roles() decorator usage
- `apps/api-gateway/src/guards/jwt-auth.guard.spec.ts` — test mock pattern

### Finance-service (READ ONLY — new endpoints added in Phase 4)
- `apps/finance-service/src/dashboard/dashboard.controller.ts` — exact route paths to proxy to

### Shared types
- `packages/shared-types/src/index.ts` — UserRole enum values (OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR)

### Planning
- `.planning/phases/04-finance-service/04-CONTEXT.md` — DataAccessInterceptor ACCESS_MATRIX (cross-reference)

</canonical_refs>

<specifics>
## Specific Ideas

- The `buildQueryString` private method in FinanceProxyController already handles optional params — reuse it
- `req.user` is typed as `{ user: JwtPayload }` — check JwtPayload interface for available fields
- All existing routes use `@UseGuards(JwtAuthGuard, RolesGuard)` at class level, new routes inherit it
- Operations route needs `limit` and `offset` query params forwarded (for pagination)

</specifics>

<deferred>
## Deferred Ideas

- HTTPS/Nginx reverse proxy with SSL — no live server yet
- Auth biometric proxy routes (Phase 2 plan 02-02 — Telegram Gateway OTP still pending)
- Mobile API integration testing

</deferred>

---

*Phase: 05-api-gateway*
*Context gathered: 2026-04-07 (auto from code analysis)*
