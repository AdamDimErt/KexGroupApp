# Phase 2: Auth Service - Research

**Researched:** 2026-04-06
**Domain:** NestJS Auth — OTP (Telegram + SMS), Biometrics, AuditLog, Prisma integration
**Confidence:** HIGH

---

## Summary

Phase 2 Auth Service is approximately 60% implemented. The core OTP-via-SMS, JWT issuance, rate-limiting, and Prisma user read/create are all **already working** with real database calls (not mock — `auth.service.ts` uses `prisma.user.findUnique/create` with real connection). The remaining work is: adding Telegram as the primary OTP channel, implementing biometric enable/verify endpoints, writing the AuditLog on every login, and adding inactivity timeout.

The Prisma schema already has `AuditLog` model (with userId, action, ip, userAgent, createdAt) but the `User` model is **missing** the `biometricEnabled: Boolean` field — a schema migration is required. The test suite has 22 passing unit tests already. New tests for biometric and AuditLog paths need to be added to `auth.service.spec.ts`.

**Primary recommendation:** Use Telegram Gateway API (not Telegraf bot) for OTP — it is the purpose-built solution for phone verification, delivers codes natively in Telegram UI, and does not require a bot interaction. Use `node-telegram-gateway-api` v1.2.1 as the client. Implement inactivity timeout entirely on the mobile side (AppState monitoring) — the backend already handles this via short-lived access tokens (7d currently, should be reduced) combined with refresh token rotation already in place.

---

## Current State Audit

### What Is Already Implemented (auth-service)

| Feature | File | Status |
|---------|------|--------|
| OTP generation + Redis TTL 5min | `auth.service.ts:generateOtp` | DONE |
| Rate limiting 5 attempts / 15min block | `auth.service.ts` | DONE |
| Mobizon SMS sending | `auth.service.ts:sendSms` | DONE |
| Dev bypass phones + code | `auth.service.ts` | DONE |
| JWT issuance (access + refresh in Redis) | `auth.service.ts:issueTokens` | DONE |
| Refresh token rotation | `auth.service.ts:refresh` | DONE |
| Logout (del Redis key) | `auth.service.ts:logout` | DONE |
| `findOrCreateUser` with real Prisma | `auth.service.ts:findOrCreateUser` | DONE (real DB, not mock) |
| `GET /auth/me` | `auth.controller.ts` | DONE |
| DTO validation (class-validator) | `dto/auth.dto.ts` | DONE |
| Unit tests | `auth.service.spec.ts` | 22 tests PASSING |

### What Is Missing

| Feature | Status | Notes |
|---------|--------|-------|
| Telegram OTP channel | NOT DONE | Primary channel per TZ |
| `POST /auth/biometric/enable` | NOT DONE | Saves flag in DB |
| `POST /auth/biometric/verify` | NOT DONE | Refresh token -> JWT |
| `biometricEnabled` field in User model | NOT IN SCHEMA | Requires Prisma migration |
| AuditLog write on login | NOT DONE | Model exists, not called |
| Inactivity timeout (backend part) | NOT DONE | Mostly mobile concern |
| Unit tests for biometric/auditlog | NOT DONE | |

### Prisma Schema State

The `User` model in `packages/database/schema.prisma` **does not** contain a `biometricEnabled` field. It must be added:

```prisma
model User {
  // existing fields...
  biometricEnabled Boolean  @default(false)
  // ...
}
```

