# Phase 8: Push-уведомления — Research

**Researched:** 2026-04-08
**Domain:** Firebase Cloud Messaging (FCM HTTP v1), expo-notifications, NestJS alert triggers, notification preferences
**Confidence:** HIGH

---

## Summary

Phase 8 доводит push-уведомления до production-ready состояния. Инфраструктура на 70% уже готова:
`NotificationService` в api-gateway реализует FCM HTTP v1 через OAuth2 service account JWT, DB-модели
`NotificationToken` и `NotificationLog` определены в Prisma-схеме, `expo-notifications@0.31.0` установлен
в мобильном приложении, хук `usePushNotifications` написан и хуки для списка уведомлений тоже.
`NotificationsScreen` отображает историю.

Что **не реализовано** и составляет суть Phase 8:
1. Хук `usePushNotifications` не вызывается в `App.tsx` — токен никогда не регистрируется.
2. Три alert-триггера в `NotificationService` существуют, но **никогда не вызываются** — нет агента-мониторинга в aggregator-worker.
3. `NotificationService` отправляет `LOW_REVENUE` только роли `OWNER`, тогда как ТЗ требует OWNER + OPS_DIRECTOR; `LARGE_EXPENSE` только OWNER вместо OWNER + FIN_DIRECTOR.
4. Настройки уведомлений в профиле (вкл/выкл по типам) — не реализованы ни в backend, ни в mobile.
5. Схема в Prisma не имеет модели `NotificationPreference`.

**Primary recommendation:** Реализовать в 3 потока — (A) aggregator-worker alert monitor, (B) исправить роли в NotificationService + добавить HTTP-эндпоинт для внутренних триггеров, (C) мобиль — wire usePushNotifications + ProfileScreen с настройками.

---

## What Is Already Built (DO NOT RE-BUILD)

| Component | Location | Status |
|-----------|----------|--------|
| `NotificationService` (sendToUser, sendToRole, FCM HTTP v1) | `apps/api-gateway/src/notifications/notification.service.ts` | DONE |
| `NotificationController` (register/unregister/list/mark-read) | `apps/api-gateway/src/notifications/notification.controller.ts` | DONE |
| `NotificationModule` (wired in AppModule) | `apps/api-gateway/src/notifications/notification.module.ts` | DONE |
| DB models `NotificationToken`, `NotificationLog` | `packages/database/schema.prisma` (`@@schema("auth")`) | DONE |
| DTOs `RegisterTokenDto`, `UnregisterTokenDto` | `apps/api-gateway/src/dto/notification.dto.ts` | DONE |
| Mobile hook `usePushNotifications` | `apps/mobile-dashboard/src/hooks/usePushNotifications.ts` | DONE (NOT WIRED) |
| Mobile hook `useNotifications` (list + unread count) | `apps/mobile-dashboard/src/hooks/useNotifications.ts` | DONE |
| Mobile service `notifications.ts` (registerPushToken, markRead etc.) | `apps/mobile-dashboard/src/services/notifications.ts` | DONE |
| `NotificationsScreen` (history list) | `apps/mobile-dashboard/src/screens/NotificationsScreen.tsx` | DONE |
| `expo-notifications@~0.31.0` + `expo-device@~7.1.0` | `apps/mobile-dashboard/package.json` | DONE |

---

## What Needs to Be Built

### 1. aggregator-worker — Alert Monitor Service

**Problem:** Trigger methods (`triggerLowRevenueAlert`, `triggerSyncFailureAlert`, `triggerLargeExpenseAlert`) exist in api-gateway's `NotificationService` but aggregator-worker never calls them.

**Solution pattern:**
- aggregator-worker does NOT import api-gateway's `NotificationService` directly (microservice boundary).
- aggregator-worker calls the api-gateway over HTTP (same pattern as existing inter-service communication): internal endpoint `POST /internal/notifications/trigger`.
- api-gateway exposes this internal route (no JWT, IP-restricted or secret-header auth).

**Alternatively (simpler for monorepo):** Add a `NotificationAlertService` directly inside aggregator-worker that writes to the DB (`NotificationLog`) and sends FCM itself, using the same OAuth2 pattern as api-gateway. This avoids HTTP coupling. BUT: api-gateway's `NotificationService` already owns FCM logic — duplication is a risk.

**Recommended pattern:** aggregator-worker calls api-gateway internal HTTP endpoint. Uses `HttpService` (@nestjs/axios), which is already installed and used for iiko/1C calls.

