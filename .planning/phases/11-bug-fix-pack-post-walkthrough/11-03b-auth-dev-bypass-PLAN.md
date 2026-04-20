---
phase: 11-bug-fix-pack-post-walkthrough
plan: 03b
type: execute
wave: 2
depends_on: ["11-00"]
owner: auth-agent
files_modified:
  - apps/auth-service/src/auth/auth.service.ts
  - apps/auth-service/src/auth/auth.service.spec.ts
autonomous: true
requirements: [BUG-11-7]
must_haves:
  truths:
    - "Dev OTP bypass (DEV_BYPASS_CODE=111111 with DEV_BYPASS_PHONES) returns JWT with role='OWNER'"
    - "Verification happens ONLY when NODE_ENV !== 'production' AND phone is in DEV_BYPASS_PHONES list"
    - "Unit test confirms OWNER role in bypass response for +77074408018"
  artifacts:
    - path: "apps/auth-service/src/auth/auth.service.ts"
      provides: "Dev bypass returns OWNER role in dev/test environments"
      contains: "OWNER"
    - path: "apps/auth-service/src/auth/auth.service.spec.ts"
      provides: "Regression test for OWNER role on dev bypass"
      contains: "BUG-11-7"
  key_links:
    - from: "apps/auth-service/src/auth/auth.service.ts"
      to: "JWT payload role field"
      via: "dev bypass creates user with role=OWNER"
      pattern: "role:\\s*['\\\"]OWNER"
---

<objective>
Ensure the dev OTP bypass path (`DEV_BYPASS_CODE=111111` + `DEV_BYPASS_PHONES=+77074408018,...`) returns a JWT with `role='OWNER'` so developers can see all OWNER-gated UI (Dashboard KPIs, Reports sections including DDS) without going through the real Telegram/Mobizon OTP flow.

Purpose: Walkthrough revealed that after dev bypass, OWNER-gated Report sections were missing. Root-cause may be either (a) bypass assigns a non-OWNER role, or (b) bypass looks up a seeded User whose role is not OWNER. Either way, the end state must be deterministic: dev bypass → OWNER role.

Output: auth.service.ts dev-bypass branch verifiably produces JWT with `role: 'OWNER'` in dev mode + passing regression test.

Owner: **auth-agent** — this plan is carved out of the original `11-03` (mobile) per CLAUDE.md module boundaries: `apps/auth-service/` is owned exclusively by auth-agent. mobile-agent does not touch auth-service.

Complements: `11-03-mobile-screens-PLAN.md` restores the DDS JSX section visible to OWNER. Together they close BUG-11-7.
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
@apps/auth-service/src/auth/auth.service.ts
@.env.example

<interfaces>
<!-- auth-service dev bypass interfaces -->

Env vars (documented in .env.example):
```
DEV_BYPASS_PHONES=+77074408018,+77000000001
DEV_BYPASS_CODE=111111
```

packages/database/schema.prisma Role enum (lines 14-22):
```prisma
enum Role {
  OWNER
  FINANCE_DIRECTOR
  OPERATIONS_DIRECTOR
  ADMIN

  @@schema("auth")
}
```

User's personal phone from MEMORY: `+77074408018` (stored in user_phone.md). This phone MUST produce OWNER role after bypass.