The `AuditLog` model exists and is complete:
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // "LOGIN" | "VIEW_DASHBOARD" | "LOGOUT" | "BIOMETRIC_ENABLE"
  entity    String?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
  @@schema("auth")
}
```

**IMPORTANT:** The auth-service agent must NOT edit `packages/database/schema.prisma` (per CLAUDE.md). The schema change must be requested to the leader agent or done as part of a DB migration task, OR the planner must create a specific task for adding the field to the schema. The `packages/database/` module is leader-only.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/jwt` | 11.0.2 (installed) | JWT sign/verify | Official NestJS module, already in use |
| `ioredis` | 5.10.0 (installed) | Redis client (OTP, refresh tokens) | Already integrated |
| `@prisma/client` | 7.5.0 (installed) | PostgreSQL ORM | Already integrated |
| `node-telegram-gateway-api` | 1.2.1 | Telegram Gateway OTP client | Purpose-built for phone verification |
| `telegraf` | 4.16.3 (ecosystem) | Telegram Bot framework | Fallback option if Gateway not suitable |
| `class-validator` | 0.14.1 (installed) | DTO validation | Already integrated |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nestjs-telegraf` | 2.9.1 | NestJS Telegraf integration | Only if using bot approach (NOT recommended) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Telegram Gateway API | Telegraf bot | Gateway delivers OTP natively in Telegram UI as a verification widget; bot requires user to `/start` first and is more complex to set up correctly |
| Mobile AppState for inactivity | Backend sliding window refresh TTL | Mobile is simpler, correct, and is how every production mobile app does it |

**Installation (new packages only):**
```bash
cd apps/auth-service && npm install node-telegram-gateway-api
```

---

## Architecture Patterns

### Recommended Project Structure (auth-service additions)
```
apps/auth-service/src/auth/
├── auth.controller.ts      # Add POST /biometric/enable, POST /biometric/verify
├── auth.service.ts         # Add sendTelegramOtp, enableBiometric, verifyBiometric, writeAuditLog
├── auth.module.ts          # Add TELEGRAM_GATEWAY_CLIENT provider
├── auth.service.spec.ts    # Add tests for new methods
└── dto/
    └── auth.dto.ts         # Add BiometricEnableDto, BiometricVerifyDto
```

### Pattern 1: Telegram Gateway OTP (Primary Channel)

**What:** Replace SMS-only `generateOtp` with a two-channel approach: try Telegram Gateway first, fall back to Mobizon SMS.

**Why Gateway over Bot:** The Telegram Gateway API (`https://gatewayapi.telegram.org`) is specifically designed for phone verification codes. It does not require the user to interact with a bot first. The user's Telegram receives a native verification message if their phone number is registered on Telegram. If the number is not on Telegram, the Gateway returns an error and SMS fallback is triggered.

**Flow:**
1. Call `checkSendAbility(phone)` to verify if the number is on Telegram.
2. If yes: call `sendVerificationMessage(phone, { code_length: 6 })` — Telegram generates the code.
3. Store the returned `request_id` in Redis: `telegram_otp_rid:{phone}` with TTL 5min.
4. When user submits code: call `checkVerificationStatus(request_id, code)`.
5. If Telegram returns "verified" — proceed to issue JWT.
6. If checkSendAbility fails (phone not on Telegram): fall back to Mobizon SMS (existing flow).

**Key Gateway API facts (HIGH confidence, from official docs):**
- Base URL: `https://gatewayapi.telegram.org`
- Auth: `Authorization: Bearer <token>` header
- `sendVerificationMessage` — sends code, returns `request_id`
- `checkSendAbility` — validates if number can receive (free check)
- `checkVerificationStatus` — validates user-submitted code (use when Telegram generates the code)
- Phone format: E.164 (e.g., `+77074408018`)
- Token obtained from: https://gateway.telegram.org (account settings)
- ENV variable: `TELEGRAM_GATEWAY_TOKEN`

