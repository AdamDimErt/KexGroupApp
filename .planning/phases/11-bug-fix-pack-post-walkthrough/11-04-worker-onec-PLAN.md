---
phase: 11-bug-fix-pack-post-walkthrough
plan: 04
type: execute
wave: 3
depends_on: ["11-00", "11-01"]
files_modified:
  - apps/aggregator-worker/src/onec/onec-sync.service.ts
  - apps/aggregator-worker/src/onec/onec-sync.service.spec.ts
  - apps/aggregator-worker/src/iiko/iiko-sync.service.ts
  - apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts
autonomous: false
requirements: [BUG-11-3, BUG-11-8]
must_haves:
  truths:
    - "syncExpenses skips records that throw during upsert and logs a warn per skip"
    - "syncKitchenPurchases and syncKitchenIncome apply the same per-record try/catch"
    - "Sentry captures one message per skipped record with tag system=ONE_C and recordRefKey extra"
    - "iiko-sync upsert on Brand sets type='KITCHEN' when name matches /цех|kitchen|fabrika/i"
    - "iiko-sync upsert on Brand sets type='RESTAURANT' for all other names"
  artifacts:
    - path: "apps/aggregator-worker/src/onec/onec-sync.service.ts"
      provides: "Per-record try/catch in syncExpenses, syncKitchenPurchases, syncKitchenIncome"
      contains: "recordRefKey"
    - path: "apps/aggregator-worker/src/iiko/iiko-sync.service.ts"
      provides: "Brand.type determined by name regex on upsert"
      contains: "determineBrandType"
  key_links:
    - from: "apps/aggregator-worker/src/onec/onec-sync.service.ts"
      to: "@sentry/node withScope"
      via: "per-record warning + captureMessage"
      pattern: "Sentry\\.withScope"
    - from: "apps/aggregator-worker/src/iiko/iiko-sync.service.ts"
      to: "packages/database/schema.prisma BrandType"
      via: "prisma.brand.upsert passes type field"
      pattern: "type:\\s*determineBrandType"
---

<objective>
Worker-side fixes for Phase 11: (1) Per-record try/catch in 1C syncs so one bad OData record doesn't abort the whole sync — restoring data flow into Reports → Company Expenses + Kitchen Purchases/Shipments/Income. (2) iiko Brand upsert writes correct `type` (RESTAURANT vs KITCHEN) so finance-service filter (Plan 01) works for newly-synced brands too, not just backfilled ones.

Purpose: `autonomous: false` because this plan requires user verification that `.env` has actual 1C credentials (`ONEC_BASE_URL`/`USER`/`PASSWORD`) before runtime testing is meaningful. The code fixes are independently deployable; the credential check is a human-only step.

Output: Resilient onec-sync (never aborts mid-sync) + iiko-sync that populates Brand.type from day one. Reports/Company/Kitchen sections get non-empty data once creds configured.
</objective>

<execution_context>
@D:/kexgroupapp/.claude/get-shit-done/workflows/execute-plan.md
@D:/kexgroupapp/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md
@.planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md
@.planning/phases/11-00-wave0-prereqs-PLAN.md
@.planning/phases/11-01-backend-finance-PLAN.md
@apps/aggregator-worker/src/onec/onec-sync.service.ts
@apps/aggregator-worker/src/iiko/iiko-sync.service.ts

<interfaces>
<!-- Existing signatures the executor extends -->

apps/aggregator-worker/src/onec/onec-sync.service.ts class methods:
```typescript
class OneCyncService {
  async syncExpenses(dateFrom: Date, dateTo: Date): Promise<void>            // line 58
  async syncKitchenPurchases(dateFrom: Date, dateTo: Date): Promise<void>    // line 171
  async syncKitchenIncome(dateFrom: Date, dateTo: Date): Promise<void>       // line 270
}
```
Each method has an OUTER try/catch that swallows the whole loop on first error. The fix: add INNER try/catch inside each for-loop body (bug_021 pattern).

Env var reads (lines 63-72, 176-184, 275-283, 361-369 — ALL 4 methods):
```typescript
const baseUrl = process.env.ONEC_BASE_URL;  // required
const username = process.env.ONEC_USER;     // required
const password = process.env.ONEC_PASSWORD; // required
```

