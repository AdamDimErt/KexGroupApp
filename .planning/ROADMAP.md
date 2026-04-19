# Roadmap — KEX GROUP Dashboard

> Источник: подписанное ТЗ v1.5 «Управленческий мобильный дашборд»
> Заказчик: ТОО «KEX GROUP» · Исполнитель: ТОО «AJD GROUP KZ»
> Срок по ТЗ: 8–14 недель от старта

---

## Роли (3 штуки по ТЗ)

| Роль | Код в системе | Доступ |
|------|--------------|--------|
| 👑 Владелец | `OWNER` | Все данные, все 4 уровня drill-down, все точки |
| 📊 Фин. директор | `FIN_DIRECTOR` | Все финансовые данные сводно, без уровня 4 (операции) |
| ⚙️ Опер. директор | `OPS_DIRECTOR` | Выручка, смены, Цех — без финансовых деталей ГО, без уровней 3-4 |

---

## Drill-down навигация (4 уровня по ТЗ)

```
УРОВЕНЬ 1: Компания (главный экран)
  Выручка · Расходы · Баланс · Плитки по брендам
    │
    ▼
УРОВЕНЬ 2: Точка (нажал на точку)
  Выручка по типам оплат · Расходы по группам статей ДДС
  Распределённые затраты · Финрезультат · Недостачи/излишки
    │
    ▼
УРОВЕНЬ 3: Статья (нажал на группу расходов) — 👑 + 📊
  Статьи ДДС с суммами · Доля в расходах (%) · Сравнение с прошлым периодом
  Пометка: прямая (iiko) или распределённая (1С)
    │
    ▼
УРОВЕНЬ 4: Операция (нажал на статью) — только 👑
  Дата/время · Сумма · Комментарий · Источник (iiko/1С) · Коэффициент распределения
```

---

## Матрица доступа (по ТЗ)

| Данные / Экран | 👑 Владелец | 📊 Фин.дир | ⚙️ Опер.дир |
|----------------|------------|------------|-------------|
| **УРОВЕНЬ 1 — КОМПАНИЯ** | | | |
| Выручка по компании | ✅ Полный | ✅ Полный | ✅ Полный |
| Расходы по компании | ✅ Полный | ✅ Полный | 📊 Сводка |
| Финансовый результат (баланс) | ✅ Полный | ✅ Полный | — |
| Плитки по точкам с выручкой | ✅ Полный | ✅ Полный | ✅ Полный |
| **УРОВЕНЬ 2 — ТОЧКА** | | | |
| Выручка точки по типам оплат | ✅ Полный | ✅ Полный | ✅ Полный |
| Расходы точки по группам статей | ✅ Полный | ✅ Полный | 📊 Сводка |
| Распределённые затраты (ГО, Цех) | ✅ Полный | ✅ Полный | — |
| Финансовый результат точки | ✅ Полный | 📊 Сводка | — |
| Недостачи и излишки по кассе | ✅ Полный | ✅ Полный | 📊 Сводка |
| **УРОВЕНЬ 3 — СТАТЬИ** | | | |
| Статьи ДДС (прямые расходы) | ✅ Полный | ✅ Полный | — |
| Распределённые статьи из 1С | ✅ Полный | ✅ Полный | — |
| Доля каждой статьи (%) | ✅ Полный | ✅ Полный | — |
| Сравнение с прошлым периодом | ✅ Полный | 📊 Сводка | — |
| **УРОВЕНЬ 4 — ОПЕРАЦИИ** | | | |
| Список операций (дата, сумма, описание) | ✅ Полный | — | — |
| Источник операции (iiko/1С) | ✅ Полный | — | — |
| Коэффициент распределения | ✅ Полный | — | — |
| **ОТЧЁТЫ** | | | |
| ДДС сводный по всем точкам | ✅ Полный | ✅ Полный | — |
| Затраты компании (ГО + Цех) | ✅ Полный | ✅ Полный | — |
| Закупки и отгрузки Цеха | ✅ Полный | ✅ Полный | ✅ Полный |
| Аналитика и тренды | ✅ Полный | ✅ Полный | 📊 Сводка |

> ✅ Полный = все данные и детализация · 📊 Сводка = только агрегированные цифры · — = нет доступа

---

## Структура организаций (из iiko)

```
Kexbrands ЦО (Корпорация)
├── Burger na Abaya (Бренд / Структурное подразделение)
│   └── ТОО "Burger na Abaya" (Юрлицо)
│       ├── BNA Бесагаш
│       ├── BNA Жангельдина
│       ├── BNA Жетысу
│       ├── BNA Сейфуллина
│       ├── BNA Стадион
│       ├── BNA Тастак
│       ├── BNA Шугыла
│       └── BNA Эверест         (8 точек)
│
├── Doner na Abaya (Бренд / Структурное подразделение)
│   └── ТОО "A Doner" (Юрлицо)
│       ├── DNA Абая-Правды
│       ├── DNA Айманова
│       ├── DNA Айнабулак
│       ├── DNA Аксай
│       └── DNA Апорт Ташкентский  (5+ точек)
│
└── ... (возможно другие бренды)
```

