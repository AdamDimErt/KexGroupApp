# Codebase Concerns

**Analysis Date:** 2026-05-02

## Tech Debt

**Large Dashboard Service File:**
- Issue: `apps/finance-service/src/dashboard/dashboard.service.ts` is 2010 lines, containing 25+ raw SQL queries and complex business logic in a single file
- Files: `apps/finance-service/src/dashboard/dashboard.service.ts` (lines 1-2010)
- Impact: Difficult to test, maintain, and reason about; changes risk breaking multiple drill-down levels; testing requires full integration setup
- Fix approach: Refactor into separate services:
  - `queries.service.ts` — raw SQL queries for revenue/expenses/allocations
  - `calculations.service.ts` — financial math (cost allocation coefficients, planning, margins)
  - `formatters.service.ts` — DTO building and presentation logic
  - Keep `dashboard.service.ts` as orchestrator only

**Stub Period Comparison (changePercent):**
- Issue: `changePercent` field always returns 0 in all drill-down levels (line 832 of dashboard.service.ts)
- Files: `apps/finance-service/src/dashboard/dashboard.service.ts:832` ("// TODO: compare with previous period")
- Impact: "Синхронизация" (delta/trend chip) on mobile dashboard shows 0% always, no period-over-period insight
- Fix approach: Implement period comparison logic (requires storing previous period baseline, already calculated for planning)

**Hard-coded HTTP Fallback URL:**
- Issue: `alert.service.ts` falls back to `http://localhost:3000` if API_GATEWAY_URL env var not set (line 160)
- Files: `apps/aggregator-worker/src/alert/alert.service.ts:160`
- Impact: If env var missing, alerts in production would fail silently and try localhost
- Fix approach: Throw error instead of falling back; require explicit configuration

