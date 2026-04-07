---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: milestone
status: unknown
last_updated: "2026-04-07T06:48:43.877Z"
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 9
  completed_plans: 9
---

# Project State

## Current Phase

**Этап 1-2: Инфраструктура + Auth** — нужно обновить Prisma схему, добавить 3 роли, движок распределения

## What's Working

- Monorepo: Turborepo + npm workspaces настроены
- Docker: PostgreSQL 15 + Redis 7 через docker-compose.yml
- Prisma схема: базовая (нужно обновить под ТЗ — добавить Brand, DdsArticle, CostAllocation, Kitchen*)
- Auth service: OTP генерация, Mobizon SMS, Redis rate-limiting, JWT выдача
- Mobile: базовая структура Expo + навигация

## Known Blockers

- Prisma схема не соответствует ТЗ — нет Brand, DdsArticle, CostAllocation, Kitchen*
- Prisma миграции не запускались — нужно `npx prisma migrate dev`
- Auth service: 2 роли вместо 3 (нет OWNER/FIN_DIRECTOR/OPS_DIRECTOR)
- Auth service: mock-пользователь вместо реальной БД
- Нет Telegram-бота для OTP
- Нет движка распределения затрат по удельному весу
- Нет 4-уровневого drill-down
- Finance/Aggregator/Gateway — пустые заглушки
- Мобилка не подключена к API
- Sentry: backend (aggregator-worker) подключён; mobile — ещё нет
- Нет локализации (русский + казахский)

## Completed Plans

- **02-00** (2026-04-07): Added biometricEnabled Boolean @default(false) to User model, migration SQL created, Prisma client regenerated. Commit: b7f1ba6
- **02-01** (2026-04-07): AuditLog writes on LOGIN/LOGOUT (fire-and-forget writeAuditLog method), JWT TTL reduced from 7d to 15m, trust proxy added for real client IP. Commits: 4c3a2c9, 29f41f7
- **02-03** (2026-04-07): Biometric enable/verify endpoints added — POST /auth/biometric/enable (JWT-protected, sets DB flag + BIOMETRIC_ENABLE audit) and POST /auth/biometric/verify (refresh-token-based login with rotation + BIOMETRIC_LOGIN audit). BiometricVerifyDto added. Commit: c1cfd4f
- **02-04** (2026-04-07): 32-test suite for AuthService — added enableBiometric (2 tests) and verifyBiometric (6 tests) describe blocks covering success, rejection, inactive user, audit log events (BIOMETRIC_ENABLE/BIOMETRIC_LOGIN), and token rotation. All 32 tests pass. Commit: 5a06969
- **03-01** (2026-04-07): syncNomenclature() added to IikoSyncService — fetches iiko nomenclature groups via GET /v2/entities/products/group/list, upserts DdsArticleGroup by tenantId_code, writes SyncLog. Daily 03:00 Asia/Almaty cron added to SchedulerService. 4 unit tests all pass (upsert, SUCCESS log, ERROR log+throw, scheduler wiring). Commits: 281b4eb, d0947a4
- **03-02** (2026-04-07): @sentry/node integrated — Sentry.init() before NestFactory.create() in main.ts, Sentry.withScope+captureException in 5 IikoSyncService and 3 OneCyncService catch blocks, jest.mock for test isolation, 2 success-path tests. All 20 tests pass. Commits: 5a41601, f5c6b9a
- **03-03** (2026-04-07): Dead letter pattern implemented — needsManualReview Boolean @default(false) added to SyncLog schema + manual migration SQL; logSync() in IikoSyncService and OneCyncService marks 3 consecutive ERRORs needsManualReview=true via inner-try/catch-protected dead letter check; 3 unit tests pass (trigger on 3 errors, no trigger on mixed, resilient to dead letter failure). All 23 tests pass. Commits: bcd0a15, c19fed1
- **03-04** (2026-04-07): syncKitchenShipmentsByRestaurant() added to OneCyncService — fetches Document_RealizationOfGoodsAndServices from 1C OData, matches counterparty to restaurant by oneCId then name, upserts Expense with direct restaurantId (bypasses cost allocation), skips unmatched with warn. Cron at :25 added to SchedulerService. 5 unit tests in new onec-sync.service.spec.ts. All 28 tests pass. Commits: e120593, a158589
- **04-01** (2026-04-07): DataAccessInterceptor implemented — ACCESS_MATRIX with 6 route patterns, regex :param matching, ForbiddenException for unauthorized roles, passthrough for unprotected routes. Registered globally via app.useGlobalInterceptors(). 16 unit tests + 9 existing = 25 total passing. TypeScript compiles cleanly. Commits: b78ad19, 85d5ef4
- **04-02** (2026-04-07): lastSyncAt fixed in getDashboardSummary (queries SyncLog MAX(createdAt) WHERE status=SUCCESS), getArticleOperations added (paginated expense records with allocationCoefficient join, offset/limit), GET /dashboard/article/:articleId/operations registered before article/:groupId. All 30 tests pass. Commits: 73e7914, 7eaca77
- **04-03** (2026-04-07): Four cross-restaurant report endpoints added — GET /dashboard/reports/dds, /company-expenses, /kitchen, /trends. reports.dto.ts created with 4 DTO class trees. Company expenses filtered by article.group.tenantId (Expense has no direct tenantId). Trends merges revenue+expense date rows via Map. All 35 tests pass. Commits: b0c0e45, 349a4b8

## Key Decisions

