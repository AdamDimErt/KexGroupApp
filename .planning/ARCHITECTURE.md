# Архитектура KEX GROUP Dashboard — Полная спецификация

> Версия: 2.0 · Дата: 2026-03-23
> На основе: подписанного ТЗ v1.5, аудита кодовой базы, best practices 2025-2026

---

## 1. Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ВНЕШНИЕ ИСТОЧНИКИ                               │
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │ iikoCloud│    │ 1С OData │    │ Telegram │    │ NotebookLM       │  │
│  │ API      │    │ REST API │    │ Bot API  │    │ (документация)   │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────────┬──────────┘  │
│       │               │               │                   │             │
└───────┼───────────────┼───────────────┼───────────────────┼─────────────┘
        │               │               │                   │
        ▼               ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Docker Network)                        │
│                                                                         │
│  ┌─────────────────┐      ┌──────────────────┐                         │
│  │   Nginx         │      │  aggregator-      │                         │
│  │   Reverse Proxy │      │  worker :3003     │                         │
│  │   :80/:443      │      │                   │                         │
│  │   SSL + gzip    │      │  ┌─────────────┐  │                         │
│  └───────┬─────────┘      │  │ iiko Sync   │  │                         │
│          │                │  │ 1С Sync     │  │                         │
│          ▼                │  │ Cost Engine │  │                         │
│  ┌─────────────────┐      │  │ Notifier    │  │                         │
│  │  api-gateway    │      │  └─────────────┘  │                         │
│  │  :3000          │      └────────┬───────────┘                        │
│  │                 │               │                                     │
│  │  JWT Guard      │               │  HTTP (internal)                    │
│  │  Role Guard     │               │                                     │
│  │  Rate Limiter   │               ▼                                     │
│  │  Swagger /docs  │      ┌──────────────────┐                          │
│  │  X-Service-Key  │      │  finance-service │                          │
│  └───────┬─────────┘      │  :3002           │                          │
│          │                │                   │                          │
│          │  HTTP proxy    │  4-уровн. API     │                          │
│          ├───────────────►│  Распределение    │                          │
│          │                │  Отчёты           │                          │
│          │                │  DataAccessFilter │                          │
│          │                └────────┬───────────┘                         │
│          │                         │                                     │
│          ▼                         ▼                                     │
│  ┌─────────────────┐      ┌──────────────────┐     ┌─────────────────┐ │
│  │  auth-service   │      │  PostgreSQL 15   │     │  Redis 7        │ │
│  │  :3001          │      │  :5434           │     │  :6380          │ │
│  │                 │      │                   │     │                 │ │
│  │  OTP + JWT      │      │  Schema: auth    │     │  OTP cache      │ │
│  │  3 роли         │      │  Schema: finance │     │  Refresh tokens │ │
│  │  PIN / Bio      │      │  Бэкапы ежедневно│     │  Rate limiting  │ │
│  │  Telegram Bot   │      │                   │     │  Circuit state  │ │
│  │  Mobizon SMS    │      └──────────────────┘     └─────────────────┘ │
│  │  AuditLog       │                                                    │
│  └─────────────────┘                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
        ▲
        │  HTTPS
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         КЛИЕНТЫ                                         │
│                                                                         │
│  ┌────────────────────────┐                                             │
│  │  Mobile Dashboard      │                                             │
│  │  React Native + Expo   │                                             │
│  │  iOS 14+ / Android 8+  │                                             │
│  │                        │                                             │
│  │  3 пользователя:       │                                             │
│  │  👑 Владелец           │                                             │
│  │  📊 Фин. директор     │                                             │
│  │  ⚙️ Опер. директор     │                                             │
│  └────────────────────────┘                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Стек технологий — полный список

### 2.1 Backend

| Технология | Версия | Назначение | Статус |
|-----------|--------|-----------|--------|
| **Node.js** | ≥18 | Runtime | ✅ Установлен |
| **NestJS** | 11 | Фреймворк backend сервисов | ✅ Используется |
| **TypeScript** | 5.x | Типизация | ✅ Используется |
| **Prisma** | 5.x | ORM для PostgreSQL | ✅ Схема есть |
| **PostgreSQL** | 15 | Основная БД (multi-schema) | ✅ Docker |
| **Redis** | 7 | Кэш, OTP, rate-limiting, refresh tokens | ✅ Docker |
| **@nestjs/jwt** | — | JWT генерация/валидация | ✅ Используется |
| **@nestjs/schedule** | — | Cron jobs для синхронизации | ❌ Нужно добавить |
| **@nestjs/throttler** | — | Rate limiting | ✅ В api-gateway |
| **@nestjs/swagger** | — | OpenAPI документация | ✅ В api-gateway |
| **class-validator** | — | Валидация DTO | ❌ Нужно добавить |
| **class-transformer** | — | Трансформация DTO | ❌ Нужно добавить |
| **opossum** | — | Circuit Breaker для iiko/1С | ❌ Нужно добавить |
| **axios** / **httpx** | — | HTTP-клиент для внешних API | ❌ Нужно добавить |
| **telegraf** | — | Telegram Bot для OTP | ❌ Нужно добавить |
| **winston** / **pino** | — | Структурированное логирование | ❌ Нужно добавить |
| **@sentry/nestjs** | — | Crash tracking backend | ❌ Нужно добавить |
| **firebase-admin** | — | Push-уведомления (FCM) | ❌ Нужно добавить |

### 2.2 Mobile

| Технология | Версия | Назначение | Статус |
|-----------|--------|-----------|--------|
| **React Native** | 0.81.5 | Мобильный фреймворк | ✅ Установлен |
| **Expo** | 54 | Managed workflow | ✅ Установлен |
| **React** | 19.1 | UI библиотека | ✅ Установлен |
| **React Navigation** | 7 | Навигация (Stack + BottomTabs) | ✅ Установлен |
| **expo-secure-store** | — | Хранение JWT (encrypted) | ✅ Установлен |
| **expo-local-authentication** | — | PIN / Face ID / Touch ID | ❌ Нужно добавить |
| **expo-notifications** | — | Push-уведомления | ❌ Нужно добавить |
| **expo-localization** | — | Локализация RU/KZ | ❌ Нужно добавить |
| **expo-haptics** | — | Тактильная отдача | ❌ Нужно добавить |
| **@tanstack/react-query** | 5 | Кэш запросов + офлайн | ❌ Нужно добавить |
| **zustand** | — | State management | ❌ Нужно добавить |
| **axios** | — | HTTP клиент | ❌ Нужно добавить |
| **victory-native** | — | Графики выручки | ❌ Нужно добавить |
| **@sentry/react-native** | — | Crash tracking mobile | ❌ Нужно добавить |
| **i18next** + **react-i18next** | — | Мультиязычность | ❌ Нужно добавить |
| **react-native-international-phone-number** | — | Ввод телефона | ✅ Установлен |

