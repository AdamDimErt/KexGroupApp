---
phase: 08-push-notifications
plan: 01
subsystem: api-gateway / notifications
tags: [notifications, fcm, push, preferences, role-dispatch, internal-api]
dependency_graph:
  requires: []
  provides: [notification-preferences-api, internal-trigger-endpoint, fixed-role-dispatch]
  affects: [apps/api-gateway, packages/database]
tech_stack:
  added: []
  patterns: [TDD, upsert-with-defaults, internal-secret-auth, Promise.allSettled-multi-role]
key_files:
  created:
    - packages/database/migrations/20260408120000_notification_preference/migration.sql
    - apps/api-gateway/src/notifications/notification.service.spec.ts
  modified:
    - packages/database/schema.prisma
    - apps/api-gateway/src/notifications/notification.service.ts
    - apps/api-gateway/src/notifications/notification.controller.ts
    - apps/api-gateway/src/notifications/notification.module.ts
    - apps/api-gateway/src/dto/notification.dto.ts
decisions:
  - "NotificationPreference stored in @@schema(auth) matching all other user-related models"
  - "isNotificationEnabled returns true by default (no row = enabled) — opt-out model"
  - "InternalNotificationController is a separate class (not method) to bypass JwtAuthGuard at class level"
  - "x-internal-secret header auth for aggregator-worker internal trigger — simple and effective for internal microservice comms"
  - "Promise.allSettled for multi-role dispatch — one role failure never blocks the other"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 7
---

# Phase 8 Plan 1: Notification Role Dispatch Fix + Preferences API Summary

**One-liner:** Fixed 3 critical role dispatch bugs in NotificationService, added per-type NotificationPreference model + CRUD API, and created internal trigger endpoint with x-internal-secret auth for aggregator-worker.

## What Was Built

### NotificationPreference Prisma model
New model `NotificationPreference` in `@@schema("auth")` with `@@unique([userId, type])` constraint. Allows per-user, per-notification-type enable/disable. Defaults to enabled (opt-out model) when no row exists. Manual migration SQL created at `packages/database/migrations/20260408120000_notification_preference/migration.sql`.

### Fixed role dispatch bugs
Three methods in `NotificationService` had incorrect role targeting:
- `triggerLowRevenueAlert`: was `OWNER` only → now `OWNER` + `OPERATIONS_DIRECTOR` via `Promise.allSettled`
- `triggerLargeExpenseAlert`: was `OWNER` only → now `OWNER` + `FINANCE_DIRECTOR` via `Promise.allSettled`
- `triggerSyncFailureAlert`: was `ADMIN` (non-existent role) → now `OWNER`

### Preference check in sendToUser
Added private `isNotificationEnabled(userId, type)` method that queries `notificationPreference.findUnique`. Called at the top of `sendToUser` — returns early with debug log when disabled. Default: enabled when no row exists.

### handleInternalTrigger method
Routes incoming trigger type string to the appropriate `triggerXxxAlert` method via switch statement. Handles `SYNC_FAILURE`, `LOW_REVENUE`, `LARGE_EXPENSE`.

### Preferences CRUD endpoints
- `GET /notifications/preferences` — returns all 3 types with enabled status (defaults to true)
- `PUT /notifications/preferences/:type` — upserts preference for given type

### InternalNotificationController
Separate controller class (bypasses `JwtAuthGuard` applied at `NotificationController` class level) at `POST /internal/notifications/trigger`. Validates `x-internal-secret` header against `INTERNAL_API_SECRET` env var. Returns `UnauthorizedException` on mismatch.

### New DTOs
- `UpdatePreferenceDto` with `@IsBoolean() enabled`
- `InternalTriggerDto` with `@IsIn(['SYNC_FAILURE', 'LOW_REVENUE', 'LARGE_EXPENSE']) type` + `@IsObject() payload`

## Test Results

10/10 unit tests passing:
- triggerLowRevenueAlert → OWNER + OPERATIONS_DIRECTOR (2 sendToRole calls)
- triggerLargeExpenseAlert → OWNER + FINANCE_DIRECTOR (2 sendToRole calls)
- triggerSyncFailureAlert → OWNER (not ADMIN)
- sendToUser skips when preference disabled
- sendToUser proceeds when no preference row (default enabled)
- handleInternalTrigger routes SYNC_FAILURE
- handleInternalTrigger routes LOW_REVENUE
- handleInternalTrigger routes LARGE_EXPENSE
- getUserPreferences returns 3 types with defaults
- updatePreference calls upsert with correct params

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
| ---- | ------- |
| 1e7bc49 | test(08-01): add failing tests for notification role dispatch and preferences |
| 6804417 | feat(08-01): add NotificationPreference model, fix role dispatch, add preference check |
| bebb02e | feat(08-01): add preferences endpoints and internal trigger controller |

## Self-Check: PASSED