**Главный экран = Вариант Б**: сначала бренды, потом точки при раскрытии.

---

## Источники данных

### iiko — выручка и ДДС
| Данные | Что показываем |
|--------|---------------|
| Выручка по точкам | Наличные, Kaspi QR, Halyk QR, Яндекс Еда |
| Статьи ДДС | 40+ статей — прямые расходы привязанные к точке |
| Статьи ДДС (без точки) | Распределяются по удельному весу выручки |
| Комиссии банков | Kaspi Bank, Halyk Bank, Яндекс |

### 1С — затраты и Цех
| Данные | Что показываем |
|--------|---------------|
| Затраты ГО | Аренда, ЗП операционистов/брендшефов, IT — распределяются по удельному весу |
| Затраты Цеха | Аренда, ЗП, водители, оборудование, налоги — распределяются по удельному весу |
| Закупки сырья | Бакалея, фритюрный жир, напитки, сиропы |
| Отгрузки Цеха по точкам | Прямая привязка — не распределяются |
| Поступления в Цех | Денежные поступления на счёт Цеха |

---

## Логика распределения затрат по удельному весу

```
Доля точки = Выручка точки за период ÷ Общая выручка всех точек за тот же период
```

**Пример:** Выручка 10 000 000 ₸. Точка А = 4 000 000 ₸ (40%). Общие затраты ГО = 1 000 000 ₸. Точка А получает 400 000 ₸.

| Статья затрат | Источник | Метод |
|--------------|----------|-------|
| Аренда ГО | 1С | По удельному весу выручки |
| ЗП операционистов и брендшефов | 1С | По удельному весу выручки |
| Расходы на IT и связь ГО | 1С | По удельному весу выручки |
| Затраты Цеха (аренда, ЗП, прочее) | 1С | По удельному весу выручки |
| Статьи ДДС без точки в iiko | iiko | По удельному весу выручки |
| Прямые расходы точки | iiko | Прямая привязка — не распределяется |
| Отгрузки Цеха по точкам | 1С | Прямая привязка — не распределяется |

> Распределение пересчитывается при каждой смене периода.

---

## Phase 1: Инфраструктура (Monorepo + Docker + DB)
**Статус: 🔄 ~90% готово**
**Срок по ТЗ: входит в Этап 1 (3-4 недели)**

- [x] Инициализировать монорепозиторий с Turborepo
- [x] Создать структуру: `mobile-dashboard`, `api-gateway`, `auth-service`, `finance-service`, `aggregator-worker`
- [x] Создать общие пакеты: `shared-types`, `database`, `testing`
- [x] `docker-compose.yml` с PostgreSQL 15 и Redis 7
- [x] Единая PostgreSQL с multi-schema (auth + finance) через Prisma
- [ ] Запустить Prisma миграции (`prisma migrate dev`) ⚠️ БЛОКЕР — нужен Docker
- [x] **Prisma-схема (18 моделей — всё готово):**
  - [x] Модель `Brand` (бренд/структурное подразделение: Burger na Abaya, Doner na Abaya)
  - [x] Модель `Restaurant` с привязкой к Brand + `iikoId` + `oneCId`
  - [x] Модель `DdsArticle` + `DdsArticleGroup` (справочник 40+ статей ДДС с кодами и группами)
  - [x] Модель `FinancialSnapshot` (выручка по типам оплат, расходы по точке за дату)
  - [x] Модель `Expense` (расход по статье ДДС, привязка к точке или "общий")
  - [x] Модель `CostAllocation` (распределённые затраты: сумма, коэффициент, источник)
  - [x] Модель `KitchenShipment` (отгрузки Цеха по точкам)
  - [x] Модель `KitchenPurchase` (закупки сырья Цехом)
  - [x] Модель `KitchenIncome` (поступления Цеха)
  - [x] Модель `CashDiscrepancy` (недостачи/излишки по кассе)
  - [x] Модель `SyncLog` (лог синхронизации: источник, статус, ошибка, длительность)
  - [x] Модель `AuditLog` (кто, когда, что смотрел, IP)
  - [x] Модель `NotificationToken` + `NotificationLog`
  - [x] Обновить модель `User` (роль: OWNER / FINANCE_DIRECTOR / OPERATIONS_DIRECTOR)
  - [x] Индексы: `(restaurantId, date)` на FinancialSnapshot, `(articleId, date)` и `(restaurantId, date)` на Expense
