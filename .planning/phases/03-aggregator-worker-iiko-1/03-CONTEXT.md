# Phase 3: Aggregator Worker (iiko + 1С) — Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** Conversation discussion + codebase scout

<domain>
## Phase Boundary

Phase 3 closes the remaining gaps in aggregator-worker. ~70% is already implemented. This phase delivers the final 30%:

1. **iiko nomenclature groups sync** — `GET /nomenclature/groups` endpoint → populate DdsArticleGroup + DdsArticle with proper group hierarchy. Daily at 03:00 alongside syncOrganizations.
2. **Sentry integration** — add @sentry/node to aggregator-worker; capture every sync error with context (system, orgId/entity, dateFrom, dateTo, errorMessage). Required by TZ.
3. **Dead letter pattern** — after 3 consecutive ERROR entries in SyncLog for same `system` → mark those SyncLog entries with `needsManualReview: true`. Add boolean field via Prisma migration if not present.
4. **1C kitchen shipments by restaurant** — `syncKitchenShipmentsByRestaurant()` in OneCyncService using 1C OData, with direct `restaurantId` binding on Expense records (not going through Cost Allocation).

**Out of scope (separate phases):**
- Finance Service API (Phase 4)
- Mobile app (Phase 6+)

</domain>

<decisions>
## Implementation Decisions

### iiko Nomenclature Groups
- Endpoint: `GET /nomenclature/groups` on iiko Server API (same base URL, same token)
- Response format: XML (same XMLParser already in IikoSyncService)
- Cron: daily at 03:00 alongside syncOrganizations — call `syncNomenclature()` from SchedulerService
- Mapping: group → DdsArticleGroup (upsert by iikoGroupId), article → DdsArticle (upsert by iikoArticleId)
- Orphan handling: if an expense references an articleId not in nomenclature → keep existing behavior (create bare DdsArticle without group), do NOT fail sync
- Existing pattern: IikoSyncService already has `prisma.ddsArticle.findFirst` + `prisma.ddsArticleGroup.upsert` — reuse this pattern

### Sentry Integration
- Package: `@sentry/node` (not nestjs-specific wrapper — simpler, already used pattern in NestJS)
- Init: in `apps/aggregator-worker/src/main.ts` before NestFactory.create()
- DSN: `process.env.SENTRY_DSN` (never hardcoded)
- Scope per sync: `Sentry.withScope(scope => { scope.setTag('system', 'IIKO'); scope.setContext('sync', { orgId, dateFrom, dateTo }); Sentry.captureException(error); })`
- Where to call: in the catch blocks of each sync method in IikoSyncService and OneCyncService, AFTER the existing `this.logger.error()` call
- Do NOT add Sentry to allocation service (pure business logic, no external calls)
- Performance monitoring: NO — errors only (simpler, sufficient for MVP)

### Dead Letter Pattern
- Trigger: 3 consecutive ERROR SyncLog entries for same `system` field (IIKO or ONE_C)
- Field: add `needsManualReview Boolean @default(false)` to SyncLog model in Prisma schema
- Migration: manual SQL file (no live DB) — `ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;`
- Logic: after writing ERROR to SyncLog, query last 3 SyncLog entries for same system. If all 3 are ERROR → update them all with `needsManualReview = true`
- Location: in `logSync()` private method in IikoSyncService (and analogous in OneCyncService)
- No push notification in Phase 3 — just DB flag (notification is Phase 8)

### 1C Kitchen Shipments
- Method: `syncKitchenShipmentsByRestaurant()` in OneCyncService
- 1C OData entity: `Document_RealizationOfGoodsAndServices` filtered by counterparty = restaurant
- Binding: `restaurantId` set directly on Expense record (source = ONE_C, type = KITCHEN_SHIPMENT)
- Schedule: hourly at :25 (currently :20 is iiko kitchen, :25 free)
- If restaurant not found by name/iikoId: log warning, skip record (don't fail entire sync)

### Tests
- Unit tests for all new methods: `syncNomenclature()`, `syncKitchenShipmentsByRestaurant()`
- Test the dead letter trigger (3 consecutive ERRORs → needsManualReview = true)
- Sentry: mock `@sentry/node` in tests (jest.mock)
- Run: `cd apps/aggregator-worker && npm test`

### Claude's Discretion
- Exact iiko `/nomenclature/groups` response field names (XMLParser handles it)
- Sentry release/environment tags (derive from NODE_ENV)
- SyncLog query window for dead letter check (last 3 entries regardless of time)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing implementation (read before modifying)
- `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` — all existing sync methods, circuit breaker, logSync(), XMLParser usage
- `apps/aggregator-worker/src/onec/onec-sync.service.ts` — 1C OData pattern, makeRequest(), BasicAuth
- `apps/aggregator-worker/src/scheduler/scheduler.service.ts` — all cron jobs, add new ones here
- `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts` — test patterns, mock structure

### Schema (understand before adding fields)
- `packages/database/schema.prisma` — SyncLog model, DdsArticle, DdsArticleGroup models
- `packages/database/migrations/` — existing migration files for naming convention

### Project rules
- `CLAUDE.md` — NEVER hardcode keys, use process.env.*, iiko = READ ONLY

</canonical_refs>

<specifics>
## Specific Implementation Details

### iiko Server API endpoint
```
GET {IIKO_SERVER_URL}/resto/api/v2/entities/products/group/list?includeDeleted=false
Authorization: Bearer {token}
```
Response: XML with `<groups>` array, each group has `<id>`, `<name>`, `<parentId>`

### Sentry init in main.ts (after app setup)
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
});
```

### Dead letter SQL migration
```sql
-- Migration: 20260407000001_add_synclog_needs_manual_review
ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;
```

### Prisma SyncLog schema addition
```prisma
model SyncLog {
  // ... existing fields ...
  needsManualReview Boolean @default(false)
}
```

</specifics>

<deferred>
## Deferred Ideas

- Push notification to admin when dead letter triggered (Phase 8 — FCM)
- Sentry performance tracing / transaction monitoring (post-MVP)
- Telegram Gateway OTP (explicitly skipped by user decision)
- 1C bank account balances sync (not in current phase scope)

</deferred>

---

*Phase: 03-aggregator-worker-iiko-1*
*Context gathered: 2026-04-07 via conversation discussion*
