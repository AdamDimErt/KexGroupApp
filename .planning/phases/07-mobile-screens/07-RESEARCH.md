# Phase 7: Mobile App — Экраны (4 уровня drill-down) — Research

**Researched:** 2026-04-07
**Domain:** React Native + Expo — финансовые экраны drill-down
**Confidence:** HIGH

## Summary

Phase 7 завершает пользовательский интерфейс мобильного приложения: добавляет недостающие элементы
на уже существующих экранах (Level 1, 2) и создаёт два новых экрана (Level 3 — ArticleDetailScreen,
Level 4 — OperationsScreen). Все бэкенд-эндпоинты полностью готовы; апи-хуки для Level 3 уже
реализованы (`useArticleDetail` + `dashboardApi.getArticle`). Типы ответов API задокументированы в
`src/types/index.ts`. Навигация — state-based (App.tsx переключает `screen` стейт), без React Navigation
стека для внутренних переходов.

Главный gap: (1) экраны Level 3 и Level 4 не существуют как компоненты, (2) навигация в App.tsx не
обрабатывает переходы к этим экранам, (3) несколько UI-элементов на DashboardScreen и PointDetailScreen
не реализованы (три KPI, lastSyncAt, pull-to-refresh, skeleton, role-based filtering), (4) ReportsScreen
использует mock-данные вместо реальных API-эндпоинтов DDS/kitchen/trends, (5) не установлены
`expo-haptics` и `@react-native-async-storage/async-storage` для офлайн + haptic feedback.

**Primary recommendation:** Реализовывать послойно: сначала инфраструктурный слой (пакеты + API хуки),
потом UI компоненты в порядке Level 1 gaps → Level 2 gaps → Level 3 (новый экран) → Level 4 (новый
экран) → Reports → Offline.

---

## Standard Stack

### Core (уже установлено)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React Native | 0.81.5 | UI framework | Installed |
| Expo | ~54.0.0 | Native APIs | Installed |
| Zustand | ^5.0.0 | State (useDashboardStore, useAuthStore) | Installed |
| @tanstack/react-query | ^5.60.0 | Кэширование/fetching | Installed, QueryProvider не подключён к хукам |
| react-native-svg | 15.12.1 | SVG для графиков | Installed |
| expo-secure-store | ~15.0.8 | JWT хранение | Installed |
| i18next + react-i18next | ^24 / ^15 | Локализация | Installed |
| @sentry/react-native | ~7.2.0 | Error tracking | Installed |

### Требуется установить
| Library | Version | Purpose | Why needed |
|---------|---------|---------|------------|
| expo-haptics | ~55.0.13 | Haptic feedback при навигации и pull-to-refresh | Прямо указано в ROADMAP Phase 7 |
| @react-native-async-storage/async-storage | ~3.0.2 | AsyncStorage для React Query persister (офлайн кэш) | Требуется для offline-first паттерна |

**Примечание:** `victory-native` в ROADMAP упоминается для графиков трендов. Однако текущие экраны
реализуют графики вручную через View/bars. Для фазы 7 рекомендуется продолжить ручной подход
(он уже работает, нет зависимости компиляции), а `victory-native` добавить только если trends charts
потребуют line graphs сложнее bar charts.

**Installation:**
```bash
cd apps/mobile-dashboard
npx expo install expo-haptics
npx expo install @react-native-async-storage/async-storage
```

---

## Architecture Patterns

