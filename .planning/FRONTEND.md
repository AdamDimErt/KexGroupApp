# Frontend Plan — Mobile Dashboard

**Стек:** React Native 0.81 + Expo 54 + TypeScript
**API:** api-gateway на `http://localhost:3000` (dev) / `https://api.kexgroup.kz` (prod)
**Статус:** UI-макеты готовы, API не подключён, навигация через useState (временная)

---

## Спринт 1 — Фундамент (делаем прямо сейчас)

### 1.1 Установить зависимости

```bash
npx expo install @tanstack/react-query zustand axios
```

Больше ничего не нужно — `expo-secure-store`, `@react-navigation/*` уже установлены.

### 1.2 Структура папок

```
src/
├── api/
│   ├── client.ts          # axios instance + JWT interceptor + refresh logic
│   └── auth.ts            # функции: sendOtp, verifyOtp, getMe, refresh
├── store/
│   └── auth.store.ts      # Zustand: токены, user, isAuthed, actions
├── navigation/
│   ├── RootNavigator.tsx  # Stack: Auth vs App
│   ├── AuthNavigator.tsx  # Stack: PhoneScreen → OtpScreen
│   └── AppNavigator.tsx   # BottomTabs: Dashboard, Points, Reports, Notifications
├── screens/               # уже есть, рефакторим
│   ├── auth/
│   │   ├── PhoneScreen.tsx    # разбиваем LoginScreen на 2
│   │   └── OtpScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── PointsScreen.tsx
│   ├── PointDetailScreen.tsx
│   ├── ReportsScreen.tsx
│   └── NotificationsScreen.tsx
├── hooks/
│   └── useAuth.ts         # useQuery для /auth/me, авто-рефреш
├── components/            # уже есть
└── theme/                 # уже есть
```

### 1.3 API клиент (`src/api/client.ts`)

- Базовый URL из `process.env.EXPO_PUBLIC_API_URL`
- Интерцептор запроса: добавляет `Authorization: Bearer <token>` из Zustand store
- Интерцептор ответа: на 401 → вызывает `POST /auth/refresh` → повторяет запрос → если refresh тоже 401 → logout

### 1.4 Zustand Auth Store (`src/store/auth.store.ts`)

```typescript
interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserDto | null
  isLoading: boolean  // проверка токена при старте

  // actions
  login(data: AuthSuccessDto): Promise<void>   // сохраняет в SecureStore
  logout(): Promise<void>                       // чистит SecureStore
  loadFromStorage(): Promise<void>              // вызывается при старте приложения
  setTokens(access: string, refresh: string): void
}
```

### 1.5 Навигация (`src/navigation/`)

```
RootNavigator
├── если isLoading    → SplashScreen (ActivityIndicator)
├── если !isAuthed    → AuthNavigator (Stack)
│   ├── PhoneScreen
│   └── OtpScreen
└── если isAuthed     → AppNavigator (BottomTabs)
    ├── DashboardScreen
    ├── PointsScreen
    ├── ReportsScreen
    └── NotificationsScreen
```

### 1.6 Экраны авторизации

**PhoneScreen:**
- Поле телефона с маской `+7 (___) ___-__-__`
- Кнопка "Получить код" → `POST /auth/send-otp` → переход на OtpScreen
- Передаёт телефон через navigation params

**OtpScreen:**
- 6 полей (не 4!) — исправить
- Таймер обратного отсчёта 60 сек для повтора
- Кнопка "Отправить снова" (активна после таймера)
- При вводе 6 цифры → автоматически `POST /auth/verify-otp`
- Успех → `store.login(data)` → навигация переключится автоматически

### 1.7 Автологин при старте

В `App.tsx` или `RootNavigator.tsx`:
```typescript
useEffect(() => {
  store.loadFromStorage()  // читает SecureStore, проверяет токен
}, [])
```

`loadFromStorage`:
1. Читает токены из SecureStore
2. Если есть → пытается `GET /auth/me`
3. Успех → сохраняет user в store → isAuthed = true
4. 401 → пытается refresh → если ок → повторяет me → иначе logout