**Three triggers:**

#### Trigger A: Sync failure > 1 hour
```typescript
// In SchedulerService, after any sync method catches an error:
// Query SyncLog — if latest SUCCESS for this system is > 1h ago, fire alert
const lastSuccess = await prisma.syncLog.findFirst({
  where: { system, status: 'SUCCESS' },
  orderBy: { createdAt: 'desc' },
});
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
if (!lastSuccess || lastSuccess.createdAt < oneHourAgo) {
  // call HTTP trigger
}
```

#### Trigger B: Revenue < 70% of average
```typescript
// After syncRevenue() completes, check today's revenue vs 30-day average
// Uses FinancialSnapshot — already populated by syncRevenue()
const today = snapshots for today;
const avg = AVG(snapshots for last 30 days excluding today) per restaurant;
if (today.revenue < avg * 0.70) → fire LOW_REVENUE alert
```
**Note:** threshold value (X ₸) for LARGE_EXPENSE is a business config — store in env: `LARGE_EXPENSE_THRESHOLD_KZT` (default e.g. 500_000).

#### Trigger C: Large expense > X ₸
```typescript
// After syncExpenses() or syncOneCExpenses(), check new Expense records
// If any single record amount > LARGE_EXPENSE_THRESHOLD_KZT → fire alert
```

### 2. api-gateway — Fix Role Targeting + Internal Trigger Endpoint

**Bug in existing code:**
```typescript
// notification.service.ts line 153 — sends only to OWNER
// TZ requires: LOW_REVENUE → OWNER + OPERATIONS_DIRECTOR
// TZ requires: LARGE_EXPENSE → OWNER + FINANCE_DIRECTOR

// Current (WRONG):
await this.sendToRole('OWNER', 'LOW_REVENUE', message);

// Should be:
await Promise.allSettled([
  this.sendToRole('OWNER', 'LOW_REVENUE', message),
  this.sendToRole('OPERATIONS_DIRECTOR', 'LOW_REVENUE', message),
]);
```

**Internal trigger endpoint:**
```typescript
// POST /internal/notifications/trigger
// Protected by INTERNAL_API_SECRET header (not JWT)
// Body: { type: 'LOW_REVENUE' | 'LARGE_EXPENSE' | 'SYNC_FAILURE', payload: {...} }
```

### 3. Prisma — Add NotificationPreference Model

```prisma
model NotificationPreference {
  id     String  @id @default(uuid())
  userId String
  type   String  // "SYNC_FAILURE" | "LOW_REVENUE" | "LARGE_EXPENSE" | "DAILY_SUMMARY"
  enabled Boolean @default(true)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, type])
  @@schema("auth")
}
```

`NotificationService.sendToUser()` must check preferences before sending:
```typescript
const pref = await prisma.notificationPreference.findFirst({
  where: { userId, type },
});
if (pref && !pref.enabled) return; // user opted out
```

### 4. api-gateway — Notification Preferences Endpoints

```
GET  /notifications/preferences        → list all prefs for current user
PUT  /notifications/preferences/:type  → { enabled: boolean }
```

### 5. Mobile — Wire usePushNotifications in App.tsx

```typescript
// App.tsx — AFTER user is authenticated
const { accessToken } = useAuthStore();
usePushNotifications(accessToken); // currently MISSING
```

### 6. Mobile — ProfileScreen with Notification Settings

New screen accessible from Settings tab or header menu:
- Toggle list: SYNC_FAILURE / LOW_REVENUE / LARGE_EXPENSE / DAILY_SUMMARY
- Each toggle calls `PUT /api/notifications/preferences/:type`
- State managed locally (optimistic update)
- Screen type: add `'profile'` to `Screen` union in `types/index.ts`

---

## Standard Stack

### Core (already installed/in-use)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `expo-notifications` | ~0.31.0 | FCM token registration, local notification handlers | INSTALLED |
| `expo-device` | ~7.1.0 | Physical device check | INSTALLED |
| `@nestjs/axios` | existing | HTTP calls from aggregator-worker | INSTALLED |
| `node:crypto` | built-in | OAuth2 JWT signing for FCM | IN USE |
| Prisma | existing | NotificationToken/NotificationLog queries | IN USE |

