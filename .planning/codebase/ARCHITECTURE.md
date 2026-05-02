# Architecture

**Analysis Date:** 2026-05-02

## Pattern Overview

**Overall:** Microservices via API Gateway with NestJS backends, React Native mobile frontend, and a worker for external data integration.

**Key Characteristics:**
- **Gateway Pattern**: API Gateway (`apps/api-gateway`) routes authenticated requests to domain services
- **Service Isolation**: Auth, Finance, and Worker services are independently deployable NestJS apps
- **Shared Types**: `@dashboard/shared-types` provides DTOs and enums across all services and clients
- **Database**: Single PostgreSQL with Prisma ORM, shared schema across services
- **Mobile-First**: React Native + Expo for client, no tablet/web variants
- **Background Sync**: Aggregator Worker fetches from iiko Cloud API and 1C OData, stores to DB

## Layers

**Presentation (Mobile Client):**
- Purpose: Render UI and handle user interactions (4-level drill-down navigation)
- Location: `apps/mobile-dashboard/`
- Contains: React Native screens, components, hooks, Zustand stores
- Depends on: API Gateway via fetch/axios (`apps/mobile-dashboard/src/services/api.ts`)
- Used by: End users via Expo (iOS/Android)

**API Gateway:**
- Purpose: Single entry point; routes requests to services; validates JWT tokens; enforces role-based access
- Location: `apps/api-gateway/src/`
- Contains: Proxy controllers (`finance-proxy`, `auth-proxy`), JWT/roles guards, decorators
- Depends on: Auth Service (JWT contract), Finance Service (dashboard endpoints), Notification module
- Used by: Mobile dashboard and any other clients

**Auth Service:**
- Purpose: OTP generation/verification, JWT token issuance, user session management
- Location: `apps/auth-service/src/auth/`
- Contains: Auth controller, service, DTOs
- Depends on: External SMS gateway (Telegram Gateway / Mobizon)
- Used by: API Gateway for token validation

**Finance Service:**
- Purpose: Aggregates financial data from DB (iiko snapshots + 1C expenses), calculates summaries, 4-level drill-downs
- Location: `apps/finance-service/src/dashboard/`
- Contains: Dashboard controller, service with query logic, DTOs
- Depends on: Database (Prisma), Cost Allocation Engine output
- Used by: API Gateway, accessed by Finance Director/Owner roles

**Aggregator Worker:**
- Purpose: Scheduled sync from iiko Cloud API and 1C OData; runs Cost Allocation Engine; stores to DB
- Location: `apps/aggregator-worker/src/`
- Contains: iiko sync service, 1C sync service, allocation engine, scheduler
- Depends on: iiko Cloud API, 1C OData API, database (Prisma)
- Used by: Internal only (no client access)

**Shared Types:**
- Purpose: Single source of truth for DTOs, enums, interfaces
- Location: `packages/shared-types/src/index.ts`
- Contains: `UserRole`, auth DTOs, dashboard DTOs, report DTOs, notification DTOs
- Depends on: None (pure TypeScript)
- Used by: All services and mobile client

**Database Package:**
- Purpose: Prisma schema, client initialization, migrations
- Location: `packages/database/`
- Contains: `schema.prisma`, Prisma client, seed scripts
- Depends on: PostgreSQL
- Used by: Auth Service, Finance Service, Aggregator Worker (read-only for mobile)

## Data Flow

**User Login Flow:**

1. Mobile client calls `POST /api/auth/send-otp` with phone
2. Auth Service sends OTP via SMS gateway, stores verification record in DB
3. Mobile client displays OTP input → calls `POST /api/auth/verify-otp` with code
4. Auth Service verifies code, generates JWT tokens (access + refresh)
5. API Gateway validates JWT on subsequent requests via `JwtAuthGuard`
6. Mobile client stores tokens in AsyncStorage, syncs to Zustand auth store

**Dashboard Data Fetch Flow:**

1. Mobile client calls `GET /api/finance/dashboard?periodType=today&tenantId=X` with Bearer token
2. API Gateway verifies JWT via `JwtAuthGuard` + role via `RolesGuard`
3. Finance Service queries Prisma for:
   - FinancialSnapshot (iiko revenue per restaurant per day)
   - Expense (IIKO/ONE_C entries per article)
   - CostAllocation (coefficient per restaurant)
4. Service aggregates snapshots into BrandIndicatorDto, RestaurantIndicatorDto
5. Mobile client renders dashboard with brands, taps brand → drill-down

**4-Level Drill-Down Navigation:**

1. **Level 1 (Dashboard):** DashboardScreen shows brands + KPIs
2. **Level 2 (Brand):** BrandDetailScreen → shows restaurants under brand + legal entities
3. **Level 3 (Restaurant):** PointDetailScreen → shows expense groups + revenue by day
4. **Level 4 (Article/Operations):** ArticleDetailScreen → shows articles under group → OperationsScreen (OWNER only)

**State Management:**

- Mobile: Zustand stores (`useAuthStore`, `useDashboardStore`) hydrated from AsyncStorage
- Backend: Prisma manages state in PostgreSQL; no in-memory caching except Redis for iiko auth tokens
- Worker: Reads from iiko/1C every 15-60 minutes, writes FinancialSnapshot/Expense/etc to DB

