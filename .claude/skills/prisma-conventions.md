---
description: Prisma ORM conventions for KEX GROUP database schema
---

# Prisma Conventions

## Schema Location
- packages/database/schema.prisma — single source of truth
- Only leader edits schema, agents READ ONLY

## Naming
- Models: PascalCase (FinancialSnapshot, DdsArticle)
- Fields: camelCase (createdAt, tenantId)
- Enums: UPPER_SNAKE_CASE (OWNER, FINANCE_DIRECTOR)
- Relations: descriptive names (restaurant, brand, expenses)

## Multi-Schema
- auth schema: User, OtpCode, RefreshToken
- finance schema: Brand, Restaurant, FinancialSnapshot, Expense, KitchenShipment, CashDiscrepancy

## Common Patterns
```prisma
model Example {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
}
```

## Migrations
- `npx prisma migrate dev --name descriptive_name`
- Never use `db push` in shared environments
- Migration names: snake_case, descriptive (add_kitchen_shipment, alter_expense_source)

## Client Usage
- Import from `@kex/database` (shared package)
- Use transactions for multi-table writes
- Always include `where: { tenantId }` for tenant isolation
