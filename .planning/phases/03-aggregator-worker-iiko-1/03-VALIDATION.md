---
phase: 3
slug: aggregator-worker-iiko-1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `apps/aggregator-worker/jest.config.js` |
| **Quick run command** | `cd apps/aggregator-worker && npm test -- --testPathPattern=iiko-sync` |
| **Full suite command** | `cd apps/aggregator-worker && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/aggregator-worker && npm test -- --testPathPattern=iiko-sync`
- **After every plan wave:** Run `cd apps/aggregator-worker && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | nomenclature groups | unit | `npm test -- --testPathPattern=iiko-sync` | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | DdsArticleGroup upsert | unit | `npm test -- --testPathPattern=iiko-sync` | ✅ | ⬜ pending |
| 3-01-03 | 01 | 1 | scheduler cron added | unit | `npm test -- --testPathPattern=scheduler` | ✅ | ⬜ pending |
| 3-02-01 | 02 | 1 | Sentry init | unit | `npm test -- --testPathPattern=iiko-sync` | ✅ | ⬜ pending |
| 3-02-02 | 02 | 1 | Sentry capture in catch | unit | `npm test -- --testPathPattern=iiko-sync` | ✅ | ⬜ pending |
| 3-03-01 | 03 | 2 | needsManualReview field | unit | `npm test -- --testPathPattern=iiko-sync` | ✅ | ⬜ pending |
| 3-03-02 | 03 | 2 | dead letter trigger (3x) | unit | `npm test -- --testPathPattern=iiko-sync` | ✅ | ⬜ pending |
| 3-04-01 | 04 | 2 | 1C shipments sync | unit | `npm test -- --testPathPattern=onec` | ✅ | ⬜ pending |
| 3-04-02 | 04 | 2 | restaurantId binding | unit | `npm test -- --testPathPattern=onec` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing test infrastructure covers all phase requirements — jest + existing spec files already in place.*

- [ ] `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts` — add new describe blocks for syncNomenclature + dead letter
- [ ] `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` — create if not exists, add syncKitchenShipmentsByRestaurant tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry error appears in Sentry.io dashboard | 3.5 Sentry | Requires live Sentry DSN + network | Set SENTRY_DSN, trigger a sync error, check Sentry dashboard |
| Dead letter flag visible in DB | 3.5 Dead letter | Requires live PostgreSQL | Run 3 failing syncs, query `SELECT * FROM "SyncLog" WHERE "needsManualReview" = true` |
| iiko nomenclature XML field names | 3.1 | Requires live iiko connection | Add logger.debug(JSON.stringify(parsed)) on first run |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
