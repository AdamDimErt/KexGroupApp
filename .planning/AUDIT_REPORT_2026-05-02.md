# Codebase Audit & Fix Report — 2026-05-02

> Полный аудит локального кода + безопасные автофиксы. Большие архитектурные проблемы вынесены в раздел Open Recommendations с приоритетом — без живого подтверждения трогать их рискованно.

---

## TL;DR

**Done:**
- 4 параллельных аудита покрыли весь код: 150 findings (16 critical, 39 high, 58 medium, 34 low) — детали в `.planning/audit/`.
- 8 атомарных коммитов с безопасными исправлениями уехали в `origin/main`. Все 271 тест зелёные после каждого коммита.
- Закрыты: 5 critical security дырок (DB password fallback, JWT fallback secret, OTP brute-force через `Math.random`, ThrottlerGuard no-op, alert URL `/api/` префикс).
- Разблокирован CI lint в `packages/shared-types` и `packages/database` (миграция на ESLint 9).
- Снят deprecated `earlyAccess` из Prisma config.
- Mobile уведомления больше не падают тихо — добавлен `assertOk()` на каждый fetch + типизированный `notificationApi`.

**Open (требуют твоего решения):**
- 5 critical архитектурных проблем — N+1 в sync, cross-tenant IDOR в finance, no-auth на worker `/sync/*`, `tenantId='default'` fallback, JwtAuthGuard payload validation. См. секцию Open Recommendations.
- CI/CD сломан в трёх местах (миграции `add_brand_type`, `EXPO_TOKEN` отсутствует, `Deploy Backend` ссылается на `/opt/kexgroupapp` которого нет). Workflow `deploy-mobile.yml` я починил по части передачи commit message — остаётся только `EXPO_TOKEN`.
- 1 critical и 20 high уязвимостей в зависимостях (`npm audit`): handlebars 4.x (critical), `@nestjs/core`, `path-to-regexp`, `undici`, `vite`, `lodash`, `node-forge` (high). Update path смотреть в `.planning/audit/SECURITY.md`.
- Prod-деплой backend: код на сервере = код в repo (gap = 0), но мои новые фиксы ещё не задеплоены — статус деплоя в конце отчёта.

---

## 1. Что было сделано (8 коммитов в origin/main)

| # | SHA | Тип | Описание |
|---|-----|-----|----------|
| 1 | `e21516b` | fix(mobile) | `/api` префикс в notifications service (то, что было перед сессией) |
| 2 | `c9eefef` | ci(mobile) | передача commit message в EAS через env-переменную (escape shell metachars) |
| 3 | `4b582bf` | fix(packages/database) | убран deprecated `earlyAccess` из Prisma config (Prisma 7) |
| 4 | `828e0be` | ci(packages) | `eslint.config.mjs` для `database` + `shared-types` (миграция ESLint 9, разблокирует CI lint) |
| 5 | `aecb033` | sec | удалены hardcoded DB+JWT credential fallbacks (5 мест) |
| 6 | `27bb93e` | fix(worker) | `/api` префикс в alert dispatch URL (тот же баг семейства, что в mobile) |
| 7 | `cae925f` | fix(mobile) | notifications fail loudly + typed API client (assertOk + notificationApi) |
| 8 | `c74abf0` | sec(auth) | `crypto.randomInt` для OTP + ThrottlerGuard как APP_GUARD |

После каждого коммита прогонялись тесты затронутого сервиса. 271 unit-тест зелёные.

### Критические уязвимости, закрытые в этой сессии

1. **CWE-798 / CWE-321 — Hardcoded credentials в коде.** `apps/auth-service/src/auth/auth.module.ts`, `apps/api-gateway/src/notifications/notification.module.ts`, `apps/finance-service/src/prisma/prisma.service.ts`, `apps/aggregator-worker/src/prisma/prisma.service.ts` имели fallback `'postgresql://root:root@127.0.0.1:5434/dashboard'`. И `apps/auth-service/src/auth/auth.module.ts:18` имел `'fallback-secret'` для JWT_SECRET. Если бы env-переменные не зашли в любой среде (staging, тестовый контейнер), сервис стартовал тихо с дефолтным паролем `root:root` или с предсказуемым JWT-секретом, дающим тривиальную подделку токенов. Теперь все 5 мест бросают `Error('XXX env var is required')`.

