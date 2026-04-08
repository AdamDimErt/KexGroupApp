import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerPushToken } from '../services/notifications';

// Set foreground handler ONCE at module level — must be before any Notifications API calls
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook для регистрации push-уведомлений через Expo Notifications.
 *
 * Использует нативный FCM/APNS токен (getDevicePushTokenAsync),
 * не Expo proxy токен. tokenData.data — raw FCM/APNS token string.
 */
export function usePushNotifications(accessToken: string | null) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        // Must be a physical device
        if (!Device.isDevice) {
          console.log('[Push] Simulator detected — skipping registration');
          return;
        }

        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[Push] Permission denied');
          return;
        }

        // Android channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'KEX Group',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }

        // Get native FCM/APNS push token (not Expo proxy token)
        // tokenData.type === 'fcm' on Android, 'ios' on iOS
        // tokenData.data === raw FCM/APNS token string for direct FCM HTTP v1
        const tokenData = await Notifications.getDevicePushTokenAsync();

        if (cancelled) return;

        const fcmToken = tokenData.data;
        tokenRef.current = fcmToken;

        // Register on backend
        await registerPushToken(accessToken, fcmToken);
        console.log('[Push] Token registered:', fcmToken.slice(0, 20) + '...');
      } catch (e) {
        console.error('[Push] Registration failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return tokenRef;
}
