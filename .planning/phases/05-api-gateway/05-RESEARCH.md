# Phase 5: API Gateway — Research

**Researched:** 2026-04-07
**Domain:** NestJS proxy controller extension + supertest E2E testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Decision 1: New proxy routes to add**

| Gateway route | Finance-service route | Roles (@Roles) |
|--------------|----------------------|----------------|
| `GET /finance/article/:id/operations` | `/dashboard/article/:id/operations` | `[OWNER]` |
| `GET /finance/reports/dds` | `/dashboard/reports/dds` | `[OWNER, FINANCE_DIRECTOR]` |
| `GET /finance/reports/company-expenses` | `/dashboard/reports/company-expenses` | `[OWNER, FINANCE_DIRECTOR]` |
| `GET /finance/reports/kitchen` | `/dashboard/reports/kitchen` | `[OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR]` |
| `GET /finance/reports/trends` | `/dashboard/reports/trends` | `[OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR]` |

**Decision 2: Query params per route**
- operations: `restaurantId` (required), `periodType`, `dateFrom`, `dateTo`, `limit`, `offset`
- reports/dds, company-expenses, kitchen, trends: `periodType`, `dateFrom`, `dateTo`

**Decision 3: Header forwarding pattern**
Forward `authorization`, `x-tenant-id`, `x-user-role`, `x-user-restaurant-ids` to finance-service on all new routes.

**Decision 4: Route registration order**
`/finance/article/:id/operations` MUST be declared before `/finance/article/:id` in the controller class to prevent NestJS treating 'operations' as the article ID param.

**Decision 5: E2E tests scope**
File: `test/finance-proxy.e2e-spec.ts`. Framework: supertest + jest. Coverage: 403 for FINANCE_DIRECTOR on operations, 403 for OPERATIONS_DIRECTOR on reports/dds, 200 for OPERATIONS_DIRECTOR on reports/kitchen (mock downstream), 404 checks for non-existent routes. Use `app.init()` with NestJS testing module; mock FinanceProxyService.forward.

**Decision 6: Swagger annotations**
All 5 new routes get `@ApiOperation({ summary: '...' })` consistent with existing routes.

### Claude's Discretion
- Exact supertest mock approach (jest.fn() on FinanceProxyService.forward)
- Swagger response types (ApiResponse decorator) — optional, not required
- Nginx/HTTPS — explicitly deferred

### Deferred Ideas (OUT OF SCOPE)
- HTTPS/Nginx reverse proxy with SSL — no live server yet
- Auth biometric proxy routes (Phase 2 plan 02-02 — Telegram Gateway OTP still pending)
- Mobile API integration testing
</user_constraints>

---

## Summary

Phase 5 closes the remaining 30% of the API Gateway by adding 5 proxy routes to the existing `FinanceProxyController` and creating an E2E test suite using supertest. The codebase is in a mature, consistent state — the 4 existing routes follow an identical pattern that the 5 new routes must replicate exactly. No new dependencies are required; supertest and `@nestjs/testing` are already in devDependencies. The only non-trivial concern is route registration order (operations before article/:id) and the E2E module setup pattern.

The operations endpoint introduces two differences from the report routes: it has a required `restaurantId` query param plus pagination params (`limit`, `offset`), and it must also forward `x-user-role` and `x-user-restaurant-ids` headers (same as the dashboard route) because the OWNER-only restriction is enforced at both the gateway @Roles level and the downstream DataAccessInterceptor.

For E2E tests, the correct pattern (confirmed from `test/app.e2e-spec.ts`) is `app.init()` with NestJS TestingModule — NOT `app.listen()`. The module overrides `FinanceProxyService` with a jest mock so no real HTTP to finance-service occurs.