apps/aggregator-worker/src/iiko/iiko-sync.service.ts brand upsert (line 181):
```typescript
await this.prisma.brand.upsert({
  where: { iikoGroupId: brand.id },
  update: { name: brand.name, isActive: true },
  create: {
    iikoGroupId: brand.id,
    name: brand.name,
    slug: this.slugify(brand.name),
    companyId: (await this.getOrCreateCompany(tenantId, brand.name)).id,
    isActive: true,
  },
});
```
Missing: `type: BrandType` in both update and create payloads.

Reference commit for pattern `787777b fix(worker): dedupe CostAllocation rows to one-per-day (bug_021)` — inspect via:
```bash
git show --stat 787777b
```
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: Checkpoint — verify 1C credentials in .env before runtime testing</name>
  <files>.env (user's local file, NOT tracked)</files>
  <read_first>
    - .env.example lines 40-49 (env var template — note ONEC_BASE_URL, ONEC_USER, ONEC_PASSWORD canonical names)
    - apps/aggregator-worker/src/onec/onec-sync.service.ts lines 63-71 (env reads)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Open Questions" Q3 (credentials availability)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-8"
    - .planning/phases/11-00-wave0-prereqs-PLAN.md Task 4 (env.example documentation)
  </read_first>
  <action>
    Claude CANNOT read or modify `.env` (project policy — CLAUDE.md "NEVER edit: .env, .env.*").

    This checkpoint exists to collect a user signal about credential availability BEFORE Tasks 2 and 3 do code changes. Code fixes proceed regardless of the signal — the signal only changes the SUMMARY narrative (e.g. "creds missing — 1C integration dormant" vs "creds present — integration should flow after deploy").

    User must:
    1. Open `.env` locally.
    2. Confirm three keys are set to REAL values (not `CHANGE_ME`):
       - `ONEC_BASE_URL=https://your-1c-server`
       - `ONEC_USER=...`
       - `ONEC_PASSWORD=...`
    3. Confirm `TENANT_ID=` is set (UUID from Postgres `auth.Tenant` table).

    Reply:
    - `approved` → all three (plus TENANT_ID) set to real values
    - `missing-credentials` → one or more are blank/CHANGE_ME (code still proceeds)
  </action>
  <verify>
    <automated>echo "MANUAL — user signal via resume-signal response"</automated>
  </verify>
  <done>User has responded with `approved` or `missing-credentials`. Either unblocks Tasks 2 and 3.</done>
  <acceptance_criteria>
    - User has sent a resume-signal response
    - Response text contains either "approved" or "missing-credentials" literal
    - Either way, Tasks 2 and 3 may proceed (checkpoint is advisory, not gating code)
  </acceptance_criteria>
  <what-built>Wave 3 prerequisites from user — credential availability check.</what-built>
  <how-to-verify>
    Claude cannot access `.env` (project policy — CLAUDE.md forbids editing/reading). User must:

    1. Open `.env` locally (your copy, not committed to repo).
    2. Confirm these three keys are set to REAL values (not CHANGE_ME):
       - `ONEC_BASE_URL=https://...`  (your 1C server base URL)
       - `ONEC_USER=...`  (1C OData username)
       - `ONEC_PASSWORD=...`  (1C OData password)
    3. Confirm `TENANT_ID=` is set to the UUID of your Tenant row in Postgres.

    If all 4 are set → reply `approved` and Claude will proceed with code fixes.

    If ANY are blank/CHANGE_ME → reply `missing-credentials` and Claude will still proceed with code (resilience patch is beneficial either way), but note in SUMMARY that 1C integration will continue returning ₸0 until credentials are provided.

    Either way: code fix happens. The checkpoint is purely informational for the user.
  </how-to-verify>
  <resume-signal>Type `approved` (creds present) or `missing-credentials` (creds absent — code still proceeds).</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add per-record try/catch to syncExpenses, syncKitchenPurchases, syncKitchenIncome</name>
  <files>apps/aggregator-worker/src/onec/onec-sync.service.ts, apps/aggregator-worker/src/onec/onec-sync.service.spec.ts</files>
  <read_first>
    - apps/aggregator-worker/src/onec/onec-sync.service.ts FULL file — need to see all 3 for-loops exactly
    - apps/aggregator-worker/src/onec/onec-sync.service.spec.ts (Wave 0 skeleton added describe BUG-11-8; fill those stubs now)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Per-Record try/catch Pattern (BUG-11-8 — bug_021 pattern)" lines 340-363
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-8"
    - git show --stat 787777b (bug_021 reference commit for the pattern)
    - apps/aggregator-worker/src/alert/alert.service.ts (existing Sentry.withScope usage in worker as reference)
  </read_first>
  <behavior>
    - Test: given 3 records (good, bad, good) — syncExpenses processes good-1 and good-2, skips bad-1 with warn log, does NOT throw
    - Test: for each skipped record, Sentry.withScope is called with tag `system='ONE_C'` and extra `recordRefKey` = the record's Ref_Key
    - Test: syncLog at end records SUCCESS status with processedCount=2 (not ERROR), even though one record was bad
    - Same behavior for syncKitchenPurchases and syncKitchenIncome
    - Existing success-path tests still pass (no regression)
  </behavior>
  <action>
    **Part A — `syncExpenses` (around line 89-149):**

    Find the for-loop starting `for (const record of expenseRecords) {` inside the outer `try { ... } catch { ... }` block. Wrap the LOOP BODY in an inner try/catch:

    FROM:
    ```typescript
    for (const record of expenseRecords) {
      const amount = parseFloat(record.Amount) || 0;
      const expenseDate = new Date(record.Date);
      const description = record.Description ?? 'Unknown';
      const syncId = `onec:expense:${record.Ref_Key}`;

      // Get or create article for HQ expenses
      let article = await this.prisma.ddsArticle.findFirst({ where: { code: 'hq_overhead' } });
      if (!article) {
        // ... create article ...
      }

      // ... upsert Expense ...
      processedCount++;
    }
    ```

    TO:
    ```typescript
    for (const record of expenseRecords) {
      try {
        const amount = parseFloat(record.Amount) || 0;
        const expenseDate = new Date(record.Date);
        const description = record.Description ?? 'Unknown';
        const syncId = `onec:expense:${record.Ref_Key}`;

        // Get or create article for HQ expenses
        let article = await this.prisma.ddsArticle.findFirst({ where: { code: 'hq_overhead' } });
        if (!article) {
          // ... create article ...
        }

        // ... upsert Expense ...
        processedCount++;
      } catch (recordErr) {
        // BUG-11-8 · bug_021 pattern: one bad record must not abort the whole sync
        const errMsg = recordErr instanceof Error ? recordErr.message : String(recordErr);
        this.logger.warn(
          `Skipping 1C expense record ${record.Ref_Key}: ${errMsg}`,
        );
        Sentry.withScope((scope) => {
          scope.setTag('system', 'ONE_C');
          scope.setTag('method', 'syncExpenses');
          scope.setExtra('recordRefKey', record.Ref_Key);
          scope.setExtra('recordDate', record.Date);
          scope.captureMessage(`Skipped 1C expense record: ${errMsg}`, 'warning');
        });
      }
    }
    ```

    **Part B — `syncKitchenPurchases` (around line 171-258):**

    Same pattern. Find the for-loop body inside the outer try, wrap in inner try/catch. Use tag `method: 'syncKitchenPurchases'` instead. Log message: `Skipping 1C kitchen purchase record ${record.Ref_Key}: ${errMsg}`.

    **Part C — `syncKitchenIncome` (around line 270-344):**

    Same pattern. Tag `method: 'syncKitchenIncome'`. Log message: `Skipping 1C kitchen income record ${record.Ref_Key}: ${errMsg}`.

    **Part D — Also check `syncKitchenShipmentsByRestaurant` method** (if it has similar loop). Apply same pattern if found.

    **Part E — Finalize tests in onec-sync.service.spec.ts:**

    Replace the 3 RED stubs from Wave 0 (`expect(true).toBe(false)`) with real assertions. Example for the first test:

    ```typescript
    it('skips one bad record and continues processing remaining good records', async () => {
      const records: OneCExpenseRecord[] = [
        { Ref_Key: 'good-1', Amount: '100.00', Date: '2026-04-20', Description: 'Rent' },
        { Ref_Key: 'bad-1',  Amount: 'NaN',    Date: 'invalid',    Description: 'Broken' },
        { Ref_Key: 'good-2', Amount: '200.00', Date: '2026-04-20', Description: 'IT' },
      ];

      // Mock HTTP response
      mockHttpGet.mockResolvedValue({ value: records });

      // Mock Prisma: bad-1 throws on upsert, others succeed
      let upsertCallCount = 0;
      prismaMock.expense.upsert.mockImplementation((args: any) => {
        upsertCallCount++;
        if (args.where.syncId === 'onec:expense:bad-1') {
          throw new Error('Invalid date format');
        }
        return Promise.resolve({ id: `e-${upsertCallCount}` });
      });

      await expect(
        service.syncExpenses(new Date('2026-04-20'), new Date('2026-04-20')),
      ).resolves.toBeUndefined();  // does NOT throw

      // All 3 upsert attempts were made
      expect(prismaMock.expense.upsert).toHaveBeenCalledTimes(3);
      // Warning logged for bad-1
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('bad-1'),
      );
    });

    it('logs warning + Sentry.captureMessage for each skipped record (not throw)', async () => {
      const records: OneCExpenseRecord[] = [
        { Ref_Key: 'bad-1', Amount: 'NaN', Date: 'invalid' },
      ];
      mockHttpGet.mockResolvedValue({ value: records });
      prismaMock.expense.upsert.mockRejectedValue(new Error('db error'));

      await service.syncExpenses(new Date('2026-04-20'), new Date('2026-04-20'));

      expect(sentryMock.withScope).toHaveBeenCalledTimes(1);
      expect(sentryMock.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Skipped 1C expense record'),
        'warning',
      );
    });

    it('tagged with system=ONE_C and recordRefKey in Sentry scope', async () => {
      const records: OneCExpenseRecord[] = [
        { Ref_Key: 'bad-1', Amount: 'NaN', Date: 'invalid' },
      ];
      mockHttpGet.mockResolvedValue({ value: records });
      prismaMock.expense.upsert.mockRejectedValue(new Error('db error'));

      const scopeMock = { setTag: jest.fn(), setExtra: jest.fn(), captureMessage: jest.fn() };
      sentryMock.withScope.mockImplementation((fn: any) => fn(scopeMock));

      await service.syncExpenses(new Date('2026-04-20'), new Date('2026-04-20'));

      expect(scopeMock.setTag).toHaveBeenCalledWith('system', 'ONE_C');
      expect(scopeMock.setExtra).toHaveBeenCalledWith('recordRefKey', 'bad-1');
    });
    ```

    Actual mock setup depends on existing spec structure — read the whole file, adapt to its patterns (e.g. if it uses `createTestingModule`, use that; if HttpService is mocked via `makeRequest` spy, use that). DO NOT re-architect the spec — just fill the 3 stubs.

    WHY:
    - Inner try/catch per record matches bug_021 commit pattern (`787777b`).
    - Each skipped record is visible (logger.warn + Sentry) so we don't hide problems — just don't kill the sync.
    - `system='ONE_C'` tag mirrors 1C-specific filter in Sentry dashboard.
    - processedCount still increments only on SUCCESS path → metrics honest.

    Do NOT change the OUTER try/catch. It handles structural failures (auth, network) separately from record-level failures.
  </action>
  <verify>
    <automated>cd apps/aggregator-worker && npm test -- --testPathPattern=onec</automated>
  </verify>
  <acceptance_criteria>
    - `apps/aggregator-worker/src/onec/onec-sync.service.ts` contains exact string `recordRefKey` (Sentry extra)
    - File contains at least 3 inner try/catch blocks (one per method: syncExpenses, syncKitchenPurchases, syncKitchenIncome) — verify by grepping `catch (recordErr)` and expecting count ≥ 3
    - File contains exact string `BUG-11-8`
    - File contains exact string `Skipping 1C`
    - `apps/aggregator-worker/src/onec/onec-sync.service.spec.ts` no longer contains `expect(true).toBe(false)` in the BUG-11-8 describe block
    - All 3 BUG-11-8 describe tests pass
    - `cd apps/aggregator-worker && npm test` exits 0 (all tests green)
    - `cd apps/aggregator-worker && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>All 3 1C sync methods are resilient to per-record failures; tests cover the skip + log + Sentry scope path.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Populate Brand.type in iiko-sync.service.ts on upsert (BUG-11-3 worker half)</name>
  <files>apps/aggregator-worker/src/iiko/iiko-sync.service.ts, apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts</files>
  <read_first>
    - apps/aggregator-worker/src/iiko/iiko-sync.service.ts lines 145-250 (brand upsert loop inside syncStructure method)
    - apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts (existing test patterns for syncStructure)
    - packages/database/schema.prisma Brand model (after Wave 0 Task 3 — now has `type: BrandType @default(RESTAURANT)` field)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Worker Brand Upsert with Type (BUG-11-3)" lines 502-530
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-3" (LOCKED: aggregator-worker sets type by regex)
    - .planning/phases/11-00-wave0-prereqs-PLAN.md Task 3 (migration SQL regex must match worker regex)
  </read_first>
  <behavior>
    - Test: given iiko returns brand with name='Цех', upsert called with create.type='KITCHEN' and update.type='KITCHEN'
    - Test: given iiko returns brand with name='Burger na Abaya', upsert called with create.type='RESTAURANT'
    - Test: given brand with name 'fabrika-central', upsert called with type='KITCHEN' (regex matches fabrika)
    - Test: given brand with name containing 'Kitchen' English variant, upsert called with type='KITCHEN'
  </behavior>
  <action>
    In `apps/aggregator-worker/src/iiko/iiko-sync.service.ts`:

    Step 1: Add a private helper method to the class (place near top of class, after constructor):

    ```typescript
    /**
     * Determine Brand.type from iiko brand name.
     * MUST match the regex in packages/database/migrations/20260420000000_add_brand_type/migration.sql
     * so backfilled data + newly-synced data are consistent.
     */
    private determineBrandType(name: string): 'RESTAURANT' | 'KITCHEN' | 'MARKETPLACE' {
      if (/цех|kitchen|fabrika/i.test(name)) return 'KITCHEN';
      return 'RESTAURANT';
    }
    ```

    Step 2: Locate the brand upsert block (line 181). Add `type` to BOTH `update` and `create`:

    FROM:
    ```typescript
    await this.prisma.brand.upsert({
      where: { iikoGroupId: brand.id },
      update: {
        name: brand.name,
        isActive: true,
      },
      create: {
        iikoGroupId: brand.id,
        name: brand.name,
        slug: this.slugify(brand.name),
        companyId: (await this.getOrCreateCompany(tenantId, brand.name)).id,
        isActive: true,
      },
    });
    ```

    TO:
    ```typescript
    const brandType = this.determineBrandType(brand.name);
    await this.prisma.brand.upsert({
      where: { iikoGroupId: brand.id },
      update: {
        name: brand.name,
        isActive: true,
        type: brandType,              // BUG-11-3: populate type on every sync
      },
      create: {
        iikoGroupId: brand.id,
        name: brand.name,
        slug: this.slugify(brand.name),
        companyId: (await this.getOrCreateCompany(tenantId, brand.name)).id,
        isActive: true,
        type: brandType,              // BUG-11-3
      },
    });
    ```

    Step 3: Add unit tests to `iiko-sync.service.spec.ts`:

    ```typescript
    describe('BUG-11-3: Brand.type populated on sync', () => {
      it('sets type=KITCHEN for brand named "Цех"', () => {
        // determineBrandType is private; test via upsert side-effect
        // If private access not possible, spy on prisma.brand.upsert and assert args
        const svc = service as any;
        expect(svc.determineBrandType('Цех')).toBe('KITCHEN');
      });

      it('sets type=KITCHEN for "fabrika-central"', () => {
        const svc = service as any;
        expect(svc.determineBrandType('fabrika-central')).toBe('KITCHEN');
      });

      it('sets type=KITCHEN for "Kitchen Main"', () => {
        const svc = service as any;
        expect(svc.determineBrandType('Kitchen Main')).toBe('KITCHEN');
      });

      it('sets type=RESTAURANT for "Burger na Abaya"', () => {
        const svc = service as any;
        expect(svc.determineBrandType('Burger na Abaya')).toBe('RESTAURANT');
      });

      it('sets type=RESTAURANT for "Just Doner"', () => {
        const svc = service as any;
        expect(svc.determineBrandType('Just Doner')).toBe('RESTAURANT');
      });

      it('passes type in prisma.brand.upsert create and update', async () => {
        // Setup mock iiko response with one brand
        const mockXml = '<corporateItemDtoes><corporateItemDto><id>b1</id><name>Цех</name><type>ORGDEVELOPMENT</type></corporateItemDto></corporateItemDtoes>';
        // ... mock makeRequest to return mockXml ...
        // ... mock xmlParser.parse to return { corporateItemDtoes: { corporateItemDto: [{ id: 'b1', name: 'Цех', type: 'ORGDEVELOPMENT' }] } } ...

        prismaMock.brand.upsert.mockResolvedValue({ id: 'b1' } as any);

        await service.syncStructure('tenant-1');

        expect(prismaMock.brand.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({ type: 'KITCHEN' }),
            create: expect.objectContaining({ type: 'KITCHEN' }),
          }),
        );
      });
    });
    ```

    The last test may require existing mock setup patterns — read the spec file and adapt.

    WHY:
    - Helper method isolates the regex from the upsert call → testable without heavy mock setup.
    - Regex `/цех|kitchen|fabrika/i` exactly matches migration SQL regex (`~* 'цех|kitchen|fabrika'`) — data consistency between backfill + new writes.
    - `type` in BOTH update and create paths → re-syncing an existing brand corrects its type if it was wrong before (important for any KITCHEN brands that existed before this fix).
    - No MARKETPLACE brands yet, but the enum value is there → future-proofed.

    Do NOT import `BrandType` from `@prisma/client` if it causes circular issues — string literal `'KITCHEN'` / `'RESTAURANT'` is fine since Prisma client accepts string-literal unions for enum fields.

    Do NOT change other parts of `syncStructure` (restaurant loop, company creation, etc.).
  </action>
  <verify>
    <automated>cd apps/aggregator-worker && npm test -- --testPathPattern=iiko-sync</automated>
  </verify>
  <acceptance_criteria>
    - `apps/aggregator-worker/src/iiko/iiko-sync.service.ts` contains exact string `determineBrandType`
    - File contains exact string `/цех|kitchen|fabrika/i`
    - `prisma.brand.upsert` call inside syncStructure passes `type: brandType` in BOTH `update` and `create` (grep count of `type: brandType` ≥ 2)
    - `apps/aggregator-worker/src/iiko/iiko-sync.service.spec.ts` contains string `BUG-11-3`
    - Tests "sets type=KITCHEN for ..." and "sets type=RESTAURANT for ..." pass
    - `cd apps/aggregator-worker && npm test` exits 0
    - `cd apps/aggregator-worker && npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Newly-synced brands get correct type field; regex matches migration backfill regex for consistency.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Checkpoint — end-to-end manual verification of Wave 3 on emulator</name>
  <files>apps/aggregator-worker/src/ (all), packages/database/migrations/20260420000000_add_brand_type/migration.sql</files>
  <read_first>
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-VALIDATION.md § "Manual-Only Verifications"
    - apps/aggregator-worker/src/onec/onec-sync.service.ts (post-Task-2 state)
    - apps/aggregator-worker/src/iiko/iiko-sync.service.ts (post-Task-3 state)
    - packages/database/migrations/20260420000000_add_brand_type/migration.sql (Wave 0 output)
  </read_first>
  <action>
    This is a human-verification checkpoint after Tasks 2 and 3 are committed. User runs the commands below and reports results.

    Steps (user performs):

    1. Apply Wave 0 migration to local DB (if not yet applied):
       ```bash
       psql $POSTGRES_URL -f packages/database/migrations/20260420000000_add_brand_type/migration.sql
       ```

    2. Restart aggregator-worker:
       ```bash
       cd apps/aggregator-worker && npm run dev
       ```

    3. Trigger iiko structure sync manually (once):
       ```bash
       curl -X POST http://localhost:3004/sync/iiko-structure
       ```

    4. Query Brand table to verify type population:
       ```sql
       SELECT name, type FROM "finance"."Brand" ORDER BY name;
       ```
       Expected: `Цех` → `KITCHEN`; `Burger na Abaya`, `Doner na Abaya`, `Just Doner`, `Salam Bro`, `КексБрэндс` → `RESTAURANT`.

    5. (If 1C creds present) wait up to 60 min for first 1C cron, then:
       ```sql
       SELECT source, status, "processedCount", error, "createdAt"
       FROM "finance"."SyncLog"
       WHERE source = 'ONE_C'
       ORDER BY "createdAt" DESC LIMIT 5;
       ```
       Expected: at least 1 row with `status='SUCCESS'` and `processedCount > 0`.

    6. Launch mobile app, log in as OWNER:
       - Dashboard: 5 brand tiles (no Цех), margins ~68%, point count ≤ 13.
       - Reports tab: 4 sections (ДДС / Затраты компании / Цех / Тренды).
       - "Затраты компании" has real numbers (not "Нет данных") if creds were present.

    Claude does NOT perform these steps — the user runs them and reports results.
  </action>
  <verify>
    <automated>echo "MANUAL — user runs steps and reports findings"</automated>
  </verify>
  <done>User has verified end-to-end flow and reported `approved` or specific failure details.</done>
  <acceptance_criteria>
    - User has sent a resume-signal response
    - If `approved`, Wave 3 is complete
    - If failure reported, Claude debugs based on paste output (new task created if needed)
  </acceptance_criteria>
  <what-built>Wave 3 complete — per-record resilience in 1C sync + Brand.type populated on iiko sync.</what-built>
  <how-to-verify>
    1. Code verification (Claude can do):
       - `cd apps/aggregator-worker && npm test` → all green
       - `cd apps/aggregator-worker && npx tsc --noEmit` → 0 errors

    2. Manual runtime verification (requires live infra — user does):
       a. If `.env` has real `ONEC_BASE_URL/USER/PASSWORD` → start worker: `cd apps/aggregator-worker && npm run dev`. Wait up to 60 minutes (cron interval). Check `SyncLog` table:
          ```sql
          SELECT source, status, processedCount, error, createdAt
          FROM "finance"."SyncLog"
          WHERE source = 'ONE_C' ORDER BY createdAt DESC LIMIT 5;
          ```
          Expect: at least one row with status='SUCCESS' and processedCount > 0.

       b. Trigger iiko structure sync manually:
          ```bash
          curl -X POST http://localhost:3004/sync/iiko-structure
          ```
          Then query Brand table:
          ```sql
          SELECT name, type FROM "finance"."Brand" ORDER BY name;
          ```
          Expect: Цех row has type='KITCHEN'; BNA/DNA rows have type='RESTAURANT'.

       c. Apply migration SQL to DB (if not yet applied):
          ```bash
          psql $POSTGRES_URL -f packages/database/migrations/20260420000000_add_brand_type/migration.sql
          ```

    3. End-to-end dashboard check:
       - Launch mobile app, log in as OWNER.
       - Dashboard: 5 brand tiles (no Kitchen), margins ~68% (not 7000%), correct restaurant count.
       - Reports: 4 sections populated — Затраты компании has data (not ₸0), Цех has Покупки/Отгрузки/Доход > ₸0.

    If any of (a), (b), or end-to-end fails → reply with specific error details (SyncLog error, SQL result, screenshot). Claude can debug based on findings.

    If all pass → reply `approved`.
  </how-to-verify>
  <resume-signal>Type `approved` if all checks pass, or paste error output for debugging.</resume-signal>
