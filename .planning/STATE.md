---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: milestone
status: unknown
last_updated: "2026-04-08T20:24:14.286Z"
progress:
  total_phases: 10
  completed_phases: 8
  total_plans: 24
  completed_plans: 24
  percent: 91
---

---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: milestone
status: unknown
last_updated: "2026-04-08T19:21:39.253Z"
progress:
  [█████████░] 91%
  completed_phases: 6
  total_plans: 22
  completed_plans: 19
---

# Project State

## Current Phase

**Phase 08.1: iiko Server API DDS sync** — COMPLETE. Plan 08.1-01 complete: syncDdsArticles fetches /v2/entities/list and upserts DdsArticle records; syncDdsTransactions fetches /v2/cashshifts/list per restaurant and upserts Expense with dds:{shiftId}:{movId} syncId; resolveGroupCode maps 12 DDS group codes; POST /sync/dds endpoint added; syncAll and syncBackfill include DDS. 54 tests passing.

## What's Working

- Monorepo: Turborepo + npm workspaces настроены
- Docker: PostgreSQL 15 + Redis 7 через docker-compose.yml
- Prisma схема: 18 моделей (Brand, Restaurant, DdsArticle, CostAllocation, Kitchen*, etc.)
- Auth service: OTP, Mobizon SMS, Redis rate-limiting, JWT, biometric endpoints (enable/verify), AuditLog
- API Gateway: JWT guard, 3 roles (OWNER/FINANCE_DIRECTOR/OPERATIONS_DIRECTOR), 9 finance proxy routes, E2E tests
- Finance service: DataAccessInterceptor, 4-level drill-down queries, 4 cross-restaurant reports
- Aggregator worker: iiko sync (nomenclature, expenses, kitchen shipments), Sentry, dead letter queue, AlertService (sync health + revenue thresholds + large expenses → api-gateway)
- Mobile: Expo 54, biometrics, OTP flow, JWT store, resend timer, inactivity logout, Sentry

## Known Blockers