**Primary recommendation:** Copy the existing 4-route pattern verbatim for the 5 new routes, paying attention to (1) route order in the class body, (2) which headers to forward on each route, and (3) the jest-e2e.json config path for the e2e test run command.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Role in Phase 5 |
|---------|---------|---------|-----------------|
| `@nestjs/common` | ^11.0.1 | Controller, decorators, guards | Route definitions |
| `@nestjs/testing` | ^11.0.1 | TestingModule for e2e | E2E app bootstrap |
| `supertest` | ^7.0.0 | HTTP assertions against NestJS app | E2E requests |
| `@types/supertest` | ^6.0.2 | TypeScript types | Already installed |
| `jest` | ^30.0.0 | Test runner | Unit + E2E |
| `ts-jest` | ^29.2.5 | TypeScript transform for jest | Both test configs |
| `@nestjs/swagger` | ^11.2.6 | `@ApiOperation` decorator | Swagger annotations |
| `@dashboard/shared-types` | ^1.0.0 | `UserRole` enum | `@Roles()` calls |

**Installation:** None required — all packages already present in `apps/api-gateway/package.json`.

---

## Architecture Patterns

### Existing Controller Pattern (copy exactly)

Every existing route in `FinanceProxyController` follows this shape:

```typescript
// Source: apps/api-gateway/src/finance/finance-proxy.controller.ts
@Get('some/path')
@Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR])
@ApiOperation({ summary: 'Description...' })
methodName(
  @Req() req: { user: JwtPayload },
  @Headers('authorization') authHeader: string,
  @Query('paramName') paramName?: string,
  // ... more @Query params
) {
  const tenantId = req.user?.tenantId ?? '';
  const userRole = req.user?.role ?? '';
  const restaurantIds = (req.user?.restaurantIds ?? []).join(',');
  const path = this.buildQueryString('/dashboard/some/path', { paramName });
  return this.proxy.forward('GET', path, undefined, {
    authorization: authHeader,
    'x-tenant-id': tenantId,
    'x-user-role': userRole,                      // only when needed
    'x-user-restaurant-ids': restaurantIds,        // only when needed
  });
}
```

### Header Forwarding — Which Headers Per Route

Examining existing routes reveals a split pattern:

| Route | Headers forwarded |
|-------|-------------------|
| `getDashboard` (existing) | `authorization`, `x-tenant-id`, `x-user-role`, `x-user-restaurant-ids` |
| `getBrandDetail` (existing) | `authorization`, `x-tenant-id` only |
| `getRestaurantDetail` (existing) | `authorization`, `x-tenant-id` only |
| `getArticleDetail` (existing) | `authorization`, `x-tenant-id` only |

For new routes: CONTEXT.md Decision 3 mandates forwarding all 4 headers on ALL new routes. The finance-service DataAccessInterceptor uses `x-user-role` and `x-user-restaurant-ids` for role enforcement on report routes — they must be present.

### Route Order Rule — Critical

In `FinanceProxyController`, the class body ordering determines NestJS route matching priority:

```
CORRECT order in controller class:
  @Get('article/:id/operations')   ← MUST come first
  @Get('article/:id')              ← comes after
```

This matches what was done in finance-service (confirmed in `dashboard.controller.ts` line 107 vs line 130). The gateway controller already has `@Get('article/:id')` at line 107. The new `@Get('article/:id/operations')` must be inserted BEFORE it.

### E2E Bootstrap Pattern

Confirmed from `test/app.e2e-spec.ts`:

```typescript
// Source: apps/api-gateway/test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';

describe('FinanceProxy (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FinanceProxyService)
      .useValue({ forward: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();                   // NOT app.listen() — critical
  });

  afterEach(async () => {
    await app.close();
  });
});
```

`app.init()` is correct for NestJS e2e tests. `app.getHttpServer()` is passed to supertest. `app.listen()` would start a real TCP server and is not needed/correct for test isolation.

### Mock JWT for E2E

The guards (`JwtAuthGuard`, `RolesGuard`) must be bypassed or the JWT must be mocked. Two strategies exist:

