import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
  isOffline: boolean;
  cachedAt: number | null;
  refetch: () => void;
}

const CACHE_PREFIX = 'hv_cache_';

export function useCachedQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): CachedResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fullKey = CACHE_PREFIX + cacheKey;

    fetcher()
      .then(async (result) => {
        if (cancelled) return;
        setData(result);
        setIsLoading(false);
        setIsStale(false);
        setIsOffline(false);
        const now = Date.now();
        setCachedAt(now);
        // Cache the result
        try {
          await AsyncStorage.setItem(fullKey, JSON.stringify({ data: result, cachedAt: now }));
        } catch {
          // Cache write failure is non-critical
        }
      })
      .catch(async (err) => {
        if (cancelled) return;
        // Try to load from cache
        try {
          const cached = await AsyncStorage.getItem(fullKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setData(parsed.data);
            setCachedAt(parsed.cachedAt);
            const age = Date.now() - parsed.cachedAt;
            setIsStale(age > 3600000); // > 1 hour
            setIsOffline(true);
            setIsLoading(false);
            return;
          }
        } catch {
          // Cache read failure
        }
        setError(err.message || 'Ошибка загрузки');
        setIsLoading(false);
        setIsOffline(true);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, cacheKey, ...deps]);

  return { data, isLoading, error, isStale, isOffline, cachedAt, refetch };
}
