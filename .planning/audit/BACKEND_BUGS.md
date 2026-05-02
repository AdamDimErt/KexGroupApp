# Backend Bugs Audit — NestJS Microservices

Scope: `apps/api-gateway/src/`, `apps/auth-service/src/`, `apps/finance-service/src/`, `apps/aggregator-worker/src/`. Excludes `dist/`, `node_modules/`, and `*.spec.ts` test files.

Reference for route mismatches: api-gateway calls `app.setGlobalPrefix('api')` in `apps/api-gateway/src/main.ts:9`, so every gateway route is mounted under `/api/...`.

---

## Critical

### Critical Internal trigger URL is missing the `/api` prefix — alerts never reach the gateway
- **File:** `apps/aggregator-worker/src/alert/alert.service.ts:159-162`
- **Pattern:**
  ```ts
  const gatewayUrl =
    this.config.get<string>('API_GATEWAY_URL') ?? 'http://localhost:3000';
  const secret = this.config.get<string>('INTERNAL_API_SECRET') ?? '';
  const url = `${gatewayUrl}/internal/notifications/trigger`;
  ```
- **Why it's bad:** The gateway sets `app.setGlobalPrefix('api')` in `apps/api-gateway/src/main.ts:9`, so the actual handler `InternalNotificationController` (controller path `internal/notifications`, route `/trigger`) is exposed at `POST /api/internal/notifications/trigger`. The worker hits `/internal/notifications/trigger` and gets 404; because `fireAlert` swallows the error and only logs a warning (line 174), every push notification (sync failure, low revenue, large expense) is silently dropped in production. This is the same family of bug that the user called out (the `/api/notifications/*` vs `/notifications/*` example).
- **Suggested fix:** Change the URL to `${gatewayUrl}/api/internal/notifications/trigger`. Alternatively (and safer) make the gateway exclude the internal controller from the global prefix via `app.setGlobalPrefix('api', { exclude: ['internal/(.*)'] })`. The corresponding tests in `alert.service.spec.ts:98,136,195` assert the wrong URL too and would need updating.

### Critical `JwtAuthGuard` blanket-allows `Authorization: Bearer ` with empty token
- **File:** `apps/api-gateway/src/guards/jwt-auth.guard.ts:18-30`
- **Pattern:**
  ```ts
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Токен не передан');
  }
  const token = authHeader.slice(7);
  try {
    (req as any).user = this.jwtService.verify(token);
  } catch { ... }
  ```
- **Why it's bad:** A request with literal header `Authorization: Bearer ` (6 chars + trailing space, nothing after) passes the `startsWith` check, then `verify('')` rejects — this part is fine — BUT the same code path is used for `Authorization: Bearer null` or `Authorization: Bearer undefined` (common bugs from clients), which simply throw "недействителен". Lower severity, but the bigger issue is that on success the code stores the entire JWT payload as `req.user` with no shape validation: downstream controllers cast it to `JwtPayload` (`apps/api-gateway/src/finance/finance-proxy.controller.ts:64`) and trust `user.role`, `user.tenantId`, `user.restaurantIds`, `user.sub`. A token signed with the same secret but missing `tenantId` would coerce `tenantId === undefined` into the `x-tenant-id` header (empty string) and the finance-service handler returns 400 — but only because of the explicit `if (!tenantId)` check, not because of the guard. Make the guard authoritative: validate the payload shape before forwarding.
- **Suggested fix:** Decode the JWT, then verify `typeof payload.sub === 'string' && typeof payload.role === 'string'` before assigning `req.user`. Throw `UnauthorizedException` if any required claim is missing. Replace `(req as any).user` with a typed extension (e.g. extend `Request` interface).

### Critical Tenant fallback `'default'` written to DB across all 1C and allocation syncs
- **File:** `apps/aggregator-worker/src/onec/onec-sync.service.ts:60, 187, 300, 400`; `apps/aggregator-worker/src/allocation/allocation.service.ts:14`
- **Pattern:**
  ```ts
  const tenantId = process.env.TENANT_ID || 'default';
  ```
- **Why it's bad:** When `TENANT_ID` env var is unset, the worker writes records (`SyncLog`, `KitchenPurchase`, `KitchenIncome`, `DdsArticleGroup{tenantId:'default',code:'hq'}`) keyed to a literal `'default'` string. The auth-service and finance-service look up tenants via `prisma.tenant.findFirst()` / explicit `tenantId` from the JWT — none of them recognize `'default'` as a valid tenant. The result is a silent two-tenant universe: data lands under `tenantId='default'`, the dashboard queries the real tenant id, and the user sees "0₸". Compare to `iiko-sync.service.ts:83-104` which deliberately resolves the tenant from DB instead of falling back to a string literal.
- **Suggested fix:** Reuse the same DB-lookup helper in the 1C and allocation services. If `TENANT_ID` is unset and no tenant exists in the DB, throw at startup (Fail Fast) — never write `'default'`.

