# KEX GROUP — Security Audit Report

**Date:** 2026-05-02
**Scope:** `apps/**/src/`, `packages/**/src/` (excludes tests, node_modules)
**Auditor:** Claude (security-review pass, OWASP-style)
**Project:** Mobile-first financial dashboard for KEX GROUP restaurant chain. Multi-tenant, 4 roles (Owner, Finance Director, Operations Director, Admin), 4-level drill-down (Company → Brand → Restaurant → Article → Operation).

---

## npm audit summary (root + each workspace)

| Workspace                  | Total | Critical | High | Moderate | Low |
|----------------------------|------:|---------:|-----:|---------:|----:|
| Root (`D:/kexgroupapp`)    |    50 |        1 |   20 |       29 |   0 |
| `apps/auth-service`        |    17 |        1 |    7 |        9 |   0 |
| `apps/api-gateway`         |    20 |        1 |    8 |       11 |   0 |
| `apps/finance-service`     |    17 |        1 |    7 |        9 |   0 |
| `apps/aggregator-worker`   |    19 |        1 |    6 |       12 |   0 |
| `apps/mobile-dashboard`    |    19 |        0 |    5 |       14 |   0 |

**Critical (CVE):**
- **handlebars 4.0.0–4.7.8** — prototype pollution / template-injection RCE. Pulled in via build tooling. Production runtime impact only if templates ever evaluate untrusted input — none observed in the codebase, but the dependency is bundled in workspace lockfiles.

**Notable High-severity transitive packages present in production trees:**
- `@nestjs/core` (≤11.1.17) — DoS via header parsing
- `@hono/node-server`, `hono` — auth bypass on encoded slashes (not used at runtime)
- `path-to-regexp 8.0.0–8.3.0` — ReDoS
- `picomatch <=2.3.1` — ReDoS
- `node-forge <=1.3.3` — signature verification bypass
- `undici <=6.23.0` — proxy / header injection (Node fetch on older Node)
- `lodash <=4.17.23` — prototype pollution
- `tar <=7.5.10` — symlink-related arbitrary write
- `vite <=6.4.1` — dev-server path traversal (web-dashboard only, dev-only)
- `flatted`, `defu`, `effect`, `xmldom`, `follow-redirects`, `yaml` — various

→ Run `npm audit fix` per workspace; verify Nest/Expo upgrade paths for breaking changes.

---

# Findings

## CRITICAL

### CRITICAL [CWE-287] JWT signed with hardcoded fallback secret in auth-service
- **File:** `apps/auth-service/src/auth/auth.module.ts:13-21`
- **Vulnerability:** `JwtModule.registerAsync` uses `secret: config.get<string>('JWT_SECRET') ?? 'fallback-secret'`. If `JWT_SECRET` env var is missing or unset (operator mistake, secret rotation glitch, container without env loaded), the service silently signs every token with the literal string `'fallback-secret'`. The api-gateway DOES fail-fast on missing `JWT_SECRET` (`apps/api-gateway/src/app.module.ts:18-20`), so the gateway will accept tokens signed with whichever value it is configured with — but if both services were ever to fall to the fallback (or a misconfigured staging environment), every token issued would be predictable and forgeable.
- **Impact:** Universal authentication bypass. An attacker who knows or guesses `'fallback-secret'` can mint JWTs claiming any `sub`, `role: 'OWNER'`, `tenantId`, `restaurantIds`, and access every financial endpoint as any user.
- **Fix:** Replace with `if (!secret) throw new Error('JWT_SECRET env var is required');` to mirror the gateway's behavior, exactly as the gateway already does. Never ship a fallback secret.