### 2.3 Инфраструктура

| Технология | Назначение | Статус |
|-----------|-----------|--------|
| **Turborepo** | Монорепо оркестрация | ✅ Настроен |
| **Docker Compose** | Контейнеризация dev/prod | ✅ Базовый (PG + Redis) |
| **Nginx** | Reverse proxy + SSL | ❌ Нужно добавить |
| **Let's Encrypt** | HTTPS сертификаты | ❌ Нужно добавить |
| **GitHub Actions** | CI/CD pipeline | ❌ Нужно добавить |
| **EAS Build** | iOS/Android сборка | ❌ Нужно добавить |
| **EAS Update** | OTA обновления | ❌ Нужно добавить |

### 2.4 Внешние интеграции

| Система | Протокол | Авторизация | Данные | Статус |
|---------|----------|------------|--------|--------|
| **iikoCloud API** | REST HTTPS | API Key → Token (15 мин TTL) | Выручка, ДДС, смены, кассы | ❌ Нужно |
| **1С OData** | REST HTTPS | Basic Auth | Затраты ГО, Цех, закупки, отгрузки | ❌ Нужно |
| **Telegram Gateway** | REST HTTPS | Token | OTP-коды | ✅ Реализовано |
| **Mobizon.kz** | REST HTTPS | API Key | SMS OTP (fallback) | ✅ Реализовано |
| **Firebase (FCM)** | REST HTTPS | Service Account | Push-уведомления | ❌ Нужно |
| **NotebookLM** | CLI / Skill | Google Cookie | Документация API для разработки | ✅ Подключён |

---

## 3. База данных — полная схема

### 3.1 Текущая схема (что есть)

```
AUTH SCHEMA                          FINANCE SCHEMA
┌──────────┐                         ┌──────────────┐
│ Tenant   │←──────────────────────┐ │ Company      │
│ id       │                       │ │ id           │
│ name     │  ┌──────────┐        │ │ tenantId ────┘
│ slug     │  │ User     │        │ │ name         │
│ isActive │  │ id       │        │ │ inn          │
└──────────┘  │ phone    │        │ └──────┬───────┘
              │ role     │        │        │
              │ tenantId─┘        │        ▼
              │ isActive │        │ ┌──────────────────┐
              └──────────┘        │ │ Restaurant       │
                                  │ │ id               │
                                  │ │ companyId ───────┘
                                  │ │ iikoId (unique)
                                  │ │ oneCId (unique)
                                  │ │ name
                                  │ │ isActive
                                  │ └──────┬───────────┘
                                  │        │
                                  │        ▼
                                  │ ┌──────────────────┐
                                  │ │ FinancialSnapshot│
                                  │ │ id               │
                                  │ │ restaurantId     │
                                  │ │ date             │
                                  │ │ revenue          │
                                  │ │ revenueCash      │
                                  │ │ revenueKaspi     │
                                  │ │ revenueHalyk     │
                                  │ │ revenueYandex    │
                                  │ │ expenses         │
                                  │ │ distributedExp   │
                                  │ │ accountBalance   │
                                  │ └──────────────────┘
                                  │
                                  │ ┌──────────────────┐
                                  │ │ SyncLog          │
                                  │ │ id, tenantId     │
                                  │ │ system (IIKO/1C) │
                                  │ │ status           │
                                  │ │ businessDate     │
                                  │ │ attemptCount     │
                                  │ │ errorMessage     │
                                  │ └──────────────────┘
```

### 3.2 Целевая схема (что нужно добавить)