### Critical N+1: per-restaurant XML and per-shift PaymentType lookups in revenue sync
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:446-557`
- **Pattern:**
  ```ts
  for (const restaurant of restaurants) {
    const xmlData = await this.makeRequest('GET', `/reports/sales?...`, token);
    ...
    for (const [dateStr, dailyRevenue] of revenueByDate.entries()) {
      ...
      const snap = await this.prisma.financialSnapshot.findUnique({...});
      if (snap) {
        for (const [payTypeName, payAmount] of paymentsForDate.raw.entries()) {
          const pt = await this.prisma.paymentType.findUnique({...});
          if (!pt) continue;
          await this.prisma.snapshotPayment.upsert({...});
        }
      }
    }
  }
  ```
- **Why it's bad:** For 13 restaurants × 30 days × 4 payment types this nested loop produces ~1500 `findUnique`+`upsert` round-trips per `syncRevenue` cron (every 15 min). Worse, `financialSnapshot.findUnique` is called immediately after a `financialSnapshot.upsert` (line 507) — the worker just wrote the row and now reads it back to get the id. Use a `select: { id: true }` chain on the upsert to avoid the second query, and prefetch `PaymentType` rows once per tenant into a `Map<iikoCode, id>` outside the outer loop.
- **Suggested fix:** Move PaymentType lookup outside the loop into a pre-built `Map`. Have the upsert return the id so you don't re-query the snapshot. Consider `createMany({ skipDuplicates: true })` for `SnapshotPayment` after collecting all rows.

### Critical N+1 + per-shift article lookup in DDS expenses sync
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1015-1080`
- **Pattern:**
  ```ts
  for (const dayValue of dayValues) {
    ...
    let article = await this.prisma.ddsArticle.findFirst({ where: { code: productId } });
    if (!article) { ...upsert group, then create article }
    await this.prisma.expense.upsert({...});
    await this.prisma.financialSnapshot.upsert({...directExpenses: { increment: amount }});
  }
  ```
- **Why it's bad:** Three serial DB calls per expense line (article lookup, expense upsert, snapshot increment). For 13 restaurants × ~300 daily expense lines that's ~12000 round-trips per `syncExpenses` cron (every 30 min). Worse, the `findFirst({ where: { code } })` query is unscoped by `tenantId` — if two tenants ever both have an article with the same `code` (a real risk because iiko productIds are reused across organizations), one tenant's expenses will get attached to the other tenant's article.
- **Suggested fix:** Prefetch all DdsArticle rows for the tenant once per sync run into a `Map<code, article>`. Batch missing-article creation. Add `tenantId` to the lookup (via `group.tenantId`) so cross-tenant collisions are impossible. Also wrap (article-create + expense-upsert + snapshot-update) in a `prisma.$transaction([...])` so a failure halfway through doesn't leave the snapshot incremented without a corresponding expense row.

### Critical Allocation service: O(restaurants × expenses) sequential upserts, no transaction
- **File:** `apps/aggregator-worker/src/allocation/allocation.service.ts:127-172`
- **Pattern:**
  ```ts
  for (const expense of unallocatedExpenses) {
    for (const restaurant of restaurants) {
      ...
      await this.prisma.costAllocation.upsert({ ... });
      allocationCount++;
    }
  }
  ```
- **Why it's bad:** With ~13 active restaurants and ~50 daily HQ expenses, this is 650 sequential round-trips per day per allocation run. The cron at `:45` (`scheduler.service.ts:231`) re-runs every hour against the same data, so over a day it executes 650 × 24 = 15600 upserts that mostly hit the update-path. Additionally there's no transaction: if the worker crashes halfway through, `CostAllocation` is partially written and the next run re-upserts (which is okay due to the unique key, but the inconsistent state is observable in the dashboard during the outage). And nothing prevents two overlapping cron firings from racing — see "Concurrency / race conditions" below.
- **Suggested fix:** Replace per-row upsert with a single `prisma.$transaction([prisma.costAllocation.deleteMany({where:{periodStart:dayStart,periodEnd:dayEnd}}), prisma.costAllocation.createMany({data:rows})])`. Guard the cron with a Redis lock so two firings can't both run for the same day.

---

## High

### High Worker `app.controller.ts` exposes manual sync endpoints with NO authentication
- **File:** `apps/aggregator-worker/src/app.controller.ts:28-220`
- **Pattern:**
  ```ts
  @Controller()
  export class AppController {
    @Post('sync/organizations')
    async syncOrganizations() { ... }

    @Post('sync/all')
    async syncAll() { ... }

    @Post('sync/dds')
    async syncDds(@Body() body: ...) { ... }

    @Post('sync/backfill')
    async syncBackfill(@Body() body: ...) { ... }
  }
  ```
- **Why it's bad:** Anyone who can reach the worker (port 3003) can trigger a 30-day-window backfill, blow away `FinancialSnapshot` (`syncBackfill` with `clearExisting:true` calls `clearSnapshots` and unconditionally `deleteMany`), or hammer iiko/1C with rapid sync requests. There's no `JwtAuthGuard`, no `x-internal-secret` check, no IP allowlist. If the worker container is exposed to the LAN it's a foot-gun; if it's exposed to the internet (via misconfigured docker-compose or a stray nginx rule) it's a direct DoS / data-loss vector.
- **Suggested fix:** Apply the same `x-internal-secret` pattern as `InternalNotificationController` (`apps/api-gateway/src/notifications/notification.controller.ts:117-131`) to all `/sync/*` POST endpoints. In production, also bind worker to localhost only.