- [x] Seed-скрипт (`prisma/seed.ts`): 6 брендов, 83 точки с iiko UUID, 4 тестовых пользователя, 12 групп ДДС
- [x] Настроить `.env.example` + `.gitignore`
- [ ] Добавить в `docker-compose.yml` образы для 4-х backend сервисов
- [ ] Написать `Dockerfile` для каждого NestJS сервиса (multi-stage build)
- [ ] Автоматические бэкапы PostgreSQL (pg_dump cron → хранение)

---

## Phase 2: Auth Service
**Статус: ✅ ~95% готово**
**Срок по ТЗ: входит в Этап 1 (3-4 недели)**

**Plans:** 5/5 plans executed

Plans:
- [x] 02-00-PLAN.md -- Leader schema migration (biometricEnabled field)
- [x] 02-01-PLAN.md -- AuditLog integration + JWT TTL reduction
- [x] 02-02-PLAN.md -- Telegram Gateway OTP (primary channel + SMS fallback)
- [x] 02-03-PLAN.md -- Biometric endpoints (service + controller)
- [x] 02-04-PLAN.md -- Unit tests for biometric + AuditLog

- [x] Инициализировать NestJS сервис `auth-service`
- [x] OTP генерация и хранение в Redis с TTL 5 минут
- [x] Rate-limiting: блокировка после 5 попыток на 15 минут (Redis)
- [x] JWT генерация через @nestjs/jwt (payload: sub, role, tenantId, restaurantIds)
- [x] Интеграция Mobizon.kz для SMS OTP
- [x] `POST /auth/send-otp` — принимает номер телефона
- [x] `POST /auth/verify-otp` — возвращает JWT с ролью
- [x] `POST /auth/refresh` — refresh tokens
- [x] `GET /auth/me` — профиль текущего пользователя
- [x] `class-validator` + `class-transformer` для валидации DTO
- [x] Health check: `GET /health`
- [ ] **Интегрировать Prisma** — найти/создать пользователя по номеру телефона в реальной БД (сейчас mock)
- [x] **Telegram Gateway** — OTP через Telegram (основной канал), SMS fallback через Mobizon
- [x] **PIN/биометрия (Face ID / отпечаток пальца):**
  - [x] Endpoint `POST /auth/biometric/enable` — включить биометрию для пользователя
  - [x] Endpoint `POST /auth/biometric/verify` — выдать JWT по refresh token + biometric flag
  - [x] Поле `biometricEnabled: Boolean` в модели User
- [x] **Автовыход при неактивности** (реализован в мобилке через useInactivityLogout)
- [x] **AuditLog:** записывать каждый логин (userId, action, IP, timestamp)
- [x] Unit-тесты для auth.service.ts (35 тестов, Jest)

---

## Phase 3: Aggregator Worker (iiko + 1С)
**Статус: 🔄 ~70% готово**
**Срок по ТЗ: Этап 1 (iiko) + Этап 2 (1С) = 6-8 недель**
**Plans:** 4/4 plans complete

> 📚 **NotebookLM обязателен** — см. `.planning/NOTEBOOKLM.md`

Plans:
- [x] 03-01-PLAN.md — iiko nomenclature groups sync (syncNomenclature + cron + tests)
- [x] 03-02-PLAN.md — Sentry integration (@sentry/node init + captureException in all catch blocks)
- [x] 03-03-PLAN.md — Dead letter pattern (needsManualReview field + logSync logic + tests)
- [x] 03-04-PLAN.md — 1C kitchen shipments by restaurant (syncKitchenShipmentsByRestaurant + cron + tests)

### 3.1 iiko интеграция
- [x] 📖 Исследование iiko Cloud API (21 эндпоинт, приоритеты CRITICAL/HIGH/MEDIUM/LOW)
- [x] HTTP-клиент для iiko Server API (GET-only, XML responses):
  - [x] Авторизация (токен через Redis, TTL 55min, авторефреш каждые 45min)
  - [x] Список организаций (маппинг на Brand + Restaurant) — `syncStructure()`
  - [x] Выручка по точкам — `syncRevenue()` через `/reports/olap`
  - [x] Статьи ДДС — `syncExpenses()` через `/reports/expenses`
  - [x] Кассовые смены (недостачи и излишки) — `syncCashDiscrepancies()` через `/reports/cashDiscrepancy`
  - [x] Отгрузки Цеха по точкам — `syncKitchenShipments()` через `/reports/storeOperations`
- [x] Circuit Breaker (Map-based, 3 failures → 15min block → auto-recovery, без внешних зависимостей)
- [x] Retry с exponential backoff (макс. 3 попытки)
- [x] Выручка по типам оплат (Наличные, Kaspi QR, Halyk QR, Яндекс) — разбивка в syncRevenue
- [ ] Номенклатурные группы — `GET /nomenclature/groups` → DdsArticle/DdsArticleGroup