**Code pattern:**
```typescript
// Source: https://core.telegram.org/gateway/api
// Using node-telegram-gateway-api v1.2.1
import TelegramGateway from 'node-telegram-gateway-api';

// In auth.module.ts provider:
{
  provide: 'TELEGRAM_GATEWAY_CLIENT',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const token = config.get<string>('TELEGRAM_GATEWAY_TOKEN');
    if (!token) return null; // Gateway disabled, SMS only
    return new TelegramGateway({ accessToken: token });
  },
}

// In auth.service.ts:
private async sendOtpViaTelegram(phone: string, code: string): Promise<boolean> {
  if (!this.telegramGateway) return false;
  try {
    const ability = await this.telegramGateway.checkSendAbility({ phone_number: phone });
    if (!ability.ok) return false;
    // Let Telegram generate the code (don't pass code param — simpler verification)
    const result = await this.telegramGateway.sendVerificationMessage({
      phone_number: phone,
      // code_length: 6  // optional if letting Telegram generate
    });
    if (result.ok && result.result?.request_id) {
      await this.redis.set(`tg_otp_rid:${phone}`, result.result.request_id, 'EX', this.OTP_TTL_SEC);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

### Pattern 2: Biometric Enable/Verify Endpoints

**What:** Backend tracks a `biometricEnabled` flag on the User model. The mobile app handles the actual biometric challenge (Face ID / Touch ID via `expo-local-authentication`). The backend just validates the existing refresh token and issues a new JWT.

**Security insight (MEDIUM confidence, verified against multiple mobile auth guides):** The server never receives biometric data. Biometric verification happens entirely on-device. The security guarantee is: the refresh token is stored in the device's secure storage (iOS Keychain / Android Keystore), encrypted behind the biometric challenge. Only a successful biometric scan allows the app to read the refresh token and send it to the backend.

**Flow — Enable:**
1. `POST /auth/biometric/enable` with `Authorization: Bearer <accessToken>`
2. Backend verifies the JWT, extracts userId
3. Updates `user.biometricEnabled = true` in DB
4. Writes AuditLog: `action = "BIOMETRIC_ENABLE"`
5. Returns `{ success: true }`

**Flow — Verify (fast login):**
1. Mobile passes biometric challenge successfully, reads refresh token from secure storage
2. `POST /auth/biometric/verify` with `{ refreshToken: "..." }` (no auth header needed)
3. Backend: looks up refresh token in Redis → gets userId
4. Checks `user.biometricEnabled === true` (security check — user could have disabled it)
5. If yes: deletes old refresh token (rotation), issues new access + refresh tokens
6. Writes AuditLog: `action = "BIOMETRIC_LOGIN"`

**Code pattern:**
```typescript
// POST /auth/biometric/enable — requires JWT auth header
async enableBiometric(userId: string, ip: string): Promise<{ success: boolean }> {
  await this.prisma.user.update({
    where: { id: userId },
    data: { biometricEnabled: true },
  });
  await this.writeAuditLog(userId, 'BIOMETRIC_ENABLE', ip);
  return { success: true };
}