**Strategy A — Override the guards (clean, no real JWT needed):**
```typescript
.overrideGuard(JwtAuthGuard)
.useValue({ canActivate: (ctx) => {
  const req = ctx.switchToHttp().getRequest();
  req.user = { sub: 'test-id', role: UserRole.OWNER, tenantId: 'tenant-1', restaurantIds: [] };
  return true;
}})
```

**Strategy B — Sign a real JWT using JwtService in test:**
Requires providing `JWT_SECRET` env var in the test environment; more brittle.

CONTEXT.md Decision 5 says "mock JWT" — Strategy A (guard override) is the correct interpretation and avoids env var setup in CI.

### FinanceProxyService Mock Pattern

```typescript
// Based on jwt-auth.guard.spec.ts pattern (useValue with jest.fn)
const mockForward = jest.fn().mockResolvedValue({ data: 'mocked' });

.overrideProvider(FinanceProxyService)
.useValue({ forward: mockForward })
```

For 403 tests: configure guard override to set `req.user.role = UserRole.FINANCE_DIRECTOR` and verify `RolesGuard` throws. For 200 tests: OWNER role + `mockForward.mockResolvedValue(...)`.

### buildQueryString — Already Available

Private method in `FinanceProxyController` handles all optional params:

```typescript
// Source: apps/api-gateway/src/finance/finance-proxy.controller.ts (line 134)
private buildQueryString(basePath: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) { query.append(key, value); }
  }
  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
```

Pass all query params (including `limit` and `offset` as strings) into this method. Undefined values are automatically skipped.

---

## JwtPayload Interface — Verified Shape

From `apps/api-gateway/src/interfaces/jwt-payload.interface.ts`:

```typescript
export interface JwtPayload {
  sub: string;
  role: string;           // string, not UserRole enum — compare as string in guards
  tenantId: string;
  restaurantIds: string[];
}
```

Key insight: `role` is typed as `string` (not `UserRole`). The `RolesGuard` uses `requiredRoles.includes(user.role)` — this works because `UserRole` enum values are string literals (`'OWNER'`, `'FINANCE_DIRECTOR'`, etc.).

---

## Finance-Service Route Signatures — Verified

All 5 target routes confirmed in `apps/finance-service/src/dashboard/dashboard.controller.ts`:

| Finance-service route | Query params accepted | Required headers |
|----------------------|----------------------|-----------------|
| `GET /dashboard/article/:articleId/operations` | `restaurantId` (required), `dateFrom`, `dateTo`, `periodType`, `limit`, `offset` | `x-tenant-id` (implicit via tenantId in downstream) |
| `GET /dashboard/reports/dds` | `periodType`, `dateFrom`, `dateTo` | `x-tenant-id` (required — throws 400 if missing) |
| `GET /dashboard/reports/company-expenses` | `periodType`, `dateFrom`, `dateTo` | `x-tenant-id` (required) |
| `GET /dashboard/reports/kitchen` | `periodType`, `dateFrom`, `dateTo` | `x-tenant-id` (required) |
| `GET /dashboard/reports/trends` | `periodType`, `dateFrom`, `dateTo` | `x-tenant-id` (required) |

The report routes throw `BadRequestException('Missing x-tenant-id header')` if `x-tenant-id` is absent. The gateway always forwards it from `req.user.tenantId`, so no issue — but the E2E mock must ensure `tenantId` is non-empty in `req.user`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query string assembly | Manual string concatenation | `buildQueryString()` (already in controller) | Already handles undefined, encoding |
| JWT mock in tests | Real JWT signing | `overrideGuard()` with `useValue` | Avoids env var deps in CI |
| HTTP assertions | `fetch` or `axios` in tests | `supertest` (already installed) | Designed for NestJS, cleaner API |
| New test runner config | Custom jest setup | Extend `test/jest-e2e.json` (already exists) | Config already wired to `test:e2e` script |

---

## Common Pitfalls