</task>

</tasks>

<verification>
After Tasks 2 and 3 complete (checkpoint tasks are manual):

1. `cd apps/aggregator-worker && npm test` — all tests green (onec + iiko-sync + alert + existing)
2. `cd apps/aggregator-worker && npx tsc --noEmit` — 0 errors
3. `grep -c "BUG-11-" apps/aggregator-worker/src/onec/onec-sync.service.ts` ≥ 1
4. `grep -c "BUG-11-" apps/aggregator-worker/src/iiko/iiko-sync.service.ts` ≥ 1
5. Migration SQL consistency check:
   ```bash
   grep "цех|kitchen|fabrika" packages/database/migrations/20260420000000_add_brand_type/migration.sql
   grep "цех|kitchen|fabrika" apps/aggregator-worker/src/iiko/iiko-sync.service.ts
   ```
   Both should match.
</verification>

<success_criteria>
- BUG-11-8 fixed: 1C sync resilient to per-record failures; warnings logged to Sentry; syncLog records SUCCESS even when some records were skipped
- BUG-11-3 worker half fixed: newly-synced brands have correct type; matches migration backfill regex for existing rows
- User has verified (via checkpoint) that 1C credentials exist; if missing, documented in SUMMARY
- After migration applied + creds set: Reports page shows non-zero Company Expenses + Kitchen Purchases/Shipments/Income
- Dashboard only shows RESTAURANT brands (Kitchen filtered server-side by Plan 01)
</success_criteria>

<output>
After completion, create `.planning/phases/11-bug-fix-pack-post-walkthrough/11-04-SUMMARY.md` including:
- Test results for both Task 2 and Task 3
- Credential status (approved / missing-credentials from checkpoint 1)
- Manual verification results (from checkpoint 4)
- Any deferred items (e.g. if creds missing, note "1C integration dormant until credentials provided")
</output>