### 3.2 1С интеграция
- [x] 📖 Исследование 1С OData API
- [x] HTTP-клиент для 1С REST API (Basic Auth) — `OnecSyncService`:
  - [x] Затраты ГО (аренда, ЗП, IT) — `syncExpenses()`
  - [x] Закупки сырья Цехом — `syncKitchenPurchases()`
  - [x] Поступления на счёт Цеха — `syncKitchenIncomes()`
- [ ] Отгрузки Цеха по точкам из 1С (прямая привязка)

### 3.3 Cron задачи (scheduler)
- [x] `@nestjs/schedule` для cron jobs — `SchedulerService`
- [x] Структура iiko → Brand, Restaurant (ежедневно 03:00)
- [x] Выручка iiko → FinancialSnapshot (каждые 15 мин)
- [x] ДДС iiko → Expense (каждые 30 мин)
- [x] Cash discrepancies iiko (каждый час :10)
- [x] Kitchen shipments iiko (каждый час :20)
- [x] 1С затраты → Expense (каждый час :00)
- [x] 1С закупки/поступления Цеха (каждый час :30)
- [x] Cost Allocation run (после синхронизации, :40)
- [x] Upsert по syncId (idempotency key — дедупликация)
- [x] Запись в SyncLog (SUCCESS/ERROR, длительность, кол-во записей)

### 3.4 Движок распределения затрат (Cost Allocation Engine)
- [x] **Расчёт удельного веса** для каждой точки за период — `AllocationService`
- [x] **Распределение** нераспределённых затрат (Expense с restaurantId=null):
  - [x] coefficient = restaurant.revenue / total_revenue
  - [x] allocated_amount = original_amount × coefficient
- [x] Сохранение в `CostAllocation` (Prisma.Decimal для точности — 6 знаков коэф., 2 знака сумм)
- [x] Финрезультат точки = Выручка − Прямые расходы − Распределённые затраты

### 3.5 Устойчивость
- [x] Обработка таймаутов (circuit breaker при недоступности API)
- [ ] Логирование каждой синхронизации (Sentry с контекстом orgId, dateFrom, dateTo)
- [ ] Dead letter: если 3 раза провалилась → пометить в SyncLog для ручного разбора
- [x] Health check: `GET /health`

---

## Phase 4: Finance Service
**Статус: ✅ 100% готово**
**Срок по ТЗ: входит в Этапы 1-2**

**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md -- DataAccessInterceptor (role-based route protection)
- [x] 04-02-PLAN.md -- lastSyncAt fix + Level 4 operations endpoint
- [x] 04-03-PLAN.md -- Four report endpoints (DDS, company-expenses, kitchen, trends)

- [x] Подключить Prisma (database package) — PrismaModule + PrismaService
- [x] `class-validator` для валидации входящих DTO — DashboardQueryDto + 12 response DTO
- [x] **Эндпоинты (внутренние, для api-gateway):**

### Уровень 1 — Компания
- [x] `GET /dashboard?periodType=...&dateFrom=...&dateTo=...` — главный экран:
  - [x] Выручка по компании (сумма всех точек)
  - [x] Расходы по компании (прямые + распределённые)
  - [x] Баланс = Выручка − Расходы
  - [x] Список брендов с суммарной выручкой и динамикой (+/-%)
  - [x] Время последней синхронизации

### Уровень 2 — Точка
- [x] `GET /dashboard/brand/:brandId` — точки бренда (BrandDetailDto с restaurants[])
- [x] `GET /dashboard/restaurant/:restaurantId` — детализация точки:
  - [x] Выручка по типам оплат (Наличные, Kaspi QR, Halyk QR, Яндекс) — RevenueBreakdownDto
  - [x] Расходы по группам статей ДДС (с суммой по группе) — ExpenseGroupDto[]
  - [x] Распределённые затраты (доля ГО и Цеха)
  - [x] Финрезультат = Выручка − Прямые − Распределённые
  - [x] Недостачи и излишки по кассе — CashDiscrepancyResponseDto[]
  - [x] График выручки по дням за период — DailyRevenuePointDto[]

### Уровень 3 — Статьи (👑 + 📊)
- [x] `GET /dashboard/article/:groupId?restaurantId=...` — статьи ДДС (ArticleGroupDetailDto):
  - [x] Каждая статья с суммой за период
  - [x] Доля статьи в общих расходах точки (%)
  - [x] Сравнение с предыдущим аналогичным периодом (+/-)
  - [x] Пометка: прямая (iiko) или распределённая (1С)

### Уровень 4 — Операции (только 👑)
- [x] `GET /dashboard/article/:id/operations?period=...&restaurantId=...` — операции:
  - [x] Дата и время операции
  - [x] Сумма операции
  - [x] Комментарий/описание (из iiko или 1С)
  - [x] Источник: iiko (прямая) или 1С (расчётная)
  - [x] Коэффициент распределения (для распределённых)