**Missing iiko Server API Error Handling:**
- Issue: iiko-sync.service uses both XML response parsing and circuit breaker, but XML parsing errors are not caught within try/catch blocks for all endpoints
- Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` (lines 155-175 in syncOrganizations)
- Impact: Malformed XML from iiko could crash entire sync job without per-endpoint fallback
- Fix approach: Wrap all `xmlParser.parse()` calls in individual try/catch with Sentry logging

**1C Sync Credentials Dormant:**
- Issue: 1C OData integration exists but credentials are not provisioned in `.env`; sync runs but fails silently with per-record try/catch
- Files: `apps/aggregator-worker/src/onec/onec-sync.service.ts` (multiple sync methods check for ONEC_USER/ONEC_PASSWORD)
- Impact: No 1C data (HQ expenses, kitchen purchases) synced; finance dashboard incomplete without kitchen expenses
- Fix approach: Document required 1C credentials in `.env.example` and add explicit startup check in aggregator bootstrapping

---

## Known Bugs (Resolved)

**BUG-11-1 CRITICAL (FIXED 2026-04-20):**
- Root cause: Render-layer unit contract mismatch in mobile dashboard
- Symptom: Margin percentages displayed as 7000%+ instead of 70%
- Fix: Moved `formatMargin` and `formatDelta` to `utils/brand.ts` with correct contract (values already in 0-100 range, not 0-1)
- Files: `apps/mobile-dashboard/src/screens/RestaurantDetailScreen.tsx` (before), `apps/mobile-dashboard/src/utils/brand.ts` (after)

**BUG-11-2 CRITICAL (FIXED 2026-04-20):**
- Root cause: Brand names not matched to badge codes (BNA/DNA/JD/SB/KEX)
- Symptom: All brands displayed without proper branding badges
- Fix: Added `BRAND_MAP` lookup + keyword fallback; 4 new brand color tokens in design system
- Files: `apps/mobile-dashboard/src/utils/brand.ts:1-50` (BRAND_MAP), `apps/mobile-dashboard/src/theme/colors.ts` (tokens)

**BUG-11-3 CRITICAL (FIXED 2026-04-20):**
- Root cause: Brand.type enum not populated; "Цех" (kitchen/production) shown as dashboard tile
- Symptom: 5 brands expected, 6 showing (kitchen included)
- Fix: Added Brand.type=RESTAURANT filter in `getDashboardSummary`; worker upserts type on sync
- Files: `apps/finance-service/src/dashboard/dashboard.service.ts:202` (filter), `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:200-210` (upsert)

**BUG-11-8 HIGH (FIXED 2026-04-20):**
- Root cause: Single bad 1C OData record aborts entire sync batch
- Symptom: One malformed expense line breaks all 1C integration
- Fix: Wrapped sync operations in per-record try/catch + Sentry logging
- Files: `apps/aggregator-worker/src/onec/onec-sync.service.ts:89-130` (syncExpenses pattern), similar in 3 other methods

---

## Security Considerations

**Environment Variable Exposure in Code:**
- Risk: 47 direct `process.env.*` calls spread across codebase; easy to accidentally log or expose secrets
- Files: Multiple files including `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:52`, `apps/auth-service/src/auth/auth.service.ts:30-39`
- Current mitigation: Secrets (.env, .env.local) listed in .gitignore
- Recommendations: 
  - Use ConfigService injection consistently (already done for most NestJS services)
  - Audit process.env calls and replace with ConfigService where possible
  - Add pre-commit hook to prevent `process.env` in non-config files

**Type Casting with `as any`:**
- Risk: Single `as any` cast in JWT guard bypasses type safety
- Files: `apps/api-gateway/src/guards/jwt-auth.guard.ts:25` ("(req as any).user = ...")
- Current mitigation: JwtService.verify validates JWT structure
- Recommendations: Type guard instead of cast; define req.user type on Express Request

**Password Hashing in iiko Auth:**
- Risk: IIKO_PASSWORD hashed with SHA1 (line 60 of iiko-auth.service.ts) — SHA1 is cryptographically broken
- Files: `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:60`
- Current mitigation: SHA1 is required by iiko Server API spec, not user-facing password
- Recommendations: Document this iiko API requirement; consider API version upgrade if available

**Missing CORS/CSRF Protection in Gateway:**
- Risk: API Gateway doesn't show explicit CORS configuration in code
- Files: `apps/api-gateway/src/` (needs verification in main.ts or middleware)
- Current mitigation: Need to check if NestJS default CORS or custom config applied
- Recommendations: Verify CORS whitelist explicitly set, not relying on defaults

---

## Performance Bottlenecks

**Heavy Use of Raw SQL Queries (25+ in dashboard.service):**
- Problem: Dashboard service makes 25+ raw SQL queries per drill-down call; multiple aggregate queries on large date ranges
- Files: `apps/finance-service/src/dashboard/dashboard.service.ts` (lines 240, 283, 572, 583, 596, 662, 757, 784, 930, 956, 1079, 1114, 1314, 1334, 1487, 1571, 1651, 1700, 1712, 1840, 1905, 1918, 1956, 1969)
- Cause: 4-level drill-down requires separate queries for revenue, expenses, allocations per level; no caching between requests
- Improvement path:
  - Add Redis caching layer (15-min TTL for immutable date ranges)
  - Pre-aggregate daily snapshots into weekly/monthly views
  - Use database materialized views for common drill-down paths
  - Index on (restaurantId, date, amount) for faster aggregations

**Missing Database Indexes:**
- Problem: Schema has only basic indexes; aggregate queries on FinancialSnapshot and Expense tables may scan table
- Files: `packages/database/schema.prisma:297-299` (Expense indexes only on (restaurantId, date) and (articleId, date))
- Cause: Schema created without comprehensive query analysis
- Improvement path:
  - Add indexes on (date) for date-range queries
  - Composite index on (restaurantId, date) for revenue aggregations
  - Separate index on (articleId, allocationType, date) for expense reports

**Synchronization Bottleneck in Aggregator Worker:**
- Problem: iiko-sync makes sequential requests for brands, restaurants, revenue, expenses, cash (sync schedule lines in CLAUDE.md)
- Files: `apps/aggregator-worker/src/scheduler/scheduler.service.ts` (269 lines, schedule loop)
- Cause: iiko API rate limits and sequential processing of each organization
- Improvement path:
  - Parallelize requests within same data source (Promise.all for non-dependent queries)
  - Implement request batching for revenue reports across multiple date ranges

---

## Fragile Areas

**Timezone Handling in Multiple Layers:**
- Files: 
  - `apps/finance-service/src/dashboard/dashboard.service.ts:70-84` (parseStartDate/parseEndDate)
  - `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:106-116` (formatDate with Almaty offset)
  - `apps/mobile-dashboard/src/utils/brand.ts` (formatSyncTime using date-fns-tz)
- Why fragile: Almaty TZ logic duplicated in 3+ places; process.env.TZ could differ between services; UTC vs local date confusion common
- Safe modification: Create shared utility function in `packages/shared-types` for all TZ conversions; enforce single source of truth
- Test coverage: Phase 11 added date-fns-tz tests but integration tests (mobile + backend TZ sync) incomplete

**Cost Allocation Engine Formula:**
- Files: `apps/aggregator-worker/src/allocation/allocation.service.ts` (202 lines), `apps/finance-service/src/dashboard/dashboard.service.ts:130-180`
- Why fragile: Formula must match exactly between aggregator (calculation) and dashboard (query); TODO comment at line 135 indicates calculation recomputes every request instead of reading from CostAllocation table
- Safe modification: Always test that dashboard.coefficient == allocator.coefficient for same (restaurantId, periodStart, periodEnd); add assertion
- Test coverage: Phase 4 VERIFICATION shows no cost allocation regression tests

**iiko Organization Structure Resolution:**
- Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:178-210` (brand resolver)
- Why fragile: Walks parent chain through JURPERSON nodes without hardcoded mappings; if iiko changes node types or hierarchy, resolution breaks silently
- Safe modification: Add exhaustive logging on unresolved nodes; add alerting for high unresolved ratio; unit tests with fixtures covering JURPERSON chains
- Test coverage: iiko-sync.service.spec.ts has 40K lines but resolver chain tests may not cover all node types

