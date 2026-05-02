# Hardcoded Values Audit

**Audit date:** 2026-05-02
**Scope:** `apps/**/src/**/*.ts`, `apps/**/src/**/*.tsx`, `packages/**/src/**/*.ts`
**Skipped:** `*.spec.ts`, `*.test.ts`, mock data, `node_modules`, `dist`, `.turbo`, build outputs
**Known false positives skipped:** `apps/mobile-dashboard/src/config.ts` documented Android emulator/iOS sim defaults

---

## Critical

### Database credentials hardcoded as fallback (`postgresql://root:root@127.0.0.1:5434/dashboard`)
Plain-text DB password (`root:root`) committed to source as a fallback for `POSTGRES_URL`. This appears in 4 production code paths. Even though the env-driven path is preferred, the fallback string is a credential that ships with the binary and could connect to a misconfigured DB.

- **File:** `apps/auth-service/src/auth/auth.module.ts:38`
- **Code:** `'postgresql://root:root@127.0.0.1:5434/dashboard';`
- **Severity:** critical
- **Suggested fix:** drop the fallback entirely; throw early if `POSTGRES_URL` is unset (mirror the pattern used for `JWT_SECRET` in `apps/api-gateway/src/app.module.ts:18-20`).

- **File:** `apps/api-gateway/src/notifications/notification.module.ts:22-23`
- **Code:** `config.get<string>('POSTGRES_URL') ?? 'postgresql://root:root@127.0.0.1:5434/dashboard';`
- **Severity:** critical
- **Suggested fix:** same — fail fast on missing env.

- **File:** `apps/finance-service/src/prisma/prisma.service.ts:15-16`
- **Code:** `process.env.POSTGRES_URL ?? 'postgresql://root:root@127.0.0.1:5434/dashboard';`
- **Severity:** critical
- **Suggested fix:** remove fallback, throw on missing env.

- **File:** `apps/aggregator-worker/src/prisma/prisma.service.ts:15-16`
- **Code:** `process.env.POSTGRES_URL ?? 'postgresql://root:root@127.0.0.1:5434/dashboard';`
- **Severity:** critical
- **Suggested fix:** remove fallback, throw on missing env.

### JWT_SECRET fallback string (`'fallback-secret'`)
A predictable, weak JWT secret is used if env is unset. If `JWT_SECRET` is ever missing in prod, every issued token becomes trivially forgeable. Note: api-gateway already throws — only auth-service still falls back.

- **File:** `apps/auth-service/src/auth/auth.module.ts:18`
- **Code:** `secret: config.get<string>('JWT_SECRET') ?? 'fallback-secret',`
- **Severity:** critical
- **Suggested fix:** throw on missing `JWT_SECRET`, same as `apps/api-gateway/src/app.module.ts:18-20`. Both services must agree on the secret anyway, so failing fast is safer than diverging fallbacks.

---

## High

### Hardcoded service URL fallbacks (`http://localhost:3001`, `:3002`, `:3000`)
Inter-service URLs default to localhost. If env is unset in a containerized/staging deploy, services will silently call themselves through a non-routable URL instead of failing loud.

- **File:** `apps/api-gateway/src/auth/auth-proxy.service.ts:17`
- **Code:** `config.get<string>('AUTH_SERVICE_URL') ?? 'http://localhost:3001';`
- **Severity:** high
- **Suggested fix:** require `AUTH_SERVICE_URL` env var or document that prod deploy must set it; consider `throw` on missing in prod (`NODE_ENV === 'production'`).

- **File:** `apps/api-gateway/src/finance/finance-proxy.service.ts:17`
- **Code:** `config.get<string>('FINANCE_SERVICE_URL') ?? 'http://localhost:3002';`
- **Severity:** high
- **Suggested fix:** same as above for `FINANCE_SERVICE_URL`.

- **File:** `apps/aggregator-worker/src/alert/alert.service.ts:159-160`
- **Code:** `this.config.get<string>('API_GATEWAY_URL') ?? 'http://localhost:3000';`
- **Severity:** high
- **Suggested fix:** same — require `API_GATEWAY_URL` in prod.

### Hardcoded Redis URL fallback (`redis://localhost:6380` and `:6379`)
Different Redis ports across services (auth-service uses `6380`, aggregator-worker/iiko-auth uses `6379`). Inconsistent fallbacks risk silently splitting state across two Redis instances.

