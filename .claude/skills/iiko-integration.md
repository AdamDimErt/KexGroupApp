---
description: iiko Cloud API integration patterns for aggregator-worker
---

# iiko Cloud API Integration

## Authentication
- POST /api/1/access_token with apiLogin
- Token valid ~15 min, cache and refresh proactively
- Header: Authorization: Bearer {token}

## Key Endpoints
- GET /api/1/organization/list — org structure
- GET /api/1/olap/columns — available OLAP dimensions
- POST /api/1/olap/by_department — revenue by restaurant
- POST /api/1/olap/by_department_and_payment_type — revenue by payment type
- GET /api/1/chain/list — brand/chain info

## DDS (Cash Flow)
- POST /api/1/olap/by_dds_article — expenses by DDS articles
- DDS articles have groups (categories) and items

## Sync Patterns
- Use cursor-based pagination where available
- Store lastSyncAt per entity type in DB
- Retry with exponential backoff (3 attempts, 1s/5s/15s)
- Log all API responses for debugging (first 30 days)

## Data Mapping
- iiko Organization → Brand (by name pattern: "BNA*" / "DNA*")
- iiko Department → Restaurant
- iiko Revenue row → FinancialSnapshot
- iiko DDS row → Expense (source: IIKO)

## Rate Limits
- Max 10 req/sec per API key
- Batch requests where possible (date ranges)
