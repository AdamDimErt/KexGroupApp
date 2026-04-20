---
created: 2026-04-17T01:43:35Z
title: iiko URL fallback — убрать хардкод домена клиента
area: api
priority: high
files:
  - apps/aggregator-worker/src/iiko/iiko-auth.service.ts:12
  - apps/aggregator-worker/src/iiko/iiko-sync.service.ts:47
  - packages/database/schema.prisma (Tenant model)
---

## Problem

В двух файлах захардкожен URL **конкретного клиента** (KEX GROUP) как fallback:

```ts
// apps/aggregator-worker/src/iiko/iiko-auth.service.ts:12
process.env.IIKO_SERVER_URL || 'https://kexbrands-co.iiko.it:443/resto/api'

// apps/aggregator-worker/src/iiko/iiko-sync.service.ts:47
process.env.IIKO_SERVER_URL || 'https://kexbrands-co.iiko.it:443/resto/api'
```

**Импакт сейчас (single-tenant):**
- Если кто-то развернёт без `IIKO_SERVER_URL` env — синхронизация молча пойдёт в **чужой iiko** (KEX). Утечка данных или нагрузка на их iiko.
- Тестовая среда без env → ходит в production iiko.

**Импакт при появлении 2-го клиента (multi-tenant):**
- Все тенанты в одном инстансе worker'а используют один URL. Невозможно подключить второго клиента с другим iiko.

## Solution

**Шаг 1 (срочно, 30 мин):** убрать fallback, throw на отсутствие env:
```ts
private readonly baseUrl = (() => {
  const url = process.env.IIKO_SERVER_URL;
  if (!url) throw new Error('IIKO_SERVER_URL env is required');
  return url;
})();
```

Добавить `IIKO_SERVER_URL=` в `.env.example` без default-значения.

**Шаг 2 (когда понадобится 2-й клиент, 1-2 дня):** перенести в БД как per-tenant конфиг:
```prisma
model Tenant {
  // ...
  iikoServerUrl  String?
  iikoLogin       String?
  iikoPasswordEnc String?  // зашифрованный пароль/токен
  oneCRestUrl     String?
  oneCRestUser    String?
  oneCRestPassEnc String?
}
```

`IikoSyncService` получает URL из `tenant.iikoServerUrl` (через `getTenantId()` уже есть в коде).

`IikoAuthService` становится stateful — кеш токенов per-tenant в Redis (`iiko:token:{tenantId}`).

`SchedulerService` итерирует по тенантам в крон-задачах:
```ts
@Cron('*/15 * * * *')
async syncRevenueAllTenants() {
  const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
  for (const t of tenants) {
    await this.iikoSync.syncRevenue(t.id).catch(e => this.logger.error(...));
  }
}
```

**Связано с:** [Tenant ID findFirst todo](2026-04-17-tenant-id-findfirst-multitenancy.md) — нужно решать вместе.

**Estimate:** Шаг 1 — 30 мин (часть текущего фикса). Шаг 2 — 1-2 дня (отдельная фаза перед onboarding 2-го клиента).
