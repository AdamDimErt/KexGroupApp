# KEX Group App — Project Brief

## Vision
Мобильный управленческий дашборд для руководства ресторанного холдинга KEX GROUP (Казахстан). Три управленца открывают один экран и сразу видят состояние всего бизнеса — без входа в iiko и 1С по отдельности.

## Problem Statement
Финансовые данные разбросаны между iiko (выручка, ДДС) и 1С (затраты ГО, Цех, закупки). Чтобы получить оперативную картину, нужно заходить в каждую систему — это неудобно и медленно. Часть затрат не привязана к конкретной точке и требует ручного распределения.

## Solution
Микросервисный монорепозиторий с мобильным дашбордом (React Native/Expo), который:
- Агрегирует данные из iiko и 1С каждые 15-30 минут
- Показывает 4 уровня drill-down: Компания → Точка → Статья → Операция
- Автоматически распределяет общие затраты по удельному весу выручки
- Фильтрует данные по 3 ролям с матрицей доступа

## Three Principles (по ТЗ)
1. **Только чтение** — данные вводятся в iiko и 1С, приложение лишь отображает
2. **Drill-down навигация** — четыре уровня: Компания → Точка → Статья → Операция
3. **Умное распределение** — затраты без привязки распределяются по доле выручки

## Architecture
```
Monorepo (Turborepo)
├── apps/
│   ├── api-gateway          (NestJS — JWT Guard, Swagger, rate limiting)
│   ├── auth-service         (NestJS — OTP через Telegram, JWT, 3 роли, PIN/био)
│   ├── finance-service      (NestJS — 4 уровня drill-down, распределение затрат, отчёты)
│   ├── aggregator-worker    (NestJS — cron iiko+1С, circuit breaker, движок распределения)
│   └── mobile-dashboard     (React Native + Expo — iOS/Android)
└── packages/
    ├── shared-types         (TypeScript DTO/interfaces)
    ├── database             (Prisma ORM, multi-schema PostgreSQL)
    └── testing              (shared test utilities)
```

## Target Users (3 человека)
| Роль | Код | Доступ |
|------|-----|--------|
| 👑 Владелец | `OWNER` | Все данные, все 4 уровня, все точки |
| 📊 Фин. директор | `FIN_DIRECTOR` | Финансовые данные сводно, без уровня 4 |
| ⚙️ Опер. директор | `OPS_DIRECTOR` | Выручка, смены, Цех — без фин.деталей ГО |

## Authentication
- OTP по телефону (Telegram / Mobizon SMS) — первичный вход
- Биометрия (Face ID / Touch ID / отпечаток пальца) — быстрый повторный вход через `expo-local-authentication`
- JWT access + refresh tokens, хранение в `expo-secure-store`

## Organization Structure (из iiko)
```
Kexbrands ЦО (Корпорация)
├── Burger na Abaya (Бренд) → 8 точек (BNA)
├── Doner na Abaya (Бренд) → 5+ точек (DNA)
└── ... (возможно другие бренды)
```

## Tech Stack
- Backend: NestJS 11, TypeScript, Prisma 5, PostgreSQL 15, Redis 7
- Frontend: React Native 0.81, Expo 54, React 18
- Monitoring: Sentry (crash tracking backend + mobile)
- Infra: Turborepo, Docker Compose, GitHub Actions, Nginx + SSL
- Integrations: iikoCloud API, 1С REST/OData API, Telegram Bot API, Mobizon.kz SMS, Firebase Cloud Messaging

## External Integrations
| System | Purpose | Status |
|--------|---------|--------|
| iikoCloud | Выручка, ДДС (40+ статей), кассовые смены | Configured, not implemented |
| 1С REST API | Затраты ГО, Цех, закупки, отгрузки | Configured, not implemented |
| Telegram Bot | OTP-коды для авторизации (основной канал) | Planned |
| Mobizon.kz | SMS OTP (fallback) | Partially implemented |
| Firebase (FCM) | Push-уведомления | Planned |
| Redis | Rate-limiting, OTP cache, refresh tokens | Implemented |

## Key Business Logic
- **Распределение затрат:** Доля точки = Выручка точки / Общая выручка × Затраты без привязки
- **Финрезультат точки:** Выручка − Прямые расходы − Распределённые затраты
- **Пересчёт:** при каждой смене периода

## Current State
- Монорепо создан, структура сервисов разбита
- Auth service: OTP + Redis rate-limiting (без реального DB, без 3 ролей)
- Finance/Aggregator/Gateway: заглушки
- Mobile: базовая навигация, нет авторизации
- БД: Prisma схема — нужно обновить под ТЗ (добавить Brand, DdsArticle, CostAllocation, Kitchen*)
- Движок распределения затрат: не существует
- Drill-down: не реализован

## Out of Scope (по ТЗ)
- Веб-версия / планшетная адаптация
- Ввод/редактирование данных
- Админ-панель
- Экспорт PDF/Excel
- Тёмная тема