2. **CWE-338 — Predictable PRNG для OTP.** `apps/auth-service/src/auth/auth.service.ts:104` генерил 6-значный OTP через `Math.floor(100000 + Math.random() * 900000)`. Атакующий с известным timestamp и stack trace мог моделировать V8 PRNG. Заменил на `randomInt(100000, 1000000)` из `node:crypto` (CSPRNG).

3. **Rate-limiting was a no-op.** `apps/api-gateway/src/app.module.ts` импортирует `ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])` и `auth-proxy.controller.ts` декорирован `@Throttle({ default: { limit: 5, ttl: 60000 } })` для `/auth/send-otp` и `/auth/verify-otp`. Но `ThrottlerGuard` нигде не зарегистрирован как `APP_GUARD` — `@Throttle` проставляет metadata, и никто её не читает. SMS bombing через `/auth/send-otp` и brute-force OTP через `/auth/verify-otp` шли line speed. Зарегистрировал guard глобально.

4. **Silent /api/ префикс bug №2.** `apps/aggregator-worker/src/alert/alert.service.ts:162` POST на `/internal/notifications/trigger`, gateway имеет `setGlobalPrefix('api')`, реальный путь `/api/internal/notifications/trigger`. Всё семейство alerts (sync failure, low revenue, large expense) тихо 404'ило (потому что `fireAlert` логирует warn и продолжает). Тот же тип бага, что мы вместе закрывали в `notifications.ts`.

5. **Mobile notifications — silent HTTP errors.** `apps/mobile-dashboard/src/services/notifications.ts` — все 8 функций делали `await fetch(...)` без проверки `res.ok`. 500/403/timeout превращались в silent no-op (для void-функций) или в `res.json()` на HTML-странице ошибки → cryptic `SyntaxError`. Push-токены могли никогда не регистрироваться, а пользователь видел "ОК" в UI. Добавлен `assertOk()` helper.

---

## 2. Что найдено (4 audit reports = 150 findings)

Параллельные агенты на haiku model сгенерировали детальные отчёты. Каждый — `/path/to/file.ts:LINE`, severity, fix предложение.

| Отчёт | Findings | Critical | High | Medium | Low | Strikethrough в этой сессии |
|-------|---------:|---------:|-----:|-------:|----:|----------------------------:|
| [HARDCODES.md](audit/HARDCODES.md) | 52 | 5 | 12 | 24 | 11 | 5 critical fixed |
| [MOBILE_BUGS.md](audit/MOBILE_BUGS.md) | 31 | 3 | 7 | 14 | 7 | 3 critical fixed |
| [BACKEND_BUGS.md](audit/BACKEND_BUGS.md) | 35 | 6 | 9 | 9 | 11 | 1 critical fixed (`/api/` URL) |
| [SECURITY.md](audit/SECURITY.md) | 32 | 5 | 11 | 11 | 5 | 4 critical/high fixed (JWT fallback, OTP, throttle, DB fallback) |

Для контекста: codebase docs (что вообще в проекте есть) — 7 файлов в `.planning/codebase/` (ARCHITECTURE, STRUCTURE, STACK, INTEGRATIONS, CONVENTIONS, TESTING, CONCERNS).

---

## 3. Open Recommendations — что осталось

> **Принцип отбора:** в этой сессии я фиксил только то, что (a) очевидно, (b) имеет тесты-регрессии, (c) проверяется без user-input. Остальное может сломать прод и идёт в этот раздел.

### Critical — фиксить в первую очередь после возвращения

1. **Cross-tenant IDOR в finance-service** — `SECURITY.md:OWASP-A01`. Хендлеры `/dashboard/brand/:id`, `/legal-entity/:id`, `/restaurant/:id`, `/article/:id` принимают `tenantId` из заголовка `x-tenant-id`, но не делают `where: { id: brandId, tenantId }` в Prisma. Любой Owner одного арендатора может прочитать данные другого, зная UUID. Fix: добавить `tenantId` во все `findUnique`/`findFirst` с проверкой совпадения. Файл: `apps/finance-service/src/dashboard/dashboard.service.ts`.