### Pitfall 1: Route Order — operations vs article/:id
**What goes wrong:** If `@Get('article/:id')` is declared before `@Get('article/:id/operations')` in the class, NestJS matches `GET /finance/article/123/operations` as `article/:id` with `id='operations'`, never reaching the operations handler.
**Why it happens:** NestJS resolves routes in declaration order within a controller.
**How to avoid:** Insert `getArticleOperations` method physically before `getArticleDetail` in the class body. This was already identified in `[04-02]` key decision for finance-service, same rule applies at gateway.
**Warning signs:** `getArticleDetail` being called when `getArticleOperations` is expected; `articleId` param equals `'operations'`.

### Pitfall 2: Missing Headers on Report Routes
**What goes wrong:** Report routes in finance-service require `x-tenant-id` and throw `BadRequestException` if absent.
**Why it happens:** Forgetting to add `'x-tenant-id': tenantId` to the headers object in `proxy.forward()` call.
**How to avoid:** Include all 4 headers on every new route per CONTEXT.md Decision 3.

### Pitfall 3: E2E Test — app.listen() vs app.init()
**What goes wrong:** Using `app.listen()` in tests creates a real TCP listener; tests may conflict with other processes or fail in CI environments with port conflicts.
**Why it happens:** Developers confuse HTTP server bootstrap with test bootstrap.
**How to avoid:** Use `app.init()` only. Pass `app.getHttpServer()` (not a URL) to `supertest(...)`.

### Pitfall 4: jest-e2e.json lacks moduleNameMapper
**What goes wrong:** E2E tests fail to resolve `@dashboard/shared-types` path alias because `test/jest-e2e.json` has no `moduleNameMapper`.
**Why it happens:** The unit test config in `package.json` `jest` section uses `rootDir: 'src'` and path resolution differs for e2e.
**How to avoid:** Add `moduleNameMapper` to `test/jest-e2e.json` if import resolution errors appear, OR ensure `tsconfig-paths` is included in the ts-jest transform setup. The existing `test/jest-e2e.json` does not include `moduleNameMapper` — validate during Wave 0 that `@dashboard/shared-types` resolves correctly.

### Pitfall 5: limit/offset Must Be Forwarded as Strings
**What goes wrong:** `buildQueryString` takes `Record<string, string | undefined>`. If `limit` and `offset` are numbers, TypeScript rejects them.
**Why it happens:** `@Query('limit') limit?: number` gives a number but `buildQueryString` expects string.
**How to avoid:** Use `@Query('limit') limit?: string` in the gateway (the gateway does not validate types — it forwards raw query params). Finance-service handles type coercion via its `OperationsQueryDto`.

---

## Code Examples

### Operations Route (complete implementation)

```typescript
// To insert BEFORE @Get('article/:id') in finance-proxy.controller.ts
@Get('article/:id/operations')
@Roles([UserRole.OWNER])
@ApiOperation({ summary: 'Получить операции по статье (только OWNER)' })
getArticleOperations(
  @Req() req: { user: JwtPayload },
  @Param('id') articleId: string,
  @Headers('authorization') authHeader: string,
  @Query('restaurantId') restaurantId: string,
  @Query('periodType') periodType?: string,
  @Query('dateFrom') dateFrom?: string,
  @Query('dateTo') dateTo?: string,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
) {
  const user = req.user;
  const tenantId = user?.tenantId ?? '';
  const userRole = user?.role ?? '';
  const restaurantIds = (user?.restaurantIds ?? []).join(',');
  const path = this.buildQueryString(
    `/dashboard/article/${articleId}/operations`,
    { restaurantId, periodType, dateFrom, dateTo, limit, offset },
  );
  return this.proxy.forward('GET', path, undefined, {
    authorization: authHeader,
    'x-tenant-id': tenantId,
    'x-user-role': userRole,
    'x-user-restaurant-ids': restaurantIds,
  });
}
```

### Report Route Template

