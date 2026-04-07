# Phase 3: Aggregator Worker (iiko + 1C) — Research

**Researched:** 2026-04-07
**Domain:** NestJS worker — iiko Server API (XML), 1C OData (JSON), Sentry, Prisma
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**iiko Nomenclature Groups**
- Endpoint: `GET /resto/api/v2/entities/products/group/list?includeDeleted=false` on iiko Server API (same base URL, same token)
- Response format: XML (same XMLParser already in IikoSyncService)
- Cron: daily at 03:00 alongside syncOrganizations — call `syncNomenclature()` from SchedulerService
- Mapping: group → DdsArticleGroup (upsert by iikoGroupId), article → DdsArticle (upsert by iikoArticleId)
- Orphan handling: if expense references articleId not in nomenclature → keep existing behavior (bare DdsArticle without group), do NOT fail sync
- Existing pattern: IikoSyncService already has `prisma.ddsArticle.findFirst` + `prisma.ddsArticleGroup.upsert` — reuse this pattern

**Sentry Integration**
- Package: `@sentry/node` (not nestjs-specific wrapper)
- Init: in `apps/aggregator-worker/src/main.ts` before NestFactory.create()
- DSN: `process.env.SENTRY_DSN` (never hardcoded)
- Scope per sync: `Sentry.withScope(scope => { scope.setTag('system', 'IIKO'); scope.setContext('sync', { orgId, dateFrom, dateTo }); Sentry.captureException(error); })`
- Where to call: in catch blocks of each sync method in IikoSyncService and OneCyncService, AFTER the existing `this.logger.error()` call
- Do NOT add Sentry to allocation service (pure business logic, no external calls)
- Performance monitoring: NO — errors only

**Dead Letter Pattern**
- Trigger: 3 consecutive ERROR SyncLog entries for same `system` field (IIKO or ONE_C)
- Field: add `needsManualReview Boolean @default(false)` to SyncLog model in Prisma schema
- Migration: manual SQL file — `ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;`
- Logic: after writing ERROR to SyncLog, query last 3 SyncLog entries for same system. If all 3 are ERROR → update them all with `needsManualReview = true`
- Location: in `logSync()` private method in IikoSyncService (and analogous in OneCyncService)
- No push notification in Phase 3 — just DB flag