// POST /auth/biometric/verify
async verifyBiometric(refreshToken: string, ip: string): Promise<AuthSuccessDto> {
  const userId = await this.redis.get(`refresh:${refreshToken}`);
  if (!userId) throw new UnauthorizedException('Refresh token недействителен');

  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true, restaurants: true },
  });
  if (!user || !user.isActive) throw new UnauthorizedException('Пользователь деактивирован');
  if (!user.biometricEnabled) throw new UnauthorizedException('Биометрия не включена');

  await this.redis.del(`refresh:${refreshToken}`); // rotate
  await this.writeAuditLog(userId, 'BIOMETRIC_LOGIN', ip);
  return this.issueTokens(user);
}
```

### Pattern 3: AuditLog Integration

**What:** Write to `AuditLog` table on key auth events. Do NOT use an NestJS interceptor for this (that would run on all requests). Write explicitly inside the service methods that require auditing.

**Events to log:**
- `LOGIN` — successful OTP verify
- `BIOMETRIC_LOGIN` — successful biometric verify
- `BIOMETRIC_ENABLE` — user enables biometric
- `LOGOUT` — user logs out

**Code pattern:**
```typescript
private async writeAuditLog(
  userId: string,
  action: string,
  ip?: string,
  userAgent?: string,
  entity?: string,
): Promise<void> {
  try {
    await this.prisma.auditLog.create({
      data: { userId, action, ip, userAgent, entity },
    });
  } catch (e) {
    // Never let audit log failure break auth flow
    this.logger.error('AuditLog write failed', e);
  }
}
```

**In controller:** Extract IP from request:
```typescript
// auth.controller.ts — inject @Req() req: Request
@Post('verify-otp')
verifyOtp(@Body() body: VerifyOtpDto, @Req() req: Request) {
  const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
  return this.authService.verifyOtp(body.phone, body.code, ip);
}
```

### Pattern 4: Inactivity Timeout

**What:** Auto-logout after configurable period of inactivity. This is a **mobile-side concern**, not a backend concern.

**Backend contribution:** Short access token TTL (currently 7d — too long). Recommended: access token TTL = **15 minutes**, refresh token TTL = **30 days** (already set). The mobile app calls `/auth/refresh` when the access token expires and the user is active. If the user is inactive for 30 days, the refresh token expires and they must log in again.

**Configurable inactivity timeout (additional):** If the TZ requires a shorter inactivity window (e.g., 30 minutes), implement via `AppState` listener on mobile + a last-active timestamp check in Redux/Zustand. The backend does not need to change.

**Backend-only option (if required):** Store `lastActiveAt` timestamp on User and check it during refresh. If `lastActiveAt < now - inactivityTimeout`, reject the refresh. This adds a DB write on every request (not recommended for performance).

**Recommendation:** Reduce JWT access token TTL from `7d` to `15m` in `auth.module.ts`. Let mobile handle the inactivity UI. Backend env variable: `INACTIVITY_TIMEOUT_MIN` can drive a check in `/auth/refresh` if required by the customer.

### Anti-Patterns to Avoid

- **Storing biometric data on backend:** Never. The backend only stores a boolean flag.
- **Using Telegraf bot for OTP:** Requires user to `/start` the bot first — breaks the auth flow. Use Gateway API instead.
- **Letting AuditLog failure break auth:** Always wrap `auditLog.create` in try/catch.
- **Using a global interceptor for AuditLog:** Interceptors fire on every route — too broad. Write audit entries explicitly in auth service methods.
- **Using Telegram Gateway without `checkSendAbility` first:** Without this check, paid requests may fail for unregistered numbers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram phone verification | Custom Telegram Bot API calls | `node-telegram-gateway-api` | Handles auth headers, retries, typed responses, status checking |
| JWT verification in controller | Manual `jwt.verify()` | `JwtService.verify()` from `@nestjs/jwt` | Already used; handles expiry, secret, error types |
| OTP code generation | Custom crypto | `Math.floor(100000 + Math.random() * 900000)` | Already in place; good enough for 6-digit codes |
| Refresh token storage | DB table | Redis with TTL | Already in place; automatic expiry, O(1) lookup |

**Key insight:** Biometric verification is hardware-enforced on-device. The backend's only job is to validate the refresh token (already implemented) and check a flag (new field). There is no new crypto or auth protocol to implement.

---

## Common Pitfalls

### Pitfall 1: Schema Migration Ownership
**What goes wrong:** Agent tries to add `biometricEnabled` to `schema.prisma` but the file is in `packages/database/` which is leader-only per CLAUDE.md.
**Why it happens:** The field is needed by auth-service but lives in a shared package.
**How to avoid:** Create a dedicated task in the plan for the leader agent (or a schema migration subtask) to add the field. Auth-service agent reads the schema but does not modify it.
**Warning signs:** Agent modifying files outside `apps/auth-service/src/`.

### Pitfall 2: Telegram Gateway Token Not Set
**What goes wrong:** `TELEGRAM_GATEWAY_TOKEN` env var is missing → Gateway client is null → all OTPs silently fall through to SMS → Telegram channel never works.
**Why it happens:** Developer forgets to register at gateway.telegram.org and add the token.
**How to avoid:** In `generateOtp`, log a clear warning if Gateway client is null and SMS fallback is used. Add `TELEGRAM_GATEWAY_TOKEN` to `.env.example` with a comment.

### Pitfall 3: Biometric Re-Enable After Logout
**What goes wrong:** User logs out, biometricEnabled remains true, another person with device access can use old refresh token via biometric endpoint.
**Why it happens:** Logout only deletes the refresh token from Redis but does not reset `biometricEnabled`.
**How to avoid:** `POST /auth/logout` should also set `biometricEnabled = false` OR verify the refresh token before using biometric. Current implementation deletes the refresh token, so `verifyBiometric` will fail (no Redis key) — this is already safe.

### Pitfall 4: AuditLog Writes Slowing Down Auth
**What goes wrong:** AuditLog `prisma.auditLog.create` adds latency to every login response.
**Why it happens:** Synchronous await in the hot path.
**How to avoid:** Fire-and-forget: `void this.writeAuditLog(...)` (no await) for non-critical audit entries. Or use `setImmediate` to defer. The wrapping try/catch in `writeAuditLog` ensures no exception propagates.

### Pitfall 5: JWT TTL Too Long (7 Days)
**What goes wrong:** Current `signOptions: { expiresIn: '7d' }` in `auth.module.ts` means a stolen access token is valid for a week.
**Why it happens:** Development convenience.
**How to avoid:** Change to `'15m'` for production. Refresh token (30 days in Redis) provides the long-lived session. Mobile must call `/auth/refresh` proactively when access token is near expiry.

### Pitfall 6: `req.ip` is `::1` or `::ffff:127.0.0.1`
**What goes wrong:** AuditLog records `::1` instead of the real client IP when behind Nginx.
**Why it happens:** Node.js reads from socket, not `X-Forwarded-For`.
**How to avoid:** Enable `app.set('trust proxy', 1)` in NestJS bootstrap (`main.ts`) so Express uses `X-Forwarded-For`. Then `req.ip` returns the real IP.

---

## Code Examples

### Enable Biometric — DTO
```typescript
// Source: class-validator docs, matches existing DTO pattern
export class BiometricVerifyDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### Controller — Extract IP
```typescript
// Source: NestJS docs https://docs.nestjs.com/controllers
import { Req } from '@nestjs/common';
import { Request } from 'express';

@Post('biometric/enable')
enableBiometric(@Req() req: Request, @Headers('authorization') authHeader: string) {
  const token = authHeader?.slice(7);
  const payload = this.jwtService.verify<{ sub: string }>(token);
  const ip = req.ip;
  return this.authService.enableBiometric(payload.sub, ip);
}
```

