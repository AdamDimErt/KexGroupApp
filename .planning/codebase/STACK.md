# Technology Stack

**Analysis Date:** 2026-05-02

## Languages

**Primary:**
- TypeScript 5.3-5.9 - All source code (backend, mobile, shared types)

**Secondary:**
- JavaScript - Build tooling, configuration
- XML - iiko Server API responses (fast-xml-parser)

## Runtime

**Environment:**
- Node.js 18+ (specified in `package.json`)
- React Native 0.81.5 (mobile)
- Expo 54 (mobile distribution)

**Package Manager:**
- npm 10.2.4 (monorepo)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Backend - All NestJS Microservices:**
- NestJS 11.0.1 - Core framework for all services
  - `@nestjs/common` 11.0.1 - Common decorators, guards, pipes
  - `@nestjs/core` 11.0.1 - Core runtime
  - `@nestjs/config` 4.0.3 - Environment configuration
  - `@nestjs/jwt` 11.0.2 - JWT token generation/validation
  - `@nestjs/platform-express` 11.0.1 - HTTP server
  - `@nestjs/schedule` 6.1.1 - Scheduled tasks (aggregator-worker)
  - `@nestjs/terminus` 11.1.1 - Health checks (aggregator-worker)
  - `@nestjs/swagger` 11.2.6 - API documentation (api-gateway)
  - `@nestjs/throttler` 6.5.0 - Rate limiting (api-gateway)
  - `@nestjs/axios` 4.0.1 - HTTP requests (api-gateway, aggregator-worker)

**Service Locations:**
- `apps/auth-service` - OTP, token generation, biometric
- `apps/api-gateway` - REST API, FCM notifications, reverse proxy
- `apps/finance-service` - Financial queries (4-level drill-down)
- `apps/aggregator-worker` - iiko/1C sync, cost allocation, alerts

**Database & ORM:**
- Prisma 7.5.0 (7.6.0 in aggregator-worker) - ORM + schema management
  - `@prisma/client` - Multi-schema PostgreSQL (auth + finance)
  - `@prisma/adapter-pg` - Connection pooling adapter
- PostgreSQL 15 (Docker) - Dual-schema database
- pg 8.20.0 - Native PostgreSQL driver (direct use in services)
- Redis 7 (Docker, ioredis 5.10.0-5.10.1) - Token cache, OTP storage, refresh token rotation

**Mobile - React Native + Expo:**
- React 19.1.0 - UI framework
- React Native 0.81.5 - Native runtime
- Expo 54 - Build/distribution platform
- Zustand 5.0.0 - State management (mobile only)
- TanStack React Query 5.60.0 - Server state (mobile only)
- axios 1.13.6 - HTTP client (mobile + aggregator-worker)
- React Navigation 7.x - Mobile navigation
  - `@react-navigation/bottom-tabs` 7.15.5
  - `@react-navigation/native` 7.1.33
  - `@react-navigation/native-stack` 7.14.4
- i18next 24.0.0 + react-i18next 15.0.0 - Internationalization (Russian + Kazakh)