```
НОВЫЕ МОДЕЛИ (добавить в Prisma)
════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│ Brand (Бренд / Структурное подразделение)                     │
│ ─────────────────────────────────────────                     │
│ id            String   @id @default(uuid())                  │
│ companyId     String   → Company                             │
│ name          String   "Burger na Abaya", "Doner na Abaya"   │
│ slug          String   @unique "burger-na-abaya"             │
│ iikoGroupId   String?  @unique — ID структурного подразделения│
│ isActive      Boolean  @default(true)                        │
│ sortOrder     Int      @default(0)                           │
│ createdAt     DateTime                                       │
│                                                              │
│ → restaurants Restaurant[]                                   │
│ → company     Company                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ DdsArticleGroup (Группа статей ДДС)                          │
│ ─────────────────────────────────────                        │
│ id            String   @id @default(uuid())                  │
│ tenantId      String   → Tenant                              │
│ name          String   "Продукты", "Аренда", "ЗП"            │
│ code          String?  Код группы из iiko                    │
│ sortOrder     Int      @default(0)                           │
│                                                              │
│ → articles    DdsArticle[]                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ DdsArticle (Статья ДДС — 40+ штук)                           │
│ ────────────────────────────────────                         │
│ id            String   @id @default(uuid())                  │
│ groupId       String   → DdsArticleGroup                     │
│ name          String   "Аренда помещения", "Зарплата повара"  │
│ code          String?  @unique — код из iiko                 │
│ source        Enum     IIKO | ONE_C                          │
│ allocationType Enum    DIRECT | DISTRIBUTED                  │
│ isActive      Boolean  @default(true)                        │
│                                                              │
│ → group       DdsArticleGroup                                │
│ → expenses    Expense[]                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Expense (Расход по статье)                                    │
│ ──────────────────────────                                   │
│ id            String   @id @default(uuid())                  │
│ articleId     String   → DdsArticle                          │
│ restaurantId  String?  → Restaurant (null = общий, для распр.)│
│ date          DateTime Дата операции                          │
│ amount        Decimal  Сумма                                 │
│ comment       String?  Комментарий из iiko/1С                │
│ source        Enum     IIKO | ONE_C                          │
│ syncId        String?  ID синхронизации (idempotency)        │
│ createdAt     DateTime                                       │
│                                                              │
│ → article     DdsArticle                                     │
│ → restaurant  Restaurant?                                    │
│ @@unique([syncId])                                           │
│ @@index([restaurantId, date])                                │
│ @@index([articleId, date])                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ CostAllocation (Распределённые затраты)                       │
│ ───────────────────────────────────────                      │
│ id              String   @id @default(uuid())                │
│ restaurantId    String   → Restaurant                        │
│ expenseId       String   → Expense (исходный общий расход)   │
│ periodStart     DateTime Начало периода                      │
│ periodEnd       DateTime Конец периода                       │
│ coefficient     Decimal  Доля выручки (0.00–1.00)            │
│ originalAmount  Decimal  Исходная сумма затраты              │
│ allocatedAmount Decimal  Распределённая сумма                │
│ createdAt       DateTime                                     │
│                                                              │
│ → restaurant    Restaurant                                   │
│ → expense       Expense                                      │
│ @@unique([restaurantId, expenseId, periodStart, periodEnd])  │
│ @@index([restaurantId, periodStart, periodEnd])              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ KitchenShipment (Отгрузки Цеха по точкам)                    │
│ ─────────────────────────────────────────                    │
│ id            String   @id @default(uuid())                  │
│ restaurantId  String   → Restaurant (прямая привязка)        │
│ date          DateTime Дата отгрузки                          │
│ productName   String   "Бакалея", "Фритюрный жир"           │
│ quantity      Decimal  Количество                            │
│ amount        Decimal  Стоимость                             │
│ syncId        String?  @unique                               │
│ createdAt     DateTime                                       │
│                                                              │
│ → restaurant  Restaurant                                     │
│ @@index([restaurantId, date])                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ KitchenPurchase (Закупки сырья Цехом)                        │
│ ─────────────────────────────────────                        │
│ id            String   @id @default(uuid())                  │
│ tenantId      String   → Tenant                              │
│ date          DateTime Дата закупки                           │
│ productName   String   "Бакалея", "Напитки", "Сиропы"       │
│ supplierName  String?  Поставщик                             │
│ quantity      Decimal  Количество                            │
│ amount        Decimal  Стоимость                             │
│ syncId        String?  @unique                               │
│ createdAt     DateTime                                       │
│                                                              │
│ @@index([tenantId, date])                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ KitchenIncome (Поступления на счёт Цеха)                     │
│ ────────────────────────────────────────                     │
│ id            String   @id @default(uuid())                  │
│ tenantId      String   → Tenant                              │
│ date          DateTime                                       │
│ amount        Decimal                                        │
│ description   String?                                        │
│ syncId        String?  @unique                               │
│ createdAt     DateTime                                       │
│                                                              │
│ @@index([tenantId, date])                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ CashDiscrepancy (Недостачи и излишки по кассе)               │
│ ──────────────────────────────────────────────               │
│ id            String   @id @default(uuid())                  │
│ restaurantId  String   → Restaurant                          │
│ date          DateTime                                       │
│ expected      Decimal  Ожидаемая сумма                       │
│ actual        Decimal  Фактическая сумма                     │
│ difference    Decimal  Разница (+ излишек, - недостача)      │
│ syncId        String?  @unique                               │
│ createdAt     DateTime                                       │
│                                                              │
│ → restaurant  Restaurant                                     │
│ @@index([restaurantId, date])                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ AuditLog (Журнал аудита)                                     │
│ ────────────────────────                                     │
│ id            String   @id @default(uuid())                  │
│ userId        String   → User                                │
│ action        String   "LOGIN" | "VIEW_DASHBOARD" | "LOGOUT" │
│ entity        String?  "restaurant:uuid" | "report:dds"      │
│ ip            String?                                        │
│ userAgent     String?                                        │
│ createdAt     DateTime @default(now())                       │
│                                                              │
│ @@index([userId, createdAt])                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ NotificationToken (FCM токены устройств)                      │
│ ────────────────────────────────────────                     │
│ id            String   @id @default(uuid())                  │
│ userId        String   → User                                │
│ fcmToken      String   @unique                               │
│ platform      String   "ios" | "android"                     │
│ isActive      Boolean  @default(true)                        │
│ createdAt     DateTime                                       │
│                                                              │
│ → user        User                                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ NotificationLog (История уведомлений)                         │
│ ─────────────────────────────────────                        │
│ id            String   @id @default(uuid())                  │
│ userId        String   → User                                │
│ type          String   "SYNC_FAILURE" | "LOW_REVENUE" | ...  │
│ title         String                                         │
│ body          String                                         │
│ isRead        Boolean  @default(false)                       │
│ data          Json?    Доп. данные (restaurantId, amount)    │
│ createdAt     DateTime                                       │
│                                                              │
│ → user        User                                           │
│ @@index([userId, isRead, createdAt])                         │
└──────────────────────────────────────────────────────────────┘

ОБНОВИТЬ СУЩЕСТВУЮЩИЕ МОДЕЛИ
════════════════════════════

Restaurant: добавить brandId → Brand (связь с брендом)
User: роли уже правильные (ADMIN, OWNER, FINANCE_DIRECTOR, OPERATIONS_DIRECTOR) ✅

ENUM-ы (добавить)
═════════════════

enum DataSource { IIKO  ONE_C }
enum AllocationType { DIRECT  DISTRIBUTED }
```

### 3.3 Связи между моделями (полная ERD)

```
Tenant (KEX GROUP)
  │
  ├── User (3 пользователя + 1 админ)
  │     └── NotificationToken[] (FCM устройства)
  │     └── NotificationLog[] (история push)
  │     └── AuditLog[] (журнал действий)
  │
  ├── Company (ТОО "Burger na Abaya", ТОО "A Doner")
  │     │
  │     ├── Brand[] (Burger na Abaya, Doner na Abaya)
  │     │     │
  │     │     └── Restaurant[] (BNA Бесагаш, DNA Аксай...)
  │     │           │
  │     │           ├── FinancialSnapshot[] (ежедневная сводка)
  │     │           ├── Expense[] (расходы по статьям — прямые)
  │     │           ├── CostAllocation[] (распределённые затраты)
  │     │           ├── KitchenShipment[] (отгрузки Цеха)
  │     │           └── CashDiscrepancy[] (недостачи/излишки)
  │     │
  │     └── (expenses без restaurantId = общие, для распределения)
  │
  ├── DdsArticleGroup[] (группы статей)
  │     └── DdsArticle[] (40+ статей ДДС)
  │           └── Expense[] (операции по статье)
  │
  ├── KitchenPurchase[] (закупки сырья)
  ├── KitchenIncome[] (поступления Цеха)
  └── SyncLog[] (логи синхронизации)
```