### High `app.listen(port, '0.0.0.0')` on auth-service and finance-service exposes internal services
- **File:** `apps/auth-service/src/main.ts:27`; `apps/finance-service/src/main.ts:25`; `apps/aggregator-worker/src/main.ts:25`
- **Pattern:**
  ```ts
  await app.listen(port, '0.0.0.0');
  ```
- **Why it's bad:** Microservices behind the api-gateway (`auth-service` on 3001, `finance-service` on 3002, `aggregator-worker` on 3003) bind to all interfaces. They have no JWT guard at the controller level (`AuthController @Controller('auth')` has zero `@UseGuards`, `DashboardController` ditto — relies entirely on a `DataAccessInterceptor` that reads role from `x-user-role` header set by the proxy). A direct request to `http://finance-service:3002/dashboard?...` with hand-crafted `x-user-role: OWNER`, `x-tenant-id: <any-tenant>`, `x-user-restaurant-ids: <any>` returns the data — no signature, no JWT verification. The proxy is the only thing protecting data access.
- **Suggested fix:** Bind to `127.0.0.1` (or the docker bridge address) on internal services. Even better: have the gateway sign a short-lived per-request JWT or HMAC of the headers; verify it on the upstream. At minimum, a dedicated `@UseGuards(InternalServiceGuard)` that checks an `x-internal-secret` matching the gateway's known value.

### High Auth controller has its own ad-hoc JWT verification, bypassing any future guard
- **File:** `apps/auth-service/src/auth/auth.controller.ts:74-110`
- **Pattern:**
  ```ts
  enableBiometric(@Headers('authorization') authHeader: string, @Req() req: Request) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не передан');
    }
    const token = authHeader.slice(7);
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Токен недействителен или истёк');
    }
    ...
  }
  // identical block in getMe()
  ```
- **Why it's bad:** Two controller methods (`enableBiometric`, `getMe`) duplicate a 10-line auth-block instead of using a guard. The duplicated block has slightly different error messages from the gateway's `JwtAuthGuard`, and any future change (e.g. JWT denylist, additional claim check) has to be repeated in every method. Also, `payload` is typed as `{ sub: string }` — actual JWT payload contains `role` and `tenantId` which the controller silently discards. If a future RBAC bug allows a NON_OWNER to enable biometric for the OWNER, the auth-service has no role check.
- **Suggested fix:** Extract a `JwtAuthGuard` that mirrors the gateway's, apply it via `@UseGuards(JwtAuthGuard)`, and inject the validated payload via a `@CurrentUser()` param decorator.

### High `getReportDds` does not require any role gate via `@UseGuards`
- **File:** `apps/finance-service/src/dashboard/dashboard.controller.ts:217-273`
- **Pattern:**
  ```ts
  @Get('reports/dds')
  async getReportDds( @Query() query: DashboardQueryDto, @Headers('x-tenant-id') tenantId?: string,) { ... }
  ```
- **Why it's bad:** Reports endpoints (`/reports/dds`, `/reports/company-expenses`, `/reports/kitchen`, `/reports/trends`) rely on `DataAccessInterceptor` (`apps/finance-service/src/common/interceptors/data-access.interceptor.ts:18-25`) for role enforcement. The interceptor reads `x-user-role` from the header. If the upstream call ever omits that header (gateway bug, refactor, direct call as in High #2 above), the interceptor's `matchedKey !== null` branch is taken and `allowedRoles.includes(role)` returns false, so the failure is fail-closed. That's good. BUT the interceptor pattern lookup is order-sensitive (lines 18-25): `/dashboard/article/:id/operations` is listed before `/dashboard/article/:groupId`, AND both controller methods exist. If a developer reorders the entries or adds `/dashboard/article/:foo` between the two, the interceptor silently changes the access policy because the regex match returns the FIRST hit only. Safer to encode role-allowlists at the controller via `@Roles` and a `RolesGuard` (mirroring the gateway).
- **Suggested fix:** Replicate the gateway's `@Roles + RolesGuard` pattern in finance-service. Use the JWT payload (set by the gateway's guard) instead of reading `x-user-role` from a forwarded header that anyone can set when the service is reachable directly.

### High `Math.random()` for OTP code is not cryptographically secure
- **File:** `apps/auth-service/src/auth/auth.service.ts:104`
- **Pattern:**
  ```ts
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  ```
- **Why it's bad:** Math.random in V8 is a non-cryptographic PRNG (xorshift128+). With ~5 attempts per OTP and 900k space the practical guess rate is fine, BUT a sophisticated attacker that observes a few sequential codes (e.g. via leaked logs, or by triggering and inspecting `[DEV] SMS на ${phone}: ${text}` log output at line 421) can derive the seed and predict subsequent codes. Production OTP must use `crypto.randomInt`.
- **Suggested fix:** `import { randomInt } from 'crypto'; const code = randomInt(100000, 1000000).toString();`

