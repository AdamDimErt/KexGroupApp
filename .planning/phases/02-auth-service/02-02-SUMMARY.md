---
phase: 02-auth-service
plan: 02
status: done
completed_at: 2026-04-08
---

# Summary: Telegram Gateway OTP Integration

## What was done

### Task 1: Install package and add provider
- Installed `node-telegram-gateway-api` into `apps/auth-service`
- Added `{ provide: 'TELEGRAM_GATEWAY_CLIENT', ... }` provider to `apps/auth-service/src/auth/auth.module.ts`
- Provider uses `ConfigService` to read `TELEGRAM_GATEWAY_TOKEN`; returns `null` when the env var is not set (SMS-only mode)
- Fixed import to use named export `{ TelegramGateway }` and correct constructor signature `new TelegramGateway(token)` (the real package API differs from plan docs — constructor takes a plain string, not an object)

### Task 2: Service integration
- Added `@Inject('TELEGRAM_GATEWAY_CLIENT') private readonly telegramGateway: any | null` to the `AuthService` constructor
- Added private `sendOtpViaTelegram(phone)` method:
  - Returns `{ sent: false }` immediately when `telegramGateway` is null (logs a warning)
  - Calls `checkSendAbility(phone)` — returns `{ sent: false }` when phone is not on Telegram
  - Calls `sendVerificationMessage(phone, { code_length: 6 })` on success, stores `request_id` in Redis under key `tg_otp_rid:{phone}` with 5 min TTL
  - Falls back to SMS on any thrown error (logs to logger.error)
- Updated `generateOtp`: tries `sendOtpViaTelegram` first; on success returns `'Код отправлен через Telegram'`; on failure falls through to existing SMS path
- Updated `verifyOtp`: before the SMS OTP check, reads `tg_otp_rid:{phone}` from Redis; if present calls `checkVerificationStatus(requestId, code)` and on `code_valid` deletes the Redis key, writes AuditLog, and issues tokens
- Updated `apps/auth-service/src/auth/auth.service.spec.ts`:
  - Added `{ provide: 'TELEGRAM_GATEWAY_CLIENT', useValue: null }` to the main test module (all existing tests continue to pass)
  - Added `describe('generateOtp - Telegram Gateway')` with 3 tests: Telegram success path, SMS fallback when phone not on Telegram, SMS fallback when Gateway throws

## Real API differences from plan
The `node-telegram-gateway-api` package (v1.2.1) differs from the plan's assumed interface:
- Named export `{ TelegramGateway }`, not default export
- Constructor: `new TelegramGateway(apiKey: string)` — plain string, not `{ accessToken }`
- `checkSendAbility(phone_number: string)` — plain string argument
- `sendVerificationMessage(phone_number: string, options?)` — plain string + options object
- `checkVerificationStatus(request_id: string, code?: string)` — two plain strings
- `verification_status` is nested as `result.verification_status.status` (type `VerificationStatus`)

## Verification
- `npx tsc --noEmit` — no errors
- `npm test` — 35 tests pass (2 test suites)

## Acceptance criteria met
- [x] `node-telegram-gateway-api` in `apps/auth-service/package.json` dependencies
- [x] `auth.module.ts` contains `provide: 'TELEGRAM_GATEWAY_CLIENT'`
- [x] `auth.module.ts` contains `config.get<string>('TELEGRAM_GATEWAY_TOKEN')`
- [x] `auth.module.ts` contains `new TelegramGateway(`
- [x] `auth.module.ts` contains `if (!token) return null`
- [x] `auth.service.ts` contains `@Inject('TELEGRAM_GATEWAY_CLIENT')`
- [x] `auth.service.ts` contains `private async sendOtpViaTelegram(`
- [x] `auth.service.ts` contains `checkSendAbility`
- [x] `auth.service.ts` contains `sendVerificationMessage`
- [x] `auth.service.ts` contains `tg_otp_rid:`
- [x] `auth.service.ts` contains `checkVerificationStatus`
- [x] `auth.service.ts` contains `'Код отправлен через Telegram'`
- [x] `auth.service.ts` contains `falling back to SMS`
- [x] `auth.service.ts` Telegram success branch calls `writeAuditLog` before `issueTokens`
- [x] `auth.service.spec.ts` contains `TELEGRAM_GATEWAY_CLIENT`
- [x] `auth.service.spec.ts` contains `should send OTP via Telegram`
- [x] `auth.service.spec.ts` contains `should fall back to SMS when phone is not on Telegram`
- [x] All 35 tests pass