### 3.4 Индексы (для производительности)

```sql
-- Самые частые запросы дашборда
CREATE INDEX idx_financial_snapshot_rest_date ON "FinancialSnapshot" ("restaurantId", "date");
CREATE INDEX idx_expense_rest_date ON "Expense" ("restaurantId", "date");
CREATE INDEX idx_expense_article_date ON "Expense" ("articleId", "date");
CREATE INDEX idx_cost_allocation_rest_period ON "CostAllocation" ("restaurantId", "periodStart", "periodEnd");
CREATE INDEX idx_kitchen_shipment_rest_date ON "KitchenShipment" ("restaurantId", "date");
CREATE INDEX idx_audit_log_user_date ON "AuditLog" ("userId", "createdAt");
CREATE INDEX idx_notification_log_user ON "NotificationLog" ("userId", "isRead", "createdAt");

-- Idempotency (дедупликация синхронизации)
CREATE UNIQUE INDEX idx_expense_sync ON "Expense" ("syncId") WHERE "syncId" IS NOT NULL;
CREATE UNIQUE INDEX idx_shipment_sync ON "KitchenShipment" ("syncId") WHERE "syncId" IS NOT NULL;
CREATE UNIQUE INDEX idx_purchase_sync ON "KitchenPurchase" ("syncId") WHERE "syncId" IS NOT NULL;
```

---

## 4. Архитектура каждого сервиса

### 4.1 auth-service (порт 3001)

```
auth-service/src/
├── main.ts                          # Bootstrap + Sentry init
├── app.module.ts                    # Root module
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts           # ✅ Реализован
│   │   ├── POST /auth/send-otp
│   │   ├── POST /auth/verify-otp
│   │   ├── POST /auth/refresh
│   │   └── GET  /auth/me
│   ├── auth.service.ts              # ✅ Реализован
│   ├── telegram-gateway.service.ts  # ✅ Реализован
│   ├── dto/
│   │   ├── send-otp.dto.ts          # + class-validator
│   │   └── verify-otp.dto.ts        # + class-validator
│   └── guards/
│       ├── jwt-auth.guard.ts
│       ├── roles.guard.ts           # ❌ Нужно
│       └── roles.decorator.ts       # ❌ Нужно
├── audit/                           # ❌ Нужно
│   ├── audit.service.ts             # Запись в AuditLog
│   └── audit.interceptor.ts         # Автоматическая запись
├── pin/                             # ❌ Нужно
│   ├── pin.controller.ts            # POST /auth/pin/set, POST /auth/pin/verify
│   └── pin.service.ts               # Хеширование PIN, проверка
└── health/
    └── health.controller.ts         # GET /health
```

**Текущее состояние:** OTP + JWT + Refresh полностью рабочие. Нужно добавить: RolesGuard, AuditLog, PIN, class-validator.

### 4.2 api-gateway (порт 3000)

```
api-gateway/src/
├── main.ts                          # Bootstrap + Swagger + Sentry
├── app.module.ts                    # ✅ Реализован
├── app.controller.ts                # ✅ GET /health
├── auth/
│   ├── auth-proxy.module.ts         # ✅ Реализован
│   ├── auth-proxy.controller.ts     # ✅ Проксирует /auth/*
│   └── auth-proxy.service.ts        # ✅ HttpService → auth-service
├── dashboard/                       # ❌ Нужно — проксирование к finance-service
│   ├── dashboard-proxy.module.ts
│   ├── dashboard-proxy.controller.ts
│   │   ├── GET /dashboard/summary
│   │   ├── GET /dashboard/brand/:id/restaurants
│   │   ├── GET /dashboard/restaurant/:id
│   │   ├── GET /dashboard/restaurant/:id/articles   (OWNER + FIN_DIRECTOR)
│   │   ├── GET /dashboard/article/:id/operations    (OWNER only)
│   │   └── GET /reports/*
│   └── dashboard-proxy.service.ts
├── guards/
│   ├── jwt-auth.guard.ts            # ✅ Реализован
│   ├── roles.guard.ts               # ❌ Нужно — проверка роли из JWT
│   └── service-key.guard.ts         # ❌ Нужно — X-Service-Key для внутренних вызовов
├── interceptors/
│   └── audit.interceptor.ts         # ❌ Нужно — логирование запросов в AuditLog
└── middleware/
    └── request-id.middleware.ts     # ❌ Нужно — уникальный ID для tracing
```

**Текущее состояние:** Auth proxy полностью рабочий. Swagger настроен. Нужно: dashboard proxy, RolesGuard, service-key, audit.

### 4.3 finance-service (порт 3002)

```
finance-service/src/                 # ❌ Полностью нужно реализовать
├── main.ts
├── app.module.ts
├── dashboard/
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts
│   │   ├── GET /finance/summary         → Уровень 1 (Компания)
│   │   ├── GET /finance/brand/:id       → Точки бренда
│   │   ├── GET /finance/restaurant/:id  → Уровень 2 (Точка)
│   │   ├── GET /finance/restaurant/:id/articles → Уровень 3 (Статьи)
│   │   └── GET /finance/article/:id/operations  → Уровень 4 (Операции)
│   └── dashboard.service.ts
│       ├── getSummary(period, tenantId)
│       ├── getBrandRestaurants(brandId, period)
│       ├── getRestaurantDetails(restaurantId, period)
│       ├── getArticleDetails(restaurantId, groupId, period)
│       └── getOperations(articleId, restaurantId, period)
├── reports/
│   ├── reports.module.ts
│   ├── reports.controller.ts
│   │   ├── GET /finance/reports/dds           → ДДС сводный
│   │   ├── GET /finance/reports/company-expenses → Затраты ГО + Цех
│   │   ├── GET /finance/reports/kitchen       → Закупки/отгрузки Цеха
│   │   └── GET /finance/reports/trends        → Аналитика
│   └── reports.service.ts
├── allocation/
│   ├── allocation.module.ts
│   └── allocation.service.ts
│       ├── calculateWeights(period)          → Доли выручки
│       ├── distributeExpenses(period)         → Распределение затрат
│       └── getRestaurantAllocations(restaurantId, period)
├── access/
│   ├── data-access.interceptor.ts           → Фильтрация по роли
│   │   ├── OWNER: всё
│   │   ├── FIN_DIRECTOR: без уровня 4
│   │   └── OPS_DIRECTOR: без фин.деталей ГО, без уровней 3-4
│   └── data-access.service.ts
├── dto/
│   ├── summary.dto.ts
│   ├── restaurant-detail.dto.ts
│   ├── article-detail.dto.ts
│   ├── operation.dto.ts
│   └── period.dto.ts                        → Сегодня/Неделя/Месяц/Свой
└── health/
    └── health.controller.ts
```