### CRITICAL [CWE-639 / OWASP A01:2021] Cross-tenant IDOR on all drill-down detail endpoints
- **File:** `apps/finance-service/src/dashboard/dashboard.controller.ts:116-210` and `apps/finance-service/src/dashboard/dashboard.service.ts:719-1392, 1395-1460`
- **Vulnerability:** The detail endpoints `GET /dashboard/brand/:brandId`, `GET /dashboard/legal-entity/:legalEntityId`, `GET /dashboard/restaurant/:restaurantId`, `GET /dashboard/article/:groupId`, and `GET /dashboard/article/:articleId/operations` accept the resource ID directly from the URL and call `prisma.<entity>.findUnique({ where: { id } })` with NO `tenantId` filter. The controller signatures do not even receive `@Headers('x-tenant-id')` for these routes (compare `dashboard.controller.ts:42-71` for `/dashboard` which DOES receive it). The api-gateway's `FinanceProxyController` does forward the header, but the finance service then ignores it on detail routes.
- **Impact:** Any authenticated user (e.g. an OPERATIONS_DIRECTOR of "Burger na Abaya") can pass a restaurantId or brandId belonging to a different tenant in the URL and the service returns full revenue, payment-type breakdown, expense groups, allocation coefficients, and cash discrepancies for that tenant. Owner of TOO "A Doner" can read TOO "Burger na Abaya" P&L and vice versa, fully defeating multi-tenant isolation.
- **Fix:** Plumb `x-tenant-id` through every detail endpoint and add `where: { id, tenant: { id: tenantId } }` (or join via brand→company→tenant) on the initial `findUnique`/`findMany`. Return 404 (not the empty stub) on tenant mismatch so attackers cannot confirm IDs exist in other tenants. Same applies to `getArticleGroupDetail` and `getArticleOperations` — the underlying Expense rows must be filtered through `restaurant.brand.company.tenantId`.

### CRITICAL [CWE-306 / OWASP A01:2021] finance-service has no authentication; trusts arbitrary inbound headers
- **File:** `apps/finance-service/src/main.ts:7-26`, `apps/finance-service/src/dashboard/dashboard.controller.ts:42-275`, `apps/finance-service/src/common/interceptors/data-access.interceptor.ts:27-67`
- **Vulnerability:** The finance-service binds to `0.0.0.0:3002`, registers no JWT guard, no AuthModule, and derives the caller's identity entirely from inbound HTTP headers `x-tenant-id`, `x-user-role`, `x-user-restaurant-ids` set by the gateway. There is no shared secret / mTLS / network policy enforced in code. If port 3002 is reachable from outside the trusted Docker network (firewall hole, accidental load-balancer rule, attacker in the same VPC), any HTTP client can forge these headers.
- **Impact:** Direct unauthenticated request: `curl -H "x-tenant-id: <victim>" -H "x-user-role: OWNER" http://finance-service:3002/dashboard/restaurant/<id>` returns full P&L for any restaurant of any tenant. RBAC is also trivially defeated because the role is self-asserted.
- **Fix:** Either (a) require a `INTERNAL_API_SECRET`-style shared HMAC header on every request from the gateway, validated by a guard in finance-service, OR (b) deploy finance-service on a private network only reachable by the gateway and document this as a hard infrastructure invariant, OR (c) terminate the user's JWT inside finance-service itself and reject requests where the signed `tenantId` claim does not match the URL parameter. Option (c) is the most defensible; (a) is the minimum.

### CRITICAL [CWE-307 / OWASP A07:2021] No rate-limiting on `/auth/send-otp` — OTP / SMS bombing
- **File:** `apps/api-gateway/src/app.module.ts:23`, `apps/api-gateway/src/auth/auth-proxy.controller.ts:25-43`, `apps/auth-service/src/app.module.ts:1-11`
- **Vulnerability:** The api-gateway imports `ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])` and the auth-proxy controller decorates `send-otp` and `verify-otp` with `@Throttle(...)`. However, the `ThrottlerGuard` is never registered as a global `APP_GUARD` provider, and is never applied via `@UseGuards(ThrottlerGuard)`. In NestJS, `@Throttle()` is a no-op metadata decorator unless the guard is wired. The auth-service itself imports no ThrottlerModule at all. Result: there is zero IP-level rate limiting on the OTP endpoints. The only protection is `MAX_ATTEMPTS=5` in `auth.service.ts:24` keyed by `phone`, which (a) only kicks in on `verify-otp`, and (b) does NOT block `send-otp` — `generateOtp` checks attempts but does not increment them, so an attacker can hit `/auth/send-otp` indefinitely against any phone number, generating SMS at the operator's expense (Mobizon billing) or DoS-ing legitimate users by exhausting Telegram Gateway quotas.
- **Impact:** Toll-fraud / SMS bombing (cost to KEX), DoS of legitimate users, Telegram Gateway rate-limit lockout, and amplification: an attacker can also hit `/auth/verify-otp` repeatedly with random codes against any phone, locking that user out for 15 minutes (`BLOCK_DURATION_SEC=900`). With 6-digit OTP space (10^6) and 5 attempts per 15-minute window per phone, a brute force completes in (~1 day) for a single phone, but with no IP rate limit an attacker can parallelize across phones.
- **Fix:** Add `{ provide: APP_GUARD, useClass: ThrottlerGuard }` in `api-gateway/src/app.module.ts`. Apply per-IP throttling in the auth-service module too (the gateway can be bypassed if 3001 is exposed). Lower `send-otp` to 1 / 60s / IP. Increment attempts inside `generateOtp` so phone-level limits apply to send too, not just verify.