### Telegraf Bot (fallback reference — NOT recommended for primary)
```typescript
// If Gateway API is unavailable and bot approach is needed:
// npm install telegraf nestjs-telegraf
// Bot requires user to /start first — not suitable for OTP
// Use ONLY if Telegram Gateway account cannot be set up
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SMS-only OTP | Telegram Gateway primary + SMS fallback | 2023-2024 (Telegram Gateway launched) | Users with Telegram get native UX |
| Long-lived JWT (days) | Short access (15min) + long refresh (30d) | Standard since 2021 | Better security, standard mobile pattern |
| Passport.js guards | Plain `JwtService.verify()` | - | Project uses direct JWT; fine for microservice |

**Deprecated/outdated:**
- `passport-jwt` strategy: Not needed for this project, adds complexity. Current approach of manual `jwtService.verify()` in controller is simpler for a dedicated auth microservice.

---

## Open Questions

1. **Telegram Gateway account registration**
   - What we know: Requires creating an account at gateway.telegram.org
   - What's unclear: Whether the client (KEX GROUP) has or needs to register their own account, or if the developer registers on their behalf
   - Recommendation: Add `TELEGRAM_GATEWAY_TOKEN` to `.env.example` with instructions; gate the feature on env var presence (SMS fallback when missing)

2. **Inactivity timeout duration**
   - What we know: TZ says "configurable inactivity timeout" but doesn't specify the value
   - What's unclear: Is 30 minutes standard? 2 hours?
   - Recommendation: Default to 30 minutes in mobile AppState logic; add `INACTIVITY_TIMEOUT_MIN=30` to env for future backend enforcement

3. **Schema migration timing**
   - What we know: `biometricEnabled` field must be added to `User` model, which is in leader-only `packages/database/`
   - What's unclear: Should Phase 2 plan include a "request leader to run migration" task or is the field already planned?
   - Recommendation: Phase 2 plan Wave 0 must include a task to add the field + run `prisma migrate dev`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.0.0 + ts-jest 29.2.5 |
| Config file | `apps/auth-service/package.json` (jest section) |
| Quick run command | `cd apps/auth-service && npm test` |
| Full suite command | `cd apps/auth-service && npm run test:cov` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Telegram OTP sends via Gateway, falls back to SMS | unit | `cd apps/auth-service && npm test -- --testNamePattern "generateOtp"` | Partial (SMS tests exist) |
| AUTH-02 | `biometricEnabled` flag persisted in DB on enable | unit | `cd apps/auth-service && npm test -- --testNamePattern "enableBiometric"` | No — Wave 0 |
| AUTH-03 | Biometric verify: refresh token → JWT, checks flag | unit | `cd apps/auth-service && npm test -- --testNamePattern "verifyBiometric"` | No — Wave 0 |
| AUTH-04 | AuditLog written on LOGIN event | unit | `cd apps/auth-service && npm test -- --testNamePattern "writeAuditLog"` | No — Wave 0 |
| AUTH-05 | AuditLog failure does not break auth | unit | `cd apps/auth-service && npm test -- --testNamePattern "auditLog"` | No — Wave 0 |
| AUTH-06 | All existing OTP/JWT/refresh tests still pass | unit | `cd apps/auth-service && npm test` | Yes — 22 passing |

### Sampling Rate
- **Per task commit:** `cd apps/auth-service && npm test`
- **Per wave merge:** `cd apps/auth-service && npm run test:cov`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/auth-service/src/auth/auth.service.spec.ts` — add `enableBiometric`, `verifyBiometric`, `writeAuditLog` describe blocks
- [ ] Schema migration: `packages/database/schema.prisma` — add `biometricEnabled Boolean @default(false)` to `User` model (leader task)
- [ ] Migration run: `cd packages/database && npx prisma migrate dev --name add_biometric_enabled`
- [ ] Add `TELEGRAM_GATEWAY_TOKEN` to `.env.example`

