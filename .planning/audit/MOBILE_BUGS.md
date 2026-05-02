# Mobile Dashboard Audit — Findings

Scope: `apps/mobile-dashboard/src/`
Date: 2026-05-02
Auditor: Claude (Opus 4.7, 1M context)

---

## Critical

### Critical Bare `fetch('/api/...')` without API_URL — guaranteed failure on native devices
- **File:** `apps/mobile-dashboard/src/hooks/useNotifications.ts:15`
- **Pattern:** ```tsx
const res = await fetch(`/api/notifications?page=${page}&pageSize=${pageSize}`);
if (!res.ok) throw new Error('Failed to fetch notifications');
return res.json();
```
- **Why it's bad:** A relative URL works only inside a browser DOM where `location.origin` resolves; on iOS/Android React Native, `fetch` has no origin and either errors out or hits an undefined host. This breaks the entire notifications panel on real devices, and silently bypasses the auth header / refresh logic in `services/api.ts`.
- **Suggested fix:** Replace with the typed `notificationApi.getNotifications(page, pageSize)` from `services/api.ts` (which already exists at line 274 and routes through `ApiClient` with auth + 401 retry). Drop the duplicated `useNotifications` hook in favour of `useCachedQuery` like every other data hook does.

### Critical Notifications fetched without `Authorization` header
- **File:** `apps/mobile-dashboard/src/hooks/useNotifications.ts:14-19`
- **Pattern:** ```tsx
async () => {
  const res = await fetch(`/api/notifications?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
},
```
- **Why it's bad:** Even if the URL is fixed, this call sends no Bearer token, so the gateway will return 401 and the user always sees an empty notifications screen. There is also no 401-refresh handling.
- **Suggested fix:** Same as above — use `notificationApi.getNotifications()`. The `ApiClient.request()` adds `Authorization: Bearer ${accessToken}` from secure storage and transparently retries on 401 after refresh.

### Critical `services/notifications.ts` ignores HTTP errors entirely
- **File:** `apps/mobile-dashboard/src/services/notifications.ts:6-127`
- **Pattern:** ```tsx
export async function registerPushToken(accessToken, fcmToken) {
  await fetch(`${API_URL}/api/notifications/register-token`, {
    method: 'POST', /* ... */
  });
}
// fetchNotifications / markNotificationRead / fetchNotificationPrefs etc.
// all do `const res = await fetch(...); return res.json();`
```
- **Why it's bad:** None of the eight functions check `res.ok`, so a 500/403/timeout becomes either a silent no-op (for void returns) or a `res.json()` call on an HTML error page that throws a cryptic `SyntaxError`. There is also zero token-refresh on 401, so a stale token permanently breaks the FCM registration flow without any user feedback.
- **Suggested fix:** Either (a) delete this file and route every call through `notificationApi` in `services/api.ts` (preferred — matches the rest of the codebase), or (b) add `if (!res.ok) throw new ApiError(res.status, await res.text())` and integrate the same refresh-on-401 mechanism.

---

## High

### High `useApiQuery` swallows errors with no token-refresh path
- **File:** `apps/mobile-dashboard/src/hooks/useApi.ts:33-54`
- **Pattern:** ```tsx
fetcher()
  .then(result => { ... })
  .catch(err => {
    if (!cancelled) {
      setError(err.message || 'Ошибка загрузки');
      setIsLoading(false);
    }
  });