The auth-service dev bypass lives somewhere in `apps/auth-service/src/auth/auth.service.ts` — likely in `verifyOtp()` or equivalent. The executor (auth-agent) reads the file first to determine actual control flow; three scenarios are possible (see Action).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Verify and fix dev OTP bypass returns OWNER role</name>
  <files>apps/auth-service/src/auth/auth.service.ts, apps/auth-service/src/auth/auth.service.spec.ts</files>
  <read_first>
    - apps/auth-service/src/auth/auth.service.ts full file (locate the dev bypass path — it reads DEV_BYPASS_CODE and DEV_BYPASS_PHONES env vars)
    - apps/auth-service/src/auth/auth.service.spec.ts (inspect existing tests for dev bypass pattern, if any)
    - .env.example lines 16-17 (DEV_BYPASS_PHONES=+77074408018,+77000000001 and DEV_BYPASS_CODE=111111)
    - packages/database/schema.prisma lines 14-22 (Role enum — OWNER is valid)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "Open Questions" Q2 (dev bypass role)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-7"
    - C:\Users\Acer\.claude\projects\D--kexgroupapp\memory\user_phone.md (user phone +77074408018 matches one of DEV_BYPASS_PHONES)
    - CLAUDE.md § "Module Boundaries" (auth-agent owns apps/auth-service/ — this plan is in bounds)
  </read_first>
  <behavior>
    - Test: when NODE_ENV='development' AND phone='+77074408018' AND code='111111' → verifyOtp returns object whose role field is 'OWNER'
    - Test: when NODE_ENV='production' AND phone='+77074408018' AND code='111111' → bypass path does NOT engage (normal OTP flow runs)
    - Test: when NODE_ENV='development' AND phone NOT in DEV_BYPASS_PHONES → bypass path does NOT engage
    - Test: regression — existing tests for non-bypass OTP flow still pass (no changes to production path)
  </behavior>
  <action>
    Step 1: Read `apps/auth-service/src/auth/auth.service.ts` fully. Locate the dev bypass branch. Search for:
    - `DEV_BYPASS_CODE`
    - `DEV_BYPASS_PHONES`
    - `111111`

    The bypass likely fits one of three scenarios:

    **Scenario A — bypass returns hardcoded object with non-OWNER role:**
    ```typescript
    // Example buggy code:
    const mockUser = { id: '...', phone, role: 'OPERATIONS_DIRECTOR', ... };
    ```
    Fix: change literal to `role: 'OWNER'`.

    **Scenario B — bypass looks up User by phone, role comes from DB:**
    ```typescript
    const user = await this.prisma.user.findUnique({ where: { phone } });
    ```
    Fix: add a safety-net override in the bypass branch (dev-mode only):

    ```typescript
    const isDev = process.env.NODE_ENV !== 'production';
    const bypassPhones = (process.env.DEV_BYPASS_PHONES ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (isDev && bypassPhones.includes(phone) && user && user.role !== 'OWNER') {
      this.logger.warn(`Dev bypass overriding role ${user.role} → OWNER for ${phone}`);
      user = { ...user, role: 'OWNER' };
    }
    ```

    ALSO write a migration SQL file (since `prisma migrate dev` is not used per project decision [02-00]):
    `packages/database/migrations/20260420000001_owner_bypass_seed/migration.sql`

    ```sql
    -- BUG-11-7: dev bypass phones must map to OWNER role for dev walkthrough
    -- Safe no-op if users already have role=OWNER
    UPDATE "auth"."User"
    SET "role" = 'OWNER'
    WHERE "phone" IN ('+77074408018', '+77000000001');
    ```

    **Scenario C — bypass already returns OWNER:**
    No code fix needed. Add a comment `// BUG-11-7: verified OWNER role on 2026-04-20` near the bypass branch to prevent regression, and still add the regression test in Step 3.

    Whichever scenario applies, the END STATE must be: bypass produces JWT with `role: 'OWNER'` in dev mode for phones in DEV_BYPASS_PHONES.

    Step 2: If Scenario A or B, make the code change. Preserve all production-path logic unchanged.

    Step 3: Add regression test to `auth.service.spec.ts`:

    ```typescript
    describe('BUG-11-7: dev bypass role', () => {
      const originalEnv = { ...process.env };

      beforeEach(() => {
        process.env.DEV_BYPASS_PHONES = '+77074408018,+77000000001';
        process.env.DEV_BYPASS_CODE = '111111';
        process.env.NODE_ENV = 'development';
      });

      afterEach(() => {
        process.env = { ...originalEnv };
      });

      it('returns OWNER role when bypass code used with listed phone', async () => {
        const result = await service.verifyOtp({ phone: '+77074408018', code: '111111' });
        // Extract role from result shape (may be result.user.role, result.role, or decoded JWT)
        const role = (result as any).user?.role ?? (result as any).role;
        expect(role).toBe('OWNER');
      });

      it('does NOT engage bypass in production even for listed phone', async () => {
        process.env.NODE_ENV = 'production';
        // In production, bypass should delegate to real OTP verification
        // which should reject code '111111' unless it matches a real OTP
        await expect(
          service.verifyOtp({ phone: '+77074408018', code: '111111' }),
        ).rejects.toThrow(); // or whatever the real flow throws on invalid OTP
      });

      it('does NOT engage bypass for phone NOT in DEV_BYPASS_PHONES', async () => {
        // Phone not in bypass list — should run normal OTP flow
        await expect(
          service.verifyOtp({ phone: '+77999999999', code: '111111' }),
        ).rejects.toThrow();
      });
    });
    ```

    Adjust `expect` assertions to match the actual return shape of `verifyOtp` (result.user, result.role, or JWT decode via `jwt.decode`). If `verifyOtp` returns a JWT string, decode it and check payload.

    Step 4: Before committing, verify boundary:
    - `files_modified` frontmatter MUST include ONLY `apps/auth-service/src/auth/auth.service.ts` and `apps/auth-service/src/auth/auth.service.spec.ts` (plus migration SQL if Scenario B applied).
    - NO modifications to `apps/mobile-dashboard/`, `apps/finance-service/`, `apps/aggregator-worker/`, `apps/api-gateway/`.
    - Run `git status` before commit to verify.

    IMPORTANT — DO NOT:
    - Hardcode phone numbers in code (always read from env).
    - Remove or alter production auth flow (only the dev bypass branch).
    - Modify `.env` (only `.env.example` was modified in Wave 0; do not re-touch).
    - Touch mobile-dashboard / finance-service / aggregator-worker files (owned by other agents).

    If the investigation reveals Scenario C (bypass already returns OWNER), document that finding in the SUMMARY: the original walkthrough bug may have been a user-session artifact (stale JWT in emulator, or wrong OTP entered). Still commit the regression test.
  </action>
  <verify>
    <automated>cd apps/auth-service && npm test -- --testPathPattern=auth</automated>
  </verify>
  <acceptance_criteria>
    - `apps/auth-service/src/auth/auth.service.ts` dev bypass branch produces JWT/user with `role: 'OWNER'` when `NODE_ENV !== 'production'` AND phone in DEV_BYPASS_PHONES
    - `apps/auth-service/src/auth/auth.service.spec.ts` contains string `BUG-11-7`
    - Test "returns OWNER role when bypass code used with listed phone" passes
    - Test "does NOT engage bypass in production" passes (guards against prod leak)
    - `cd apps/auth-service && npm test` exits 0 (no regression in existing tests)
    - `cd apps/auth-service && npx tsc --noEmit` exits 0
    - (If Scenario B applies) `packages/database/migrations/20260420000001_owner_bypass_seed/migration.sql` exists with UPDATE statement
    - `git status` before commit shows ZERO files changed outside `apps/auth-service/` and (optionally) `packages/database/migrations/20260420000001_*/` (module boundary respected)
  </acceptance_criteria>
  <done>Dev bypass reliably returns OWNER role in dev mode; production path unchanged; regression test in place; module boundary respected.</done>