**OTP Verification in Auth Service:**
- Files: `apps/auth-service/src/auth/auth.service.ts:69-100` (generateOtp, dev bypass at lines 80-88)
- Why fragile: DEV_BYPASS_ALL=true in non-prod allows ANY phone to login with hardcoded code; one misconfigured env var breaks auth
- Safe modification: Never default DEV_BYPASS_ALL; log all bypass attempts to Sentry; code review all auth config changes
- Test coverage: No explicit tests for dev bypass boundary conditions visible in grep

---

## Broken Patterns

**Inconsistent API Route Prefixes:**
- Issue: Some routes use `/api/` prefix (Swagger), some don't; proxy may drop or double prefix
- Files: `apps/api-gateway/src/finance/finance-proxy.controller.ts:20` ('@Controller("finance")' — no /api), swagger docs in main.ts
- Impact: External clients may have routes like `/finance/dashboard` vs `/api/finance/dashboard`
- Fix: Standardize all controller routes to include prefix or define globally in gateway bootstrap

**Async/Await Without Error Context:**
- Issue: Many `await` calls in loops without per-iteration error handling (especially in sync services)
- Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` (loops 200-350, syncRestaurants for each brand), `apps/aggregator-worker/src/onec/onec-sync.service.ts:89-130` (fixed in BUG-11-8)
- Impact: One failed restaurant sync could abort entire brand sync (if not wrapped in try/catch)
- Fix: Ensure every async loop has per-item try/catch with Sentry error reporting

---

## Scaling Limits

**Single Tenant Architecture:**
- Current: Codebase assumes single tenant (KEX GROUP); tenant resolution from DB or env var
- Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:83-104` (getTenantId caching)
- Limit: Adding 2nd tenant requires schema migration (no tenant_id on many tables) and code audit for hardcoded "default" assumptions
- Scaling path: Add optional tenant_id to Brand, Restaurant, FinancialSnapshot; support multi-tenant queries throughout dashboard service