### High No transaction around 3-step write in `findOrCreateUser` + `auditLog`
- **File:** `apps/auth-service/src/auth/auth.service.ts:316-377`
- **Pattern:**
  ```ts
  user = await this.prisma.user.create({ data: { phone, role: 'OPERATIONS_DIRECTOR', ...} });
  ...
  void this.writeAuditLog(user.id, 'LOGIN', ip, userAgent);   // fire-and-forget
  return this.issueTokens(user);
  ```
- **Why it's bad:** `writeAuditLog` is intentionally fire-and-forget (good for not blocking auth). However, on a successful `verifyOtp`, the sequence (1) atomically delete OTP from Redis, (2) issue tokens, (3) write audit-log is split across Redis and Postgres without compensation. If Redis del at line 166 succeeds but `findOrCreateUser` fails (e.g. unique constraint race when two browsers verify the same phone simultaneously), the user has lost their OTP and must request another. Low-impact, but worth noting.
- **Suggested fix:** Move `redis.del('otp:${phone}')` to AFTER the Prisma create succeeds. Wrap the find-or-create logic in a Postgres advisory lock keyed on the phone hash to make concurrent verifies safe.

### High Hardcoded 1C OData filter uses `.toISOString().split('T')[0]` — dropping time component is ambiguous
- **File:** `apps/aggregator-worker/src/onec/onec-sync.service.ts:77-81, 203-207, 316-320, 416-420`
- **Pattern:**
  ```ts
  const dateFromStr = dateFrom.toISOString().split('T')[0];
  const dateToStr = dateTo.toISOString().split('T')[0];
  const filter = `Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'`;
  ```
- **Why it's bad:** The scheduler computes `dateFrom = now - 24h` (a UTC instant). `.toISOString().split('T')[0]` then converts that instant to a UTC calendar date. Depending on what hour of the Almaty day the cron fires, the same logical "yesterday" ranges from being captured fully to being missed by ~5h. A scheduler run at 04:00 Almaty = 23:00 UTC produces `dateFrom = previous-day 04:00 Almaty = previous-day 23:00 UTC` whose UTC date is "previous-day"; correct. Same scheduler run at 02:00 Almaty = 21:00 UTC of previous day → dateFrom is `2-days-ago`, and the worker now over-fetches by a day. Also, OData `datetime'...'` literal is interpolated directly into the filter string. While `dateFromStr` is a controlled value, future refactors that pass user input here would create SQL injection equivalent (OData injection).
- **Suggested fix:** Use Almaty calendar day boundaries (`startOfBusinessDay` / `endOfBusinessDay` from `apps/aggregator-worker/src/utils/date.ts`). Use the OData-builder pattern (axios params) instead of string interpolation.

### High Refresh endpoint accepts an unvalidated weak-typed body in the proxy controller
- **File:** `apps/api-gateway/src/auth/auth-proxy.controller.ts:48`
- **Pattern:**
  ```ts
  refresh(@Body() body: { refreshToken: string }) {
    return this.proxy.forward('POST', '/auth/refresh', body);
  }
  ```
- **Why it's bad:** The gateway has `forbidNonWhitelisted: true` global pipe (`main.ts:11-17`), which only enforces validation on classes decorated with `class-validator`. An inline TS interface like `{ refreshToken: string }` is NOT a class and provides ZERO runtime validation. Clients can POST any JSON shape, and `body` will be forwarded as-is to the upstream. The auth-service `RefreshTokenDto` (`apps/auth-service/src/auth/dto/auth.dto.ts:23-26`) DOES validate, so it's defense-in-depth saving us — but the gateway should not rely on the upstream to validate.
- **Suggested fix:** Define a `RefreshDto` class with `@IsString() @IsNotEmpty() refreshToken: string` and use it in the proxy controller.

### High Worker scheduler crons can overlap and double-write
- **File:** `apps/aggregator-worker/src/scheduler/scheduler.service.ts:50-247`
- **Pattern:**
  ```ts
  @Cron('*/15 * * * *')
  async syncRevenue() { ... await this.iikoSync.syncRevenue(dateFrom, dateTo); ... }

  @Cron('*/30 * * * *')
  async syncExpenses() { ... await this.iikoSync.syncExpenses(dateFrom, dateTo); ... }

  @Cron('45 * * * *')
  async runCostAllocation() { ... await this.allocation.runAllocation(dateFrom, dateTo); ... }
  ```
- **Why it's bad:** `@Cron` from `@nestjs/schedule` does NOT skip overlapping firings. If iiko is slow and `syncRevenue` takes 20 minutes, the next `*/15` cron starts while the previous is still running — both are calling `prisma.financialSnapshot.upsert` on the same `(restaurantId, date)` keys with potentially-different OLAP snapshots. Race conditions on `directExpenses: { increment: amount }` (line 1073) are particularly bad because increments are not idempotent under concurrent execution: two overlapping `syncExpenses` runs both find the same iiko expense (same syncId) — the upsert update path triggers twice — but the snapshot update path triggers twice with the SAME amount, doubling the directExpenses figure. Cost allocation can also overlap with itself across hourly :45 firings if a previous one is still computing.
- **Suggested fix:** Use a per-cron Redis lock (SETNX with TTL slightly longer than expected duration). Or wrap each cron handler in a per-method `Mutex` (e.g. `@nestjs/schedule` supports `@Cron({ name: 'syncRevenue' })` + `SchedulerRegistry`-controlled "running" flag). Importantly: `directExpenses: { increment: amount }` must be replaced with an absolute write derived from a single fresh fetch — increment is unsafe under any sync replay.

---

## Medium

### Medium Empty `try/catch` swallows alert dispatch failures, hiding outages
- **File:** `apps/aggregator-worker/src/alert/alert.service.ts:172-175`
- **Pattern:**
  ```ts
  } catch (e) {
    // Fire-and-forget: log but NEVER block sync
    this.logger.warn(`Alert dispatch failed for ${type}: ${e}`);
  }
  ```
- **Why it's bad:** "Fire and forget" is the right intent for a non-blocking alert path, but the comment implies the only failure mode is "gateway temporarily down". In reality this swallows:
  - the 404 from the Critical bug above (`/internal/notifications/trigger` vs `/api/internal/notifications/trigger`)
  - any 401 from `INTERNAL_API_SECRET` mismatch (which should be loud, since it's a config bug)
  - any 500 from a NotificationService crash
  Sentry capture is also missing. Operators will never know push notifications stopped working.
- **Suggested fix:** Capture into Sentry with `Sentry.captureException(e, { tags: { type, system: 'AlertService' } })`. Keep logger.warn but also bump a metric so the alert-loss is observable.

### Medium `await this.prisma.financialSnapshot.findUnique` immediately after upsert is wasted round-trip
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:507-541`
- **Pattern:**
  ```ts
  await this.prisma.financialSnapshot.upsert({
    where: { restaurantId_date: { restaurantId: restaurant.id, date: snapshotDate } },
    update: { ... },
    create: { ... },
  });
  ...
  if (paymentsForDate && paymentsForDate.raw.size > 0) {
    const snap = await this.prisma.financialSnapshot.findUnique({
      where: { restaurantId_date: { restaurantId: restaurant.id, date: snapshotDate } },
      select: { id: true },
    });
    ...
  }
  ```