- **File:** `apps/auth-service/src/auth/auth.module.ts:30`
- **Code:** `new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6380'),`
- **Severity:** high
- **Suggested fix:** drop fallback, require `REDIS_URL`.

- **File:** `apps/aggregator-worker/src/alert/alert.service.ts:25`
- **Code:** `const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';`
- **Severity:** high
- **Suggested fix:** drop fallback, require `REDIS_URL`. Note port mismatch with auth-service.

- **File:** `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:24`
- **Code:** `const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';`
- **Severity:** high
- **Suggested fix:** same.

### Hardcoded prod CORS origin (`https://api.kexgroup.kz`)
Production CORS allowlist is a string literal in code. Domain change requires a code change + redeploy.

- **File:** `apps/api-gateway/src/main.ts:22`
- **Code:** `? ['https://api.kexgroup.kz']`
- **Severity:** high
- **Suggested fix:** read from `CORS_ALLOWED_ORIGINS` env (comma-separated list).

### Hardcoded WebSocket URL in web-dashboard (`ws://localhost:3010`)
Tasks dashboard hardcodes the WS endpoint. Will break in any non-local deployment.

- **File:** `apps/web-dashboard/src/components/TasksBoard.tsx:333`
- **Code:** `const WS_URL = 'ws://localhost:3010';`
- **Severity:** high
- **Suggested fix:** read from `import.meta.env.VITE_WS_URL` (Vite app pattern, like `Login.tsx:3` already does for API_URL).

### Hardcoded API URL fallback in web-dashboard Login (`http://localhost:3000`)
Same problem as services — silent fallback to localhost.

- **File:** `apps/web-dashboard/src/components/Login.tsx:3`
- **Code:** `const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';`
- **Severity:** high
- **Suggested fix:** throw early when VITE_API_URL is unset in production builds (vite plugin or check at module load).

### Hardcoded Mobizon SMS domain fallback (`api.mobizon.kz`)
SMS provider domain is hardcoded. Switching providers/regions requires a code change.