### Отчёты
- [x] `GET /dashboard/reports/dds?period=...` — ДДС сводный по всем точкам
- [x] `GET /dashboard/reports/company-expenses?period=...` — затраты ГО + Цех
- [x] `GET /dashboard/reports/kitchen?period=...` — закупки и отгрузки Цеха
- [x] `GET /dashboard/reports/trends?period=...` — аналитика и тренды

### Переключатель периодов
- [x] Сегодня / Эта неделя / Этот месяц / Прошлый месяц / Свой диапазон — periodType в DTO
- [x] Часовой пояс: Asia/Almaty для всех бизнес-дат — parseStartDate/parseEndDate с UTC+5
- [x] При смене периода → пересчёт распределения затрат — getCoefficientForRestaurant()

### Фильтрация по роли
- [x] Фильтрация OPS_DIRECTOR по restaurantIds в контроллере (через x-user-role, x-user-restaurant-ids)
- [x] `DataAccessInterceptor` — полноценный guard по матрице доступа (6 маршрутов, regex matching)
- [x] OWNER: все данные, все уровни
- [x] FINANCE_DIRECTOR: всё кроме уровня 4 (403 на operations)
- [x] OPERATIONS_DIRECTOR: выручка + Цех + kitchen/trends, без ДДС и ГО

- [x] Unit-тесты для dashboard.service.spec.ts (6 тест-кейсов, mock Prisma + ConfigService)
- [x] Health check: `GET /health`

---

## Phase 5: API Gateway
**Статус: ✅ 100% готово**

**Plans:** 2/2 plans complete

Plans:
- [x] 05-01-PLAN.md — Add 5 proxy routes to FinanceProxyController + unit tests
- [x] 05-02-PLAN.md — E2E test suite (supertest, role enforcement verification)

- [x] JWT Guard (JwtAuthGuard — валидация Bearer токенов)
- [x] Roles Guard (RolesGuard + @Roles() декоратор для ролевого доступа)
- [x] **Публичные эндпоинты:**
  - [x] `POST /api/auth/send-otp` → proxy → auth-service
  - [x] `POST /api/auth/verify-otp` → proxy → auth-service
  - [x] `POST /api/auth/refresh` → proxy → auth-service
  - [x] `GET /api/auth/me` → proxy → auth-service (JWT required)
  - [x] `GET /api/finance/dashboard` → proxy → finance-service (JWT required)
  - [x] `GET /api/finance/brand/:id` → proxy → finance-service
  - [x] `GET /api/finance/restaurant/:id` → proxy → finance-service
  - [x] `GET /api/finance/article/:id` → proxy → finance-service (OWNER + FIN_DIRECTOR)
  - [x] `GET /api/finance/article/:id/operations` → proxy → finance-service (OWNER only)
  - [x] `GET /api/finance/reports/dds` → proxy → finance-service (OWNER + FINANCE_DIRECTOR)
  - [x] `GET /api/finance/reports/company-expenses` → proxy → finance-service (OWNER + FINANCE_DIRECTOR)
  - [x] `GET /api/finance/reports/kitchen` → proxy → finance-service (all 3 roles)
  - [x] `GET /api/finance/reports/trends` → proxy → finance-service (all 3 roles)
- [x] **Notifications эндпоинты (прямой сервис):**
  - [x] `POST /api/notifications/register-token` — регистрация FCM токена
  - [x] `POST /api/notifications/unregister-token` — удаление токена
  - [x] `GET /api/notifications` — список уведомлений с пагинацией
  - [x] `PATCH /api/notifications/:id/read` — отметить прочитанным
  - [x] `PATCH /api/notifications/read-all` — отметить все прочитанными
- [x] **Service-to-service auth:** проброс authorization + x-tenant-id, x-user-role, x-user-restaurant-ids
- [x] Swagger/OpenAPI документация (@nestjs/swagger) — доступна на `/api/docs`
- [x] Rate limiting (@nestjs/throttler):
  - [x] Auth send-otp: 5 req / 60 sec
  - [x] Auth verify-otp: 10 req / 60 sec
  - [x] Global: 30 req / 60 sec
- [ ] HTTPS: Nginx reverse proxy с SSL
- [x] `class-validator` + ValidationPipe (whitelist, forbidNonWhitelisted, transform)
- [x] Health check: `GET /health` + `GET /api/health` (с uptime)
- [x] CORS enabled (из env)
- [x] E2E тесты (supertest) — 7 тестов: role enforcement, 403/200 для всех ролей
- [x] Unit-тесты для guards (jwt-auth.guard.spec.ts, roles.guard.spec.ts)

---

## Phase 6: Mobile App — Основа
**Статус: ✅ 100% (завершено 2026-04-07)**
**Срок по ТЗ: входит в Этап 1 (3-4 недели)**

**Plans:** 1/1 plans complete

Plans:
- [x] 06-01-PLAN.md — Sentry init + OTP resend timer + inactivity auto-logout + min OS config