- **Why it's bad:** The upsert returns the row by default. The follow-up findUnique with `select: id` is purely additional round-trip. In the worst case (13 restaurants × 30 days × 4 payment types) this is one extra unnecessary query per dollar of payment.
- **Suggested fix:** Capture the upsert return: `const snap = await this.prisma.financialSnapshot.upsert({..., select: { id: true }})`. Drop the second findUnique.

### Medium `body: { dateFrom: string, dateTo: string }` in worker controller bypasses validation
- **File:** `apps/aggregator-worker/src/app.controller.ts:111, 153`
- **Pattern:**
  ```ts
  async syncDds(@Body() body: { dateFrom?: string; dateTo?: string }) { ... }
  async syncBackfill(@Body() body: { dateFrom: string; dateTo: string; clearExisting?: boolean }) { ... }
  ```
- **Why it's bad:** Same root cause as High #8 — inline interface bypasses class-validator. The `syncBackfill` then does `new Date(...)` on the strings. If a client sends `{ dateFrom: 'NOT_A_DATE' }`, `from.getTime()` is NaN, and `from > to` is false (because `NaN > anything === false`), so the `Invalid date range` guard passes, and the code calls `setDate()` on an invalid date. Behavior is implementation-defined garbage. The `isNaN(from.getTime())` check is there but only as a sanity check, not validation.
- **Suggested fix:** Define `BackfillDto` and `DdsSyncDto` classes with `@IsDateString()` (or `@Matches(/^\d{4}-\d{2}-\d{2}$/)`).

### Medium PII (phone number) and OTP code logged at warn level
- **File:** `apps/auth-service/src/auth/auth.service.ts:83, 421, 437`
- **Pattern:**
  ```ts
  this.logger.warn(`[DEV BYPASS] ${phone} — код: ${bypassCode}`);
  ...
  this.logger.warn(`[DEV] SMS на ${phone}: ${text}`);
  ...
  this.logger.error(`Mobizon ошибка [${data.code}]: ${data.message}`);
  ```
- **Why it's bad:** The DEV bypass branch logs phone + OTP code together — a single log line that's effectively credentials. The `[DEV] SMS на ${phone}: ${text}` line in `sendSms` runs whenever `MOBIZON_API_KEY` is unset; in non-prod that's expected, but if MOBIZON_API_KEY accidentally gets unset in production (env-loading bug), real users' phone+code are written to logs at level WARN. Logs frequently flow to Sentry and CloudWatch where they aggregate broadly.
- **Suggested fix:** Gate both warn lines behind `if (NODE_ENV !== 'production')`. Hash or partial-mask the phone (`+7707***8018`). Never log the OTP code itself; log only "code generated".

