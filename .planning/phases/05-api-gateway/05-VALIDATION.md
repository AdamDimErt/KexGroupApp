---
phase: 5
slug: api-gateway
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x (unit) + supertest 7.x (e2e) |
| **Config file** | `apps/api-gateway/package.json` (jest config inline) + `apps/api-gateway/test/jest-e2e.json` |
| **Quick run command** | `cd apps/api-gateway && npm test -- --testPathPattern=finance-proxy --passWithNoTests` |
| **Full suite command** | `cd apps/api-gateway && npm test -- --passWithNoTests` |
| **E2E command** | `cd apps/api-gateway && npm run test:e2e -- --passWithNoTests` |
| **Estimated runtime** | ~3 seconds (unit) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api-gateway && npm test -- --passWithNoTests`
- **After every plan wave:** Run full suite + e2e
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | GATEWAY-ROUTES | unit | `npm test -- --testPathPattern=finance-proxy` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | GATEWAY-ROUTES | unit | `npm test -- --testPathPattern=finance-proxy` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | GATEWAY-E2E | e2e | `npm run test:e2e -- --testPathPattern=finance-proxy` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api-gateway/test/finance-proxy.e2e-spec.ts` — stubs for E2E route tests
- [ ] Verify `test/jest-e2e.json` has correct `moduleNameMapper` for `@dashboard/shared-types` path alias

*Note: Unit test file `finance-proxy.controller.spec.ts` does not currently exist — must be created in Wave 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real HTTP proxy to finance-service | GATEWAY-ROUTES | No live finance-service in CI | Start both services, call GET /api/finance/reports/dds with valid JWT |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