- [x] React Native 0.81 + Expo 54 в монорепо
- [x] Навигация (state-based routing + BottomNav компонент)
- [x] **Зависимости установлены:** `@tanstack/react-query` v5, `zustand` v5, `i18next`, `expo-secure-store`, `expo-notifications`
- [x] **Sentry** — `@sentry/react-native ~7.2.0`, Sentry.init() в App.tsx, Sentry.wrap(App), enabled только в production
- [x] **Локализация:** русский + казахский (i18next + react-i18next, файлы ru.ts/kk.ts)
- [x] **Min OS:** iOS 15.1+ / Android 8.0+ (API 26) — настроено в app.json
- [x] **Авторизация:**
  - [x] Экран ввода номера телефона (react-native-international-phone-number, Казахстан по умолчанию)
  - [x] Экран ввода OTP-кода (6 цифр, автоотправка при заполнении, авто-переход между полями)
  - [x] Таймер 60 сек для повторной отправки — countdown + кнопка "Отправить снова"
  - [x] Сохранение JWT в `expo-secure-store` (с fallback на localStorage для web)
  - [x] Автологин при наличии валидного токена — bootstrap() в auth store
  - [x] **Биометрия (Face ID / Touch ID / отпечаток пальца):**
    - [x] Установить `expo-local-authentication`
    - [x] Проверка доступности биометрии на устройстве (`hasHardwareAsync`, `isEnrolledAsync`)
    - [x] Предложение включить биометрию после первого успешного OTP-входа
    - [x] При повторном входе: `authenticateAsync()` → если OK → использовать сохранённый refresh token для получения JWT
    - [x] Настройка в профиле: вкл/выкл биометрический вход
    - [x] Fallback на OTP если биометрия не прошла или отключена
  - [x] Автовыход при неактивности — useInactivityLogout hook, 10 мин фон → logout
- [x] API client с Bearer auth + автоматический refresh токена при 401 + дедупликация refresh
- [x] React Query установлен (v5), но используются кастомные useApiQuery хуки (useState+useEffect)
- [x] Zustand stores: useAuthStore (auth state) + useDashboardStore (period, refresh)
- [x] Типы из `src/types/index.ts` (178 строк, совместимы с shared-types)
- [x] Навигация (state-based):
  ```
  App.tsx (screen state)
  ├── LoginScreen (phone + OTP)
  └── Authenticated:
      ├── DashboardScreen
      ├── BrandDetailScreen
      ├── PointsScreen / PointDetailScreen
      ├── ReportsScreen
      └── NotificationsScreen
  ```
- [x] Theme система: colors, spacing, typography, shadows

---

## Phase 7: Mobile App — Экраны (4 уровня drill-down)
**Статус: 🔄 ~75% готово**
**Срок по ТЗ: Этап 1 + Этап 2 (6-8 недель)**
**Plans:** 4/4 plans complete

Plans:
- [x] 07-01-PLAN.md — Infrastructure: types, API methods, navigation wiring
- [x] 07-02-PLAN.md — New screens: ArticleDetailScreen (L3) + OperationsScreen (L4)
- [x] 07-03-PLAN.md — Enhance existing: DashboardScreen + PointDetailScreen
- [x] 07-04-PLAN.md — Reports rewrite + offline cache

### Уровень 1 — Главный экран (Компания)
- [x] DashboardScreen — основной экран с данными
- [x] Три ключевые цифры: Выручка · Расходы · Баланс
- [x] Переключатель периода: Сегодня / Неделя / Месяц / Прошлый месяц / Свой диапазон
- [x] **Плитки по брендам** (Вариант Б):
  - [x] Burger na Abaya → выручка, динамика (+/-%)
  - [x] Doner na Abaya → выручка, динамика (+/-%)
  - [x] Нажатие → переход к BrandDetailScreen
- [x] Индикатор "последняя синхронизация: ЧЧ:ММ"
- [x] Pull-to-refresh с haptic feedback
- [x] Skeleton loader при загрузке
- [x] Фильтрация по матрице доступа (OPS_DIRECTOR не видит баланс и финрезультат)
- [x] Динамическое приветствие по времени суток
- [x] Error state с кнопкой "Повторить"

### Уровень 1b — Бренд (список точек)
- [x] BrandDetailScreen — список ресторанов бренда
- [x] RestaurantCard компонент (со стилями)
- [x] Переход к PointDetailScreen при нажатии
- [x] Pull-to-refresh с haptic feedback
- [x] OfflineBanner

### Уровень 2 — Детализация по точке
- [x] PointDetailScreen — экран детализации точки
- [x] Выручка по типам оплат (Наличные, Kaspi QR, Halyk QR, Яндекс) — подключено к бэкенду
- [x] Расходы по группам статей ДДС (с суммой по группе) — Продукты питания + Прочие расходы
- [x] Распределённые затраты (доля ГО и Цеха) с детализацией по статьям
- [x] Финрезультат = Выручка − Прямые − Распределённые (формула на экране)
- [x] Недостачи и излишки по кассе (таблица: Дата/Ожидание/Факт/Разница)
- [x] График выручки по дням (кликабельные столбцы, средняя линия, горизонтальный скролл для длинных периодов)
- [x] Свайп назад (слева → направо)