### Medium TENANT_ID env value used unguarded as the source of truth
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:83-104`
- **Pattern:**
  ```ts
  if (process.env.TENANT_ID && process.env.TENANT_ID !== 'default') {
    this.cachedTenantId = process.env.TENANT_ID;
    return this.cachedTenantId;
  }
  // Otherwise, find the first (and likely only) tenant in DB
  const tenant = await this.prisma.tenant.findFirst();
  ...
  this.cachedTenantId = 'default';
  this.logger.warn('No tenant found in DB, using "default"');
  ```
- **Why it's bad:** `findFirst()` with no ordering is non-deterministic across DB versions (Postgres MAY return rows in insertion order today, but is not guaranteed to). With 2 legal entities ("Burger na Abaya" + "A Doner") there's only one Tenant row in practice, so it works — but the moment a second tenant appears (multi-tenant rollout, staging fixtures), the worker silently picks one and writes everything under that. Also see the literal `'default'` fallback (Critical #3).
- **Suggested fix:** Require `TENANT_ID` to be set explicitly. Throw at startup if missing or if `findFirst()` returns >1 tenant.

### Medium `Restaurant.findFirst({ where: { code: productId } })` in expense sync is unscoped
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1016-1018`
- **Pattern:**
  ```ts
  let article = await this.prisma.ddsArticle.findFirst({
    where: { code: productId },
  });
  ```
- **Why it's bad:** Cross-tenant collision risk (covered above), but also the `code` column is not unique in `DdsArticle` per the inferred schema (it's only unique within `groupId`), so `findFirst()` returns whichever DdsArticle was inserted first across all groups — wrong if the same product code happens to be reused in two groups.
- **Suggested fix:** Filter by `group: { tenantId }` and ensure a (groupId, code) compound key. Better: cache once per sync run.

### Medium Empty arrays passed to `restaurantId: { in: [] }` produce empty result silently
- **File:** `apps/finance-service/src/dashboard/dashboard.controller.ts:55-58, 93-96`
- **Pattern:**
  ```ts
  const restaurantFilter =
    userRole === 'OPERATIONS_DIRECTOR'
      ? (userRestaurantIds ?? '').split(',').map((id) => id.trim()).filter(Boolean)
      : undefined;
  ```
- **Why it's bad:** Documented intentional behavior ("OPS_DIRECTOR with empty scope returns nothing") and the controller logs a warn. That's correct. However the gateway implements the SAME logic in `apps/api-gateway/src/finance/finance-proxy.controller.ts:30-35` using `isOpsDirectorWithNoScope` and short-circuits with `emptyDashboardResponse(...)` BEFORE reaching the upstream. The doubled logic is fine (defense-in-depth bug_007 per the comments) but doubled also means a future change to the empty-response shape only on one side will silently diverge. Worth a note.
- **Suggested fix:** Centralize the `isOpsDirectorWithNoScope` + `emptyDashboardResponse` shape in `@dashboard/shared-types` and import in both places.

### Medium Sequential `for (const company of companies)` loops in low-traffic paths
- **File:** `apps/finance-service/src/dashboard/dashboard.service.ts:392-462` (`getCompanySummary`), `apps/finance-service/src/dashboard/dashboard.service.ts:482-549` (`getBrandSummary`)
- **Pattern:**
  ```ts
  for (const company of companies) {
    const restaurants = await this.prisma.restaurant.findMany({...});
    const revenueAgg = await this.prisma.financialSnapshot.aggregate({...});
    const directExpensesAgg = await this.prisma.expense.aggregate({...});
    const allocatedExpensesAgg = await this.prisma.costAllocation.aggregate({...});
    result.push({...});
  }
  ```
- **Why it's bad:** N+1 (1 query for companies × 4 queries per company). With 1-2 companies this is fine, but the methods are unused-by-mobile (they're only called by `app.controller.spec` tests AFAICT — `getDashboardSummary` is the production path). If they'll be removed soon, fine; otherwise rewrite as a single $queryRaw groupBy by companyId, mirroring the pattern used in `getDashboardSummary`.
- **Suggested fix:** Either delete these methods (they appear to be dead code) or rewrite with `$queryRaw GROUP BY` like `getDashboardSummary` does.

### Medium `:any` cast on Prisma adapter is a workaround for missing types — duplicated across 3 services
- **File:** `apps/auth-service/src/auth/auth.module.ts:41`; `apps/finance-service/src/prisma/prisma.service.ts:18-19`; `apps/aggregator-worker/src/prisma/prisma.service.ts:18-19`
- **Pattern:**
  ```ts
  const adapter = new PrismaPg(pool as any);
  super({ adapter } as any);
  ```
- **Why it's bad:** Three files pin a workaround for the `@prisma/adapter-pg` type definitions that should be fixed in a shared base class. Not a runtime bug — a type-safety leak that hides future API changes.
- **Suggested fix:** Wait for `@prisma/adapter-pg` types to settle, or define a small wrapper module in `packages/database` that exports a typed `createPrismaClient(connectionString)` factory consumed by all three services.

