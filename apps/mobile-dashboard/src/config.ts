import { Platform } from 'react-native';

/**
 * API_URL — базовый URL для запросов к backend.
 *
 * Используем Expo env переменную EXPO_PUBLIC_API_URL из .env.
 * Fallback:
 * - Android эмулятор: 10.0.2.2 (хост машина)
 * - iOS симулятор / Expo Web: localhost
 * - Физическое устройство (Expo Go): укажи LAN IP в .env
 */
const getDefaultApiUrl = (): string => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || getDefaultApiUrl();

/** Таймаут запросов в мс */
export const REQUEST_TIMEOUT = 15_000;

/** Часовой пояс для бизнес-дат */
export const BUSINESS_TIMEZONE = 'Asia/Almaty';

/** Валюта */
export const CURRENCY_SYMBOL = '₸';
export const CURRENCY_CODE = 'KZT';

/** Support contact (env-overridable for white-label/staging builds) */
export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@kexgroup.kz';

/** Auto-logout after N minutes in background. Env-overridable for SecOps tuning. */
export const INACTIVITY_TIMEOUT_MS =
  Number(process.env.EXPO_PUBLIC_INACTIVITY_MIN ?? '10') * 60 * 1000;
