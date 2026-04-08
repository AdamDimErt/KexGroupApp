# Prisma Seed File Update — Real iiko Structure

**File Updated:** `/packages/database/seed.ts`

## Summary
Updated the seed file from stub data (2 brands, 13 restaurants) to **real iiko Cloud API structure** with all 83 restaurants, 6 brands, and 5 legal entities.

## Key Changes

### 1. Brands (6 total, was 2)
- **BNA** (Burger na Abaya) — iikoGroupId: `f3864940-8072-4dde-9c03-d1fec8d661c4`
- **DNA** (Doner na Abaya) — iikoGroupId: `f401ea70-f72c-408b-b3a3-935e779c8043`
- **JD** (Just Doner) — iikoGroupId: `8a98ad9f-2f5c-4a24-a158-27710db0b1ca`
- **SB** (Salam Bro) — iikoGroupId: `68339e2f-89c7-495a-b4a4-393dc9c190c4`
- **КексБрэндс** — iikoGroupId: `aaf28c64-40bf-4cf0-b66a-d17a3a223819`
- **Цех** (Kitchens) — iikoGroupId: `63b60161-8d0c-4e98-a5d8-e870152fd792`

### 2. Legal Entities / Companies (5 total, was 2)
- ТОО "Burger na Abaya" — owns BNA brand
- ТОО "A Doner" — owns DNA brand
- ТОО "Salam Bro" — owns SB brand (new)
- ТОО "Just Doner" — owns JD brand (new)
- ТОО "KexBrands" — owns КексБрэндс + Цех (new)

### 3. Restaurants (83 total, was 13)
Distribution by brand:
- **BNA:** 8 points (all locations)
- **DNA:** 28 points (all 28 locations)
- **JD:** 2 points
- **SB:** 35 points (all 35 locations)
- **КексБрэндс:** 1 point
- **Цех:** 9 kitchen locations

All restaurants now include:
- Real iiko UUIDs (iikoId field)
- Correct brand associations
- Active status flag

### 4. Sample Financial Data (new)
- **FinancialSnapshot records:** 9 total (3 restaurants × 3 days)
- Revenue by payment type: cash, Kaspi QR, Halyk QR, Yandex Eда
- Direct expenses: ~30% of total revenue
- Realistic amounts: 1–6M KZT per day

### 5. Users & DDS Article Groups (unchanged)
- 4 test users: Admin, Owner, Finance Director, Operations Director
- 12 DDS article groups: Food, Rent, Salary, Utilities, Marketing, IT, Transport, Equipment, Taxes, Bank Fees, Kitchen, Other

## Data Integrity
✅ All 83 restaurant UUIDs match iiko API response  
✅ All 6 brands have matching iikoGroupId  
✅ Upsert operations (idempotent — safe to run multiple times)  
✅ Foreign key relationships validated  
✅ Decimal types correctly typed for financial data  
✅ No schema.prisma modifications — only seed.ts updated  

## Testing Confirmation
✅ Seed script executed successfully in test run  
✅ All relations established correctly  
✅ Sample data generated with realistic values  
✅ No TypeScript type errors  

## How to Run
```bash
cd packages/database
npx prisma db seed
```

Or directly:
```bash
npx ts-node seed.ts
```

## Backward Compatibility
- Existing test accounts preserved (+77074408018, +77000000001, etc.)
- Uses upsert operations (safe for re-seeding)
- No breaking changes to schema