### Medium Logger receives error objects via interpolation, losing stack
- **File:** Multiple. Examples:
  - `apps/aggregator-worker/src/alert/alert.service.ts:67, 113, 142`: `this.logger.warn(\`checkSyncHealth failed: ${e}\`);`
  - `apps/aggregator-worker/src/alert/alert.service.ts:174`: `this.logger.warn(\`Alert dispatch failed for ${type}: ${e}\`);`
  - `apps/aggregator-worker/src/scheduler/scheduler.service.ts:71, 96, 163`: `this.logger.warn(\`Alert check failed after syncRevenue: ${e}\`);`
- **Pattern:**
  ```ts
  } catch (e) {
    this.logger.warn(`Alert check failed after syncRevenue: ${e}`);
  }
  ```
- **Why it's bad:** Interpolating `${e}` calls `String(e)` which yields `[object Object]` for non-Error throws and only the `.message` for Error instances — the stack trace is lost. NestJS's `Logger.warn(message, trace?)` and `Logger.error(message, trace?)` accept a second arg that preserves the stack.
- **Suggested fix:** `this.logger.warn(\`...: ${e instanceof Error ? e.message : String(e)}\`, e instanceof Error ? e.stack : undefined);`

---

## Low

### Low Duplicated `if (this.isOpsDirectorWithNoScope(user))` block across 6 endpoints
- **File:** `apps/api-gateway/src/finance/finance-proxy.controller.ts:71-95, 110-135, 151-175, 193-216, 232-260` (and others)
- **Pattern:**
  ```ts
  const user = req.user;
  if (this.isOpsDirectorWithNoScope(user)) {
    this.logger.warn(`OPS_DIRECTOR ${user.sub} called /finance/... with empty scope`);
    return this.emptyDashboardResponse(user.tenantId ?? '', { periodType, dateFrom, dateTo });
  }
  ```
- **Why it's bad:** This 5-line block is repeated verbatim in 5+ endpoints. A future scope-rule change (e.g. ADMIN getting empty restaurants is also "no scope") would be 5+ edits. Easy to miss one.
- **Suggested fix:** Extract to a NestJS interceptor or a single `@OpsScopeCheck()` decorator that injects the empty response when the user lacks scope.

### Low Hardcoded packaging-words list in expense-classifier
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1023-1024`
- **Pattern:**
  ```ts
  const packagingWords = ['пакет', 'коробка', 'стакан', 'ложка', 'вилка', 'салфетка', 'фольга', 'соусничка', 'контейнер', 'крышка', 'трубочка', 'пленка'];
  const groupCode = packagingWords.some(w => nameLower.includes(w)) ? 'OTHER' : 'FOOD';
  ```
- **Why it's bad:** Business rule embedded in code. New packaging product names (e.g. "обертка", "перчатки") require a code deploy. Should be in DB (a `DdsArticleClassifier` table).
- **Suggested fix:** Move to a config table seeded at deploy. Or accept the limitation and document in ROADMAP.

### Low Hardcoded DDS group-code keyword matchers in `resolveGroupCode`
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1685-1699`
- **Pattern:**
  ```ts
  if (name.includes('аренд')) return 'RENT';
  if (name.includes('заработн') || name.includes('зарплат') || ...) return 'SALARY';
  ...
  ```
- **Why it's bad:** Same family as above — magic-string keyword classifier in code. Adding "Аренда автомобиля" hits "аренд" → RENT (not TRANSPORT). Order matters and is implicit.
- **Suggested fix:** Externalize to a config table or a JSON file in `.planning/config/dds-classifier.json`. Tests already cover this in `iiko-sync.service.spec.ts:286-310`.

### Low `console.log` in `bootstrap()` instead of NestJS `Logger`
- **File:** `apps/auth-service/src/main.ts:28`; `apps/api-gateway/src/main.ts:41-42`; `apps/finance-service/src/main.ts:26`; `apps/aggregator-worker/src/main.ts:26`
- **Pattern:**
  ```ts
  console.log(`Auth Service запущен на порту ${port}`);
  ```
- **Why it's bad:** Inconsistent with NestJS Logger output format; doesn't go through the same log-level filter or structured JSON pipeline if one is configured. Minor, only affects bootstrap message.
- **Suggested fix:** `Logger.log('Auth Service запущен на порту ' + port, 'Bootstrap')`.

### Low `taxpayerIdNumber` naming inconsistent — should be a value type or branded type
- **File:** `apps/finance-service/src/dashboard/dashboard.service.ts:737, 869` (and several others)
- **Pattern:**
  ```ts
  legalEntities: { where: { isActive: true }, select: { id: true, name: true, taxpayerIdNumber: true } },
  ...
  taxpayerIdNumber: legalEntity.taxpayerIdNumber,
  ```
- **Why it's bad:** Just a code-smell — `taxpayerIdNumber` is BIN/IIN in Kazakhstan, a 12-digit string with checksum validation. Currently typed as `string | null` everywhere. No format guarantee.
- **Suggested fix:** Define a `TaxpayerId = string & { __brand: 'TaxpayerId' }` brand type with a runtime parser. Out of scope for this audit — flagged for tech-debt list.

### Low Unused decorator file references `UserRole` indirectly
- **File:** `apps/api-gateway/src/decorators/roles.decorator.ts:1-4`
- **Pattern:**
  ```ts
  import { SetMetadata } from '@nestjs/common';
  import { UserRole } from '@dashboard/shared-types';

  export const Roles = (roles: UserRole[]) => SetMetadata('roles', roles);
  ```
