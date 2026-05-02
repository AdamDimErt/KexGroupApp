import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  LogOut,
  Fingerprint,
  Smile,
  Eye,
  Bell,
  Clock,
  Info,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { colors } from '../theme';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { useAuthStore } from '../store/auth';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  getBiometricType,
} from '../services/biometric';
import { useDashboardStore, type PeriodType } from '../store/dashboard';
import { SUPPORT_EMAIL } from '../config';

// Persist default period across app launches.
export const DEFAULT_PERIOD_KEY = 'kex_default_period';

type DefaultPeriod = Extract<PeriodType, 'today' | 'thisWeek' | 'thisMonth'>;

const DEFAULT_PERIOD_OPTIONS: { value: DefaultPeriod; label: string }[] = [
  { value: 'today',     label: 'Сегодня' },
  { value: 'thisWeek',  label: 'Неделя'  },
  { value: 'thisMonth', label: 'Месяц'   },
];

interface NotifRowDef {
  type: string;
  title: string;
  description: string;
}

const NOTIF_ROWS: NotifRowDef[] = [
  {
    type: 'SYNC_FAILURE',
    title: 'Ошибки синхронизации',
    description: 'Синхронизация iiko / 1C не идёт более часа',
  },
  {
    type: 'LOW_REVENUE',
    title: 'Низкая выручка',
    description: 'Точка ниже 70% от среднего за 30 дней',
  },
  {
    type: 'LARGE_EXPENSE',
    title: 'Крупные расходы',
    description: 'Расход выше порогового значения',
  },
  {
    type: 'DAILY_SUMMARY',
    title: 'Ежедневная сводка',
    description: 'Сводка за прошедший день в 09:00 Алматы',
  },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN:               'Администратор',
  OWNER:               'Владелец',
  FINANCE_DIRECTOR:    'Фин. директор',
  OPERATIONS_DIRECTOR: 'Опер. директор',
};

interface SettingsScreenProps {
  onBack?: () => void;        // optional — when reached as tab, no back btn
  onLogout: () => void;
}