```
- **Why it's bad:** `useApiQuery` (still used by `useNotifications`) bypasses `ApiClient` entirely, so a 401 will never trigger a refresh and the user is logged out only on the next manual reload. There is no retry, no exponential backoff, no offline cache.
- **Suggested fix:** Migrate the remaining `useApiQuery` consumers to `useCachedQuery` (which itself wraps `dashboardApi`/`notificationApi`). The legacy hook can then be deleted.

### High Push token registration logs `[Push] Token registered` but never throws on backend failure
- **File:** `apps/mobile-dashboard/src/hooks/usePushNotifications.ts:82-83`
- **Pattern:** ```tsx
await registerPushToken(accessToken, fcmToken);
console.log('[Push] Token registered:', fcmToken.slice(0, 20) + '...');
```
- **Why it's bad:** `registerPushToken` does not check `res.ok` (see Critical #3). The `console.log` claims success regardless of whether the gateway returned 401, 500, or timed out. Push notifications will silently never arrive and we will have no telemetry showing who is unregistered.
- **Suggested fix:** Make `registerPushToken` throw on non-2xx, surface failures to Sentry with `Sentry.captureException(e, { tags: { source: 'push_register' } })`, and only log success after a true 2xx response.

### High No timezone conversion when computing period boundaries
- **File:** `apps/mobile-dashboard/src/hooks/useApi.ts:64-113`
- **Pattern:** ```tsx
const today = new Date();
const y = today.getFullYear();
const m = today.getMonth() + 1;
const d = today.getDate();
const toDate = isoDate(y, m, d);
```
- **Why it's bad:** `getPeriodDates` uses the device's local timezone. The project mandates `Asia/Almaty` (UTC+5) per `config.ts:BUSINESS_TIMEZONE`. A user travelling to Europe at 23:00 local time would still be in Almaty's "next day" — period filters silently shift by 24h, and yesterday's revenue rolls into today (or vice versa) for cross-DST-boundary requests.
- **Suggested fix:** Use `date-fns-tz` (`toZonedTime`) — already imported in `utils/brand.ts` for `formatSyncTime` — to compute today/yesterday/week boundaries in `Asia/Almaty`. Pass `BUSINESS_TIMEZONE` from config rather than hardcoding.

### High `clearTokens` on logout doesn't revoke server-side refresh token or unregister push token
- **File:** `apps/mobile-dashboard/src/store/auth.ts:46-49` + `services/auth.ts:90-96`
- **Pattern:** ```tsx
logout: async () => {
  await clearTokens();
  set({ user: null, accessToken: null, isAuthenticated: false });
},
```
- **Why it's bad:** The local tokens are cleared, but the server-side refresh token is not revoked and the FCM token is not unregistered. A stolen refresh token from another device still works after logout, and the server keeps sending push notifications to a phone the user logged out of.
- **Suggested fix:** Before `clearTokens()`, call `unregisterPushToken(accessToken, fcmToken)` (already implemented in `services/notifications.ts:26`) and POST to `/api/auth/logout` (or `/api/auth/revoke`) to invalidate the refresh token server-side.

### High Inactivity timeout uses 10 min hard-coded — no Almaty TZ awareness
- **File:** `apps/mobile-dashboard/src/hooks/useInactivityLogout.ts:4`
- **Pattern:** ```tsx
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
```
- **Why it's bad:** Magic number not exposed in `config.ts`; can't be tuned for staging vs prod or made configurable per-role (Owner might need 30 min, Admin only 5 min). Also: backgrounded app is logged out but never invalidates the refresh token, so resuming and refreshing seamlessly re-authenticates — not a true "logout".
- **Suggested fix:** Move the constant to `config.ts` (e.g. `INACTIVITY_LOGOUT_MS` with override via `EXPO_PUBLIC_INACTIVITY_MIN`). On forced logout, also revoke the refresh token like the High issue above.

### High `OperationsScreen` "Load more" mutates page via `setPage` but `useOperations(articleId, restaurantId, page)` re-fires the whole hook — no append, only replace
- **File:** `apps/mobile-dashboard/src/screens/OperationsScreen.tsx:40-58`
- **Pattern:** ```tsx
const [page, setPage] = useState(1);
const { data, ... } = useOperations(articleId || '', restaurantId || '', page);
const operations = data?.operations ?? [];
const hasMore = operations.length < total;
// ...
const handleLoadMore = useCallback(() => { setPage(p => p + 1); }, []);
```
- **Why it's bad:** When the user taps "Загрузить ещё", `page` increments to 2 → `useOperations` refires with page=2 → `data.operations` becomes ONLY page 2's items (typically 20), not the concatenation of page 1+2. The list visually shrinks. `hasMore` (`< total`) compares the wrong size.
- **Suggested fix:** Either accumulate pages in local state (`const [allOps, setAllOps] = useState<OperationDto[]>([])` and append on each successful fetch), or replace with `FlatList` + `onEndReached` pagination using cursor-based React Query `useInfiniteQuery`.

### High Sparkline crashes on `parseInt(undefined, 10)` for malformed dates
- **File:** `apps/mobile-dashboard/src/components/RevenueSparkline.tsx:36-42`
- **Pattern:** ```tsx
function formatShortDate(dateStr: string): string {
  const isoDate = dateStr.slice(0, 10);
  const [, m, d] = isoDate.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return dateStr;
  return `${parseInt(d, 10)} ${RU_MONTHS_SHORT[monthIdx]}`;
}
```
- **Why it's bad:** If the API returns a date like `"2026/04/27"` or `"April 27"`, `m` becomes `undefined` → `parseInt(undefined, 10)` returns `NaN` → `NaN - 1 < 0` → falls back to original `dateStr` (good). But if the format is `"2026-4-7"` (single-digit month/day), the slice and split still work but `parseInt` succeeds with garbage. Defensive but the input contract is undefined.
- **Suggested fix:** Document the expected input format (ISO `YYYY-MM-DD` only) at the type level (`date: ISODateString`) and add a runtime guard: `if (!/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return dateStr;`.

---

## Medium

### Medium `excludeTodayPartial` uses local-device timezone, not Asia/Almaty
- **File:** `apps/mobile-dashboard/src/utils/sparkline.ts:22-28`
- **Pattern:** ```tsx
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```
- **Why it's bad:** A user in UTC+0 at 21:00 sees `today = 2026-05-02`, but the backend (Almaty time) is already on `2026-05-03`. The "exclude today partial" filter targets the wrong row, leaving an actual partial day on the chart.
- **Suggested fix:** Compute today in `Asia/Almaty` via `toZonedTime(new Date(), BUSINESS_TIMEZONE)` and format from that. Same fix needed in `useSparklineRevenue.ts:33-43` (`getPeriodDates` fallback).

### Medium `useDashboard.handleRefresh` uses `setTimeout` for spinner instead of awaiting refetch
- **File:** `apps/mobile-dashboard/src/hooks/useDashboard.ts:104-112`
- **Pattern:** ```tsx
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    refetch();
  } finally {
    setTimeout(() => setIsRefreshing(false), 600);
  }
}, [refetch]);
```
- **Why it's bad:** `refetch()` from `useCachedQuery` only triggers a key bump; it does not return a promise. The 600ms `setTimeout` masks this with a fake spinner that always lasts exactly 600 ms regardless of network speed. If the user pulls to refresh on a slow connection, the spinner disappears while the request is still in flight; on a fast one, the spinner blocks for 600 ms unnecessarily.
- **Suggested fix:** Make `useCachedQuery.refetch` return `Promise<void>` that resolves after the next fetch settles. Then `await refetch()` and clear `isRefreshing` exactly when the data arrives.

### Medium `useCachedQuery` cache writes happen without size limit — risk of unbounded AsyncStorage growth
- **File:** `apps/mobile-dashboard/src/hooks/useOfflineCache.ts:57-62`
- **Pattern:** ```tsx
await AsyncStorage.setItem(fullKey, JSON.stringify({ data: result, cachedAt: now }));
```
- **Why it's bad:** Every period switch + brand drill-down writes a new key. Over weeks, AsyncStorage accumulates dozens of MB; on Android there is a 6 MB hard limit per key for older API levels, and total storage size is not enforced. There is no LRU cleanup or TTL eviction.
- **Suggested fix:** Add a `cleanupOldCacheEntries()` job that runs on app boot, dropping entries older than 30 days. Cap individual entry size at e.g. 200 KB; if larger, drop the cache write and only return live data.

### Medium `usePushNotifications` swallows errors with `console.error` — no Sentry
- **File:** `apps/mobile-dashboard/src/hooks/usePushNotifications.ts:84-86`
- **Pattern:** ```tsx
} catch (e) {
  console.error('[Push] Registration failed:', e);
}
```
- **Why it's bad:** No Sentry breadcrumb / capture, so when push fails in production we have no record. Project already uses Sentry (`__mocks__/@sentry/react-native.ts`, `SettingsScreen.tsx:169`), but this hook doesn't import it.
- **Suggested fix:** `Sentry.captureException(e, { tags: { source: 'push_register' }, extra: { isExpoGo: IS_EXPO_GO } })` inside the catch.

### Medium FlatList not used for restaurant lists — performance risk at 75+ points
- **File:** `apps/mobile-dashboard/src/screens/PointsScreen.tsx:181-200`, `screens/SearchScreen.tsx:134-152`, `screens/DashboardScreen.tsx:313-332`, `screens/BrandDetailScreen.tsx:184-202`
- **Pattern:** ```tsx
<ScrollView ...>
  {sorted.map(r => (
    <RestaurantCard key={r.id} ... onPress={() => onPointSelect(r.id)} />
  ))}