- Prisma миграции не запускались — нужно `npx prisma migrate dev` (нет Docker в CI)
- Auth service: 02-02 Telegram Gateway OTP — ещё не выполнен
- Mobile не подключена к реальному API (Phase 7)
- Нет drill-down экранов с реальными данными (Phase 7)
- Нет переключателя периода (Phase 7)
- Нет движка распределения затрат (Phase 7/8)

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
- **05-01** (2026-04-07): 5 proxy routes added to FinanceProxyController — getArticleOperations (OWNER), getReportDds (OWNER/FIN_DIR), getReportCompanyExpenses (OWNER/FIN_DIR), getReportKitchen (all 3 roles), getReportTrends (all 3 roles). All routes forward 4 headers. jest-e2e.json moduleNameMapper fixed. 9 unit tests via TDD, full suite 21/21 pass. Commits: afe91ab, c1865ce
- **05-02** (2026-04-07): E2E test suite for finance proxy — finance-proxy.e2e-spec.ts with 6 passing tests proving role enforcement. OWNER gets 200 on article operations and reports/dds; FINANCE_DIRECTOR gets 403 on OWNER-only route; OPERATIONS_DIRECTOR gets 403 on OWNER+FD dds route; OPERATIONS_DIRECTOR gets 200 on all-roles kitchen route; 404 on non-existent route. Real RolesGuard tested via overrideGuard(JwtAuthGuard). All 21 unit tests still pass. Commit: 0056f3c
- **06-01** (2026-04-07): Mobile Foundation completion — ios.minimumOsVersion=15.1, android.minSdkVersion=26, @sentry/react-native installed+plugin+init+wrap, useInactivityLogout hook (10-min AppState threshold), OTP resend timer (60s countdown) in useLogin+LoginScreen. tsc --noEmit passes. Commits: c689a36, dc110e8, da72fee
- **07-01** (2026-04-07): Mobile infrastructure layer — Screen type extended to 9 values (article-detail, operations added), 7 new DTOs (OperationDto, OperationsListDto, 4 Report* types), 5 new dashboardApi methods (getOperations + 4 reports), useOperations hook, getPeriodDates exported, App.tsx wired for Level 3/4 navigation with placeholder screens, 8 role-gate tests (OWNER-only Level 4, OWNER+FIN_DIR Level 3). expo-haptics + async-storage installed. tsc passes. Commits: 1539565, 2784305, f979ee1
- **07-02** (2026-04-07): Level 3/4 drill-down screens — ArticleDetailScreen shows DDS articles with source badge, change%, allocation badge; role-gated (OWNER drills to Level 4, FIN_DIRECTOR read-only, OPS_DIRECTOR stops at Level 2); OperationsScreen shows paginated operations with date, amount, comment, source, coefficient; load-more pagination; both screens use Haptics.impactAsync on pull-to-refresh; App.tsx placeholder components replaced with real imports. tsc passes. Commits: 864c87c, 7d592b5
- **07-03** (2026-04-07): SkeletonLoader reusable component (animated pulse 0.3→0.7). DashboardScreen: 3 KPI cards (БАЛАНС hidden for OPS_DIRECTOR), lastSyncAt indicator (red when stale >1h), skeleton loader on initial load, pull-to-refresh with haptic feedback. PointDetailScreen: tappable expense groups (OWNER+FIN_DIR Level 3 drilldown), financial result breakdown (direct + distributed), cash discrepancies section, View-based daily revenue bar chart (last 14 days), pull-to-refresh with haptics. tsc passes. Commits: c49a064, a29c615
- **07-04** (2026-04-07): ReportsScreen rewritten with 4 real report endpoints (DDS/company/kitchen/trends). useCachedQuery hook provides AsyncStorage-based offline cache with stale detection (>1hr). OfflineBanner shows offline/stale state with timestamp. OPS_DIRECTOR sees only Kitchen and Trends sections. Trends section has inline bar chart. tsc passes. Commits: de6d9cb, 3d61f51
- **08-01** (2026-04-08): Fixed 3 role dispatch bugs (LOW_REVENUE→OWNER+OPS_DIRECTOR, LARGE_EXPENSE→OWNER+FIN_DIRECTOR, SYNC_FAILURE→OWNER not ADMIN). Added NotificationPreference Prisma model + migration SQL. Added isNotificationEnabled preference check in sendToUser. Added handleInternalTrigger method. Added getUserPreferences/updatePreference. Added InternalNotificationController at POST /internal/notifications/trigger with x-internal-secret auth. 10 unit tests, tsc clean. Commits: 1e7bc49, 6804417, bebb02e
- **08-02** (2026-04-08): AlertService created in aggregator-worker — checkSyncHealth (IIKO/ONE_C, >1h failure), checkRevenueThresholds (<70% 30-day avg), checkLargeExpenses (>500000 KZT default), shouldFireAlert (Redis 4h dedup), fireAlert (fire-and-forget HTTP POST to api-gateway /internal/notifications/trigger). AlertModule registered. Wired into syncRevenue/syncExpenses/syncOneCExpenses in SchedulerService. 10 unit tests, 38/38 total, tsc clean. Commits: 0345e44, 1502cb6
- **08-03** (2026-04-08): Native FCM token registration fixed (getDevicePushTokenAsync replacing getExpoPushTokenAsync), static imports replacing dynamic import(), module-level setNotificationHandler with shouldShowAlert/shouldShowBanner/shouldShowList. usePushNotifications wired in App.tsx. useNotificationPrefs hook with optimistic toggle + error revert. ProfileScreen with 3 Switch rows (SYNC_FAILURE, LOW_REVENUE, LARGE_EXPENSE). Navigation: DashboardScreen settings icon → ProfileScreen. tsc clean. Commits: 9d473e1, 0aca2bb
- **08.1-01** (2026-04-08): syncDdsArticles (POST /v2/entities/list with GET fallback), syncDdsTransactions (/v2/cashshifts/list per restaurant, dds:{shiftId}:{movId} syncId deduplication), resolveGroupCode (12 DDS group codes). POST /sync/dds endpoint. syncAll + syncBackfill include DDS. 54 tests passing, tsc clean. Commits: 572d80c, fa33d42

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
- **[05-01]** Use .overrideGuard() in NestJS test module to isolate controller from guard dependencies (JwtService) — prevents test pollution without mocking entire module tree
- **[05-01]** Route declaration order is critical: specific routes (article/:id/operations) must appear before generic (:id) in controller class body
- **[05-02]** setGlobalPrefix('api') must be called explicitly in E2E test buildApp() — app.init() does NOT inherit it from main.ts bootstrap
- **[05-02]** overrideGuard(JwtAuthGuard) + real RolesGuard is the correct pattern for E2E role enforcement testing — never mock RolesGuard itself
- **[06-01]** iOS minimum floor is 15.1 not 14.0 — React Native 0.81 hard constraint regardless of TZ specification
- **[06-01]** Sentry enabled only when EXPO_PUBLIC_APP_ENV === 'production' — prevents noise in dev/staging with no DSN
- **[06-01]** INACTIVITY_TIMEOUT_MS = 10 min; inactive AppState treated same as background to handle iOS notification center brief inactive state (never triggers logout in practice)
- **[07-01]** Inline placeholder ArticleDetailScreen and OperationsScreen in App.tsx so Wave 2 can replace them with real imports without breaking compilation
- **[07-01]** ts-jest inline tsconfig ({ strict: true }) used in jest config instead of file path reference (rootDir=src makes relative paths resolve to wrong directory)
- **[07-01]** onNavigateArticle added as optional prop to PointDetailScreen to allow navigation wiring without breaking existing call sites that don't pass it
- **[07-02]** canDrillToLevel4 = role === 'OWNER' — OWNER taps article row to reach Level 4; FIN_DIRECTOR gets read-only Level 3 view; OPS_DIRECTOR stopped at Level 2 by App.tsx navigation guard
- **[07-02]** OperationsScreen manages page state locally — load-more increments page; pull-to-refresh invokes refetch() resetting via refreshKey in useApiQuery
- **[07-04]** useCachedQuery wraps fetcher with AsyncStorage persistence; stale threshold = 1 hour (3600000ms)
- **[07-04]** OPS_DIRECTOR sees only Kitchen and Trends sections; DDS and Company hidden via canSeeDds/canSeeCompany role checks
- **[07-03]** SkeletonLoader uses Animated.loop with opacity 0.3→0.7 sequence — useNativeDriver:true ensures 60fps on low-end devices
- **[07-03]** showBalance = OWNER || FINANCE_DIRECTOR — OPERATIONS_DIRECTOR sees only ВЫРУЧКА and РАСХОДЫ KPI cards; no Balance leak
- **[07-03]** Revenue bar chart is View-based (no victory-native) — last 14 days, proportional heights, day-of-month labels
- **[07-03]** usePointDetail refetch returned outside useMemo — computed state memoized separately; refetch callback is stable from useApiQuery
- **[07-04]** Each report section fetches independently — network failures in one section do not block others
- **[08-01]** NotificationPreference stored in @@schema(auth) — opt-out model (no row = enabled), @@unique([userId, type])
- **[08-01]** InternalNotificationController is separate class to bypass JwtAuthGuard applied at NotificationController class level
- **[08-01]** x-internal-secret header auth for aggregator-worker internal trigger — simple for internal microservice comms
- **[08-01]** Promise.allSettled for multi-role dispatch (triggerLowRevenueAlert, triggerLargeExpenseAlert) — one role failure never blocks the other
- **[08-02]** SyncLog.system is DataSource enum (IIKO|ONE_C) — checkSyncHealth uses typed 'IIKO'|'ONE_C' literal union, not free string; scheduler calls use 'IIKO' for iiko syncs, 'ONE_C' for 1C syncs
- **[08-02]** dateFrom moved to method scope (before try block) in cron methods so alert checks can reference it without scoping issues
- **[08-02]** Redis mock declared as module-level object before jest.mock() call so all tests share the same instance (not per-instance)
- **[08-03]** setNotificationHandler placed at module level (outside hook body) — prevents duplicate handler registration on re-renders; must be before any Notifications API calls
- **[08-03]** getDevicePushTokenAsync returns { type: 'fcm'|'ios', data: string } — tokenData.data is raw FCM/APNS token string for direct FCM HTTP v1 (not ExponentPushToken[] wrapper from getExpoPushTokenAsync)
- **[08-03]** NotificationBehavior in Expo SDK 54 requires shouldShowBanner + shouldShowList in addition to shouldShowAlert — TypeScript enforces all fields
- **[08-03]** onNavigateProfile added as optional prop to DashboardScreen — settings icon only renders when prop is passed, backward compatible with existing call sites
- **[08.1-01]** resolveGroupCode checks 'заработн' in addition to 'зарплат' to cover both 'Заработная плата' and 'Зарплата' Russian account name forms
- **[08.1-01]** syncDdsArticles tries POST /v2/entities/list first, falls back to GET — iiko Server v2 API pattern with graceful degradation
- **[08.1-01]** DdsArticle.upsert uses compound key groupId_code — code is not globally unique in schema (@@unique([groupId, code]))
- **[08.1-01]** syncDdsTransactions uses findFirst({ source: 'IIKO' }) not findUnique — DdsArticle.code is optional and only unique per groupId
- **[08.1-01]** syncId for DDS Expenses: dds:{shiftId}:{movementId} — global deduplication across restaurants, days, articles
- **[08.1-02]** GROUP_COLORS inlined in each screen (not extracted to shared constants file) — mobile scope is self-contained, avoids premature abstraction
- **[08.1-02]** Emoji icons used per explicit user request ("красиво") — exception to no-emoji rule documented in code comments
- **[08.1-02]** expandedGroup stores groupId string for natural single-accordion pattern; null = all collapsed; no animation for performance on low-end Android
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

## Roadmap Evolution

- Phase 08.1 inserted after Phase 8: Подключить реальные ДДС статьи из iiko Server API — синхронизация транзакций по 42 статьям (URGENT)

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
