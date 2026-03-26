import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { registerPushToken } from '../services/notifications';

/**
 * Hook для регистрации push-уведомлений через Expo Notifications.
 *
 * Требует установки expo-notifications и expo-device:
 *   npx expo install expo-notifications expo-device
 *
 * Регистрирует FCM token на бэкенде после логина.
 */
export function usePushNotifications(accessToken: string | null) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import — avoid crash if expo-notifications not installed yet
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

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

        // Get push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });

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