### CRITICAL [CWE-639 / OWASP A01:2021] Notification PATCH/markAsRead ignores tenant boundary; FCM token register has no userId verification
- **File:** `apps/api-gateway/src/notifications/notification.service.ts:43-48, 150-155`, `apps/api-gateway/src/notifications/notification.controller.ts:33-46`
- **Vulnerability:**
  1. `unregisterToken` does `updateMany({ where: { fcmToken } })` with no `userId` scoping — any authenticated user who learns or guesses another user's FCM token can disable that user's push notifications.
  2. `registerToken` upserts on the unique `fcmToken` field and overwrites `userId` to `req.user.sub`. An attacker who learns another user's FCM token can call `POST /notifications/register-token` with their own JWT and that token, "stealing" all future push notifications for that token (the Firebase target device will receive notifications addressed to attacker's user). NotificationLog rows will then be written for the attacker's userId. Also, the NotificationService stores `data` as a JSON column with revenue / threshold / amount — the InternalNotificationController accepts arbitrary `payload: Record<string, unknown>` (line 24-31 of `notification.dto.ts`) without depth/size limits.
  3. `markAsRead` uses `where: { id: notificationId, userId }` which is correct, but `getUserNotifications` returns the entire row including the `data` JSON containing revenue figures — fine when scoped to the user, but the NotificationService also has `sendToRole(role, ...)` with no `tenantId` clause (`notification.service.ts:118-131`), so an alert about TOO "Burger na Abaya" revenue goes to every OWNER across every tenant.
- **Impact:** Cross-tenant notification leakage: OWNER of tenant A receives push + persisted log entry containing revenue numbers of tenant B. FCM token hijack lets attacker re-route victim's notifications.
- **Fix:**
  - `unregisterToken`: require `userId` and add to `where`. Or expose only via authenticated route and read userId from JWT (currently it does — but the service method itself is too permissive).
  - `registerToken`: before upsert, if `existing.userId !== req.user.sub`, refuse / 403.
  - `sendToRole`: add `tenant: { id: tenantId }` to the `findMany` and propagate `tenantId` from the trigger payload.
  - Validate `payload` size (max ~10KB) and reject deeply nested JSON in `InternalTriggerDto`.

---

## HIGH

### HIGH [CWE-352 / OWASP A05:2021] CORS `origin: '*'` with `credentials: true` on auth-service
- **File:** `apps/auth-service/src/main.ts:11-16`
- **Vulnerability:** `app.enableCors({ origin: '*', credentials: true })` is invalid per the CORS spec (browsers will reject `*` when credentials are true) — but if the auth-service is exposed and reachable from a browser context (it is, on `0.0.0.0:3001`), this still allows any origin to fire credentialed XHR. More importantly, `*` lets any origin read responses if a client misconfigures `credentials: 'omit'`. OTP-related endpoints (`/auth/send-otp`, `/auth/verify-otp`, `/auth/refresh`) are reachable by any origin. The api-gateway gets this right (`apps/api-gateway/src/main.ts:20-28` uses regex localhost / specific prod hostname).
- **Impact:** A malicious site visited by an authenticated user / dev can call `/auth/send-otp` against arbitrary phones (toll fraud), or replay a stolen refresh token. `verify-otp` requires the OTP, but enables CSRF-style probing.
- **Fix:** Tighten to a specific allow-list. The auth-service should normally not be reachable from the browser at all — only the gateway calls it. Drop `enableCors` entirely if the service is internal, or mirror the gateway's regex.

### HIGH [CWE-501] Public refresh endpoint without rate limit
- **File:** `apps/api-gateway/src/auth/auth-proxy.controller.ts:45-50`, `apps/auth-service/src/auth/auth.service.ts:200-221`
- **Vulnerability:** `POST /auth/refresh` is intentionally unauthenticated (must be — JWT is expired) and accepts a 36-char random UUID refresh token. The endpoint has NO `@Throttle` decorator at the gateway and ThrottlerGuard is not enabled anyway (see CRITICAL above). An attacker can brute-force-guess refresh tokens at ~30 RPS (network limit). 122 bits of entropy makes guessing infeasible in practice, but the same endpoint is also useful for token-validity probing and there is no audit log on failed refresh attempts (compare `verifyOtp` which writes an audit log).
- **Impact:** No exploitable brute force, but no throttle / no failed-refresh audit means token-stuffing attempts are invisible. An attacker who steals one refresh token can call refresh endlessly to keep a session alive across user logouts (logout deletes the *current* refreshToken — but if the attacker rotates first, they keep going).
- **Fix:** Add `@Throttle({ default: { limit: 10, ttl: 60_000 } })` and ensure ThrottlerGuard is registered. Audit-log every refresh (success and failure) with IP + user-agent.