**Redis Single Instance:**
- Current: All services connect to single Redis for auth tokens, OTP, circuit breaker state
- Files: `apps/aggregator-worker/src/iiko/iiko-auth.service.ts:24-25` (Redis from process.env.REDIS_URL)
- Limit: Single Redis instance becomes bottleneck if multiple services scale; no replication configured
- Scaling path: Add Redis Sentinel or Cluster support; implement request-level caching invalidation

**PostgreSQL Schema per Service (implicit):**
- Current: Two schemas (auth, finance) in single PostgreSQL instance
- Files: `packages/database/schema.prisma` (@@schema("auth"), @@schema("finance"))
- Limit: Any database maintenance (backup, restore, migration) affects both services
- Scaling path: Separate PostgreSQL instances per schema; implement cross-DB foreign key emulation if needed

---

## Dependencies at Risk

**iiko Server API vs Cloud API Confusion:**
- Risk: Codebase uses iiko "Server API" (REST, XML responses, token-based auth) but spec mentions "iiko Cloud API" (OData, JSON)
- Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:155-160` (Server API calls), CLAUDE.md mentions Cloud API
- Impact: Different rate limits, auth schemes, endpoint stability between APIs; easy to confuse when adding new endpoints
- Migration plan: Decide API version for MVP; document which endpoints from which API are used; add API version check in sync job

**date-fns-tz Version Pinning:**
- Risk: date-fns-tz introduced in Phase 11 for TZ handling; old version of date-fns could break toZonedTime
- Files: `apps/mobile-dashboard/package.json` (date-fns@^3, date-fns-tz@^3), `apps/mobile-dashboard/src/utils/brand.ts` (toZonedTime calls)
- Impact: Minor version bump to date-fns-tz could introduce breaking changes
- Migration plan: Add integration test for TZ rendering at current date; pin to exact version if production-critical

---

## Missing Critical Features

**No Health Check Endpoints:**
- Problem: Aggregator worker has no `/health` route; deployment script in deploy-backend.yml checks `https://api.kexgroup.kz/health` but only on API Gateway
- Files: `apps/aggregator-worker/src/main.ts` (no health route visible), `.github/workflows/deploy-backend.yml:40`
- Impact: No way to verify aggregator is alive; sync failures could go unnoticed until dashboard shows stale data
- Fix: Add `@Get('health')` with sync job status; include last_sync_timestamp

**No Graceful Shutdown for Sync Jobs:**
- Problem: Aggregator worker runs scheduled jobs without shutdown handler; stopping container mid-sync could corrupt state
- Files: `apps/aggregator-worker/src/scheduler/scheduler.service.ts` (no onModuleDestroy visible)
- Impact: Rapid redeploys could leave partial syncs in database (e.g., brands imported but not restaurants)
- Fix: Add graceful shutdown with job cancellation and transaction rollback

**No Role-Based Field Masking:**
- Problem: Dashboard API returns full DTOs; frontend filters sensitive fields (e.g., cost allocation for non-FIN_DIRECTOR)
- Files: `apps/api-gateway/src/finance/finance-proxy.controller.ts` (role checks visible but DTO masking on backend missing), `apps/mobile-dashboard/src/screens/*` (component-level checks)
- Impact: Admin API consumers could accidentally expose field names in docs; filtering on client-side not auditable
- Fix: Implement role-based DTO mapper on backend; return only fields user is authorized to see

---

## Test Coverage Gaps

**Dashboard Service Drill-Down Queries Lightly Tested:**
- What's not tested: Full 4-level drill-down with cost allocation; restaurant detail at Level 3; article detail at Level 4
- Files: `apps/finance-service/src/dashboard/dashboard.service.spec.ts:1112` (pre-fix duplicate guard comment indicates test stubs)
- Risk: Regression in drill-down SQL could go unnoticed (bug-11-1 was render-layer, not query layer)
- Priority: High — drill-down is core feature, affects all user roles

