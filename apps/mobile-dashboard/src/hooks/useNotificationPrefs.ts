import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import {
  NotificationPref,
  fetchNotificationPrefs,
  updateNotificationPref,
} from '../services/notifications';

export function useNotificationPrefs() {
  const { accessToken } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchNotificationPrefs(accessToken);
        if (!cancelled) setPrefs(data);
      } catch (e) {
        console.error('[NotifPrefs] fetch failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  const toggle = useCallback(async (type: string, enabled: boolean) => {
    if (!accessToken) return;
    // Optimistic update
    setPrefs(prev => prev.map(p => p.type === type ? { ...p, enabled } : p));
    try {
      await updateNotificationPref(accessToken, type, enabled);
    } catch (e) {
      // Revert on error
      setPrefs(prev => prev.map(p => p.type === type ? { ...p, enabled: !enabled } : p));
      console.error('[NotifPrefs] toggle failed:', e);
    }
  }, [accessToken]);

  return { prefs, loading, toggle };
}