### HIGH [CWE-200] Logout accepts any (or empty) bearer token without erroring
- **File:** `apps/auth-service/src/auth/auth.controller.ts:50-70`
- **Vulnerability:** `logout()` swallows JWT verification exceptions ("Token expired or invalid — still allow logout"). It then deletes the refresh token from Redis even when the JWT is invalid. Combined with no JWT requirement on the body (only `refreshToken` field), an attacker who learns a victim's refresh token (e.g. via sniffed mobile traffic or compromised SecureStore on jailbroken device) can log the victim out from any client by calling `POST /auth/logout` with no JWT or a forged stub.
- **Impact:** Targeted account-disruption / DoS. Combined with CRITICAL #1 (fallback JWT secret), an attacker who can mint JWTs can also force-logout any user.
- **Fix:** Require valid JWT on logout, or at minimum verify that `payload.sub` matches the userId of the refresh token in Redis before deleting. Audit-log the discrepancy.

### HIGH [CWE-532] OTP code printed to logs in dev bypass mode
- **File:** `apps/auth-service/src/auth/auth.service.ts:83`
- **Vulnerability:** `this.logger.warn(\`[DEV BYPASS] ${phone} — код: ${bypassCode}\`)` writes the bypass OTP and phone to logs at `warn` level. Although guarded by `NODE_ENV !== 'production'`, in staging or QA the logs are typically aggregated to a central system (Sentry, Datadog), giving anyone with log access a working credential.
- **Impact:** Anyone with log read access can log in as any phone in the bypass list (or any phone if `DEV_BYPASS_ALL=true`).
- **Fix:** Do not log the actual code. Log only `[DEV BYPASS] code generated for ${phone}`. Better still: never log phone numbers either — they are PII (also covered below).

### HIGH [CWE-522] Mobizon SMS API key sent in URL query string
- **File:** `apps/auth-service/src/auth/auth.service.ts:425-432`
- **Vulnerability:** `apiKey` is appended to `url.searchParams`, so the secret appears in any HTTP-client logs, server access logs of the upstream API, and any TLS-MITM proxy. The variable is read from env (good), but the transport choice exposes it.
- **Impact:** SMS gateway credential leak via log files. With Mobizon credentials, an attacker can send arbitrary SMS at KEX's expense.
- **Fix:** Use HTTP header authentication (`X-API-Key: ...` or `Authorization: Bearer`) if Mobizon supports it; otherwise POST the key as a form body. Rotate the key after audit.

### HIGH [CWE-201 / CWE-359] Phone number, role-override, and tenantId logged at INFO level
- **File:** `apps/auth-service/src/auth/auth.service.ts:175-179, 329-352, 391, 421, 439`
- **Vulnerability:** The auth-service logs phone numbers freely:
  - L329: `Создан новый пользователь: ${phone} (tenantId=...)`
  - L351: `Auto-bound ${phone} → tenant ${defaultTenant}`
  - L175: `[DEV BYPASS] Overriding role ${user.role} → OWNER for ${phone}`
  - L391: `Phone ${phone} not on Telegram — falling back to SMS`
  - L439: `SMS отправлено на ${phone}`
- **Impact:** PII accumulation in log aggregator. Combined with audit logs (`AuditLog` table also stores ip + userAgent), a log breach reveals every login event of every user. Under Kazakhstan's "On Personal Data and Their Protection" Law (Закон РК «О персональных данных и их защите»), phone numbers are personal data and must be redacted in non-essential logs.
- **Fix:** Mask phone numbers in logs — e.g. `+7707***018`. Apply same to api-gateway notification.controller logs (`notification.service.ts:40` logs userId + platform — userId is fine, but be careful adding more).

