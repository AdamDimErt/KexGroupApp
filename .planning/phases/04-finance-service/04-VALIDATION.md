---
phase: 4
slug: finance-service
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `apps/finance-service/package.json` → `"jest"` key |
| **Quick run command** | `cd apps/finance-service && npm test -- --testPathPattern=dashboard` |
| **Full suite command** | `cd apps/finance-service && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/finance-service && npm test -- --testPathPattern=dashboard --passWithNoTests`
- **After every plan wave:** Run `cd apps/finance-service && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | DataAccessInterceptor 403 enforcement | unit | `npm test -- --testPathPattern=interceptor` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | Interceptor passthrough for allowed roles | unit | `npm test -- --testPathPattern=interceptor` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | Interceptor param route matching | unit | `npm test -- --testPathPattern=interceptor` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | lastSyncAt from SyncLog MAX | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |
| 4-02-02 | 02 | 1 | Level 4 operations paginated items | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |
| 4-02-03 | 02 | 1 | Level 4 operations allocationCoefficient | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |
| 4-03-01 | 03 | 2 | DDS report rows by restaurant | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |
| 4-03-02 | 03 | 2 | Company expenses report categories | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |
| 4-03-03 | 03 | 2 | Kitchen report purchases + shipments | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |
| 4-03-04 | 03 | 2 | Trends report daily points | unit | `npm test -- --testPathPattern=dashboard` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/finance-service/src/common/interceptors/data-access.interceptor.spec.ts` — create interceptor spec file with describe blocks for 403 enforcement, passthrough, and param route matching

*All other test files already exist (`dashboard.service.spec.ts`) — only interceptor spec needs to be created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FIN_DIRECTOR blocked at Level 4 via API gateway | Role matrix | Requires live gateway + JWT | Send request with x-user-role: FIN_DIRECTOR to /dashboard/article/:id/operations, expect 403 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
