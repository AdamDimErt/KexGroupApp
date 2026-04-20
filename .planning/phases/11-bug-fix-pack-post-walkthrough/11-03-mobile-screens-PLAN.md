---
phase: 11-bug-fix-pack-post-walkthrough
plan: 03
type: execute
wave: 2
depends_on: ["11-00"]
files_modified:
  - apps/mobile-dashboard/src/screens/ReportsScreen.tsx
autonomous: true
requirements: [BUG-11-7]
must_haves:
  truths:
    - "OWNER role sees DDS section in ReportsScreen (section with title 'ДДС — Движение денег' or similar)"
    - "FINANCE_DIRECTOR sees DDS section"
    - "OPERATIONS_DIRECTOR does NOT see DDS section"
  artifacts:
    - path: "apps/mobile-dashboard/src/screens/ReportsScreen.tsx"
      provides: "DDS report section rendered for OWNER/FIN_DIRECTOR roles"
      contains: "useReportDds"
  key_links:
    - from: "apps/mobile-dashboard/src/screens/ReportsScreen.tsx"
      to: "apps/mobile-dashboard/src/hooks/useReports.ts useReportDds"
      via: "import + call in ReportsScreen"
      pattern: "useReportDds"
---

<objective>
Restore the missing DDS section on ReportsScreen for OWNER + FINANCE_DIRECTOR roles. Walkthrough revealed only 3 of 4 report sections visible for OWNER — DDS was silently removed in some past refactor.

Purpose: Mobile-only fix. The second half of BUG-11-7 (dev OTP bypass returning OWNER role) is handled in separate plan `11-03b-auth-dev-bypass-PLAN.md` owned by auth-agent per CLAUDE.md module boundaries (`apps/auth-service/` → auth-agent only).

Output: `ReportsScreen.tsx` with 4-section layout (DDS, Company, Kitchen, Trends). Visual manual check via emulator walkthrough.

Boundary note: this plan DOES NOT touch `apps/auth-service/`. The dev-bypass role fix lives in `11-03b-auth-dev-bypass-PLAN.md`.
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
@apps/mobile-dashboard/src/screens/ReportsScreen.tsx
@apps/mobile-dashboard/src/hooks/useReports.ts

<interfaces>
<!-- Relevant existing hook (already complete — just unused by ReportsScreen) -->

apps/mobile-dashboard/src/hooks/useReports.ts EXPORTS:
```typescript
export function useReportDds(enabled = true): {
  data: ReportDdsDto | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isStale: boolean;
  isOffline: boolean;
  cachedAt: number | null;
};
```

ReportDdsDto (inferred from consistent hook shape — verify apps/mobile-dashboard/src/types/index.ts):
- likely has `items[]: { categoryName, amount, source }` or similar
- Executor must read types/index.ts to confirm exact fields