### Существующая структура (не менять)
```
apps/mobile-dashboard/
├── App.tsx                    # State-based routing + bootstrapping
├── src/
│   ├── screens/               # Экраны (один файл + .styles.ts)
│   │   ├── DashboardScreen.tsx          # Level 1 — существует, needs gaps
│   │   ├── BrandDetailScreen.tsx        # Level 1b — существует, complete
│   │   ├── PointDetailScreen.tsx        # Level 2 — существует, needs gaps
│   │   ├── ReportsScreen.tsx            # Reports — существует, needs real API
│   │   ├── NotificationsScreen.tsx      # Exists, complete
│   │   └── [NEW] ArticleDetailScreen.tsx  # Level 3 — создать
│   │   └── [NEW] OperationsScreen.tsx     # Level 4 — создать
│   ├── hooks/
│   │   ├── useApi.ts          # useApiQuery + useDashboardSummary, useBrandDetail,
│   │   │                      # useRestaurantDetail, useArticleDetail — ВСЕ ГОТОВЫ
│   │   └── [NEW] useOperations.ts  # Level 4 API hook
│   ├── services/api.ts        # dashboardApi — needs getOperations method
│   ├── store/dashboard.ts     # useDashboardStore — period, customFrom, customTo
│   ├── store/auth.ts          # useAuthStore — user.role доступен
│   ├── types/index.ts         # Типы — needs OperationDto, ReportsDdsDto, etc.
│   └── components/
│       ├── PeriodSelector.tsx          # Готов, используется на всех экранах
│       └── [shared] SkeletonLoader.tsx # Создать как переиспользуемый компонент
```

### Pattern 1: Навигация — State Machine в App.tsx
**What:** App.tsx управляет `screen` стейтом типа `Screen`. Каждый новый экран требует:
1. Добавить тип в `Screen` union (`src/types/index.ts`)
2. Добавить state для параметров (groupId, restaurantId для Level 3; articleId для Level 4)
3. Добавить case в `renderScreen()` в App.tsx
4. Добавить handler для перехода (передать в PointDetailScreen как prop)

**Текущие типы:**
```typescript
// src/types/index.ts
export type Screen = 'login' | 'dashboard' | 'brand-details' | 'points' | 'point-details' | 'notifications' | 'reports';
// Добавить: | 'article-detail' | 'operations'
```

**Pattern для перехода Level 2 → Level 3:**
PointDetailScreen получает `onNavigateArticle: (groupId: string) => void` — при нажатии
на группу расходов (expenseItems). App.tsx сохраняет groupId + restaurantId в state и
показывает ArticleDetailScreen.

### Pattern 2: API Hooks — useApiQuery с period из store
**What:** Все хуки читают period из `useDashboardStore`, вычисляют даты, вызывают API.
`useArticleDetail` уже реализован в `useApi.ts`. `useOperations` нужно создать по той же схеме.

**Existing pattern (HIGH confidence — из кода):**
```typescript
// src/hooks/useApi.ts — паттерн для нового хука
export function useOperations(articleId: string, restaurantId: string, page: number = 1) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const { dateFrom, dateTo } = getPeriodDates(period, customFrom, customTo);
  return useApiQuery(
    () => dashboardApi.getOperations(articleId, restaurantId, page, periodType, dateFrom, dateTo),
    [articleId, restaurantId, page, period, customFrom, customTo],
  );
}
```

### Pattern 3: Role-based UI hiding
**What:** `useAuthStore(s => s.user?.role)` возвращает `'OWNER' | 'FINANCE_DIRECTOR' | 'OPERATIONS_DIRECTOR'`.
Скрывать UI элементы на основе роли — не показывать Balance для OPS_DIRECTOR на Level 1.

**Pattern:**
```typescript
const role = useAuthStore(s => s.user?.role);
const showBalance = role === 'OWNER' || role === 'FINANCE_DIRECTOR';
// В JSX: {showBalance && <BalanceView ... />}
```

**Матрица видимости:**
| Данные | OWNER | FIN_DIR | OPS_DIR |
|--------|-------|---------|---------|
| Balance (Level 1) | ✅ | ✅ | скрыть |
| Level 3 (Article groups) | ✅ | ✅ | не показывать кнопку перехода |
| Level 4 (Operations) | ✅ | не показывать | не показывать |
| Reports: DDS + company | ✅ | ✅ | не показывать |
| Reports: kitchen + trends | ✅ | ✅ | ✅ |