---

## Спринт 2 — Дашборд с реальными данными

> ⚠️ Зависит от Finance Service (Этап 4). Делаем после него.

### 2.1 API функции для finance

```typescript
// src/api/finance.ts
getDashboardSummary(period: Period): Promise<DashboardSummaryDto>
getCompanyDetails(companyId: string, period: Period): Promise<CompanyDetailsDto>
getRestaurantDetails(restaurantId: string, period: Period): Promise<RestaurantDetailsDto>
```

### 2.2 React Query хуки

```typescript
// src/hooks/useDashboard.ts
useDashboardSummary(period)     // кэш 60 сек, фоновый рефетч
useCompanyDetails(id, period)   // кэш 30 сек
useRestaurantDetails(id, period)
```

### 2.3 DashboardScreen — реальные данные

- Убрать импорт `../data/restaurants` (захардкоженные данные)
- Подключить `useDashboardSummary`
- Скелетон-лоадер пока грузится
- Pull-to-refresh (`refreshControl`)
- Индикатор "обновлено X минут назад" (`lastSyncAt` из DTO)
- Индикатор "данные устарели" если `lastSyncAt` > 1 часа назад (красный)

### 2.4 Переключатель периодов

Компонент `PeriodSelector`:
- Сегодня / Эта неделя / Этот месяц / Прошлый месяц / Свой диапазон
- При смене периода → инвалидация React Query кэша → новый запрос

### 2.5 PointDetailScreen — реальные данные

- Получает `restaurantId` через navigation params
- Подключает `useRestaurantDetails`
- Показывает выручку по типам оплат (Наличные / Kaspi / Halyk / Яндекс)
- Расходы, распределённые затраты, финрезультат

---

## Спринт 3 — Офлайн и полировка

### 3.1 Офлайн кэш

- React Query + `AsyncStorage` как persister (через `@tanstack/query-async-storage-persister`)
- При отсутствии сети — показывает закэшированные данные
- Баннер "Нет соединения, данные от ЧЧ:ММ"

### 3.2 PIN/биометрия (по ТЗ)

- После логина предлагает настроить PIN или Face ID / Touch ID
- Использует `expo-local-authentication`
- Хранит флаг в SecureStore: `biometrics_enabled`
- При следующем запуске: если токен валиден + биометрия включена → показывает биометрический запрос

### 3.3 Автовыход при неактивности

- `AppState` listener — отслеживает переход в background
- Если в background > N минут (настройка) → logout
- N по умолчанию: 30 минут

### 3.4 Анимации и UX

- Skeleton loader вместо ActivityIndicator
- Анимация перехода между экранами (уже есть в react-navigation)
- Haptic feedback на кнопках (`expo-haptics`)

---

## Технические решения

| Вопрос | Решение |
|--------|---------|
| Хранение токенов | `expo-secure-store` (не AsyncStorage — небезопасно) |
| Стейт авторизации | Zustand (легкий, без boilerplate) |
| Кэш запросов | TanStack Query v5 |
| HTTP клиент | Axios (interceptors для refresh) |
| Навигация | React Navigation v7 (Stack + BottomTabs) |
| Офлайн кэш | TanStack Query persister + AsyncStorage |
| Биометрия | expo-local-authentication |
| Env переменные | `EXPO_PUBLIC_API_URL` в `.env` |

---

## ENV файл

```env
# apps/mobile-dashboard/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

> ⚠️ Для Expo используй IP локальной машины, не `localhost` — телефон и компьютер в одной сети.

---

## Приоритеты

```
🔴 Блокирует всё:
  → Спринт 1 целиком (навигация + API клиент + авторизация)

🟡 Нужно для демо клиенту:
  → Спринт 2.1–2.3 (дашборд с реальными данными)
  → Спринт 2.4 (переключатель периодов)

🟢 Можно позже:
  → Офлайн кэш
  → Биометрия
  → Автовыход
  → Анимации
```
