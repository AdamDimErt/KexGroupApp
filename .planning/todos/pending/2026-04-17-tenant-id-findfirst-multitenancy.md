---
created: 2026-04-17T01:43:35Z
title: Tenant ID — заменить findFirst() на строгий env / context
area: api
priority: medium
files:
  - apps/aggregator-worker/src/iiko/iiko-sync.service.ts:66-86
  - apps/aggregator-worker/src/onec/onec-sync.service.ts (аналогично)
  - apps/aggregator-worker/src/scheduler/scheduler.service.ts
---

## Problem

В `IikoSyncService.getTenantId()` ([iiko-sync.service.ts:66-86](apps/aggregator-worker/src/iiko/iiko-sync.service.ts)):

```ts
private async getTenantId(): Promise<string> {
  if (this.cachedTenantId) return this.cachedTenantId;
  if (process.env.TENANT_ID && process.env.TENANT_ID !== 'default') {
    this.cachedTenantId = process.env.TENANT_ID;
    return this.cachedTenantId;
  }
  const tenant = await this.prisma.tenant.findFirst();  // ← опасно
  if (tenant) {
    this.cachedTenantId = tenant.id;
    return this.cachedTenantId;
  }
  // ...
}
```

**Проблемы:**
1. **Single-tenant assumption:** при появлении 2-го тенанта в БД `findFirst()` вернёт случайный (по ordering без `orderBy`). Все iiko-данные второго клиента улетят в первого тенанта.
2. **Кеш в памяти процесса:** `cachedTenantId` живёт до рестарта. Если кеш зафиксировался на «не том» тенанте — ошибки до перезапуска.
3. **Нет audit trail:** при синхронизации непонятно, какой тенант был активен.
4. **Предполагается, что один worker = один тенант** — но в коде нет принуждения этого.

## Solution

**Шаг 1 (быстро, часть текущего фикса):**
- Сделать `TENANT_ID` env обязательным (throw если отсутствует, БЕЗ fallback на findFirst).
- Убрать значение `'default'` как магическую строку.

```ts
private getTenantId(): string {
  const id = process.env.TENANT_ID;
  if (!id) throw new Error('TENANT_ID env is required (single-tenant deployment)');
  return id;
}
```

Удалить `cachedTenantId`, удалить `Promise<string>` (сделать sync).

**Шаг 2 (для multi-tenant, отдельная фаза):**
- Добавить `Tenant` параметр в каждый метод синхронизации (`syncRevenue(tenantId: string)`).
- `SchedulerService` итерирует по `tenants.findMany({ where: { isActive: true } })` в крон-задачах.
- Прокинуть `tenantId` в `SyncLog`, `Sentry.setTag`, в alert payload.
- Каждая Prisma query фильтрует по `tenantId` (Prisma middleware можно использовать).

**Связано с:** [iiko URL fallback todo](2026-04-17-iiko-url-fallback-multitenancy.md) — обе проблемы из одной семьи (multi-tenancy not enforced). Решать одной фазой.

**Estimate:** Шаг 1 — 20 мин. Шаг 2 — 2-3 дня (отдельная фаза).
