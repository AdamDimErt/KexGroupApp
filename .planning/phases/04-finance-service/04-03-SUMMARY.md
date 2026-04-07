---
phase: 04-finance-service
plan: 03
subsystem: finance-service/dashboard
tags: [reports, dds, kitchen, trends, company-expenses]
dependency_graph:
  requires: ["04-02"]
  provides: ["DdsReportDto", "CompanyExpensesReportDto", "KitchenReportDto", "TrendsReportDto", "4 report endpoints"]
  affects: ["apps/api-gateway"]
tech_stack:
  added: []
  patterns: ["Prisma groupBy with _sum/_count", "tenant-scoped restaurant queries", "date-keyed Map merge for trends"]
key_files:
  created:
    - apps/finance-service/src/dashboard/dto/reports.dto.ts
  modified:
    - apps/finance-service/src/dashboard/dashboard.service.ts
    - apps/finance-service/src/dashboard/dashboard.controller.ts
    - apps/finance-service/src/dashboard/dashboard.service.spec.ts
decisions:
  - "Used article.group.tenantId filter for company expenses (restaurantId=null) since Expense has no direct tenantId"
  - "DDS groups use Map<restaurantId, Map<groupName, amount>> to avoid multiple queries per restaurant"
  - "Trends merges revenue and expense date rows into single Map before sorting for O(n) merge"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_changed: 4
---

# Phase 4 Plan 3: Cross-Restaurant Reports Summary

**One-liner:** Four financial report endpoints (DDS, company-expenses, kitchen, trends) using Prisma groupBy with tenant-scoped restaurant queries and Decimal-safe conversion.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create reports.dto.ts + 4 service methods | b0c0e45 | dto/reports.dto.ts, dashboard.service.ts |
| 2 | Add 4 controller routes + unit tests | 349a4b8 | dashboard.controller.ts, dashboard.service.spec.ts |

## What Was Built

### reports.dto.ts
Four DTO class trees:
- `DdsReportDto` with `DdsRestaurantRowDto` and `DdsRestaurantGroupDto`
- `CompanyExpensesReportDto` with `CompanyExpenseCategoryDto`
- `KitchenReportDto` with `KitchenPurchaseItemDto` and `KitchenShipmentRowDto`
- `TrendsReportDto` with `TrendPointDto`

### Service Methods

**getReportDds:** Queries `expense.groupBy(['restaurantId', 'articleId'])` for all tenant restaurants, fetches `ddsArticle` with group names, builds `Map<restaurantId, Map<groupName, total>>`, computes per-group share percentages and restaurant totals.

**getReportCompanyExpenses:** Queries `expense.groupBy(['articleId', 'source'])` with `restaurantId: null` and `article.group.tenantId` filter (HQ overhead). Computes share % of each category.

**getReportKitchen:** `kitchenPurchase.findMany` filtered by tenantId + date, plus `kitchenShipment.groupBy(['restaurantId'])` with `_sum.amount` and `_count.id` for item counts.

**getReportTrends:** Two parallel groupBy queries (financialSnapshot + expense by date), merged into `Map<dateStr, {revenue, expenses}>`, sorted, produces `netProfit = revenue - expenses` per point and summary averages.

### Controller Routes
```
GET /dashboard/reports/dds
GET /dashboard/reports/company-expenses
GET /dashboard/reports/kitchen
GET /dashboard/reports/trends
```
All require `x-tenant-id` header, pass `dateFrom`/`dateTo` from `DashboardQueryDto`.

### Tests
- 5 new test cases in 4 describe blocks
- Total finance-service test count: 35 (up from 30 after plan 04-02)

## Test Results
```
Test Suites: 3 passed, 3 total
Tests:       35 passed, 35 total
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing security filter] Added tenantId filter for company expenses via article relation**
- **Found during:** Task 1
- **Issue:** Expense model has no direct `tenantId` field. Filtering `restaurantId: null` alone would return expenses from all tenants.
- **Fix:** Added `article: { group: { tenantId } }` to the where clause to scope to the correct tenant via the DdsArticle → DdsArticleGroup → tenantId chain.
- **Files modified:** apps/finance-service/src/dashboard/dashboard.service.ts
- **Commit:** b0c0e45

## Self-Check: PASSED

Files exist:
- FOUND: apps/finance-service/src/dashboard/dto/reports.dto.ts
- FOUND: apps/finance-service/src/dashboard/dashboard.service.ts (modified)
- FOUND: apps/finance-service/src/dashboard/dashboard.controller.ts (modified)
- FOUND: apps/finance-service/src/dashboard/dashboard.service.spec.ts (modified)

Commits exist:
- FOUND: b0c0e45
- FOUND: 349a4b8