**Note:** Бэкенд уже возвращает 403 для неавторизованных запросов — UI фильтрация дополнительная
защита для UX, не для безопасности.

### Pattern 4: Skeleton Loaders
**What:** Вместо `ActivityIndicator` на весь экран — анимированный skeleton placeholder.
Используется на Level 1 (три KPI цифры) и при переходах между экранами.

**Реализация:** `Animated.Value` + `interpolate` для opacity пульсации. Создать shared компонент
`SkeletonLoader` в `src/components/`. Существующий код использует `ActivityIndicator` — заменить.

```typescript
// Паттерн skeleton (не требует внешних зависимостей)
const opacity = useRef(new Animated.Value(0.3)).current;
useEffect(() => {
  const anim = Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])
  );
  anim.start();
  return () => anim.stop();
}, [opacity]);
```

### Pattern 5: Pull-to-refresh
**What:** `ScrollView` имеет `refreshControl` prop. Использует `useApiQuery`'s `refetch`.

```typescript
// Source: React Native docs — ScrollView refreshControl
import { RefreshControl } from 'react-native';
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={isLoading}
      onRefresh={refetch}
      tintColor={colors.accent}
    />
  }
>
```

**Haptic feedback при pull-to-refresh:**
```typescript
import * as Haptics from 'expo-haptics';
const handleRefresh = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  refetch();
};
```

### Pattern 6: Last Sync Indicator
**What:** `DashboardSummaryDto.lastSyncAt` (уже в типах) — показать время. Красный если > 1 часа.