export function SettingsScreen({ onBack, onLogout }: SettingsScreenProps) {
  const { prefs, loading: notifLoading, toggle: toggleNotif } = useNotificationPrefs();
  const user = useAuthStore(s => s.user);
  const dashboardPeriod = useDashboardStore(s => s.period);
  const setDashboardPeriod = useDashboardStore(s => s.setPeriod);

  // ── Biometric state ──
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(false);
  const [bioType, setBioType] = useState<'faceid' | 'fingerprint' | 'iris' | null>(null);

  // ── Default period state (persisted) ──
  const [defaultPeriod, setDefaultPeriod] = useState<DefaultPeriod>('today');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [available, enabled, type, savedDefault] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
        getBiometricType(),
        AsyncStorage.getItem(DEFAULT_PERIOD_KEY),
      ]);
      if (cancelled) return;
      setBioAvailable(available);
      setBioEnabledState(enabled);
      setBioType(type);
      if (savedDefault === 'today' || savedDefault === 'thisWeek' || savedDefault === 'thisMonth') {
        setDefaultPeriod(savedDefault);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggleBio = useCallback(async (next: boolean) => {
    setBioEnabledState(next);
    try {
      await setBiometricEnabled(next);
    } catch (e) {
      setBioEnabledState(!next);
      Alert.alert('Ошибка', 'Не удалось сохранить настройку биометрии');
      console.error('[Settings] biometric toggle failed:', e);
    }
  }, []);

  const handleSelectDefaultPeriod = useCallback(async (next: DefaultPeriod) => {
    setDefaultPeriod(next);
    try {
      await AsyncStorage.setItem(DEFAULT_PERIOD_KEY, next);
      // Also apply immediately so the user sees the change reflected.
      setDashboardPeriod(next);
    } catch (e) {
      console.error('[Settings] default period save failed:', e);
    }
  }, [setDashboardPeriod]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Выйти из аккаунта?',
      'Вам нужно будет ввести код подтверждения при следующем входе.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: onLogout },
      ],
    );
  }, [onLogout]);

  const handleReportProblem = useCallback(() => {
    Alert.alert(
      'Сообщить о проблеме',
      'Опишите коротко, что не работает. Мы получим скриншот и техническую информацию автоматически.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить',
          onPress: () => {
            try {
              Sentry.captureMessage('User-reported issue from Settings', {
                level: 'info',
                tags: { source: 'settings_report' },
                user: user
                  ? { id: user.id, username: user.name ?? undefined }
                  : undefined,
              });
              Alert.alert('Спасибо', 'Сообщение отправлено в техподдержку.');
            } catch (e) {
              console.error('[Settings] report failed:', e);
            }
          },
        },
        {
          text: 'Email',
          onPress: () => {
            const v = appVersion();
            const subject = encodeURIComponent(`AliPush — проблема (v${v.version}+${v.build})`);
            const body = encodeURIComponent(
              `Опишите проблему ниже:\n\n\n— —\nВерсия: ${v.version} (build ${v.build})\nПлатформа: ${Platform.OS}\nПользователь: ${user?.phone ?? '—'}\n`,
            );
            void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
          },
        },
      ],
    );
  }, [user]);

  const isPrefEnabled = (type: string): boolean => {
    const pref = prefs.find(p => p.type === type);
    return pref !== undefined ? pref.enabled : true;
  };

  const v = appVersion();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.title}>Настройки</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile ──────────────────────────────────────────────────── */}
        {user && (
          <>
            <Text style={styles.sectionLabel}>ПРОФИЛЬ</Text>
            <View style={styles.card}>
              <View style={styles.profileTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name ? user.name.trim()[0].toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{user.name ?? 'Без имени'}</Text>
                  <Text style={styles.profilePhone}>{user.phone}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {ROLE_LABEL[user.role] ?? user.role}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ─── Security ────────────────────────────────────────────────── */}
        {bioAvailable && (
          <>
            <Text style={styles.sectionLabel}>БЕЗОПАСНОСТЬ</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconCircle}>
                  {bioType === 'faceid' ? (
                    <Smile size={18} color={colors.accentDefault} />
                  ) : bioType === 'iris' ? (
                    <Eye size={18} color={colors.accentDefault} />
                  ) : (
                    <Fingerprint size={18} color={colors.accentDefault} />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {bioType === 'faceid' ? 'Face ID' : bioType === 'iris' ? 'Iris ID' : 'Touch ID'}
                  </Text>
                  <Text style={styles.rowDesc}>
                    Быстрый вход без ввода кода
                  </Text>
                </View>
                <Switch
                  value={bioEnabled}
                  onValueChange={handleToggleBio}
                  trackColor={{ false: colors.borderColor, true: colors.accentDefault }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.borderColor}
                />
              </View>
            </View>
          </>
        )}

        {/* ─── Period default ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ПЕРИОД ПО УМОЛЧАНИЮ</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Clock size={18} color={colors.accentDefault} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>При запуске показывать</Text>
              <Text style={styles.rowDesc}>
                Сейчас: {DEFAULT_PERIOD_OPTIONS.find(o => o.value === dashboardPeriod)?.label ?? 'Произвольный'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.segmentedRow}>
            {DEFAULT_PERIOD_OPTIONS.map(opt => {
              const active = defaultPeriod === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => void handleSelectDefaultPeriod(opt.value)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Notifications ───────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>УВЕДОМЛЕНИЯ</Text>
        {notifLoading ? (
          <View style={[styles.card, { padding: 24, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={colors.accentDefault} />
          </View>
        ) : (
          <View style={styles.card}>
            {NOTIF_ROWS.map((row, index) => (
              <View key={row.type}>
                <View style={styles.row}>
                  <View style={styles.iconCircle}>
                    {row.type === 'SYNC_FAILURE' ? (
                      <AlertTriangle size={18} color={colors.accentDefault} />
                    ) : (
                      <Bell size={18} color={colors.accentDefault} />
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDesc}>{row.description}</Text>
                  </View>
                  <Switch
                    value={isPrefEnabled(row.type)}
                    onValueChange={(val) => void toggleNotif(row.type, val)}
                    trackColor={{ false: colors.borderColor, true: colors.accentDefault }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.borderColor}
                  />
                </View>
                {index < NOTIF_ROWS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* ─── About ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>О ПРИЛОЖЕНИИ</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Info size={18} color={colors.accentDefault} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Версия</Text>
              <Text style={styles.rowDesc}>{v.version} · build {v.build}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleReportProblem} activeOpacity={0.78}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={18} color={colors.accentDefault} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Сообщить о проблеме</Text>
              <Text style={styles.rowDesc}>Отправить лог в техподдержку</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ─── Logout ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.78}
        >
          <LogOut size={18} color={colors.red} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Изменения настроек применяются сразу. Часть параметров синхронизируется
          между устройствами через ваш аккаунт.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function appVersion(): { version: string; build: string } {
  const expoCfg = Constants.expoConfig;
  const version = expoCfg?.version ?? '—';
  const build =
    Platform.OS === 'ios'
      ? (expoCfg?.ios?.buildNumber ?? '—')
      : String(expoCfg?.android?.versionCode ?? '—');
  return { version, build };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: { width: 40 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 14,
  },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderColor,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderColor,
    marginLeft: 60,
  },

  // Profile
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    backgroundColor: colors.accentDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  profilePhone: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderColor: 'rgba(37,99,235,0.30)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // Period segmented
  segmentedRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: colors.accentDefault,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },

  // Logout
  logoutBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '600',
  },

  footnote: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 18,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