```typescript
// All 4 report routes follow this identical shape
@Get('reports/dds')
@Roles([UserRole.OWNER, UserRole.FINANCE_DIRECTOR])
@ApiOperation({ summary: 'ДДС отчёт (OWNER, FINANCE_DIRECTOR)' })
getReportDds(
  @Req() req: { user: JwtPayload },
  @Headers('authorization') authHeader: string,
  @Query('periodType') periodType?: string,
  @Query('dateFrom') dateFrom?: string,
  @Query('dateTo') dateTo?: string,
) {
  const user = req.user;
  const tenantId = user?.tenantId ?? '';
  const userRole = user?.role ?? '';
  const restaurantIds = (user?.restaurantIds ?? []).join(',');
  const path = this.buildQueryString('/dashboard/reports/dds', {
    periodType, dateFrom, dateTo,
  });
  return this.proxy.forward('GET', path, undefined, {
    authorization: authHeader,
    'x-tenant-id': tenantId,
    'x-user-role': userRole,
    'x-user-restaurant-ids': restaurantIds,
  });
}
```

### E2E Test Structure

```typescript
// test/finance-proxy.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { FinanceProxyService } from '../src/finance/finance-proxy.service';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { UserRole } from '@dashboard/shared-types';
import { JwtPayload } from '../src/interfaces/jwt-payload.interface';

// Helper: create guard override that sets req.user to given role
function makeAuthGuard(role: string, extras: Partial<JwtPayload> = {}) {
  return {
    canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
      req.user = { sub: 'test-id', role, tenantId: 'tenant-1', restaurantIds: [], ...extras };
      return true;
    },
  };
}

describe('FinanceProxy (e2e)', () => {
  let app: INestApplication;
  let mockForward: jest.Mock;

  beforeEach(async () => {
    mockForward = jest.fn().mockResolvedValue({ data: 'ok' });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(makeAuthGuard(UserRole.OWNER))  // default to OWNER; override per test
      .overrideProvider(FinanceProxyService)
      .useValue({ forward: mockForward })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });
});
```

---

## E2E Test Cases (from CONTEXT.md Decision 5)

| Test | Role | Route | Expected | How |
|------|------|-------|----------|-----|
| Operations 403 for FINANCE_DIRECTOR | FINANCE_DIRECTOR | `GET /finance/article/abc/operations?restaurantId=r1` | 403 | Override guard to set FIN_DIR role |
| DDS report 403 for OPERATIONS_DIRECTOR | OPERATIONS_DIRECTOR | `GET /finance/reports/dds` | 403 | Override guard to set OPS role |
| Kitchen report 200 for OPERATIONS_DIRECTOR | OPERATIONS_DIRECTOR | `GET /finance/reports/kitchen` | 200 | Override guard OPS + mockForward returns data |
| Non-existent route | any | `GET /finance/reports/nonexistent` | 404 | No mock needed |

---

## Open Questions

1. **jest-e2e.json moduleNameMapper for @dashboard/shared-types**
   - What we know: The unit test config works because `rootDir: 'src'` and workspace links resolve
   - What's unclear: Whether `test/jest-e2e.json` needs `moduleNameMapper` or `pathsToModuleNameMapper` for the path alias
   - Recommendation: Add `moduleNameMapper: { "^@dashboard/shared-types$": "<rootDir>/../../../packages/shared-types/src/index.ts" }` to `jest-e2e.json` as a precaution, or test first and add if resolution fails