```typescript
const lastSyncAt = summary?.lastSyncAt;
const isStale = lastSyncAt && (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
const syncLabel = lastSyncAt
  ? `Синхронизация: ${new Date(lastSyncAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  : 'Нет данных';
// Цвет: isStale ? colors.red : colors.textTertiary
```

### Anti-Patterns to Avoid
- **Дублировать `getPeriodDates` логику** в новых хуках — импортировать из `useApi.ts` (экспортировать функцию)
- **Использовать `React Navigation` стек** — проект использует state-based routing, добавление react-navigation stack сломает архитектуру
- **Хардкодить API URL** в новых файлах — только через `API_URL` из `src/config.ts`
- **Писать role-check в стилях** — только в JSX условиях, не в StyleSheet
- **Устанавливать `victory-native`** без реальной потребности — добавляет ~2MB bundle и требует reanimated

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Haptic feedback | Custom vibration API | `expo-haptics` | Platform-specific API, уже в Expo SDK |
| Offline cache | Custom cache layer | React Query + AsyncStorage persister | Персистер уже в @tanstack/react-query v5 |
| Phone number formatting | Regex | Уже есть `react-native-international-phone-number` | Не нужно в этой фазе |
| Bar charts | SVG computation | View-based bars (текущий подход работает) | victory-native — избыточно для bar charts |
| Date range picker | Custom modal | `MonthRangePicker` уже реализован | Переиспользовать |
| Period computation | Inline Date math | `getPeriodDates()` из `useApi.ts` | Функция уже написана, экспортировать |

**Key insight:** Экосистема React Native/Expo предоставляет всё необходимое. Главный риск —
дублирование уже написанного кода (period logic, API hooks, period selector).

---

## Common Pitfalls

### Pitfall 1: Навигация Level 3 — потеря restaurantId
**What goes wrong:** ArticleDetailScreen требует и `groupId` (из ExpenseGroupDto.groupId) и
`restaurantId` (чтобы загрузить статьи конкретной точки). При переходе из PointDetailScreen
можно забыть передать restaurantId.
**Why it happens:** `useArticleDetail(articleId, restaurantId)` — оба параметра обязательны для
API endpoint `/api/finance/article/:id?restaurantId=`.
**How to avoid:** App.tsx должен хранить оба: `articleGroupId` и `currentRestaurantId` в state.
При навигации Level 2 → Level 3 передавать оба параметра.
**Warning signs:** API возвращает 400 или пустой массив статей.

### Pitfall 2: PointDetailScreen не передаёт callback для Level 3
**What goes wrong:** PointDetailScreen.tsx сейчас рендерит `expenseItems` как нажимаемые строки
(через `View`), но нет `onPress` для перехода в Level 3.
**Why it happens:** Level 3 экрана не существовало, поэтому callback не был нужен.
**How to avoid:** Добавить `onNavigateArticle?: (groupId: string) => void` prop в PointDetailScreen.
Обернуть каждую expenseItem строку в `TouchableOpacity`. Группы уже имеют `groupId` в данных
(`ExpenseGroupDto.groupId`).

### Pitfall 3: Operations endpoint не существует в `dashboardApi`
**What goes wrong:** `dashboardApi` в `src/services/api.ts` не имеет метода для Level 4 operations.
`useArticleDetail` есть, но `useOperations` — нет.
**Why it happens:** Level 4 API не был добавлен когда реализовывались хуки.
**How to avoid:** Добавить `getOperations` в `dashboardApi` и создать `useOperations` hook.
API endpoint существует: `GET /api/finance/article/:id/operations`.

### Pitfall 4: ReportsScreen использует `getDashboard` для всех данных
**What goes wrong:** `useReports.ts` вызывает `dashboardApi.getDashboard()` — это endpoint Level 1.
Реальные reports endpoints (`/reports/dds`, `/reports/company-expenses`, `/reports/kitchen`,
`/reports/trends`) не вызываются.
**Why it happens:** Reports endpoints были добавлены в бэкенд (Phase 4) после мобильного UI.
**How to avoid:** Добавить API методы в `dashboardApi` и переписать `useReports` hook для
использования реальных endpoints. Каждая секция ReportsScreen должна иметь отдельный хук.

### Pitfall 5: `Screen` type не включает новые экраны
**What goes wrong:** TypeScript error при попытке `setScreen('article-detail')`.
**How to avoid:** Обновить union type `Screen` в `src/types/index.ts` ДО создания компонентов.

### Pitfall 6: expo-haptics требует конфигурации в app.json
**What goes wrong:** На Android haptics молча провалится без правильных permissions.
**How to avoid:** `expo-haptics` не требует дополнительной конфигурации в Expo — `npx expo install`
добавит зависимость. Использовать `try/catch` вокруг Haptics вызовов для graceful degradation.

### Pitfall 7: Offline banner — нет встроенного NetInfo в Expo
**What goes wrong:** `@react-native-community/netinfo` требует дополнительной установки.
**How to avoid:** Для MVP офлайн banner достаточно детектировать fetch ошибки (network error vs
API error). Устанавливать NetInfo отдельно если нужно реальное обнаружение сети.

---

## Code Examples

### Level 3 ArticleDetailScreen — структура данных из API
```typescript
// Source: src/types/index.ts (ArticleGroupDetailDto)
interface ArticleGroupDetailDto {
  groupId: string;
  groupName: string;
  period: PeriodDto;
  restaurantId: string;
  restaurantName: string;
  totalAmount: number;
  articles: ArticleIndicatorDto[];  // каждая статья со всеми данными
}

interface ArticleIndicatorDto {
  id: string;
  name: string;
  code: string | null;
  source: 'IIKO' | 'ONE_C';           // пометка источника
  allocationType: 'DIRECT' | 'DISTRIBUTED';  // прямая vs распределённая
  amount: number;
  sharePercent: number;               // доля в расходах точки (%)
  previousPeriodAmount: number;
  changePercent: number;              // сравнение с прошлым периодом
}
```

### Level 4 Operations endpoint — добавить в dashboardApi
```typescript
// Добавить в src/services/api.ts
getOperations: (
  articleId: string,
  restaurantId: string,
  page: number,
  periodType: string,
  dateFrom?: string,
  dateTo?: string,
) => {
  const params = new URLSearchParams({ restaurantId, periodType, page: String(page), limit: '20' });
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  return api.request<OperationsListDto>(`/api/finance/article/${articleId}/operations?${params}`);
},
```

### OperationDto — нужно добавить в types/index.ts
```typescript
// Требуется новый тип (на основе API Gateway контракта)
export interface OperationDto {
  id: string;
  date: string;          // ISO datetime
  amount: number;
  comment: string | null;
  source: 'IIKO' | 'ONE_C';
  allocationCoefficient: number | null;  // null для прямых расходов
}

export interface OperationsListDto {
  operations: OperationDto[];
  total: number;
  page: number;
}
```

### Pull-to-refresh полный паттерн
```typescript
// Source: React Native docs — RefreshControl
const { data, isLoading, refetch } = useArticleDetail(groupId, restaurantId);
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  refetch();
  setRefreshing(false);
}, [refetch]);