### 4.4 aggregator-worker (порт 3003)

```
aggregator-worker/src/               # ❌ Полностью нужно реализовать
├── main.ts
├── app.module.ts
├── iiko/
│   ├── iiko.module.ts
│   ├── iiko.service.ts              → HTTP-клиент iikoCloud API
│   │   ├── authenticate()           → POST /api/1/access_token
│   │   ├── getOrganizations()       → POST /api/1/organizations
│   │   ├── getRevenue(orgId, date)  → POST /api/1/reports/...
│   │   ├── getDdsArticles()         → Справочник статей ДДС
│   │   ├── getDdsOperations(date)   → Операции по статьям
│   │   ├── getCashShifts(date)      → Кассовые смены
│   │   └── getCashDiscrepancy(date) → Недостачи/излишки
│   ├── iiko.types.ts                → TypeScript типы ответов iiko
│   └── iiko-circuit-breaker.ts      → opossum wrapper
├── onec/
│   ├── onec.module.ts
│   ├── onec.service.ts              → HTTP-клиент 1С OData API
│   │   ├── getHeadOfficeExpenses(period)    → Затраты ГО
│   │   ├── getKitchenExpenses(period)       → Затраты Цеха
│   │   ├── getKitchenPurchases(period)      → Закупки сырья
│   │   ├── getKitchenShipments(period)      → Отгрузки по точкам
│   │   ├── getKitchenIncome(period)         → Поступления Цеха
│   │   └── getOrganizationMapping()         → Маппинг oneCId
│   ├── onec.types.ts                → TypeScript типы ответов 1С
│   └── onec-circuit-breaker.ts      → opossum wrapper (отдельный от iiko!)
├── sync/
│   ├── sync.module.ts
│   ├── sync.service.ts              → Основная cron задача
│   │   ├── @Cron('0 */15 * * * *')  → Каждые 15 минут
│   │   ├── syncIikoData()
│   │   ├── syncOneCData()
│   │   └── logSyncResult()          → SyncLog
│   └── sync-lock.service.ts         → Redis lock (не запускать параллельно)
├── allocation/
│   ├── allocation.module.ts
│   └── allocation.service.ts        → Движок распределения
│       ├── calculateRevenueWeights(period)
│       ├── distributeExpenses(period)
│       └── recalculate(restaurantId, period)
├── notification/
│   ├── notification.module.ts
│   ├── notification.service.ts      → Проверка триггеров + отправка push
│   │   ├── checkSyncHealth()        → Синхронизация > 1ч → push
│   │   ├── checkLowRevenue()        → Выручка < 70% → push
│   │   └── checkLargeExpense()      → Расход > X ₸ → push
│   └── fcm.service.ts               → Firebase Cloud Messaging
└── health/
    └── health.controller.ts
```

---

## 5. Архитектура мобильного приложения

```
mobile-dashboard/src/
├── App.tsx                          # ✅ Entry point
├── index.ts                         # ✅ Expo registration
├── config.ts                        # ✅ API_URL
│
├── api/                             # ❌ Нужно переделать
│   ├── client.ts                    # Axios instance + JWT interceptor + refresh
│   ├── auth.ts                      # sendOtp, verifyOtp, getMe, refresh
│   ├── dashboard.ts                 # getSummary, getBrandRestaurants, getRestaurantDetails
│   ├── articles.ts                  # getArticles, getOperations
│   └── reports.ts                   # getDdsReport, getKitchenReport, getTrends
│
├── store/                           # ❌ Нужно добавить (Zustand)
│   ├── auth.store.ts                # tokens, user, role, isAuthed, login/logout
│   ├── dashboard.store.ts           # selected period, selected brand
│   └── notification.store.ts        # unread count, notification list
│
├── navigation/                      # ❌ Нужно переделать
│   ├── RootNavigator.tsx            # Auth vs App routing
│   ├── AuthNavigator.tsx            # Phone → OTP → PIN setup
│   └── AppNavigator.tsx             # BottomTabs: Dashboard, Reports, Notifications, Profile
│
├── screens/
│   ├── auth/
│   │   ├── PhoneScreen.tsx          # ✅ Есть (LoginScreen), нужно рефактор
│   │   ├── OtpScreen.tsx            # ❌ Выделить из LoginScreen
│   │   └── PinSetupScreen.tsx       # ❌ Нужно
│   ├── dashboard/
│   │   ├── CompanyScreen.tsx        # Уровень 1: Выручка/Расходы/Баланс + бренды
│   │   ├── BrandScreen.tsx          # Раскрытие бренда → список точек
│   │   ├── RestaurantScreen.tsx     # Уровень 2: Точка (выручка по оплатам, расходы)
│   │   ├── ArticlesScreen.tsx       # Уровень 3: Статьи ДДС (👑 + 📊)
│   │   └── OperationsScreen.tsx     # Уровень 4: Операции (👑 only)
│   ├── reports/
│   │   ├── ReportsScreen.tsx        # Список отчётов
│   │   ├── DdsReportScreen.tsx      # ДДС сводный
│   │   ├── KitchenReportScreen.tsx  # Закупки и отгрузки Цеха
│   │   └── TrendsScreen.tsx         # Аналитика и графики
│   ├── notifications/
│   │   └── NotificationsScreen.tsx  # История push + настройки
│   └── profile/
│       └── ProfileScreen.tsx        # Имя, роль, язык, PIN, выход
│
├── components/
│   ├── BrandCard.tsx                # Карточка бренда (выручка, динамика)
│   ├── RestaurantCard.tsx           # ✅ Есть, нужно обновить
│   ├── MetricCard.tsx               # Большая цифра (выручка/расходы/баланс)
│   ├── PeriodSelector.tsx           # Сегодня/Неделя/Месяц/Прошлый/Свой
│   ├── ArticleRow.tsx               # Строка статьи ДДС (сумма, %, +-% к прошлому)
│   ├── OperationRow.tsx             # Строка операции (дата, сумма, источник)
│   ├── RevenueChart.tsx             # График выручки по дням (victory-native)
│   ├── SyncIndicator.tsx            # "Обновлено X минут назад" / "Устарело"
│   ├── OfflineBanner.tsx            # "Нет соединения, данные от ЧЧ:ММ"
│   ├── SkeletonLoader.tsx           # Скелетон при загрузке
│   ├── RoleGate.tsx                 # Показывает children только для нужных ролей
│   └── BottomNav.tsx                # ✅ Есть
│
├── hooks/
│   ├── useAuth.ts                   # React Query: getMe, auto-refresh
│   ├── useDashboardSummary.ts       # React Query: getSummary(period)
│   ├── useBrandRestaurants.ts       # React Query: getBrandRestaurants(id, period)
│   ├── useRestaurantDetails.ts      # React Query: getRestaurantDetails(id, period)
│   ├── useArticles.ts              # React Query: getArticles(restaurantId, period)
│   ├── useOperations.ts            # React Query: getOperations(articleId, period)
│   ├── useReports.ts               # React Query: report endpoints
│   ├── useNotifications.ts         # React Query: notification list
│   └── useNetworkStatus.ts         # Online/offline detection
│
├── i18n/                            # ❌ Нужно добавить
│   ├── index.ts                     # i18next config
│   ├── ru.json                      # Русский
│   └── kk.json                      # Казахский
│
├── services/
│   ├── auth.ts                      # ✅ Есть, нужно обновить
│   ├── secure-store.ts              # Wrapper для expo-secure-store
│   └── notification.ts              # expo-notifications + FCM registration
│
├── types/
│   └── index.ts                     # ✅ Есть, нужно обновить под ТЗ
│
├── theme/                           # ✅ Есть
│   ├── index.ts
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── shadows.ts
│
├── utils/
│   ├── calculations.ts             # ✅ Есть
│   ├── formatters.ts               # formatCurrency(₸), formatDate, formatPercent
│   └── period.ts                   # Period helpers (today, thisWeek, thisMonth...)
│
└── data/
    └── restaurants.ts               # ✅ Есть (удалить после подключения API)
```