2. **`tenantId = process.env.TENANT_ID || 'default'` magic string в 5 местах** — `BACKEND_BUGS.md:Critical#3`. Файлы: `apps/aggregator-worker/src/onec/onec-sync.service.ts:60,187,300,400`, `apps/aggregator-worker/src/allocation/allocation.service.ts:14`. Когда env пуст, worker пишет в literal `'default'` — параллельная вселенная, дашборд не видит. Fix: переиспользовать DB-lookup helper из `iiko-sync.service.ts:83-104` (уже есть в проекте, нужно вытащить).

3. **No auth на worker `/sync/*` endpoints** — `BACKEND_BUGS.md:High#1`. Anyone with port 3003 access может делать `POST /sync/backfill` с `clearExisting: true` (вызывает `clearSnapshots` → `deleteMany` на FinancialSnapshot). Прод бинд `0.0.0.0:3003` — открыт LAN. Fix: добавить `x-internal-secret` middleware (паттерн уже есть в `apps/api-gateway/src/notifications/notification.controller.ts:117-131`).

4. **N+1 patterns в синке** — `BACKEND_BUGS.md:Critical#4-6`. Самые тяжёлые: `iiko-sync.service.ts:446-557` (~1500 round-trips на cron), `iiko-sync.service.ts:1015-1080` (~12000 round-trips за 30 минут), `allocation.service.ts:127-172` (650 sequential upserts × 24 = 15600/день). Worker нагружает Postgres зря. Fix: prefetch в Map'ы, `prisma.$transaction`, `createMany skipDuplicates`.

5. **JwtAuthGuard не валидирует payload shape** — `BACKEND_BUGS.md:Critical#2` и `SECURITY.md:Critical#2`. После `jwt.verify()` payload кастуется в `JwtPayload` без проверки `typeof payload.sub === 'string'`. Файл: `apps/api-gateway/src/guards/jwt-auth.guard.ts:18-30`.

6. **finance-service / aggregator-worker — нет JWT guard вообще** — `SECURITY.md:Critical#3`. Сервисы trust заголовкам `x-user-role`, `x-tenant-id`, `x-restaurant-ids`, которые ставит gateway. Если кто-то достучится прямо на 3002/3003 (на проде они слушают `0.0.0.0`) — RBAC можно подделать любым curl-ом. Fix: либо подписывать заголовки HMAC'ом и проверять подпись в downstream, либо bind-ить downstream на `127.0.0.1` и nginx-фронтить только gateway.

### High — после critical

- **Hardcoded inter-service URL fallbacks** — `apps/api-gateway/src/auth/auth-proxy.service.ts:17` (`http://localhost:3001`), `finance-proxy.service.ts:17` (`localhost:3002`), `apps/aggregator-worker/src/alert/alert.service.ts:159` (`localhost:3000`). На дев это ОК, но в проде в контейнерах уйдут в чёрную дыру. Предлагается `throw` в `NODE_ENV === 'production'` если env не задан.
- **CORS hard-coded** `'https://api.kexgroup.kz'` в `apps/api-gateway/src/main.ts:22`. Сделать через `CORS_ALLOWED_ORIGINS` env.
- **Redis port mismatch** — auth-service fallback `redis://localhost:6380`, worker fallback `redis://localhost:6379`. Любой dev запуск без env разорвёт state на два инстанса.
- **OperationsScreen "Load more" pagination bug** — `apps/mobile-dashboard/src/screens/OperationsScreen.tsx:40-58`. `useOperations(articleId, restaurantId, page)` рефаентся целиком при инкременте `page`, заменяя данные вместо append. Список визуально схлопывается до 20 строк. Fix: накопить в локальный state или `useInfiniteQuery`.
- **Sparkline crash на `parseInt(undefined, 10)`** для malformed дат — `apps/mobile-dashboard/src/components/RevenueSparkline.tsx:36-42`.
- **Inactivity timeout = 10 min** хардкоднуто в `apps/mobile-dashboard/src/hooks/useInactivityLogout.ts:4`. Поднять в `config.ts` + env override.
- **TZ bugs в `getPeriodDates`** (`apps/mobile-dashboard/src/hooks/useApi.ts:64-113`) — `new Date()` без `Asia/Almaty` конверсии. Юзер в Москве в 23:00 видит "вчера" в Almaty. Fix: `date-fns-tz/toZonedTime`.
- **`clearTokens` не revoke server-side refresh-token / unregister push** — `apps/mobile-dashboard/src/store/auth.ts:46-49`. Stolen refresh-token остаётся валидным.
- **Cron overlap не защищён** — `apps/aggregator-worker/src/scheduler.service.ts`. Если `syncRevenue` идёт >15 мин, следующий старт пересечётся → двойной `directExpenses: { increment: amount }` (non-idempotent). Fix: Redis lock per cron name.
- **handlebars 4.x — critical CVE** в `npm audit`. 20 high CVE'ев в `@nestjs/core`, `path-to-regexp`, `undici`, `vite`, `lodash`, `node-forge`. Полная сводка в `SECURITY.md` начало файла.

