# 11-01 SQL Verification — BUG-11-1 Kopeck Hypothesis

**Date:** 2026-04-20
**DB:** postgresql://root:root@127.0.0.1:5434/dashboard
**Schema:** finance

## Query Run

```sql
SELECT r."name", fs."date", fs."revenue", fs."directExpenses",
       fs."directExpenses"::float8 / NULLIF(fs."revenue"::float8, 0) AS ratio
FROM "finance"."FinancialSnapshot" fs
JOIN "finance"."Restaurant" r ON r.id = fs."restaurantId"
WHERE fs."revenue" > 0
ORDER BY fs."date" DESC
LIMIT 10;
```

## Raw Result

```
      name       |    date    |  revenue   | directExpenses |        ratio
-----------------+------------+------------+----------------+---------------------
 SB Сайран       | 2026-04-20 |  221052.20 |       60799.66 |  0.2750466179481589
 DNA Стадион     | 2026-04-20 |  855191.89 |      187552.59 |  0.2193105339200539
 DNA Гагарина    | 2026-04-20 |  866852.71 |      326209.86 | 0.37631521045830263
 SB Тастак       | 2026-04-20 |  224128.34 |       80243.05 | 0.35802277391605186
 DNA Жангельдина | 2026-04-20 | 1107070.17 |      256742.57 | 0.23191174051776683
 SB Бесагаш      | 2026-04-20 |  335015.18 |      162572.58 | 0.48526929436451205
 SB Максима      | 2026-04-20 |  216102.00 |       65019.33 |  0.3008733375905822
 SB Атакент      | 2026-04-20 |  354635.18 |       85322.56 |  0.2405924871864094
 SB Абая-Правды  | 2026-04-20 |  280490.98 |       75785.61 | 0.27018911624181285
 JD Тастак       | 2026-04-20 |  573792.57 |      136195.33 |  0.2373598703099275
```

## Aggregate Check

```sql
SELECT MIN(...), MAX(...), AVG(ratio), COUNT(*) FROM finance."FinancialSnapshot" WHERE revenue > 0;
```

Result: min=0, max=0.497, avg=0.015, row_count=10326

## Analysis

- `directExpenses / revenue` ratios range from 0% to 49.7%
- Average ratio: 1.5% (many rows have zero directExpenses)
- All values are economically normal tenge amounts (e.g. revenue 221,052 tenge, expenses 60,799 tenge)
- No ratio approaches 70 (which would indicate kopeck storage: expenses stored as 100x)
- `FinancialSnapshot` table has NO `financialResult` column — financialResult is computed in service code as `revenue - directExpenses`

## DECISION: REJECTED

The kopeck-storage hypothesis is REJECTED. `FinancialSnapshot.directExpenses` is stored in **tenge** (not kopecks). Ratios are 22–49% which is normal restaurant expense margin.

**Task 3 (EXPENSE_UNIT_DIVISOR fix) will NOT be implemented.**

The 7000% margin reported in the bug description is likely caused by a different issue — possibly allocated HQ expenses being added on top, or the margin being computed differently in the UI. This requires separate investigation outside plan 11-01.