### Уровень 3 — Детализация по статьям (👑 + 📊 + 🔧)
- [x] Экран статей ДДС внутри группы с суммами
- [x] Доля каждой статьи в общих расходах (%)
- [x] Сравнение с предыдущим аналогичным периодом (+/-)
- [x] Пометка: прямая (iiko) или распределённая (1С)
- [x] ADMIN имеет полный доступ

### Уровень 4 — Детализация по операциям (только 👑 + 🔧)
- [x] Список операций: дата, сумма, комментарий
- [x] Источник: iiko или 1С
- [x] Коэффициент распределения (для распределённых затрат)
- [x] Пагинация "Загрузить ещё"
- [x] ADMIN имеет полный доступ

### Отчёты (отдельный таб)
- [x] ReportsScreen — 4 секции с role-based доступом
- [x] ДДС сводный по всем точкам (OWNER + FIN_DIR + ADMIN)
- [x] Затраты компании (ГО + Цех) (OWNER + FIN_DIR + ADMIN)
- [x] Закупки и отгрузки Цеха (все роли)
- [x] Аналитика и тренды — график + средние значения (все роли)
- [x] Empty states для пустых данных
- [x] Haptic feedback на pull-to-refresh

### Уведомления
- [x] NotificationsScreen — экран уведомлений

### Офлайн и UX
- [x] React Query + AsyncStorage persister — офлайн кэш на всех экранах
- [x] Баннер "Нет соединения, данные от ЧЧ:ММ" — на всех 5 data-экранах
- [x] Индикатор "данные устарели" (> 1 часа, красный)
- [x] Haptic feedback на pull-to-refresh (все экраны)

### Оставшееся
- [ ] Вкладка "Рестораны" — список всех точек загружается, но может быть медленно (2 API-вызова)
- [ ] Реальные ДДС статьи из iiko Cloud API `/reports/expenses` (аренда, зарплаты, коммуналка)
- [ ] Комиссии банков (Kaspi, Halyk, Яндекс)

---

## Phase 8: Push-уведомления
**Статус: ✅ 100% готово**
**Срок по ТЗ: Этап 3 (3-4 недели)**
**Plans:** 3/3 plans complete

Plans:
- [x] 08-01-PLAN.md — Fix role targeting, NotificationPreference model, prefs endpoints, internal trigger
- [x] 08-02-PLAN.md — AlertService in aggregator-worker (sync health, revenue, expenses thresholds)
- [x] 08-03-PLAN.md — Mobile: fix push token, wire usePushNotifications, ProfileScreen with settings

- [ ] Firebase Cloud Messaging (FCM) — серверная часть
- [x] `expo-notifications` установлен (v0.31.0) + usePushNotifications хук
- [x] Notification Service в API Gateway:
  - [x] Регистрация/удаление FCM токена
  - [x] Получение списка уведомлений с пагинацией
  - [x] Отметка прочитанным (одно / все)
  - [ ] Триггер: синхронизация не работает > 1 часа → push админу
  - [ ] Триггер: выручка точки < 70% от среднего → push Владельцу + ОперДиректору
  - [ ] Триггер: крупный расход > X ₸ → push Владельцу + ФинДиректору
  - [ ] Утренняя сводка (опционально) → push всем
- [x] Экран NotificationsScreen — история уведомлений
- [ ] Настройки уведомлений в профиле (вкл/выкл по типам)

---

### Phase 08.1: Подключить реальные ДДС статьи из iiko Server API — синхронизация транзакций по 42 статьям (INSERTED)

**Goal:** Sync real DDS expense articles (42 accounts) from iiko Server API into finance DB and enhance mobile screens to display all 12 expense categories beautifully with color-coded groups and expandable drill-down.
**Requirements**: [DDS-01, DDS-02, DDS-03, DDS-04, DDS-05, DDS-06]
**Depends on:** Phase 8
**Plans:** 2/2 plans complete

Plans:
- [x] 08.1-01-PLAN.md — Backend: syncDdsArticles + syncDdsTransactions + cron wiring + tests
- [x] 08.1-02-PLAN.md — Mobile: color-coded expense groups on PointDetailScreen + expandable DDS summary on ReportsScreen

### Phase 08.2: Применить дизайн-систему к мобильному приложению (INSERTED)
**Статус: ✅ 100% готово**

