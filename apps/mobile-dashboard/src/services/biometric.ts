import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'kex_biometric_enabled';

// ─── Проверка доступности биометрии ────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function getBiometricType(): Promise<'faceid' | 'fingerprint' | 'iris' | null> {
  if (Platform.OS === 'web') return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'faceid';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return null;
}

// ─── Настройки биометрии (включено/выключено) ───────────────────────────────

export async function isBiometricEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

// ─── Запрос биометрической аутентификации ───────────────────────────────────

export async function authenticateWithBiometric(
  promptMessage = 'Подтвердите личность для входа',
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Использовать код',
      cancelLabel: 'Отмена',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Пользователь отменил или ошибка
    const errType = result.error;
    if (errType === 'user_cancel' || errType === 'system_cancel') {
      return { success: false, error: 'cancel' };
    }
    if (errType === 'lockout' || (errType as string) === 'lockout_permanent') {
      return { success: false, error: 'lockout' };
    }
    return { success: false, error: errType };
  } catch {
    return { success: false, error: 'unknown' };
  }
}
