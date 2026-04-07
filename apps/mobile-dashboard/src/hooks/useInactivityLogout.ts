import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function useInactivityLogout(
  isAuthenticated: boolean,
  onLogout: () => Promise<void>,
): void {
  const backgroundTimestamp = useRef<number | null>(null);
  const stableLogout = useCallback(onLogout, [onLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now();
      } else if (nextState === 'active') {
        const ts = backgroundTimestamp.current;
        backgroundTimestamp.current = null;
        if (ts !== null && Date.now() - ts > INACTIVITY_TIMEOUT_MS) {
          void stableLogout();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, stableLogout]);
}