- **Why it's bad:** Not actually a bug. Note that the `RolesGuard` reads metadata key `'roles'` but the decorator hardcodes the same string. A typo would silently disable role checks. Use `Reflector.createDecorator<UserRole[]>()` instead.
- **Suggested fix:** `export const Roles = Reflector.createDecorator<UserRole[]>();` then `reflector.get(Roles, ctx.getHandler())` in the guard.

### Low Health controllers exposed without auth (intentional but document)
- **File:** `apps/api-gateway/src/health/health.controller.ts:5-17`; `apps/auth-service/src/health/health.controller.ts:3-13`; etc.
- **Pattern:**
  ```ts
  @Controller('health')
  export class HealthController {
    @Get()
    check() { return { status: 'ok', service: 'api-gateway', timestamp: ..., uptime: process.uptime() }; }
  }
  ```
- **Why it's bad:** `process.uptime()` exposed publicly is a tiny info-leak (lets an attacker know when the service was last restarted, useful for scoping CVEs). Intentional for monitoring, but should be on a separate `:9090` port restricted to the metrics scraper, not on the public 3000 port.
- **Suggested fix:** Drop `uptime` from the public response; expose on a private metrics endpoint instead.

### Low `restaurant.iikoId` filter bug — `.filter(Boolean)` on possibly-empty-string IDs
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:422-424`
- **Pattern:**
  ```ts
  const restaurantIikoIds = restaurants
    .map((r) => r.iikoId)
    .filter(Boolean);
  ```
- **Why it's bad:** `.filter(Boolean)` drops `null`, `undefined`, AND `''`. If a restaurant row has an empty-string `iikoId` (unlikely but possible if seeding is buggy), it's silently dropped from the sync. Better: `filter((id): id is string => typeof id === 'string' && id.length > 0)`.
- **Suggested fix:** Type guard with explicit check; emit a Sentry warning if any restaurant is dropped.

### Low Sentry context contains `undefined` placeholders in `syncOrganizations` exception block
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:391-399`
- **Pattern:**
  ```ts
  Sentry.withScope((scope) => {
    scope.setTag('system', 'IIKO');
    scope.setTag('method', 'syncOrganizations');
    scope.setContext('sync', {
      dateFrom: undefined,
      dateTo: undefined,
    });
    Sentry.captureException(error);
  });
  ```
- **Why it's bad:** `syncOrganizations` doesn't take a date range, so `dateFrom`/`dateTo` being undefined is correct — but writing them as `undefined` adds no useful context. Sentry will store them as null fields, cluttering the breadcrumb.
- **Suggested fix:** Drop the `setContext('sync', ...)` call entirely for this method, or include relevant fields like `tenantId` and the count of items processed up to the failure point.

### Low `groupBy` with `_count: { id: true }` is a workaround — Prisma `_count` filter could simplify
- **File:** `apps/finance-service/src/dashboard/dashboard.service.ts:225-235`
- **Pattern:**
  ```ts
  const restaurantCountRows = await this.prisma.restaurant.groupBy({
    by: ['brandId'],
    where: { brandId: { in: brandIds }, isActive: true },
    _count: { id: true },
  });
  const countMap = new Map(restaurantCountRows.map((row) => [row.brandId, row._count.id]));
  ```
- **Why it's bad:** This is intentional, with a comment citing "Prisma _count in include has no where filter — Pitfall 3". Note: this is fine but worth documenting that the comment refers to a now-known pitfall in Prisma 5+.
- **Suggested fix:** No action needed — flag for monitoring as Prisma evolves.

### Low Cache `tenantId` lookup once but not invalidated
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:71, 84, 88, 95, 101`
- **Pattern:**
  ```ts
  private cachedTenantId: string | null = null;
  ...
  private async getTenantId(): Promise<string> {
    if (this.cachedTenantId) return this.cachedTenantId;
    ...
    this.cachedTenantId = tenant.id;
    return this.cachedTenantId;
  }
  ```
- **Why it's bad:** The cache lives for the worker's lifetime. If the tenant is ever renamed/recreated mid-run, the worker keeps writing under the stale id. Acceptable for a single-tenant deployment.
- **Suggested fix:** Add a TTL (15 minutes) so a worker restart isn't needed to pick up tenant changes.

### Low Dead method `clearSnapshots` is callable from any caller of the IikoSyncService
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:140-147`
- **Pattern:**
  ```ts
  async clearSnapshots(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.financialSnapshot.deleteMany({
      where: { date: { gte: from, lte: to } },
    });
    return result.count;
  }
  ```
- **Why it's bad:** Public, no tenant scope, no role check, no confirmation: deletes ALL FinancialSnapshot rows in a date range across ALL tenants. Currently only used by `syncBackfill` which is also unauthenticated (High #1). Tag with explicit `// DANGEROUS` if kept.
- **Suggested fix:** Either inline into `syncBackfill` (and rename to `private clearSnapshotsForBackfill`) or guard with a `tenantId` filter.