---

## Sources

### Primary (HIGH confidence)
- Telegram Gateway official docs — https://core.telegram.org/gateway/api — endpoint signatures, auth method, phone format
- NestJS docs — https://docs.nestjs.com/security/authentication — controller patterns, `@Req()` decorator
- Direct codebase audit: `apps/auth-service/src/`, `packages/database/schema.prisma`, `packages/shared-types/src/index.ts`
- `npm view node-telegram-gateway-api` — version 1.2.1, published 2024-11-20 (confirmed current)
- `npm view telegraf version` — 4.16.3 (confirmed current)
- Test run: `cd apps/auth-service && npm test` — 22 tests PASSING (confirmed)

### Secondary (MEDIUM confidence)
- node-telegram-gateway-api GitHub — https://github.com/RahimGuerfi/node-telegram-gateway-api — usage patterns confirmed against official API
- Mobile biometric backend pattern — https://themobilereality.com/blog/biometrics-authentication — refresh token + on-device biometric pattern confirmed against Okta developer guide
- NestJS audit trail pattern — https://medium.com/@solomoncodes/building-an-audit-trail-system-in-nestjs-222a4604a6a2 — service-level write pattern

### Tertiary (LOW confidence)
- NestJS inactivity patterns — WebSearch results; pattern confirmed against general session management docs but not a single authoritative source

---

## Metadata

**Confidence breakdown:**
- Current codebase state: HIGH — directly read all files
- Standard stack: HIGH — versions verified via npm registry
- Telegram Gateway pattern: HIGH — official docs fetched
- Biometric backend pattern: MEDIUM — verified against multiple community sources + Okta guide
- Inactivity timeout: MEDIUM — standard mobile pattern, recommended approach is well-established
- AuditLog pattern: HIGH — schema confirmed in codebase, write pattern is standard Prisma

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days — stable domain)