---

## 6. Потоки данных

### 6.1 Синхронизация (каждые 15 минут)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│             │     │              │     │              │
│  iikoCloud  │────►│  aggregator  │────►│  PostgreSQL  │
│  API        │     │  worker      │     │              │
│             │     │              │     │  Expense     │
└─────────────┘     │  ┌────────┐  │     │  Financial   │
                    │  │ Circuit│  │     │  Snapshot    │
┌─────────────┐     │  │Breaker │  │     │  Kitchen*    │
│             │     │  └────────┘  │     │  SyncLog     │
│  1С OData   │────►│              │     │              │
│  API        │     │  ┌────────┐  │     └──────────────┘
│             │     │  │ Cost   │  │
└─────────────┘     │  │ Engine │  │     ┌──────────────┐
                    │  └────────┘  │     │              │
                    │              │────►│  Redis       │
                    │  ┌────────┐  │     │  sync lock   │
                    │  │Notifier│  │     │  circuit st. │
                    │  └────────┘  │     └──────────────┘
                    │       │      │
                    └───────┼──────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Firebase    │
                    │  FCM (push)  │
                    └──────────────┘
```

### 6.2 Запрос дашборда (пользователь открывает приложение)

```
Мобилка                  API Gateway              Finance Service         PostgreSQL
   │                        │                          │                      │
   │  GET /dashboard/summary│                          │                      │
   │  Authorization: Bearer │                          │                      │
   │  X-Period: thisMonth   │                          │                      │
   ├───────────────────────►│                          │                      │
   │                        │  JWT Guard               │                      │
   │                        │  → extract role          │                      │
   │                        │                          │                      │
   │                        │  GET /finance/summary    │                      │
   │                        │  X-Service-Key: ***      │                      │
   │                        │  X-User-Role: OWNER      │                      │
   │                        ├─────────────────────────►│                      │
   │                        │                          │  SELECT brands       │
   │                        │                          │  + SUM(revenue)      │
   │                        │                          │  + SUM(expenses)     │
   │                        │                          │  + allocations       │
   │                        │                          ├─────────────────────►│
   │                        │                          │◄─────────────────────│
   │                        │                          │                      │
   │                        │                          │  DataAccessFilter    │
   │                        │                          │  → filter by role    │
   │                        │                          │                      │
   │                        │  { revenue, expenses,    │                      │
   │                        │    balance, brands[] }   │                      │
   │                        │◄─────────────────────────│                      │
   │                        │                          │                      │
   │  200 OK + JSON         │                          │                      │
   │◄───────────────────────│                          │                      │
   │                        │                          │                      │
   │  React Query cache     │                          │                      │
   │  → render UI           │                          │                      │
```

### 6.3 Распределение затрат (движок)

```
ВХОД: period = {start: 2026-03-01, end: 2026-03-31}

1. Получить выручку всех точек за период:
   BNA Бесагаш:     4 000 000 ₸  (25.0%)
   BNA Жангельдина:  2 400 000 ₸  (15.0%)
   BNA Стадион:      3 200 000 ₸  (20.0%)
   DNA Аксай:        2 800 000 ₸  (17.5%)
   DNA Айманова:     3 600 000 ₸  (22.5%)
   ─────────────────────────────────────
   ИТОГО:          16 000 000 ₸  (100%)

2. Получить нераспределённые затраты:
   Аренда ГО (1С):          500 000 ₸
   ЗП операционистов (1С):  800 000 ₸
   Затраты Цеха (1С):       600 000 ₸
   ДДС без точки (iiko):    200 000 ₸
   ─────────────────────────────────────
   ИТОГО к распределению: 2 100 000 ₸

3. Распределить:
   BNA Бесагаш:     2 100 000 × 0.250 =  525 000 ₸
   BNA Жангельдина:  2 100 000 × 0.150 =  315 000 ₸
   BNA Стадион:      2 100 000 × 0.200 =  420 000 ₸
   DNA Аксай:        2 100 000 × 0.175 =  367 500 ₸
   DNA Айманова:     2 100 000 × 0.225 =  472 500 ₸