</task>

</tasks>

<verification>
After Task 1 completes:

1. `cd apps/auth-service && npm test && npx tsc --noEmit` — green
2. `git status apps/mobile-dashboard/ apps/finance-service/ apps/aggregator-worker/ apps/api-gateway/` — ZERO files changed (module boundaries respected)
3. Manual emulator walkthrough (after 11-03 mobile fix is also deployed):
   - Log in via dev OTP `111111` on `+77074408018`
   - Verify role in auth state (React DevTools or console log) = `'OWNER'`
   - ReportsScreen: 4 sections visible (DDS + Затраты компании + Цех + Тренды)
</verification>

<success_criteria>
- BUG-11-7 auth half fixed: dev bypass verifiably returns OWNER role
- Production auth path unchanged (no leak, no regression)
- Dev onboarding experience: fresh install + OTP `111111` = full OWNER JWT
- auth-agent module boundary respected (no touches outside apps/auth-service/)
- Regression test guards against future drift
</success_criteria>

<output>
After completion, create `.planning/phases/11-bug-fix-pack-post-walkthrough/11-03b-SUMMARY.md` including:
- Which scenario applied (A / B / C)
- Whether migration SQL was written
- Test results
- Cross-reference to `11-03-SUMMARY.md` for the mobile DDS render half
</output>