</ScrollView>
```
- **Why it's bad:** Each `<RestaurantCard>` mounts immediately, with three sub-views (header, plan-bar, footer) plus icons. With 13 brands and 75+ points loaded into one screen, all are rendered even when 90% are off-screen. ScrollView keeps every node in memory; FlatList virtualises.
- **Suggested fix:** Replace each `ScrollView`+`map` with `FlatList` (`data={sorted}`, `keyExtractor={r => r.id}`, `renderItem={({item}) => <RestaurantCard ... />}`). For mixed content (header + list + footer), use `ListHeaderComponent` and `ListFooterComponent`.

### Medium Inline arrow functions on every render in lists trigger unnecessary RestaurantCard re-renders
- **File:** `apps/mobile-dashboard/src/screens/DashboardScreen.tsx:330`
- **Pattern:** ```tsx
onPress={() => onNavigateBrand ? onNavigateBrand(r.id, r.name) : onPointSelect(r.id)}
```
- **Why it's bad:** Every render creates a fresh function for every card; React.memo on `RestaurantCard` (if added) would never hit because props differ each render. Same problem in `BrandDetailScreen.tsx:200`, `PointsScreen.tsx:198`, `SearchScreen.tsx:150`, `LegalEntityDetailScreen.tsx:158`.
- **Suggested fix:** Extract list items to a memoised child component that receives `id` + a stable callback (`useCallback` upstream): `const handlePressById = useCallback((id) => ..., [])`. Or use `FlatList`'s built-in `extraData` + `keyExtractor` to limit re-renders.

### Medium `<View style={{ flex: 1 }}>` etc. on every render — inline style objects
- **File:** `apps/mobile-dashboard/src/screens/DashboardScreen.tsx:138`, `PointDetailScreen.tsx:214`, `BrandDetailScreen.tsx:90`, `LegalEntityDetailScreen.tsx:76`, etc.
- **Pattern:** ```tsx
<View style={{ flex: 1, backgroundColor: colors.bg }}>
```
- **Why it's bad:** Each render allocates a new style object. RN style diffing has to deep-equal it. Cheap individually, but multiplied across 8 screens with deep trees it adds measurable jank when navigating.
- **Suggested fix:** Move to `StyleSheet.create({ rootContainer: { flex: 1, backgroundColor: colors.bg } })` once per file, or to a shared `styles.fillBg` token.

### Medium `useRestaurantList` uses `eslint-disable-next-line react-hooks/exhaustive-deps` to hide unstable deps
- **File:** `apps/mobile-dashboard/src/hooks/useRestaurantList.ts:126,150`
- **Pattern:** ```tsx
}, [query, brandId, brands, b0.data, b1.data, b2.data, b3.data, b4.data]); // eslint-disable-line react-hooks/exhaustive-deps
```
- **Why it's bad:** Suppressing the lint rule indicates the deps array is incomplete. `mapRestaurant` references `brandResults` and `brands` but only `b0..b4.data` are listed; if any brand metadata changes without `data` changing, `filtered` gets stale.
- **Suggested fix:** Either inline the 5 mapper calls so all hook returns are dependencies, or hoist `mapRestaurant` to use only its arguments and add the missing deps. Avoid disabling the rule.

### Medium User-visible Russian strings hard-coded — no i18n usage despite ru/kk files
- **File:** Almost every screen + `services/auth.ts:45,59`, `services/biometric.ts:42,47-49`, `useDashboard.ts:41-44`, `Settings/Profile/Login` screens.
- **Pattern:** ```tsx
Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [...]);
// ...
const greeting = hour < 12 ? 'Доброе утро' : ...;
// ...
throw new Error(data?.message ?? 'Ошибка отправки кода');
```
- **Why it's bad:** Project has `i18n/index.ts` initialised with `ru` and `kk` resources but every screen ignores `useTranslation()`. Kazakh users see Russian; future agency localisation requires touching every file.
- **Suggested fix:** Wrap user-visible strings with `t('logout.title')` etc. and populate `i18n/ru.ts` + `i18n/kk.ts`. Add a CI check that flags new Cyrillic literals outside `i18n/`.

### Medium `RevenueDetailScreen` "Повторить" button onPress passes the function reference directly — no haptics consistency
- **File:** `apps/mobile-dashboard/src/screens/RevenueDetailScreen.tsx:288`
- **Pattern:** ```tsx
<TouchableOpacity onPress={refetch} ... >
  <Text style={...}>Повторить</Text>
