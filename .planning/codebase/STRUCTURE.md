# Codebase Structure

**Analysis Date:** 2026-05-02

## Directory Layout

```
kexgroupapp/
├── apps/                           # 6 applications
│   ├── auth-service/               # OTP + JWT service
│   │   ├── src/
│   │   │   ├── auth/               # Auth module
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── dto/
│   │   │   ├── health/             # Health check
│   │   │   └── main.ts
│   │   └── package.json
│   ├── api-gateway/                # HTTP routing + JWT + roles
│   │   ├── src/
│   │   │   ├── auth/               # Proxy to auth-service
│   │   │   ├── finance/            # Proxy to finance-service
│   │   │   ├── notifications/      # Notification module
│   │   │   ├── guards/             # JwtAuthGuard, RolesGuard
│   │   │   ├── decorators/         # @Roles()
│   │   │   ├── interfaces/         # JWT payload types
│   │   │   └── main.ts
│   │   └── package.json
│   ├── finance-service/            # Dashboard + aggregation
│   │   ├── src/
│   │   │   ├── dashboard/          # Main module
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   └── dto/            # Response DTOs
│   │   │   ├── prisma/             # DB client
│   │   │   ├── common/
│   │   │   │   └── interceptors/   # DataAccessInterceptor
│   │   │   └── main.ts
│   │   └── package.json
│   ├── aggregator-worker/          # iiko + 1C sync
│   │   ├── src/
│   │   │   ├── iiko/               # iiko Cloud API sync
│   │   │   │   ├── iiko-sync.service.ts
│   │   │   │   └── iiko-auth.service.ts
│   │   │   ├── onec/               # 1C OData sync
│   │   │   ├── allocation/         # Cost Allocation Engine
│   │   │   ├── scheduler/          # Cron jobs
│   │   │   ├── alert/              # Alert generation
│   │   │   ├── prisma/             # DB client
│   │   │   ├── utils/              # Date helpers
│   │   │   └── main.ts
│   │   └── package.json
│   ├── mobile-dashboard/           # React Native + Expo
│   │   ├── src/
│   │   │   ├── screens/            # Full-screen UI
│   │   │   ├── components/         # Reusable UI blocks
│   │   │   ├── hooks/              # Custom hooks (useApi, useDashboard, etc.)
│   │   │   ├── services/           # API client, auth, biometric
│   │   │   ├── store/              # Zustand stores (auth, dashboard)
│   │   │   ├── theme/              # Colors, fonts
│   │   │   ├── i18n/               # Translations (RU/KK)
│   │   │   ├── types/              # TypeScript interfaces
│   │   │   └── config.ts           # API_URL, REQUEST_TIMEOUT
│   │   ├── App.tsx                 # Root component + navigation
│   │   └── package.json
│   └── web-dashboard/              # React web (reference only)
│       ├── src/
│       │   ├── components/         # Desktop UI mockup
│       │   └── App.tsx
│       └── package.json
├── packages/                       # 3 shared libraries
│   ├── database/                   # Prisma ORM + schema
│   │   ├── schema.prisma           # Single schema (all tables)
│   │   ├── migrations/
│   │   └── package.json
│   ├── shared-types/               # DTOs + enums
│   │   ├── src/
│   │   │   └── index.ts            # All exports
│   │   └── package.json
│   └── testing/                    # Jest config, test helpers
│       └── package.json
├── .planning/                      # GSD orchestration
│   ├── codebase/                   # Architecture docs (THIS LOCATION)
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   └── ...other docs
│   ├── phases/                     # Phase execution records
│   ├── ROADMAP.md                  # Project timeline
│   └── STATE.md                    # Current state summary
├── .github/                        # CI/CD workflows
│   └── workflows/                  # GitHub Actions
├── .claude/                        # Claude AI agent context
│   └── ...agent memory/memory.md
├── docker-compose.yml              # Dev services (postgres, redis)
├── package.json                    # Monorepo root
├── turbo.json                      # Turbo build cache
├── CLAUDE.md                       # Project summary + agent boundaries
└── ONBOARDING.md                   # Setup instructions
```