- **File:** `apps/auth-service/src/auth/auth.service.ts:417-418`
- **Code:** `this.config.get<string>('MOBIZON_API_DOMAIN') ?? 'api.mobizon.kz';`
- **Severity:** high (low-ish, but it's a 3rd-party endpoint that could change)
- **Suggested fix:** keep env-driven path but document that `MOBIZON_API_DOMAIN` is required in prod, or move the default to a `constants.ts`.

### Hardcoded Google FCM/OAuth URLs
External Google endpoints are hardcoded. Generally safe (Google won't move them), but still better in a constants file for testing/mocking.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:277`
- **Code:** `const url = ` `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send` `;`
- **Severity:** high (low-ish — but blocks unit tests from intercepting cleanly)
- **Suggested fix:** extract to `constants.ts` as `FCM_SEND_URL_TEMPLATE`.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:345-346`
- **Code:** `scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token',`
- **Severity:** high
- **Suggested fix:** move OAuth scope/aud to constants module.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:359`
- **Code:** `const res = await fetch('https://oauth2.googleapis.com/token', {`
- **Severity:** high
- **Suggested fix:** same.

### Hardcoded support email (`support@kexgroup.kz`)
Support email is a string literal. Brand/contact changes require a code change.

- **File:** `apps/mobile-dashboard/src/screens/SettingsScreen.tsx:190`
- **Code:** `void Linking.openURL(` `mailto:support@kexgroup.kz?subject=${subject}&body=${body}` `);`
- **Severity:** high
- **Suggested fix:** put into `apps/mobile-dashboard/src/config.ts` as `SUPPORT_EMAIL`, or env var `EXPO_PUBLIC_SUPPORT_EMAIL`.

---

## Medium

### Default service ports without comment (`3000`, `3001`, `3002`, `3003`)
Listen ports default to numeric literals. Acceptable for dev, but should at least be documented in a constants file.

- **File:** `apps/api-gateway/src/main.ts:39`
- **Code:** `const port = process.env.PORT ?? 3000;`
- **Severity:** medium
- **Suggested fix:** keep env-driven, but consider documenting port allocation in `apps/<service>/README.md` or extracting `DEFAULT_PORT` constant.

- **File:** `apps/auth-service/src/main.ts:26`
- **Code:** `const port = process.env.PORT ?? 3001;`
- **Severity:** medium

- **File:** `apps/finance-service/src/main.ts:24`
- **Code:** `const port = process.env.PORT ?? 3002;`
- **Severity:** medium

- **File:** `apps/aggregator-worker/src/main.ts:24`
- **Code:** `const port = process.env.PORT ?? 3003;`
- **Severity:** medium

### Magic auth/OTP timeouts in `auth.service.ts`
Several time-related literals lack env override.

- **File:** `apps/auth-service/src/auth/auth.service.ts:24-27`
- **Code:** `MAX_ATTEMPTS = 5; BLOCK_DURATION_SEC = 900; OTP_TTL_SEC = 300; REFRESH_TTL_SEC = 2592000;`
- **Severity:** medium
- **Suggested fix:** put behind env vars (`OTP_MAX_ATTEMPTS`, `OTP_BLOCK_DURATION_SEC`, `OTP_TTL_SEC`, `REFRESH_TTL_SEC`) so security/UX tuning doesn't require redeploy. Comments are good but values should be configurable.

### Hardcoded JWT expiry (`'15m'`)
Access token lifetime is fixed in code. Same value everywhere is fine, but should be configurable for dev/test.

- **File:** `apps/auth-service/src/auth/auth.module.ts:19`
- **Code:** `signOptions: { expiresIn: '15m' },`
- **Severity:** medium
- **Suggested fix:** read `JWT_ACCESS_TTL` env var with `'15m'` default.

### Hardcoded throttler config (`{ ttl: 60000, limit: 30 }`)
Rate-limit settings fixed at compile time.

- **File:** `apps/api-gateway/src/app.module.ts:23`
- **Code:** `ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),`
- **Severity:** medium
- **Suggested fix:** put behind `THROTTLE_TTL_MS` and `THROTTLE_LIMIT` env vars.

### Hardcoded HTTP timeouts
Several places have `timeout: 5000`, `30000`, `10_000` baked in. Already partially configurable in `iiko-sync.service.ts` (uses `IIKO_REQUEST_TIMEOUT_MS`); other call sites do not.

- **File:** `apps/aggregator-worker/src/alert/alert.service.ts:168`
- **Code:** `timeout: 5000,`
- **Severity:** medium
- **Suggested fix:** env or constant `INTERNAL_HTTP_TIMEOUT_MS`.

- **File:** `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:64`
- **Code:** `timeout: 30000,`
- **Severity:** medium
- **Suggested fix:** reuse `IIKO_REQUEST_TIMEOUT_MS` already defined in iiko-sync.service.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:302`
- **Code:** `signal: AbortSignal.timeout(10_000),`
- **Severity:** medium
- **Suggested fix:** `FCM_TIMEOUT_MS` env or constant.

- **File:** `apps/auth-service/src/auth/auth.service.ts:432`
- **Code:** `signal: AbortSignal.timeout(10_000),`
- **Severity:** medium
- **Suggested fix:** `MOBIZON_TIMEOUT_MS` env or constant.

### Hardcoded retry counts
`maxRetries = 3` repeated in 4 files. Fine value, but inconsistent: only iiko's circuit breaker is configurable.

- **File:** `apps/aggregator-worker/src/onec/onec-sync.service.ts:544`
- **Code:** `const maxRetries = 3;`
- **Severity:** medium
- **Suggested fix:** unify under env (`HTTP_MAX_RETRIES`) or shared `constants.ts`.

- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1454, 1510`
- **Code:** `const maxRetries = 3;`
- **Severity:** medium

- **File:** `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:54`
- **Code:** `const maxRetries = 3;`
- **Severity:** medium

### Hardcoded backfill window (`WINDOW_DAYS = 30`)
Fixed at 30 days; iiko rate-limit guidance suggests this is correct, but should be documented in env or shared constants.

- **File:** `apps/aggregator-worker/src/app.controller.ts:177`
- **Code:** `const WINDOW_DAYS = 30;`
- **Severity:** medium
- **Suggested fix:** extract to `IIKO_BACKFILL_WINDOW_DAYS` env, fall back to 30. Currently a magic number with no comment about why 30.

### Hardcoded stale-cache threshold (`3600000` = 1 hour)
Cache age threshold for "stale" indicator on mobile.

- **File:** `apps/mobile-dashboard/src/hooks/useOfflineCache.ts:74`
- **Code:** `setIsStale(age > 3600000); // > 1 hour`
- **Severity:** medium
- **Suggested fix:** extract to `apps/mobile-dashboard/src/config.ts` as `STALE_CACHE_THRESHOLD_MS`.

### Hardcoded inactivity timeout (`10 * 60 * 1000`)
Auto-logout duration baked into mobile app.

- **File:** `apps/mobile-dashboard/src/hooks/useInactivityLogout.ts:4`
- **Code:** `const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes`
- **Severity:** medium
- **Suggested fix:** put into `config.ts` so security/UX team can tune via build env without code edit.

### Hardcoded notification page size (`pageSize = 20`)
Default pagination size.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:135`
- **Code:** `async getUserNotifications(userId: string, page = 1, pageSize = 20) {`
- **Severity:** medium
- **Suggested fix:** extract to `DEFAULT_NOTIFICATION_PAGE_SIZE` constant.

- **File:** `apps/mobile-dashboard/src/services/notifications.ts:64`
- **Code:** ``${API_URL}/api/notifications?page=${page}&pageSize=20``
- **Severity:** medium
- **Suggested fix:** same.

### Hardcoded planning periods count (`PLAN_PERIODS = 3`)
Business logic constant — using past 3 periods to compute plan baseline. Fine as a named constant but should be documented as a tunable.

- **File:** `apps/finance-service/src/dashboard/dashboard.service.ts:278`
- **Code:** `const PLAN_PERIODS = 3;`
- **Severity:** medium
- **Suggested fix:** acceptable as named constant (good comment exists), but consider env-overridable so finance can tune without redeploy.

### Hardcoded plan multiplier (`revValue * 1.05`) — STUB
Mobile dashboards compute "planned revenue" as `actual * 1.05`. Code already comments this is a stub. Tracking here for visibility.

- **File:** `apps/mobile-dashboard/src/hooks/useBrandDetail.ts:51`
- **Code:** `const plannedRevenue = revValue * 1.05; // STUB — Phase 11: real plan from finance-service API`
- **Severity:** medium (already flagged in code as STUB)

- **File:** `apps/mobile-dashboard/src/hooks/useRestaurantList.ts:43`
- **Code:** `const plannedRevenue = revValue * 1.05; // STUB — Phase 11: real plan from finance-service API`
- **Severity:** medium

- **File:** `apps/mobile-dashboard/src/hooks/useLegalEntityDetail.ts:34`
- **Code:** `const plannedRevenue = revValue * 1.05; // STUB consistent with useBrandDetail`
- **Severity:** medium

### Hardcoded mobile breakpoint (`768`)
Magic number for mobile detection.

- **File:** `apps/web-dashboard/src/components/ui/use-mobile.ts:3`
- **Code:** `const MOBILE_BREAKPOINT = 768;`
- **Severity:** medium (acceptable — well-named constant, standard responsive breakpoint, but should reference design tokens).

### Hardcoded MAX_BRANDS (`5`)
Magic limit on brand display.

- **File:** `apps/mobile-dashboard/src/hooks/useRestaurantList.ts:77`
- **Code:** `const MAX_BRANDS = 5;`
- **Severity:** medium
- **Suggested fix:** acceptable as named constant — keep as-is or move to `config.ts`.

### Hardcoded "default" tenant fallback
Magic string `'default'` used as tenant id sentinel. Could collide with a real tenant called "default".

- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:87, 101`
- **Code:** `if (process.env.TENANT_ID && process.env.TENANT_ID !== 'default') { ... } this.cachedTenantId = 'default';`
- **Severity:** medium
- **Suggested fix:** use a clearly-impossible sentinel (e.g. `__UNRESOLVED__`) or fail loud if no tenant found in DB.

- **File:** `apps/aggregator-worker/src/allocation/allocation.service.ts:14`
- **Code:** `const tenantId = process.env.TENANT_ID || 'default';`
- **Severity:** medium
- **Suggested fix:** same — resolve from DB like iiko-sync, or throw.

### Hardcoded brand-type heuristic regex
Regex `/цех|kitchen|fabrika/i` decides whether a brand is `KITCHEN` vs `RESTAURANT`. New brand names not matching this list get silently misclassified.

- **File:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1562`
- **Code:** `if (/цех|kitchen|fabrika/i.test(name)) return 'KITCHEN';`
- **Severity:** medium
- **Suggested fix:** extract pattern list to env or DB-stored config so business can add new keywords without redeploy.

### Hardcoded error-message slice lengths
Error truncation lengths embedded in code.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:205-206`
- **Code:** `body: error.slice(0, 200), data: { system, error: error.slice(0, 500) },`
- **Severity:** medium
- **Suggested fix:** extract to constants `FCM_BODY_MAX_LEN = 200`, `FCM_DATA_MAX_LEN = 500`.

### Hardcoded JWT expiry in FCM service-account flow (`now + 3600`)
Google OAuth2 JWT lifetime (1 hour) is hardcoded.

- **File:** `apps/api-gateway/src/notifications/notification.service.ts:348`
- **Code:** `exp: now + 3600,`
- **Severity:** medium
- **Suggested fix:** named constant `GOOGLE_OAUTH_JWT_TTL_SEC = 3600`. (Not a bug — Google requires ≤1h — but should be a named constant.)

### Hardcoded token cache TTL (`55 * 60`)
iiko token cache TTL is fixed.

- **File:** `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:21`
- **Code:** `private readonly tokenCacheTTL = 55 * 60; // 55 minutes`
- **Severity:** medium
- **Suggested fix:** acceptable (good comment), but tie to `IIKO_TOKEN_TTL_SEC` env so it can be tuned if iiko changes their token lifetime.

### Hardcoded sync sliding-window (`-1 day`) and one-day in scheduler
Every sync method does `dateFrom.setDate(dateFrom.getDate() - 1)`. Magic "1 day" lookback baked into 8 cron handlers.

- **File:** `apps/aggregator-worker/src/scheduler/scheduler.service.ts:54, 80, 107, 127, 146, 173, 193, 213, 236`
- **Code:** `dateFrom.setDate(dateFrom.getDate() - 1); // Last 1 day`
- **Severity:** medium
- **Suggested fix:** extract `SYNC_LOOKBACK_DAYS = 1` constant or env. Currently changing the lookback requires editing 8 lines.

### Hardcoded yesterday-allocation offset (`24 * 3600 * 1000`)
Magic "24 hours ago" calculation.

- **File:** `apps/aggregator-worker/src/scheduler/scheduler.service.ts:255`
- **Code:** `const yesterdayInstant = new Date(Date.now() - 24 * 3600 * 1000);`
- **Severity:** medium
- **Suggested fix:** use a date util (project already has `apps/aggregator-worker/src/utils/date.ts`) or named constant `ONE_DAY_MS`.

---

## Low

### Hardcoded `'0.0.0.0'` listen address
All services bind to `0.0.0.0`. Conventional for containerized services but environment-dependent.

- **File:** `apps/auth-service/src/main.ts:27`
- **Code:** `await app.listen(port, '0.0.0.0');`
- **Severity:** low
- **Suggested fix:** acceptable. Could be `LISTEN_HOST` env if extreme flexibility wanted; otherwise leave as-is.

- **File:** `apps/finance-service/src/main.ts:25`
- **Code:** `await app.listen(port, '0.0.0.0');`
- **Severity:** low

- **File:** `apps/aggregator-worker/src/main.ts:25`
- **Code:** `await app.listen(port, '0.0.0.0');`
- **Severity:** low

- **File:** `apps/api-gateway/src/main.ts:40`
- **Code:** `await app.listen(port, '0.0.0.0');`
- **Severity:** low

### Hardcoded localhost regexes in dev-CORS branch
Acceptable for dev, but the regex patterns are inline.

- **File:** `apps/api-gateway/src/main.ts:23`
- **Code:** `: [/^http:\/\/localhost:\d+$/, /^http:\/\/192\.168\.\d+\.\d+:\d+$/];`
- **Severity:** low
- **Suggested fix:** keep as-is (dev-only branch) or extract to `DEV_CORS_PATTERNS` constant for readability.

### Hardcoded Swagger log URL (`http://localhost:${port}/api/docs`)
Console log line, dev convenience only.

- **File:** `apps/api-gateway/src/main.ts:42`
- **Code:** `console.log(` `Swagger: http://localhost:${port}/api/docs` `);`
- **Severity:** low
- **Suggested fix:** acceptable (just a log line). Could read host env var if cosmetic.

### Hardcoded Almaty timezone literal (`'Asia/Almaty'`, `+05:00`, `5 * 3600 * 1000`)
Business timezone is hardcoded across worker code. KEX GROUP is Kazakhstan-only, so this is intentional, but a single source of truth would be cleaner.

- **File:** `apps/aggregator-worker/src/scheduler/scheduler.service.ts:24, 37, 252`
- **Code:** `@Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })`
- **Severity:** low
- **Suggested fix:** extract to `BUSINESS_TIMEZONE` (already exists in `apps/mobile-dashboard/src/config.ts:24` — should mirror in worker).

- **File:** `apps/aggregator-worker/src/utils/date.ts:1`
- **Code:** `const ALMATY_OFFSET_MS = 5 * 3600 * 1000; // UTC+5, no DST`
- **Severity:** low — already a named constant with good comment.

- **File:** `apps/aggregator-worker/src/app.controller.ts:116-117, 161-162`
- **Code:** ``new Date(`${body.dateTo}T23:59:59+05:00`)``
- **Severity:** low
- **Suggested fix:** consider a date helper that takes `BUSINESS_TIMEZONE` env.

- **File:** `apps/finance-service/src/dashboard/dashboard.service.ts:1730`
- **Code:** `const almaty = new Date(dt.getTime() + 5 * 3600_000);`
- **Severity:** low
- **Suggested fix:** centralize timezone offset.

### Hardcoded SecureStore key prefixes (`kex_access_token`, `kex_refresh_token`, `kex_user`)
Keychain key names are string literals. Acceptable, but renaming the brand would require careful migration.

- **File:** `apps/mobile-dashboard/src/services/auth.ts:7-9`
- **Code:** `accessToken: 'kex_access_token', refreshToken: 'kex_refresh_token', user: 'kex_user',`
- **Severity:** low
- **Suggested fix:** acceptable. Could centralize via `STORAGE_PREFIX = 'kex_'` if brand-renaming becomes likely.

### Hardcoded cache prefix (`hv_cache_`)
Mobile offline-cache prefix.

- **File:** `apps/mobile-dashboard/src/hooks/useOfflineCache.ts:14`
- **Code:** `const CACHE_PREFIX = 'hv_cache_';`
- **Severity:** low
- **Suggested fix:** acceptable as named constant.

### Hardcoded Google Fonts URL in CSS-in-JS imports
Web-dashboard imports Plus Jakarta Sans from Google Fonts.

- **File:** `apps/web-dashboard/src/imports/holding-view-login.tsx:213`
- **Code:** `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`
- **Severity:** low
- **Suggested fix:** acceptable; or self-host fonts to remove third-party dependency. Not a security issue.

---

## Summary by Severity

| Severity  | Count |
|-----------|-------|
| Critical  | 5     |
| High      | 12    |
| Medium    | 24    |
| Low       | 11    |
| **Total** | **52** |

## Key Recommendations

1. **Drop production-credential fallbacks immediately.** The `'postgresql://root:root@127.0.0.1:5434/dashboard'` fallback (4 files) and `'fallback-secret'` JWT fallback (1 file) must be removed. Follow the api-gateway pattern: `if (!secret) throw new Error('JWT_SECRET env var is required');`.

2. **Eliminate localhost service URL fallbacks** in `auth-proxy.service.ts`, `finance-proxy.service.ts`, `alert.service.ts`. Either require env in prod (`NODE_ENV` check) or extract a `requireEnv()` helper used everywhere.

3. **Reconcile Redis port mismatch** — auth-service falls back to `:6380`, aggregator-worker to `:6379`. Pick one or, better, drop fallbacks.

4. **Externalize CORS allowlist + WS_URL** so deploy domain changes don't require source edits.

5. **Tunable security knobs in `auth.service.ts`** (MAX_ATTEMPTS, OTP_TTL, REFRESH_TTL, JWT expiry) should be env-driven for incident response without redeploy.

6. **Centralize Almaty timezone constant** — currently scattered as `'Asia/Almaty'`, `+05:00`, `5 * 3600 * 1000`, `5 * 3600_000` across worker + finance-service + mobile.

7. **Centralize HTTP retry/timeout magic numbers** under shared constants or env vars (`maxRetries = 3` in 4 files; varied timeouts in 4 places).
