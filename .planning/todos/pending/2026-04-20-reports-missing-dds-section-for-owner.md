---
created: 2026-04-20T00:52:00Z
title: ReportsScreen не показывает DDS-секцию для OWNER — видны только 3 секции из 4
area: mobile
priority: high
files:
  - apps/mobile-dashboard/src/screens/ReportsScreen.tsx
  - apps/mobile-dashboard/src/hooks/useAuthStore.ts (проверить role)
---

## Problem

Согласно `.planning/phases/07-mobile-screens/07-04-SUMMARY.md`:
> ReportsScreen rewritten with 4 real report endpoints (DDS/company/kitchen/trends).
> OPS_DIRECTOR sees only Kitchen and Trends sections.

На эмуляторе под OWNER-ролью (dev bypass login) видны:
1. ✅ Затраты компании
2. ✅ Цех
3. ✅ Тренды
4. ❌ **DDS отчёт — отсутствует**

Либо:
- DDS-секция хардкодно скрыта / удалена после последних правок
- Роль залогиненного юзера не OWNER, а что-то другое (но тогда Company Expenses тоже не должна быть видна)

## Investigation

**Шаг 1 (2 мин):** проверить что рендерит ReportsScreen:
```bash
grep -n "DDS\|ddsReport\|reports.dds" apps/mobile-dashboard/src/screens/ReportsScreen.tsx
```

**Шаг 2:** проверить какая роль у залогиненного юзера:
```bash
adb shell run-as host.exp.exponent cat files/*.json | grep -i role
# либо в React DevTools
```

Вероятно `useReports()` возвращает `{ dds, companyExpenses, kitchen, trends }`, но секция DDS в JSX забыта или условно обёрнута:
```tsx
{role === 'OWNER' && <DDSSection data={dds} />}
```

Если условие не срабатывает — роль не OWNER. Dev bypass OTP возможно создаёт dev user без OWNER роли, или роль хранится в старом формате.

## Solution

**Вариант A: DDS-секция удалена — восстановить**
Добавить обратно после «Затраты компании»:
```tsx
{(role === 'OWNER' || role === 'FINANCE_DIRECTOR') && (
  <Section title="DDS отчёт">
    {ddsLoading ? <Skeleton /> : <DDSList items={dds} />}
  </Section>
)}
```

**Вариант B: dev bypass не даёт OWNER роль — исправить auth flow**
```ts
// auth-service OTP bypass
if (code === '111111' && env === 'development') {
  return { user: { role: 'OWNER', ... }, ... };
}
```

## Acceptance

- Под OWNER: 4 секции (DDS / Затраты компании / Цех / Тренды)
- Под FIN_DIRECTOR: 4 секции (те же что у OWNER)
- Под OPS_DIRECTOR: 2 секции (Цех / Тренды)
- Unit test на role gating

## Связано с

- Phase `07-mobile-screens/07-04` — там были тесты role-gating, проверить не сломаны ли