// В ScrollView:
refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
```

---

## Что уже сделано (не переделывать)

| Компонент | Файл | Статус |
|-----------|------|--------|
| DashboardScreen | screens/DashboardScreen.tsx | Есть, нужны доработки |
| BrandDetailScreen | screens/BrandDetailScreen.tsx | Готов |
| PointDetailScreen | screens/PointDetailScreen.tsx | Есть, нужны доработки |
| ReportsScreen | screens/ReportsScreen.tsx | Есть, нужны реальные API |
| NotificationsScreen | screens/NotificationsScreen.tsx | Готов |
| PeriodSelector | components/PeriodSelector.tsx | Готов, переиспользовать |
| MonthRangePicker | components/MonthRangePicker.tsx | Готов |
| useApiQuery | hooks/useApi.ts | Готов |
| useDashboardSummary | hooks/useApi.ts | Готов |
| useBrandDetail | hooks/useBrandDetail.ts | Готов |
| useRestaurantDetail | hooks/useApi.ts | Готов |
| useArticleDetail | hooks/useApi.ts | Готов |
| dashboardApi (Levels 1-3) | services/api.ts | Готов |
| useDashboardStore | store/dashboard.ts | Готов |
| useAuthStore | store/auth.ts | Готов |
| Типы Levels 1-3 | types/index.ts | Готовы |

## Что нужно создать

| Компонент/файл | Тип работы | Приоритет |
|----------------|-----------|----------|
| ArticleDetailScreen.tsx + .styles.ts | Новый экран Level 3 | Высокий |
| OperationsScreen.tsx + .styles.ts | Новый экран Level 4 | Высокий |
| Добавить `article-detail`, `operations` в Screen type | Типы | Высокий |
| App.tsx — навигация к Level 3/4 | Изменение | Высокий |
| PointDetailScreen — `onNavigateArticle` prop + TouchableOpacity | Изменение | Высокий |
| dashboardApi.getOperations | Изменение api.ts | Высокий |
| OperationDto, OperationsListDto в types/index.ts | Типы | Высокий |
| useOperations hook | Новый хук | Высокий |
| DashboardScreen — три KPI, lastSyncAt, pull-to-refresh, skeleton | Доработка | Высокий |
| PointDetailScreen — распределённые затраты, финрезультат, недостачи | Доработка | Высокий |
| ReportsScreen — реальные API endpoints (DDS, company, kitchen, trends) | Доработка | Средний |
| SkeletonLoader component | Новый компонент | Средний |
| expo-haptics установить + использовать при навигации и refresh | Новая зависимость | Средний |
| Offline banner (stale data indicator) | Новый компонент | Низкий |
| AsyncStorage persister для React Query | Инфраструктура | Низкий |

---

## API Endpoints Map (все бэкенд-эндпоинты готовы)

| Level | Mobile URL | Backend (через api-gateway) | Роль |
|-------|-----------|---------------------------|------|
| 1 | `/api/finance/dashboard` | finance-service `/dashboard` | Все 3 роли |
| 1b | `/api/finance/brand/:id` | finance-service `/dashboard/brand/:id` | Все 3 роли |
| 2 | `/api/finance/restaurant/:id` | finance-service `/dashboard/restaurant/:id` | Все 3 роли |
| 3 | `/api/finance/article/:groupId?restaurantId=` | finance-service `/dashboard/article/:groupId` | OWNER + FIN_DIR |
| 4 | `/api/finance/article/:id/operations` | finance-service `/dashboard/article/:id/operations` | OWNER only |
| Reports DDS | `/api/finance/reports/dds` | finance-service `/dashboard/reports/dds` | OWNER + FIN_DIR |
| Reports Company | `/api/finance/reports/company-expenses` | finance-service `/dashboard/reports/company-expenses` | OWNER + FIN_DIR |
| Reports Kitchen | `/api/finance/reports/kitchen` | finance-service `/dashboard/reports/kitchen` | Все 3 роли |
| Reports Trends | `/api/finance/reports/trends` | finance-service `/dashboard/reports/trends` | Все 3 роли |

---

## Validation Architecture

> `workflow.nyquist_validation` отсутствует в config.json — секция включена.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (через Expo) |
| Config file | нет отдельного конфига — metro bundler |
| Quick run command | `cd apps/mobile-dashboard && npm test` |
| Full suite command | `cd apps/mobile-dashboard && npm test -- --watchAll=false` |

**Note:** Мобильный проект не имеет Jest тестов в текущей кодовой базе — только `npm test` script
в package.json (проверить наличие). Компоненты UI в React Native сложно тестировать без устройства.
Основная верификация — manual QA на устройстве/симуляторе. Для хуков можно писать unit тесты.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOB-01 | DashboardScreen показывает 3 KPI | Manual QA | Expo на устройстве | N/A |
| MOB-02 | Period switcher обновляет данные | Manual QA | Expo на устройстве | N/A |
| MOB-03 | Level 3 экран загружает статьи | Manual QA | Expo на устройстве | N/A |
| MOB-04 | Level 4 показывается только OWNER | unit | `npm test hooks/useOperations` | ❌ Wave 0 |
| MOB-05 | OPS_DIRECTOR не видит Balance | unit | `npm test hooks/useDashboard` | ❌ Wave 0 |
| MOB-06 | Pull-to-refresh вызывает refetch | unit | `npm test hooks/useApiQuery` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/useDashboard.test.ts` — role-based visibility logic
- [ ] `src/hooks/__tests__/useOperations.test.ts` — covers MOB-04
- [ ] Проверить наличие jest config: если нет — добавить через `npx expo install jest-expo`

---

## Sources

### Primary (HIGH confidence)
- Существующий код `apps/mobile-dashboard/src/` — прочитан весь, актуален
- `apps/mobile-dashboard/src/types/index.ts` — API типы, все DTO проверены
- `apps/mobile-dashboard/src/services/api.ts` — все существующие API методы
- `apps/mobile-dashboard/src/hooks/useApi.ts` — patterns for new hooks
- `.planning/ROADMAP.md` Phase 7 checklist — источник требований

### Secondary (MEDIUM confidence)
- React Native docs (RefreshControl, Animated) — стандартные паттерны
- Expo docs (expo-haptics, expo-secure-store) — официальная документация

### Tertiary (LOW confidence)
- `npm view expo-haptics version` → 55.0.13 (проверено через npm registry)
- `npm view @react-native-async-storage/async-storage version` → 3.0.2

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — весь код прочитан, зависимости известны
- Architecture: HIGH — state-based routing и hook patterns полностью задокументированы из кода
- Pitfalls: HIGH — обнаружены из анализа существующего кода (missing props, missing methods)
- API contracts: HIGH — types/index.ts и api.ts прочитаны полностью

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (стабильная технология)