2. **RolesGuard with overrideGuard — does it also cover class-level guards?**
   - What we know: `@UseGuards(JwtAuthGuard, RolesGuard)` is applied at class level in the controller; `RolesGuard` reads the `@Roles()` metadata
   - What's unclear: Whether `overrideGuard(JwtAuthGuard)` affects only JwtAuthGuard while `RolesGuard` still runs normally (which is what we want for 403 tests)
   - Recommendation: Override only `JwtAuthGuard` (to inject `req.user`) and let the real `RolesGuard` run — this tests actual role enforcement behavior

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest 30 (unit) + supertest 7 (e2e) |
| Unit config | `package.json` `jest` section — `rootDir: src`, `testRegex: .*\\.spec\\.ts$` |
| E2E config | `test/jest-e2e.json` — `rootDir: .`, `testRegex: .e2e-spec.ts$` |
| Quick unit run | `cd apps/api-gateway && npm test` |
| E2E run | `cd apps/api-gateway && npm run test:e2e` |
| Full suite | `npm test && npm run test:e2e` (from `apps/api-gateway`) |

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GW-01 | `GET /finance/article/:id/operations` proxied with correct headers | E2E | `npm run test:e2e -- --testPathPattern=finance-proxy` | No — Wave 0 |
| GW-02 | Operations route returns 403 for FINANCE_DIRECTOR | E2E | same | No — Wave 0 |
| GW-03 | `GET /finance/reports/dds` proxied, 403 for OPERATIONS_DIRECTOR | E2E | same | No — Wave 0 |
| GW-04 | `GET /finance/reports/company-expenses` proxied | E2E | same | No — Wave 0 |
| GW-05 | `GET /finance/reports/kitchen` proxied, 200 for OPERATIONS_DIRECTOR | E2E | same | No — Wave 0 |
| GW-06 | `GET /finance/reports/trends` proxied | E2E | same | No — Wave 0 |
| GW-07 | Route order: operations resolved before article/:id | E2E (implicit in GW-01) | same | No — Wave 0 |
| GW-08 | Swagger @ApiOperation on all 5 routes | Manual/visual | `npm run start:dev` → Swagger UI | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api-gateway && npm test` (unit tests, ~2s)
- **Per wave merge:** `cd apps/api-gateway && npm test && npm run test:e2e`
- **Phase gate:** Both suites green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/finance-proxy.e2e-spec.ts` — covers GW-01 through GW-07
- [ ] Possible: `test/jest-e2e.json` moduleNameMapper addition if `@dashboard/shared-types` resolution fails in e2e context

*(Existing `test/app.e2e-spec.ts` and `test/jest-e2e.json` are already in place — only the new spec file needs to be created.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `apps/api-gateway/src/finance/finance-proxy.controller.ts` — exact existing patterns, `buildQueryString` signature
- Direct code read: `apps/api-gateway/src/finance/finance-proxy.service.ts` — `forward()` method signature
- Direct code read: `apps/api-gateway/src/guards/roles.guard.ts` — RolesGuard behaviour (reads handler metadata only)
- Direct code read: `apps/api-gateway/src/guards/jwt-auth.guard.spec.ts` — mock patterns (`useValue: { verify: jest.fn() }`)
- Direct code read: `apps/api-gateway/src/guards/roles.guard.spec.ts` — mock patterns for reflector
- Direct code read: `apps/api-gateway/test/app.e2e-spec.ts` — confirmed `app.init()` + `supertest(app.getHttpServer())` pattern
- Direct code read: `apps/api-gateway/test/jest-e2e.json` — e2e jest config, confirmed `test:e2e` command
- Direct code read: `apps/api-gateway/package.json` — confirmed supertest 7, @types/supertest 6, jest 30, @nestjs/testing 11 all in devDependencies
- Direct code read: `apps/finance-service/src/dashboard/dashboard.controller.ts` — exact route paths, query params, required headers
- Direct code read: `packages/shared-types/src/index.ts` — confirmed UserRole enum values and exact string literals
- Direct code read: `apps/api-gateway/src/interfaces/jwt-payload.interface.ts` — confirmed JwtPayload shape

### Secondary (MEDIUM confidence)
- NestJS documentation (training knowledge, corroborated by existing code): controller route ordering precedence, `overrideGuard` in TestingModule

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed from package.json, no new deps needed
- Architecture patterns: HIGH — verified from existing production code in the repo
- Route signatures: HIGH — read directly from finance-service dashboard.controller.ts
- Pitfalls: HIGH — route order pitfall documented in STATE.md `[04-02]` key decision
- E2E test approach: HIGH — confirmed from existing test/app.e2e-spec.ts pattern

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable — NestJS 11 API won't change in this timeframe)