**1C Kitchen Shipments**
- Method: `syncKitchenShipmentsByRestaurant()` in OneCyncService
- 1C OData entity: `Document_RealizationOfGoodsAndServices` filtered by counterparty = restaurant
- Binding: `restaurantId` set directly on Expense record (source = ONE_C, type = KITCHEN_SHIPMENT)
- Schedule: hourly at :25 (currently :20 is iiko kitchen, :25 free)
- If restaurant not found by name/iikoId: log warning, skip record (don't fail entire sync)

**Tests**
- Unit tests for all new methods: `syncNomenclature()`, `syncKitchenShipmentsByRestaurant()`
- Test the dead letter trigger (3 consecutive ERRORs → needsManualReview = true)
- Sentry: mock `@sentry/node` in tests (jest.mock)
- Run: `cd apps/aggregator-worker && npm test`

### Claude's Discretion
- Exact iiko `/nomenclature/groups` response field names (XMLParser handles it)
- Sentry release/environment tags (derive from NODE_ENV)
- SyncLog query window for dead letter check (last 3 entries regardless of time)

### Deferred Ideas (OUT OF SCOPE)
- Push notification to admin when dead letter triggered (Phase 8 — FCM)
- Sentry performance tracing / transaction monitoring (post-MVP)
- Telegram Gateway OTP (explicitly skipped by user decision)
- 1C bank account balances sync (not in current phase scope)
</user_constraints>

---

## Summary

Phase 3 closes the final 30% of aggregator-worker implementation. The codebase is well-structured: `IikoSyncService` and `OneCyncService` share a consistent pattern — try/catch around API calls, `logSync()` for SyncLog writes, circuit breaker in `IikoSyncService`. All four gaps slot cleanly into existing patterns without architectural changes.

The primary unknowns going in were: (a) exact iiko Server API XML response structure for nomenclature groups, (b) @sentry/node integration details in plain NestJS, (c) Prisma query pattern for the dead letter check, and (d) 1C OData entity name for kitchen shipments by restaurant. All four are now resolved with sufficient detail to plan tasks.

**Primary recommendation:** Implement all four gaps in a single phase with one wave of work — schema migration first (Wave 0), then service methods (Wave 1), then scheduler wiring (Wave 2), then tests (Wave 3).

---

## Standard Stack

### Core (already installed — confirmed in package.json)
| Library | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^11.0.1 | NestJS decorators, Injectable, Logger |
| `@nestjs/schedule` | ^6.1.1 | Cron jobs via @Cron decorator |
| `@nestjs/axios` | ^4.0.1 | HTTP requests via HttpService |
| `fast-xml-parser` | ^5.5.9 | Parse iiko XML responses |
| `@prisma/client` | ^7.6.0 | DB access, SyncLog queries |
| `@nestjs/testing` | ^11.0.1 | Unit test module |
| `jest` | ^30.0.0 | Test runner |

### To Add
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@sentry/node` | 10.47.0 (current) | Error capture with context | Per CONTEXT.md decision — plain @sentry/node, not nestjs wrapper |

**Installation:**
```bash
cd apps/aggregator-worker
npm install @sentry/node
```

**Version verification:** `@sentry/node@10.47.0` confirmed as current via npm registry.

---

## Architecture Patterns

### Existing Pattern to Follow (HIGH confidence — read from source)

Every sync method in `IikoSyncService` and `OneCyncService` follows exactly this structure:

```typescript
async syncXxx(dateFrom: Date, dateTo: Date): Promise<void> {
  const startTime = Date.now();
  const tenantId = await this.getTenantId(); // IikoSyncService
  // OR: const tenantId = process.env.TENANT_ID || 'default'; // OneCyncService

  try {
    // 1. Get token / build auth
    const token = await this.iikoAuth.getAccessToken();

    // 2. Make API request (makeRequest for iiko, makeRequest for 1C)
    const xmlData = await this.makeRequest('GET', '/endpoint', token);

    // 3. Parse response
    const parsed = this.xmlParser.parse(xmlData) as Record<string, unknown>;

    // 4. Upsert records
    let processedCount = 0;
    for (const record of records) {
      await this.prisma.someModel.upsert({ ... });
      processedCount++;
    }

    // 5. Log SUCCESS
    const durationMs = Date.now() - startTime;
    await this.logSync(tenantId, 'IIKO', 'SUCCESS', processedCount, durationMs);
    this.logger.log(`✓ Synced ${processedCount} records`);
  } catch (error) {
    // 6. Log ERROR
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.logSync(tenantId, 'IIKO', 'ERROR', undefined, durationMs, errorMessage);
    this.logger.error(`✗ Failed: ${errorMessage}`);
    throw error;
  }
}
```

### iiko Server API Pattern (HIGH confidence — from source code)

- Base URL: `process.env.IIKO_SERVER_URL || 'https://kexbrands-co.iiko.it:443/resto/api'`
- Auth: token appended as query param `?key={token}` (NOT Bearer header)
- Response: XML text → `this.xmlParser.parse()` → `this.normalizeArray()` for single-vs-array safety
- Circuit breaker: `isCircuitOpen(endpointGroup)` + `recordFailure()` + `recordSuccess()` — all in `makeRequest()`
- The existing `makeRequest()` method handles circuit breaker, retry, and token injection automatically

### 1C OData Pattern (HIGH confidence — from source code)

- Base URL: `process.env.ONEC_BASE_URL`
- Auth: Basic auth via `Buffer.from('user:pass').toString('base64')` → `Authorization: Basic {auth}` header
- Response: JSON via `makeRequest()` → typed as `OneCODataResponse<T>` with `value` array
- Date filter syntax: `Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'`
- Retry: exponential backoff in `makeRequest()` (3 attempts)
- No circuit breaker in OneCyncService (only IikoSyncService has it)

### DdsArticleGroup Schema Details (HIGH confidence — from schema.prisma)

```prisma
model DdsArticleGroup {
  id        String  @id @default(uuid())
  tenantId  String
  name      String
  code      String?   // iiko group code — used as unique key
  sortOrder Int     @default(0)

  @@unique([tenantId, code])  // <- the upsert key
}

model DdsArticle {
  id             String
  groupId        String
  name           String
  code           String?   // iiko article code
  source         DataSource   // IIKO or ONE_C
  allocationType AllocationType  // DIRECT or DISTRIBUTED
  isActive       Boolean @default(true)

  @@unique([groupId, code])  // <- the upsert key
}
```

**Note:** `DdsArticleGroup` has no `iikoGroupId` field — uses `code` as the iiko identifier. `DdsArticle` has no `iikoArticleId` — uses `code`. Both existing upsert patterns in IikoSyncService already use `code`.

**Note:** `DdsArticleGroup` lacks a `tenantId_iikoGroupId` unique index — the canonical unique key is `tenantId_code`. The syncNomenclature() method must use `code` (not a separate iikoGroupId) for upserts.

### SyncLog Schema (HIGH confidence — from schema.prisma)

Current SyncLog fields:
```
id, tenantId, system (IIKO|ONE_C), status (SUCCESS|ERROR), errorMessage,
attemptCount, durationMs, recordsCount, businessDate, createdAt
```

**Missing field that MUST be added:** `needsManualReview Boolean @default(false)`

Current indexes:
- `[tenantId, createdAt]`
- `[system, status, createdAt]` — this index directly serves the dead letter query

---

## Feature Implementation Details

### 1. iiko Nomenclature Groups Sync

**Endpoint (from CONTEXT.md specifics — HIGH confidence):**
```
GET {IIKO_SERVER_URL}/resto/api/v2/entities/products/group/list?includeDeleted=false
Authorization: Bearer {token} as ?key={token} query param
Response: XML
```

**Expected XML structure (MEDIUM confidence — derived from CONTEXT.md description + iiko Server API conventions):**
```xml
<groups>
  <productGroup>
    <id>uuid-of-group</id>
    <name>Продукты питания</name>
    <parentId>uuid-or-null</parentId>
    <isDeleted>false</isDeleted>
  </productGroup>
  ...
</groups>
```

**Note on field names:** The exact XML element names (`productGroup`, `id`, `name`, `parentId`) are at MEDIUM confidence — public iiko Server API documentation is sparse. The `XMLParser` from `fast-xml-parser` handles the parsing automatically. The implementor must log the raw parsed response on first run to confirm field names. The CONTEXT.md states this is Claude's discretion.

**Mapping logic:**
```typescript
// Group → DdsArticleGroup
await this.prisma.ddsArticleGroup.upsert({
  where: { tenantId_code: { tenantId, code: group.id } }, // id as code
  update: { name: group.name },
  create: { tenantId, code: group.id, name: group.name },
});

// Article (if endpoint also returns articles) → DdsArticle
await this.prisma.ddsArticle.upsert({
  where: { groupId_code: { groupId: dbGroup.id, code: article.id } },
  update: { name: article.name },
  create: {
    groupId: dbGroup.id,
    code: article.id,
    name: article.name,
    source: 'IIKO',
    allocationType: 'DIRECT',
  },
});
```

**Open question:** Does the `/v2/entities/products/group/list` endpoint also return articles inside each group, or only group metadata? If only groups, DdsArticle population happens via the existing syncExpenses flow (which already creates bare DdsArticle records). The CONTEXT.md says "group → DdsArticleGroup, article → DdsArticle" — if no articles in response, the syncNomenclature() only handles groups. The implementor should inspect the live response.

### 2. Sentry Integration

**Package choice (HIGH confidence — verified via npm + Sentry docs):**

The CONTEXT.md locks `@sentry/node`. The official Sentry docs recommend `@sentry/nestjs` for full NestJS integration (SentryModule, automatic filter hooks), but `@sentry/node` works for our use case (errors-only, no performance tracing, no HTTP request instrumentation). Plain `@sentry/node` is simpler and sufficient.

**Key difference:** `@sentry/nestjs` requires `instrument.ts` + `SentryModule.forRoot()` in AppModule. `@sentry/node` only needs `Sentry.init()` in main.ts.

**Init pattern (from CONTEXT.md):**
```typescript
// apps/aggregator-worker/src/main.ts — BEFORE NestFactory.create()
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
  release: process.env.npm_package_version, // Claude's discretion
});
```

**Capture pattern in service catch blocks:**
```typescript
// After this.logger.error() call, in each catch block:
import * as Sentry from '@sentry/node';

Sentry.withScope((scope) => {
  scope.setTag('system', 'IIKO');        // or 'ONE_C'
  scope.setTag('method', 'syncRevenue'); // method name
  scope.setContext('sync', {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  });
  Sentry.captureException(error);
});
```

**Test mock pattern:**
```typescript
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((cb) => cb({ setTag: jest.fn(), setContext: jest.fn() })),
  captureException: jest.fn(),
}));
```

### 3. Dead Letter Pattern

**Prisma query for dead letter check (HIGH confidence — from schema.prisma + Prisma docs):**

The existing `[system, status, createdAt]` index on SyncLog makes this query efficient.

```typescript
// Inside logSync(), after writing ERROR entry:
if (status === 'ERROR') {
  const recent = await this.prisma.syncLog.findMany({
    where: { tenantId, system },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, status: true },
  });

  if (recent.length === 3 && recent.every((log) => log.status === 'ERROR')) {
    await this.prisma.syncLog.updateMany({
      where: { id: { in: recent.map((l) => l.id) } },
      data: { needsManualReview: true },
    });
    this.logger.warn(
      `Dead letter threshold reached for system=${system} — 3 consecutive ERRORs. Set needsManualReview=true on ${recent.length} entries.`
    );
  }
}
```

**Important:** The `logSync()` method currently does NOT re-throw errors (it has its own try/catch and logs the failure silently). The dead letter query must also be inside a try/catch to avoid breaking logSync() behavior.

**Migration naming convention (from existing migrations directory):**
Existing: `20260407000000_add_biometric_enabled` → new: `20260407000001_add_synclog_needs_manual_review`

```sql
-- File: packages/database/migrations/20260407000001_add_synclog_needs_manual_review/migration.sql
ALTER TABLE "finance"."SyncLog" ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false;
```

**Prisma schema addition:**
```prisma
model SyncLog {
  // ... existing fields ...
  needsManualReview Boolean @default(false)
}
```

### 4. 1C Kitchen Shipments by Restaurant

**1C OData entity (MEDIUM confidence — from CONTEXT.md + 1C OData conventions):**

The entity `Document_RealizationOfGoodsAndServices` corresponds to the 1C document "Реализация товаров и услуг" — the standard document used when the Kitchen (Цех) ships products to restaurants. The entity name follows 1C OData naming convention: `Document_{DocumentTypeName}`.

**OData query pattern (following existing OneCyncService pattern):**
```typescript
const filter = `Date ge datetime'${dateFromStr}' and Date le datetime'${dateToStr}'`;
const url = `${baseUrl}/odata/standard.odata/Document_RealizationOfGoodsAndServices` +
  `?$filter=${encodeURIComponent(filter)}` +
  `&$select=Ref_Key,Date,DocumentAmount,Description,Counterparty_Key` +
  `&$expand=Goods`;
```

**Key fields expected:**
- `Ref_Key` — document UUID (used as syncId base)
- `Date` — document date
- `DocumentAmount` — total shipment amount
- `Description` — optional comment
- `Counterparty_Key` or `Counterparty` — references the restaurant as counterparty

**Restaurant matching strategy:** The 1C counterparty name must be matched against `restaurant.name` in the DB. The Restaurant model has `oneCId String? @unique` — if populated, match by `oneCId`. If not populated (current state: likely null), match by name string comparison. If no match: log warning, skip.

**Expense creation (source = ONE_C, restaurantId = restaurant.id):**
```typescript
// syncId pattern consistent with existing:
const syncId = `onec:kitchenshipment:${record.Ref_Key}`;

await this.prisma.expense.upsert({
  where: { syncId },
  update: { amount },
  create: {
    syncId,
    articleId: kitchenShipmentArticle.id,  // dedicated DdsArticle for kitchen shipments
    restaurantId: restaurant.id,            // direct binding — NOT null
    date: shipmentDate,
    amount,
    comment: description,
    source: 'ONE_C',
  },
});
```

**Article for kitchen shipments:** Need a dedicated `DdsArticle` with code `kitchen_shipment`. Create it (or get it) with `allocationType: 'DIRECT'` and a `DdsArticleGroup` with code `kitchen`. This follows the HQ overhead pattern already in `syncExpenses()` of OneCyncService.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| XML parsing | Custom XML parser | `fast-xml-parser` — already in service, handles XML → JS objects |
| Single-vs-array XML normalization | Manual checks | `normalizeArray()` — already exists in IikoSyncService |
| HTTP retry + timeout | Custom retry loop | `makeRequest()` — already in both services with backoff |
| Circuit breaker | Custom Map logic | `isCircuitOpen()` / `recordFailure()` — already in IikoSyncService |
| Error capture with context | Custom error logging | `@sentry/node` withScope + captureException |
| Idempotent upserts | INSERT or UPDATE logic | Prisma `upsert` with `syncId` unique field |

---

## Common Pitfalls

### Pitfall 1: DdsArticleGroup upsert key uses `code`, not `iikoGroupId`
**What goes wrong:** Developer tries to upsert by `iikoGroupId` field — it doesn't exist. The unique key is `@@unique([tenantId, code])`.
**How to avoid:** Use `where: { tenantId_code: { tenantId, code: group.id } }` — treat the iiko group UUID as the `code` value.

### Pitfall 2: DdsArticle upsert fails if `code` is null
**What goes wrong:** If an article has no code, `@@unique([groupId, code])` won't work for upsert. `Prisma.AnyNull` is required for null unique fields.
**How to avoid:** Fall back to `findFirst({ where: { groupId, name } })` then `create()` if code is null. Better: always use the iiko UUID as code (never null).

### Pitfall 3: `logSync()` silently swallows errors — dead letter check must do the same
**What goes wrong:** If the dead letter `updateMany` throws (e.g., DB unavailable), it would propagate and break logSync's silent-error contract.
**How to avoid:** Wrap the dead letter block in its own try/catch, log the failure, don't rethrow.

### Pitfall 4: Sentry init before NestFactory — import order matters
**What goes wrong:** If `Sentry.init()` is called after NestFactory creates the app, some early errors are missed. Also, if SENTRY_DSN is missing and `enabled` is not set, @sentry/node may throw or print warnings.
**How to avoid:** Call `Sentry.init({ enabled: !!process.env.SENTRY_DSN, ... })` at the top of `bootstrap()` before any NestFactory calls. The `enabled: false` guard suppresses all Sentry activity when DSN is absent.

### Pitfall 5: Sentry in tests without mock — network calls fail
**What goes wrong:** Tests that exercise catch blocks will attempt real Sentry HTTP calls if @sentry/node is not mocked.
**How to avoid:** Add `jest.mock('@sentry/node', ...)` at the top of every spec file that tests error paths.

### Pitfall 6: 1C OData `Document_RealizationOfGoodsAndServices` field names may differ by 1C configuration
**What goes wrong:** The entity and field names depend on the 1C configuration. Standard OData uses transliterated Russian names (e.g., `Counterparty` might be `Kontragent` or `Counterparty_Key` depending on configuration).
**How to avoid:** Log the raw first response from the new endpoint in a dev/staging run before building full parsing logic. The pattern already in OneCyncService (parse `response.value`, cast fields) handles unknown shapes gracefully.

### Pitfall 7: Scheduler cron at :25 — verify slot is free
**What goes wrong:** Using `@Cron('25 * * * *')` might conflict with another job if the schedule changes.
**How to avoid:** Review scheduler.service.ts before adding — existing slots confirmed: :00, :05, :10, :15, :20, :45. Slot :25 is free.

---

## Code Examples

### Sentry init in main.ts
```typescript
// Source: CONTEXT.md specifics + @sentry/node 10.x API
import * as Sentry from '@sentry/node';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    enabled: !!process.env.SENTRY_DSN,
  });

  const app = await NestFactory.create(AppModule);
  // ...
}
```

### Dead letter check in logSync()
```typescript
// Source: project pattern + Prisma findMany/updateMany
private async logSync(
  tenantId: string,
  system: 'IIKO' | 'ONE_C',
  status: 'SUCCESS' | 'ERROR',
  recordsCount?: number,
  durationMs?: number,
  errorMessage?: string,
) {
  try {
    await this.prisma.syncLog.create({
      data: { tenantId, system, status, recordsCount, durationMs, errorMessage, businessDate: new Date() },
    });

    // Dead letter check
    if (status === 'ERROR') {
      try {
        const recent = await this.prisma.syncLog.findMany({
          where: { tenantId, system },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, status: true },
        });
        if (recent.length === 3 && recent.every((l) => l.status === 'ERROR')) {
          await this.prisma.syncLog.updateMany({
            where: { id: { in: recent.map((l) => l.id) } },
            data: { needsManualReview: true },
          });
          this.logger.warn(`Dead letter: 3 consecutive ERRORs for system=${system}`);
        }
      } catch (dlError) {
        this.logger.error(`Dead letter check failed: ${dlError instanceof Error ? dlError.message : String(dlError)}`);
      }
    }
  } catch (error) {
    this.logger.error(`Failed to log sync: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### Cron registration for nomenclature sync (daily 03:00)
```typescript
// Source: scheduler.service.ts existing pattern
@Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })
async syncNomenclature() {
  try {
    this.logger.log('Starting nomenclature sync...');
    await this.iikoSync.syncNomenclature();
  } catch (error) {
    this.logger.error(`Nomenclature sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### Test pattern for dead letter (Jest)
```typescript
// Source: existing spec pattern + jest mock
it('should set needsManualReview after 3 consecutive errors', async () => {
  const recentErrors = [
    { id: '1', status: 'ERROR' },
    { id: '2', status: 'ERROR' },
    { id: '3', status: 'ERROR' },
  ];
  (prisma.syncLog.create as jest.Mock).mockResolvedValue({});
  (prisma.syncLog.findMany as jest.Mock).mockResolvedValue(recentErrors);
  (prisma.syncLog.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

  // Call logSync with ERROR (via private method exposure or via a public method that fails)
  // Pattern: trigger an error in a public method with mocked HTTP failure
  (iikoAuth.getAccessToken as jest.Mock).mockRejectedValue(new Error('Auth failed'));
  (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([{ id: 'r1', iikoId: 'i1', name: 'Test' }]);

  await service.syncRevenue(new Date(), new Date()).catch(() => {});

  expect(prisma.syncLog.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ data: { needsManualReview: true } }),
  );
});
```

---

## Validation Architecture

Config check: `.planning/config.json` has `workflow.nyquist_validation` absent (treated as enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest ^30.0.0 |
| Config file | `apps/aggregator-worker/package.json` (jest key) |
| Quick run command | `cd apps/aggregator-worker && npm test` |
| Full suite command | `cd apps/aggregator-worker && npm test -- --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AGG-01 | `syncNomenclature()` populates DdsArticleGroup + DdsArticle | unit | `npm test -- --testNamePattern="syncNomenclature"` | No — Wave 0 |
| AGG-02 | Sentry `captureException` called in catch blocks | unit | `npm test -- --testNamePattern="sentry"` | No — Wave 0 |
| AGG-03 | Dead letter: 3 consecutive ERROR → needsManualReview=true | unit | `npm test -- --testNamePattern="dead letter"` | No — Wave 0 |
| AGG-04 | `syncKitchenShipmentsByRestaurant()` creates Expense with restaurantId | unit | `npm test -- --testNamePattern="kitchen shipments by restaurant"` | No — Wave 0 |
| AGG-05 | Dead letter does NOT trigger on mixed ERROR/SUCCESS | unit | `npm test -- --testNamePattern="dead letter"` | No — Wave 0 |
| AGG-06 | Kitchen shipment skips record when restaurant not found | unit | `npm test -- --testNamePattern="restaurant not found"` | No — Wave 0 |
| AGG-07 | Sentry NOT called on SUCCESS | unit | `npm test -- --testNamePattern="sentry"` | No — Wave 0 |
| AGG-08 | Scheduler registers syncNomenclature at 03:00 | unit | `npm test -- --testNamePattern="scheduler"` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/aggregator-worker && npm test`
- **Per wave merge:** `cd apps/aggregator-worker && npm test -- --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts` — add tests for AGG-01, AGG-02, AGG-03, AGG-05, AGG-07, AGG-08 (file exists — extend it)
- [ ] `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` — create this file for AGG-04, AGG-06 (file does NOT exist)
- [ ] `apps/aggregator-worker/package.json` — add `@sentry/node` to dependencies (via npm install)
- [ ] `packages/database/migrations/20260407000001_add_synclog_needs_manual_review/migration.sql` — must exist before service code references `needsManualReview`

---

## Open Questions

1. **Exact XML field names from `/v2/entities/products/group/list`**
   - What we know: endpoint URL from CONTEXT.md, `fast-xml-parser` handles parsing, `normalizeArray()` handles single vs array
   - What's unclear: actual XML element names — `productGroup` or `group`? `id` or `groupId`? `parentId` or `parent`?
   - Recommendation: Add a temporary `this.logger.debug(JSON.stringify(parsed))` on first call in dev. Document actual field names before writing full mapping logic. The XMLParser will not fail on unknown field names.

2. **Does `/v2/entities/products/group/list` return articles inside groups?**
   - What we know: CONTEXT.md says "article → DdsArticle (upsert by iikoArticleId)" but existing syncExpenses() already creates bare DdsArticle records per product
   - What's unclear: whether the nomenclature endpoint returns article details alongside groups
   - Recommendation: If no articles in response, `syncNomenclature()` handles groups only; existing syncExpenses() flow already covers DdsArticle creation. This is acceptable per CONTEXT.md orphan handling rule.

3. **1C `Counterparty_Key` vs `Counterparty` field name**
   - What we know: 1C OData names depend on configuration. `Document_RealizationOfGoodsAndServices` is the standard entity.
   - What's unclear: exact field name for counterparty reference in this specific 1C configuration
   - Recommendation: Log raw response on first run. Match by either name string or guid. The Restaurant.oneCId field exists but is likely null — name matching as fallback is required.

---

## Sources

### Primary (HIGH confidence)
- `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` — full source read, all patterns confirmed
- `apps/aggregator-worker/src/onec/onec-sync.service.ts` — full source read, OData pattern confirmed
- `apps/aggregator-worker/src/scheduler/scheduler.service.ts` — full source read, cron slots confirmed
- `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts` — test pattern confirmed
- `packages/database/schema.prisma` — full schema read, SyncLog + DdsArticle + DdsArticleGroup confirmed
- `apps/aggregator-worker/package.json` — dependency versions confirmed
- `.planning/phases/03-aggregator-worker-iiko-1/03-CONTEXT.md` — locked decisions, specifics
- npm registry — `@sentry/node@10.47.0` confirmed as current version

### Secondary (MEDIUM confidence)
- [Sentry NestJS docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/) — @sentry/node vs @sentry/nestjs distinction, Sentry.withScope pattern
- IIKOCLOUD_QUICK_REFERENCE.md in project — nomenclature endpoint structure (NOTE: this file references iiko Cloud API, not Server API; XML structure differs)
- 1C OData conventions — `Document_RealizationOfGoodsAndServices` entity name matches standard 1C document type naming

### Tertiary (LOW confidence — needs live verification)
- iiko Server API `/v2/entities/products/group/list` XML field names — public docs absent, inferred from CONTEXT.md description + iiko naming conventions. MUST verify against live endpoint.
- 1C OData field name for counterparty in kitchen shipment documents — configuration-dependent, MUST verify against live 1C instance.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed from package.json, @sentry/node version from npm
- Architecture: HIGH — read directly from source code, all patterns verified
- iiko nomenclature endpoint URL: HIGH (from CONTEXT.md) / XML field names: MEDIUM (unverified)
- Dead letter Prisma query: HIGH — schema confirmed, query pattern straightforward
- 1C kitchen shipments entity: MEDIUM — entity name from CONTEXT.md, field names need live verification
- Pitfalls: HIGH — derived from reading actual source code

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable dependencies; iiko/1C API may change)