### No New Libraries Needed
The entire stack is already in place. Phase 8 is wiring, bug-fixing, and completing the business logic.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
apps/aggregator-worker/src/
├── alert/
│   ├── alert.module.ts          # NEW — alert monitoring
│   ├── alert.service.ts         # NEW — checks thresholds, calls api-gateway
│   └── alert.service.spec.ts    # NEW — unit tests
│
apps/api-gateway/src/
├── notifications/
│   ├── notification.service.ts  # MODIFY — fix roles, add prefs check
│   ├── notification.controller.ts # MODIFY — add prefs endpoints, internal trigger
│   └── notification.dto.ts      # MODIFY — add PreferenceDto
│
apps/mobile-dashboard/src/
├── screens/
│   └── ProfileScreen.tsx        # NEW — notification settings
├── hooks/
│   └── useNotificationPrefs.ts  # NEW — preferences CRUD
```

### Pattern: Internal HTTP Trigger (aggregator-worker → api-gateway)

```typescript
// alert.service.ts in aggregator-worker
@Injectable()
export class AlertService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async fireSyncFailure(system: string, error: string): Promise<void> {
    const url = `${this.config.get('API_GATEWAY_URL')}/internal/notifications/trigger`;
    const secret = this.config.get('INTERNAL_API_SECRET');
    try {
      await firstValueFrom(
        this.httpService.post(url, { type: 'SYNC_FAILURE', payload: { system, error } }, {
          headers: { 'x-internal-secret': secret },
          timeout: 5000,
        }),
      );
    } catch (e) {
      // Fire-and-forget: log but never block sync
      this.logger.warn(`Alert dispatch failed: ${e}`);
    }
  }
}
```

**Key principle:** Alert dispatch is always fire-and-forget. A failed push must NEVER block sync execution.

### Pattern: Notification Preference Check

```typescript
// In NotificationService.sendToUser():
private async isNotificationEnabled(userId: string, type: string): Promise<boolean> {
  const pref = await this.prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });
  // Default: enabled (no row = all types enabled)
  return pref?.enabled ?? true;
}
```

### Pattern: expo-notifications Foreground Handler

When app is in foreground, notifications don't show by default on iOS. Must set handler:
```typescript
// In App.tsx or usePushNotifications.ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### Anti-Patterns to Avoid

- **Duplicating FCM send logic** in aggregator-worker — FCM logic lives ONLY in api-gateway's NotificationService. aggregator-worker calls via HTTP.
- **Blocking sync on alert failure** — wrap all alert calls in try/catch with fire-and-forget pattern.
- **Sending duplicate alerts** — deduplicate: track last-alert time per (userId, type, restaurantId) to avoid spamming. Simple approach: Redis key with TTL, or a lastAlertedAt field in a new AlertState table.
- **Threshold in code** — use `process.env.LARGE_EXPENSE_THRESHOLD_KZT` for configurable threshold.
- **Using Expo Push Token as FCM token** — `usePushNotifications.ts` calls `getExpoPushTokenAsync()` which returns `ExponentPushToken[...]` format, NOT a native FCM token. For FCM v1 HTTP API you need native FCM token via `getDevicePushTokenAsync()`. See pitfall below.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| FCM OAuth2 token refresh | Custom token cache | In-memory `accessToken + tokenExpiresAt` (already implemented in NotificationService) |
| Notification delivery retries | Custom retry loop | `Promise.allSettled` + stale token deactivation (already implemented) |
| Push token permissions flow | Custom permission UI | `expo-notifications` getPermissionsAsync / requestPermissionsAsync (already in usePushNotifications.ts) |
| Android notification channel | Manual | `Notifications.setNotificationChannelAsync` (already in usePushNotifications.ts) |

---

## Common Pitfalls

