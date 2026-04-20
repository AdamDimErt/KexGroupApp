# 11-05 API SAMPLE — Dashboard Summary Raw JSON

**Captured:** 2026-04-20 18:58 Asia/Almaty
**Endpoint:** GET /api/finance/dashboard?periodType=today&dateFrom=2026-04-20&dateTo=2026-04-20
**Auth:** Dev OTP bypass (phone +77074408018, code 111111, role OWNER)

## Response status

HTTP 200 OK

## Raw JSON

```json
{
    "tenantId": "d57657ca-14de-4baa-882b-722597601bec",
    "period": {
        "type": "today",
        "from": "2026-04-20",
        "to": "2026-04-20"
    },
    "totalRevenue": 94946894.82999998,
    "totalExpenses": 29447027.27,
    "financialResult": 65499867.55999999,
    "brands": [
        {
            "id": "b9f55842-bb54-4711-bae6-81e533d2ac5e",
            "name": "Burger na Abaya",
            "slug": "bna",
            "revenue": 29275133.009999998,
            "expenses": 8641338.97,
            "financialResult": 20633794.04,
            "changePercent": 0,
            "restaurantCount": 9
        },
        {
            "id": "96ab1fb8-6814-4dee-8669-aa5134cf908b",
            "name": "Doner na Abaya",
            "slug": "dna",
            "revenue": 42832748.93,
            "expenses": 13572533.700000001,
            "financialResult": 29260215.229999997,
            "changePercent": 0,
            "restaurantCount": 29
        },
        {
            "id": "3d1f7e05-cb70-4307-a785-320626cc5ea1",
            "name": "Just Doner",
            "slug": "jd",
            "revenue": 2008778.5500000003,
            "expenses": 604726.11,
            "financialResult": 1404052.4400000004,
            "changePercent": 0,
            "restaurantCount": 2
        },
        {
            "id": "0ee656c3-5562-4205-9be9-5a8cdd91fdc8",
            "name": "Salam Bro",
            "slug": "sb",
            "revenue": 20542632.519999996,
            "expenses": 6528724.009999999,
            "financialResult": 14013908.509999998,
            "changePercent": 0,
            "restaurantCount": 34
        },
        {
            "id": "75392a40-93a2-4348-9750-fa46e127f75f",
            "name": "КексБрэндс",
            "slug": "kex-brands",
            "revenue": 287601.82,
            "expenses": 99704.48,
            "financialResult": 187897.34000000003,
            "changePercent": 0,
            "restaurantCount": 1
        }
    ],
    "lastSyncAt": "2026-04-17T13:30:30.804Z",
    "lastSyncStatus": "success"
}
```

## Extracted per-brand snapshot

| Brand name      | brands[].revenue | brands[].expenses | brands[].financialResult | ratio (fr/rev) | expected marginPct (fr/rev × 100) | observed marginPct on screen |
|-----------------|----------------:|-----------------:|-------------------------:|---------------:|----------------------------------:|-----------------------------:|
| Burger na Abaya |  29,275,133.01  |   8,641,338.97  |         20,633,794.04   |     0.7048     |                             70.48 |                         7048 |
| Doner na Abaya  |  42,832,748.93  |  13,572,533.70  |         29,260,215.23   |     0.6831     |                             68.31 |                         6831 |
| Just Doner      |   2,008,778.55  |     604,726.11  |          1,404,052.44   |     0.6990     |                             69.90 |                         6990 |
| Salam Bro       |  20,542,632.52  |   6,528,724.01  |         14,013,908.51   |     0.6822     |                             68.22 |                         6822 |
| КексБрэндс      |     287,601.82  |      99,704.48  |            187,897.34   |     0.6533     |                             65.33 |                         6533 |

## Top-level values

- `totalRevenue`: 94,946,894.83
- `totalExpenses`: 29,447,027.27
- `financialResult`: 65,499,867.56

## Observations

1. **financialResult = revenue - expenses arithmetic check:**
   - BNA: 29,275,133.01 - 8,641,338.97 = 20,633,794.04 ✓ matches API
   - The API returns the correct subtraction in tenge (not kopecks, not pre-multiplied)

2. **Field names present in API JSON:**
   `tenantId, period, totalRevenue, totalExpenses, financialResult, brands, lastSyncAt, lastSyncStatus`
   Per-brand keys: `id, name, slug, revenue, expenses, financialResult, changePercent, restaurantCount`
   - Field `financialResult` is present with exact name match to `BrandIndicatorDto.financialResult`

3. **Unit diagnosis:**
   - `fr/rev` ratio = 0.65–0.70 across all brands (tenge units — normal margin)
   - Screen shows `marginPct × 100` (70.48 × 100 = 7048) NOT `marginPct` (70.48)
   - The API value is **CORRECT**; `computeMarginPct(revenue, financialResult)` returns **70.48** (correct)
   - The bug is in the **render layer**: `formatMargin(v)` in RestaurantCard.tsx (line 51) does `Math.round(v * 100)%` instead of `Math.round(v)%`
   - This double-multiplies by 100: 70.48 → 7048

4. **Confirmed: no mismatch in field names** — H3 (classic field mismatch) is partially confirmed but the mismatch is not a field NAME issue. It is a unit-contract mismatch: `formatMargin` expects a 0-1 ratio but receives a 0-100 percentage.

## Blockers

None — all services were running. Auth succeeded (role=OWNER, token length=275).
