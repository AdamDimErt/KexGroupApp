---
created: 2026-04-17T01:43:35Z
title: PaymentType refactor — из 4 колонок в справочную таблицу
area: database
priority: high
files:
  - packages/database/schema.prisma
  - apps/aggregator-worker/src/iiko/iiko-sync.service.ts:36-41,517-521,628-680
  - apps/finance-service/src/dashboard/dashboard.service.ts
  - apps/finance-service/src/dashboard/dto/summary.dto.ts
  - packages/shared-types/src/index.ts
  - apps/mobile-dashboard/src/types/index.ts
  - apps/mobile-dashboard/src/hooks/usePointDetail.ts
  - apps/mobile-dashboard/src/screens/PointDetailScreen.tsx
  - apps/mobile-dashboard/src/screens/PointDetailScreen.styles.ts
  - apps/mobile-dashboard/src/i18n/ru.ts
  - apps/mobile-dashboard/src/i18n/kk.ts
  - packages/database/seed.ts
---

## Problem

Платёжные методы (`cash/kaspi/halyk/yandex`) захардкожены как **4 фиксированные колонки** в `FinancialSnapshot` (`revenueCash`, `revenueKaspi`, `revenueHalyk`, `revenueYandex`). Эта структура продублирована в **12+ файлах** проекта.

**Импакт:** добавление нового банка (Forte Bank, Береке, Jusan), изменение наименований или появление новых способов оплаты (например, e-money) требует:
1. Миграция БД (новая колонка)
2. Изменение Prisma модели + типов
3. Изменение `classifyPaymentType` в `iiko-sync.service.ts:628-680` (добавить веткy if)
4. Изменение `PaymentTypeField` union type
5. Изменение if/else цепочки в `iiko-sync.service.ts:517-521`
6. Изменение DTO в finance-service
7. Изменение shared-types
8. Изменение mobile types/hooks
9. Изменение UI карточек в `PointDetailScreen.tsx`
10. Изменение стилей
11. Изменение i18n переводов (RU + KK)
12. Обновление seed.ts

= 12 файлов, 6 деплоев (backend + mobile build), high risk регрессии.

Хорошая новость: в `iiko-sync.service.ts:523` уже есть `existing.raw.set(payTypeName, amount)` — данные собираются динамически, но потом теряются.

## Solution

Преобразовать в нормализованную модель:

```prisma
model PaymentType {
  id              String   @id @default(uuid())
  tenantId        String
  code            String   // 'KASPI', 'HALYK', 'CASH', 'YANDEX', 'FORTE'...
  displayNameRu   String
  displayNameKk   String
  iconName        String?  // Lucide icon name для mobile
  color           String?  // hex для UI
  matchPatterns   String[] // ['kaspi', 'каспи'] — для classifyPaymentType
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)
  
  payments        SnapshotPayment[]
  
  @@unique([tenantId, code])
  @@schema("finance")
}

model SnapshotPayment {
  id             String   @id @default(uuid())
  snapshotId    String
  paymentTypeId  String
  amount         Decimal  @db.Decimal(14, 2)
  
  snapshot      FinancialSnapshot @relation(...)
  paymentType    PaymentType       @relation(...)
  
  @@unique([snapshotId, paymentTypeId])
  @@schema("finance")
}
```

`FinancialSnapshot` теряет 4 колонки `revenue*`, добавляет relation `payments: SnapshotPayment[]`.

`classifyPaymentType` становится:
```ts
const types = await this.prisma.paymentType.findMany({ where: { tenantId } });
const matched = types.find(t => t.matchPatterns.some(p => name.toLowerCase().includes(p)));
return matched ?? defaultOtherType;
```

Mobile рендерит динамически: `payments.map(p => <PaymentCard icon={p.type.iconName} ... />)`.

**Миграция данных:** SQL-скрипт seed для существующих 4 типов (CASH, KASPI, HALYK, YANDEX) с patterns, конвертация старых колонок в `SnapshotPayment` rows.

**Estimate:** 2-3 дня (схема + миграция + рефактор worker + рефактор finance-service + рефактор mobile + тесты + i18n).

**Когда делать:** перед подключением второго банка или нового платежного метода. Можно отложить, но не более 1-2 итераций.
