import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from '../config';
import type { User } from '../types';

const KEYS = {
  accessToken:  'kex_access_token',
  refreshToken: 'kex_refresh_token',
  user:         'kex_user',
};

// SecureStore не работает на web — используем localStorage fallback
const storage = {
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// ─── API calls ────────────────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? 'Ошибка отправки кода');
  return data;
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? 'Неверный код');
  return data;
}

// ─── Token storage ────────────────────────────────────────────────────────────

export async function saveTokens(accessToken: string, refreshToken: string, user: User) {
  await Promise.all([
    storage.set(KEYS.accessToken, accessToken),
    storage.set(KEYS.refreshToken, refreshToken),
    storage.set(KEYS.user, JSON.stringify(user)),
  ]);
}

export async function getStoredTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}> {
  const [accessToken, refreshToken, userJson] = await Promise.all([
    storage.get(KEYS.accessToken),
    storage.get(KEYS.refreshToken),
    storage.get(KEYS.user),
  ]);
  return {
    accessToken,
    refreshToken,
    user: userJson ? (JSON.parse(userJson) as User) : null,
  };
}

export async function clearTokens() {
  await Promise.all([
    storage.remove(KEYS.accessToken),
    storage.remove(KEYS.refreshToken),
    storage.remove(KEYS.user),
  ]);
}

// Re-export User type from central types
export type { User } from '../types';