### Pitfall 1: Expo Push Token vs Native FCM Token
**What goes wrong:** `Notifications.getExpoPushTokenAsync()` returns `ExponentPushToken[...]` — this goes to Expo's push proxy, NOT directly to FCM. Our backend uses FCM HTTP v1 directly.
**Root cause:** expo-notifications has two token types: Expo push token (for Expo's proxy) vs native device push token (for FCM direct).
**How to avoid:** Use `Notifications.getDevicePushTokenAsync()` (returns `{ type: 'fcm', data: '<token>' }`) for direct FCM calls. Check `token.type` before using `token.data`.
**Current code:** `usePushNotifications.ts` line 57 uses `getExpoPushTokenAsync` — this MUST be changed to `getDevicePushTokenAsync` for FCM direct usage.
**Note:** `getDevicePushTokenAsync` requires `projectId` to be set in `app.json` under `expo.extra.eas.projectId` OR pass nothing (it reads from app config).

### Pitfall 2: Background/Quit App Push Delivery
**What goes wrong:** FCM delivers push even when app is killed; `setNotificationHandler` only fires when app is in foreground.
**How to avoid:** Use `Notifications.addNotificationResponseReceivedListener` to handle taps from background/quit state. Not required for MVP but should be documented.

### Pitfall 3: Alert Spam (Duplicate Notifications)
**What goes wrong:** Revenue is checked every 15 min. If a restaurant stays below 70%, the owner gets spammed every cycle.
**How to avoid:** Store last-alert timestamp in Redis (or in a new `AlertState` DB table) with TTL per (restaurantId, type). Only fire if last alert > configurable cooldown (e.g., 4 hours).

### Pitfall 4: sendToRole('ADMIN') — No Admin User Exists
**What goes wrong:** `triggerSyncFailureAlert` calls `sendToRole('ADMIN', ...)` but the system only has OWNER/FIN_DIRECTOR/OPS_DIRECTOR roles in the User model. No user has role='ADMIN'.
**Root cause:** Role enum mismatch. CLAUDE.md defines 4 roles but the codebase uses 3.
**How to avoid:** `triggerSyncFailureAlert` should target `OWNER` (or a configurable env var for admin userId). Fix before shipping.

### Pitfall 5: Firebase Config Not in .env
**What goes wrong:** FCM fails silently if `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` are not set.
**Current code:** NotificationService returns `{ success: true, messageId: 'dev-skip' }` when `FIREBASE_PROJECT_ID` not set — safe for dev.
**How to avoid:** Document in `.env.example`, add health-check log at module init: `this.logger.log(fcmConfigured ? 'FCM configured' : 'FCM not configured (dev mode)')`.

### Pitfall 6: NotificationsScreen Not Passing accessToken to useNotifications
**What goes wrong:** `useNotifications` fetches `/api/notifications` without Authorization header — will 401.
**Current code:** `useNotifications.ts` uses `fetch` directly without auth headers.
**How to avoid:** Use `useApi.ts`'s `useApiQuery` with the auth interceptor, OR pass `accessToken` from auth store. The hook already uses `useApiQuery` but calls `fetch` inside — need to use the `dashboardApi` pattern with axio headers.

---

## Code Examples

### Correct: Get Native FCM Token (not Expo Proxy Token)
```typescript
// Source: expo-notifications official docs
// Replace in usePushNotifications.ts:
const tokenData = await Notifications.getDevicePushTokenAsync();
// tokenData.type === 'fcm' on Android, 'apns' on iOS (but FCM wraps APNS)
// tokenData.data === the raw FCM/APNS token string
const fcmToken = tokenData.data;
```

### Correct: Foreground Notification Handler
```typescript
// Source: expo-notifications docs
// Must be set BEFORE Notifications API is used — top of App.tsx or in usePushNotifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // manage badge manually
  }),
});
```

### Correct: Internal Endpoint Protection (api-gateway)
```typescript
// notification.controller.ts — internal trigger endpoint
@Post('internal/trigger')
async internalTrigger(
  @Headers('x-internal-secret') secret: string,
  @Body() body: InternalTriggerDto,
) {
  const expected = this.config.get<string>('INTERNAL_API_SECRET');
  if (!expected || secret !== expected) throw new UnauthorizedException();
  // dispatch trigger based on body.type
}
```

### Correct: Alert Deduplication with Redis TTL
```typescript
// alert.service.ts in aggregator-worker
// Uses existing Redis connection (IikoAuthService already uses Redis via ioredis or @nestjs/cache-manager)
private async shouldFireAlert(key: string, cooldownMs: number): Promise<boolean> {
  const redis = this.redisService;
  const existing = await redis.get(key);
  if (existing) return false; // already fired within cooldown
  await redis.set(key, '1', 'PX', cooldownMs);
  return true;
}
// key pattern: `alert:${type}:${restaurantId}` or `alert:sync_failure:${system}`
```

### Revenue Threshold Calculation
```typescript
// alert.service.ts — check LOW_REVENUE
async checkRevenueThreshold(restaurantId: string, date: Date): Promise<void> {
  const today = await prisma.financialSnapshot.findFirst({
    where: { restaurantId, date },
  });
  if (!today) return;

  // 30-day average (excluding today)
  const thirtyDaysAgo = new Date(date);
  thirtyDaysAgo.setDate(date.getDate() - 30);
  const { _avg } = await prisma.financialSnapshot.aggregate({
    where: { restaurantId, date: { gte: thirtyDaysAgo, lt: date } },
    _avg: { revenue: true },
  });
  const avg = Number(_avg.revenue ?? 0);
  if (avg === 0) return; // not enough history

  const threshold = avg * 0.70;
  if (Number(today.revenue) < threshold) {
    await this.fireLowRevenueAlert(restaurantId, Number(today.revenue), threshold);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| FCM Legacy HTTP API (`/fcm/send`) | FCM HTTP v1 (`/v1/projects/.../messages:send`) | Legacy API is deprecated as of 2024 — existing code is CORRECT using v1 |
| Expo push proxy | Direct FCM (via service account) | Direct FCM allows full payload control; existing backend uses direct FCM correctly |

---

## Open Questions

1. **Alert deduplication storage**
   - What we know: aggregator-worker uses Redis (via IikoAuthService's ioredis or similar)
   - What's unclear: Is there a shared Redis service/module in aggregator-worker, or is Redis only injected in IikoAuthService?
   - Recommendation: Check `apps/aggregator-worker/src/iiko/iiko-auth.service.ts` for Redis client. If injectable, use it in AlertService. Otherwise, use a simple `AlertStateCache` (in-memory Map with timestamps) for MVP — accept that dedup resets on worker restart.

2. **LARGE_EXPENSE_THRESHOLD_KZT value**
   - What we know: TZ says "крупный расход > X ₸" — X is unspecified
   - What's unclear: Business hasn't defined the threshold
   - Recommendation: Default to `500_000` KZT in env; add comment for owner to configure. Make configurable via `.env`.

3. **Morning summary (optional)**
   - TZ marks as "опционально" — daily summary push
   - Recommendation: Defer to Phase 9 or post-MVP. Do not implement in Phase 8.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default) |
| Config file | `apps/api-gateway/package.json` → `jest` key |
| Quick run command | `cd apps/api-gateway && npm test` |
| Full suite command | `cd apps/api-gateway && npm test -- --coverage` |

### Phase Requirements → Test Map

| Behavior | Test Type | Command |
|----------|-----------|---------|
| FCM token registration saves to DB | unit | `cd apps/api-gateway && npm test -- --testPathPattern=notification` |
| sendToRole dispatches to correct roles (OWNER+OPS for LOW_REVENUE) | unit | same |
| triggerSyncFailureAlert fires when SyncLog shows >1h gap | unit (AlertService) | `cd apps/aggregator-worker && npm test -- --testPathPattern=alert` |
| triggerLowRevenueAlert fires when revenue < 70% average | unit (AlertService) | same |
| Internal trigger endpoint rejects wrong secret | unit | api-gateway notification spec |
| Notification preference check skips disabled types | unit | api-gateway notification spec |
| usePushNotifications gets device token (not expo token) | manual (device) | n/a |

### Wave 0 Gaps
- [ ] `apps/api-gateway/src/notifications/notification.service.spec.ts` — covers role dispatch, preference check
- [ ] `apps/aggregator-worker/src/alert/alert.service.spec.ts` — covers threshold logic, dedup, fire-and-forget
- [ ] `apps/api-gateway/src/notifications/notification.controller.spec.ts` — covers internal trigger auth

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `apps/api-gateway/src/notifications/notification.service.ts` — full FCM v1 implementation reviewed
- Direct code inspection: `packages/database/schema.prisma` — NotificationToken, NotificationLog models confirmed
- Direct code inspection: `apps/mobile-dashboard/src/hooks/usePushNotifications.ts` — token type issue identified
- expo-notifications docs: getDevicePushTokenAsync vs getExpoPushTokenAsync distinction (HIGH — well-documented breaking behavior)

### Secondary (MEDIUM confidence)
- FCM HTTP v1 API: existing codebase uses correct endpoint format `fcm.googleapis.com/v1/projects/{id}/messages:send` — confirmed against FCM documentation pattern

### Tertiary (LOW confidence)
- Alert deduplication via Redis TTL: standard pattern, not verified against specific Redis client version in project

---

## Metadata

**Confidence breakdown:**
- What's already built: HIGH — direct code inspection
- Expo push token type bug: HIGH — getExpoPushTokenAsync vs getDevicePushTokenAsync is well-documented
- Alert trigger architecture: HIGH — standard inter-service HTTP call pattern matches existing codebase
- Threshold business values: LOW — unspecified in TZ

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable domain)
