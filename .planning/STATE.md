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
- Нет Sentry
- Нет локализации (русский + казахский)

## Completed Plans
- **02-00** (2026-04-07): Added biometricEnabled Boolean @default(false) to User model, migration SQL created, Prisma client regenerated. Commit: b7f1ba6
- **02-01** (2026-04-07): AuditLog writes on LOGIN/LOGOUT (fire-and-forget writeAuditLog method), JWT TTL reduced from 7d to 15m, trust proxy added for real client IP. Commits: 4c3a2c9, 29f41f7
- **02-03** (2026-04-07): Biometric enable/verify endpoints added — POST /auth/biometric/enable (JWT-protected, sets DB flag + BIOMETRIC_ENABLE audit) and POST /auth/biometric/verify (refresh-token-based login with rotation + BIOMETRIC_LOGIN audit). BiometricVerifyDto added. Commit: c1cfd4f
- **02-04** (2026-04-07): 32-test suite for AuthService — added enableBiometric (2 tests) and verifyBiometric (6 tests) describe blocks covering success, rejection, inactive user, audit log events (BIOMETRIC_ENABLE/BIOMETRIC_LOGIN), and token rotation. All 32 tests pass. Commit: 5a06969

## Key Decisions
- **[02-00]** When DB unavailable, create Prisma migration SQL files manually in migrations/ directory with timestamp naming convention; apply later with `npx prisma migrate dev`
- **[02-01]** Fire-and-forget audit logging via `void this.writeAuditLog()` — audit failures never block auth response
- **[02-01]** JWT access token TTL = 15m (backend side of inactivity requirement; mobile handles AppState-based auto-logout separately)
- **[02-01]** Use `import type` for express Request in decorated NestJS controller methods (required by isolatedModules + emitDecoratorMetadata)
- **[02-03]** biometric/enable requires valid JWT (user must be already authenticated to opt in); biometric/verify uses refresh token from body (no JWT) — mobile passes it after device biometric scan
- **[02-03]** Refresh token rotation on biometric verify prevents replay attacks; same pattern as regular /refresh endpoint
- **[02-04]** Use `setImmediate` tick flush (`await new Promise(resolve => setImmediate(resolve))`) to assert on fire-and-forget `void this.writeAuditLog()` calls in Jest unit tests
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