## Directory Purposes

**apps/**
- Purpose: Independently deployable services and clients
- Contains: 6 applications (auth, gateway, finance, worker, mobile, web)
- Key files: Each has `src/main.ts` (backend) or `App.tsx` (frontend), `package.json` with scripts

**apps/auth-service/**
- Purpose: OTP generation, JWT token issuance, user session management
- Contains: Auth controller/service, health check module, DTOs
- Key files: `src/auth/auth.service.ts` (OTP logic), `src/main.ts` (port 3001)

**apps/api-gateway/**
- Purpose: Single entry point; routes, authenticates, authorizes
- Contains: Proxy controllers, JWT/roles guards, decorators, Swagger config
- Key files: `src/guards/jwt-auth.guard.ts`, `src/decorators/roles.decorator.ts`, `src/main.ts` (port 3000)

**apps/finance-service/**
- Purpose: Dashboard queries, financial summaries, 4-level drill-downs
- Contains: Dashboard service with aggregation logic, DTOs, Prisma client
- Key files: `src/dashboard/dashboard.service.ts` (core query logic, 1500+ lines), `src/main.ts` (port 3002)

**apps/aggregator-worker/**
- Purpose: Scheduled data sync from iiko Cloud API and 1C OData; Cost Allocation Engine
- Contains: Sync services (iiko, 1C), allocation engine, scheduler, alert module
- Key files: `src/iiko/iiko-sync.service.ts`, `src/allocation/allocation.service.ts`, `src/scheduler/scheduler.service.ts`, `src/main.ts` (port 3003)

**apps/mobile-dashboard/**
- Purpose: Mobile-first UI for financial dashboard (React Native + Expo)
- Contains: Screens, components, hooks, services, stores, theme
- Key files: `App.tsx` (root + navigation), `src/screens/DashboardScreen.tsx`, `src/services/api.ts` (HTTP client), `src/store/auth.ts` (Zustand)

**apps/web-dashboard/**
- Purpose: Desktop mockup for design reference (not production)
- Contains: React web UI components
- Key files: `src/App.tsx`

**packages/database/**
- Purpose: Prisma ORM; single schema shared by all services
- Contains: `schema.prisma` (Users, Brands, Restaurants, FinancialSnapshot, Expense, etc.), migrations
- Key files: `schema.prisma`, `seed.ts`

**packages/shared-types/**
- Purpose: Single source of truth for DTOs, enums, interfaces
- Contains: `UserRole`, `SendOtpRequestDto`, `DashboardSummaryDto`, `BrandIndicatorDto`, etc.
- Key files: `src/index.ts` (all exports, 364 lines)

**packages/testing/**
- Purpose: Shared Jest configuration and test helpers
- Contains: Jest presets, utilities
- Key files: Config files

**.planning/codebase/**
- Purpose: Architecture and structure documentation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Key files: Generated by `/gsd:map-codebase`, consumed by `/gsd:plan-phase`

**.github/workflows/**
- Purpose: CI/CD automation
- Contains: Build, test, deploy workflows
- Key files: YAML workflow definitions

## Key File Locations

**Entry Points:**

- **Backend Gateway:** `apps/api-gateway/src/main.ts` (port 3000, Swagger at `/api/docs`)
- **Auth Service:** `apps/auth-service/src/main.ts` (port 3001, OTP endpoints)
- **Finance Service:** `apps/finance-service/src/main.ts` (port 3002, dashboard endpoints)
- **Worker:** `apps/aggregator-worker/src/main.ts` (port 3003, health check + scheduled jobs)
- **Mobile App:** `apps/mobile-dashboard/App.tsx` (root component, auth flow, navigation)
- **Web Dashboard:** `apps/web-dashboard/src/App.tsx` (desktop mockup)

**Configuration:**

- **Monorepo:** `package.json` (root scripts: `npm run dev`, `npm run build`, `npm run test`)
- **Build:** `turbo.json` (Turbo pipeline definition)
- **Env:** `.env` (secrets: JWT_SECRET, SENTRY_DSN, IIKO_SERVER_URL, 1C_ODATA_URL, etc.)
- **Docker:** `docker-compose.yml` (PostgreSQL, Redis)
- **Project:** `CLAUDE.md` (business requirements, architecture decisions)

**Core Logic:**

- **Auth:** `apps/auth-service/src/auth/auth.service.ts` (OTP verify, JWT issue)
- **Dashboard:** `apps/finance-service/src/dashboard/dashboard.service.ts` (all 4-level queries)
- **Sync:** `apps/aggregator-worker/src/iiko/iiko-sync.service.ts`, `apps/aggregator-worker/src/onec/onec-sync.service.ts`
- **Allocation:** `apps/aggregator-worker/src/allocation/allocation.service.ts` (Cost Allocation Engine)
- **API Client (Mobile):** `apps/mobile-dashboard/src/services/api.ts` (fetch wrapper, JWT refresh)
- **Auth Store (Mobile):** `apps/mobile-dashboard/src/store/auth.ts` (Zustand, token persistence)

**Testing:**

- **Auth Service Tests:** `apps/auth-service/src/auth/auth.service.spec.ts`
- **Finance Tests:** `apps/finance-service/src/dashboard/dashboard.service.spec.ts`
- **Worker Tests:** `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts`, `apps/aggregator-worker/src/allocation/allocation.service.spec.ts`
- **Mobile Tests:** `apps/mobile-dashboard/src/hooks/*.ts` (custom hooks)

**Shared Types:**

- **All DTOs:** `packages/shared-types/src/index.ts` (364 lines)
  - UserRole enum, Auth DTOs, Dashboard DTOs, Report DTOs, Notification DTOs
  - Imported in all services: `import { DashboardSummaryDto, UserRole } from '@dashboard/shared-types'`

**Database:**

- **Prisma Schema:** `packages/database/schema.prisma` (single source of truth for all tables)
- **Generated Client:** `node_modules/.prisma/client/` (auto-generated from schema)
- **Seed Script:** `packages/database/seed.ts` (populate initial data)

## Naming Conventions

**Files:**

- **Controllers:** `*.controller.ts` (e.g., `auth.controller.ts`, `dashboard.controller.ts`)
- **Services:** `*.service.ts` (e.g., `auth.service.ts`, `dashboard.service.ts`)
- **DTOs:** `*.dto.ts` (e.g., `auth.dto.ts`, `summary.dto.ts`)
- **Modules:** `*.module.ts` (e.g., `auth.module.ts`, `dashboard.module.ts`)
- **Screens (Mobile):** `*Screen.tsx` (e.g., `DashboardScreen.tsx`, `BrandDetailScreen.tsx`)
- **Components (Mobile):** `*.tsx` (e.g., `Badge.tsx`, `Chart.tsx`)
- **Styles (Mobile):** `*.styles.ts` (e.g., `Badge.styles.ts`, `HeroCard.styles.ts`)
- **Tests:** `*.spec.ts` (e.g., `auth.service.spec.ts`)

**Directories:**

- **Feature modules:** kebab-case (e.g., `auth/`, `finance/`, `api-gateway/`)
- **Utilities:** `utils/` (e.g., `apps/aggregator-worker/src/utils/date.ts`)
- **Common/Shared:** `common/` (e.g., `apps/finance-service/src/common/interceptors/`)

**TypeScript/Variables:**

- **Types/Interfaces:** PascalCase (e.g., `UserRole`, `DashboardSummaryDto`, `JwtPayload`)
- **Enums:** PascalCase (e.g., `UserRole.OWNER`, `NotificationType.LOW_REVENUE`)
- **Functions/Methods:** camelCase (e.g., `sendOtp()`, `verifyToken()`, `getDashboardSummary()`)
- **Variables:** camelCase (e.g., `accessToken`, `totalRevenue`, `isAuthenticated`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_URL`, `REQUEST_TIMEOUT`, `JWT_SECRET`)

**API Routes:**

- **Gateway paths:** `/api/auth/*`, `/api/finance/*` (e.g., `/api/auth/send-otp`, `/api/finance/dashboard`)
- **Internal service paths:** same structure, routed by proxy
- **Query params:** snake_case or camelCase depending on client (mobile uses camelCase)

## Where to Add New Code

**New Feature (Backend):**

1. If it's authentication-related → `apps/auth-service/src/auth/`
   - Add method to `auth.service.ts`
   - Add endpoint to `auth.controller.ts`
   - Add request/response DTOs to `dto/auth.dto.ts`
   - Add shared DTOs to `packages/shared-types/src/index.ts`

2. If it's financial data → `apps/finance-service/src/dashboard/`
   - Add query method to `dashboard.service.ts`
   - Add endpoint to `dashboard.controller.ts`
   - Add response DTO to `dto/summary.dto.ts`
   - Add shared DTO to `packages/shared-types/src/index.ts`

3. If it's external data sync → `apps/aggregator-worker/src/`
   - Add service in `iiko/`, `onec/`, or create new module
   - Register module in `app.module.ts`
   - Add job to `scheduler/scheduler.service.ts`

**New Component/Module (Mobile):**

1. Visual component → `apps/mobile-dashboard/src/components/ComponentName.tsx`
   - Add styles to `apps/mobile-dashboard/src/components/ComponentName.styles.ts`
   - Use colors from `apps/mobile-dashboard/src/theme/colors.ts`

2. Screen (full-page view) → `apps/mobile-dashboard/src/screens/ScreenNameScreen.tsx`
   - Import from `App.tsx` line 31-46
   - Add case in `renderScreen()` switch statement (line 363-458)
   - Add navigation handler in `App.tsx`

3. Custom hook → `apps/mobile-dashboard/src/hooks/useHookName.ts`
   - Use `ApiClient.request()` for API calls
   - Return data, loading, error states
   - Example: `apps/mobile-dashboard/src/hooks/useDashboard.ts`

4. Store (Zustand) → `apps/mobile-dashboard/src/store/storeName.ts`
   - Define interface extending Zustand state
   - Use `create()` factory
   - Example: `apps/mobile-dashboard/src/store/auth.ts` (useAuthStore)

**Utilities:**

- Shared helpers (both backend & mobile) → `packages/` (create new package if needed)
- Backend-only utilities → `apps/[service]/src/utils/`
- Mobile-only utilities → `apps/mobile-dashboard/src/utils/`

**Database Changes:**

1. Edit `packages/database/schema.prisma`
2. Run `cd packages/database && npm run db:push` (applies to PostgreSQL)
3. Services auto-discover schema via Prisma client (regenerate if needed: `npm run generate`)

## Special Directories

**apps/aggregator-worker/src/scripts/**
- Purpose: One-off data scripts
- Generated: Yes (admin scripts)
- Committed: Yes
- Example: `cleanup-allocations.ts` (delete allocation records for date range)

**apps/mobile-dashboard/src/__mocks__/**
- Purpose: Mock data for testing/UI development
- Generated: No (written manually)
- Committed: Yes
- Contains: Fake API responses for testing without backend

**packages/database/migrations/**
- Purpose: SQL migration history
- Generated: Yes (by Prisma)
- Committed: Yes
- Managed by: Prisma (never edit manually)

**node_modules/**, **.turbo/**, **.expo/**
- Purpose: Build artifacts and caches
- Generated: Yes
- Committed: No (in .gitignore)

**.planning/**
- Purpose: GSD orchestration and documentation
- Generated: Yes (by orchestrator commands)
- Committed: Yes (except node_modules in reports/phases)
- Subdirs:
  - `codebase/` — ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
  - `phases/` — Per-phase PLAN.md and SUMMARY.md files
  - `ROADMAP.md` — Master project timeline (updated after every phase)

---

*Structure analysis: 2026-05-02*