Current ReportsScreen.tsx role check pattern (line 29):
```typescript
const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add DDS section to ReportsScreen.tsx for OWNER/FINANCE_DIRECTOR/ADMIN</name>
  <files>apps/mobile-dashboard/src/screens/ReportsScreen.tsx</files>
  <read_first>
    - apps/mobile-dashboard/src/screens/ReportsScreen.tsx full file (confirm 3 sections: Company/Kitchen/Trends; DDS is absent)
    - apps/mobile-dashboard/src/hooks/useReports.ts (confirm `useReportDds` exists and returns ReportDdsDto)
    - apps/mobile-dashboard/src/types/index.ts (look for `ReportDdsDto` definition — need field names for render)
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-RESEARCH.md § "DDS Section Restoration Pattern (BUG-11-7)" lines 367-394
    - .planning/phases/11-bug-fix-pack-post-walkthrough/11-CONTEXT.md § "BUG-11-7"
    - apps/mobile-dashboard/src/screens/ReportsScreen.styles.ts (verify `styles.reportCard`, `styles.reportTitle`, `styles.reportTotal`, `styles.reportRow`, `styles.reportLabel`, `styles.reportValue`, `styles.reportBadge` all exist — if yes, reuse them for consistency)
  </read_first>
  <action>
    In `apps/mobile-dashboard/src/screens/ReportsScreen.tsx`:

    Step 1: Update the hook import line (line 8) to include `useReportDds`:

    FROM:
    ```typescript
    import { useReportCompanyExpenses, useReportKitchen, useReportTrends } from '../hooks/useReports';
    ```

    TO:
    ```typescript
    import {
      useReportCompanyExpenses,
      useReportKitchen,
      useReportTrends,
      useReportDds,
    } from '../hooks/useReports';
    ```

    Step 2: Add `canSeeDds` role gate AFTER the existing `canSeeCompany` line (line 29):

    FROM:
    ```typescript
    const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
    ```

    TO:
    ```typescript
    const canSeeCompany = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
    // BUG-11-7: DDS visible to same roles as Company Expenses (OWNER/FIN_DIR/ADMIN)
    const canSeeDds = role === 'OWNER' || role === 'FINANCE_DIRECTOR' || role === 'ADMIN';
    ```

    Step 3: Add `useReportDds` hook call AFTER the other hook calls (around line 31-34):

    FROM:
    ```typescript
    const company = useReportCompanyExpenses(canSeeCompany);
    const kitchen = useReportKitchen();
    const trends = useReportTrends();
    ```

    TO:
    ```typescript
    const dds = useReportDds(canSeeDds);
    const company = useReportCompanyExpenses(canSeeCompany);
    const kitchen = useReportKitchen();
    const trends = useReportTrends();
    ```

    Step 4: Update `activeSections` array (line 43) to include DDS when enabled:

    FROM:
    ```typescript
    const activeSections = [kitchen, trends, ...(canSeeCompany ? [company] : [])];
    ```

    TO:
    ```typescript
    const activeSections = [
      kitchen,
      trends,
      ...(canSeeCompany ? [company] : []),
      ...(canSeeDds ? [dds] : []),
    ];
    ```

    Step 5: Update `refetchAll` (lines 49-54) to refetch DDS when visible:

    FROM:
    ```typescript
    const refetchAll = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (canSeeCompany) company.refetch();
      kitchen.refetch();
      trends.refetch();
    };
    ```

    TO:
    ```typescript
    const refetchAll = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (canSeeDds) dds.refetch();
      if (canSeeCompany) company.refetch();
      kitchen.refetch();
      trends.refetch();
    };
    ```

    Step 6: Add the DDS JSX section BEFORE the Company Expenses section (so display order is DDS → Company → Kitchen → Trends). Insert right after `<PeriodSelector marginTop={12} />` (line 69) and BEFORE `{canSeeCompany && (` (line 72):

    ```typescript
    {/* DDS - Движение Денежных Средств -- OWNER + FINANCE_DIRECTOR only (BUG-11-7) */}
    {canSeeDds && (
      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>ДДС — Движение денег</Text>
        {dds.isLoading ? (
          <ActivityIndicator size="small" color={colors.accentDefault} />
        ) : dds.error ? (
          <Text style={styles.reportError}>{dds.error}</Text>
        ) : (dds.data?.restaurants ?? []).length === 0 ? (
          <EmptyState message="Нет данных за выбранный период" />
        ) : (
          <>
            <Text style={styles.reportTotal}>
              Итого по всем точкам: {fmtAmount(dds.data?.grandTotal ?? 0)}
            </Text>
            {(dds.data?.restaurants ?? []).map((rest) => (
              <View key={rest.restaurantId} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  {rest.restaurantName}
                </Text>
                {(rest.rows ?? []).map((row, idx) => (
                  <View key={`${rest.restaurantId}-${idx}`} style={styles.reportRow}>
                    <Text style={styles.reportLabel}>{row.groupName ?? row.articleName ?? '—'}</Text>
                    <Text style={styles.reportValue}>{fmtAmount(row.amount ?? 0)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </View>
    )}
    ```

    IMPORTANT: The exact DTO field names may differ — executor MUST read `apps/mobile-dashboard/src/types/index.ts` for `ReportDdsDto` shape FIRST. If shape is:
    - `{ grandTotal, restaurants: [{ restaurantId, restaurantName, rows: [{ groupName, amount }] }] }` — use above code verbatim.
    - `{ grandTotal, items: [{ articleId, articleName, amount, source }] }` — simpler form, use this pattern instead:
      ```typescript
      {(dds.data?.items ?? []).map(item => (
        <View key={item.articleId} style={styles.reportRow}>
          <Text style={styles.reportLabel}>{item.articleName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.reportValue}>{fmtAmount(item.amount)}</Text>
            {item.source && <Text style={styles.reportBadge}>{item.source === 'IIKO' ? 'iiko' : '1С'}</Text>}
          </View>
        </View>
      ))}
      ```
    - If neither shape matches, read `apps/finance-service/src/dashboard/dto/reports.dto.ts` DdsReportDto → map its structure.

    Adapt the JSX to match actual DTO fields. The outer `{canSeeDds && ...}` wrapper + loading/error/empty pattern stays the same regardless.

    Do NOT change existing sections. Do NOT reorder Kitchen/Trends.

    Do NOT touch `apps/auth-service/` — that's plan `11-03b`'s scope (auth-agent only per CLAUDE.md).

    WHY:
    - DDS above Company matches the ROADMAP's report-section ordering.
    - Loading/error/empty tri-state mirrors existing `company` section pattern → UX consistency.
    - canSeeDds role set matches the `@Roles` decorator in api-gateway (verified in earlier plans 04-03/05-01).
  </action>
  <verify>
    <automated>cd apps/mobile-dashboard && npx tsc --noEmit && grep -q "useReportDds" apps/mobile-dashboard/src/screens/ReportsScreen.tsx && grep -q "ДДС" apps/mobile-dashboard/src/screens/ReportsScreen.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `apps/mobile-dashboard/src/screens/ReportsScreen.tsx` contains exact string `useReportDds` (import + hook call)
    - File contains exact string `canSeeDds`
    - File contains exact string `ДДС — Движение денег` OR `ДДС`
    - File contains exact string `dds.isLoading`
    - File contains exact string `dds.refetch()` within refetchAll
    - `cd apps/mobile-dashboard && npx tsc --noEmit` exits 0
    - Section count when rendering as OWNER: 4 (visual check via emulator or grep count of `{(canSee|canSeeCompany|canSeeDds)` gated sections + always-on Kitchen + Trends)
    - `files_modified` frontmatter includes ONLY mobile files (no `apps/auth-service/*`)
  </acceptance_criteria>
  <done>ReportsScreen has 4 sections for OWNER/FIN_DIR; role gate identical to other OWNER+FIN sections; tsc clean. Auth-service untouched.</done>
</task>

</tasks>

<verification>
After Task 1 completes:

1. `cd apps/mobile-dashboard && npm test && npx tsc --noEmit` — green
2. `grep "ДДС" apps/mobile-dashboard/src/screens/ReportsScreen.tsx` — has matches
3. `git status apps/auth-service/` — ZERO files changed (module boundary respected)
4. Manual emulator walkthrough:
   - Log in via dev OTP `111111` on `+77074408018` (after 11-03b ensures OWNER role)
   - Navigate to "Аналитика" tab
   - Expect 4 section cards: ДДС / Затраты компании / Цех / Тренды (in that visual order)
</verification>

<success_criteria>
- BUG-11-7 mobile half fixed: DDS section JSX restored for OWNER/FIN_DIR
- OWNER role sees 4 sections on ReportsScreen
- No regression in FINANCE_DIRECTOR or OPERATIONS_DIRECTOR role-gating (FIN_DIR sees 4, OPS_DIR sees 2)
- `apps/auth-service/` files NOT modified by this plan (module boundary)
</success_criteria>

<output>
After completion, create `.planning/phases/11-bug-fix-pack-post-walkthrough/11-03-SUMMARY.md`. Cross-reference with `11-03b-SUMMARY.md` for full BUG-11-7 closure status.
</output>