**iiko XML Parsing Error Cases:**
- What's not tested: Malformed XML responses; missing fields in XML; truncated responses
- Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts:162-171` (xmlParser.parse without error boundary in tests)
- Risk: iiko API changes could silently fail parsing
- Priority: High — sync failure impacts entire dashboard

**1C OData Integration:**
- What's not tested: End-to-end 1C sync with real OData responses; credentials missing so integration not runnable
- Files: `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts:10951` (10.9K lines, likely stubs)
- Risk: First real 1C deployment could fail on unexpected response structure
- Priority: Medium — currently dormant until credentials provisioned

**Mobile Timezone Rendering (TZ-Safe Independent of process.env.TZ):**
- What's not tested: Emulator/device with different system TZ; verify formatSyncTime outputs Asia/Almaty time regardless of phone TZ
- Files: `apps/mobile-dashboard/src/utils/brand.ts` (formatSyncTime), no explicit TZ environment override test
- Risk: Timestamp display could vary by device locale
- Priority: Medium — Phase 11 added code but integration test coverage unclear

---

## CI/CD Issues

**No Prod Deployment Validation:**
- Issue: `deploy-backend.yml` checks `/health` only after containers start; no verification that new version is running
- Files: `.github/workflows/deploy-backend.yml:40` (curl check), no version endpoint
- Impact: Failed deployment (e.g., image pull fails, config invalid) could leave broken state; health check could pass on old container if not stopped
- Fix: Add `/version` endpoint returning git SHA; verify it matches deployed commit before success notification

**Mobile OTA Deployment No Rollback Plan:**
- Issue: `deploy-mobile.yml` publishes OTA update immediately; no ability to rollback if update breaks app
- Files: `.github/workflows/deploy-mobile.yml:55-58` (eas update --branch production)
- Impact: Bad OTA reaches all users instantly; only rollback is manual re-release
- Fix: Add phased rollout (5% → 25% → 100%); add Sentry crash monitoring for instant rollback trigger

**Docker Image Caching Strategy Unclear:**
- Issue: `ci.yml` uses `cache-to: type=gha` but no explicit cleanup; old images accumulate in GitHub Actions cache
- Files: `.github/workflows/ci.yml:158-159` (cache configuration)
- Impact: CI pipeline could be slow or fail if cache exceeds GHA limits
- Fix: Add explicit cache cleanup step; document cache retention policy

**No Smoke Tests for Deployment:**
- Issue: CI runs unit tests, but no post-deploy smoke tests (e.g., login flow, dashboard load)
- Files: `.github/workflows/` (no integration test job)
- Impact: Broken API contracts between services could pass CI but fail in production
- Fix: Add `smoke-tests` job after deployment; run against staging, require pass before prod

---

## Schema Correctness Concerns

**Missing Database Migrations History:**
- Issue: Prisma migrations exist (applied in CI.yml) but no audit trail of schema changes over time
- Files: `packages/database/schema.prisma`, `packages/database/migrations/` (not visible in grep, but referenced in CI)
- Impact: Debugging data corruption requires schema history
- Fix: Document schema changelog; add migration comments with business context

**Decimal Precision for Financial Amounts:**
- Issue: Amounts use Decimal(15, 2) — supports up to 9999999999999.99 (≈ 10 trillion tenge)
- Files: `packages/database/schema.prisma:287` (Expense), 327 (FinancialSnapshot)
- Impact: Adequate for restaurant expenses, but large chain (5 restaurants × 1M tenge/day × 365 days = 1.8B) fits safely
- Fix: Verify precision sufficient for 5-year forecasts; add check in cost allocation service

**Cost Allocation Coefficient Precision:**
- Issue: Coefficient uses Decimal(10, 6) — supports 9999.999999 (unnecessary), should be Decimal(1, 6) for 0-1 range
- Files: `packages/database/schema.prisma:309` (CostAllocation.coefficient)
- Impact: Minor; wastes storage but no functional impact
- Fix: Document precision assumption in cost allocation service comment

---

*Concerns audit: 2026-05-02*