**Goal:** Применить дизайн-систему UI/UX Pro Max: заменить эмодзи на SVG иконки (Lucide), обновить тему (цвета, тени, скругления по MASTER.md), стандартизировать компоненты, light/dark mode.
**Design System:** `design-system/kex-group/MASTER.md`
**Requirements**: [DS-01: SVG icons, DS-02: Theme, DS-03: Components, DS-04: Dark mode]
**Depends on:** Phase 8.1
**Plans:** 4/4 plans complete

Plans:
- [x] 08.2-01 — Theme system: colors/typography/spacing from MASTER.md + dark/light toggle (useThemeStore)
- [x] 08.2-02 — Replace all emoji icons with Lucide SVG (lucide-react-native)
- [x] 08.2-03 — Standardize components: cards, buttons, icon wrappers per MASTER.md
- [x] 08.2-04 — Apply theme to all screens (Dashboard, PointDetail, Reports, Article, Profile, BottomNav)

### Phase 10: Design System v3 — Approved HTML-sync (INSERTED)
**Статус: ✅ 100% готово**

**Goal:** Синхронизировать `apps/mobile-dashboard/` с 19 утверждёнными HTML-прототипами (UI/UX review через Claude Design + ui-critic).
**Source of truth:** `.planning/phases/10-design-system-v3-sync/` — `10-RESEARCH.md` (~140 tokens) + `10-UI-SPEC.md` (11 components) + `10-RULES.md` (~110 rules).
**Depends on:** Phase 8.2 (предыдущая design-system от MASTER.md).
**Waves:** 4/5 complete.

Waves:
- [x] **Wave 1 · Research** — UX Architect + UI Designer + UX Researcher → RESEARCH.md + UI-SPEC.md + RULES.md
- [x] **Wave 2 · Theme tokens (1265 lines)** — colors.ts (solid hex 5-level hierarchy, +text-secondary #CBD5E1), spacing.ts (11-level 4px-grid), radii.ts (NEW), typography.ts (7 headings + 5 body + displayNumeric, Fira Sans/Code pinned), shadows.ts (5 elev + 3 glow + 2 inset), categories.ts (NEW, 12 DDS), semantic.ts (NEW, restaurant thresholds + KPI semantics), icons.ts (8 color fixes), package.json (jetbrains-mono + plus-jakarta-sans → fira-code + fira-sans), App.tsx (useFonts 8 weights + loading guard)
- [x] **Wave 3 · Components (~3500 lines)** — NEW: Button, Input, PhoneInput, OtpInput, KPICard+KPIRow, HeroCard, Chart, Chip, Badge · UPDATED: BottomNav (sync), RestaurantCard (major rewrite: BNA/DNA brand-badges, plan-bar 6px + ПЛАН marker, 5 states, semantic sync dot+border-left+bar-fill+text)
- [x] **Wave 4 · Screens migration** — 3 screens (DashboardScreen, BrandDetailScreen, PointsScreen) мигрированы на типизированные props · src/utils/brand.ts с resolveBrand/mapLegacyStatus/computeMarginPct/computePlanAttainment/formatPeriodLabel · hooks (useDashboard, useBrandDetail, useRestaurantList) возвращают новые поля с backward-compat для type/dev/planPct
- [x] **Wave 5 · Verify** — npm install (2 packages added: fira-sans, fira-code) · tsc --noEmit: 0 errors · npm test: 8/8 pass (Operations role-gate) · backward-compat flat aliases в colors.ts для legacy usages

Commits: `0f7101e` (Waves 1-3+5) · `49286fb` (Wave 4)

**Known STUBs** (требуют finance-service API extension — будущая Phase 11):
- `plannedRevenue` = revenue × 1.05 placeholder (нет real plan данных в API)
- `transactions` на brand/list уровне = null (есть только в RestaurantDetailDto как salesCount)
- `periodLabel` в useRestaurantList = сегодняшняя дата (period не в list context)

## Phase 9: Деплой и Релиз
**Статус: ❌ Не начат**

- [ ] `Dockerfile` для каждого NestJS сервиса (multi-stage build)
- [ ] `docker-compose.yml` с health checks + depends_on
- [ ] Nginx reverse proxy с Let's Encrypt SSL (HTTPS)
- [ ] `.env.production` шаблон
- [ ] **GitHub Actions CI:**
  - [ ] `turbo run lint test --filter=[origin/main...HEAD]` (только изменённые)
  - [ ] Build Docker образов при merge в main
  - [ ] `prisma migrate deploy` в CI/CD pipeline
- [ ] Деплой на хостинг через Docker Compose
- [ ] Автоматические бэкапы PostgreSQL (ежедневно)
- [ ] **Sentry:** настроить releases + source maps
- [ ] **Mobile релиз:**
  - [ ] Сборка iOS через EAS Build → TestFlight
  - [ ] Сборка Android APK через EAS Build
  - [ ] EAS Update для OTA обновлений
  - [ ] Force update: version-check API при запуске
- [ ] Staging сервер (позже, после первого релиза)

---