### HIGH [CWE-79 / OWASP A03:2021] Notification InternalTriggerDto accepts arbitrary nested object as payload
- **File:** `apps/api-gateway/src/dto/notification.dto.ts:24-31`, `apps/api-gateway/src/notifications/notification.controller.ts:118-131`
- **Vulnerability:** `payload: Record<string, unknown>` validated only by `@IsObject()`. Inside `handleInternalTrigger` the keys are cast `as string | number` with no type guards. The aggregator-worker fires alerts via this endpoint protected by `INTERNAL_API_SECRET`, but if the secret leaks (env file disclosure, log leak, or worker compromise), the attacker can post arbitrary JSON. NotificationService then writes `body: error.slice(0, 200)` and `data: message.data` into the database — `body` is rendered into push notifications and the persisted `NotificationLog` table.
- **Impact:** With knowledge of `INTERNAL_API_SECRET` (a single shared key, no rotation, also stored in worker env), an attacker can send arbitrary push notifications and persist arbitrary content into the DB displayed in the mobile app — phishing surface to harvest re-auth credentials.
- **Fix:** Replace `IsObject` with a typed DTO per type (`SyncFailurePayloadDto`, `LowRevenuePayloadDto`, etc.) with `@MaxLength` on every string and `@IsNumber()` with bounds on amounts. Prefer mTLS or HMAC signing of the message body over a shared secret. Add a small whitelist of allowed `type` values (already done via `IsIn`, good).

### HIGH [CWE-639] DataAccessInterceptor pattern matching is naive
- **File:** `apps/finance-service/src/common/interceptors/data-access.interceptor.ts:38-66`
- **Vulnerability:** The interceptor builds a regex from each ACCESS_MATRIX key by replacing `:paramName` with `[^/]+`. It returns the first matching key. The match is anchored to `^...$`, but when the `path` includes a query string Nest's `request.path` returns the path-only (good). However, the matrix only enforces 6 routes; everything else falls through with no role check. Critical detail endpoints `/dashboard/brand/:id`, `/dashboard/restaurant/:id`, `/dashboard/legal-entity/:id` are NOT in ACCESS_MATRIX, so the interceptor silently allows any role on them. This contradicts the comment in `dashboard.controller.ts:215, 231, 247, 263` which claims these are "Access: OWNER, FINANCE_DIRECTOR (via DataAccessInterceptor)" — they are not.
- **Impact:** OPERATIONS_DIRECTOR can call `/dashboard/article/:groupId/operations` if the role check is bypassed (gateway also enforces a `@Roles()` decorator on the article-operations route, but the finance-service interceptor is the second line of defense and is broken on the unlisted routes). Defense-in-depth fails.
- **Fix:** Add ALL drill-down routes to ACCESS_MATRIX, or invert the design: maintain an allow-list per role and reject if the path is not in any. Mark `/dashboard/article/:groupId/operations` as OWNER + ADMIN only (it currently is, but only via the gateway).