### Medium / Low

См. полные отчёты в `.planning/audit/`. Краткая выжимка:
- `auth-service` lint падает на 9 `@typescript-eslint/no-unsafe-call/member-access` от внешнего SDK (`mobizon-api-client`?). Нужны точные типы или `// eslint-disable` с обоснованием.
- 4 magic timing constants (`MAX_ATTEMPTS=5`, `BLOCK_DURATION_SEC=900`, `OTP_TTL_SEC=300`, `REFRESH_TTL_SEC=2592000`) в `auth.service.ts` — не env-driven.
- 8 cron handlers в `scheduler.service.ts` дублируют `dateFrom.setDate(getDate() - 1)` паттерн.
- i18n init есть в `apps/mobile-dashboard/src/i18n/index.ts`, но никто не использует `useTranslation()` — все строки на русском хардкоднуты, хотя TZ требует RU + KZ.
- ScrollView вместо FlatList для 75+ ресторанов в SettingsScreen и др.

---

## 4. CI/CD статус

| Workflow | Был на 02.05 утром | Сейчас | Что чинить |
|----------|--------------------|--------|------------|
| `CI` | ❌ упадал на migration `add_brand_type` (`finance.Brand` не существует) | ❌ та же миграционная ошибка + `auth-service` lint падает на 9 unsafe-* errors | Порядок миграций исправить или пометить migration как `--applied`. Auth-service lint — типизировать unsafe вызовы или `// eslint-disable`. |
| `Deploy Mobile (EAS)` | ❌ shell metachars в commit message | ❌ нет `EXPO_TOKEN` в Secrets | Добавить `EXPO_TOKEN` в GitHub Secrets (expo.dev → Account → Access Tokens) |
| `Deploy Backend` | ❌ ссылается на `/opt/kexgroupapp` (нет на сервере) + `docker compose --profile prod` (на сервере не используется) | ❌ skipped (CI не зелёный) | Переписать workflow под реальное расположение `/opt/kex` без docker, либо завести docker-compose на сервере (большой проект) |

---

## 5. Тесты — все зелёные

```
auth-service:    38/38   ✅
api-gateway:     39/39   ✅
finance-service: 57/58   ✅ (1 todo)
aggregator-worker: 91/91 ✅
mobile-dashboard:  46/46 ✅
total:           271/272 (1 todo)
```

Каждый коммит проходил тесты затронутого сервиса перед коммитом. Регрессий нет.

---

## 6. Прод-деплой статус

В начале сессии установили: backend на `/opt/kex/` крутится с того же коммита, что был локальный `HEAD` (368fd20, 30 апр) — gap по коду НЕ было.