4. Сохранить в CostAllocation:
   { restaurantId, expenseId, coefficient: 0.250, allocatedAmount: 525000 }

5. Финрезультат точки:
   BNA Бесагаш: 4 000 000 - 1 200 000(прямые) - 525 000(распред.) = 2 275 000 ₸
```

---

## 7. Безопасность

### 7.1 Внешний периметр

```
Интернет → Nginx (HTTPS, SSL termination)
         → API Gateway (JWT Guard + Rate Limiting)
         → Внутренние сервисы (Docker network, не доступны извне)
```

### 7.2 Авторизация и доступ

| Слой | Механизм | Где реализован |
|------|----------|---------------|
| Transport | HTTPS (TLS 1.2+) | Nginx |
| Authentication | JWT (access 7d + refresh 30d) | auth-service |
| OTP delivery | Telegram Bot / SMS (Mobizon) | auth-service |
| Local auth | PIN-код или Face ID / Touch ID | mobile app + auth-service |
| Authorization | Role-based (OWNER/FIN_DIR/OPS_DIR) | api-gateway (RolesGuard) |
| Data filtering | Role-based response filtering | finance-service (DataAccessInterceptor) |
| Service-to-service | `X-Service-Key` header | api-gateway → finance/auth |
| Rate limiting | 5 req/min (auth), 60 req/min (dashboard) | api-gateway (@nestjs/throttler) |
| Input validation | class-validator + class-transformer | все сервисы |
| Audit trail | AuditLog (userId, action, IP, timestamp) | auth-service |
| Token storage | expo-secure-store (encrypted keychain) | mobile app |
| Secrets | .env файлы + .gitignore | все сервисы |

### 7.3 Валидация DTO (пример)

```typescript
// dto/period-query.dto.ts
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum PeriodType {
  TODAY = 'today',
  THIS_WEEK = 'thisWeek',
  THIS_MONTH = 'thisMonth',
  LAST_MONTH = 'lastMonth',
  CUSTOM = 'custom',
}

export class PeriodQueryDto {
  @IsEnum(PeriodType)
  period: PeriodType;

  @IsOptional()
  @IsDateString()
  startDate?: string;  // только для CUSTOM

  @IsOptional()
  @IsDateString()
  endDate?: string;    // только для CUSTOM
}
```

---

## 8. Интеграция с внешними данными

### 8.1 NotebookLM (документация для разработки)

NotebookLM подключён как глобальный CLI-скилл. Используется **при разработке** (не в рантайме приложения).

```
Использование:
┌────────────────────────────────────────────────────────────┐
│ Разработчик (Claude / человек)                              │
│                                                             │
│ 1. Перед написанием iiko-клиента:                          │
│    notebooklm chat -n ccf3cb0b... "как авторизоваться?"    │
│    → Получил endpoint + формат + TTL токена                │
│    → Написал iiko.service.ts                               │
│                                                             │
│ 2. При ошибке интеграции с 1С:                             │
│    notebooklm chat -n ea3c975a... "почему 400 на OData?"   │
│    → Получил правильный синтаксис $filter                  │
│    → Исправил onec.service.ts                              │
│                                                             │
│ 3. Для написания TypeScript типов:                         │
│    notebooklm chat -n ccf3cb0b... "JSON ответ выручки"     │
│    → Получил пример JSON                                   │
│    → Написал iiko.types.ts                                 │
└────────────────────────────────────────────────────────────┘
```

**Ноутбуки:**
| ID | Содержимое | Когда использовать |
|----|-----------|-------------------|
| `ccf3cb0b...` | iiko POS API: 26 источников (endpoints, SDK, Swagger) | Этап 3.1 — iiko интеграция |
| `ea3c975a...` | 1С OData: 8 источников (REST, метаданные, фильтры) | Этап 3.2 — 1С интеграция |
| `7ae5179b...` | 1С:ЗУП: кадровые данные, расчёты | Если понадобятся данные по ЗП |

### 8.2 Архитектура расширяемости (для будущих источников)

Если потребуется подключить новый источник данных (R-Keeper, Poster, другая ERP):

```typescript
// shared-types/src/data-source.ts
export interface ExternalDataSource {
  name: string;                          // 'iiko' | '1c' | 'r-keeper' | 'custom'
  type: 'rest' | 'odata' | 'graphql' | 'webhook';

  // Контракт: что должен уметь каждый источник
  authenticate(): Promise<string>;       // Получить токен
  getRevenue(params: SyncParams): Promise<RevenueData[]>;
  getExpenses(params: SyncParams): Promise<ExpenseData[]>;
  healthCheck(): Promise<boolean>;
}

// aggregator-worker/src/sources/iiko.source.ts
export class IikoDataSource implements ExternalDataSource {
  name = 'iiko';
  type = 'rest' as const;

  async authenticate() { /* ... */ }
  async getRevenue(params) { /* ... */ }
  async getExpenses(params) { /* ... */ }
  async healthCheck() { /* ... */ }
}

// aggregator-worker/src/sources/onec.source.ts
export class OneCDataSource implements ExternalDataSource {
  name = '1c';
  type = 'odata' as const;

  async authenticate() { /* ... */ }
  async getRevenue(params) { /* ... */ }
  async getExpenses(params) { /* ... */ }
  async healthCheck() { /* ... */ }
}

