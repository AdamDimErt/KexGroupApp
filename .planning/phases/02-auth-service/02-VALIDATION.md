---
phase: 2
slug: auth-service
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (NestJS default) |
| **Config file** | `apps/auth-service/jest.config.ts` |
| **Quick run command** | `cd apps/auth-service && npm test -- --testPathPattern=auth.service` |
| **Full suite command** | `cd apps/auth-service && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/auth-service && npm test -- --testPathPattern=auth.service`
- **After every plan wave:** Run `cd apps/auth-service && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 2-01-01 | 01 | 1 | Prisma real DB | unit | `npm test -- --testPathPattern=auth.service` | ⬜ pending |
| 2-01-02 | 01 | 1 | AuditLog write | unit | `npm test -- --testPathPattern=auth.service` | ⬜ pending |
| 2-02-01 | 02 | 1 | Telegram Gateway OTP | unit (mock) | `npm test -- --testPathPattern=auth.service` | ⬜ pending |
| 2-03-01 | 03 | 2 | biometric/enable endpoint | unit | `npm test -- --testPathPattern=auth.service` | ⬜ pending |
| 2-03-02 | 03 | 2 | biometric/verify endpoint | unit | `npm test -- --testPathPattern=auth.service` | ⬜ pending |
| 2-04-01 | 04 | 2 | schema biometricEnabled | grep | `grep biometricEnabled packages/database/schema.prisma` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing `auth.service.spec.ts` — extend with new describe blocks (no new files needed)
- [ ] Mock for `node-telegram-gateway-api` in test environment

*Existing test infrastructure (22 tests) covers the base — only extensions needed.*

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Real Telegram OTP delivery | Requires live Telegram Gateway token + phone | Send OTP to +77074408018, check Telegram |
| Real biometric prompt on device | Hardware required | Use Expo dev build on physical device |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