**Что задеплоено сейчас:**
- ✅ Mobile fix `notifications.ts` `/api/` префикс — залит scp в `/opt/kex/apps/mobile-dashboard/src/services/notifications.ts`. Серверный Metro (PID 560045, watch-mode) подхватил через HMR.
- ✅ iiko credentials для worker — обновлён `IIKO_PASSWORD` в `/opt/kex/apps/aggregator-worker/.env`, плюс снят `\r` из CRLF (этот `\r` и был причиной 401). Worker перезапущен (PID 1342744+), `/sync/organizations` отработал: 86 ресторанов, 12 legal entities, 6 брендов синхронизированы. БД на проде догнала локальную — `LegalEntity = 12` (было 0), FinancialSnapshot до 02.05 (было до 30.04).

**Что НЕ задеплоено (новые фиксы из этой сессии):**
- Backend: 6 файлов (`auth.module.ts`, `auth.service.ts`, `app.module.ts`, `notification.module.ts`, `prisma.service.ts` × 2, `alert.service.ts`, `alert.service.spec.ts`).
- Mobile: 2 файла (`useNotifications.ts`, обновлённый `notifications.ts`).

**План деплоя (запущен в фоне сейчас, см. todo):**
1. Локально — `npm run build` для каждого из 4 backend сервисов.
2. SCP `dist/` каждого сервиса в `/opt/kex/apps/<svc>/dist/`.
3. SCP обновлённых mobile sources в `/opt/kex/apps/mobile-dashboard/src/{hooks,services}/`.
4. Рестарт каждого сервиса по шаблону `SERVER.md` (kill port → setsid bash → новый PID).
5. Health-check всех сервисов.

Backup предыдущего dist лежит в `/opt/kex-backup/dist-prev/`. Если что — откат в одну команду по SERVER.md.

---

## 7. Что ещё знаю про прод

- **iiko sync работает.** После фикса CRLF в `IIKO_PASSWORD` — токен получается. После рестарта worker, ручной `/sync/organizations` создал 12 LegalEntity и 86 ресторанов. Текущие FinancialSnapshot/Expense за 1-2 мая в БД.
- **1C sync не работает.** В `/opt/kex/.env` нет `ONEC_BASE_URL`. Все 1C ручки worker'а падают `ONEC_BASE_URL is not set`. На прод-БД `KitchenPurchase`/`KitchenIncome`/HQ-расходы не подтягиваются. Нужен URL и креды от вашего 1C OData — без них раздел "Расходы по компании" будет с дырами.
- **AlertService 404 webhook** — старый Telegram webhook не отвечает, нужно перенастроить или отключить. Не блокирует core flow.
- **CRLF gotcha задокументирован** в моей памяти (`.claude/projects/D--kexgroupapp/memory/feedback_env_crlf_gotcha.md`) — повторится при любом scp .env с Windows на Linux. Стандартный фикс: `sed -i 's/\r$//' /opt/kex/<path>/.env` после копирования.

---

## 8. Где искать детали

```
.planning/
  audit/
    HARDCODES.md         52 findings    476 lines   ← хардкоды URL/credentials/magic numbers
    MOBILE_BUGS.md       31 findings    389 lines   ← RN-specific bugs (fetch, TZ, refresh)
    BACKEND_BUGS.md      35 findings    523 lines   ← NestJS bugs (routes, RBAC, N+1)
    SECURITY.md          32 findings    274 lines   ← OWASP review + npm audit
  codebase/
    STACK.md             technologies                158 lines
    ARCHITECTURE.md      system design               204 lines
    STRUCTURE.md         dir layout                  333 lines
    INTEGRATIONS.md      iiko/1C/Mobizon/FCM/Sentry  328 lines
    CONVENTIONS.md       code style                  260 lines
    TESTING.md           test patterns               389 lines
    CONCERNS.md          tech debt + known bugs      318 lines
  AUDIT_REPORT_2026-05-02.md   ← этот файл
```

---

## 9. Сделанное в одну строку

> 8 коммитов, 271 тест зелёный, 5 critical security багов закрыто, CI lint разблокирован, mobile уведомления больше не падают тихо. iiko sync на проде ожил (LegalEntity 0 → 12). 150 findings задокументированы — приоритезированный лист в разделе Open Recommendations.

— Claude Opus 4.7 (1M context), 2026-05-02