## Key Abstractions

**DTO Pattern (Domain Transfer Objects):**
- Purpose: Decouple API contracts from domain models; shared across services
- Examples: `DashboardSummaryDto`, `BrandIndicatorDto`, `RestaurantDetailDto`
- Location: `packages/shared-types/src/index.ts`
- Pattern: Interfaces with `Dto` suffix; imported by all services; mobile client receives these as JSON

**Prisma Services:**
- Purpose: Database abstraction; lazy-loaded singleton per service
- Examples: `apps/auth-service/src/prisma/prisma.service.ts`, `apps/finance-service/src/prisma/prisma.service.ts`
- Pattern: NestJS Module wraps `@prisma/client`, OnModuleDestroy for cleanup

**Guards (Auth + Roles):**
- Purpose: Enforce authentication and role-based access control
- Files: `apps/api-gateway/src/guards/jwt-auth.guard.ts`, `apps/api-gateway/src/guards/roles.guard.ts`
- Pattern: NestJS CanActivate interface; applied via `@UseGuards()` decorator on controller methods

**Proxy Pattern (API Gateway):**
- Purpose: Route requests to backend services without exposing them
- Files: `apps/api-gateway/src/finance/finance-proxy.controller.ts`, `apps/api-gateway/src/auth/auth-proxy.controller.ts`
- Pattern: Proxy service wraps HttpService; calls backend via internal URL (e.g., `http://finance-service:3002`)

**Cost Allocation Engine:**
- Purpose: Distribute HQ expenses (1C) proportionally by revenue coefficient
- Location: `apps/aggregator-worker/src/allocation/allocation.service.ts`
- Calculation: `coefficient = restaurant_revenue / total_revenue` → allocate by coefficient
- Runs after iiko sync completes (every 15 min for revenue updates)

## Entry Points

**API Gateway:**
- Location: `apps/api-gateway/src/main.ts`
- Triggers: NestFactory.create(AppModule) → listens on port 3000
- Responsibilities: Swagger docs at `/api/docs`, CORS setup, global validation pipe

**Auth Service:**
- Location: `apps/auth-service/src/main.ts`
- Triggers: NestFactory.create(AppModule) → listens on port 3001
- Responsibilities: OTP endpoints, token validation, CORS for mobile

**Finance Service:**
- Location: `apps/finance-service/src/main.ts`
- Triggers: NestFactory.create(AppModule) → listens on port 3002
- Responsibilities: Dashboard endpoints, financial summaries, drill-downs

**Aggregator Worker:**
- Location: `apps/aggregator-worker/src/main.ts`
- Triggers: NestFactory.create(AppModule) → listens on port 3003
- Responsibilities: Health check, runs scheduled jobs (iiko sync, 1C sync, allocation)

**Mobile App:**
- Location: `apps/mobile-dashboard/App.tsx`
- Triggers: Expo start → bootstrap (check tokens, biometric, login screen)
- Responsibilities: Navigation state, screen rendering, push notification setup

**Web Dashboard (Reference Only):**
- Location: `apps/web-dashboard/src/App.tsx`
- Triggers: React client bundled via Vite
- Responsibilities: Desktop mockup (not production, for design reference)

## Error Handling

**Strategy:** Circuit breaker + exponential backoff on external API failures; Sentry for error tracking

**Patterns:**

- **External API (iiko/1C):** Circuit breaker with max failures threshold; reset after 15 minutes; log to Sentry with context (orgId, dateRange)
  - File: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` (CircuitBreakerState map)
- **HTTP Timeouts:** 30 seconds for iiko (RU server latency ~200-500ms from KZ); AbortController on mobile
  - Mobile: `apps/mobile-dashboard/src/services/api.ts`
  - Files: `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` (IIKO_REQUEST_TIMEOUT_MS env)
- **Database Errors:** Prisma throws on constraint violations; caught by NestJS exception filter (returns 400/500)
- **Auth Failures:** 401 UnauthorizedException on invalid JWT; mobile retries with refresh token; if refresh fails, clears tokens and redirects to login
- **Role Violations:** 403 ForbiddenException if user role not in @Roles decorator list

## Cross-Cutting Concerns

**Logging:** 
- Backend: NestJS Logger (console in dev, Sentry in prod)
- Mobile: Sentry SDK initialized at App startup (`App.tsx` line 1-8)
- Worker: All iiko/1C sync errors logged to Sentry with request context

**Validation:**
- Backend: Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`
  - Applied in all main.ts files
- DTOs: Class-validator decorators in `apps/auth-service/src/auth/dto/auth.dto.ts`, etc.
- Mobile: Form validation in PhoneInput, OtpInput components

**Authentication:**
- Mobile: JWT tokens stored in AsyncStorage, attached to all requests via fetch Authorization header
- Backend: JwtAuthGuard extracts bearer token, verifies signature using JWT_SECRET
- Refresh flow: Mobile automatically retries failed requests with refreshed token via `refreshToken()` in api.ts

**Timezone Handling:**
- All stored dates in UTC (Postgres `date` type)
- Finance Service parses client date ranges without TZ shift to avoid off-by-one errors
  - File: `apps/finance-service/src/dashboard/dashboard.service.ts` (parseStartDate/parseEndDate)

---

*Architecture analysis: 2026-05-02*
