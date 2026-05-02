# External Integrations

**Analysis Date:** 2026-05-02

## APIs & External Services

**iiko Cloud/Server API:**
- What: Restaurant POS and operational data (revenue, expenses, cash, inventory)
- Implemented in: `apps/aggregator-worker/src/iiko/`
- Service location: `IikoSyncService` (`apps/aggregator-worker/src/iiko/iiko-sync.service.ts`)
- Auth: `IikoAuthService` (`apps/aggregator-worker/src/iiko/iiko-auth.service.ts`)
- Client: `axios` 1.13.6 via `@nestjs/axios`
- Auth method: `IIKO_SERVER_URL` + `IIKO_LOGIN` + `IIKO_PASSWORD` (SHA1 hash)
- Token handling: Plain text token cached in Redis TTL 55min
- Env vars:
  - `IIKO_SERVER_URL` - Base URL (e.g., https://your-org.iiko.it/resto/api)
  - `IIKO_LOGIN` - Credentials
  - `IIKO_PASSWORD` - Credentials (hashed with SHA1)
  - `IIKO_SYNC_INTERVAL_MINUTES` - Sync frequency
  - `IIKO_REQUEST_TIMEOUT_MS` - HTTP timeout (default 30000ms)
  - `IIKO_CIRCUIT_BREAKER_MAX_FAILURES` - Circuit breaker threshold (default 3)
  - `IIKO_CIRCUIT_BREAKER_RESET_MINUTES` - Reset window (default 15min)
- Implementation details:
  - Circuit breaker pattern with exponential backoff
  - XML response parsing via `fast-xml-parser` 5.5.9
  - Handles iiko types: ORGDEVELOPMENT (brand), DEPARTMENT (restaurant), JURPERSON (legal entity)
  - Payment types: revenueCash, revenueKaspi, revenueHalyk, revenueYandex, other
  - Sync window: 7-30 day batches to stay under rate limits

**1C OData API:**
- What: Accounting data (HQ overhead expenses, kitchen purchases, bank balances)
- Implemented in: `apps/aggregator-worker/src/onec/`
- Service location: `OneCyncService` (`apps/aggregator-worker/src/onec/onec-sync.service.ts`)
- Client: `axios` via `@nestjs/axios`
- Auth method: HTTP Basic Auth (base64 encoded `username:password`)
- Env vars:
  - `ONEC_BASE_URL` - Base URL (e.g., http://1c.company.kz)
  - `ONEC_USER` - Credentials
  - `ONEC_PASSWORD` - Credentials
- Implementation details:
  - OData query protocol ($filter, $select)
  - Expense records: `Document_CashExpense`
  - Purchase records: `Document_GoodsReceipt`
  - Income records: `Document_SalesInvoice`
  - Per-record error handling (one bad record doesn't abort entire sync)
  - HTTP timeout: 30 seconds

## Authentication & Identity

**Auth Provider:**
- Implementation: Custom JWT-based with OTP
- Token storage: Redis (access tokens implicit via stateless JWT, refresh tokens explicit)
- Location: `apps/auth-service/src/auth/`
- Service: `AuthService` (`apps/auth-service/src/auth/auth.service.ts`)
- Access token: 15 minutes (JWT, signed with `JWT_SECRET`)
- Refresh token: 30 days (random UUID, Redis-backed)
- Biometric: Enabled per-user, verified against refresh token
- Env vars:
  - `JWT_SECRET` - Signing key
  - `JWT_ACCESS_TTL` - Access token lifetime
  - `JWT_REFRESH_TTL` - Refresh token lifetime

**OTP Delivery - Telegram Gateway (Primary):**
- Service: Telegram Gateway API (node-telegram-gateway-api 1.2.1)
- Location: `apps/auth-service/src/auth/auth.service.ts`
- Methods:
  - `checkSendAbility(phone)` - Check if phone is on Telegram
  - `sendVerificationMessage(phone, {code_length})` - Initiate OTP
  - `checkVerificationStatus(request_id, code)` - Verify code
- Env vars:
  - `TELEGRAM_GATEWAY_TOKEN` - API token (optional; if unset, SMS-only mode)
- Implementation: Try Telegram first, fallback to SMS if unavailable

**OTP Delivery - SMS Fallback (Mobizon):**
- Service: Mobizon SMS API
- Location: `apps/auth-service/src/auth/auth.service.ts`, `sendSms()` method
- Protocol: HTTPS GET with URL params
- Endpoint: `https://{MOBIZON_API_DOMAIN}/service/message/sendsmsmessage`
- Env vars:
  - `MOBIZON_API_KEY` - API key (optional; if unset, logs to console in dev)
  - `MOBIZON_API_DOMAIN` - API domain (default: api.mobizon.kz)
- Dev bypass:
  - `DEV_BYPASS_PHONES` - Comma-separated phone list
  - `DEV_BYPASS_CODE` - Hardcoded code for dev testing (default: 111111)
  - `DEV_BYPASS_ALL` - Enable bypass for all non-prod numbers (true/1/*)
  - Note: Production always disables bypass regardless of config

**Biometric Authentication:**
- Platforms: iOS (Face ID), Android (Biometric API)
- Client library: `expo-local-authentication` 55.0.11 (mobile)
- Storage: `expo-secure-store` 15.0.8 (encrypted device storage)
- Backend: Verified via refresh token (no server-side biometric data)

## Monitoring & Observability

**Error Tracking - Sentry:**
- Backend: `@sentry/node` 10.47.0 (aggregator-worker only)
- Mobile: `@sentry/react-native` 7.2.0
- Implementation:
  - Backend: `apps/aggregator-worker/src/main.ts` (initialized before app creation)
  - Mobile: `apps/mobile-dashboard/App.tsx` (initialized before React imports)
- Env vars:
  - `SENTRY_DSN` - Sentry project DSN
  - `SENTRY_ENVIRONMENT` - Environment tag (production, staging, etc.)
- Configuration:
  - Backend: `enabled: !!process.env.SENTRY_DSN`
  - Mobile: `enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production'`
  - Mobile trace sample rate: 1.0 (100%)
- Error context: All sync operations (iiko, 1C) log exceptions with orgId, dateFrom, dateTo

**Logs:**
- Approach: NestJS `Logger` (built-in) for all services
- Output: stdout (Docker container logs)
- Levels: log (info), warn, error
- Alert service: Logs to Redis cooldown mechanism + Telegram notifications

## Notifications & Alerting

**Push Notifications - Firebase Cloud Messaging (FCM):**
- Implementation: Google FCM HTTP v1 API
- Location: `apps/api-gateway/src/notifications/notification.service.ts`
- Client library: Direct HTTP (native fetch)
- Auth: OAuth2 JWT (using Firebase service account credentials)
- Env vars:
  - `FIREBASE_PROJECT_ID` - GCP project ID
  - `FIREBASE_CLIENT_EMAIL` - Service account email
  - `FIREBASE_PRIVATE_KEY` - Service account private key (PEM format)
  - `FIREBASE_SERVICE_ACCOUNT_PATH` - Path to service account JSON (optional fallback)
- Endpoint: `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
- Token flow:
  1. Mobile app calls `/api/notifications/register` with FCM token
  2. Token stored in DB (`NotificationToken` table)
  3. Backend uses token to send messages
  4. Invalid/unregistered tokens auto-deactivated
- Message format:
  - Title, body, data payload
  - Android: high priority, default sound
  - iOS: default sound, badge +1
- Use cases:
  - Low revenue alerts → OWNER + OPERATIONS_DIRECTOR
  - Large expense alerts → OWNER + FINANCE_DIRECTOR
  - Sync failure alerts → OWNER only

**Push Notifications - Local (Mobile):**
- Library: `expo-notifications` 0.31.0
- Used for: In-app notification display during active sessions
- Registered tokens stored in: `NotificationToken` table

**Alert Service (Telegram Webhook):**
- Location: `apps/aggregator-worker/src/alert/`
- Service: `AlertService` (`apps/aggregator-worker/src/alert/alert.service.ts`)
- Triggers:
  - Sync failures (no success in ALERT_SYNC_FAILURE_MINUTES)
  - Low revenue (below ALERT_LOW_REVENUE_PERCENT of 30-day avg)
  - Large expenses (above ALERT_LARGE_EXPENSE_AMOUNT)
- Delivery: Telegram bot via HTTP POST
- Env vars:
  - `ALERT_TG_BOT_TOKEN` - Telegram bot token
  - `ALERT_TG_CHAT_ID` - Chat/channel to notify
  - `ALERT_SYNC_FAILURE_MINUTES` - Detection window (default: 60)
  - `ALERT_LOW_REVENUE_PERCENT` - Threshold (default: 70%)
  - `ALERT_LARGE_EXPENSE_AMOUNT` - Threshold (default: 500000)
  - `ALERT_REVENUE_AVG_DAYS` - Historical baseline (default: 30)
  - `ALERT_COOLDOWN_HOURS` - Prevent alert spam (default: 4)
- Cooldown mechanism: Redis key tracking to avoid duplicate alerts

**Notification Preferences:**
- User can enable/disable by type: SYNC_FAILURE, LOW_REVENUE, LARGE_EXPENSE
- Stored in: `NotificationPreference` table
- Default: enabled (if no preference row exists)

## Data Storage

**Databases:**
- PostgreSQL 15 (Docker: `postgres:15-alpine`)
- Connection: `POSTGRES_URL` (pool connection string)
- Adapter: `@prisma/adapter-pg` (connection pooling via PgBouncer-compatible pool)
- Schemas: `auth` (users, tokens, audit) + `finance` (restaurants, expenses, revenue, allocations)
- ORM: Prisma 7.5.0
- Client: Direct `pg` 8.20.0 for certain operations

**File Storage:**
- Approach: Not applicable; Firebase Service Account JSON stored in env var

**Caching:**
- Technology: Redis 7 (Docker: `redis:7-alpine`)
- Connection: `REDIS_URL` (default: redis://localhost:6380)
- Usage:
  - OTP codes: `otp:{phone}` TTL 5 min
  - OTP attempt count: `otp_attempts:{phone}` TTL 15 min (rate limiting)
  - Refresh tokens: `refresh:{refreshToken}` TTL 30 days
  - iiko access token: `iiko:access_token` TTL 55 min
  - Telegram request ID: `tg_otp_rid:{phone}` TTL 5 min
  - Alert cooldown: `alert:{type}:{resource}` TTL variable
- Client library: `ioredis` 5.10.0-5.10.1

## CI/CD & Deployment

**Hosting:**
- Development: Docker Compose (local)
- Production: Docker Compose with `profiles: ["prod"]` (configurable)
- Services containerized: auth-service, api-gateway, finance-service, aggregator-worker
- Database: PostgreSQL 15 (Docker volume mount)
- Cache: Redis 7 (Docker volume mount)
- Reverse proxy: nginx Alpine (production profile)

**Mobile Distribution:**
- Platform: Expo (managed service)
- Build tool: EAS (Expo Application Services)
- iOS: TestFlight/App Store via Expo
- Android: Google Play via Expo

**CI Pipeline:**
- Tool: Not detected (based on TZ, likely GitHub Actions or similar, not found in codebase)
- Verification commands provided:
  - Unit tests: `npm test` (per service)
  - Lint: `npm run lint` (ESLint 9.18.0)
  - Type check: `npx tsc --noEmit`

**Build Workflow:**
- Monorepo: `turbo build` (builds all services in dependency order)
- Development: `turbo dev` (watches all services)

## Webhooks & Callbacks

**Incoming:**
- Not detected (REST API only, no webhook receivers)

**Outgoing:**
- Alert Telegram webhooks: POST to Telegram API
- iiko API: Only polling (no webhooks)
- 1C OData: Only polling (no webhooks)

## Environment Configuration

**Required env vars (all services):**
- Global (from turbo.json globalEnv):
  - `NODE_ENV`, `TZ`, `BUSINESS_TIMEZONE`
  - `POSTGRES_URL`, `REDIS_URL`
  - `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
  - `IIKO_API_URL` or `IIKO_SERVER_URL`, `IIKO_LOGIN`, `IIKO_PASSWORD`
  - `ONEC_REST_URL`, `ONEC_REST_USER`, `ONEC_REST_PASS`
  - `AUTH_SERVICE_URL`, `FINANCE_SERVICE_URL`
  - `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH`
  - `SENTRY_DSN`

**Optional (functional fallbacks):**
- `MOBIZON_API_KEY` (dev mode logs to console if missing)
- `TELEGRAM_GATEWAY_TOKEN` (SMS-only mode if missing)
- `ALERT_TG_BOT_TOKEN`, `ALERT_TG_CHAT_ID` (alerts disabled if missing)
- `DEV_BYPASS_PHONES`, `DEV_BYPASS_CODE` (dev only)

**Secrets location:**
- `.env` file (local development)
- Docker Compose `env_file: .env` (production containers)
- Environment variable injection (Kubernetes/CI/CD)

**Configuration not detected:**
- Vault or secrets manager (using .env)
- Secret rotation mechanism

## API Contract Examples

**iiko Stock Check (sync flow):**
```
GET {IIKO_SERVER_URL}/corporations/{corporationId}/stock?token={token}
Response: XML with warehouse items + quantities
```

**1C OData Expense Query:**
```
GET {ONEC_BASE_URL}/odata/standard.odata/Document_CashExpense?$filter=Date ge datetime'2026-05-01' and Date le datetime'2026-05-02'&$select=Ref_Key,Number,Date,Amount,Description
Response: JSON { value: [...] }
Auth: HTTP Basic (base64(user:pass))
```

**Firebase FCM Send:**
```
POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
Headers: Authorization: Bearer {accessToken}
Body: JSON with token, notification, data, android, apns
```

**Telegram Gateway OTP Check:**
```
POST checkVerificationStatus(requestId, code)
Returns: { ok: true, result: { verification_status: { status: 'code_valid' } } }
```

## Data Flow Summary

```
iiko Server API
├─> IikoAuthService (cache token in Redis)
├─> IikoSyncService (fetch revenue, expenses, shipments)
└─> Prisma → PostgreSQL (FinancialSnapshot, Expense tables)

1C OData API
├─> OneCyncService (fetch HQ expenses, kitchen purchases)
└─> Prisma → PostgreSQL (Expense, KitchenPurchase tables)

Cost Allocation Engine
├─> Read all expenses + revenue
├─> Calculate coefficient per restaurant
└─> Write allocated costs back to PostgreSQL

Finance Service
├─> Read from PostgreSQL
├─> 4-level drill-down queries
└─> Return to API Gateway

API Gateway
├─> Auth Service (JWT validation)
├─> Finance Service (data queries)
├─> Notification Service (FCM tokens + push)
└─> Return JSON to Mobile

Mobile Dashboard
├─> axios → API Gateway
├─> Zustand (state)
├─> React Query (server cache)
├─> Sentry (error tracking)
└─> Expo Notifications (FCM receipt)
```

---

*Integration audit: 2026-05-02*