**Web Dashboard (admin):**
- React 18.3.1 - UI (separate from mobile)
- Vite 6.3.5 - Build tool
- Radix UI (@radix-ui/*) - Component library (all ≈1.x)
- React Hook Form 7.55.0 - Form state
- Recharts 2.15.2 - Charts/dashboards
- Tailwind CSS - Styling (via Radix build)

**Testing:**
- Jest 30.0.0 - Test runner (all services + mobile)
  - ts-jest 29.2.5 - TypeScript support
  - supertest 7.0.0 - HTTP assertions (services)

**Build & Development:**
- Turbo 3+ - Monorepo orchestration
- Prettier 3.2.5-3.4.2 - Code formatting
- ESLint 9.18.0 + @eslint/js 9.18.0 + typescript-eslint - Linting
- ts-node 10.9.2 - Direct TypeScript execution
- ts-loader 9.5.2 - Webpack/build loader

## Key Dependencies

**Critical:**
- `@nestjs/*` (11.0.1+) - Backend framework (5 services depend on it)
- `@prisma/client` (7.5.0) - Database ORM (all backend services)
- `@prisma/adapter-pg` (7.5.0) - PostgreSQL connection pooling
- `pg` (8.20.0) - Direct database connectivity
- `ioredis` (5.10.0+) - Redis operations (auth, aggregator, iiko sync)
- `axios` (1.13.6) - HTTP requests (iiko/1C APIs)

**Infrastructure:**
- `node-telegram-gateway-api` 1.2.1 - Telegram OTP delivery (auth-service)
- `@sentry/node` 10.47.0 - Error tracking backend (aggregator-worker)
- `@sentry/react-native` 7.2.0 - Error tracking mobile
- `fast-xml-parser` 5.5.9 - iiko XML response parsing
- `class-validator` 0.14.1 - DTO validation (all services)
- `class-transformer` 0.5.1 - DTO serialization (all services)
- `reflect-metadata` 0.2.2 - Decorator support (NestJS dependency)

**Mobile-Specific:**
- `@react-native-async-storage/async-storage` 2.2.0 - Secure token storage
- `expo-secure-store` 15.0.8 - Encrypted storage
- `expo-notifications` 0.31.0 - Local/push notifications
- `expo-local-authentication` 55.0.11 - Biometric auth
- `expo-linear-gradient` 15.0.8 - UI backgrounds
- `expo-haptics` 15.0.8 - Haptic feedback
- `react-native-international-phone-number` 0.11.3 - Phone input
- `react-native-svg` 15.12.1 - SVG rendering
- `lucide-react-native` 1.8.0 - Icon library
- `date-fns` 3.6.0 + `date-fns-tz` 3.2.0 - Date formatting with timezone

## Configuration

**Environment Variables:**
All configured in `turbo.json` globalEnv:
- `NODE_ENV`, `TZ`, `BUSINESS_TIMEZONE`
- Database: `POSTGRES_URL`, `REDIS_URL`
- Auth: `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- OTP: `MOBIZON_API_KEY`, `MOBIZON_API_DOMAIN`, `TELEGRAM_GATEWAY_TOKEN`, `DEV_BYPASS_PHONES`, `DEV_BYPASS_CODE`
- iiko: `IIKO_SERVER_URL`, `IIKO_LOGIN`, `IIKO_PASSWORD`, `IIKO_SYNC_INTERVAL_MINUTES`, `IIKO_REQUEST_TIMEOUT_MS`, `IIKO_CIRCUIT_BREAKER_MAX_FAILURES`, `IIKO_CIRCUIT_BREAKER_RESET_MINUTES`
- 1C: `ONEC_REST_URL`, `ONEC_REST_USER`, `ONEC_REST_PASS`
- Services: `AUTH_SERVICE_URL`, `FINANCE_SERVICE_URL`, `SERVICE_KEY`
- Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Alerts: `ALERT_TG_BOT_TOKEN`, `ALERT_TG_CHAT_ID`, `ALERT_SYNC_FAILURE_MINUTES`, `ALERT_LOW_REVENUE_PERCENT`, `ALERT_LARGE_EXPENSE_AMOUNT`
- Monitoring: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`
- Mobile: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_APP_ENV`

**Build Artifacts:**
- Backend: `dist/` directory (NestJS build)
- Mobile: Expo managed build (EAS)
- Web: `.next/` or Vite build output

**Platform Requirements:**

Development:
- Docker + Docker Compose for PostgreSQL 15, Redis 7
- Node.js 18+, npm 10.2.4
- iOS SDK (Xcode) for mobile development
- Android SDK for mobile development
- EAS CLI for building/publishing (mobile)

Production:
- Docker deployment (services in containers)
- nginx reverse proxy (included in docker-compose)
- PostgreSQL 15 managed database
- Redis 7 managed cache
- Firebase project (FCM)
- Google OAuth2 credentials (FCM HTTP v1 API)

---

*Stack analysis: 2026-05-02*