// Добавить новый источник = создать новый класс + зарегистрировать
// aggregator-worker/src/sources/rkeeper.source.ts
export class RKeeperDataSource implements ExternalDataSource { /* ... */ }
```

**Паттерн Adapter** — каждый внешний источник реализует единый интерфейс. aggregator-worker не знает деталей API, он вызывает `source.getRevenue()` одинаково для любого источника.

```
┌─────────────────────────────────────────────────┐
│              aggregator-worker                   │
│                                                  │
│  SyncService                                     │
│    │                                             │
│    ├── sources: ExternalDataSource[]             │
│    │     ├── IikoDataSource (iikoCloud API)      │
│    │     ├── OneCDataSource (1С OData)           │
│    │     └── [будущие источники]                  │
│    │                                             │
│    ├── Каждый source обёрнут в CircuitBreaker    │
│    │                                             │
│    └── syncAll():                                │
│         for (source of sources) {                │
│           revenue = await source.getRevenue()    │
│           expenses = await source.getExpenses()  │
│           → upsert в PostgreSQL                  │
│           → log в SyncLog                        │
│         }                                        │
└─────────────────────────────────────────────────┘
```

### 8.3 Webhook-приёмник (для будущих интеграций)

Если iiko или 1С начнут поддерживать webhook (push-модель вместо pull):

```typescript
// aggregator-worker/src/webhooks/webhook.controller.ts
@Controller('webhooks')
export class WebhookController {
  @Post('iiko')
  @UseGuards(WebhookSignatureGuard)  // Проверка подписи
  async handleIikoWebhook(@Body() payload: IikoWebhookPayload) {
    // Обработать event: sale, expense, shift_close
    await this.syncService.processWebhookEvent('iiko', payload);
  }

  @Post('1c')
  @UseGuards(WebhookSignatureGuard)
  async handleOneCWebhook(@Body() payload: OneCWebhookPayload) {
    await this.syncService.processWebhookEvent('1c', payload);
  }
}
```

---

## 9. Переменные окружения

### 9.1 Полный список .env

```env
# ═══════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════
POSTGRES_URL=postgresql://root:root@127.0.0.1:5434/dashboard
REDIS_URL=redis://localhost:6380

# ═══════════════════════════════════════════════════
# AUTH SERVICE
# ═══════════════════════════════════════════════════
JWT_SECRET=<change-in-production-min-32-chars>
JWT_ACCESS_TTL=7d
JWT_REFRESH_TTL=30d
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_BLOCK_DURATION_SECONDS=900
DEV_BYPASS_PHONES=+77074408018,+77000000001
DEV_BYPASS_CODE=111111

# Telegram Bot (основной канал OTP)
TELEGRAM_GATEWAY_TOKEN=<token>

# Mobizon SMS (fallback)
MOBIZON_API_KEY=<key>
MOBIZON_API_DOMAIN=api.mobizon.kz

# ═══════════════════════════════════════════════════
# IIKO INTEGRATION
# ═══════════════════════════════════════════════════
IIKO_API_URL=https://api-ru.iiko.services
IIKO_API_KEY=<key>
IIKO_SYNC_INTERVAL_MINUTES=15
IIKO_REQUEST_TIMEOUT_MS=30000
IIKO_MAX_RETRIES=3

# ═══════════════════════════════════════════════════
# 1C INTEGRATION
# ═══════════════════════════════════════════════════
ONEC_REST_URL=https://<server>/odata/standard.odata
ONEC_REST_USER=<user>
ONEC_REST_PASS=<password>
ONEC_SYNC_INTERVAL_MINUTES=15
ONEC_REQUEST_TIMEOUT_MS=60000
ONEC_MAX_RETRIES=3

# ═══════════════════════════════════════════════════
# API GATEWAY
# ═══════════════════════════════════════════════════
API_GATEWAY_PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
FINANCE_SERVICE_URL=http://localhost:3002
SERVICE_KEY=<internal-service-key-min-32-chars>
THROTTLE_TTL=60
THROTTLE_LIMIT=60

# ═══════════════════════════════════════════════════
# FIREBASE (Push-уведомления)
# ═══════════════════════════════════════════════════
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# ═══════════════════════════════════════════════════
# NOTIFICATION THRESHOLDS
# ═══════════════════════════════════════════════════
ALERT_SYNC_FAILURE_MINUTES=60
ALERT_LOW_REVENUE_PERCENT=70
ALERT_LARGE_EXPENSE_AMOUNT=500000

# ═══════════════════════════════════════════════════
# SENTRY
# ═══════════════════════════════════════════════════
SENTRY_DSN=<dsn>
SENTRY_ENVIRONMENT=development

# ═══════════════════════════════════════════════════
# MOBILE
# ═══════════════════════════════════════════════════
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
EXPO_PUBLIC_SENTRY_DSN=<dsn>

# ═══════════════════════════════════════════════════
# TIMEZONE
# ═══════════════════════════════════════════════════
TZ=Asia/Almaty
BUSINESS_TIMEZONE=Asia/Almaty
```

---

## 10. Сводка: что есть vs что нужно

### ✅ Уже реализовано и работает
- Turborepo монорепо
- PostgreSQL 15 + Redis 7 в Docker
- Prisma схема (базовая)
- auth-service: OTP → JWT → Refresh (Telegram + Mobizon)
- api-gateway: JWT proxy → auth-service, Swagger, throttling
- shared-types: UserRole enum (4 роли — правильно!)
- mobile-dashboard: LoginScreen с OTP (рабочий)
- web-dashboard: Login + mock Dashboard (не приоритет, out of scope)

### ❌ Нужно реализовать
| Что | Приоритет | Сложность |
|-----|-----------|-----------|
| Prisma: Brand, DdsArticle, CostAllocation, Kitchen*, AuditLog | 🔴 | Средняя |
| auth-service: RolesGuard, DataAccess, AuditLog, PIN | 🔴 | Средняя |
| aggregator-worker: iiko HTTP-клиент | 🔴 | Высокая |
| aggregator-worker: 1С OData клиент | 🔴 | Высокая |
| aggregator-worker: движок распределения затрат | 🔴 | Высокая |
| aggregator-worker: cron + circuit breaker | 🔴 | Средняя |
| finance-service: 4 уровня drill-down API | 🔴 | Высокая |
| finance-service: отчёты + DataAccessFilter | 🔴 | Средняя |
| api-gateway: dashboard proxy + RolesGuard | 🔴 | Низкая |
| mobile: Zustand + React Query + Axios | 🟡 | Средняя |
| mobile: 4 уровня drill-down экраны | 🟡 | Высокая |
| mobile: PeriodSelector + графики | 🟡 | Средняя |
| mobile: i18n (RU + KZ) | 🟡 | Низкая |
| mobile: Sentry | 🟡 | Низкая |
| mobile: PIN / биометрия | 🟡 | Средняя |
| push-уведомления: FCM + triggers | 🟢 | Средняя |
| Nginx + SSL | 🟢 | Низкая |
| CI/CD: GitHub Actions | 🟢 | Средняя |
| EAS Build + OTA | 🟢 | Средняя |
| Бэкапы PostgreSQL | 🟢 | Низкая |
