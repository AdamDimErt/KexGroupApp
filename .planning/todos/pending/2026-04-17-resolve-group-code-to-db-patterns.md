---
created: 2026-04-17T01:43:35Z
title: resolveGroupCode — перенести правила маппинга в БД
area: database
priority: medium
files:
  - apps/aggregator-worker/src/iiko/iiko-sync.service.ts:1443-1457
  - packages/database/schema.prisma
---

## Problem

Маппинг названия счёта iiko на `DdsArticleGroup.code` реализован 12 жёстко закодированными `if (name.includes(...))` в [iiko-sync.service.ts:1443-1457](apps/aggregator-worker/src/iiko/iiko-sync.service.ts):

```ts
private resolveGroupCode(accountName: string): string {
  const name = accountName.toLowerCase();
  if (name.includes('аренд')) return 'RENT';
  if (name.includes('заработн') || name.includes('зарплат')...) return 'SALARY';
  if (name.includes('комисси') || name.includes('банк')) return 'BANK_FEE';
  // ... ещё 9 веток
  return 'OTHER';
}
```

**Проблемы:**
1. Бизнес не может настроить маппинг через UI (нужен релиз кода).
2. iiko переименовала статью или появилась новая категория → пропатчить + редеплой.
3. Многоязычность сломана: правила только на русском (`'аренд'`, `'заработн'`).
4. Конфликты приоритетов скрыты: что если статья называется "Аренда оборудования" — попадёт в RENT, хотя по смыслу EQUIPMENT (порядок if'ов решает).
5. Невозможно тестировать pattern coverage — какие реальные статьи iiko НЕ матчатся? Падают в OTHER молча.

## Solution

Перенести patterns в `DdsArticleGroup`:

```prisma
model DdsArticleGroup {
  // ... существующие поля
  matchPatterns   String[]  // ['аренд', 'аренда']
  matchPriority   Int       @default(100)  // меньше = выше приоритет
  // ...
}
```

`resolveGroupCode` становится:
```ts
private async resolveGroupCode(accountName: string, tenantId: string): Promise<string> {
  const name = accountName.toLowerCase();
  const groups = await this.prisma.ddsArticleGroup.findMany({
    where: { tenantId },
    orderBy: { matchPriority: 'asc' },
  });
  const matched = groups.find(g => g.matchPatterns.some(p => name.includes(p.toLowerCase())));
  return matched?.code ?? 'OTHER';
}
```

Кеш списка групп в памяти (TTL 5 мин), чтобы не бить БД на каждой статье.

**Бонус:** добавить логирование "unmatched accounts" — список названий, попавших в OTHER, чтобы бизнес видел что нужно настроить.

**Миграция:** seed.ts заполняет `matchPatterns` для 12 существующих групп текущими значениями из `resolveGroupCode`. Тесты проверяют, что список тех же 7 кейсов проходит после миграции.

**Estimate:** 1 день (миграция + рефактор + кеш + тесты + seed).

**Связанные ulepшения:**
- Админка для редактирования patterns (отдельная фаза, нужен UI-роль ADMIN).
- То же самое сделать для `classifyPaymentType` — но это входит в [PaymentType refactor todo](2026-04-17-payment-type-refactor-to-relation.md).