### HIGH [CWE-352] CORS at finance-service is `origin: true` (reflect any origin)
- **File:** `apps/finance-service/src/main.ts:10-13`
- **Vulnerability:** `app.enableCors({ origin: true, credentials: true })` reflects any incoming Origin header as the CORS allow-origin. Combined with `0.0.0.0:3002` and no auth (see CRITICAL #3), a browser at any origin can fetch finance data with credentials.
- **Impact:** Cross-origin financial data exfil if the service is reachable.
- **Fix:** Lock CORS down to the gateway's hostname or disable CORS entirely on internal services.

### HIGH [CWE-209] Axios error body propagated verbatim to client
- **File:** `apps/api-gateway/src/auth/auth-proxy.service.ts:32-42`, `apps/api-gateway/src/finance/finance-proxy.service.ts:32-44`
- **Vulnerability:** When an upstream service returns an error, `throw new HttpException(axiosErr.response.data as object, axiosErr.response.status)`. This forwards the upstream body verbatim. If the upstream throws a Prisma error (e.g. `PrismaClientKnownRequestError` with `meta` containing column / constraint names) or NestJS dev-mode stack trace, the gateway returns it to the mobile client. NestJS by default does NOT include stack traces in HttpException responses, but Prisma error metadata leaks DB schema details.
- **Impact:** Schema fingerprinting (table / column names), helps craft injection / IDOR. Prod environments without `NODE_ENV=production` may also leak Nest framework stacks.
- **Fix:** In the proxy services, sanitize: forward only `{ statusCode, message }`. Log the full error to Sentry server-side. Verify `NODE_ENV=production` set in deployment.

### HIGH [CWE-770] Pagination limit on operations is unbounded
- **File:** `apps/finance-service/src/dashboard/dashboard.controller.ts:171-186`, `apps/finance-service/src/dashboard/dashboard.service.ts:1400-1460`, `apps/finance-service/src/dashboard/dto/operations.dto.ts` (referenced)
- **Vulnerability:** `@Query('limit') limit?: string` and `@Query('offset')` are forwarded to Prisma `take: limit` / `skip: offset` after `?? 50` defaulting in the service, but no upper bound is enforced. Looking at `OperationsQueryDto`, validation may exist — but the service signature `getArticleOperations(... limit: number = 50)` is the final arbiter. A client can pass `?limit=10000000` and trigger a huge `findMany` with `restaurant.name` join — DoS the DB. The `notification.controller.ts:60-67` correctly clamps `Math.min(100, ...)` — operations does not.
- **Impact:** DoS / memory exhaustion on finance-service / Postgres.
- **Fix:** Add `Math.min(200, limit)` clamp in `getArticleOperations`. Use class-validator `@Max(200)` on `OperationsQueryDto.limit`.

---

## MEDIUM

### MEDIUM [CWE-285] Role-mismatch hardcoded: gateway `@Roles` lists ADMIN where finance interceptor and TZ do not
- **File:** `apps/api-gateway/src/finance/finance-proxy.controller.ts:58, 98, 138, 179, 219, 263, 293, 325, 352, 379, 406`
- **Vulnerability:** The TZ defines 4 roles (Owner, Finance Director, Operations Director, Admin). Admin is not on the access matrix in `data-access.interceptor.ts:18-25` for any route — yet every gateway `@Roles([...])` includes ADMIN. So ADMIN passes the gateway but is then rejected (or allowed) inconsistently downstream. For routes NOT in ACCESS_MATRIX (e.g. brand/restaurant/legal-entity detail), ADMIN gets full read access by default. The TZ-stated "Admin = full access" intent is achieved only by accident.
- **Impact:** Inconsistent enforcement; if ADMIN definition shifts (e.g. tenant-admin vs super-admin), permissions drift silently.
- **Fix:** Document the intended ADMIN scope. Add ADMIN explicitly to ACCESS_MATRIX entries (already partially done). Add an integration test that asserts every authenticated route is reachable by exactly the roles listed in the TZ.

### MEDIUM [CWE-345] Telegram Gateway `checkVerificationStatus` failure falls through to SMS OTP check
- **File:** `apps/auth-service/src/auth/auth.service.ts:133-164`
- **Vulnerability:** When OTP was sent via Telegram (`tg_otp_rid:${phone}` exists in Redis), `checkVerificationStatus(tgRequestId, code)` is called. If it returns `ok: false` OR throws, control falls through to the SMS check (`const savedCode = await this.redis.get(\`otp:${phone}\`)`) — but no SMS code was ever stored, so `savedCode` is null and the check fails. The user is told "Неверный код" and the attempts counter is incremented. This is correct behavior, but: an attacker who can spoof Telegram Gateway responses (or trigger `checkVerificationStatus` to throw) can race with the legitimate flow and force a downgrade. Also, the catch (`L151-153`) only logs at error level — no Sentry / no alert.
- **Impact:** Low. Potentially worth detection for monitoring.
- **Fix:** Send Sentry event on Telegram Gateway failures so attacks surface in monitoring. Consider not falling through — if the user got a Telegram code, only Telegram check is valid.

### MEDIUM [CWE-352] Refresh-token rotation correct but no replay-detection
- **File:** `apps/auth-service/src/auth/auth.service.ts:200-221`
- **Vulnerability:** `refresh()` deletes the old refresh token and issues a new one (good rotation). But there is no notion of "if a stolen refresh token is replayed after rotation, invalidate the entire session family". An attacker who races with the legitimate user (steals the refresh token but the user refreshes before the attacker uses it) is silently locked out — but no alert is raised, and the attacker could have already extracted access tokens during the brief window.
- **Impact:** Session hijacking detection gap.
- **Fix:** Track refresh-token lineage (familyId). If a refresh token is used twice (cache the deletion), invalidate every refresh token in the family and emit an alert.

### MEDIUM [CWE-862] notification list endpoint returns `data` JSON unfiltered
- **File:** `apps/api-gateway/src/notifications/notification.service.ts:135-148`
- **Vulnerability:** `notifications.findMany` returns the entire `data` JSON column. For LARGE_EXPENSE alerts this includes the full amount; for LOW_REVENUE alerts the threshold and amount. An OPERATIONS_DIRECTOR who is supposed to see only their own restaurant indicators can see notification log entries with revenue numbers from other restaurants if they are sent to the OPERATIONS_DIRECTOR role broadly (see CRITICAL #5). Even within a single tenant, the per-user filter `where: { userId }` is correct, but `sendToRole` writes a NotificationLog row PER USER, so if `userId` is the OPERATIONS_DIRECTOR's, the row is theirs. The data leaks across roles only via incorrect targeting (already covered).
- **Impact:** Same as CRITICAL #5 — covered there.
- **Fix:** See CRITICAL #5.

### MEDIUM [CWE-117] Sentry context includes raw error message
- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` and `onec/onec-sync.service.ts` various `Sentry.setContext` calls
- **Vulnerability:** Some Sentry payloads include `dateFrom.toISOString()`, `dateTo.toISOString()`, restaurant id, etc. Not sensitive on its own, but ONE_C base URLs and possibly basic-auth credentials can land in error messages because `error.message` from Axios sometimes includes the URL with the basic-auth user inlined. Audit the actual `error.message` strings.
- **Impact:** Potential credential leak to Sentry SaaS.
- **Fix:** Configure Sentry `beforeSend` hook to strip Authorization / Basic-auth from URLs in any `request` context. Never log the auth header.

### MEDIUM [CWE-1004] Mobile stores user object as plain JSON in SecureStore
- **File:** `apps/mobile-dashboard/src/services/auth.ts:12-34, 64-72`
- **Vulnerability:** Tokens stored in SecureStore (good — Keychain/Keystore backed). On web platform, falls back to `localStorage` (bad — XSS-readable). The user object including phone, role, tenantId is stored alongside tokens; this is fine on native, problematic on web. The mobile-dashboard is React Native + Expo so the web fallback is only hit by Expo's web preview or developers using Metro web — but if web is ever shipped, all auth state is XSS-stealable.
- **Impact:** If a web build is published, XSS yields full session takeover.
- **Fix:** Either (a) refuse to run on web (`Platform.OS === 'web'` early-return in App.tsx with a "mobile only" notice), or (b) use httpOnly cookies + an OAuth-style flow on web. Currently no web build is released, so this is medium priority.

### MEDIUM [CWE-345] FCM token endpoint: type mismatch between client and server
- **File:** `apps/mobile-dashboard/src/services/api.ts:288-291`, `apps/api-gateway/src/notifications/notification.controller.ts:35-46`, `apps/api-gateway/src/dto/notification.dto.ts:3-11`
- **Vulnerability:** Mobile sends `body: { token: fcmToken, platform }` (api.ts:289), but the server DTO `RegisterTokenDto` requires `fcmToken`. With `forbidNonWhitelisted: true` ValidationPipe, the request will be rejected — but the *other* registration call site `notifications.ts:16-19` sends `fcmToken` correctly. So one path is broken. Bigger issue: the broken call from `api.ts` would attempt to register an empty `fcmToken` (validation rejects it). Less severe than it seems but indicates the contracts are out of sync — a stale build could send `token` accidentally and skip registration silently.
- **Impact:** Silent breakage; low security impact directly.
- **Fix:** Align field names (`fcmToken`) across mobile call sites.

### MEDIUM [CWE-208] OTP attempts counter uses phone only — bypassable via phone normalization
- **File:** `apps/auth-service/src/auth/auth.service.ts:69-80, 122-131`, `apps/auth-service/src/auth/dto/auth.dto.ts:1-20`
- **Vulnerability:** `Matches(/^\+7\d{10}$/)` enforces canonical Kazakhstan format on input — good. But within Redis the key is `otp_attempts:${phone}`. There is no IP-based throttle. An attacker who tries 5 OTPs against `+77074408018` is locked out for 15 minutes BUT can immediately attack `+77074408019`, `+77074408020`, etc. — with no IP rate limit (see CRITICAL #4) the entire user base can be probed in parallel.
- **Impact:** Mass-account discovery: attacker can determine which phone numbers are registered (existing user → OTP sent, new user → OTP sent + auto-creation; both succeed but admin can correlate via the auto-creation log).
- **Fix:** Add IP-keyed throttle (`otp_attempts_ip:${ip}`) on top of phone-keyed.

### MEDIUM [CWE-918] OData filter uses unencoded date strings
- **File:** `apps/aggregator-worker/src/onec/onec-sync.service.ts:80-83, 206-208, 319-321, 419-421`
- **Vulnerability:** `filter = \`Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'\``. Date strings come from `new Date().toISOString().split('T')[0]` which is server-generated, so injection is not exploitable today. But the pattern is risky — if `dateFrom` were ever wired to user input (e.g. backfill UI), single quotes in the value would close the OData literal and inject.
- **Impact:** None today; latent risk.
- **Fix:** Validate/sanitize date strings as strict `^\d{4}-\d{2}-\d{2}$` before interpolation, or use OData parameterization.

### MEDIUM [CWE-352] Swagger UI exposed at `/api/docs` in all environments
- **File:** `apps/api-gateway/src/main.ts:30-37`
- **Vulnerability:** Swagger endpoint is wired unconditionally. In production this exposes the full API surface, including internal-secret-protected `/internal/notifications/trigger`. Combined with the per-endpoint summaries in Russian describing OWNER-only flows, it's a roadmap for attackers.
- **Impact:** Information disclosure; aids targeted attack.
- **Fix:** Gate `SwaggerModule.setup` behind `if (process.env.NODE_ENV !== 'production')`. Or protect with basic-auth.

### MEDIUM [CWE-352] Sample admin/owner phone numbers committed in seed.ts
- **File:** `packages/database/seed.ts:43-82, 399-402`
- **Vulnerability:** Hard-coded test phones (+77074408018 → ADMIN, +77000000001 → OWNER, etc.) are seeded automatically. If `npm run seed` is ever invoked against production by mistake, an attacker who knows one of these numbers gets full ADMIN/OWNER access via OTP. The README/seed output also documents the credentials.
- **Impact:** Production privilege escalation if seed runs in prod.
- **Fix:** Wrap seed in `if (process.env.NODE_ENV === 'production') throw new Error('refusing to seed in prod')`. Use random UUIDs / random phones, and don't print them.

---

## LOW

### LOW [CWE-209] Console.log on bootstrap reveals service binding
- **File:** `apps/api-gateway/src/main.ts:41-42`, `apps/finance-service/src/main.ts:26`, `apps/auth-service/src/main.ts:28`
- **Vulnerability:** `console.log(\`Swagger: http://localhost:${port}/api/docs\`)` and similar. Minor.
- **Fix:** Use logger; or remove.

### LOW [CWE-200] iiko-auth.service uses GET-with-password-hash in URL
- **File:** `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:60-66`
- **Vulnerability:** SHA1 of password sent as URL query parameter (`pass=...`). Required by iiko Server API per the documented contract — unavoidable. SHA1 is a weak hash but the password is server-side and used only for iiko auth; iiko mandates this. Worth documenting and ensuring HTTPS-only.
- **Fix:** Confirm `IIKO_SERVER_URL` is `https://` (the bootstrap throws if env missing but does not validate scheme). Add a runtime check.

### LOW [CWE-307] No alert on consecutive auth failures for a single user
- **File:** `apps/auth-service/src/auth/auth.service.ts:117-183`
- **Vulnerability:** When `MAX_ATTEMPTS` is reached the account is locked for 15 minutes. No notification is sent to the user, no Sentry event raised, no admin notification. Repeated lockouts indicate active attack and should escalate.
- **Fix:** Send a push notification to the user on lockout; emit Sentry event for >3 lockouts on same phone in 24h.

### LOW [CWE-352] mobile App.tsx loads JWT into state without verifying expiry
- **File:** `apps/mobile-dashboard/src/store/auth.ts:23-39`
- **Vulnerability:** On bootstrap the token is taken from SecureStore and trusted. If the device clock is wrong the token may be expired but the app behaves as authenticated until first 401 round-trip. Not a security vulnerability per se but a UX-meets-trust concern.
- **Fix:** Decode JWT and check `exp` before setting `isAuthenticated: true`; otherwise force refresh.

### LOW [CWE-117] notification.service.ts logs userId on every register
- **File:** `apps/api-gateway/src/notifications/notification.service.ts:40`
- **Vulnerability:** `this.logger.log(\`FCM token registered for user ${userId} (${platform})\`)`. UserId is fine in logs (UUID, not PII), but combined with future log additions could identify a user. Low risk.
- **Fix:** Already acceptable; flag if more PII fields creep in.

---

## Summary

| Severity     | Count |
|--------------|------:|
| Critical     |     5 |
| High         |    11 |
| Medium       |    11 |
| Low          |     5 |
| **Total**    | **32** |

**Top 5 fixes to land first:**
1. Remove `'fallback-secret'` JWT default (CRITICAL #1).
2. Wire `tenantId` into every detail-endpoint Prisma query (CRITICAL #2).
3. Add JWT validation or HMAC-shared-secret on finance-service (CRITICAL #3).
4. Register `ThrottlerGuard` as `APP_GUARD`; add IP-keyed throttle to `send-otp` (CRITICAL #4).
5. Scope FCM register/unregister and `sendToRole` by tenant + verify token ownership (CRITICAL #5).

Once these are landed the codebase will move from "exploitable in minutes" to "well-defended." `npm audit fix` per workspace closes the dependency CVEs.