</TouchableOpacity>
```
- **Why it's bad:** Every other refresh action in the codebase (`PointDetailScreen.tsx:196`, `BrandDetailScreen.tsx:69`) uses `await Haptics.impactAsync(...)` for tactile feedback. Inconsistent UX.
- **Suggested fix:** Wrap in a stable `handleRetry = useCallback(async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refetch(); }, [refetch])`.

### Medium `usePointDetail` has stale-data risk: useMemo deps include `restaurantId` but data is fetched by `useRestaurantDetail(restaurantId || '')`
- **File:** `apps/mobile-dashboard/src/hooks/usePointDetail.ts:140`
- **Pattern:** ```tsx
}, [restaurantId, restaurantDetail, isLoading, error]);
```
- **Why it's bad:** `restaurantId` is in deps but `restaurantDetail` is the actual dependency; passing `''` to `useRestaurantDetail` likely fires a request to `/api/finance/restaurant/?...`, which could 404 or fail.
- **Suggested fix:** Wrap `useRestaurantDetail(restaurantId)` to early-return when `restaurantId == null`, or pass `{ enabled: !!restaurantId }` like `useBrandDetail` does.

### Medium Multiple `.map((p: any) => ...)` callbacks bypass type safety
- **File:** `apps/mobile-dashboard/src/services/api.ts:264-265`
- **Pattern:** ```tsx
const avgRevenue = raw.avgRevenue ?? points.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0) / count;
const avgExpenses = raw.avgExpenses ?? points.reduce((s: number, p: any) => s + (p.expenses ?? 0), 0) / count;
```
- **Why it's bad:** `any` defeats compile-time guarantees. `raw` is also typed `any` (line 261) — a server-side rename of `revenue → totalRevenue` would silently produce `NaN` averages.
- **Suggested fix:** Type the response as `Partial<ReportTrendsDto> & { points?: ReportTrendsPointDto[] }` and let TypeScript narrow.

### Medium `data/restaurants.ts` — likely stale mock data shipping in production bundle
- **File:** `apps/mobile-dashboard/src/data/restaurants.ts` (file exists per Glob output; not verified whether it's imported)
- **Pattern:** unknown — but based on file naming convention (Restaurants-13-mock data is mentioned in TZ).
- **Why it's bad:** Dead/mock data files in `src/` get bundled in the production app, growing IPA/APK size. If accidentally imported by a screen, fake data overrides real data on cold start.
- **Suggested fix:** Either delete (if not imported) or move under `__mocks__/` (already exists per Glob) so Metro can tree-shake it out of release builds.

### Medium `RevenueDetailScreen.styles` & `BrandDetailScreen.styles` use literal numbers instead of theme tokens
- **File:** `apps/mobile-dashboard/src/screens/RevenueDetailScreen.tsx:131-153` (heroSparkWrap inline styles), and many sibling style files
- **Pattern:** ```tsx
<Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4 }}>
```
- **Why it's bad:** Direct color literals bypass `colors.text.tertiary` etc. tokens. A design-system theme switch (light/dark) would miss these. Hard to grep for "all uses of textTertiary".
- **Suggested fix:** Replace literals with theme tokens (`colors.textTertiary`, `colors.textSecondary`, `theme.spacing.xs`, etc.). Add an ESLint rule (`react-native/no-color-literals`) to enforce.

---

## Low

### Low `getGreeting()` uses device-local hour — wrong for users outside Asia/Almaty
- **File:** `apps/mobile-dashboard/src/hooks/useDashboard.ts:39-45`
- **Pattern:** ```tsx
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  ...
}
```
- **Why it's bad:** A KEX manager in Dubai at 23:00 local sees "Добрый вечер", but the dashboard shows Almaty data where it's 02:00 (after midnight). Greeting should match the business locale.
- **Suggested fix:** `const hour = toZonedTime(new Date(), BUSINESS_TIMEZONE).getHours();`.

### Low `formatPeriodLabel` — `getMonth()` accessed without TZ
- **File:** `apps/mobile-dashboard/src/utils/brand.ts:185-202`
- **Pattern:** ```tsx
const fromDate = new Date(from);
const toDate = new Date(to);
... fromDate.getMonth() ... toDate.getMonth() ...
```
- **Why it's bad:** `new Date('2026-04-01')` is interpreted as UTC midnight; `getMonth()` returns local month. Cross-timezone, "1 апр" can appear as "31 мар". Same TZ bug as elsewhere.
- **Suggested fix:** Wrap in `toZonedTime(date, BUSINESS_TIMEZONE)` before reading components.

### Low `MonthRangePicker` and `DayRangePicker` use `new Date()` for `today` — same TZ flaw
- **File:** `apps/mobile-dashboard/src/components/MonthRangePicker.tsx:36`, `DayRangePicker.tsx:55-60`
- **Pattern:** ```tsx
const today: MonthYear = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
```
- **Why it's bad:** Disables future-day clicks based on device clock, not Almaty. Could silently allow selecting tomorrow if user is in Europe at 21:00 (still "today" in Europe but already "tomorrow" in Almaty).
- **Suggested fix:** Use `toZonedTime(new Date(), 'Asia/Almaty')`.

### Low `LegalEntityCard.parseEntityName` regex can fail on edge cases
- **File:** `apps/mobile-dashboard/src/components/LegalEntityCard.tsx:48-55`
- **Pattern:** ```tsx
const too = s.match(/^(ТОО|TOO)\s*[«"„]?\s*(.+?)\s*[»""]?$/i);
```
- **Why it's bad:** The character class `[»""]` includes a smart-quote pair but the corresponding open quote `"` is also valid. Some iiko names use `"` ASCII quotes only — regex might leave a trailing `"` in the display name.
- **Suggested fix:** `[»"„""']?` — add ASCII quote and apostrophe to both open and close char classes.

### Low `Notifications.setNotificationHandler` uses both deprecated and new keys
- **File:** `apps/mobile-dashboard/src/hooks/usePushNotifications.ts:12-20`
- **Pattern:** ```tsx
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // SDK 53: deprecated
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,   // SDK 53: replaces shouldShowAlert
    shouldShowList: true,
  }),
});
```
- **Why it's bad:** `shouldShowAlert` is the legacy iOS-only key; `shouldShowBanner` + `shouldShowList` is the SDK 53+ replacement. Setting both is harmless today but log-noisy and might warn in future SDKs.
- **Suggested fix:** Pick one set based on `expo-notifications` version pinned in `package.json`. Comment why.

### Low Hard-coded color hex strings in chart components instead of theme
- **File:** `apps/mobile-dashboard/src/components/Chart.tsx:42-49`
- **Pattern:** ```tsx
const BAR_COLORS = {
  aboveAvg: '#2563EB',
  belowAvg: '#1D4ED8',
  active:   '#60A5FA',
  zero:     '#475569',
  critical: '#EF4444',
  loading:  '#1E293B',
};
```
- **Why it's bad:** Chart-specific palette duplicates `colors.accentDefault`, `colors.red`, etc. from the theme. A color-system change in `theme/colors.ts` won't propagate.
- **Suggested fix:** Reference `colors.accentDefault` etc. from `theme/index.ts`.

### Low `inputRef` autofocus delay of 250ms is arbitrary
- **File:** `apps/mobile-dashboard/src/screens/SearchScreen.tsx:43-46`
- **Pattern:** ```tsx
useEffect(() => {
  const t = setTimeout(() => inputRef.current?.focus(), 250);
  return () => clearTimeout(t);
}, []);
```
- **Why it's bad:** 250ms is a guess. On a slower device, the input may not yet be mounted; on a faster one, it's unnecessary delay. The cleanup is correct, but the timer is brittle.
- **Suggested fix:** Use `autoFocus` prop on `<TextInput>` directly (RN handles this correctly) and remove the timer. If autoFocus doesn't work due to navigation transitions, use `requestAnimationFrame` once.

### Low `Notifications setNotificationChannelAsync` color is omitted
- **File:** `apps/mobile-dashboard/src/hooks/usePushNotifications.ts:64-68`
- **Pattern:** ```tsx
await Notifications.setNotificationChannelAsync('default', {
  name: 'KEX Group',
  importance: Notifications.AndroidImportance.HIGH,
  sound: 'default',
});
```
- **Why it's bad:** No `lightColor` or `vibrationPattern` set; Android shows generic system styling. Missed branding opportunity.
- **Suggested fix:** Add `lightColor: '#2563EB'` and `vibrationPattern: [0, 250, 250, 250]` to match brand.

### Low `ProfileScreen` is a near-duplicate of `SettingsScreen` — code duplication
- **File:** `apps/mobile-dashboard/src/screens/ProfileScreen.tsx:43-95` vs `SettingsScreen.tsx:317-351`
- **Pattern:** Both render the same `NOTIF_ROWS` toggles with the same `useNotificationPrefs` hook, slightly different StyleSheets.
- **Why it's bad:** Two places to maintain notification preferences UI. A new notification type added to one screen won't appear in the other.
- **Suggested fix:** Extract a `<NotificationPrefsCard />` component that both screens render. Or remove `ProfileScreen` entirely if `SettingsScreen` supersedes it (unclear from the navigation).

### Low Magic number `3600000` (= 1 hour) used as stale threshold without constant
- **File:** `apps/mobile-dashboard/src/hooks/useOfflineCache.ts:74`, `screens/DashboardScreen.tsx:237`
- **Pattern:** ```tsx
setIsStale(age > 3600000); // > 1 hour
// ...
const syncStale = (Date.now() - new Date(lastSyncAt).getTime()) > 3600000;
```
- **Why it's bad:** Same constant in two places; either value can drift. Comment says `> 1 hour` but the magic number is opaque.
- **Suggested fix:** `const STALE_THRESHOLD_MS = 60 * 60 * 1000;` in `config.ts`, imported by both.

---

## Summary

**File:** `D:/kexgroupapp/.planning/audit/MOBILE_BUGS.md`
