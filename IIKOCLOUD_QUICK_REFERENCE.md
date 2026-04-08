# iikoCloud API Quick Reference

## Base URL
```
https://api-ru.iiko.services/api/1/
```

## Authentication
```bash
# Get token
curl -X POST https://api-ru.iiko.services/api/1/access_token \
  -H "Content-Type: application/json" \
  -d '{"apiLogin":"YOUR_API_LOGIN"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}

# Use token in headers
Authorization: Bearer {token}
```

---

## MVP Endpoints (Copy-Paste)

### 1. Get Organizations
```bash
GET /organizations?ReturnAdditionalInfo=true

Response:
{
  "organizations": [
    {
      "id": "uuid",
      "name": "TOO Burger na Abaya",
      "address": "...",
      "latitude": 51.1234,
      "longitude": 71.5678,
      "currencyCode": "KZT"
    }
  ]
}
```

### 2. Get Payment Types
```bash
GET /payment_types?organizationId=uuid

Response:
{
  "paymentTypes": [
    { "id": "uuid", "name": "Наличные", "alias": "cash" },
    { "id": "uuid", "name": "Карта", "alias": "card" },
    { "id": "uuid", "name": "Kaspi", "alias": "kaspi" },
    { "id": "uuid", "name": "Halyk", "alias": "halyk" },
    { "id": "uuid", "name": "Яндекс", "alias": "yandex" }
  ]
}
```

### 3. Get Revenue (OLAP Report)
```bash
POST /reports/olap

Body:
{
  "organizationIds": ["uuid1", "uuid2"],
  "reportType": "SALES",
  "dateFrom": "2026-03-27",
  "dateTo": "2026-03-27",
  "rowGroupFields": ["restaurantId", "paymentType"],
  "aggregateFields": ["revenue"],
  "filters": {}
}

Response:
{
  "reportData": [
    {
      "restaurantId": "uuid",
      "paymentType": "cash",
      "revenue": 125000.00
    },
    {
      "restaurantId": "uuid",
      "paymentType": "card",
      "revenue": 87500.50
    }
  ]
}
```

### 4. Get DDS Expenses
```bash
POST /reports/expenses

Body:
{
  "organizationIds": ["uuid"],
  "restaurantIds": ["uuid"],
  "dateFrom": "2026-03-27",
  "dateTo": "2026-03-27",
  "groupBy": ["restaurantId", "articleId", "date"]
}

Response:
{
  "expenses": [
    {
      "restaurantId": "uuid",
      "articleId": "uuid",
      "articleName": "Электричество",
      "date": "2026-03-27",
      "amount": 45000.00,
      "quantity": 2500,
      "unit": "kWh"
    }
  ]
}
```

### 5. Get Cash Discrepancies
```bash
POST /reports/cash_discrepancies

Body:
{
  "organizationIds": ["uuid"],
  "dateFrom": "2026-03-27",
  "dateTo": "2026-03-27",
  "includeClosedShifts": true
}

Response:
{
  "discrepancies": [
    {
      "terminalId": "uuid",
      "restaurantId": "uuid",
      "shiftDate": "2026-03-27",
      "expectedBalance": 500000.00,
      "actualBalance": 498750.50,
      "discrepancy": -1249.50,
      "discrepancyPercent": -0.25,
      "status": "OK",
      "shiftOpenTime": "2026-03-27T09:00:00Z",
      "shiftCloseTime": "2026-03-27T21:00:00Z"
    }
  ]
}
```

### 6. Get Nomenclature (Menu Items)
```bash
GET /nomenclature?organizationId=uuid

Response:
{
  "nomenclatureGroups": [
    {
      "id": "uuid",
      "name": "Бургеры",
      "items": [
        { "id": "uuid", "name": "Классический", "articleNumber": "001" },
        { "id": "uuid", "name": "С беконом", "articleNumber": "002" }
      ]
    }
  ]
}
```

### 7. Get DDS Article Groups
```bash
GET /nomenclature/groups?organizationId=uuid&includeArticles=true

Response:
{
  "groups": [
    {
      "id": "uuid",
      "name": "Коммунальные услуги",
      "articles": [
        { "id": "uuid", "name": "Электричество", "code": "10" },
        { "id": "uuid", "name": "Вода", "code": "11" }
      ]
    }
  ]
}
```

### 8. Get Kitchen Shipments
```bash
POST /reports/kitchen_shipments

Body:
{
  "organizationIds": ["uuid"],
  "dateFrom": "2026-03-27",
  "dateTo": "2026-03-27",
  "restaurantIds": ["uuid"]
}

Response:
{
  "shipments": [
    {
      "shipmentId": "uuid",
      "sourceRestaurant": "uuid (kitchen)",
      "destinationRestaurant": "uuid",
      "date": "2026-03-27T10:00:00Z",
      "items": [
        { "dishId": "uuid", "dishName": "Фарш", "quantity": 10, "unit": "kg" }
      ]
    }
  ]
}
```