- **[02-00]** When DB unavailable, create Prisma migration SQL files manually in migrations/ directory with timestamp naming convention; apply later with `npx prisma migrate dev`
- **[02-01]** Fire-and-forget audit logging via `void this.writeAuditLog()` — audit failures never block auth response
- **[02-01]** JWT access token TTL = 15m (backend side of inactivity requirement; mobile handles AppState-based auto-logout separately)
- **[02-01]** Use `import type` for express Request in decorated NestJS controller methods (required by isolatedModules + emitDecoratorMetadata)
- **[02-03]** biometric/enable requires valid JWT (user must be already authenticated to opt in); biometric/verify uses refresh token from body (no JWT) — mobile passes it after device biometric scan
- **[02-03]** Refresh token rotation on biometric verify prevents replay attacks; same pattern as regular /refresh endpoint
- **[02-04]** Use `setImmediate` tick flush (`await new Promise(resolve => setImmediate(resolve))`) to assert on fire-and-forget `void this.writeAuditLog()` calls in Jest unit tests
- **[03-01]** iiko nomenclature endpoint GET /v2/entities/products/group/list with flexible XML root key handling (MEDIUM confidence — logger.debug logs actual keys for first-run observability)
- **[03-01]** DdsArticle upsert NOT in syncNomenclature — handled by existing syncExpenses() flow to avoid duplication
- **[03-01]** In Jest tests, spy on xmlParser.parse directly to control parsed structure rather than returning raw XML from makeRequest mock
- **[03-02]** @sentry/node as production dependency (not devDependency) — Sentry.init runs at app boot
- **[03-02]** enabled: !!process.env.SENTRY_DSN guard makes Sentry a no-op in dev/test without DSN
- **[03-02]** jest.mock('@sentry/node') placed before imports (hoisted by Jest) to prevent real network calls in unit tests
- **[03-03]** Dead letter check wrapped in inner try/catch so DB failures never break logSync() caller — dead letter is best-effort
- **[03-03]** Trigger condition: exactly 3 recent logs, all ERROR — strict 3-window check prevents false positives on 2 errors
- **[03-03]** Manual migration SQL only (no prisma migrate dev) — consistent with 02-00 decision (no live DB available)
- **[03-04]** Skip unmatched 1C counterparty with logger.warn+skippedCount — partial sync preferred over total failure
- **[03-04]** DdsArticle code=kitchen_shipment with allocationType=DIRECT — kitchen shipments are direct costs, bypass cost allocation
- **[04-01]** Use request.path (not request.route.path) in interceptor — route.path is undefined during interceptor phase before route matching completes
- **[04-01]** ACCESS_MATRIX key order matters — operations pattern before article/:groupId prevents broader pattern shadowing OWNER-only restriction
- **[04-01]** Regex conversion: :paramName segments become [^/]+ anchored with ^...$; passthrough when path not in matrix
- **[04-02]** Use `declare restaurantId` in OperationsQueryDto to override optional base field as required — avoids TS2612 without restructuring DTO hierarchy
- **[04-02]** Controller route order critical: article/:articleId/operations MUST appear before article/:groupId in controller class to prevent NestJS treating 'operations' as a groupId param
- **[04-03]** Company expenses (restaurantId=null) must filter tenant via article.group.tenantId — Expense model has no direct tenantId field
- **[04-03]** Trends report uses Map<dateStr, {revenue, expenses}> merge pattern — handles sparse dates where only revenue or only expenses exist for a day
- 3 роли: OWNER, FIN_DIRECTOR, OPS_DIRECTOR (по ТЗ, не HOLDING/RESTAURANT_DIRECTOR)
- Drill-down: 4 уровня Компания → Точка → Статья → Операция (по ТЗ)
- Главный экран: Вариант Б (плитки по брендам, раскрытие → точки)
- Авторизация: OTP через телефон (Telegram + Mobizon fallback), не логин/пароль
- Push-уведомления: Firebase Cloud Messaging (бесплатно)
- Секреты: .env (Vault — позже)
- Staging: после первого релиза
- HTTP/REST между сервисами (не gRPC)
- Единая PostgreSQL с multi-schema
- Expo Managed Workflow
- Turborepo для оркестрации
- Сервер: хостинг (Docker Compose)
- Веб-версия: исключена из scope
- Планшет: исключён из scope
- Тёмная тема: нет
- Экспорт: нет

## Architecture Notes

- api-gateway: порт 3000
- auth-service: порт 3001
- finance-service: порт 3002
- aggregator-worker: порт 3003 (cron + HTTP для health)
- PostgreSQL: порт 5433 (mapped from 5432)
- Redis: порт 6379
- Nginx: порт 80/443 (SSL termination)

## NotebookLM Resources

- iiko API: `notebooklm chat -n ccf3cb0b-7297-4823-b318-076d2b98ce68 "..."`
- 1С OData: `notebooklm chat -n ea3c975a-5c18-4b52-93d0-cb446ecca184 "..."`
- 1С:ЗУП: `notebooklm chat -n 7ae5179b-11e9-47eb-b74c-d21fb22b108b "..."`
- Подробные инструкции: `.planning/NOTEBOOKLM.md`

## Next Steps (Recommended Order)

1. Обновить Prisma-схему под ТЗ (Brand, DdsArticle, CostAllocation, Kitchen*)
2. Запустить Prisma миграции
3. Seed: создать бренды + точки как на скриншоте iiko
4. Auth: 3 роли (OWNER/FIN_DIRECTOR/OPS_DIRECTOR) + Prisma + Telegram-бот
5. Подключить Sentry (backend + mobile)
6. Aggregator: iiko интеграция (выручка, ДДС, смены)
7. Aggregator: 1С интеграция (затраты ГО, Цех, закупки, отгрузки)
8. Aggregator: движок распределения затрат
9. Finance Service: 4 уровня drill-down + отчёты
10. API Gateway: JWT guard + роли + rate limiting
11. Mobile: авторизация + drill-down экраны
12. Push-уведомления
13. Деплой + релиз