### 9. Check Terminal Health
```bash
GET /terminal_groups/is_alive?organizationId=uuid

Response:
{
  "groups": [
    {
      "groupId": "uuid",
      "name": "BNA Абая",
      "isAlive": true,
      "lastPingTime": "2026-03-27T15:30:45Z"
    }
  ]
}
```

---

## Error Handling

All errors return JSON with structure:
```json
{
  "statusCode": 401,
  "correlationId": "uuid",
  "errorDescription": "Invalid token",
  "errorField": "Authorization"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (check parameters)
- `401` - Unauthorized (token expired, refresh needed)
- `403` - Forbidden (no access to organization)
- `429` - Rate limited (implement backoff)
- `500` - Server error (retry with backoff)

---

## SDK Libraries (Pick One)

| Language | Library | Link |
|----------|---------|------|
| **Go** | iiko-go | https://github.com/iiko-go/iiko-go |
| **Python** | pyiikocloudapi | https://github.com/kebrick/pyiikocloudapi |
| **TypeScript** | @salesduck/iiko-cloud-api | https://github.com/salesduck/iiko-cloud-api |
| **PHP** | iiko-sdk | https://packagist.org/packages/lichi/iiko-sdk |
| **JavaScript** | javascript-iiko-api-client | https://www.npmjs.com/package/javascript-iiko-api-client |

---

## Aggregator Sync Schedule

```javascript
// aggregator-worker schedule

0 3 * * * → GET /organizations (daily)
0 3 * * * → GET /payment_types (daily)
*/15 * * * * → POST /reports/olap (every 15 min)
*/30 * * * * → POST /reports/expenses (every 30 min)
0 * * * * → POST /reports/cash_discrepancies (every hour)
0 * * * * → POST /reports/kitchen_shipments (every hour)
```

---

## NestJS Service Template

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IikoCloudService {
  private token: string;
  private tokenExpiry: Date;
  private readonly apiBase = 'https://api-ru.iiko.services/api/1/';

  constructor() {}

  async refreshToken(apiLogin: string): Promise<string> {
    const response = await axios.post(`${this.apiBase}access_token`, {
      apiLogin,
    });
    this.token = response.data.token;
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 min
    return this.token;
  }

  private async ensureToken(apiLogin: string): Promise<string> {
    if (!this.token || new Date() > this.tokenExpiry) {
      return this.refreshToken(apiLogin);
    }
    return this.token;
  }

  async getOrganizations(apiLogin: string) {
    const token = await this.ensureToken(apiLogin);
    return axios.get(`${this.apiBase}organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getRevenue(apiLogin: string, body: any) {
    const token = await this.ensureToken(apiLogin);
    return axios.post(`${this.apiBase}reports/olap`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // ... more methods
}
```

---

## Testing with curl

```bash
# 1. Get token
TOKEN=$(curl -s -X POST https://api-ru.iiko.services/api/1/access_token \
  -H "Content-Type: application/json" \
  -d '{"apiLogin":"YOUR_API_LOGIN"}' | jq -r '.token')

# 2. Get organizations
curl -H "Authorization: Bearer $TOKEN" \
  "https://api-ru.iiko.services/api/1/organizations"

# 3. Get revenue
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationIds": ["uuid"],
    "reportType": "SALES",
    "dateFrom": "2026-03-27",
    "dateTo": "2026-03-27",
    "aggregateFields": ["revenue"]
  }' \
  "https://api-ru.iiko.services/api/1/reports/olap"
```

---

## Cost Allocation Formula

For each HQ expense from 1C:

```
coefficient = restaurant_revenue / total_revenue
allocated = hq_expense × coefficient
```

Example:
```
Restaurant A revenue: 1,000,000 KZT
Restaurant B revenue: 2,000,000 KZT
Total revenue: 3,000,000 KZT

HQ rent (from 1C): 300,000 KZT

Restaurant A receives: 300,000 × (1,000,000 / 3,000,000) = 100,000 KZT
Restaurant B receives: 300,000 × (2,000,000 / 3,000,000) = 200,000 KZT
```

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token expired | Refresh token before 1-hour mark |
| 429 Rate Limited | Too many requests | Implement exponential backoff |
| 403 Forbidden | No access to org | Verify apiLogin has correct permissions |
| Empty results | Wrong date range | Check dateFrom/dateTo format (ISO8601) |
| Slow queries | Complex OLAP report | Add filters; reduce date range |

---

**Last Updated:** 2026-03-27
**Version:** 1.0
**Status:** Ready for MVP Implementation
